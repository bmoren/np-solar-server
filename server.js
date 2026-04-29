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





// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

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

  socket.on('addItem', (itemName) => {


  })

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
