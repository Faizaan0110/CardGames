import React, { useRef, useState } from "react";
import { readAndResizeImage } from "../avatarUpload.js";
import Avatar from "./Avatar.jsx";

export default function AvatarPicker({ name, avatarUrl, onChange, size = 64 }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again later if needed
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await readAndResizeImage(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="avatar-picker">
      <button
        type="button"
        className="avatar-picker-preview"
        onClick={() => inputRef.current?.click()}
        aria-label={avatarUrl ? "Change profile photo" : "Add a profile photo"}
      >
        <Avatar name={name} avatarUrl={avatarUrl} size={size} ring />
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} hidden />
      <div className="avatar-picker-actions">
        <button type="button" className="link-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Processing…" : avatarUrl ? "Change photo" : "Add photo"}
        </button>
        {avatarUrl && !busy && (
          <button type="button" className="link-btn" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="error avatar-picker-error">{error}</p>}
    </div>
  );
}
