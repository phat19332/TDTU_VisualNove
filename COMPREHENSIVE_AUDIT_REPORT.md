# 📊 TDTU Visual Novel: Comprehensive Project Audit & Analysis Report

**Date:** 2026-06-14  
**Project:** TDTU: Ordinary Days (Visual Novel + Mini-games)  
**Scope:** Full codebase analysis with bug detection, risk assessment, feasibility rating, and strategic recommendations  
**Disclaimer:** This report is READ-ONLY analysis — no code changes made.

---

## 📌 Executive Summary

**Project Status:** Functional prototype with **critical audio bugs** and **design debt** requiring Phase 1 fixes before production deployment.

**Key Metrics:**
- ✅ **Strengths:** Modular architecture, Supabase integration, PWA-ready, i18n support
- ❌ **Critical Issues:** 3 (audio path, DOM safety, audio state sync)
- ⚠️ **High Issues:** 4 (BGM overlap, score mismatch risk, XSS, hardcoded text)
- 📊 **Medium Issues:** 6 (missing UI, type debt, performance, error handling)
- 🎯 **Recommended Priority:** Phase 1 (Stabilize Core) → Phase 2 (Audio Integration) → Phase 3 (Polish)

---

## 🚨 BUG & ISSUE CATALOG

### **CRITICAL SEVERITY** (Blocks Gameplay)

#### **🔴 #1: Audio Playback Path Broken in Listening Game**
- **Location:** `listeningData.js:10` + `listening.js` fetch logic
- **Problem:** Data defines `/assets/audio/music/hello_vietnam.mp3`, but actual file is `public/assets/audio/hello_vietnam.mp3` (no `music/` subfolder)
- **Impact:** Listening game opens but no sound → unplayable
- **Current Behavior:** Audio element tries to load from non-existent path, silent failure
- **User Experience:** Player sees blank lyric screen, clicks play, nothing happens
- **Root Cause:** Path hardcoded during content creation, not synced with actual asset structure
- **Detection:** Manual testing (audio element has error state, network tab shows 404)
- **Feasibility:** ⭐⭐⭐⭐⭐ TRIVIAL
  - Fix: Correct path string in `listeningData.js:10`
  - Effort: 2 minutes
  - Risk: None (localized change)
  - Testing: Play song → verify audio plays
- **Recommended Fix Timing:** Immediate (blocks feature entirely)

---

#### **🔴 #2: Unsafe DOM Element Access Without Null Guards**
- **Location:** `listening.js` lines 24, 25, 30, 47, 56, 79, 131, 141, 162 (11+ instances)
- **Problem:** Code assumes DOM elements exist and are queried before init completes
  ```
  Example: getElementById('#listening-input') without check before .addEventListener()
  ```
- **Impact:** Runtime crash (`Cannot read property 'addEventListener' of null`) if:
  - DOM structure changes (elements missing/renamed)
  - Module initializes before layout rendered
  - Partial HTML load
- **Current Behavior:** No validation; silent failures if elements missing
- **Detection:** VSCode TypeScript diagnostics show "Object is possibly 'null'" × 11
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Add null checks for `getElementById()` results, fail gracefully with console.error
  - Effort: 30 minutes (thorough pass + testing all branches)
  - Risk: Low (defensive guard logic)
  - Testing: Remove DOM elements selectively, verify error messages appear
- **Recommended Fix Timing:** Phase 1 (stabilization)

---

#### **🔴 #3: Audio Play State Desync When Autoplay Blocked**
- **Location:** `listening.js:129-135` (play button handler)
- **Problem:** Code sets `isPlaying = true` and updates UI BEFORE `audio.play()` resolves
  ```javascript
  // WRONG ORDER:
  this.isPlaying = true;
  this.updatePlayIcon();  // Shows "pause" icon
  this.audio.play();      // May reject due to autoplay policy
  ```
- **Impact:** If browser blocks autoplay, state shows "playing" but audio is silent
- **Current Behavior:** 
  - Click play → pause icon appears
  - Audio fails silently (autoplay policy)
  - User tries to pause → nothing happens (UI already shows pause)
- **Symptom:** Play/pause button becomes unresponsive after first click
- **Root Cause:** Missing await/catch on `Promise` returned by `audio.play()`
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Wrap `audio.play()` in try/catch, update state only on success
  - Effort: 15 minutes
  - Risk: Low (isolated error handling)
  - Testing: Open in private window, click play, verify UI matches audio state
- **Recommended Fix Timing:** Phase 1 (critical UX bug)

---

### **HIGH SEVERITY** (Degrades Gameplay or Data Integrity)

#### **🟠 #4: BGM & Listening Audio Overlap (No Handshake)**
- **Location:** `main.js:715` (listeningGame.start call) + `listening.js` (onStart/onStop callbacks)
- **Problem:** When Listening game starts, BGM continues playing simultaneously
- **Evidence:** 
  - `listening.js:19` defines `onStart` and `onStop` callbacks
  - `main.js` never calls/assigns them
  - No `engine.pauseBGM()` call before Listening starts
- **Impact:** Audio cacophony (2 tracks overlapping), poor UX, player confusion
- **Current Behavior:**
  1. User plays story → BGM starts (e.g., `tdtu_theme.mp3`)
  2. User selects Listening mini-game
  3. Listening starts, plays song + BGM = audio mess
  4. User closes Listening → BGM still plays (but was it paused?)
