import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import NameInput from './components/NameInput';
import Lobby from './components/Lobby';
import Game from './components/Game';
import CreateLobby from './components/CreateLobby';
import JoinLobby from './components/JoinLobby';

const socket = io(process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:5000'
);

function App() {
  const [playerName, setPlayerName] = useState('');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('error', (data) => {
      setError(data.message);
    });

    socket.on('lobbyCreated', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('playerJoined', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('playerLeft', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('roleAssigned', (roleInfo) => {
      setRole(roleInfo);
    });

    socket.on('gameStarted', (state) => {
      setGameStarted(true);
      setGameState(state);
    });

    return () => {
      socket.off('error');
      socket.off('lobbyCreated');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('roleAssigned');
      socket.off('gameStarted');
    };
  }, []);

  const handleNameSubmit = (name) => {
    setPlayerName(name);
  };

  const handleCreateLobby = () => {
    socket.emit('createLobby', { playerName });
  };

  const handleJoinLobby = (lobbyCode) => {
    socket.emit('joinLobby', { lobbyCode, playerName });
  };

  if (!playerName) {
    return <NameInput onSubmit={handleNameSubmit} />;
  }

  if (gameStarted && role) {
    return <Game socket={socket} lobby={currentLobby} playerName={playerName} role={role} initialGameState={gameState} />;
  }

  if (currentLobby) {
    return <Lobby lobby={currentLobby} playerName={playerName} socket={socket} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <h1 className="text-2xl font-bold mb-6 text-center">Secret Hitler Web</h1>
        <div className="space-y-4">
          <CreateLobby onCreateLobby={handleCreateLobby} />
          <JoinLobby onJoinLobby={handleJoinLobby} />
        </div>
      </div>
    </div>
  );
}

export default App;
