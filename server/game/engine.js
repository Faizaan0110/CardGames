import { nanoid } from "nanoid";
import { buildDeck, nameForValue } from "./deck.js";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const MAX_NAME_LENGTH = 24;
const SESSION_TOKEN_LENGTH = 24; // random & unguessable — this is what lets a browser resume its own seat, not its display name

// Cards that must target ANOTHER alive, unprotected player — never the acting
// player, and never a dead or protected one. If no such player exists, these
// resolve with no effect rather than being blocked or forced onto anyone.
const NEEDS_OTHER_TARGET = new Set([1, 2, 3, 6]); // Guard, Priest, Baron, King
const GUARD = 1;
const PRINCE = 5;

export function createRoomState(code, hostId) {
  return {
    code,
    hostId,
    players: [], // { id, sessionToken, name, hand: [], alive, protected, connected }
    deck: [],
    burnedCard: null,
    faceUpRemoved: [],
    discard: {}, // playerId -> [values]
    turnIndex: 0,
    started: false,
    ended: false,
    winnerIds: [],
    log: [],
    round: 0,
    tokens: {}, // playerId -> tokens of affection (round wins this match)
    matchEnded: false,
    matchWinnerIds: [],
    playHistory: [], // { playerId, playerName, value }[] in play order, this round
  };
}

// First to this many tokens of affection wins the match.
// House rule: flat 4 for every player count (the official Love Letter table
// varies this by player count — 7/5/4 for 2/3/4 players — but this project
// uses a flat 4 for simplicity).
export function favorTarget(playerCount) {
  return 4;
}

export function addPlayer(room, id, name) {
  if (room.started) throw new Error("Game already started");
  if (room.players.length >= MAX_PLAYERS) throw new Error("Room is full (max 4)");
  if (typeof name !== "string") throw new Error("Name is required");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  if (trimmed.length > MAX_NAME_LENGTH) throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  if (room.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("That name is already taken in this room");
  }
  const sessionToken = nanoid(SESSION_TOKEN_LENGTH);
  room.players.push({ id, sessionToken, name: trimmed, hand: [], alive: true, protected: false, connected: true });
  if (!(id in room.tokens)) room.tokens[id] = 0;
}

// Handles everything that needs to happen when a socket disconnects:
// marking them away, transferring host ownership if needed, dropping them
// from a not-yet-started lobby, and — if it's currently their turn in an
// active round — forfeiting that turn so the game can't get permanently
// stuck waiting for a connection that isn't coming back.
export function handleDisconnect(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = false;

  if (room.hostId === playerId) {
    const nextHost = room.players.find((p) => p.connected);
    if (nextHost) {
      room.hostId = nextHost.id;
      log(room, `${nextHost.name} is now the host.`);
    }
  }

  if (room.started && !room.ended && player.alive && currentPlayer(room)?.id === playerId) {
    eliminate(room, player, "disconnected");
    afterPlayResolve(room);
  }
}

// Re-links a returning browser to its existing seat. `token` is the random
// session token issued when they first joined (never their display name —
// knowing someone's name must never be enough to take over their seat).
// socket.id changes every connection, so every place that was keyed by the
// player's OLD id has to be migrated to the new one, or their discard pile,
// token count, host status, etc. would silently orphan.
export function reconnectPlayer(room, token, newSocketId) {
  if (!token) return null;
  const player = room.players.find((p) => p.sessionToken === token);
  if (!player) return null;

  const oldId = player.id;
  player.id = newSocketId;
  player.connected = true;
  if (oldId === newSocketId) return player;

  if (oldId in room.discard) {
    room.discard[newSocketId] = room.discard[oldId];
    delete room.discard[oldId];
  }
  if (oldId in room.tokens) {
    room.tokens[newSocketId] = room.tokens[oldId];
    delete room.tokens[oldId];
  }
  if (room.hostId === oldId) room.hostId = newSocketId;
  room.winnerIds = room.winnerIds.map((id) => (id === oldId ? newSocketId : id));
  room.matchWinnerIds = room.matchWinnerIds.map((id) => (id === oldId ? newSocketId : id));
  for (const entry of room.playHistory) {
    if (entry.playerId === oldId) entry.playerId = newSocketId;
  }

  return player;
}

