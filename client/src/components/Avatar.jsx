import React, { useState } from "react";

const PALETTE = ["#b52c50", "#7c5cff", "#2fb8a6", "#c9a45d", "#4f8fe0", "#e0645a", "#5cc76b"];
const AVATAR_NAMES = ["guard", "priest", "baron", "handmaid", "prince", "king", "countess", "princess"];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({ name, size = 40, ring = false, avatarUrl = null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const safeName = (name || "?").trim();
  const hash = hashName(safeName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={"avatar avatar-img" + (ring ? " avatar-ring" : "")}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!imgFailed) {
    const avatarName = AVATAR_NAMES[hash % AVATAR_NAMES.length];
    return (
      <img
        src={`/images/avatars/${avatarName}.jpg`}
        alt=""
        onError={() => setImgFailed(true)}
        className={"avatar avatar-img" + (ring ? " avatar-ring" : "")}
        style={{ width: size, height: size }}
      />
    );
  }

  const color = PALETTE[hash % PALETTE.length];
  const initial = safeName[0]?.toUpperCase() || "?";
  return (
    <div
      className={"avatar" + (ring ? " avatar-ring" : "")}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
