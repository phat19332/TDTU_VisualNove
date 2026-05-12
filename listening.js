import { listeningData } from './listeningData.js';

/**
 * @typedef {{ id: string, title: string, artist: string, audioSrc: string, coverSrc?: string, lyrics: LyricLine[] }} SongData
 * @typedef {{ startTime: number, endTime: number, text: string, answers: string[] }} LyricLine
 */

export class ListeningGame {
    constructor() {
        /** @type {SongData|null} */
        this.currentSong  = null;
        this.audio        = new Audio();
        this.isPlaying    = false;
        this.totalBlanks  = 0;
        this.correctBlanks = 0;
        /** @type {number|null} */ this._rafId = null;
        this._retryUsed   = false;   // only 1 retry allowed per session
        this._hasStarted  = false;   // true after "Bắt Đầu" clicked

        // BGM hooks set by main.js
        this.onStart = null;
        this.onStop  = null;

        // DOM refs
        this.overlay     = document.getElementById('listening-overlay');
        this.viewport    = document.querySelector('.lyrics-viewport');
        this.progressBar = /** @type {HTMLInputElement|null} */ (document.getElementById('listening-progress'));
        this.timeDisplay = document.getElementById('listening-time');
        this.btnStop     = document.getElementById('btn-listening-play');   // repurposed as stop/retry
        this.btnClose    = document.getElementById('btn-close-listening');
        this.instructions = document.getElementById('listening-instructions');

        if (!this.overlay || !this.viewport || !this.progressBar ||
            !this.timeDisplay || !this.btnStop || !this.btnClose) {
            console.warn('[ListeningGame] Required DOM elements missing. Aborting init.');
            return;
        }

        this._initEvents();
    }

    _initEvents() {
        this.btnClose.onclick = () => this.close();
        this.audio.onended   = () => this._finishGame();

        // Progress bar is DISPLAY-ONLY — no seeking
        if (this.progressBar) {
            this.progressBar.style.pointerEvents = 'none';
            this.progressBar.style.cursor = 'default';
        }

        // "Bắt Đầu Nghe" button inside instruction panel
        const btnBegin = document.getElementById('btn-listening-begin');
        if (btnBegin) btnBegin.onclick = () => this._beginGame();
    }

    /** Entry point — shows instructions first, pre-loads audio */
    start(songId) {
        const song = listeningData.find(s => s.id === songId) ?? listeningData[0];
        if (!song) { console.error('[ListeningGame] No song data found.'); return; }

        this.currentSong   = song;
        this.audio.src     = song.audioSrc;
        this.audio.load();           // pre-buffer
        this.audio.currentTime = 0;

        // Reset state
        this._retryUsed   = false;
        this._hasStarted  = false;
        this.correctBlanks = 0;
        this.totalBlanks   = song.lyrics.reduce((sum, line) => {
            const matches = line.text.match(/\[.*?\]/g);
            const count   = matches ? matches.length : 0;
            if (count !== line.answers.length) {
                console.warn(`[ListeningGame] Blank/answer mismatch: "${line.text}"`);
            }
            return sum + count;
        }, 0);

        // Populate metadata
        const coverEl  = /** @type {HTMLImageElement|null} */ (document.getElementById('listening-song-cover'));
        const titleEl  = document.getElementById('listening-song-title');
        const artistEl = document.getElementById('listening-song-artist');
        if (coverEl)  coverEl.src              = song.coverSrc ?? '/assets/logo/feg_logo.png';
        if (titleEl)  titleEl.textContent      = song.title;
        if (artistEl) artistEl.textContent     = song.artist;

        // Pre-render lyrics (hidden behind instruction panel)
        this._renderLyrics();

        // Reset stop button
        this._syncStopBtn();

        // Show instruction panel; hide footer
        this._setInstructionsVisible(true);
        this.overlay.classList.remove('hidden');

        // Reset progress display
        if (this.progressBar) this.progressBar.value = '0';
        if (this.timeDisplay) this.timeDisplay.textContent = '0:00 / 0:00';
    }

