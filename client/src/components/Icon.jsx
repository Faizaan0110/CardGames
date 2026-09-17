import React from "react";

// Inlined so `fill="currentColor"` inherits the surrounding text color —
// an <img src="*.svg"> can't do that, it'd always render black.
const ICONS = {
  book: {
    viewBox: "0 0 24 24",
    path: "M3 4.5C5.8 3.7 8.5 4 11 5.4V20c-2.3-1.3-4.9-1.6-8-.8V4.5Zm18 0v14.7c-3.1-.8-5.7-.5-8 .8V5.4c2.5-1.4 5.2-1.7 8-0.9Z",
  },
  crown: {
    viewBox: "0 0 24 24",
    path: "m3 7 4.2 3.1L12 4l4.8 6.1L21 7l-1.7 10H4.7L3 7Zm2 12h14v2H5v-2Z",
  },
  heart: {
    viewBox: "0 0 24 24",
    path: "M12 21s-7.2-4.35-9.6-8.52C.36 8.94 2.08 4.5 6.17 4.08c2.26-.23 4.02.92 5.03 2.39.17.25.63.25.8 0 1.01-1.47 2.77-2.62 5.03-2.39 4.09.42 5.81 4.86 3.77 8.4C18.4 16.65 12 21 12 21Z",
  },
  shield: {
    viewBox: "0 0 24 24",
    path: "M12 2 4.5 5v5.6c0 5.1 3.2 9.5 7.5 11.4 4.3-1.9 7.5-6.3 7.5-11.4V5L12 2Zm0 3.1 4.5 1.8v3.7c0 3.6-1.9 6.8-4.5 8.4-2.6-1.6-4.5-4.8-4.5-8.4V6.9L12 5.1Z",
  },
  users: {
    viewBox: "0 0 24 24",
    path: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.5-1a3.5 3.5 0 1 0 0-7c-.5 0-1 .1-1.4.3A5.9 5.9 0 0 1 15 10c.2.4.3.7.5 1ZM2 20v-2c0-3 3.1-5 7-5s7 2 7 5v2H2Zm15 0v-2c0-1.6-.7-3-1.9-4 3.7.1 6.9 1.8 6.9 4v2h-5Z",
  },
  copy: {
    viewBox: "0 0 24 24",
    path: "M8 8h12v12H8V8Zm-4-4h12v2H6v10H4V4Z",
  },
  plus: {
    viewBox: "0 0 24 24",
    path: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z",
  },
};

const STROKE_ICONS = {
  close: { viewBox: "0 0 24 24", path: "M6 6l12 12M18 6 6 18" },
  "chevron-down": { viewBox: "0 0 24 24", path: "m6 9 6 6 6-6" },
};

export default function Icon({ name, size = 16, className = "" }) {
  if (STROKE_ICONS[name]) {
    const { viewBox, path } = STROKE_ICONS[name];
    return (
      <svg viewBox={viewBox} width={size} height={size} className={"icon " + className} aria-hidden="true">
        <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    );
  }
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg viewBox={icon.viewBox} width={size} height={size} className={"icon " + className} aria-hidden="true">
      <path fill="currentColor" d={icon.path} />
    </svg>
  );
}
