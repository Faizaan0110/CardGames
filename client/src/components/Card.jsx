import React from "react";
import { CARD_META } from "../cardData.js";

export default function Card({ value, size = "md", faceDown = false, selected = false, dimmed = false, onClick }) {
  const cls = [
    "card",
    `card-${size}`,
    selected ? "selected" : "",
    dimmed ? "dimmed" : "",
    onClick ? "clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // A card you can act on is a real <button> — native keyboard support
  // (Tab to focus, Enter/Space to activate) for free, no extra wiring needed.
  // A card that's just being displayed (deck, discard, cheatsheet) stays a
  // plain, non-interactive div.
  const Tag = onClick ? "button" : "div";
  const interactiveProps = onClick ? { type: "button", onClick, "aria-pressed": selected } : {};

  if (faceDown) {
    return (
      <Tag className={cls} {...interactiveProps}>
        <img src="/images/card-back.png" alt="" className="card-img" />
      </Tag>
    );
  }

  const meta = CARD_META[value];
  if (!meta) {
    return <Tag className={cls} {...interactiveProps} />;
  }

  return (
    <Tag className={cls} {...interactiveProps} aria-label={onClick ? `${meta.name}: ${meta.text}` : undefined}>
      <img src={`/images/${meta.image}`} alt={meta.name} className="card-img" />
    </Tag>
  );
}
