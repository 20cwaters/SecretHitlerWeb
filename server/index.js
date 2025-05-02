const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://your-app-url.onrender.com'
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// In-memory store for lobbies
const lobbies = new Map();

// Generate a random 5-character lobby code
function generateLobbyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createLobby', ({ playerName }) => {
    const lobbyCode = generateLobbyCode();
    const lobby = {
      code: lobbyCode,
      host: socket.id,
      players: [{ id: socket.id, name: playerName }],
      status: 'waiting'
    };
    lobbies.set(lobbyCode, lobby);
    socket.join(lobbyCode);
    socket.emit('lobbyCreated', lobby);
    console.log(`Lobby created: ${lobbyCode}`);
  });

  socket.on('joinLobby', ({ lobbyCode, playerName }) => {
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }
    if (lobby.status !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    lobby.players.push({ id: socket.id, name: playerName });
    socket.join(lobbyCode);
    io.to(lobbyCode).emit('playerJoined', lobby);
    console.log(`Player ${playerName} joined lobby ${lobbyCode}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find and remove player from any lobby they're in
    for (const [code, lobby] of lobbies.entries()) {
      const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        lobby.players.splice(playerIndex, 1);
        if (lobby.players.length === 0) {
          lobbies.delete(code);
        } else if (lobby.host === socket.id) {
          // Assign new host if the host left
          lobby.host = lobby.players[0].id;
        }
        io.to(code).emit('playerLeft', lobby);
        break;
      }
    }
  });
});

// Serve the React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 