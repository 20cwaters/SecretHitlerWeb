const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { assignRoles, getRoleInfo, ROLES } = require('./game/roles');
const { PolicyDeck, POLICY_TYPES } = require('./game/deck');
const { GameState, GAME_PHASES, VICTORY_CONDITIONS } = require('./game/gameState');

const app = express();
app.use(cors());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Catch-all route to serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
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

// In-memory store for lobbies and games
const lobbies = new Map();
const games = new Map();

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

  socket.on('startGame', ({ lobbyCode }) => {
    const lobby = lobbies.get(lobbyCode);
    if (!lobby || lobby.host !== socket.id) {
      socket.emit('error', { message: 'Not authorized to start game' });
      return;
    }

    try {
      // Assign roles
      const playerRoles = assignRoles(lobby.players);
      
      // Create game state
      const gameState = new GameState(lobby.players);
      const policyDeck = new PolicyDeck();
      
      // Store game state
      games.set(lobbyCode, { gameState, policyDeck, playerRoles });
      
      // Update lobby status
      lobby.status = 'in_progress';
      
      // Send roles to players
      lobby.players.forEach(player => {
        const roleInfo = getRoleInfo(playerRoles[player.id].role, playerRoles);
        io.to(player.id).emit('roleAssigned', roleInfo);
      });

      // Start election phase
      const president = gameState.getCurrentPresident();
      gameState.electionTracker.president = president.id;
      
      // Notify all players that the game has started and who the first president is
      io.to(lobbyCode).emit('gameStarted', {
        president: president,
        phase: GAME_PHASES.ELECTION,
        currentPresident: president,
        currentChancellor: null
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('nominateChancellor', ({ lobbyCode, chancellorId }) => {
    const game = games.get(lobbyCode);
    if (!game) return;

    const { gameState } = game;
    const currentPresident = gameState.getCurrentPresident();
    
    // Only allow the current president to nominate a chancellor
    if (currentPresident.id !== socket.id) {
      socket.emit('error', { message: 'Only the current president can nominate a chancellor' });
      return;
    }

    // Cannot nominate yourself as chancellor
    if (chancellorId === socket.id) {
      socket.emit('error', { message: 'You cannot nominate yourself as chancellor' });
      return;
    }

    // Set the chancellor candidate and reset votes
    gameState.setChancellorCandidate(chancellorId);
    gameState.electionTracker.votes = {};
    const chancellorCandidate = gameState.players.find(p => p.id === chancellorId);
    
    // Notify all players about the nomination
    io.to(lobbyCode).emit('chancellorNominated', {
      chancellor: chancellorId,
      phase: GAME_PHASES.ELECTION,
      currentPresident: currentPresident,
      currentChancellor: chancellorCandidate
    });
  });

  socket.on('castVote', ({ lobbyCode, vote }) => {
    const game = games.get(lobbyCode);
    if (!game) return;

    const { gameState } = game;
    
    // Only allow voting if there's a nominated chancellor
    if (!gameState.electionTracker.chancellor) {
      socket.emit('error', { message: 'No chancellor has been nominated yet' });
      return;
    }

    // Prevent double voting
    if (gameState.electionTracker.votes[socket.id]) {
      socket.emit('error', { message: 'You have already voted' });
      return;
    }

    gameState.castVote(socket.id, vote);

    // Check if all votes are in
    const allVotesIn = Object.keys(gameState.electionTracker.votes).length === gameState.players.length;
    if (allVotesIn) {
      const result = gameState.getVoteResult();
      const currentPresident = gameState.getCurrentPresident();
      const chancellorCandidate = gameState.players.find(p => p.id === gameState.electionTracker.chancellor);

      if (result) {
        // Election succeeded
        gameState.phase = GAME_PHASES.LEGISLATIVE;
        const policies = game.policyDeck.draw(3);
        gameState.legislativeTracker.drawnPolicies = policies;
        gameState.legislativeTracker.president = gameState.electionTracker.president;
        gameState.legislativeTracker.chancellor = gameState.electionTracker.chancellor;
        
        // Send policies only to the president
        io.to(currentPresident.id).emit('presidentDraw', {
          policies: policies
        });
        
        // Notify all players of the successful election
        io.to(lobbyCode).emit('electionResult', {
          result: 'ja',
          phase: GAME_PHASES.LEGISLATIVE,
          currentPresident: currentPresident,
          currentChancellor: chancellorCandidate
        });
      } else {
        // Election failed
        gameState.failedElections++;
        if (gameState.failedElections >= 3) {
          // Enact top policy
          const policy = game.policyDeck.draw(1)[0];
          gameState.enactPolicy(policy);
          gameState.failedElections = 0;
          
          const victory = gameState.checkVictory();
          if (victory) {
            io.to(lobbyCode).emit('gameOver', victory);
          } else {
            io.to(lobbyCode).emit('policyEnacted', {
              policy,
              enactedPolicies: gameState.enactedPolicies
            });
          }
        }
        
        // Start new election
        gameState.resetElection();
        const nextPresident = gameState.getNextPresident();
        gameState.electionTracker.president = nextPresident.id;
        
        io.to(lobbyCode).emit('electionResult', {
          result: 'nein',
          phase: GAME_PHASES.ELECTION,
          currentPresident: nextPresident,
          currentChancellor: null
        });
      }
    }
  });

  socket.on('discardPolicy', ({ lobbyCode, policy }) => {
    const game = games.get(lobbyCode);
    if (!game) return;

    const { gameState, policyDeck } = game;
    
    // If it's the president's turn (first discard)
    if (gameState.legislativeTracker.discardedPolicies.length === 0) {
      // Verify it's the president
      if (socket.id !== gameState.electionTracker.president) {
        socket.emit('error', { message: 'Only the president can discard a policy at this time' });
        return;
      }

      // Add the discarded policy to the discard pile
      gameState.legislativeTracker.discardedPolicies.push(policy);
      policyDeck.discard(policy);

      // Get the remaining two policies
      const remainingPolicies = gameState.legislativeTracker.drawnPolicies
        .filter(p => p !== policy);
      
      // Send the remaining policies to the chancellor
      io.to(gameState.electionTracker.chancellor).emit('chancellorChoose', {
        policies: remainingPolicies
      });

      // Notify the president that their discard was successful
      socket.emit('presidentDiscardConfirmed', {
        discardedPolicy: policy,
        remainingPolicies: remainingPolicies
      });

      // Notify other players that the president has discarded
      socket.to(lobbyCode).emit('presidentDiscarded');
    }
    // If it's the chancellor's turn (enacting a policy)
    else if (gameState.legislativeTracker.discardedPolicies.length === 1) {
      // Verify it's the chancellor
      if (socket.id !== gameState.electionTracker.chancellor) {
        socket.emit('error', { message: 'Only the chancellor can enact a policy at this time' });
        return;
      }

      // Enact the chosen policy
      gameState.enactPolicy(policy);
      
      // Add the other policy to the discard pile
      const otherPolicy = gameState.legislativeTracker.drawnPolicies
        .find(p => p !== policy && !gameState.legislativeTracker.discardedPolicies.includes(p));
      gameState.legislativeTracker.discardedPolicies.push(otherPolicy);
      policyDeck.discard(otherPolicy);
      
      // Reset for next round
      gameState.resetLegislative();
      gameState.resetElection();

      // Check for victory
      const victory = gameState.checkVictory();
      if (victory) {
        io.to(lobbyCode).emit('gameOver', victory);
      } else {
        // Notify all players of the enacted policy
        io.to(lobbyCode).emit('policyEnacted', {
          policy: policy,
          enactedPolicies: gameState.enactedPolicies
        });

        // Start new election
        const nextPresident = gameState.getNextPresident();
        gameState.electionTracker.president = nextPresident.id;
        
        io.to(lobbyCode).emit('newElection', {
          phase: GAME_PHASES.ELECTION,
          currentPresident: nextPresident,
          currentChancellor: null
        });
      }
    }
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
          games.delete(code);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 