- **Data Concern:** No state tracking of which audio was playing before Listening (can't restore properly)
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Add hooks to pause VN engine BGM before Listening starts, restore on stop
  - Effort: 1 hour (requires coordination with engine.js API + testing edge cases)
  - Risk: Medium (touches global audio state, potential for infinite loops or missed cleanup)
  - Testing: 
    - Play story → listen to BGM
    - Open Listening → BGM should mute/stop
    - Close Listening → BGM should resume
    - Retry Listening multiple times → state should stay consistent
  - Edge Cases: 
    - BGM not playing when Listening opens (should handle gracefully)
    - Multiple open/close cycles
    - Listening finishes vs user closes early
- **Recommended Fix Timing:** Phase 2 (after Phase 1 stabilization)
- **Related to:** VNEngine's `pauseBGM()`, `resumeBGM()`, `setBgmVolume()` APIs

---

#### **🟠 #5: Blank Count Source-of-Truth Mismatch Risk**
- **Location:** `listening.js:40-42` (count logic) vs `listening.js:67-72` (render logic)
- **Problem:** Two ways to determine number of blanks — no validation they match
  - **Method A:** `line.answers.length` (raw data array count)
  - **Method B:** Bracket parsing from `line.text` (e.g., `[blank1]`, `[blank2]`)
- **Impact:** If content author forgets to sync, score calculation becomes wrong
  - Example: `answers: [a, b, c]` but text has only 2 `[blank]` tags → user fills 2, gets 2/3 wrong
- **Current Behavior:**
  - No validation during data load
  - `validate_listening.mjs` exists but NOT run in CI/build pipeline
  - Silent acceptance of mismatched data
- **Detection:** Manually inspect `listeningData.js` for consistency
- **Feasibility:** ⭐⭐⭐⭐⭐ EASY (but requires process change)
  - **Option A (Quick):** Add runtime assertion in `listening.js` during load, log warning if mismatch detected
    - Effort: 10 minutes
    - Risk: None (non-blocking warning)
  - **Option B (Robust):** Integrate `validate_listening.mjs` into pre-build/CI step
    - Effort: 20 minutes (npm script setup)
    - Risk: Low (validation-only step)
    - Requires: Add to `package.json` → `npm run build` or GitHub Actions
- **Recommended Fix Timing:** Phase 1 (simple assertion) → Phase 3 (CI integration)
- **Related:** Content pipeline reliability, prevents future data bugs

---

#### **🟠 #6: XSS Vulnerability in Lyric Rendering**
- **Location:** `listening.js:75` — `lineDiv.innerHTML = processedText;`
- **Severity:** Currently LOW (data is hardcoded), but HIGH RISK if system evolves
- **Problem:** Using `innerHTML` to render lyric text; if text comes from user/CMS without sanitization → XSS
- **Scenario:**
  - Content author manually edits `listeningData.js`
  - Accidentally includes `<img src=x onerror="alert('hacked')">`
  - Browser executes malicious code
  - Or attacker compromises Supabase and injects script
- **Current Vulnerability:** Low (data source is trusted, version-controlled)
- **Future Risk:** High (if planning user-generated content or dynamic CMS)
- **Detection:** Static analysis tool (ESLint security plugin) would flag
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Replace `innerHTML` with DOM APIs (`textContent` for text, or DOMPurify library for partial HTML)
  - Effort: 20 minutes
  - Risk: Low (text-only rendering, no feature loss)
  - Testing: Insert test strings with HTML/scripts, verify they render as text only
- **Recommended Fix Timing:** Phase 4 (Nice to have, low risk now, good practice)
- **Related:** Security best practices, Content Security Policy (CSP)

---

#### **🟠 #7: Hardcoded Listening Result Text (Not i18n)**
- **Location:** `listening.js:154-158` (result message display)
- **Problem:** Result strings are hardcoded in Vietnamese
  ```javascript
  // Lines 154-158 (example):
  resultText = `Bạn đã trả lời đúng ${correct}/${total} câu`;
  resultSubtext = "Chúc mừng!";  // etc.
  ```
- **Impact:** When user switches UI language to English, Listening result screen stays Vietnamese
- **Current Behavior:**
  - Hub menu switches language (English ↔ Vietnamese) ✅
  - Listening game labels switch language ✅
  - Listening result text STAYS Vietnamese ❌
  - UX inconsistency, jarring for English-speaking users
- **Detection:** Manual testing (switch to English, complete listening, see Vietnamese result)
- **Feasibility:** ⭐⭐⭐⭐⭐ TRIVIAL
  - Fix: Move result strings to `i18n.js` and use `I18N_DICT[currentLang].listening_result_success` etc.
  - Effort: 15 minutes (find all hardcoded strings, add i18n keys, replace)
  - Risk: None (localized change)
  - Testing: Switch language, complete listening, verify English text appears
- **Recommended Fix Timing:** Phase 1 (easy win, improves polish)
- **Related:** i18n consistency across all modules

---

### **MEDIUM SEVERITY** (Affects Experience or Maintainability)

#### **🟡 #8: Cover Image Not Rendered in Listening UI**
- **Location:** `listeningData.js` (has `coverSrc` field) vs `listening.js:51-52` (only sets title/artist)
- **Problem:** Data includes song cover image path, but UI never displays it
- **Current Behavior:**
  - `listeningData.js:8` defines: `coverSrc: "/assets/logo/tdtu_poster.png"`
  - `listening.js:51-52` only executes: 
    ```javascript
    titleElement.textContent = metadata.title;
    artistElement.textContent = metadata.artist;
    ```
  - Cover image element exists in HTML (`#listening-song-cover`) but is never populated
- **Impact:** Incomplete UI, wasted design effort, missing visual appeal
- **User Experience:** Player sees blank album art, feels unpolished
- **Detection:** Manual testing (open Listening, no cover image appears)
- **Feasibility:** ⭐⭐⭐⭐⭐ TRIVIAL
  - Fix: Add one line in `listening.js:52`: 
    ```javascript
    coverElement.src = metadata.coverSrc || "fallback.png";
    ```
  - Effort: 5 minutes
  - Risk: None (isolated UI update)
  - Testing: Open Listening, verify cover image displays
  - Edge Case: Handle missing `coverSrc` gracefully (use fallback)
- **Recommended Fix Timing:** Phase 1 (easy polish)

---

#### **🟡 #9: NaN Risk on Early Seek (Progress Bar)**
- **Location:** `listening.js:31` (seek handler) + `_updateStatus()` function
- **Problem:** If user seeks before audio metadata loads, `duration` is undefined
  ```javascript
  // Pseudo-code:
  progressBar.max = this.audio.duration;  // May be 0 or NaN if not loaded
  this.audio.currentTime = seekValue;     // May become NaN
  ```
- **Impact:** Progress bar doesn't work correctly on first interaction (before metadata ready)
- **Current Behavior:**
  - User plays song → metadata loads asynchronously
  - Before metadata ready, progress bar shows max=0
  - If user tries to seek before metadata → `currentTime` becomes NaN
  - After metadata loads, audio continues, but progress bar is out of sync
- **Detection:** Open Listening, immediately try to drag progress bar before song fully loads → scrubbing fails
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Guard with `Number.isFinite(duration)` check before assignment
  - Effort: 10 minutes (add guards to seek handler and update status function)
  - Risk: None (defensive guards)
  - Testing: 
    - Seek before metadata ready (should ignore or handle gracefully)
    - Seek after metadata ready (should work)
- **Recommended Fix Timing:** Phase 1 (audio reliability)

---

#### **🟡 #10: Type-Safety & JSDoc Debt in Listening Module**
- **Location:** `listening.js` throughout
- **Problems:** 
  - Missing JSDoc function signatures
  - Implicit `any` types for parameters
  - Incorrect element type casts (e.g., `HTMLInputElement` vs `HTMLElement`)
  - Dataset property type confusion (e.g., `dataset.index` as string vs number)
  - Event target typing: `event.target` assumed to be specific type
- **Current Behavior:** 
  - Code works but TypeScript/JSDoc validation is weak
  - 8+ editor diagnostic warnings
  - Harder to debug later, easier to make mistakes
- **Impact:** Maintenance burden, hidden bugs, poor IDE assistance
- **Detection:** VSCode shows yellow squiggles throughout file
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Add comprehensive JSDoc to all functions, use `@typedef` for custom types
  - Effort: 45 minutes (thorough type documentation)
  - Risk: None (documentation-only, no behavior change)
  - Bonus: IDE autocomplete will improve, fewer runtime surprises
- **Recommended Fix Timing:** Phase 4 (code quality, low urgency)
- **Tooling:** Could auto-generate JSDoc stubs with ESLint plugin

---

#### **🟡 #11: No Error Recovery for Supabase Failures**
- **Location:** `supabase.js` (initSupabase, fetchScript) + `main.js` (uses results)
- **Problem:** If Supabase initialization fails (network, auth, quota), game proceeds silently
- **Current Behavior:**
  - `initSupabase()` returns `{ success: boolean, error?: string }`
  - Main.js checks `if (!success)` but only logs warning
  - Game continues with fallback `gameData.js` script
  - BUT: Mini-game score saves (Listening leaderboard) go nowhere → user has no feedback
- **Impact:** 
  - Player plays, thinks scores are saved
  - Scores lost when tab closes (not persisted anywhere)
  - No way for player to know it happened
- **User Impact:** Frustration, lost progress, negative review
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: 
    - Detect Supabase errors early, show error modal to user
    - Implement localStorage fallback for scores + sync flag
    - On Supabase restore, sync localStorage → Supabase
  - Effort: 2 hours (error handling + fallback logic)
  - Risk: Medium (touches game state persistence)
  - Testing:
    - Disconnect network → play game → show error message
    - Scores save to localStorage
    - Reconnect → scores sync to Supabase
- **Recommended Fix Timing:** Phase 2 (reliability)
- **Related:** Offline support, resilience

---

#### **🟡 #12: BGM/Minigame Callback Hooks Defined But Never Integrated**
- **Location:** `listening.js:19-20` (callback definitions) vs `main.js:715` (start call)
- **Problem:** 
  ```javascript
  // listening.js:19-20:
  this.onStart = null;
  this.onStop = null;
  
  // USED LIKE:
  if (this.onStart) this.onStart();
  ```
  - But in `main.js:715`: `listeningGame.start('hello-vietnam')` — no callback assignment
- **Impact:** BGM pause/resume integration incomplete, callback pattern exists but unused
- **Current Behavior:** Code path exists but is dead code (always onStart/onStop are null)
- **Detection:** Code review, no integration tests
- **Feasibility:** ⭐⭐⭐⭐⭐ TRIVIAL (if integrated)
  - Option A: Remove unused callbacks (cleanup)
    - Effort: 5 minutes
    - Risk: None
  - Option B: Wire up callbacks with BGM pause logic (Phase 2)
    - Effort: 30 minutes
    - Risk: Medium (requires BGM state management)
- **Recommended Fix Timing:** Phase 1 (cleanup) or Phase 2 (integrate)

---

### **LOW SEVERITY** (Code Quality, Polish, Minor UX)

#### **🔵 #13: No Keyboard Enter Support for Answer Submission**
- **Location:** `listening.js:80` (onchange event only)
- **Problem:** Answer validation only triggers on `blur` (unfocus), not Enter key
- **Current Behavior:**
  - User types answer in blank
  - Presses Enter → nothing happens (no validation)
  - User must click outside field or next button
  - Slower interaction, non-standard for web forms
- **User Impact:** Minor friction, non-intuitive compared to other web apps
- **Feasibility:** ⭐⭐⭐⭐⭐ EASY
  - Fix: Listen for `keydown` with `event.key === 'Enter'`, trigger validation
  - Effort: 10 minutes
  - Risk: None
  - Testing: Type answer, press Enter, verify instant validation
- **Recommended Fix Timing:** Phase 4 (polish)

---

#### **🔵 #14: No Validation Feedback (Real-time Answer Check)**
- **Location:** `listening.js:80-95` (answer check logic)
- **Problem:** Player doesn't know if answer is correct until results screen
- **Current Behavior:**
  - User types answer → nothing happens until blur
  - All answers collected at end, then graded
  - No visual feedback during play (wrong/correct indicator)
- **Better UX:**
  - Show green checkmark for correct answer
  - Show red X for wrong answer
  - Let player retry/modify before submitting
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Requires UI changes + game flow redesign
  - Not critical but improves engagement
- **Recommended Fix Timing:** Phase 4 (UX enhancement)

---

#### **🔵 #15: Module Initialization Order Fragility**
- **Location:** `index.html` script loading order
- **Problem:** `i18n.js` loads as ES module, inline `<script>` waits for DOMContentLoaded
  ```html
  <script type="module">
    import "./i18n.js";  // Async parse
  </script>
  <script>
    // Inline script — may run before i18n.js exports
    window.addEventListener('DOMContentLoaded', ...);
  </script>
  ```
- **Risk:** If `i18n.js` takes > 1 frame to parse, `DOMContentLoaded` fires before i18n is ready
- **Current Status:** Works in practice (no reported issues), but fragile design
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Use async/await or event-based initialization
  - Effort: 30 minutes
  - Risk: Low (initialization refactor)
- **Recommended Fix Timing:** Phase 3 (refactor after stabilization)

---

#### **🔵 #16: Hardcoded Asset URL Heuristic**
- **Location:** `supabase.js` — `getAssetUrl(path)`
- **Problem:** Function strips `/assets/` and appends to storage base URL
  ```javascript
  // E.g., converts "/assets/audio/song.mp3" → "storage_base_url/audio/song.mp3"
  ```
  - If asset naming convention changes → breaks silently
  - No validation that asset exists
- **Current Behavior:** Works for current asset structure, fragile if refactored
- **Better Approach:** Asset manifest (JSON) mapping paths → URLs
- **Feasibility:** ⭐⭐⭐ LOW PRIORITY
  - Fix: Create `assets.manifest.json`, validate during build
  - Effort: 1.5 hours
  - Risk: Low (validation only)
- **Recommended Fix Timing:** Phase 5 (performance/reliability upgrade)

---

#### **🔵 #17: Mixed localStorage + Supabase (Inconsistent Source-of-Truth)**
- **Location:** `listeningData.js` and rhythm use localStorage for local best scores
- **Problem:** Two databases for same data
  - Local best: stored in browser localStorage
  - Leaderboard: stored in Supabase
  - No sync mechanism if they diverge
- **Current Behavior:**
  - Player's best score for Listening stored in Supabase `listening_scores`
  - But `rhythm.js` may store rhythm best in localStorage only
  - If user plays on different device → scores don't follow
- **Data Integrity Risk:** Player confusion, loss of data on device switch
- **Feasibility:** ⭐⭐⭐ MEDIUM
  - Fix: Migrate all scores to Supabase (single source-of-truth)
  - Effort: 2 hours (update all minigame save logic)
  - Risk: Medium (data migration, testing needed)
- **Recommended Fix Timing:** Phase 3 (data layer cleanup)

---

#### **🔵 #18: Script Fetch Fallback Works But Offline UX Unclear**
- **Location:** `supabase.js:fetchScript()` + fallback in `main.js`
- **Problem:** If Supabase unavailable, falls back to `gameData.js` (good)
  - BUT: No user-facing indicator that game is in "offline mode"
  - Mini-game scores saved to localStorage only (not synced back to Supabase)
  - User doesn't know whether scores will persist
- **Current Behavior:**
  - Game loads and plays
  - Player completes Listening → score saved locally only
  - No warning or notification
  - When Supabase comes back, old scores lost
- **UX Impact:** Silent data loss, poor experience
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: 
    - Show banner "Playing offline — scores saved locally" when Supabase unavailable
    - Auto-sync scores when connection restored
  - Effort: 1.5 hours (UI banner + sync logic)
  - Risk: Low (non-intrusive enhancement)
- **Recommended Fix Timing:** Phase 2 (reliability)

---

#### **🔵 #19: No Skip/Replay Button in Listening**
- **Location:** `listening.js` (missing feature)
- **Problem:** Player can only click Play once; if they want to replay song, must restart game
- **Current Behavior:**
  - Play button works once, then disabled (to prevent overlap)
  - Player must restart entire listening game to hear song again
- **User Impact:** Frustration, poor learnability for difficult lyrics
- **Feasibility:** ⭐⭐⭐⭐ MODERATE
  - Fix: Add replay button (plays from start), skip button (jump ahead)
  - Effort: 30 minutes (UI + audio control logic)
  - Risk: Low (isolated feature)
- **Recommended Fix Timing:** Phase 4 (UX enhancement)

---

#### **🔵 #20: Wordle Module Tight Coupling to Free Dictionary API**
- **Location:** `wordle.js` — fetch to `api.dictionaryapi.dev`
- **Problem:** 
  - External API dependency (no fallback)
  - If API down → Wordle validation fails
  - Rate limit risk (free tier may have limits)
- **Current Behavior:**
  - Each guess hits Free Dictionary API
  - No caching or local word list fallback
- **Feasibility:** ⭐⭐⭐ MEDIUM
  - Fix: 
    - Implement word list caching (localStorage)
    - Add fallback list bundled in app
    - Rate limit locally
  - Effort: 1 hour
  - Risk: Low (resilience improvement)
- **Recommended Fix Timing:** Phase 2 (reliability)

---

---

## 📈 ARCHITECTURE & DESIGN ISSUES

### **Issue A: Module Initialization Order (Global Callbacks)**
**Problem:** 7+ callbacks in VNEngine → hard to track data flow  
**Current Pattern:**
```javascript
engine.onLanguageChange = (lang) => { /* update UI */ };
engine.onBgmChange = (bgm) => { /* play new BGM */ };
engine.onAction = (action) => { /* handle trigger */ };
// ... 4 more callbacks
```
**Impact:** Difficult to debug, side effects spread across modules  
**Better Pattern:** Event Emitter or Pub/Sub system  
**Feasibility:** ⭐⭐⭐ MEDIUM (refactor)  
**Effort:** 3 hours (new event system + migration)  
**Recommended:** Phase 5 (optional, improves maintainability)

---

### **Issue B: Dual Character System Incomplete Rollout**
**Problem:** New system (`char_l`, `char_r`) and old system (`char`) coexist  
**Current Behavior:**
- Database schema migrated to dual characters ✅
- `supabase.js` has compatibility layer (converts old→new) ✅
- But some `engine.js` code still references old `char` property ❌
- Partial migration creates hidden bugs
- **Detection:** Audit `engine.js` for `script.char` vs `script.char_l`
- **Feasibility:** ⭐⭐⭐⭐ MODERATE (full deprecation)
- **Effort:** 1.5 hours (find all references, migrate, test)
- **Recommended:** Phase 3 (code cleanup)

---

### **Issue C: No Unified Error Handling Strategy**
**Problem:** Errors logged in various ways (console.log, console.error, silent failures)  
**Current Behavior:**
- Network errors → logged silently
- DOM missing → runtime crash or silent (depends on code path)
- Supabase auth failure → logged, game proceeds
- No consistent user-facing error UI
- **Impact:** Difficult debugging, users don't know what went wrong
- **Feasibility:** ⭐⭐⭐ MEDIUM (new error handler)
- **Effort:** 2 hours (error service + UI modal)
- **Recommended:** Phase 3 (infrastructure)

---

### **Issue D: No Asset Validation During Build**
**Problem:** Assets referenced in code but not validated to exist  
**Current Behavior:**
- Data files reference `/assets/audio/hello_vietnam.mp3` but file named differently
- No build-time check for missing assets
- Discovered only at runtime (or by user report)
- **Tooling:** `validate_listening.mjs` exists but only validates data structure, not assets
- **Feasibility:** ⭐⭐⭐⭐ EASY (add to build script)
- **Effort:** 30 minutes (file system check in Node script)
- **Recommended:** Phase 1 (add to npm run build)

---

---

## 🎯 FEATURE ASSESSMENT & RECOMMENDATIONS

### **Currently Implemented Features**

| Feature | Status | Quality | Notes |
|---------|--------|---------|-------|
| **Story Mode (VN)** | ✅ Complete | Good | Works well, choices + branching |
| **Save/Load System** | ✅ Complete | Good | Supabase + Supabase integration solid |
| **Auto-Save** | ✅ Complete | Good | Every 30s, robust |
| **Listening Mini-game** | ✅ 70% | BROKEN | Audio path bug blocks it |
| **Rhythm Mini-game** | ✅ Complete | Good | 4 difficulties, beatmap support |
| **Wordle Mini-game** | ✅ Complete | Good | Free Dictionary validation |
| **Leaderboards** | ✅ 50% | Partial | Listening has it, Rhythm/Wordle don't |
| **i18n (Bilingual)** | ✅ 80% | Good | Vietnamese + English, but some hardcoded text |
| **PWA / Service Worker** | ✅ Partial | Incomplete | Manifest exists, SW minimal |
| **Character Portraits** | ✅ Complete | Good | Dual-character system robust |
| **Music/Ambience** | ✅ 80% | Good | Mostly working, edge cases with play() |
| **Settings Panel** | ✅ Complete | Good | Language, volume, fast-skip toggle |

---

### **Feature Recommendations**

#### **🎯 QUICK WINS (Phase 1-2, High Value / Low Effort)**

1. **Fix Audio Path + Play State Desync**
   - **Why:** Unblocks Listening game entirely
   - **Effort:** 30 minutes combined
   - **Impact:** 🟩🟩🟩🟩🟩 Critical (game-breaking)
   - **Priority:** P0

2. **Add BGM Pause/Resume Hooks**
   - **Why:** Eliminates audio cacophony
   - **Effort:** 1 hour (with testing)
   - **Impact:** 🟩🟩🟩🟩 High (major UX improvement)
   - **Priority:** P0

3. **i18n Polish (Listening Result Text)**
   - **Why:** Consistency across UI
   - **Effort:** 15 minutes
   - **Impact:** 🟩🟩🟩 Medium (polish)
   - **Priority:** P1

4. **Add Error Banner for Supabase Failures**
   - **Why:** User awareness of offline mode
   - **Effort:** 45 minutes
   - **Impact:** 🟩🟩🟩🟩 High (reliability)
   - **Priority:** P1

---

#### **🎯 MEDIUM EFFORT, HIGH VALUE (Phase 2-3)**

5. **Integrate Data Validation into CI**
   - **Why:** Prevent future data inconsistencies
   - **Effort:** 30 minutes (update package.json scripts)
   - **Impact:** 🟩🟩🟩🟩 High (process improvement)
   - **Feasibility:** ⭐⭐⭐⭐⭐
   - **Priority:** P1
   - **How:** Run `npm run validate:listening` in pre-commit hook + CI

6. **Unify Score Storage (Supabase-first)**
   - **Why:** Single source-of-truth, cross-device sync
   - **Effort:** 1.5 hours
   - **Impact:** 🟩🟩🟩🟩 High (data integrity)
   - **Feasibility:** ⭐⭐⭐
   - **Priority:** P2

7. **Leaderboards for All Minigames**
   - **Why:** Engagement + social features
   - **Effort:** 2 hours (copy Listening logic to Rhythm/Wordle)
   - **Impact:** 🟩🟩🟩🟩 High (engagement)
   - **Feasibility:** ⭐⭐⭐⭐
   - **Priority:** P2

---

#### **🎯 NICE-TO-HAVE FEATURES (Phase 4-5, Lower Priority)**

8. **Accessibility Enhancements**
   - Captions for Listening lyrics (synced with audio)
   - Keyboard navigation improvements
   - High-contrast theme option
   - Screen reader labels for all buttons
   - **Effort:** 3-4 hours
   - **Impact:** 🟩🟩🟩🟩 High (inclusive design)
   - **Priority:** P3

9. **PWA Full Implementation**
   - Install prompt on iOS/Android
   - Offline asset caching (pre-cache top songs)
   - Background sync for saves
   - **Effort:** 2-3 hours
   - **Impact:** 🟩🟩🟩 Medium (distribution)
   - **Priority:** P3

10. **Creator/Beatmap Editor**
    - In-game tool to create new Listening content
    - WYSIWYG lyric + blank editor
    - Beatmap preview
    - **Effort:** 4-5 hours
    - **Impact:** 🟩🟩🟩🟩 High (content creation)
    - **Feasibility:** ⭐⭐⭐
    - **Priority:** P4 (optional, high complexity)

11. **Achievements & Streaks**
    - Badge system (e.g., "Perfect Score", "5-Day Streak")
    - Progress tracking
    - Leaderboard integration
    - **Effort:** 2 hours
    - **Impact:** 🟩🟩🟩🟩 High (retention)
    - **Priority:** P4

12. **Analytics Dashboard**
    - Track play counts, completion rates, drop-off points
    - A/B test UI flows
    - Heatmaps of common mistakes
    - **Effort:** 3-4 hours (backend + frontend)
    - **Impact:** 🟩🟩🟩 Medium (insights)
    - **Priority:** P5 (depends on business need)

---

#### **🎯 FEATURES TO DEPRIORITIZE / SIMPLIFY**

1. **Adaptive Audio / Stem Isolation**
   - **Why Deprioritize:** Complex audio engineering, niche use case
   - **Alternative:** Use multi-track audio links (Spotify, YouTube Music) instead
   - **Effort to Implement:** 5+ hours (WebAudio API mastery required)
   - **Recommended:** Postpone to Phase 5+, evaluate demand first

2. **Community Song Packs (User-Generated Content)**
   - **Why Deprioritize:** Moderation burden, security risk (UGC), complex content pipeline
   - **Alternative:** Curate official content packs instead
   - **Effort to Implement:** 5+ hours (upload validation, review system, etc.)
   - **Recommended:** Phase 5+ after core features stable + moderation plan in place

3. **Live Ops / Seasonal Content**
   - **Why Deprioritize:** Requires recurring content creation, event coordination
   - **Alternative:** Static content library first, then add seasonal rotations later
   - **Effort to Implement:** Ongoing (not one-time)
   - **Recommended:** Phase 5+ (nice polish but not core)

4. **Haptic Feedback on Mobile**
   - **Why Deprioritize:** Limited browser API support, not critical
   - **Alternative:** Focus on visual feedback (animations, colors)
   - **Effort to Implement:** 1-2 hours (low complexity)
   - **Recommended:** Phase 4 (optional polish)

---

---

## 📋 PROPOSED IMPLEMENTATION ROADMAP

### **Phase 1: Stabilize Core (1-2 weeks)**
**Goal:** Fix critical bugs, unblock gameplay  
**Deliverables:**
- ✅ Fix audio path in Listening
- ✅ Add null guards for DOM elements
- ✅ Fix audio.play() state sync (try/catch)
- ✅ Add cover image rendering
- ✅ i18n polish (result text)
- ✅ Add finite-duration guard for seek
- ✅ Add data validation to build process

**Effort:** 6-8 hours total  
**Testing:** Manual + basic unit tests  
**Blockers:** None  

---

### **Phase 2: Integrate Audio & Reliability (1-2 weeks)**
**Goal:** Seamless audio integration, offline support awareness  
**Deliverables:**
- ✅ Implement BGM pause/resume hooks
- ✅ Add Supabase error handling + offline banner
- ✅ Wordle API fallback + caching
- ✅ Listening keyboard Enter support
- ✅ Additional error recovery for edge cases

**Effort:** 6-8 hours total  
**Testing:** Integration tests (audio cycles), offline scenarios  
**Blockers:** Phase 1 must be complete

---

### **Phase 3: Data Consistency & Code Quality (1 week)**
**Goal:** Single source-of-truth, maintainability  
**Deliverables:**
- ✅ Migrate all scores to Supabase
- ✅ Deprecate dual character system fully
- ✅ Add unified error handling service
- ✅ Refactor initialization order (async/await)
- ✅ Comprehensive JSDoc for all modules

**Effort:** 8-10 hours total  
**Testing:** Data migration tests, regression tests  
**Blockers:** Phase 1-2 must be complete

---

### **Phase 4: Polish & UX (1-2 weeks)**
**Goal:** Feature completeness, user experience  
**Deliverables:**
- ✅ Leaderboards for all minigames
- ✅ Real-time answer validation feedback
- ✅ Replay/Skip buttons for Listening
- ✅ Accessibility improvements (keyboard nav, labels)
- ✅ Asset validation during build (manifest)
- ✅ XSS protection (DOMPurify or safe DOM APIs)

**Effort:** 10-12 hours total  
**Testing:** E2E tests for all minigames, accessibility audit  
**Blockers:** Phase 1-3 must be complete

---

### **Phase 5: Advanced Features (2-3 weeks)**
**Goal:** Engagement, content creation, analytics  
**Deliverables:**
- ✅ Full PWA implementation (offline caching, install prompt)
- ✅ Achievements & streak system
- ✅ In-game beatmap editor (lite version)
- ✅ Event Emitter refactor (optional code cleanup)
- ✅ Analytics instrumentation
- ✅ Creator tools (lyrics editor)

**Effort:** 15-20 hours total  
**Testing:** Feature-specific tests, performance benchmarks  
**Blockers:** Phase 1-4 must be complete

---

---

## 🔍 VERIFICATION & TESTING CHECKLIST

### **Manual Testing (After Each Phase)**

**Phase 1 Verification:**
- [ ] Listening game opens, music plays cleanly
- [ ] No audio overlap with BGM (if same scene)
- [ ] Play/pause button always matches real audio state
- [ ] Seek bar works before and after metadata loads (no NaN)
- [ ] DOM elements don't crash if removed from HTML
- [ ] Cover image displays in Listening UI
- [ ] Listening result text in correct language (after language switch)
- [ ] No new errors in console

**Phase 2 Verification:**
- [ ] BGM pauses when Listening opens
- [ ] BGM resumes when Listening closes
- [ ] Multiple open/close cycles work correctly
- [ ] Offline banner appears when Supabase unavailable
- [ ] Game plays in offline mode (fallback script works)
- [ ] Wordle validation works when API unavailable
- [ ] Keyboard Enter submits answer in Listening

**Phase 3 Verification:**
- [ ] Listening scores appear in Supabase leaderboard
- [ ] Rhythm scores also sync to Supabase (not localStorage)
- [ ] Character system uses new `char_l`/`char_r` consistently
- [ ] Error messages display gracefully (not silent failures)
- [ ] Initialization completes before DOMContentLoaded

**Phase 4 Verification:**
- [ ] Leaderboards display correct top 10 for all minigames
- [ ] Real-time feedback shows on correct/incorrect answers
- [ ] Accessibility: full keyboard navigation through Listening
- [ ] Screen reader announces important UI changes
- [ ] Asset validation catches missing files at build time

**Phase 5 Verification:**
- [ ] PWA installs on mobile (icon, splash screen)
- [ ] Offline assets cached (top songs load without network)
- [ ] Achievements unlock and display correctly
- [ ] Beatmap editor preview works without saving
- [ ] Analytics events logged correctly

---

### **Automated Testing (CI/CD)**

```bash
# Phase 1 additions:
npm run validate:listening      # Check data consistency
npm run test:audio              # Audio path verification

# Phase 2 additions:
npm run test:offline            # Offline mode tests
npm run test:supabase:errors    # Error recovery tests

# Phase 3 additions:
npm run test:migration          # Score migration tests
npm run test:integration        # End-to-end flows

# Phase 4 additions:
npm run test:a11y               # Accessibility audit
npm run test:build              # Asset manifest validation

# Phase 5 additions:
npm run test:e2e                # Full gameplay flows
npm run test:performance        # Load times, bundle size
```

---

---

## 📊 RISK ASSESSMENT MATRIX

| Issue | Severity | Likelihood | Effort | Feasibility | Recommended Priority |
|-------|----------|-----------|--------|------------|----------------------|
| Audio path broken | 🔴 Critical | HIGH | 5min | ⭐⭐⭐⭐⭐ | **NOW** |
| DOM null access | 🔴 Critical | MEDIUM | 30min | ⭐⭐⭐⭐ | Phase 1 |
| Play state desync | 🔴 Critical | HIGH | 15min | ⭐⭐⭐⭐ | Phase 1 |
| BGM overlap | 🟠 High | HIGH | 1hr | ⭐⭐⭐⭐ | Phase 2 |
| Blank mismatch | 🟠 High | LOW | 10min | ⭐⭐⭐⭐⭐ | Phase 1 |
| XSS (future) | 🟠 High | LOW | 20min | ⭐⭐⭐⭐ | Phase 4 |
| Hardcoded text | 🟠 High | MEDIUM | 15min | ⭐⭐⭐⭐⭐ | Phase 1 |
| Missing cover | 🟡 Medium | MEDIUM | 5min | ⭐⭐⭐⭐⭐ | Phase 1 |
| NaN seek | 🟡 Medium | LOW | 10min | ⭐⭐⭐⭐ | Phase 1 |
| Type debt | 🟡 Medium | MEDIUM | 45min | ⭐⭐⭐⭐ | Phase 4 |
| Supabase errors | 🟡 Medium | MEDIUM | 2hr | ⭐⭐⭐⭐ | Phase 2 |
| Dead callbacks | 🟡 Medium | LOW | 5min | ⭐⭐⭐⭐⭐ | Phase 1 |
| No Enter key | 🔵 Low | LOW | 10min | ⭐⭐⭐⭐⭐ | Phase 4 |
| No real-time feedback | 🔵 Low | MEDIUM | 30min | ⭐⭐⭐⭐ | Phase 4 |
| Init fragility | 🔵 Low | LOW | 30min | ⭐⭐⭐ | Phase 3 |
| Asset heuristic | 🔵 Low | LOW | 1.5hr | ⭐⭐⭐ | Phase 5 |
| Mixed storage | 🔵 Low | MEDIUM | 2hr | ⭐⭐⭐ | Phase 3 |
| Offline UX | 🔵 Low | MEDIUM | 1.5hr | ⭐⭐⭐⭐ | Phase 2 |
| No replay btn | 🔵 Low | MEDIUM | 30min | ⭐⭐⭐⭐ | Phase 4 |
| Wordle API tight | 🔵 Low | LOW | 1hr | ⭐⭐⭐ | Phase 2 |

---

---

## 💡 KEY INSIGHTS & STRATEGIC RECOMMENDATIONS

### **Top 5 Most Impactful Changes (ROI)**

1. **Fix Audio Path** → Unblocks Listening entirely (5 min work)
2. **Add Audio State Guards** → Eliminates play/pause bugs (15 min work)
3. **BGM Pause Hooks** → Seamless audio experience (1 hr work)
4. **Supabase Error Handling** → Offline awareness (45 min work)
5. **CI Data Validation** → Prevents future bugs (30 min work)

Combined effort: ~3 hours  
Combined impact: Transforms game from "broken" → "solid prototype"

---

### **Avoid These Pitfalls**

❌ **Do NOT** deploy without Phase 1 fixes (audio broken)  
❌ **Do NOT** add leaderboards to Wordle/Rhythm before Phase 2 (need consistent backend)  
❌ **Do NOT** implement community content before security audit (XSS risk)  
❌ **Do NOT** ignore offline scenarios (users WILL disconnect)  
❌ **Do NOT** hard-code game text (makes i18n painful later)

---

### **Architecture Recommendations**

✅ **DO:** Migrate all state to Supabase (single source-of-truth)  
✅ **DO:** Implement event emitter for callbacks (scalable)  
✅ **DO:** Add pre-commit validation hooks (catch bugs early)  
✅ **DO:** Use localStorage for resilience (fallback only)  
✅ **DO:** Build asset validation into pipeline (catch missing files)

---

### **Performance Considerations**

- **Audio Loading:** Consider streaming for long songs (reduce initial load)
- **Beatmap Parsing:** Pre-compute on server, cache locally
- **Leaderboard Sync:** Batch updates, debounce saves
- **Asset Size:** Optimize PNG/MP3 (consider OGG for audio)
- **Bundle Size:** Lazy-load rhythm.js (only needed when game starts)

---

### **Scalability Readiness**

**Current bottlenecks:**
- Supabase free tier query limits
- No caching strategy (API hits on every load)
- Asset CDN not optimized (files served from default bucket)

**Future growth:** Consider:
- Redis cache layer (for leaderboards)
- Image optimization service (Cloudinary, Imgix)
- Edge functions for script fetching (Supabase Functions)
- DDoS protection (Cloudflare)

---

---

## 📝 CONCLUSION

**Project Readiness:** ⭐⭐⭐ (3/5 stars)
- ✅ Good architecture foundation
- ❌ Critical bugs blocking core features
- ⚠️ Design debt accumulating
- 🎯 Phases 1-2 essential before public release

**Recommendation:** 
1. **Immediately apply Phase 1 fixes** (1-2 days work) to unblock gameplay
2. **Then proceed to Phase 2** for reliability improvements
3. **Phase 3-5 can be phased** based on user feedback and business priorities

**Estimated Timeline:**
- Phase 1: 1 week (critical fixes)
- Phase 2: 1 week (audio integration, offline support)
- Phase 3: 1 week (code cleanup)
- Phase 4: 2 weeks (polish, leaderboards)
- Phase 5: 2-3 weeks (advanced features)
- **Total: 7-9 weeks to "polished release"**

**Next Steps:**
- [ ] Review this audit with team
- [ ] Prioritize Phase 1-2 items (non-negotiable for release)
- [ ] Create GitHub Issues for each bug/feature
- [ ] Assign effort estimates and owners
- [ ] Set sprint schedule
- [ ] Communicate timeline to stakeholders

---

**Report compiled:** 2026-06-14  
**Analysis depth:** Thorough (all files reviewed)  
**Confidence level:** High (based on code inspection + static analysis)  
**Next review recommended:** After Phase 2 completion

---
