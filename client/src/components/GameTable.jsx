import React, { useEffect, useMemo, useState } from "react";
import { emitAsync } from "../socket.js";
import Card from "./Card.jsx";
import Avatar from "./Avatar.jsx";
import CheatsheetPanel from "./CheatsheetPanel.jsx";
import GameRulesPanel from "./GameRulesPanel.jsx";
import TopBar from "./TopBar.jsx";
import Icon from "./Icon.jsx";
import { CARD_META } from "../cardData.js";

const NEEDS_TARGET = new Set([1, 2, 3, 6]);
const PRINCE = 5;
const GUARD = 1;
const GUESS_VALUES = [2, 3, 4, 5, 6, 7, 8];

export default function GameTable({ myId, roomCode, state, hand, reveal, onDismissReveal, error, setError, onBack }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [guessValue, setGuessValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);

  const isMyTurn = state.turnPlayerId === myId && !state.ended;
  const isHost = state.hostId === myId;

  const needsTarget = selectedCard !== null && (NEEDS_TARGET.has(selectedCard) || selectedCard === PRINCE);
  const needsGuess = selectedCard === GUARD;

  const validTargets = useMemo(() => {
    if (!needsTarget) return [];
    return state.players.filter((p) => {
      if (!p.alive) return false;
      if (selectedCard === PRINCE) return p.id === myId || !p.protected;
      return p.id !== myId && !p.protected;
    });
  }, [needsTarget, selectedCard, state.players, myId]);

  // If there's only one legal target (e.g. Prince with everyone else protected,
  // so only yourself is left), just pick it automatically — there's no real
  // choice to make, so don't force a click for it.
  useEffect(() => {
    if (needsTarget && targetId === null && validTargets.length === 1) {
      setTargetId(validTargets[0].id);
    }
  }, [needsTarget, targetId, validTargets]);

  // Prince specifically: when every other player is protected, self-targeting
  // isn't a choice you make — it's the only legal outcome. Don't show a
  // one-button "choose yourself" row for that; say so instead. (The server
  // independently enforces this regardless of what targetId gets sent — this
  // is purely about not making the UI ask a question with only one answer.)
  const princeForcedSelf = selectedCard === PRINCE && validTargets.length === 1 && validTargets[0].id === myId;
  const noLegalTarget = needsTarget && selectedCard !== PRINCE && validTargets.length === 0;

  function selectCard(value) {
    if (!isMyTurn || busy) return;
    setSelectedCard((prev) => (prev === value ? null : value));
    setTargetId(null);
    setGuessValue(null);
    setError(null);
  }

  function readyToPlay() {
    if (selectedCard === null) return false;
    // Only require picking a target when there's actually one to pick —
    // if nobody is a legal target (all protected/eliminated), the card
    // still gets played, it just has no effect.
    if (needsTarget && validTargets.length > 0 && !targetId) return false;
    // Guessing only makes sense once a target is chosen.
    if (needsGuess && targetId && !guessValue) return false;
    return true;
  }

  async function handlePlay() {
    setBusy(true);
    setError(null);
    try {
      await emitAsync("play_card", { cardValue: selectedCard, targetId, guessValue });
      setSelectedCard(null);
      setTargetId(null);
      setGuessValue(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePlayAgain() {
    setBusy(true);
    setError(null);
    try {
      await emitAsync("play_again", {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleKick(targetId, targetName) {
    if (!window.confirm(`Remove ${targetName} from the game?`)) return;
    try {
      await emitAsync("kick_player", { targetId });
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleLog = logExpanded ? state.log.slice(-14) : state.log.slice(-3);
  const selectedMeta = selectedCard !== null ? CARD_META[selectedCard] : null;

  return (
    <div className="table-screen" style={{ backgroundImage: "url(/images/backgrounds/love-letter-table.jpg)" }}>
      <TopBar variant="slim" roomCode={roomCode} onBack={onBack} />

      <div className="game-layout">
        <div className="game-main">
          <div className="game-header">
            <h1 className="title sm">Love Letter</h1>
            <p className="game-subline">
              Round {state.round} &nbsp;•&nbsp; Deck {state.deckCount} &nbsp;•&nbsp; First to {state.favorTarget} tokens
            </p>
          </div>

          <section className="player-strip">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={"player-chip" + (state.turnPlayerId === p.id ? " active-turn" : "") + (!p.alive ? " eliminated" : "")}
              >
                {state.turnPlayerId === p.id && (
                  <span className="crown" title="Current turn">
                    <Icon name="crown" size={13} />
                  </span>
                )}
                <Avatar name={p.name} avatarUrl={p.avatarUrl} size={30} />
                <span className="player-chip-name">{p.id === myId ? "You" : p.name}</span>
                <span className="tokens-pill">
                  <Icon name="heart" size={11} /> {p.tokens || 0}
                </span>
                {p.protected && (
                  <span className="badge">
                    <Icon name="shield" size={10} /> Shielded
                  </span>
                )}
                {!p.alive && <span className="badge muted">Out</span>}
                {!p.connected && <span className="badge muted">Away</span>}
                {isHost && p.id !== myId && (
                  <button className="chip-kick-btn" onClick={() => handleKick(p.id, p.name)} aria-label={`Remove ${p.name}`}>
                    <Icon name="close" size={10} />
                  </button>
                )}
              </div>
            ))}
          </section>

          {(state.ended || state.matchEnded) && (
            <div className="round-banner">
              {state.matchEnded ? (
                <p>
                  {state.matchWinnerIds.map((id) => nameFor(state, id)).join(" & ")} won the match with {state.favorTarget} tokens
                  of affection! 🏆
                </p>
              ) : (
                <p>
                  {state.winnerIds.length === 1
                    ? `${nameFor(state, state.winnerIds[0])} wins the round!`
                    : `${state.winnerIds.map((id) => nameFor(state, id)).join(" & ")} tie for the round!`}
                </p>
              )}
              {isHost && (
                <button className="btn primary" onClick={handlePlayAgain} disabled={busy}>
                  {state.matchEnded ? "Start a new match" : "Play next round"}
                </button>
              )}
            </div>
          )}

          <section className="table-center">
            <div className="deck-stack">
              <div className="deck-card-wrap">
                <span className="deck-shadow-card deck-shadow-2" />
                <span className="deck-shadow-card deck-shadow-1" />
                <Card faceDown size="deck" />
                <span className="deck-count-badge">{state.deckCount}</span>
              </div>
              <span className="deck-label">Deck</span>
            </div>
            <div className="discard-rail">
              <span className="discard-rail-label">Discarded</span>
              <div className="discard-rail-cards">
                {state.faceUpRemoved.length === 0 && state.playHistory.length === 0 && (
                  <span className="hint">No cards played yet.</span>
                )}
                {state.faceUpRemoved.map((v, i) => (
                  <div key={"removed-" + i} className="discard-item">
                    <Card value={v} size="thumb" />
                    <span className="discard-item-name">Removed</span>
                  </div>
                ))}
                {state.playHistory.map((h, i) => (
                  <div key={i} className="discard-item">
                    <Card value={h.value} size="thumb" />
                    <span className="discard-item-name">{h.playerId === myId ? "You" : h.playerName}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {reveal && reveal.type === "priest" && (
            <div className="reveal-toast">
              Priest reveal: {nameFor(state, reveal.targetId)} is holding {CARD_META[reveal.card]?.name}.
            </div>
          )}

          {/* Baron reveal now renders as a modal near the end of this component, not inline here */}

          {error && <p className="error floating">{error}</p>}

          <section className="my-area">
            {isMyTurn && !state.ended ? (
              <p className="turn-banner">
                <Icon name="crown" size={13} /> Your turn — choose a card to play
              </p>
            ) : !state.ended ? (
              (() => {
                const turnPlayer = state.players.find((p) => p.id === state.turnPlayerId);
                if (turnPlayer && !turnPlayer.connected) {
                  return (
                    <p className="turn-banner dim">
                      Waiting for {turnPlayer.name} to reconnect…{isHost ? " You can remove them if they don't come back." : ""}
                    </p>
                  );
                }
                return <p className="turn-banner dim">Waiting for {nameFor(state, state.turnPlayerId)}…</p>;
              })()
            ) : null}

            <div className="my-hand">
              {hand.map((v, i) => (
                <Card
                  key={i}
                  value={v}
                  size="lg"
                  selected={selectedCard === v}
                  dimmed={selectedCard !== null && selectedCard !== v}
                  onClick={() => selectCard(v)}
                />
              ))}
            </div>

            {isMyTurn && selectedMeta && (
              <div className="action-tray" key={selectedCard}>
                <p className="action-tray-title">Play {selectedMeta.name}</p>
                {princeForcedSelf ? (
                  <p className="action-tray-hint">All other players are protected — the Prince will affect you.</p>
                ) : noLegalTarget ? (
                  <p className="action-tray-hint">No eligible targets — this card will resolve with no effect.</p>
                ) : (
                  selectedMeta.action && <p className="action-tray-hint">{selectedMeta.action}</p>
                )}

                {!princeForcedSelf && !noLegalTarget && (needsTarget || (needsGuess && targetId)) && (
                  <div className="action-tray-controls">
                    {needsTarget && (
                      <div className="action-field">
                        <span className="action-field-label">Target</span>
                        <div className="choice-row">
                          {validTargets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className={"choice-btn" + (targetId === p.id ? " active" : "")}
                              onClick={() => setTargetId(p.id)}
                            >
                              <Avatar name={p.name} avatarUrl={p.avatarUrl} size={22} />
                              {p.id === myId ? `${p.name} (you)` : p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {needsGuess && targetId && (
                      <div className="action-field">
                        <span className="action-field-label">Guess their card</span>
                        <div className="choice-row">
                          {GUESS_VALUES.map((v) => (
                            <button
                              key={v}
                              type="button"
                              className={"choice-btn" + (guessValue === v ? " active" : "")}
                              onClick={() => setGuessValue(v)}
                            >
                              {v} · {CARD_META[v].name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button className="btn primary play-card-btn" onClick={handlePlay} disabled={!readyToPlay() || busy}>
                  Play {selectedMeta.name} →
                </button>
              </div>
            )}
          </section>

          <section className="log">
            <button className="log-header" onClick={() => setLogExpanded((e) => !e)}>
              <span>Game Log</span>
              <Icon name="chevron-down" size={12} className={logExpanded ? "log-chevron open" : "log-chevron"} />
            </button>
            <div className="log-body">
              {visibleLog.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </section>
        </div>

        <aside className="game-sidebar">
          <div className="sidebar-panel compact">
            <h3>Game Info</h3>
            <ul className="game-info-list">
              <li>
                <Icon name="users" size={13} /> 2–4 players
              </li>
              <li>
                <Icon name="book" size={13} /> 16 cards
              </li>
              <li>
                <Icon name="heart" size={13} /> First to {state.favorTarget} tokens
              </li>
            </ul>
          </div>

          <button className="cheatsheet-trigger" onClick={() => setShowRules(true)}>
            <Icon name="users" size={14} /> How to Play
          </button>

          <button className="cheatsheet-trigger" onClick={() => setShowCheatsheet(true)}>
            <Icon name="book" size={14} /> View Cheatsheet
          </button>
        </aside>
      </div>

      {showRules && <GameRulesPanel onClose={() => setShowRules(false)} />}
      {showCheatsheet && <CheatsheetPanel onClose={() => setShowCheatsheet(false)} />}
      {reveal && reveal.type === "baron" && <BaronRevealModal reveal={reveal} myId={myId} state={state} onClose={onDismissReveal} />}
    </div>
  );
}

// Shown only to the two players who played/were targeted by a Baron — the
// server only ever sends this event to those two sockets, never the room.
// Unlike Priest's quick-glance toast, this stays up until the viewer
// dismisses it themselves — a duel result is worth actually reading.
function BaronRevealModal({ reveal, myId, state, onClose }) {
  const closeBtnRef = React.useRef(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const isA = reveal.aId === myId;
  const myCard = isA ? reveal.aCard : reveal.bCard;
  const theirCard = isA ? reveal.bCard : reveal.aCard;
  const theirName = nameFor(state, isA ? reveal.bId : reveal.aId);
  const tie = myCard === theirCard;
  const won = myCard > theirCard;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel baron-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="baron-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="baron-modal-title" className="baron-modal-title">
          Baron Duel
        </h2>

        <div className="baron-duel">
          <div className="baron-duel-side">
            <Card value={myCard} size="lg" />
            <span className="baron-duel-name">You</span>
          </div>
          <span className="baron-duel-vs">VS</span>
          <div className="baron-duel-side">
            <Card value={theirCard} size="lg" />
            <span className="baron-duel-name">{theirName}</span>
          </div>
        </div>

        <p className={"baron-duel-outcome" + (tie ? " tie" : won ? " win" : " lose")}>
          {tie ? "A tie — no effect." : won ? `You win — ${theirName} is eliminated.` : "You lose — you are eliminated."}
        </p>

        <button className="btn primary" onClick={onClose} ref={closeBtnRef}>
          OK
        </button>
      </div>
    </div>
  );
}

function nameFor(state, id) {
  const p = state.players.find((p) => p.id === id);
  return p ? p.name : "someone";
}
