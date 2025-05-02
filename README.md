# Secret Hitler Web

A real-time multiplayer web implementation of the board game Secret Hitler.

## Features

- Real-time multiplayer lobby system
- Player management
- Lobby creation and joining
- Host controls

## Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Start the development servers:
```bash
npm run dev
```

This will start both the backend server (port 5000) and the frontend development server (port 3000).

## Project Structure

- `server/` - Backend server code
  - `index.js` - Main server file with Socket.IO setup
- `client/` - React frontend
  - `src/` - React source code
    - `components/` - React components
    - `App.js` - Main application component

## Technologies Used

- Frontend:
  - React
  - Tailwind CSS
  - Socket.IO Client
- Backend:
  - Node.js
  - Express
  - Socket.IO 