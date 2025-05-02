import React, { useState, useEffect } from 'react';

const GAME_PHASES = {
  ELECTION: 'election',
  LEGISLATIVE: 'legislative',
  SPECIAL_POWER: 'special_power',
  GAME_OVER: 'game_over'
};

function Game({ socket, lobby, playerName, role, initialGameState }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [phase, setPhase] = useState(initialGameState?.phase || GAME_PHASES.ELECTION);
  const [enactedPolicies, setEnactedPolicies] = useState({ liberal: 0, fascist: 0 });
  const [policies, setPolicies] = useState([]);
  const [isPresident, setIsPresident] = useState(initialGameState?.president?.id === socket.id);
  const [isChancellor, setIsChancellor] = useState(false);
  const [currentPresident, setCurrentPresident] = useState(initialGameState?.currentPresident || null);
  const [currentChancellor, setCurrentChancellor] = useState(initialGameState?.currentChancellor || null);
  const [waitingForChancellor, setWaitingForChancellor] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [chancellorPolicies, setChancellorPolicies] = useState([]);
  const [hasDiscarded, setHasDiscarded] = useState(false);

  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setPhase(initialGameState.phase);
      setIsPresident(initialGameState.president.id === socket.id);
      setCurrentPresident(initialGameState.currentPresident);
      setCurrentChancellor(initialGameState.currentChancellor);
    }
  }, [initialGameState, socket.id]);

  useEffect(() => {
    socket.on('gameStarted', (state) => {
      setGameState(state);
      setPhase(state.phase);
      setIsPresident(state.president.id === socket.id);
      setCurrentPresident(state.currentPresident);
      setCurrentChancellor(state.currentChancellor);
      setWaitingForChancellor(true);
    });

    socket.on('chancellorNominated', (state) => {
      setGameState(state);
      setIsChancellor(state.chancellor === socket.id);
      setCurrentChancellor(lobby.players.find(p => p.id === state.chancellor));
      setWaitingForChancellor(false);
      setHasVoted(false);
    });

    socket.on('electionResult', (result) => {
      setPhase(result.phase);
      if (result.phase === GAME_PHASES.LEGISLATIVE) {
        setPolicies(result.policies);
      }
      if (result.nextPresident) {
        setCurrentPresident(result.nextPresident);
        setCurrentChancellor(null);
        setWaitingForChancellor(true);
      }
      if (result.currentPresident) {
        setCurrentPresident(result.currentPresident);
        setIsPresident(result.currentPresident.id === socket.id);
      }
      if (result.currentChancellor) {
        setCurrentChancellor(result.currentChancellor);
        setIsChancellor(result.currentChancellor.id === socket.id);
      }
    });

    socket.on('chancellorChoose', (data) => {
      setChancellorPolicies(data.policies);
    });

    socket.on('policyEnacted', (data) => {
      setEnactedPolicies(data.enactedPolicies);
      setPolicies([]);
      setChancellorPolicies([]);
    });

    socket.on('newElection', (data) => {
      setPhase(GAME_PHASES.ELECTION);
      setCurrentPresident(data.currentPresident);
      setCurrentChancellor(null);
      setIsPresident(data.currentPresident.id === socket.id);
      setIsChancellor(false);
      setWaitingForChancellor(true);
      setPolicies([]);
      setChancellorPolicies([]);
      setHasDiscarded(false);
      setHasVoted(false);
    });

    socket.on('gameOver', (result) => {
      setPhase(GAME_PHASES.GAME_OVER);
      setGameState({ ...gameState, result });
    });

    socket.on('presidentDraw', (data) => {
      setPolicies(data.policies);
      setPhase(GAME_PHASES.LEGISLATIVE);
    });

    return () => {
      socket.off('gameStarted');
      socket.off('chancellorNominated');
      socket.off('electionResult');
      socket.off('chancellorChoose');
      socket.off('policyEnacted');
      socket.off('gameOver');
      socket.off('newElection');
      socket.off('presidentDraw');
    };
  }, [socket, gameState]);

  const handleNominateChancellor = (playerId) => {
    socket.emit('nominateChancellor', { lobbyCode: lobby.code, chancellorId: playerId });
  };

  const handleVote = (vote) => {
    socket.emit('castVote', { lobbyCode: lobby.code, vote });
    setHasVoted(true);
  };

  const handleDiscardPolicy = (policy) => {
    socket.emit('discardPolicy', { lobbyCode: lobby.code, policy });
    setHasDiscarded(true);
    setPolicies([]);
  };

  const renderVotingButtons = () => {
    if (hasVoted) {
      return (
        <p className="text-gray-600 italic">Vote submitted. Waiting for other players...</p>
      );
    }

    return (
      <div className="flex space-x-4">
        <button
          onClick={() => handleVote('ja')}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
        >
          Ja
        </button>
        <button
          onClick={() => handleVote('nein')}
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
        >
          Nein
        </button>
      </div>
    );
  };

  const renderElectionPhase = () => {
    if (isPresident && waitingForChancellor) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You are the President</h3>
          <p className="mb-4">Choose a Chancellor:</p>
          <div className="space-y-2">
            {lobby.players
              .filter(player => player.id !== socket.id)
              .map(player => (
                <button
                  key={player.id}
                  onClick={() => handleNominateChancellor(player.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  {player.name}
                </button>
              ))}
          </div>
        </div>
      );
    }

    if (isChancellor && waitingForChancellor) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You have been nominated as Chancellor</h3>
          <p>Waiting for votes...</p>
        </div>
      );
    }

    if (!waitingForChancellor) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">Vote on Chancellor Nomination</h3>
          <p className="mb-4">President {currentPresident?.name} has nominated {currentChancellor?.name} as Chancellor</p>
          {renderVotingButtons()}
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Election Phase</h3>
        <p>Waiting for President {currentPresident?.name} to nominate a Chancellor...</p>
      </div>
    );
  };

  const renderLegislativePhase = () => {
    if (isPresident && policies.length > 0 && !hasDiscarded) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You are the President</h3>
          <p className="mb-4">Choose a policy to discard. The remaining two will be passed to the Chancellor:</p>
          <div className="space-y-2">
            {policies.map((policy, index) => (
              <button
                key={index}
                onClick={() => handleDiscardPolicy(policy)}
                className={`w-full py-2 px-4 rounded-md text-white ${
                  policy === 'liberal' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Discard {policy} Policy
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (isPresident && hasDiscarded) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You are the President</h3>
          <p className="text-gray-600">You have discarded a policy. Waiting for the Chancellor to enact a policy...</p>
        </div>
      );
    }

    if (isChancellor && chancellorPolicies.length > 0) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You are the Chancellor</h3>
          <p className="mb-4">Choose a policy to enact:</p>
          <div className="space-y-2">
            {chancellorPolicies.map((policy, index) => (
              <button
                key={index}
                onClick={() => handleDiscardPolicy(policy)}
                className={`w-full py-2 px-4 rounded-md text-white ${
                  policy === 'liberal' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Enact {policy} Policy
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (isChancellor && chancellorPolicies.length === 0) {
      return (
        <div>
          <h3 className="text-lg font-semibold mb-4">You are the Chancellor</h3>
          <p>Waiting for the President to discard a policy...</p>
        </div>
      );
    }

    return (
      <div>
        <h3 className="text-lg font-semibold mb-4">Legislative Phase</h3>
        {currentPresident && currentChancellor && (
          <div>
            <p>President {currentPresident.name} and Chancellor {currentChancellor.name} are enacting a policy:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
              <li>President draws 3 policies and discards one</li>
              <li>Chancellor receives 2 policies and enacts one</li>
            </ol>
          </div>
        )}
      </div>
    );
  };

  const renderGameOver = () => {
    if (!gameState?.result) return null;

    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
        <p className="text-xl mb-2">
          {gameState.result.winner === 'liberal' ? 'Liberals' : 'Fascists'} win!
        </p>
        <p className="text-gray-600">Reason: {gameState.result.condition}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-center">Secret Hitler</h2>
          <p className="text-sm text-gray-500 text-center">Lobby: {lobby.code}</p>
          <p className="text-sm text-gray-500 text-center">Playing as: {playerName}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Your Role</h3>
          <p className="capitalize">{role.role}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Current Government</h3>
          <div className="space-y-2">
            <p>President: {currentPresident?.name || 'Not elected'}</p>
            <p>Chancellor: {currentChancellor?.name || 'Not elected'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Policy Track</h3>
          <div className="flex justify-between">
            <div className="text-blue-600">
              Liberal: {enactedPolicies.liberal}/5
            </div>
            <div className="text-red-600">
              Fascist: {enactedPolicies.fascist}/6
            </div>
          </div>
        </div>

        {phase === GAME_PHASES.GAME_OVER ? (
          renderGameOver()
        ) : phase === GAME_PHASES.LEGISLATIVE ? (
          renderLegislativePhase()
        ) : (
          renderElectionPhase()
        )}
      </div>
    </div>
  );
}

export default Game; 