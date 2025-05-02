import React from 'react';

function Lobby({ lobby, playerName, socket }) {
  const isHost = lobby.host === socket.id;

  const handleStartGame = () => {
    // This will be implemented later
    console.log('Starting game...');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-center">Lobby: {lobby.code}</h2>
          <p className="text-sm text-gray-500 text-center">Share this code with other players</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Players ({lobby.players.length})</h3>
          <ul className="space-y-2">
            {lobby.players.map((player) => (
              <li
                key={player.id}
                className={`flex items-center p-2 rounded ${
                  player.id === socket.id ? 'bg-indigo-50' : 'bg-gray-50'
                }`}
              >
                <span className="font-medium">{player.name}</span>
                {player.id === lobby.host && (
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost && (
          <button
            onClick={handleStartGame}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            disabled={lobby.players.length < 5}
          >
            {lobby.players.length < 5
              ? `Need ${5 - lobby.players.length} more players to start`
              : 'Start Game'}
          </button>
        )}
      </div>
    </div>
  );
}

export default Lobby; 