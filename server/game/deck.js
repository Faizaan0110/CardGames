// Love Letter card definitions (16-card base deck)
export const CARDS = {
  GUARD: { value: 1, name: "Guard", count: 5 },
  PRIEST: { value: 2, name: "Priest", count: 2 },
  BARON: { value: 3, name: "Baron", count: 2 },
  HANDMAID: { value: 4, name: "Handmaid", count: 2 },
  PRINCE: { value: 5, name: "Prince", count: 2 },
  KING: { value: 6, name: "King", count: 1 },
  COUNTESS: { value: 7, name: "Countess", count: 1 },
  PRINCESS: { value: 8, name: "Princess", count: 1 },
};

export function nameForValue(value) {
  const entry = Object.values(CARDS).find((c) => c.value === value);
  return entry ? entry.name : "Unknown";
}

// Returns a freshly shuffled deck as an array of card values (numbers)
export function buildDeck() {
  const deck = [];
  for (const card of Object.values(CARDS)) {
    for (let i = 0; i < card.count; i++) deck.push(card.value);
  }
  return shuffle(deck);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
