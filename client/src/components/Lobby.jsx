import React, { useState } from "react";
import { emitAsync } from "../socket.js";
import { saveAvatar } from "../session.js";
import TopBar from "./TopBar.jsx";
import Avatar from "./Avatar.jsx";
import AvatarPicker from "./AvatarPicker.jsx";
import Icon from "./Icon.jsx";

export default function Lobby({ myId, roomCode, state, error, setError, onBack }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === myId;
  const canStart = state.players.length >= 2 && state.players.length <= 4;
  const emptySeats = Math.max(0, 4 - state.players.length);
  const me = state.players.find((p) => p.id === myId);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      await emitAsync("start_game", {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarChange(avatarUrl) {
    try {
      await emitAsync("set_avatar", { avatarUrl });
      saveAvatar(avatarUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleKick(targetId, targetName) {
    if (!window.confirm(`Remove ${targetName} from the room?`)) return;
    try {
      await emitAsync("kick_player", { targetId });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="lobby-screen" style={{ backgroundImage: "url(/images/backgrounds/love-letter-lobby.jpg)" }}>
      <TopBar variant="slim" playerName={me?.name} avatarUrl={me?.avatarUrl} onBack={onBack} />

      <span className="join-side-text left">
        Same
        <br />
        cards
        <br />
        different
        <br />
        stories.
        <span className="flourish">✦</span>
      </span>
      <span className="join-side-text right">
        Good
        <br />
        people
        <br />
        better
        <br />
        games.
        <span className="flourish">✦</span>
      </span>

      <div className="screen center">
        <div className="panel lobby-panel letter-panel">
          <div className="panel-room-code">
            <span className="room-code-label">Room code</span>
            <div className="room-code-row">
              <span className="room-code-value">{roomCode}</span>
              <button className="icon-btn" onClick={handleCopy} aria-label="Copy room code">
                <Icon name="copy" size={14} />
              </button>
            </div>
          </div>

          <img src="/images/logo.png" alt="" className="panel-card-icon" />
          <p className="eyebrow center-text">Welcome to</p>
          <h1 className="title serif-title accent-grad">Love Letter</h1>
          <p className="subtitle center-text">A game of risk, deduction, and one lucky letter.</p>

          <div className="seat-grid">
            {state.players.map((p) => (
              <div key={p.id} className={"seat filled" + (p.id === state.hostId ? " seat-host" : "")}>
                {isHost && p.id !== myId && (
                  <button className="seat-kick-btn" onClick={() => handleKick(p.id, p.name)} aria-label={`Remove ${p.name}`}>
                    <Icon name="close" size={10} />
                  </button>
                )}
                {p.id === myId ? (
                  <AvatarPicker name={p.name} avatarUrl={p.avatarUrl} onChange={handleAvatarChange} size={52} />
                ) : (
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size={52} ring />
                )}
                <span className="seat-name">{p.name}</span>
                <span className={"seat-status" + (p.id === state.hostId ? " host" : "")}>
                  {p.id === state.hostId ? (
                    <>
                      <Icon name="crown" size={12} /> Host
                    </>
                  ) : p.connected ? (
                    "Ready"
                  ) : (
                    "Away"
                  )}
                </span>
              </div>
            ))}
            {Array.from({ length: emptySeats }).map((_, i) => (
              <div key={i} className="seat empty">
                <div className="seat-empty-icon">
                  <Icon name="plus" size={16} />
                </div>
                <span className="seat-name muted">Empty seat</span>
                <span className="seat-status muted">Invite a friend</span>
              </div>
            ))}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="lobby-actions">
            <button className="btn" onClick={handleCopy}>
              <Icon name="copy" size={14} /> {copied ? "Copied!" : "Copy invite code"}
            </button>
            {isHost ? (
              <button className="btn primary" onClick={handleStart} disabled={!canStart || busy}>
                Start game →
              </button>
            ) : (
              <span className="hint">Waiting for the host to start…</span>
            )}
          </div>
          {isHost && !canStart && (
            <p className="hint center-text">
              <Icon name="users" size={12} /> Need 2–4 players to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