function log(room, msg) {
  room.log.push(msg);
  if (room.log.length > 200) room.log.shift();
}

export function startGame(room) {
  if (room.players.length < MIN_PLAYERS) throw new Error("Need at least 2 players");
  if (room.started) throw new Error("Already started");

  room.started = true;
  room.ended = false;
  room.winnerIds = [];
  room.round += 1;
  room.log = [];
  room.discard = {};
  room.playHistory = [];
  for (const p of room.players) {
    p.hand = [];
    p.alive = true;
    p.protected = false;
    room.discard[p.id] = [];
  }

  room.deck = buildDeck();
  room.burnedCard = room.deck.pop();
  room.faceUpRemoved = [];
  if (room.players.length === 2) {
    // Standard 2-player variant: 3 extra cards removed face-up (publicly known)
    for (let i = 0; i < 3; i++) room.faceUpRemoved.push(room.deck.pop());
  }

  for (const p of room.players) {
    p.hand.push(room.deck.pop());
  }

  room.turnIndex = Math.floor(Math.random() * room.players.length);
  log(room, `Round ${room.round} begins. ${room.players[room.turnIndex].name} goes first.`);
  drawForTurn(room);
  return room;
}

function alivePlayers(room) {
  return room.players.filter((p) => p.alive);
}

function currentPlayer(room) {
  return room.players[room.turnIndex];
}

// Every alive player other than `player` who isn't Handmaid-protected —
// the legal target pool for Guard/Priest/Baron/King, and the "other than
// self" half of Prince's legal pool.
function legalOtherTargets(room, player) {
  return alivePlayers(room).filter((p) => p.id !== player.id && !p.protected);
}

// Draw a card for whoever's turn it is now. If deck is empty, round ends.
export function drawForTurn(room) {
  const player = currentPlayer(room);
  player.protected = false; // protection only lasts until the start of their next turn

  if (room.deck.length === 0) {
    endRoundByHighCard(room);
    return;
  }

  player.hand.push(room.deck.pop());
  log(room, `${player.name}'s turn.`);
}

export function canPlay(room, playerId) {
  return room.started && !room.ended && currentPlayer(room)?.id === playerId;
}

