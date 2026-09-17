import React, { useState } from "react";
import { emitAsync } from "../socket.js";
import TopBar from "./TopBar.jsx";
import Icon from "./Icon.jsx";

export default function JoinScreen({ onJoined, onBack, initialMode = "create", initialCode = "" }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialCode);
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter a name first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        const res = await emitAsync("create_room", { name });
        onJoined(res.code, res.sessionToken);
      } else {
        if (!code.trim()) throw new Error("Enter a room code.");
        const res = await emitAsync("join_room", { name, code: code.trim().toUpperCase() });
        onJoined(res.code, res.sessionToken);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="join-screen" style={{ backgroundImage: "url(/images/backgrounds/love-letter-lobby.jpg)" }}>
      <TopBar variant="slim" onBack={onBack} />

      <span className="join-side-text left">
        Good
        <br />
        people
        <br />
        better
        <br />
        games.
        <span className="flourish">✦</span>
      </span>
      <span className="join-side-text right">
        Same
        <br />
        cards
        <br />
        different
        <br />
        stories.
        <span className="flourish">✦</span>
      </span>

      <div className="screen center">
        <div className="panel letter-panel">
          <img src="/images/logo.png" alt="" className="panel-card-icon" />
          <h1 className="title serif-title">Love Letter</h1>
          <p className="subtitle center-text">A game of risk, deduction, and one lucky letter.</p>

          <div className="tabs">
            <button className={mode === "create" ? "tab active" : "tab"} onClick={() => setMode("create")}>
              Create Room
            </button>
            <button className={mode === "join" ? "tab active" : "tab"} onClick={() => setMode("join")}>
              Join Room
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span>Your name</span>
              <div className="input-with-icon">
                <span className="input-icon">
                  <Icon name="users" size={14} />
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder="e.g. Alice" autoFocus />
              </div>
            </label>

            {mode === "join" && (
              <label className="field">
                <span>Room code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. A7KQ"
                  className="mono"
                />
              </label>
            )}

            {error && <p className="error">{error}</p>}

            <button type="submit" className="btn primary block" disabled={busy}>
              {mode === "create" ? "Create Room" : "Join Room"} →
            </button>
          </form>

          <div className="panel-footer-tagline">
            <span className="line" />
            <span>Play · Laugh · Connect</span>
            <span className="line" />
          </div>
        </div>
      </div>
    </div>
  );
}
