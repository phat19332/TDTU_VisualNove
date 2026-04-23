// @ts-nocheck

const WORDLE_WORD_LIST = [
    'dream', 'house', 'plant', 'music', 'heart', 'beach', 'cloud', 'chair', 'light', 'fruit',
    'water', 'flame', 'phone', 'world', 'smile', 'brain', 'stone', 'ocean', 'speed', 'write',
    'peace', 'field', 'night', 'steam', 'scope', 'taste', 'space', 'spine', 'state', 'saint'
];

export function getRandomWord() {
    const idx = Math.floor(Math.random() * WORDLE_WORD_LIST.length);
    return WORDLE_WORD_LIST[idx];
}

export class WordleGame {
    /**
     * @param {string} targetWord - 5-letter answer set manually by caller.
     * @param {{
     *   maxAttempts?: number,
     *   wordLength?: number,
     *   locale?: string,
     *   dictionaryValidator?: (word: string) => Promise<boolean>
     * }} options
     */
    constructor(targetWord, options = {}) {
        this.maxAttempts = options.maxAttempts ?? 6;
        this.wordLength = options.wordLength ?? 5;
        this.locale = options.locale ?? "en";
        this.dictionaryValidator = options.dictionaryValidator ?? this.validateWordWithFreeDictionary;

        this.setTargetWord(targetWord);
        this.reset();
    }

    /**
     * Allow changing target at runtime (manual assignment as requested).
     * @param {string} targetWord
     */
    setTargetWord(targetWord) {
        const normalized = this.#normalizeWord(targetWord);
        if (!this.#isWordLengthValid(normalized)) {
            throw new Error(`Target word must be exactly ${this.wordLength} letters.`);
        }
        this.targetWord = normalized;
    }

    reset() {
        this.attempts = [];
        this.isFinished = false;
        this.isWin = false;
    }

    /**
     * Main submit API.
     * @param {string} guessWord
     * @returns {Promise<{
     *   ok: boolean,
     *   reason?: string,
     *   attemptIndex?: number,
     *   tiles?: Array<{ letter: string, state: "correct" | "present" | "absent" }>,
     *   keyboardState?: Record<string, "correct" | "present" | "absent">,
     *   isWin?: boolean,
     *   isFinished?: boolean,
     *   attemptsLeft?: number
     * }>}
     */
    async submitGuess(guessWord) {
        if (this.isFinished) {
            return { ok: false, reason: "GAME_FINISHED" };
        }

        const guess = this.#normalizeWord(guessWord);
        if (!this.#isWordLengthValid(guess)) {
            return { ok: false, reason: "INVALID_LENGTH" };
        }

        const exists = await this.dictionaryValidator.call(this, guess);
        if (!exists) {
            return { ok: false, reason: "NOT_IN_DICTIONARY" };
        }

        const tiles = this.evaluateGuess(guess);
        this.attempts.push({ guess, tiles });

        const isWin = guess === this.targetWord;
        const isOutOfAttempts = this.attempts.length >= this.maxAttempts;

        this.isWin = isWin;
        this.isFinished = isWin || isOutOfAttempts;

        return {
            ok: true,
            attemptIndex: this.attempts.length - 1,
            tiles,
            keyboardState: this.getKeyboardState(),
            isWin: this.isWin,
            isFinished: this.isFinished,
            attemptsLeft: this.maxAttempts - this.attempts.length
        };
    }

    /**
     * Wordle scoring with duplicate-letter handling.
     * @param {string} guess
     */
    evaluateGuess(guess) {
        const target = this.targetWord.split("");
        const letters = guess.split("");
        const states = Array(this.wordLength).fill("absent");

        // Pass 1: correct letter + correct position (green)
        for (let i = 0; i < this.wordLength; i += 1) {
            if (letters[i] === target[i]) {
                states[i] = "correct";
                target[i] = "#";
                letters[i] = "#";
            }
        }

        // Pass 2: correct letter + wrong position (yellow)
        for (let i = 0; i < this.wordLength; i += 1) {
            if (letters[i] === "#") continue;
            const foundIndex = target.indexOf(letters[i]);
            if (foundIndex !== -1) {
                states[i] = "present";
                target[foundIndex] = "#";
            }
        }

        return guess.split("").map((letter, i) => ({ letter, state: states[i] }));
    }

    /**
     * Aggregate best state for each keyboard key.
     */
    getKeyboardState() {
        /** @type {Record<string, "correct" | "present" | "absent">} */
        const result = {};
        const priority = { absent: 0, present: 1, correct: 2 };

        for (const attempt of this.attempts) {
            for (const tile of attempt.tiles) {
                const current = result[tile.letter];
                if (!current || priority[tile.state] > priority[current]) {
                    result[tile.letter] = tile.state;
                }
            }
        }

        return result;
    }

    /**
     * Validate against Free Dictionary API.
     * API docs: https://api.dictionaryapi.dev/api/v2/entries/en/<word>
     * @param {string} word
     */
    async validateWordWithFreeDictionary(word) {
        const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/${this.locale}/${word}`;

        try {
            const response = await fetch(endpoint, {
                method: "GET",
                headers: { Accept: "application/json" }
            });

            if (!response.ok) {
                // API trả 404 cho từ không tồn tại
                if (response.status === 404) return false;
                // Lỗi server khác: fallback về danh sách local
                return WORDLE_WORD_LIST.includes(word);
            }

            const data = await response.json();
            return Array.isArray(data) && data.length > 0;
        } catch {
            // Lỗi mạng: chấp nhận từ nếu nó nằm trong danh sách local
            return WORDLE_WORD_LIST.includes(word);
        }
    }

    #normalizeWord(word) {
        return String(word ?? "").trim().toLowerCase();
    }

    #isWordLengthValid(word) {
        return word.length === this.wordLength;
    }
}

/**
 * Optional helper to paint a 5x6 board in DOM.
 * It expects a container with 30 tile elements in row-major order.
 * @param {HTMLElement} boardEl
 * @param {number} rowIndex
 * @param {Array<{ letter: string, state: "correct" | "present" | "absent" }>} tiles
 */
export function renderWordleRow(boardEl, rowIndex, tiles) {
    const offset = rowIndex * 5;
    for (let i = 0; i < 5; i += 1) {
        const cell = boardEl.children[offset + i];
        if (!cell) continue;

        const flipDelay = i * 120; // ms, khớp với CSS --flip-delay
        const colorDelay = flipDelay + 207; // 45% của 460ms = 207ms - lúc tile ẩn hoàn toàn

        cell.textContent = tiles[i].letter.toUpperCase();

        // Xóa trạng thái cũ và bắt đầu flip
        cell.classList.remove('correct', 'present', 'absent', 'flip', 'pop', 'win-bounce');
        cell.style.setProperty('--flip-delay', `${flipDelay}ms`);

        // Bắt đầu animation flip sau 1 frame
        requestAnimationFrame(() => {
            cell.classList.add('flip');
        });

        // Thêm class màu đúng lúc tile đạt 90° (nỚ flip) - khi không thấy gì
        setTimeout(() => {
            cell.classList.add(tiles[i].state);
        }, colorDelay);
    }
}
