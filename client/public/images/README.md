# Image assets

This is the current, final asset set (from the `CardRoom_Final_Claude_Pack`).
All of it is already wired into the code — this file just documents what's
here and how it's used, in case you regenerate or swap anything later.

## Important: these card images have text baked in

Unlike an earlier draft of this project, the card art in `cards/` already has
the number, name, and rules text printed directly on the image. `Card.jsx`
does **not** overlay any HTML text on top of these — it just shows the image
with `object-fit: contain` inside a 5:7 frame, so the printed border never
gets cropped. If you regenerate any card art, keep the text baked in (or tell
Claude, since removing it would need `Card.jsx` changed back to an overlay
approach).

## Layout

| Path | Used for |
|---|---|
| `logo.png` | Top-bar brand mark, and the icon above the Love Letter panel on Join/Lobby |
| `favicon.png` | Browser tab icon |
| `hero.jpg` | Not currently used on any screen — available if you want a full hero banner somewhere |
| `card-back.png` | Face-down cards (deck, opponents' hands) |
| `cards/{guard,priest,baron,handmaid,prince,king,countess,princess}.png` | The 8 card faces — text baked in, do not crop |
| `backgrounds/hub.jpg` | Full-page background on the Hub, subtle (heavy dark overlay on top) |
| `backgrounds/love-letter-lobby.jpg` | Full-page background on Create/Join and the Lobby |
| `backgrounds/love-letter-table.jpg` | Full-page background on the game table |
| `games/love-letter.jpg` | Thumbnail for the Love Letter card on the Hub |
| `games/coming-soon.jpg`, `games/codenames.jpg`, `games/secret-hitler.jpg` | Same placeholder art, used for the "more games coming soon" tile |
| `avatars/{guard,priest,baron,handmaid,prince,king,countess,princess}.jpg` | Player avatars — each player deterministically gets one of these 8 based on their name (falls back to a colored initial circle if a file's missing) |
| `ui/*.svg` | Inlined via `components/Icon.jsx` (not used as `<img>` — that wouldn't inherit theme color) |

## Palette (in `styles.css` `:root`)

- Page: `#090708`
- Panel: `rgba(18, 11, 13, .82)`
- Deep burgundy: `#4d101d`
- Rose accent: `#b52c50`
- Warm cream: `#f2e4d2`
- Antique gold: `#c9a45d`
- Muted text: `#b9a9a6`
