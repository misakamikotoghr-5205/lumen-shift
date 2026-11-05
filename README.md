# Lumen Shift

An original, quiet browser puzzle for **GitHub Game Off 2026: SHIFT**. Circularly shift each shutter's bit pattern, watch each signal rotate and XOR through the instrument, and match the marked checkpoints and final receiver.

Eight authored boards introduce wrapping, rotating signals, intermediate readings, and fixed shutters. There is no time pressure. Keyboard/touch controls, undo/redo, exact-search hints, optional local synthesized tones, saved progress, and replay-validated import/export are implemented. A hint searches the current orientation space; it is not a scripted answer or a model call.

## Run

Node.js 22+; no dependencies or installation:

```sh
npm test
npm run check
npm run build
npm run dev
```

Open `http://127.0.0.1:4191`. The server prefers `dist/` when it exists, so rebuild after editing. The game has no remote runtime requests, fonts, assets, model calls, or account. Local progress is a convenience, not an authenticated competition score; export a backup before changing browsers. Invalid imports are rejected. If storage fails, the current session continues in memory.

Arrow keys select/shift shutters; equivalent labeled buttons work on touch. Two illuminated bits cancel (XOR). A row's blue arrow rotates the **incoming signal before** its amber shutter applies; shifting a shutter preserves its lit-dot count and wraps the edge. Match all green target readings. Hints disclose assistance. Reset starts a new attempt; export first to retain an older replay.

## Build for itch.io

`dist/` is the complete static game. After building, run `python3 scripts/package.py` for `submission/lumen-shift.zip`, with `index.html` at the archive root. itch.io hosts browser modules over HTTP/HTTPS; double-clicking `file://index.html` is not supported. Hosting privately elsewhere is not the jam submission. The user must join and submit the game through the official itch.io page.

[Competition notes](docs/competition.md) include the official deadline, theme, and AI disclosure. [Landscape](docs/landscape.md) compares established sliding and offline puzzle projects honestly. No upstream game code, art, music, or level data was copied. All application source, CSS art, and synthesized tones were authored here with substantial AI coding assistance; this must be disclosed in the jam submission. There is no in-game AI.

Twelve local tests cover all board solutions, an independent boolean signal reference, reversible shifts, locked rows, replay validation, and bounded hints. They establish local behavior, not cross-device audio latency or a formal jam entry. The game was first developed on 2026-11-05, within the jam window.

MIT; see [LICENSE](LICENSE).
