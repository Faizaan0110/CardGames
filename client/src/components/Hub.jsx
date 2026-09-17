import React from "react";
import TopBar from "./TopBar.jsx";

export default function Hub({ onPlay, onJoinCode }) {
  return (
    <div className="hub" style={{ backgroundImage: "url(/images/backgrounds/hub.jpg)" }}>
      <TopBar variant="full" onNavigate={(v) => (v === "join-only" ? onJoinCode("") : null)} />

      <div className="hub-content">
        <div className="hub-tagline">
          <p className="hub-tagline-script">Play. Laugh. Connect.</p>
          <p className="hub-tagline-sub">Simple games. Meaningful moments.</p>
        </div>

        <div className="games-row">
          <div className="game-card featured">
            <img src="/images/games/love-letter.jpg" alt="Love Letter" className="game-card-thumb" />
            <div className="game-card-info">
              <h3>Love Letter</h3>
              <p>A game of risk, deduction, and one lucky letter.</p>
              <button className="btn primary" onClick={() => onPlay("love-letter")}>
                Play Now →
              </button>
            </div>
          </div>

          <div className="game-card quiet">
            <img src="/images/games/coming-soon.jpg" alt="" className="game-card-thumb" />
            <p className="game-card-quiet-label">More games coming soon…</p>
            <p className="game-card-quiet-list">Codenames · Secret Hitler · DDD</p>
          </div>
        </div>

        <p className="hub-quote">"Small games. Big moments."</p>
      </div>
    </div>
  );
}
