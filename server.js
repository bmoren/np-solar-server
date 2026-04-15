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

// Serve static files from /public
app.use(express.static(PUBLIC_DIR));

// Auto-route media files: GET /media/:filename
// Returns a directory listing as JSON if no filename given
app.get('/media', (req, res) => {
  fs.readdir(MEDIA_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Could not read media directory' });
    res.json({ files });
  });
});

app.get('/media/:filename', (req, res) => {
  const filePath = path.join(MEDIA_DIR, path.basename(req.params.filename));
  // Prevent directory traversal
  if (!filePath.startsWith(MEDIA_DIR)) {
    return res.status(403).send('Forbidden');
  }
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('File not found');
  });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);

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
