import React, { useState } from 'react';

function JoinLobby({ onJoinLobby }) {
  const [lobbyCode, setLobbyCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lobbyCode.trim()) {
      onJoinLobby(lobbyCode.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="lobbyCode" className="block text-sm font-medium text-gray-700">
          Enter Lobby Code
        </label>
        <input
          type="text"
          id="lobbyCode"
          value={lobbyCode}
          onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="ABCDE"
          maxLength={5}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Join Lobby
      </button>
    </form>
  );
}

export default JoinLobby; 