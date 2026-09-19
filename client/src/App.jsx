import React, { useEffect, useState } from "react";
import { socket, emitAsync } from "./socket.js";
import { getSavedSession, saveSession, clearSavedSession } from "./session.js";
import Hub from "./components/Hub.jsx";
import JoinScreen from "./components/JoinScreen.jsx";
import Lobby from "./components/Lobby.jsx";
import GameTable from "./components/GameTable.jsx";
import SpectatorView from "./components/SpectatorView.jsx";

export default function App() {
  const [view, setView] = useState("hub"); // 'hub' | 'join'
  const [joinPrefill, setJoinPrefill] = useState({ mode: "create", code: "" });

  const [myId, setMyId] = useState(socket.id || null);
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState("player"); // 'player' | 'spectator'
  const [publicState, setPublicState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState(null);
  // Only true while we have a saved session and haven't heard back from the
  // server about it yet — avoids flashing the Hub before snapping into a
  // room on page load. Starts false (no flash) if there's nothing to resume.
  const [resuming, setResuming] = useState(() => !!getSavedSession());

  useEffect(() => {
    function onConnect() {
      setMyId(socket.id);
      tryResume();
    }
    function onState(state) {
      setPublicState(state);
    }
    function onHand({ hand }) {
      setMyHand(hand);
    }
    function onReveal(info) {
      setReveal(info);
      // Every reveal type now requires the player to actually dismiss it -
      // a duel result or a peeked hand is worth reading properly, not
      // flashing past on a timer (see GameTable's reveal modals).
    }

    async function tryResume() {
      const saved = getSavedSession();
      if (!saved) {
        setResuming(false);
        return;
      }
      try {
        const res = await emitAsync("resume_session", saved);
        setRoomCode(res.code);
        setRole(res.role || "player");
        setError(null);
      } catch {
        // Session no longer valid (room gone, or it never existed) — stop
        // trying and let the person start fresh from the Hub.
        clearSavedSession();
      } finally {
        setResuming(false);
      }
    }

    socket.on("connect", onConnect);
    socket.on("state", onState);
    socket.on("hand", onHand);
    socket.on("reveal", onReveal);

    // If we're already connected by the time this effect runs (e.g. fast
    // refresh in dev), still attempt resume once.
    if (socket.connected) tryResume();

    return () => {
      socket.off("connect", onConnect);
      socket.off("state", onState);
      socket.off("hand", onHand);
      socket.off("reveal", onReveal);
    };
  }, []);

  function handlePlayFromHub(gameId) {
    // Only Love Letter is wired up right now; the hub only calls this for playable games.
    setJoinPrefill({ mode: "create", code: "" });
    setView("join");
  }

  function handleJoinCodeFromHub(code) {
    setJoinPrefill({ mode: "join", code });
    setView("join");
  }

  function handleJoined(code, sessionToken, joinedRole) {
    if (sessionToken) saveSession(sessionToken, code);
    setRoomCode(code);
    setRole(joinedRole || "player");
    setError(null);
  }

  async function handleLeave() {
    try {
      await emitAsync("leave_room", {});
    } catch {
      // Even if this fails (e.g. connection already dropped), still leave locally.
    }
    clearSavedSession();
    socket.disconnect();
    socket.connect();
    setRoomCode(null);
    setPublicState(null);
    setMyHand([]);
    setError(null);
    setView("hub");
  }

  if (resuming) {
    return (
      <div className="screen center">
        <p className="hint">Reconnecting…</p>
      </div>
    );
  }

  if (!roomCode || !publicState) {
    if (view === "join") {
      return (
        <JoinScreen
          onJoined={handleJoined}
          onBack={() => setView("hub")}
          initialMode={joinPrefill.mode}
          initialCode={joinPrefill.code}
        />
      );
    }
    return <Hub onPlay={handlePlayFromHub} onJoinCode={handleJoinCodeFromHub} />;
  }

  // Once we have live state, trust it over the role captured at join/resume
  // time — that's what makes a host's promotion actually take effect on the
  // promoted person's own browser without needing them to refresh: the next
  // broadcast shows them in `players` instead of `spectators`, and this
  // recomputes accordingly.
  const isSpectating = publicState.spectators?.some((s) => s.id === myId) ?? role === "spectator";

  if (isSpectating) {
    return <SpectatorView myId={myId} roomCode={roomCode} state={publicState} onBack={handleLeave} />;
  }

  if (!publicState.started) {
    return <Lobby myId={myId} roomCode={roomCode} state={publicState} error={error} setError={setError} onBack={handleLeave} />;
  }

  return (
    <GameTable
      myId={myId}
      roomCode={roomCode}
      state={publicState}
      hand={myHand}
      reveal={reveal}
      onDismissReveal={() => setReveal(null)}
      error={error}
      setError={setError}
      onBack={handleLeave}
    />
  );
}
