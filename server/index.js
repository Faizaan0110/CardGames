import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { createRoom, getRoom, sweepEmptyRooms } from "./game/rooms.js";
import {
  addPlayer,
  handleDisconnect,
  reconnectPlayer,
  removePlayerFully,
  setAvatar,
  startGame,
  canPlay,
  playCard,
  afterPlayResolve,
  getPublicState,
  getPrivateHand,
  resetMatch,
} from "./game/engine.js";

const PORT = process.env.PORT || 4000;

// In dev this is unset and everything is allowed, which is what you want
// running locally. In production, set ALLOWED_ORIGIN to your deployed
// client's exact URL so other sites can't open sockets to this server on
// a visitor's behalf.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN },
});

// socket.id -> { roomCode, name }
const socketMeta = new Map();

// ---- Lightweight abuse protection ----
// No external rate-limit library — this is a tiny in-memory project, not a
// service that needs one. Just enough to stop a script from hammering
// create_room in a loop.
const ROOM_CREATE_COOLDOWN_MS = 3000;
const lastCreateAt = new Map(); // socket.id -> timestamp
const ROOM_CODE_RE = /^[A-Za-z0-9]{4}$/;

function broadcastState(roomCode) {
  const room = getRoom(roomCode);
  if (!room) return;
  const publicState = getPublicState(room);
  io.to(roomCode).emit("state", publicState);
  for (const p of room.players) {
    io.to(p.id).emit("hand", { hand: getPrivateHand(room, p.id) });
  }
}

io.on("connection", (socket) => {
  socket.on("create_room", ({ name } = {}, cb) => {
    try {
      const now = Date.now();
      const last = lastCreateAt.get(socket.id) || 0;
      if (now - last < ROOM_CREATE_COOLDOWN_MS) {
        throw new Error("Please wait a moment before creating another room.");
      }
      if (!name || !name.trim()) throw new Error("Name is required");
      const room = createRoom(socket.id);
      lastCreateAt.set(socket.id, now);
      addPlayer(room, socket.id, name.trim());
      const player = room.players.find((p) => p.id === socket.id);
      socket.join(room.code);
      socketMeta.set(socket.id, { roomCode: room.code, name: name.trim() });
      cb({ ok: true, code: room.code, sessionToken: player.sessionToken });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("join_room", ({ name, code } = {}, cb) => {
    try {
      if (!name || !name.trim()) throw new Error("Name is required");
      if (typeof code !== "string" || !ROOM_CODE_RE.test(code)) throw new Error("Invalid room code");
      const room = getRoom(code);
      if (!room) throw new Error("Room not found");
      addPlayer(room, socket.id, name.trim());
      const player = room.players.find((p) => p.id === socket.id);
      socket.join(room.code);
      socketMeta.set(socket.id, { roomCode: room.code, name: name.trim() });
      cb({ ok: true, code: room.code, sessionToken: player.sessionToken });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  // A returning browser presents the token it was given on join, plus the
  // room code it remembers — never a display name — to reclaim its seat
  // under a fresh socket.id (refresh, brief network drop, etc).
  socket.on("resume_session", ({ token, code } = {}, cb) => {
    try {
      if (!token || typeof token !== "string") throw new Error("Nothing to resume");
      if (typeof code !== "string" || !ROOM_CODE_RE.test(code)) throw new Error("Invalid room code");
      const room = getRoom(code);
      if (!room) throw new Error("Room not found");
      const player = reconnectPlayer(room, token, socket.id);
      if (!player) throw new Error("Session not found");
      socket.join(room.code);
      socketMeta.set(socket.id, { roomCode: room.code, name: player.name });
      cb({ ok: true, code: room.code, name: player.name });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("set_avatar", ({ avatarUrl } = {}, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) throw new Error("Not in a room");
      const room = getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found");
      setAvatar(room, socket.id, avatarUrl);
      cb({ ok: true });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  // An explicit, intentional leave — distinct from a passive disconnect.
  // Removes them for good (no resuming this seat afterward), rather than
  // just marking them away the way a dropped connection does.
  socket.on("leave_room", (_payload, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) {
        cb({ ok: true });
        return;
      }
      const room = getRoom(meta.roomCode);
      if (room) {
        removePlayerFully(room, socket.id, { reason: "left the room" });
        broadcastState(room.code);
      }
      socketMeta.delete(socket.id);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  // Host-only. Works both in the lobby and mid-game — same underlying
  // removal either way, just gated to the host and blocked from targeting
  // themselves (they'd use leave_room for that).
  socket.on("kick_player", ({ targetId } = {}, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) throw new Error("Not in a room");
      const room = getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found");
      removePlayerFully(room, targetId, { requireHostId: socket.id, reason: "removed by the host" });
      broadcastState(room.code);
      cb({ ok: true });
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("start_game", (_payload, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) throw new Error("Not in a room");
      const room = getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found");
      if (room.hostId !== socket.id) throw new Error("Only the host can start the game");
      startGame(room);
      cb({ ok: true });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("play_card", (action, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) throw new Error("Not in a room");
      const room = getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found");
      if (!canPlay(room, socket.id)) throw new Error("It's not your turn");

      const result = playCard(room, socket.id, action);

      // Private reveal for Priest, sent only to the acting player
      if (result.priest && result.priest.targetId) {
        const targetHand = getPrivateHand(room, result.priest.targetId);
        io.to(socket.id).emit("reveal", {
          type: "priest",
          targetId: result.priest.targetId,
          card: targetHand[0],
        });
      }

      // Baron reveal — both cards, but only to the two people who played it.
      // The rest of the room only ever learns the outcome via the log/discard
      // pile (and only the loser's card becomes public through that anyway).
      if (result.baron) {
        const payload = { type: "baron", ...result.baron };
        io.to(result.baron.aId).emit("reveal", payload);
        io.to(result.baron.bId).emit("reveal", payload);
      }

      afterPlayResolve(room);
      cb({ ok: true });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("play_again", (_payload, cb) => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) throw new Error("Not in a room");
      const room = getRoom(meta.roomCode);
      if (!room) throw new Error("Room not found");
      if (room.hostId !== socket.id) throw new Error("Only the host can start a new round");
      if (room.matchEnded) resetMatch(room);
      room.started = false;
      startGame(room);
      cb({ ok: true });
      broadcastState(room.code);
    } catch (err) {
      cb({ ok: false, error: err.message });
    }
  });

  socket.on("disconnect", () => {
    const meta = socketMeta.get(socket.id);
    if (meta) {
      const room = getRoom(meta.roomCode);
      if (room) {
        handleDisconnect(room, socket.id);
        broadcastState(room.code);
      }
      socketMeta.delete(socket.id);
    }
    lastCreateAt.delete(socket.id);
    sweepEmptyRooms();
  });
});

server.listen(PORT, () => {
  console.log(`Love Letter server listening on :${PORT}`);
  console.log(`Allowed origin: ${ALLOWED_ORIGIN}`);
});

// The grace-period logic in sweepEmptyRooms only starts/finalizes the clock
// when called — a disconnect starts it, but something needs to check back
// later to actually finish the deletion once the grace period has passed.
setInterval(sweepEmptyRooms, 10_000);

// lastCreateAt only ever grows as new sockets connect; sockets that never
// come back (rather than cleanly disconnecting) would otherwise leak here
// forever. Periodically drop anything old enough that its cooldown is moot.
setInterval(() => {
  const cutoff = Date.now() - ROOM_CREATE_COOLDOWN_MS * 10;
  for (const [id, ts] of lastCreateAt.entries()) {
    if (ts < cutoff) lastCreateAt.delete(id);
  }
}, 60_000);
