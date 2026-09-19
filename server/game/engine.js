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
    lastAction: null, // { cardValue, playerId, playerName, message } - most recent play, cleared each new round
    chat: [], // { playerId, playerName, text, ts }[] - lasts the whole room, not reset per round
    spectators: [], // { id, sessionToken, name, avatarUrl, connected } - joined while a match was already in progress
  };
}

const MAX_CHAT_LENGTH = 300;

export function postChatMessage(room, playerId, text) {
  const sender = room.players.find((p) => p.id === playerId && !p.removed) || room.spectators.find((s) => s.id === playerId);
  if (!sender) throw new Error("Not in this room");
  if (typeof text !== "string") throw new Error("Message is required");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message is required");
  if (trimmed.length > MAX_CHAT_LENGTH) throw new Error(`Messages must be ${MAX_CHAT_LENGTH} characters or fewer`);
  room.chat.push({ playerId, playerName: sender.name, text: trimmed, ts: Date.now() });
  if (room.chat.length > 100) room.chat.shift();
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
  if (nameTaken(room, trimmed)) {
    throw new Error("That name is already taken in this room");
  }
  const sessionToken = nanoid(SESSION_TOKEN_LENGTH);
  room.players.push({
    id,
    sessionToken,
    name: trimmed,
    hand: [],
    alive: true,
    protected: false,
    connected: true,
    avatarUrl: null,
  });
  if (!(id in room.tokens)) room.tokens[id] = 0;
}

const MAX_SPECTATORS = 20;

function nameTaken(room, name) {
  const lower = name.toLowerCase();
  return room.players.some((p) => p.name.toLowerCase() === lower) || room.spectators.some((s) => s.name.toLowerCase() === lower);
}

// Joining a room whose match is already underway makes you a spectator
// instead of a player — you can watch (deck count, discard, chat, everything
// public) but never see anyone's hand. The host can add you as a real player
// once the whole match finishes (see promoteSpectator), not mid-match, since
// there's no clean way to deal a new player into a round in progress.
export function addSpectator(room, id, name) {
  if (typeof name !== "string") throw new Error("Name is required");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required");
  if (trimmed.length > MAX_NAME_LENGTH) throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  if (nameTaken(room, trimmed)) throw new Error("That name is already taken in this room");
  if (room.spectators.length >= MAX_SPECTATORS) throw new Error("Too many spectators right now");

  const sessionToken = nanoid(SESSION_TOKEN_LENGTH);
  const spectator = { id, sessionToken, name: trimmed, avatarUrl: null, connected: true };
  room.spectators.push(spectator);
  return spectator;
}

// Host-only, and only once the current match has fully concluded — moves a
// spectator into an actual player seat for the next match. Their session
// token carries over unchanged, so their browser's existing resume flow
// keeps working without needing to rejoin.
export function promoteSpectator(room, requesterId, spectatorId) {
  if (room.hostId !== requesterId) throw new Error("Only the host can add spectators to the game");
  if (!room.matchEnded) throw new Error("Can only add spectators once the match has finished");
  if (room.players.length >= MAX_PLAYERS) throw new Error("Room is full (max 4)");

  const idx = room.spectators.findIndex((s) => s.id === spectatorId);
  if (idx === -1) throw new Error("Spectator not found");
  const spectator = room.spectators[idx];
  room.spectators.splice(idx, 1);

  room.players.push({
    id: spectator.id,
    sessionToken: spectator.sessionToken,
    name: spectator.name,
    hand: [],
    alive: true,
    protected: false,
    connected: spectator.connected,
    avatarUrl: spectator.avatarUrl,
  });
  room.tokens[spectator.id] = 0;
  return spectator;
}

// A custom profile picture, sent as a small resized data URL (the client
// crops/resizes it before sending — this just double-checks server-side
// rather than trusting that happened). Lightweight and in-memory like
// everything else here: no file storage, dies with the room. `avatarUrl`
// of null/"" clears back to the default deterministic avatar.
const MAX_AVATAR_DATA_URL_LENGTH = 120_000; // generous for a small square JPEG, not for a dumped multi-MB photo

export function setAvatar(room, playerId, avatarUrl) {
  const target = room.players.find((p) => p.id === playerId) || room.spectators.find((s) => s.id === playerId);
  if (!target) throw new Error("Not in this room");

  if (avatarUrl === null || avatarUrl === undefined || avatarUrl === "") {
    target.avatarUrl = null;
    return target;
  }
  if (typeof avatarUrl !== "string" || !avatarUrl.startsWith("data:image/")) {
    throw new Error("That doesn't look like a valid image.");
  }
  if (avatarUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error("Image is too large — try a smaller photo.");
  }
  target.avatarUrl = avatarUrl;
  return target;
}

// Handles what happens when a socket disconnects: marking them away and
// transferring host ownership if needed. Does NOT eliminate them and does
// NOT hand their turn to anyone else — if it's their turn (or becomes their
// turn later), the game simply waits for them. Only an explicit host kick
// or the player's own "leave" actually removes someone from the round.
export function handleDisconnect(room, playerId) {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;

    if (room.hostId === playerId) {
      const nextHost = room.players.find((p) => p.connected && !p.removed);
      if (nextHost) {
        room.hostId = nextHost.id;
        log(room, `${nextHost.name} is now the host.`);
      }
    }
    // No turn change here — if it's currently their turn, their hand is
    // untouched and waiting; if it becomes their turn later, advanceTurn
    // (below) will land on them and simply not start it until they're back.
    return;
  }

  const spectator = room.spectators.find((s) => s.id === playerId);
  if (spectator) spectator.connected = false;
}

