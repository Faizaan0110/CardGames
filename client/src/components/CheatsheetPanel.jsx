import React from "react";
import Card from "./Card.jsx";
import Icon from "./Icon.jsx";
import { CARD_META } from "../cardData.js";
import { useModalA11y } from "../useModalA11y.js";

export default function CheatsheetPanel({ onClose }) {
  const { panelRef, closeBtnRef } = useModalA11y(onClose);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel cheatsheet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="cheatsheet-title">Cheatsheet</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close cheatsheet" ref={closeBtnRef}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="modal-subtitle">Sixteen cards. Lowest is out first if the deck runs dry — highest hand wins.</p>

        <div className="cheatsheet-grid">
          {Object.entries(CARD_META).map(([value, meta]) => (
            <div key={value} className="cheatsheet-card">
              <span className="cheatsheet-card-count">×{meta.count}</span>
              <Card value={Number(value)} size="lg" />
              <span className="cheatsheet-card-name-mobile">{meta.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
