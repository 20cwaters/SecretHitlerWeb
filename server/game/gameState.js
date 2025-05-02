const GAME_PHASES = {
  ELECTION: 'election',
  LEGISLATIVE: 'legislative',
  SPECIAL_POWER: 'special_power',
  GAME_OVER: 'game_over'
};

const VICTORY_CONDITIONS = {
  LIBERAL_POLICIES: 'liberal_policies',
  FASCIST_POLICIES: 'fascist_policies',
  HITLER_CHANCELLOR: 'hitler_chancellor',
  HITLER_KILLED: 'hitler_killed'
};

class GameState {
  constructor(players) {
    this.players = players;
    this.currentPresidentIndex = 0;
    this.failedElections = 0;
    this.enactedPolicies = {
      liberal: 0,
      fascist: 0
    };
    this.phase = GAME_PHASES.ELECTION;
    this.specialPowers = {
      investigation: false,
      execution: false,
      peek: false
    };
    this.electionTracker = {
      president: null,
      chancellor: null,
      votes: {}
    };
    this.legislativeTracker = {
      president: null,
      chancellor: null,
      drawnPolicies: [],
      discardedPolicies: [],
      enactedPolicy: null
    };
  }

  getCurrentPresident() {
    return this.players[this.currentPresidentIndex];
  }

  getNextPresident() {
    this.currentPresidentIndex = (this.currentPresidentIndex + 1) % this.players.length;
    return this.getCurrentPresident();
  }

  setChancellorCandidate(playerId) {
    this.electionTracker.chancellor = playerId;
  }

  castVote(playerId, vote) {
    this.electionTracker.votes[playerId] = vote;
  }

  getVoteResult() {
    const votes = Object.values(this.electionTracker.votes);
    const jaVotes = votes.filter(vote => vote === 'ja').length;
    return jaVotes > votes.length / 2;
  }

  enactPolicy(policy) {
    this.enactedPolicies[policy]++;
    this.updateSpecialPowers();
  }

  updateSpecialPowers() {
    const fascistCount = this.enactedPolicies.fascist;
    this.specialPowers = {
      investigation: fascistCount >= 1,
      execution: fascistCount >= 3,
      peek: fascistCount >= 5
    };
  }

  checkVictory() {
    if (this.enactedPolicies.liberal >= 5) {
      return { winner: 'liberal', condition: VICTORY_CONDITIONS.LIBERAL_POLICIES };
    }
    if (this.enactedPolicies.fascist >= 6) {
      return { winner: 'fascist', condition: VICTORY_CONDITIONS.FASCIST_POLICIES };
    }
    return null;
  }

  resetElection() {
    this.electionTracker = {
      president: null,
      chancellor: null,
      votes: {}
    };
  }

  resetLegislative() {
    this.legislativeTracker = {
      president: null,
      chancellor: null,
      drawnPolicies: [],
      discardedPolicies: [],
      enactedPolicy: null
    };
  }
}

module.exports = {
  GAME_PHASES,
  VICTORY_CONDITIONS,
  GameState
}; 