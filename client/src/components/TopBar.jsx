import React, { useState } from "react";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

export default function TopBar({ variant = "full", onNavigate, onBack, roomCode, playerName }) {
  const [copied, setCopied] = useState(false);

  function copyRoomCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  if (variant === "slim") {
    return (
      <header className="topbar slim">
        <div className="topbar-left">
          <img src="/images/logo.png" alt="" className="logo-mark-img" />
          <span className="logo-word">CardRoom</span>
        </div>
        <nav className="topbar-nav">
          <button className="nav-link" onClick={onBack}>
            Home
          </button>
          <button className="nav-link" onClick={onBack}>
            Games
          </button>
          <button className="nav-link" onClick={onBack}>
            Rooms
          </button>
        </nav>
        <div className="topbar-right">
          {playerName && (
            <button className="player-chip-nav" onClick={onBack}>
              <Avatar name={playerName} size={30} />
              <span>{playerName}</span>
              <Icon name="chevron-down" size={13} />
            </button>
          )}
          {!playerName && roomCode && (
            <>
              <button className="room-pill room-pill-btn" onClick={copyRoomCode}>
                {copied ? "Copied!" : (
                  <>
                    Room {roomCode} <Icon name="copy" size={12} />
                  </>
                )}
              </button>
              <button className="btn leave-btn sm" onClick={onBack}>
                Leave
              </button>
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <img src="/images/logo.png" alt="" className="logo-mark-img" />
        <span className="logo-word">CardRoom</span>
      </div>
      <nav className="topbar-nav">
        <button className="nav-link active" onClick={() => onNavigate("hub")}>
          Home
        </button>
        <button className="nav-link" onClick={() => onNavigate("hub")}>
          Games
        </button>
        <button className="nav-link" onClick={() => onNavigate("join-only")}>
          Rooms
        </button>
      </nav>
      <button className="btn primary sm" onClick={() => onNavigate("join-only")}>
        Join Room
      </button>
    </header>
  );
}
