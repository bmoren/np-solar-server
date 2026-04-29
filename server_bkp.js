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
    console.log(data)
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
    console.log(data)
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

// exec("rpicam-jpeg --output ~/np-solar-server/public/webcam/webcam.jpg", (error, stdout, stderr) => {
//     if (error) {
//         console.log(`error: ${error.message}`);
//         return;
//     }
//     if (stderr) {
//         console.log(`stderr: ${stderr}`);
//         return;
//     }
//     res.json({'imageURL': 'webcam/webcam.jpg'})
//     console.log(`stdout: ${stdout}`);
// });

})




// --- Voting ---
const QUORUM = 5;
let round = 1;

function getConnectedSockets() {
  return [...io.sockets.sockets.values()];
}

function checkVotes() {
  const sockets = getConnectedSockets();
  if (sockets.length < QUORUM) return;
  if (!sockets.every(s => s.vote !== undefined)) return;

  const tally = {};
  sockets.forEach(s => { tally[s.vote] = (tally[s.vote] || 0) + 1; });
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  console.log(`[vote] round ${round} result: ${winner}`, tally);
  io.emit('vote-result', { winner, round, tally });

  round++;
  sockets.forEach(s => { delete s.vote; });
}

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

  // Send current round so client can sync on join
  socket.emit('round', round);

  socket.on('vote', (choice) => {
    if (socket.vote !== undefined) return; // ignore double votes
    socket.vote = choice;
    console.log(`[vote] ${socket.id} voted: ${choice}`);
    checkVotes();
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
  });

  socket.on('room-message', ({ room, data }) => {
    io.to(room).emit('room-message', { from: socket.id, ...data });
  });

  socket.on('disconnect', () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
    // Re-check in case the disconnecting socket was the last unvoted player
    // and remaining connected sockets have all voted
    setImmediate(checkVotes);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
