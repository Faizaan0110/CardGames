import React from "react";
import Icon from "./Icon.jsx";
import { useModalA11y } from "../useModalA11y.js";

export default function GameRulesPanel({ onClose }) {
  const { panelRef, closeBtnRef } = useModalA11y(onClose);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="rules-modal-title">How to Play</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close how to play" ref={closeBtnRef}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="modal-subtitle">The short version — for exact card effects, see the Cheatsheet instead.</p>

        <div className="rules-sections">
          <section>
            <h3>Goal</h3>
            <p>
              Be the last player still in the round, or hold the highest card if the deck runs out. Win rounds to
              collect tokens of affection — first to reach the target shown at the top of the table wins the match.
            </p>
          </section>

          <section>
            <h3>Your turn</h3>
            <p>
              You start each turn holding 1 card. Draw a second, then play one of your two cards — whichever you
              keep stays secret. Each card has its own effect (see the Cheatsheet), from peeking at a hand to
              eliminating a player outright.
            </p>
          </section>

          <section>
            <h3>Getting eliminated</h3>
            <p>
              You're out for the round if your hand is correctly guessed (Guard), you lose a comparison (Baron), or
              you discard the Princess for any reason. Once out, your last card is revealed for everyone to see.
            </p>
          </section>

          <section>
            <h3>When the deck runs out</h3>
            <p>
              If no one's been eliminated by the time the deck empties, whoever's holding the highest card wins. A
              tie is broken by whoever discarded the higher total value of cards during that round.
            </p>
          </section>

          <section>
            <h3>Winning the match</h3>
            <p>
              Each round you win earns one token of affection. Keep playing rounds until someone reaches the target
              token count — they win the whole match.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
