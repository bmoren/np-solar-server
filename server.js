const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const visitors = new Map(); // socket.id → name
const signals = [];

function emitState() {
  io.emit('state', { visitors: [...visitors.values()], signals });
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MEDIA_DIR = path.join(PUBLIC_DIR, 'media');

const si = require("systeminformation");

const { spawn } = require('node:child_process');


// Serve static files from /public
app.use(express.static(PUBLIC_DIR));


app.get('/cputemp', (req, res) => {
  si.cpuTemperature()
  .then((data) => {

    res.json({'cpuTemprature': data})
    // console.log(data)
  })
  .catch((error) => {
    res.status(500).json({ error: 'Could not read CPU Temp ' });
  });

});

app.get('/time', (req, res) => {
    res.json({'time':  si.time() })
});

app.get('/signal', (req, res) => {
si.wifiConnections()
  .then((data) => {

    res.json({'wifi': data})
    // console.log(data)
  })
  .catch((error) => {
    res.status(500).json({ error: 'Could not read wifi Data ' });
  });
})


app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  io.emit('new-photo', url);
  res.json({ url });
});

app.get('/mic', (req, res) => {

})

app.get('/camera', (req, res) => {

const ls = spawn('rpicam-jpeg', ['--output', path.join(PUBLIC_DIR, 'webcam/webcam.jpg')]);


ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process close all stdio with code ${code}`);
  if (code === 0) {
    res.json({ imageURL: 'webcam/webcam.jpg' });
  } else {
    res.status(500).json({ error: `rpicam-jpeg exited with code ${code}` });
  }
});

ls.on('exit', (code) => {
  console.log(`child process exited with code ${code}`);
});


})




// --- Game state ---

// const MAP = {
//   city:             ['grocery', 'resturant'],
//   grocery:          ['jail', 'smhouse'],
//   resturant:        ['resturantkitchen', 'carinterior'],
//   jail:             [],
//   smhouse:          [],
//   resturantkitchen: [],
//   carinterior:      []
// };


const LABELS = {
  city:                      'City',
  citygrocery:               'Grocery Store',
  cityresturant:             'Restaurant',
  grocery:                   'Grocery Store',
  groceryjail:               'Jail',
  grocerysmhouse:            "SM's House",
  resturant:                 'Restaurant',
  resturantresturantkitchen: 'Restaurant Kitchen',
  resturantcarinterior:      'Car Interior',
  jail:                      'Jail',
  smhouse:                   "SM's House",
  resturantkitchen:          'Restaurant Kitchen',
  carinterior:               'Car Interior'
};

const MAP = {
  city:                      ['citygrocery', 'cityresturant'],
  citygrocery:               ['grocery'],
  cityresturant:             ['resturant'],
  grocery:                   ['groceryjail', 'grocerysmhouse'],
  groceryjail:               ['jail'],
  grocerysmhouse:            ['smhouse'],
  resturant:                 ['resturantresturantkitchen', 'resturantcarinterior'],
  resturantresturantkitchen: ['resturantkitchen'],
  resturantcarinterior:      ['carinterior'],
  jail:                      [],
  smhouse:                   [],
  resturantkitchen:          [],
  carinterior:               []
};




let currentLoc = 'city';

// --- Characters ---
const characters = ["SM", "J", "D", "A", "M"];
let characterPool = [...characters];

// --- Voting ---
const QUORUM = 5;
let round = 1;

function getPlayerSockets() {
  return [...io.sockets.sockets.values()].filter(s => s.character);
}

function checkVotes() {
  const sockets = getPlayerSockets();
  if (sockets.length < QUORUM) return;
  if (!sockets.every(s => s.vote !== undefined)) return;

  const tally = {};
  sockets.forEach(s => { tally[s.vote] = (tally[s.vote] || 0) + 1; });
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  console.log(`[vote] round ${round} result: ${winner}`, tally);
  io.emit('vote-result', { winner, round, tally });

  round++;
  currentLoc = winner;
  io.emit('loc-update', { loc: currentLoc, options: MAP[currentLoc].map(key => ({ key, label: LABELS[key] })) });
  getPlayerSockets().forEach(s => { delete s.vote; });
}

//mo game variables + functions


function getMoSockets() {
  return [...io.sockets.sockets.values()].filter(s => s.moPlayer);
}


// =============================================
// EATER FRENZY — player state only
// Goobers run client-side; seed keeps them in sync
// =============================================

let efState = 'startGame';
let efSeed = 0;
const efPlayers = new Map(); // socketId → { x, y, alive, score }
                              // x/y are normalised 0-1 fractions of the client window

function efPlayersPayload() {
  const out = {};
  efPlayers.forEach((p, id) => { out[id] = { x: p.x, y: p.y, alive: p.alive, score: p.score }; });
  return out;
}

function efReset() {
  efState = 'startGame';
  efPlayers.forEach(p => { p.alive = true; p.score = 0; p.x = 0; p.y = 0; });
  io.emit('ef:state', efState);
  io.emit('ef:players', efPlayersPayload());
}

// Relay player positions to all clients at ~30fps
setInterval(() => {
  if (efState === 'actualGame') io.emit('ef:players', efPlayersPayload());
}, 33);

// =============================================

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

//mo game stuff

  socket.on('moUpdatePlayer', (player)=>{

    socket.moPlayer = player

    io.emit('updatePlayer')
    

  })

  socket.on('checkforGameOver', ()=>{
    io.emit('moGameOver')
  })

  socket.on('resetTheGame', ()=>{
    io.emit('moGameReset')
  })

  // =============================================
  // EATER FRENZY — per-socket handlers
  // =============================================

  socket.on('ef:join', () => {
    efPlayers.set(socket.id, { x: 0, y: 0, alive: true, score: 0 });
    console.log(`[ef] player joined: ${socket.id}`);
    // send current state; if game already running, include seed so client can recreate goobers
    socket.emit('ef:welcome', { state: efState, players: efPlayersPayload(), seed: efSeed });
    io.emit('ef:players', efPlayersPayload());
  });

  // update the position of each player in the playerslist
  socket.on('ef:position', ({ x, y }) => {
    const p = efPlayers.get(socket.id);
    if (p && p.alive) { p.x = x; p.y = y; }
  });

  socket.on('ef:died', () => {
    const p = efPlayers.get(socket.id);
    if (!p) return;
    p.alive = false;
    console.log(`[ef] player died: ${socket.id}`);
    io.emit('ef:players', efPlayersPayload());
    // check if everyone is now dead
    const all = [...efPlayers.values()];
    if (all.length > 0 && all.every(p => !p.alive)) {
      efState = 'gameOver';
      io.emit('ef:state', efState);
    }
  });

  socket.on('ef:start', () => {
    efSeed = Math.floor(Math.random() * 1000000);
    efState = 'actualGame';
    console.log(`[ef] game started, seed: ${efSeed}`);
    io.emit('ef:state', efState);
    io.emit('ef:seed', efSeed); // all clients use this to generate identical goobers
  });

  socket.on('ef:reset', () => {
    console.log('[ef] game reset');
    efReset();
  });

  // =============================================

  // Assign character or spectator
  if (characterPool.length > 0) {
    socket.character = characterPool.shift();
    socket.emit('character-assigned', socket.character);
    console.log(`[game] assigned character ${socket.character} to ${socket.id}`);
  } else {
    socket.emit('spectator');
    console.log(`[game] ${socket.id} joined as spectator`);
  }

  // Sync joining client to current game state
  socket.emit('round', round);
  socket.emit('loc-update', { loc: currentLoc, options: MAP[currentLoc].map(key => ({ key, label: LABELS[key] })) });

  socket.on('vote', (choice) => {
    if (!socket.character) return; // spectators can't vote
    if (socket.vote !== undefined) return;
    if (!MAP[currentLoc].includes(choice)) return;
    socket.vote = choice;
    console.log(`[vote] ${socket.character} (${socket.id}) voted: ${choice}`);
    checkVotes();
  });

  socket.on('reset', () => {
    currentLoc = 'city';
    round = 1;
    getPlayerSockets().forEach(s => { delete s.vote; });
    console.log('[game] reset');
    io.emit('round', round);
    io.emit('loc-update', { loc: currentLoc, options: MAP[currentLoc].map(key => ({ key, label: LABELS[key] })) });
  });

  // Example: broadcast a message to all other clients
  socket.on('message', (data) => {
    console.log(`[socket] message from ${socket.id}:`, data);
    socket.broadcast.emit('message', { from: socket.id, ...data });
  });


  // Example: send to a specific room
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`[socket] ${socket.id} joined room: ${room}`);
    io.to(room).emit('joined', { id: socket.id, room });
    visitors.set(socket.id, room);
    emitState();
  });

  socket.on('sendSignal', ({ name, message, color }) => {
    signals.push({ name, message, color, time: new Date().toLocaleTimeString() });
    if (signals.length > 50) signals.shift();
    emitState();
  });

  socket.on('room-message', ({ room, data }) => {
    io.to(room).emit('room-message', { from: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
    // EATER FRENZY — remove player on disconnect
    if (efPlayers.has(socket.id)) {
      efPlayers.delete(socket.id);
      console.log(`[ef] player left: ${socket.id}`);
      io.emit('ef:players', efPlayersPayload());
    }
    if (socket.character) {
      characterPool.unshift(socket.character); // return to front of pool
      console.log(`[game] character ${socket.character} returned to pool`);
    }
    visitors.delete(socket.id);
    emitState();
    setImmediate(checkVotes);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
