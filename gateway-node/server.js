const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize Express App
const app = express();
app.use(cors()); // Allows your React frontend to connect securely
app.use(express.json()); // Allows the server to understand incoming JSON data

// Create HTTP server wrapper required by Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // Allows incoming real-time socket connections from any client
});

// A simple test endpoint to check if the server is healthy
app.get('/health', (req, res) => {
  res.json({ status: "Gateway Node is running perfectly!" });
});

// Setup Real-time connection listener
io.on('connection', (socket) => {
  console.log('A client connected over WebSocket! ID:', socket.id);

  socket.on('disconnect', () => {
    console.log('A client disconnected:', socket.id);
  });
});

// Fire up our server on Port 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`[Gateway] Server is buzzing on port ${PORT}`);
});
