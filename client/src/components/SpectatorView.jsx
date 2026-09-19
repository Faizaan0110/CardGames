import React from "react";
import Card from "./Card.jsx";
import Avatar from "./Avatar.jsx";
import ChatPanel from "./ChatPanel.jsx";
import TopBar from "./TopBar.jsx";
import Icon from "./Icon.jsx";
import { CARD_META } from "../cardData.js";

export default function SpectatorView({ myId, roomCode, state, onBack }) {
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

          <div className="spectator-banner">
            <Icon name="users" size={14} /> You're spectating — the host can add you to the next match once this one
            finishes.
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
                <span className="player-chip-name">{p.name}</span>
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
                    <span className="discard-item-name">{h.playerName}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {state.lastAction && (
            <div className="last-action-banner" key={state.round + "-" + state.deckCount + "-" + state.playHistory.length}>
              <Card value={state.lastAction.cardValue} size="tiny" />
              <span className="last-action-text">{state.lastAction.message}</span>
            </div>
          )}
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

          <ChatPanel myId={myId} state={state} />
        </aside>
      </div>
    </div>
  );
}

function nameFor(state, id) {
  const p = state.players.find((p) => p.id === id);
  return p ? p.name : "someone";
}
