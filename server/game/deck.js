const POLICY_TYPES = {
  LIBERAL: 'liberal',
  FASCIST: 'fascist'
};

class PolicyDeck {
  constructor() {
    this.reset();
  }

  reset() {
    // Create a new deck with 6 liberal and 11 fascist policies
    this.deck = [
      ...Array(6).fill(POLICY_TYPES.LIBERAL),
      ...Array(11).fill(POLICY_TYPES.FASCIST)
    ];
    this.discardPile = [];
    this.shuffle();
  }

  shuffle() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  draw(count = 1) {
    if (this.deck.length < count) {
      // If deck is empty, shuffle discard pile into deck
      this.deck = [...this.discardPile];
      this.discardPile = [];
      this.shuffle();
    }

    const drawn = this.deck.splice(0, count);
    return drawn;
  }

  discard(policy) {
    this.discardPile.push(policy);
  }

  getDeckSize() {
    return this.deck.length;
  }

  getDiscardSize() {
    return this.discardPile.length;
  }
}

module.exports = {
  POLICY_TYPES,
  PolicyDeck
}; 