// action: { cardValue, targetId, guessValue }
// The server never trusts the client's targetId at face value — every card's
// target (if any) is independently re-derived from room state and validated
// against that specific card's rules before anything is mutated.
export function playCard(room, playerId, action) {
  if (room.ended) throw new Error("Round has ended");
  const player = currentPlayer(room);
  if (!player || player.id !== playerId) throw new Error("Not your turn");

  const { cardValue, targetId, guessValue } = action || {};
  const handIdx = player.hand.indexOf(cardValue);
  if (handIdx === -1) throw new Error("You don't have that card");

  const hasCountess = player.hand.includes(7);
  const hasKingOrPrince = player.hand.includes(5) || player.hand.includes(6);
  if (hasCountess && hasKingOrPrince && cardValue !== 7) {
    throw new Error("You must play the Countess this turn");
  }

  // ---- Resolve and validate the target server-side, per this card's own rules ----
  const otherLegal = legalOtherTargets(room, player);
  let target = null; // null means "no target" (Handmaid/Countess/Princess) or
  // "no legal target exists, resolves with no effect" (Guard/Priest/Baron/King)

  if (NEEDS_OTHER_TARGET.has(cardValue)) {
    // Guard, Priest, Baron, King: another alive, unprotected player — never self.
    if (otherLegal.length > 0) {
      target = otherLegal.find((p) => p.id === targetId);
      if (!target) throw new Error("Choose a valid target.");
    }
    // else: nobody eligible at all — target stays null, card plays with no effect below.
  } else if (cardValue === PRINCE) {
    // Prince: self-targeting is always a legitimate choice, not a fallback.
    if (otherLegal.length === 0) {
      // Every other player is protected — the Prince MUST affect the acting
      // player. The server decides this itself; whatever targetId the client
      // sent (or didn't) is irrelevant here, since this isn't a client choice.
      target = player;
    } else {
      const candidates = [...otherLegal, player];
      target = candidates.find((p) => p.id === targetId);
      if (!target) throw new Error("Choose a valid target.");
    }
  }
  // Handmaid/Countess/Princess: no target concept — `target` stays null and unused below.

  if (cardValue === GUARD && target) {
    if (!Number.isInteger(guessValue) || guessValue < 2 || guessValue > 8) {
      throw new Error("Choose a valid card to guess.");
    }
  }

  // Only now, after every check above has passed, do we actually mutate state.
  player.hand.splice(handIdx, 1);
  room.discard[player.id].push(cardValue);
  room.playHistory.push({ playerId: player.id, playerName: player.name, value: cardValue });

  let resultMsg = `${player.name} played ${nameForValue(cardValue)}.`;
  let baronReveal = null;

  switch (cardValue) {
    case 1: {
      // Guard
      if (target) {
        const hit = target.hand[0] === guessValue;
        resultMsg += ` Guessed ${target.name} has ${nameForValue(guessValue)} — ${hit ? "correct!" : "wrong."}`;
        if (hit) eliminate(room, target, "guessed by Guard");
      } else {
        resultMsg += " No valid targets — no effect.";
      }
      break;
    }
    case 2: {
      // Priest — reveal handled by the caller (server sends a private event); engine just logs
      resultMsg += target ? ` Looked at ${target.name}'s hand.` : " No valid target — no effect.";
      break;
    }
    case 3: {
      // Baron
      if (target) {
        const pv = player.hand[0];
        const tv = target.hand[0];
        baronReveal = { aId: player.id, aCard: pv, bId: target.id, bCard: tv };
        if (pv > tv) {
          resultMsg += ` Compared hands with ${target.name} — ${player.name} wins, ${target.name} is eliminated.`;
          eliminate(room, target, "lost Baron comparison");
        } else if (tv > pv) {
          resultMsg += ` Compared hands with ${target.name} — ${target.name} wins, ${player.name} is eliminated.`;
          eliminate(room, player, "lost Baron comparison");
        } else {
          resultMsg += ` Compared hands with ${target.name} — tie, no effect.`;
        }
      } else {
        resultMsg += " No valid target — no effect.";
      }
      break;
    }
    case 4: {
      // Handmaid
      player.protected = true;
      resultMsg += " Protected until their next turn.";
      break;
    }
    case 5: {
      // Prince — `target` is always resolved by now (self or a valid other player)
      const chosen = target;
      const discarded = chosen.hand.pop();
      if (discarded !== undefined) {
        room.discard[chosen.id].push(discarded);
        room.playHistory.push({ playerId: chosen.id, playerName: chosen.name, value: discarded });
      }
      resultMsg += ` ${chosen.name} discards their hand`;
      if (discarded === 8) {
        resultMsg += " — it was the Princess! Eliminated.";
        eliminate(room, chosen, "discarded Princess via Prince");
      } else {
        if (room.deck.length > 0) {
          chosen.hand.push(room.deck.pop());
        } else if (room.burnedCard !== null) {
          chosen.hand.push(room.burnedCard);
          room.burnedCard = null;
        }
        resultMsg += " and draws a new card.";
      }
      break;
    }
    case 6: {
      // King
      if (target) {
        const pv = player.hand.pop();
        const tv = target.hand.pop();
        if (pv !== undefined) target.hand.push(pv);
        if (tv !== undefined) player.hand.push(tv);
        resultMsg += ` Swapped hands with ${target.name}.`;
      } else {
        resultMsg += " No valid target — no effect.";
      }
      break;
    }
    case 7: {
      // Countess
      resultMsg += " No effect.";
      break;
    }
    case 8: {
      // Princess
      resultMsg += " The Princess! Eliminated.";
      eliminate(room, player, "played the Princess");
      break;
    }
    default:
      throw new Error("Unknown card.");
  }

  log(room, resultMsg);
  return {
    message: resultMsg,
    guard: cardValue === GUARD && target ? { targetId: target.id, guessValue } : null,
    priest: cardValue === 2 && target ? { targetId: target.id } : null,
    baron: baronReveal,
  };
}

function eliminate(room, player, reason) {
  if (!player.alive) return;
  player.alive = false;
  const remaining = player.hand.pop();
  if (remaining !== undefined) {
    room.discard[player.id].push(remaining);
    room.playHistory.push({ playerId: player.id, playerName: player.name, value: remaining });
  }
  log(room, `${player.name} is eliminated (${reason}).`);
}

function discardTotal(room, playerId) {
  return (room.discard[playerId] || []).reduce((sum, v) => sum + v, 0);
}

