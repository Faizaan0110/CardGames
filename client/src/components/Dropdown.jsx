import React, { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

export default function Dropdown({ options, value, onChange, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selected = options.find((o) => o.id === value);
  const selectedIndex = options.findIndex((o) => o.id === value);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = selectedIndex >= 0 ? selectedIndex : 0;
      optionRefs.current[idx]?.focus();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeAndRefocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  function handleOptionKeyDown(e, index) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAndRefocus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      optionRefs.current[Math.min(index + 1, options.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      optionRefs.current[Math.max(index - 1, 0)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      optionRefs.current[options.length - 1]?.focus();
    }
  }

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className={"dropdown-trigger" + (open ? " open" : "")}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="dropdown-selected">
            {selected.avatar}
            {selected.label}
          </span>
        ) : (
          <span className="dropdown-placeholder">{placeholder}</span>
        )}
        <span className="chevron-down">
          <Icon name="chevron-down" size={12} />
        </span>
      </button>
      {open && (
        <div className="dropdown-list" role="listbox">
          {options.length === 0 && <div className="dropdown-empty">No options available</div>}
          {options.map((o, i) => (
            <button
              type="button"
              key={o.id}
              ref={(el) => (optionRefs.current[i] = el)}
              role="option"
              aria-selected={o.id === value}
              className={"dropdown-option" + (o.id === value ? " active" : "")}
              onClick={() => {
                onChange(o.id);
                closeAndRefocus();
              }}
              onKeyDown={(e) => handleOptionKeyDown(e, i)}
            >
              {o.avatar}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
