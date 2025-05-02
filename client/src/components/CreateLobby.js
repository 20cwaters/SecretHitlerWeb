import React from 'react';

function CreateLobby({ onCreateLobby }) {
  return (
    <button
      onClick={onCreateLobby}
      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      Create New Lobby
    </button>
  );
}

export default CreateLobby; 