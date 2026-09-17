# Love Letter — Online (CardRoom)

A working, real-time multiplayer Love Letter, styled as the first playable game in a
"CardRoom" multi-game hub — dark near-black/burgundy gothic-romantic theme, using
finished illustrated card art (not placeholders).

## Project layout

```
love-letter-game/
  server/   Node + Express + Socket.io — authoritative game engine (rooms, turns, card rules)
  client/   React + Vite — hub / lobby / game UI, talks to the server over sockets
    public/images/   <- final production art (see README.md inside it for what's what)
```

## Running it locally

**1. Start the server**
```bash
cd server
npm install
npm start
```
Runs on `http://localhost:4000`.

**2. Start the client** (in a second terminal)
```bash
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`. Open it in multiple browser tabs/devices to play — each
tab is a different player.

## What's implemented

- Hub: compact tagline, Love Letter as the dominant playable card, other games shown as
  one quiet "coming soon" tile
- Room creation/joining by 4-letter code, lobby with seat grid (host gets gold distinction)
- Full Love Letter rules (all 8 cards), Countess forced-discard, Handmaid protection,
  standard 2-player variant, both round-end conditions
- **Tokens of affection**: round wins are tracked per match — first to 4 tokens wins,
  regardless of player count (a simplified house rule; official Love Letter scales this
  to 7/5/4 for 2/3/4 players), shown as hearts in the player strip
- Card art has the number/name/rules text baked into the image itself — `Card.jsx` just
  displays it (`object-fit: contain`, never cropped), no HTML text overlay
- Compact contextual action tray under the hand (target/guess dropdowns + Play button),
  not a full-width form bar
- Shared discard rail, collapsible Game Log, Cheatsheet modal (4×2 grid of real card art)
- Server is the source of truth for all hidden info — hands only ever sent to their owner

## What's next

- Reconnect handling mid-round (currently a disconnect just marks the player "away")
- Other games (Codenames, Secret Hitler, DDD) reusing this same room/socket pattern
- Optional: persistence (accounts, match history) — not needed for the current in-memory,
  session-based rooms, but easy to layer on with a database later if you want it

## Playing over the internet (not just your local network)

1. **Deploy `server/`** somewhere that keeps a long-lived Node process running with
   WebSocket support — e.g. Render, Railway, or Fly.io (not Vercel/Netlify serverless).
2. **Deploy `client/`** as a static site — Vercel, Netlify, or Cloudflare Pages.
3. Set `VITE_SERVER_URL` on the client build to your deployed server's URL, and update
   the server's CORS `origin` in `server/index.js` to your deployed client's URL.


