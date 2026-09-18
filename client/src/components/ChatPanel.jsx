import React, { useEffect, useRef, useState } from "react";
import { emitAsync } from "../socket.js";
import Avatar from "./Avatar.jsx";

export default function ChatPanel({ myId, state }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [state.chat?.length]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await emitAsync("send_chat_message", { text: trimmed });
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function avatarFor(playerId) {
    return state.players.find((p) => p.id === playerId);
  }

  return (
    <div className="chat-panel">
      <h3>Chat</h3>
      <div className="chat-messages" ref={listRef}>
        {(!state.chat || state.chat.length === 0) && <p className="hint chat-empty">No messages yet — say hi.</p>}
        {state.chat?.map((m, i) => {
          const isMe = m.playerId === myId;
          const player = avatarFor(m.playerId);
          return (
            <div key={i} className={"chat-message" + (isMe ? " mine" : "")}>
              <Avatar name={m.playerName} avatarUrl={player?.avatarUrl} size={22} />
              <div className="chat-message-body">
                <span className="chat-message-name">{isMe ? "You" : m.playerName}</span>
                <span className="chat-message-text">{m.text}</span>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="error chat-error">{error}</p>}
      <form className="chat-input-row" onSubmit={handleSend}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" maxLength={300} />
        <button type="submit" className="btn primary sm" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