// Fully removes a player — used for both an explicit "leave" and a host
// kick. Unlike a disconnect, this is permanent: their session token is
// cleared so they can never resume this seat again, and (mid-game) they're
// eliminated from the round outright rather than just skipped. Before the
// game has started, they're safe to actually splice out of the players
// array (no turn order exists yet to corrupt); mid-game, they're marked
// `removed` instead and filtered out of public state — actually removing
// an array entry mid-round would desync `turnIndex`. The `removed` marker
// gets swept for real the next time a round starts (see startGame).
export function removePlayerFully(room, playerId, { requireHostId = null, reason = "left the room" } = {}) {
  if (requireHostId !== null && room.hostId !== requireHostId) {
    throw new Error("Only the host can remove players");
  }
  if (requireHostId !== null && requireHostId === playerId) {
    throw new Error("You can't remove yourself");
  }
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found");

  const wasHost = room.hostId === playerId;
  player.sessionToken = null;

  if (!room.started) {
    room.players = room.players.filter((p) => p.id !== playerId);
  } else {
    player.connected = false;
    player.removed = true;
    if (player.alive) {
      const wasCurrentTurn = !room.ended && currentPlayer(room)?.id === playerId;
      eliminate(room, player, reason);
      if (wasCurrentTurn) {
        afterPlayResolve(room);
      } else {
        checkRoundEndOnly(room);
      }
    }
  }

  if (wasHost) {
    const nextHost = room.players.find((p) => p.connected && !p.removed);
    if (nextHost) {
      room.hostId = nextHost.id;
      log(room, `${nextHost.name} is now the host.`);
    }
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

  // If the game paused on this exact player's turn while they were away
  // (their hand is still at the resting size of 1, meaning they never got
  // to draw), pick it back up now that they're here.
  if (room.started && !room.ended && player.alive && room.players[room.turnIndex] === player && player.hand.length === 1) {
    drawForTurn(room);
  }

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

// Simpler than reconnectPlayer since a spectator has no hand, turn, discard
// pile, or token count to migrate — just their identity and connection.
export function reconnectSpectator(room, token, newSocketId) {
  if (!token) return null;
  const spectator = room.spectators.find((s) => s.sessionToken === token);
  if (!spectator) return null;
  spectator.id = newSocketId;
  spectator.connected = true;
  return spectator;
}

function log(room, msg) {
  room.log.push(msg);
  if (room.log.length > 200) room.log.shift();
}

export function startGame(room) {
  room.players = room.players.filter((p) => !p.removed);
  if (room.players.length < MIN_PLAYERS) throw new Error("Need at least 2 players");
  if (room.started) throw new Error("Already started");

  room.started = true;
  room.ended = false;
  room.winnerIds = [];
  room.round += 1;
  room.log = [];
  room.discard = {};
  room.playHistory = [];
  room.lastAction = null;
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
  room.lastAction = { cardValue, playerId: player.id, playerName: player.name, message: resultMsg };
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

function checkRoundEndOnly(room) {
  if (room.ended) return;
  const alive = alivePlayers(room);
  if (alive.length === 1) {
    finishRound(room, alive, "only one player remains");
  } else if (alive.length === 0) {
    room.ended = true;
    log(room, "Round ended — no players remaining.");
  }
}

// Moves to the next alive player in turn order — eliminated players are the
// only ones ever passed over. If that player is connected, their turn
// starts normally (draw a card). If they're away, the turn simply waits on
// them: turnIndex points at them, but nothing is drawn and no one else can
// act, until they reconnect (see reconnectPlayer) or the host removes them
// (see removePlayerFully, which re-runs this once they're gone).
function advanceTurn(room) {
  let next = room.turnIndex;
  for (let i = 0; i < room.players.length; i++) {
    next = (next + 1) % room.players.length;
    if (room.players[next].alive) break;
  }
  room.turnIndex = next;
  const player = room.players[next];
  if (player.connected) {
    drawForTurn(room);
  } else {
    log(room, `Waiting for ${player.name} to reconnect…`);
  }
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
    lastAction: room.lastAction,
    spectators: room.spectators.map((s) => ({ id: s.id, name: s.name, avatarUrl: s.avatarUrl, connected: s.connected })),
    chat: room.chat.slice(-100),
    players: room.players
      .filter((p) => !p.removed)
      .map((p) => ({
        id: p.id,
        name: p.name,
        alive: p.alive,
        protected: p.protected,
        connected: p.connected,
        handCount: p.hand.length,
        discard: room.discard[p.id] || [],
        tokens: room.tokens[p.id] || 0,
        avatarUrl: p.avatarUrl || null,
      })),
  };
}

export function getPrivateHand(room, playerId) {
  const p = room.players.find((p) => p.id === playerId);
  return p ? p.hand : [];
}
