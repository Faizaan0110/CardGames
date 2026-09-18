import React, { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import Icon from "./Icon.jsx";

export default function TopBar({ variant = "full", onNavigate, onBack, roomCode, playerName, avatarUrl }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function copyRoomCode() {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  function handleLeaveClick() {
    setMenuOpen(false);
    onBack();
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
            <div className="player-chip-menu" ref={menuRef}>
              <button
                className="player-chip-nav"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar name={playerName} avatarUrl={avatarUrl} size={30} />
                <span>{playerName}</span>
                <Icon name="chevron-down" size={13} className={menuOpen ? "log-chevron open" : "log-chevron"} />
              </button>
              {menuOpen && (
                <div className="player-chip-dropdown" role="menu">
                  <button className="player-chip-dropdown-item" role="menuitem" onClick={handleLeaveClick}>
                    <Icon name="close" size={12} /> Leave room
                  </button>
                </div>
              )}
            </div>
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
