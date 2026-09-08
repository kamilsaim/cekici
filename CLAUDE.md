# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                          # run all unit tests (frontend logic.js + all server/ modules)
node --test test/logic.test.js    # run only the frontend logic tests
node --test test/server/jobs.test.js   # run a single server test file
npm start                         # run the Express server locally on :3000 (serves frontend + API)
npm run build:desktop             # build dist/cekici.zip, the Windows package sent to end users
```

No build step for the app itself — plain ES modules served/consumed directly. No linter configured.
`build:desktop` is packaging only (downloads Node/ffmpeg/yt-dlp, zips them with the app); it does not compile anything.

### Local prerequisites

The server shells out to `yt-dlp` and `ffmpeg`; both must be on `PATH` for `npm start` (or any download-related test) to work:

```bash
pip install yt-dlp
# ffmpeg: download from https://www.gyan.dev/ffmpeg/builds/ if winget/GitHub is network-blocked
```

`server/index.js` checks for both at startup and exits with an install hint if missing.

## Architecture

This is a video downloader (YouTube/Instagram/X) with two independent halves that share one pure-logic file:

- **`js/logic.js`** — pure, DOM-free functions (platform detection, queue state, history grouping/filtering, theme, size formatting). Consumed by both the browser (`js/app.js`) and the Node server (`server/index.js` imports `detectPlatform` from it directly across the `js/`↔`server/` boundary). Keep it framework-free so both sides can keep sharing it.
- **`js/app.js`** — all DOM rendering/event wiring for the single-page `index.html` (4 tab sections: İndir/Geçmiş/Nasıl Kullanılır/Ayarlar). Talks to the backend only via `fetch('/api/...')`.
- **`server/`** — Express app. `index.js` wires everything together and owns the download job queue (in-memory, sequential — one `yt-dlp` process at a time via `processQueue()`). The other files are pure/IO-isolated on purpose:
  - `jobs.js` — in-memory job state machine (`createJobStore()`), fully unit-testable, no I/O.
  - `history.js` — CRUD over `data/history.json`, file path passed as an argument (never hardcoded) so tests use temp files.
  - `ytdlp-args.js` — pure function building the yt-dlp CLI argument array from `{mode, quality, bitrate}`.
  - `progress.js` — pure regex parser turning a yt-dlp `--newline` progress line into a percentage.
  - `ytdlp-runner.js` — the only file that actually spawns `yt-dlp` (`resolveInfo`, `runDownload`, `selfUpdateYtdlp`). Takes `{cookiesFile, ytdlpPath, ffmpegPath}` so the packaged build can point at bundled binaries. Not unit tested; verify manually against a real URL when touching it.
  - `paths.js` — pure. `resolveBinary()` prefers a bundled `bin/` copy and falls back to the bare PATH name, which is what keeps `npm start` working during development.
  - `settings.js` — CRUD over `data/settings.json` (currently just `downloadDir`), file path passed in like `history.js`. `resolveDownloadDir()` falls back to the default if the chosen folder has been moved or deleted.
  - `folder-picker.js` — opens the native Windows folder dialog via PowerShell. A browser page cannot hand the server a real filesystem path, so the picker has to run server-side. Windows-only, no unit test.

**Test strategy**: every pure module above has a matching `node:test` file. IO-heavy code (`ytdlp-runner.js`, the Express routes themselves) is deliberately left untested and instead verified with real `curl`/`yt-dlp` calls — don't try to unit-test process spawning here, follow the existing split.

### Data flow for a download

1. Frontend POSTs a link to `/api/resolve` → server runs `yt-dlp --dump-json` (via `ytdlp-runner.resolveInfo`) to get the real title/thumbnail.
2. Frontend POSTs `{url, mode, quality|bitrate}` to `/api/downloads` → `jobStore.createJob()` queues it, `processQueue()` (sequential, one job at a time) eventually runs it.
3. Frontend polls `GET /api/downloads/:jobId` every second for `{status, progress}` until `completed`/`failed`.
4. On completion the file lands in the user's chosen download folder (default: Windows Downloads) and a row is appended to `data/history.json` (via `history.js`); the frontend then re-fetches `/api/history`. History rows store the **full `filePath`**, not just a filename, so entries survive the user changing the download folder later.

`downloads/`, `data/` and `dist/` are gitignored.

### YouTube-specific fragility

YouTube aggressively blocks datacenter/cloud IPs. The current mitigations (all in `server/index.js` / `server/ytdlp-runner.js`) are:
- An optional cookies file (checked in order: `$COOKIES_FILE` env var → `/etc/secrets/cookies.txt` [Render Secret File] → `./cookies.txt`), copied to a writable path (`data/cookies-runtime.txt`) before use because `yt-dlp` rewrites the cookie jar after every run and Render Secret Files are read-only.
- A **bgutil PO token provider** (`server/pot-provider.js`) runs as a child process inside the same container on `127.0.0.1:4416`, started at boot by `server/index.js`. The `bgutil-ytdlp-pot-provider` pip plugin picks it up automatically — no extra yt-dlp arguments. This is the primary defence against "Sign in to confirm you're not a bot"; cookies are now only a fallback. The plugin (pip) and the server (cloned+built in the `Dockerfile`) must stay on the **same version**, pinned via the `BGUTIL_VERSION` build arg. It only affects the YouTube extractor — Instagram/X are untouched. If the provider fails to start the app still boots; check the startup log line for `PO token provider hazır`.
- `--remote-components ejs:github` is always passed so `yt-dlp` can fetch its JS "n-challenge" solver (requires `deno`, installed in the `Dockerfile`).
- Cookies **do go stale** ("cookies no longer valid... rotated") if the source account keeps browsing YouTube in its normal browser after export — re-export and re-upload to the Render Secret File when this happens. Instagram/X don't have this problem.

### Distribution shape

**The app now ships as a Windows ZIP that users run on their own PC, not as a hosted service.**
Render hosting was abandoned because its free tier caused three problems at once: datacenter IPs
tripped YouTube's bot check, 512MB RAM couldn't fit a PO-token provider, and the disk wasn't
persistent. On a home PC all three disappear — no cookies, no PO token, downloads persist.
See `docs/superpowers/specs/2026-09-08-masaustu-dagitim-design.md` (gitignored, local only).

- `tools/build-desktop.mjs` (`npm run build:desktop`) produces `dist/cekici.zip`:
  `node.exe`, `bin/{ffmpeg,yt-dlp}.exe`, `app/` and a `baslat.bat` launcher. Everything is
  bundled so the recipient installs nothing. Downloads are cached in `dist/.cache`.
- `baslat.bat` sets `CEKICI_OPEN_BROWSER=1` (auto-opens the browser) and `CEKICI_BIN_DIR`.
  Neither is set during `npm start`, so development behaviour is unchanged.
- Bundled `yt-dlp` self-updates at startup (`selfUpdateYtdlp`) — YouTube changes often and a
  frozen copy would break within months. A **system** yt-dlp is never auto-updated.
- Same-origin design on purpose: `server/index.js` serves the static frontend (`express.static(ROOT)`)
  *and* the `/api/*` routes from one Express app — no separate frontend host, no CORS.
- `.app-frame` in `css/styles.css` is a fixed 375×720 "phone mockup" card on desktop, but a
  `@media (max-width: 480px)` override makes it fill the real viewport (`100dvh`, no radius/shadow)
  on actual phones — don't remove that override when touching layout CSS.
- `Dockerfile`, `render.yaml` and `server/pot-provider.js` are **leftovers from the Render era**.
  They self-disable off-Render (the provider's entry file simply doesn't exist), so they are
  harmless, but nothing depends on them any more.