function endRoundByHighCard(room) {
  const alive = alivePlayers(room);
  let best = -1;
  for (const p of alive) best = Math.max(best, p.hand[0] ?? -1);
  const tiedOnHand = alive.filter((p) => (p.hand[0] ?? -1) === best);

  let winners = tiedOnHand;
  let reason = "the deck ran out";
  if (tiedOnHand.length > 1) {
    // Official tiebreak: highest total value of cards discarded this round.
    let bestDiscard = -1;
    for (const p of tiedOnHand) bestDiscard = Math.max(bestDiscard, discardTotal(room, p.id));
    winners = tiedOnHand.filter((p) => discardTotal(room, p.id) === bestDiscard);
    reason = winners.length > 1 ? "the deck ran out — tied on hand and discards" : "the deck ran out — won on discard value";
  }

  finishRound(room, winners, reason);
}

function finishRound(room, winners, reason) {
  room.ended = true;
  room.winnerIds = winners.map((p) => p.id);
  for (const w of winners) {
    room.tokens[w.id] = (room.tokens[w.id] || 0) + 1;
  }
  const target = favorTarget(room.players.length);
  const atTarget = room.players.filter((p) => (room.tokens[p.id] || 0) >= target);
  if (atTarget.length > 0) {
    room.matchEnded = true;
    room.matchWinnerIds = atTarget.map((p) => p.id);
  }
  const names = winners.map((p) => p.name).join(" & ");
  log(room, `${names} win${winners.length === 1 ? "s" : ""} the round (${reason})!`);
}

// Reset tokens/match state for a brand new match (called before starting round 1 again)
export function resetMatch(room) {
  room.tokens = {};
  for (const p of room.players) room.tokens[p.id] = 0;
  room.matchEnded = false;
  room.matchWinnerIds = [];
  room.round = 0;
}

// Call after every playCard to check for elimination-based round end, then advance turn.
export function afterPlayResolve(room) {
  if (room.ended) return;
  const alive = alivePlayers(room);
  if (alive.length === 1) {
    finishRound(room, alive, "only one player remains");
    return;
  }
  if (alive.length === 0) {
    room.ended = true;
    log(room, "Round ended — no players remaining.");
    return;
  }
  advanceTurn(room);
}

// Finds the next player who can actually take a turn. If it lands on someone
// who's alive but disconnected, they forfeit (are eliminated) on the spot —
// this is what stops a vanished player from permanently blocking the game
// once the turn order reaches them, even if they weren't the one who
// disconnected mid-turn originally.
function advanceTurn(room) {
  let next = room.turnIndex;
  for (let i = 0; i < room.players.length; i++) {
    next = (next + 1) % room.players.length;
    const candidate = room.players[next];
    if (!candidate.alive) continue;

    if (!candidate.connected) {
      eliminate(room, candidate, "disconnected");
      const alive = alivePlayers(room);
      if (alive.length === 1) {
        finishRound(room, alive, "only one player remains");
        return;
      }
      if (alive.length === 0) {
        room.ended = true;
        log(room, "Round ended — no players remaining.");
        return;
      }
      continue;
    }

    room.turnIndex = next;
    drawForTurn(room);
    return;
  }
  // Defensive fallback — shouldn't be reachable given the checks above, but
  // never leave the room silently stuck if it somehow is.
  room.ended = true;
  log(room, "Round ended — no players available to take a turn.");
}

export function getPublicState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    ended: room.ended,
    winnerIds: room.winnerIds,
    round: room.round,
    turnPlayerId: room.started ? currentPlayer(room)?.id ?? null : null,
    deckCount: room.deck.length,
    faceUpRemoved: room.faceUpRemoved,
    log: room.log.slice(-30),
    favorTarget: favorTarget(room.players.length),
    matchEnded: room.matchEnded,
    matchWinnerIds: room.matchWinnerIds,
    playHistory: room.playHistory.slice(-10),
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      protected: p.protected,
      connected: p.connected,
      handCount: p.hand.length,
      discard: room.discard[p.id] || [],
      tokens: room.tokens[p.id] || 0,
    })),
  };
}

export function getPrivateHand(room, playerId) {
  const p = room.players.find((p) => p.id === playerId);
  return p ? p.hand : [];
}
