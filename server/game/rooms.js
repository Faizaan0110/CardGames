import { customAlphabet } from "nanoid";
import { createRoomState } from "./engine.js";

const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

// How long a room is allowed to sit with nobody connected before it's swept.
// Needs to comfortably outlast a page refresh or a brief network drop, since
// that's exactly the gap reconnect (Stage 2) is meant to bridge.
const EMPTY_ROOM_GRACE_MS = 30_000;

// Sanity ceiling on total concurrent rooms — this is a small in-memory hobby
// project, not something expected to need thousands of simultaneous games.
// Combined with the per-socket creation cooldown in index.js, this bounds
// how much memory a burst of room creation can consume.
const MAX_ROOMS = 500;

const rooms = new Map(); // code -> room state

export function createRoom(hostId) {
  if (rooms.size >= MAX_ROOMS) {
    throw new Error("Server is at capacity right now — try again shortly.");
  }
  let code;
  do {
    code = genCode();
  } while (rooms.has(code));
  const room = createRoomState(code, hostId);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

export function deleteRoom(code) {
  rooms.delete(code);
}

// Clean up rooms nobody has been connected to for a while. Called both right
// after a disconnect (to start the grace clock) and on a periodic interval
// (to actually finalize deletion once that clock runs out) — a room going
// briefly empty (e.g. the one player in it just hit refresh) is not, by
// itself, a reason to delete it.
export function sweepEmptyRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const anyoneConnected = room.players.some((p) => p.connected) || room.spectators.some((s) => s.connected);
    if (anyoneConnected) {
      room._emptySince = null;
      continue;
    }
    if (room._emptySince == null) {
      room._emptySince = now;
      continue;
    }
    if (now - room._emptySince > EMPTY_ROOM_GRACE_MS) {
      rooms.delete(code);
    }
  }
}
