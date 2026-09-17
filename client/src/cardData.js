// The card artwork in /images/cards/ already has the number, name, and rules
// text baked into the image itself. `action` is a short phrase for the game
// table's action tray (e.g. "Choose your target and guess") — never the full
// rules paragraph, to keep the tray compact. `text` is the full rule, used
// only as an accessible label (screen readers, alt text) since it's not
// rendered as visible HTML anywhere the art is also visible.
export const CARD_META = {
  1: {
    name: "Guard",
    text: "Name a card (not Guard) and guess a player's hand. Correct = they're out.",
    action: "Choose your target and guess",
    image: "cards/guard.png",
    count: 5,
  },
  2: {
    name: "Priest",
    text: "Look at another player's hand.",
    action: "Choose a player to peek at their hand",
    image: "cards/priest.png",
    count: 2,
  },
  3: {
    name: "Baron",
    text: "Compare hands with another player. Lower card is out.",
    action: "Choose a player to compare hands with",
    image: "cards/baron.png",
    count: 2,
  },
  4: {
    name: "Handmaid",
    text: "You're protected until your next turn.",
    action: null,
    image: "cards/handmaid.png",
    count: 2,
  },
  5: {
    name: "Prince",
    text: "Choose a player (or yourself) to discard their hand and draw new.",
    action: "Choose whose hand to replace",
    image: "cards/prince.png",
    count: 2,
  },
  6: {
    name: "King",
    text: "Trade hands with another player.",
    action: "Choose a player to trade hands with",
    image: "cards/king.png",
    count: 1,
  },
  7: {
    name: "Countess",
    text: "No effect. Must be played if you're also holding the King or Prince.",
    action: null,
    image: "cards/countess.png",
    count: 1,
  },
  8: {
    name: "Princess",
    text: "If you discard this for any reason, you're out.",
    action: null,
    image: "cards/princess.png",
    count: 1,
  },
};
