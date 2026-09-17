import React, { useEffect, useRef } from "react";
import Card from "./Card.jsx";
import Icon from "./Icon.jsx";
import { CARD_META } from "../cardData.js";

export default function CheatsheetPanel({ onClose }) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previouslyFocused = useRef(document.activeElement);

  useEffect(() => {
    closeBtnRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
