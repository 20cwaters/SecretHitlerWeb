const ROLES = {
  HITLER: 'hitler',
  FASCIST: 'fascist',
  LIBERAL: 'liberal'
};

const ROLE_DISTRIBUTION = {
  5: { hitler: 1, fascist: 1, liberal: 3 },
  6: { hitler: 1, fascist: 1, liberal: 4 },
  7: { hitler: 1, fascist: 2, liberal: 4 },
  8: { hitler: 1, fascist: 2, liberal: 5 },
  9: { hitler: 1, fascist: 3, liberal: 5 },
  10: { hitler: 1, fascist: 3, liberal: 6 }
};

function assignRoles(players) {
  const playerCount = players.length;
  if (playerCount < 5 || playerCount > 10) {
    throw new Error('Invalid number of players');
  }

  const distribution = ROLE_DISTRIBUTION[playerCount];
  const roles = [];

  // Add Hitler
  roles.push(ROLES.HITLER);

  // Add Fascists
  for (let i = 0; i < distribution.fascist; i++) {
    roles.push(ROLES.FASCIST);
  }

  // Add Liberals
  for (let i = 0; i < distribution.liberal; i++) {
    roles.push(ROLES.LIBERAL);
  }

  // Shuffle roles
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Assign roles to players
  const playerRoles = {};
  players.forEach((player, index) => {
    playerRoles[player.id] = {
      role: roles[index],
      name: player.name
    };
  });

  return playerRoles;
}

function getRoleInfo(role, playerRoles) {
  const info = {
    role,
    otherPlayers: []
  };

  // If player is Hitler, they see all fascists
  if (role === ROLES.HITLER) {
    info.otherPlayers = Object.entries(playerRoles)
      .filter(([_, player]) => player.role === ROLES.FASCIST)
      .map(([_, player]) => player.name);
  }
  // If player is Fascist, they see Hitler and other fascists
  else if (role === ROLES.FASCIST) {
    info.otherPlayers = Object.entries(playerRoles)
      .filter(([_, player]) => player.role === ROLES.HITLER || player.role === ROLES.FASCIST)
      .map(([_, player]) => player.name);
  }
  // Liberals don't see any other players' roles

  return info;
}

module.exports = {
  ROLES,
  assignRoles,
  getRoleInfo
}; 