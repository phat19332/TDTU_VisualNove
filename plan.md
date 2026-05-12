# Listening module audit and fix plan

## Scope
- Files reviewed: `listening.js`, `listeningData.js`, `listening.css`, `index.html`, `main.js`, `i18n.js`.
- Goal: find current bugs + improvement items for Listening mini-game, then propose a staged fix plan.

## Findings (ordered by severity)

### Critical
1. Broken audio path in data (song cannot play)
- Evidence: `listeningData.js:10` uses `/assets/audio/music/hello_vietnam.mp3`.
- Actual file found: `public/assets/audio/hello_vietnam.mp3` (no `music/` subfolder).
- Impact: Listening game opens but no audio playback.
- Fix direction: correct `audioSrc` path; optionally centralize asset URL resolution.

### High
2. Listening starts while BGM may still be playing (audio overlap)
- Evidence: `main.js:715` calls `listeningGame.start('hello-vietnam')` directly.
- No pause/mute handshake with VN/BGM player before Listening audio starts.
- Impact: user hears 2 tracks at once, degrades gameplay.
- Fix direction: add integration hooks (pause VN BGM on start, restore on stop).

3. Unsafe assumptions for required DOM elements
- Evidence: `listening.js` lines `24,25,30,47,56,79,131,141,162...` use DOM nodes without null checks.
- Editor diagnostics show multiple "Object is possibly 'null'" issues.
- Impact: potential runtime crash if markup changes or module initializes before expected DOM.
- Fix direction: guard required elements in constructor/init and fail gracefully.

4. Play state can desync when autoplay is blocked
- Evidence: `listening.js:129-135` sets `isPlaying` + button icon before `audio.play()` resolves.
- If `play()` rejects, UI still shows pause icon and `isPlaying=true`.
- Impact: incorrect controls state and confusing UX.
- Fix direction: await/catch `audio.play()`, update state/icon only on success, fallback message/log on reject.

### Medium
5. Score source-of-truth mismatch risk (`answers[]` vs bracket placeholders)
- Evidence: total blanks computed from `line.answers.length` (`listening.js:40-42`), but inputs are rendered from bracket parsing in `line.text` (`listening.js:67-72`).
- Impact: if content author forgets to sync `answers`, score percentage becomes wrong.
- Fix direction: use one source-of-truth (prefer placeholders or validate both and warn).

6. Cover metadata not rendered though data exists
- Evidence: `listeningData.js` has `coverSrc`; `index.html:436` has cover img node; `listening.js` only updates title/artist (`51-52`).
- Impact: incomplete UI and inconsistent data usage.
- Fix direction: set `#listening-song-cover.src` with fallback.

7. Potential NaN seek behavior when duration not ready
- Evidence: `listening.js:31` seeks based on `this.audio.duration` from range input.
- Impact: on early seek, currentTime assignment may become NaN/ignored.
- Fix direction: guard with finite duration check.

8. Inline HTML rendering from lyric text
- Evidence: `lineDiv.innerHTML = processedText` (`listening.js:75`).
- Impact: if lyrics ever come from external CMS/user input, this is XSS-prone.
- Fix direction: sanitize/escape text and build input nodes via DOM APIs.

### Low / Quality
9. Result and control text hardcoded (not i18n-ready)
- Evidence: result strings in `listening.js:154-158` are fixed Vietnamese.
- Impact: mixed-language UI when switching to English.
- Fix direction: move labels/messages to `i18n.js` keys.

10. Type-safety/editor quality debt in Listening module
- Evidence: diagnostics include implicit `any`, incorrect event target typing, dataset number/string mismatch (`listening.js` many lines).
- Impact: harder maintenance, hidden defects.
- Fix direction: add JSDoc typedefs, proper element casts, strict guards.

11. Missing keyboard submit polish
- Evidence: answer check is bound to `onchange` only (`listening.js:80`).
- Impact: answer often validates only on blur; slower interaction.
- Fix direction: validate on Enter and/or debounced input.

## Proposed implementation phases

### Phase 1 - Stabilize core functionality (must-do)
- Fix `audioSrc` path in `listeningData.js`.
- Add robust DOM guards in `ListeningGame` constructor/init.
- Harden play/pause with async `audio.play()` error handling.
- Add finite-duration guard for seek/progress updates.

### Phase 2 - Integrate with existing game audio
- Add start/stop hooks so Listening pauses VN BGM and restores previous state on close/finish.
- Ensure repeated open/close cycles keep consistent global audio state.

### Phase 3 - Data and scoring consistency
- Unify blank counting logic (single source-of-truth).
- Add optional validation warning when `answers[]` and placeholders mismatch.

### Phase 4 - UX and maintainability improvements
- Render cover image from `coverSrc` with fallback.
- i18n keys for Listening button/result text.
- Improve answer input UX (Enter to submit, immediate feedback).
- Reduce direct `innerHTML` risk by safer render strategy.

## Verification checklist after implementation
- Open Hub -> Listening: song plays successfully.
- No overlap with currently playing BGM.
- Play/Pause icon always matches real audio state.
- Close/Retry/Finish flows reset correctly.
- Progress seek works before/after metadata loaded (no NaN behaviors).
- Scoring remains correct for current data and mismatch test case.
- English language mode shows Listening texts consistently.
- No new editor errors in touched files.

## Out of scope (for now)
- Multi-song selection UI.
- Persistent per-song best score.
- Backend-driven listening content management.
