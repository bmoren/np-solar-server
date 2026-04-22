const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MEDIA_DIR = path.join(PUBLIC_DIR, 'media');

const si = require("systeminformation");

const { StillCamera } = require("pi-camera-connect");
const stillCamera = new StillCamera();


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


app.get('/mic', (req, res) => {

})

app.get('/camera', (req, res) => {

  stillCamera.takeImage().then(image => {

    fs.writeFile("public/webcam/webcam.jpg", image, (err)=>{
      if (err) throw err;
      res.json({'image': "public/webcam/webcam.jpg"})
    });
});

})




// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

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
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