    /** Hide instruction panel and auto-play */
    _beginGame() {
        this._hasStarted = true;
        this._setInstructionsVisible(false);
        if (typeof this.onStart === 'function') this.onStart();

        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this._syncStopBtn();
                this._startRaf();
            })
            .catch(err => {
                console.warn('[ListeningGame] autoplay blocked:', err.message);
            });
    }

    /** Show/hide instruction panel and toggle footer */
    _setInstructionsVisible(show) {
        if (this.instructions) {
            this.instructions.classList.toggle('hidden', !show);
        }
        const footer = this.overlay ? this.overlay.querySelector('.listening-footer') : null;
        if (footer) footer.classList.toggle('hidden', show);
    }

    /** Update the stop/retry button to reflect current state */
    _syncStopBtn() {
        if (!this.btnStop) return;
        if (!this._hasStarted) {
            this.btnStop.textContent = '⏹ Nghe lại từ đầu';
            this.btnStop.disabled    = true;
            this.btnStop.className   = 'listening-stop-btn';
            this.btnStop.onclick     = null;
            return;
        }
        if (this._retryUsed) {
            this.btnStop.textContent = '🚫 Đã hết lượt nghe lại';
            this.btnStop.disabled    = true;
            this.btnStop.className   = 'listening-stop-btn used';
            this.btnStop.onclick     = null;
        } else {
            this.btnStop.textContent = '⏹ Nghe lại từ đầu';
            this.btnStop.disabled    = false;
            this.btnStop.className   = 'listening-stop-btn';
            this.btnStop.onclick     = () => this._retryFromStart();
        }
    }

    /** Stop and replay from beginning — only once */
    _retryFromStart() {
        if (this._retryUsed) return;
        this._retryUsed = true;

        this._stopRaf();
        this.isPlaying = false;
        this.audio.pause();
        this.audio.currentTime = 0;
        this.correctBlanks = 0;

        this._renderLyrics();   // reset inputs
        this._syncStopBtn();    // update button to "no more retries"

        if (this.progressBar) this.progressBar.value = '0';

        // Auto replay
        this.audio.play()
            .then(() => {
                this.isPlaying = true;
                this._startRaf();
            })
            .catch(err => console.warn('[ListeningGame] retry play blocked:', err.message));
    }

    _renderLyrics() {
        this.viewport.innerHTML = '';
        this.currentSong.lyrics.forEach((line, lineIndex) => {
            const lineDiv = document.createElement('div');
            lineDiv.className   = 'lyric-line';
            lineDiv.dataset.start = String(line.startTime);
            lineDiv.dataset.end   = String(line.endTime);
            lineDiv.id = `lyric-${lineIndex}`;

            let answerIndex = 0;
            line.text.split(/(\[.*?\])/g).forEach(part => {
                const m = part.match(/^\[(.*?)\]$/);
                if (m) {
                    const correctWord = line.answers[answerIndex] ?? m[1];
                    const input = document.createElement('input');
                    input.type          = 'text';
                    input.className     = 'cloze-input';
                    input.dataset.answer = correctWord;
                    input.dataset.line  = String(lineIndex);
                    input.dataset.idx   = String(answerIndex);
                    input.autocomplete  = 'off';
                    input.spellcheck    = false;
                    input.addEventListener('keydown', e => {
                        e.stopPropagation();
                        if (e.key === 'Enter') this._checkAnswer(input);
                    });
                    input.addEventListener('change', () => this._checkAnswer(input));
                    lineDiv.appendChild(input);
                    answerIndex++;
                } else if (part) {
                    lineDiv.appendChild(document.createTextNode(part));
                }
            });
            this.viewport.appendChild(lineDiv);
        });
    }

    /** @param {HTMLInputElement} input */
    _checkAnswer(input) {
        if (input.disabled) return;
        const user    = input.value.trim().toLowerCase();
        const correct = (input.dataset.answer ?? '').toLowerCase();
        if (!user) return;

        if (user === correct) {
            input.classList.add('correct');
            input.classList.remove('wrong');
            input.disabled = true;
            this.correctBlanks++;
        } else {
            input.classList.add('wrong');
            setTimeout(() => input.classList.remove('wrong'), 1000);
        }
    }

    _updateStatus() {
        const ct  = this.audio.currentTime;
        const dur = this.audio.duration;
        if (isFinite(dur) && dur > 0 && this.progressBar && this.timeDisplay) {
            this.progressBar.value        = String((ct / dur) * 100);
            this.timeDisplay.textContent  = `${this._fmt(ct)} / ${this._fmt(dur)}`;
        }
        if (!this.currentSong) return;
        this.currentSong.lyrics.forEach((line, idx) => {
            const el = document.getElementById(`lyric-${idx}`);
            if (!el) return;
            const active = ct >= line.startTime && ct <= line.endTime;
            el.classList.toggle('active', active);
            el.classList.toggle('passed', !active && ct > line.endTime);
            if (active && !el.dataset.scrolled) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.dataset.scrolled = '1';
            }
            if (!active) delete el.dataset.scrolled;
        });
    }

    _startRaf() {
        if (this._rafId !== null) return;
        const tick = () => {
            this._updateStatus();
            if (this.isPlaying) this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
    }

    _stopRaf() {
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    /** Close overlay without scoring — restores BGM */
    close() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this._stopRaf();
        if (this.overlay) this.overlay.classList.add('hidden');
        if (typeof this.onStop === 'function') this.onStop();
        this.overlay?.querySelector('.listening-result-overlay')?.remove();
    }

    _finishGame() {
        this._stopRaf();
        this.isPlaying = false;
        if (typeof this.onStop === 'function') this.onStop();

        const pct = this.totalBlanks > 0
            ? Math.round((this.correctBlanks / this.totalBlanks) * 100)
            : 0;

        // Reveal unanswered blanks
        this.viewport.querySelectorAll('.cloze-input:not(.correct)').forEach(el => {
            const inp = /** @type {HTMLInputElement} */ (el);
            inp.value    = inp.dataset.answer ?? '';
            inp.disabled = true;
            inp.classList.add('revealed');
        });

        const resultDiv = document.createElement('div');
        resultDiv.className = 'listening-result-overlay';

        let grade = '⭐';
        if (pct >= 90) grade = '🏆 Xuất sắc!';
        else if (pct >= 70) grade = '🥈 Khá tốt!';
        else if (pct >= 50) grade = '🥉 Cố gắng hơn nhé!';
        else grade = '😅 Cần luyện tập thêm!';

        resultDiv.innerHTML = `
            <div class="result-score">${pct}%</div>
            <div style="font-size:2rem;margin-bottom:12px;">${grade}</div>
            <h3 style="font-size:1.4rem;margin-bottom:12px;">Bạn đã hoàn thành bài nghe!</h3>
            <p style="margin-bottom:6px;color:#94a3b8;">✅ Điền đúng: <strong style="color:#4ade80;">${this.correctBlanks}</strong> / ${this.totalBlanks} ô trống</p>
            <p style="font-size:0.9rem;color:#64748b;margin-bottom:28px;">Các ô bỏ trống đã được hiển thị đáp án đúng.</p>
            <button class="modal-close-btn" id="btn-listening-finish" style="font-size:1.1rem;padding:14px 40px;">✕ Thoát</button>
        `;

        this.overlay?.querySelector('.listening-container')?.appendChild(resultDiv);
        document.getElementById('btn-listening-finish')
            ?.addEventListener('click', () => { resultDiv.remove(); this.close(); });
    }

    /** @param {number} s @returns {string} */
    _fmt(s) {
        const m   = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    }
}
