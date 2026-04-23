// @ts-nocheck
import { VNEngine } from './engine.js';
import { storyScript as localScript } from './gameData.js';
import { initSupabase, fetchScript, fetchMusic, saveGame, loadGame, getAllSaves, fetchGlobalData, saveGlobalData, getAssetUrl } from './supabase.js';
import { RhythmGame } from './rhythm.js';
import { I18N_DICT } from './i18n.js';
import { WordleGame, renderWordleRow, getRandomWord } from './wordle.js';

// Trạng thái Player
let currentPlayerId = null;
let useOnlineSave = false;

document.addEventListener('DOMContentLoaded', async () => {
  // --- Screens ---
  const studioScreen = document.getElementById('studio-screen');
  const splashScreen = document.getElementById('splash-screen');
  const titleScreen = document.getElementById('title-screen');

  // --- Âm thanh Logo Studio ---
  const playStudioSound = () => {
    const introSound = new Audio(getAssetUrl('studio_intro.mp3'));
    introSound.volume = 0.6;
    let hasPlayed = false;

    const cleanup = () => {
      document.removeEventListener('click', attemptPlay);
      document.removeEventListener('keydown', attemptPlay);
    };

    const attemptPlay = () => {
      if (hasPlayed) return;
      introSound.play()
        .then(() => {
          hasPlayed = true;
          cleanup();
        })
        .catch(e => console.log("Chờ tương tác để phát nhạc logo..."));
    };

    document.addEventListener('click', attemptPlay);
    document.addEventListener('keydown', attemptPlay);
    attemptPlay();

    // Dọn dẹp listeners sau 6 giây dù có phát được hay không
    setTimeout(cleanup, 6000);
  };

  playStudioSound();

  // Áp dụng Logo Studio
  const fegLogoImg = document.getElementById('feg-logo-img');
  if (fegLogoImg) {
    fegLogoImg.src = getAssetUrl('feg_logo.png');
  }

  // Áp dụng Poster từ Supabase
  const posterDiv = document.querySelector('.splash-poster');
  if (posterDiv) {
    posterDiv.style.backgroundImage = `url('${getAssetUrl('poster.png')}')`;
  }

  // Khôi phục i18n
  const initialLang = localStorage.getItem('tdtu_lang') || 'vi';

  const initialLangSelect = document.getElementById('game-language');
  if (initialLangSelect) {
    initialLangSelect.value = initialLang;
  }

  function applyI18n(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (I18N_DICT[lang] && I18N_DICT[lang][key]) {
        if (el.tagName === 'INPUT' && el.type === 'button') {
          el.value = I18N_DICT[lang][key];
        } else {
          el.innerHTML = I18N_DICT[lang][key];
        }
      }
    });

    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (I18N_DICT[lang] && I18N_DICT[lang][key]) {
        el.placeholder = I18N_DICT[lang][key];
      }
    });

    // Đặc tả Update Label Speed
    const elSpeed = document.getElementById('text-speed');
    if (elSpeed && parseInt(elSpeed.value) === 25) {
      document.getElementById('speed-val').innerText = I18N_DICT[lang]['speed-normal'] || 'Bình thường';
    }
  }

  applyI18n(initialLang);

  // --- Khởi tạo Supabase ---
  const supabaseReady = initSupabase();

  // --- Fetch kịch bản từ Supabase (với fallback local) ---
  let gameScript = localScript;

  if (supabaseReady) {
    try {
      const remoteScript = await fetchScript();
      if (remoteScript && remoteScript.length > 0) {
        gameScript = remoteScript;
        console.log('🌐 Đang dùng kịch bản từ Supabase');
      } else {
        console.log('📁 Supabase trống, dùng kịch bản local');
      }
    } catch (e) {
      console.warn('📁 Không kết nối được Supabase, dùng kịch bản local');
    }
  }

  // --- Sequence: Studio Intro -> Loading Splash -> Title ---
  setTimeout(() => {
    if (studioScreen) studioScreen.classList.remove('active');
    if (splashScreen) splashScreen.classList.add('active');

    setTimeout(() => {
      splashScreen.classList.remove('active');
      titleScreen.classList.add('active');

      if (gameScript && gameScript[0] && gameScript[0].bgm) {
        game.playBGM(gameScript[0].bgm);
      }
    }, 5000);
  }, 3500);

  // --- Khởi tạo UI Elements ---
  const ui = {
    titleScreen: titleScreen,
    gameScreen: document.getElementById('game-screen'),
    layerBg: document.getElementById('layer-bg'),
    charSprite: document.getElementById('char-l'),
    charL: document.getElementById('char-l'),
    charR: document.getElementById('char-r'),
    slotL: document.getElementById('slot-l'),
    slotR: document.getElementById('slot-r'),
    dialogueBox: document.getElementById('dialogue-box'),
    nameTag: document.getElementById('name-tag'),
    dialogueText: document.getElementById('dialogue-text'),
    textCaret: document.getElementById('text-caret'),
    choicesOverlay: document.getElementById('choices-overlay'),
    autoBtn: document.getElementById('qm-auto'),
    skipBtn: document.getElementById('qm-skip')
  };

  // --- Khởi tạo Engine ---
  const game = new VNEngine(gameScript, ui);

  // Hook i18n
  game.onLanguageChange = (lang) => {
    applyI18n(lang);
  };

  // --- Modals Elements ---
  const slOverlay = document.getElementById('saveload-overlay');
  const logOverlay = document.getElementById('log-overlay');
  const settingsOverlay = document.getElementById('settings-overlay');
  const playerIdOverlay = document.getElementById('player-id-overlay');
  const wordleOverlay = document.getElementById('wordle-overlay');

  // --- Wordle Mini Game ---
  const WORDLE_LENGTH = 5;
  const WORDLE_MAX_ATTEMPTS = 6;
  const WORDLE_FLIP_TOTAL_MS = 1100; // 4*120ms delay + 460ms duration + 60ms buffer
  let wordleGame = new WordleGame(getRandomWord(), { locale: 'en', wordLength: WORDLE_LENGTH, maxAttempts: WORDLE_MAX_ATTEMPTS });
  let currentWordleTarget = wordleGame.targetWord;
  const wordleBoard = document.getElementById('wordle-board');
  const wordleKeyboard = document.getElementById('wordle-keyboard');
  const wordleMessage = document.getElementById('wordle-message');
  const btnWordleRestart = document.getElementById('btn-wordle-restart');
  const WORDLE_KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ENTERZXCVBNM⌫'];
  let wordleDraft = '';
  let wordleAnimating = false;

  function initWordleBoard() {
    if (!wordleBoard) return;
    wordleBoard.innerHTML = '';
    for (let i = 0; i < WORDLE_LENGTH * WORDLE_MAX_ATTEMPTS; i += 1) {
      const cell = document.createElement('div');
      cell.className = 'wordle-cell';
      wordleBoard.appendChild(cell);
    }
  }

  function createWordleKeyButton(label) {
    const keyBtn = document.createElement('button');
    keyBtn.className = 'wordle-key';
    keyBtn.type = 'button';
    keyBtn.textContent = label;

    if (label === 'ENTER') {
      keyBtn.classList.add('wide');
      keyBtn.dataset.key = 'ENTER';
    } else if (label === '⌫') {
      keyBtn.classList.add('wide');
      keyBtn.dataset.key = 'BACKSPACE';
    } else {
      keyBtn.dataset.key = label;
    }

    keyBtn.addEventListener('click', () => {
      handleWordleKeyPress(keyBtn.dataset.key);
    });

    return keyBtn;
  }

  function initWordleKeyboard() {
    if (!wordleKeyboard) return;

    wordleKeyboard.innerHTML = '';
    WORDLE_KEY_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-keyboard-row';

      if (row === 'ENTERZXCVBNM⌫') {
        rowEl.appendChild(createWordleKeyButton('ENTER'));
        'ZXCVBNM'.split('').forEach(letter => rowEl.appendChild(createWordleKeyButton(letter)));
        rowEl.appendChild(createWordleKeyButton('⌫'));
      } else {
        row.split('').forEach(letter => rowEl.appendChild(createWordleKeyButton(letter)));
      }

      wordleKeyboard.appendChild(rowEl);
    });
  }

  function getWordleCell(row, col) {
    if (!wordleBoard) return null;
    return wordleBoard.children[row * WORDLE_LENGTH + col] || null;
  }

  function updateWordleDraftRow() {
    if (!wordleBoard) return;

    const activeRow = wordleGame.attempts.length;
    if (activeRow >= WORDLE_MAX_ATTEMPTS || wordleGame.isFinished) return;

    for (let i = 0; i < WORDLE_LENGTH; i += 1) {
      const cell = getWordleCell(activeRow, i);
      if (!cell) continue;

      const letter = wordleDraft[i] || '';
      cell.textContent = letter;
      cell.classList.remove('draft');
      if (letter) cell.classList.add('draft');
    }
  }

  function updateWordleKeyboardState(keyboardState = {}) {
    if (!wordleKeyboard) return;

    const keyButtons = wordleKeyboard.querySelectorAll('.wordle-key[data-key]');
    keyButtons.forEach(btn => {
      const key = btn.dataset.key;
      if (!key || key === 'ENTER' || key === 'BACKSPACE') return;

      const state = keyboardState[key.toLowerCase()];
      btn.classList.remove('correct', 'present', 'absent', 'locked');
      btn.disabled = false;

      if (!state) return;
      btn.classList.add(state);

      if (state === 'absent') {
        btn.classList.add('locked');
      }
    });
  }

  function resetWordleRound() {
    const newTarget = getRandomWord();
    wordleGame.reset();          // BUG FIX: phải reset trước khi đổi từ!
    wordleGame.setTargetWord(newTarget);
    currentWordleTarget = newTarget;
    wordleDraft = '';
    wordleAnimating = false;
    initWordleBoard();
    initWordleKeyboard();
    updateWordleKeyboardState();
    if (wordleMessage) wordleMessage.textContent = 'Nhập từ bằng bàn phím và bấm ENTER.';
  }

  function openWordleModal() {
    resetWordleRound();
    if (wordleOverlay) wordleOverlay.classList.remove('hidden');
  }

  function closeWordleModal() {
    if (wordleOverlay) wordleOverlay.classList.add('hidden');
  }

  function isWordleOverlayOpen() {
    return !!wordleOverlay && !wordleOverlay.classList.contains('hidden');
  }

  function isWordleLetterBlocked(letter) {
    return false;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function handleWordleKeyPress(key) {
    if (!isWordleOverlayOpen() || wordleAnimating || wordleGame.isFinished) return;

    if (key === 'ENTER') {
      handleWordleSubmit();
      return;
    }

    if (key === 'BACKSPACE') {
      if (wordleDraft.length > 0) {
        wordleDraft = wordleDraft.slice(0, -1);
        updateWordleDraftRow();
      }
      return;
    }

    if (!/^[A-Z]$/.test(key)) return;
    if (wordleDraft.length >= WORDLE_LENGTH) return;
    if (isWordleLetterBlocked(key)) return;

    wordleDraft += key;
    updateWordleDraftRow();

    // BUG FIX: Thêm pop animation khi gõ chữ
    const activeRow = wordleGame.attempts.length;
    const col = wordleDraft.length - 1;
    const cell = getWordleCell(activeRow, col);
    if (cell) {
      cell.classList.remove('pop');
      // Force reflow để restart animation
      void cell.offsetWidth;
      cell.classList.add('pop');
    }
  }

  async function handleWordleSubmit() {
    if (!wordleMessage || !wordleBoard) return;

    if (wordleDraft.length !== WORDLE_LENGTH) {
      wordleMessage.textContent = 'Vui lòng nhập đúng 5 ký tự.';
      // BUG FIX: Shake animation khi chưa nhập đủ chữ
      shakeCurrentRow();
      return;
    }

    const guess = wordleDraft.toLowerCase();
    wordleAnimating = true;
    wordleMessage.textContent = 'Đang kiểm tra từ vựng...';

    const result = await wordleGame.submitGuess(guess);

    if (!result.ok) {
      wordleAnimating = false;
      if (result.reason === 'NOT_IN_DICTIONARY') {
        wordleMessage.textContent = 'Từ này không tồn tại trong từ điển.';
        // BUG FIX: Shake khi từ không tồn tại
        shakeCurrentRow();
      } else if (result.reason === 'INVALID_LENGTH') {
        wordleMessage.textContent = 'Từ đoán phải có đúng 5 ký tự.';
        shakeCurrentRow();
      } else if (result.reason === 'GAME_FINISHED') {
        wordleMessage.textContent = 'Ván chơi đã kết thúc. Hãy mở lại để chơi mới.';
      } else {
        wordleMessage.textContent = 'Không thể gửi lượt đoán lúc này.';
      }
      return;
    }

    // BUG FIX: Xóa class draft khỏi các cell của hàng vừa submit
    for (let i = 0; i < WORDLE_LENGTH; i++) {
      const cell = getWordleCell(result.attemptIndex, i);
      if (cell) cell.classList.remove('draft');
    }

    renderWordleRow(wordleBoard, result.attemptIndex, result.tiles);
    await wait(WORDLE_FLIP_TOTAL_MS);
    wordleDraft = '';
    updateWordleKeyboardState(result.keyboardState);

    if (result.isWin) {
      wordleMessage.textContent = '✨ Chính xác! Bạn đã thắng!';
      // BUG FIX: Win bounce animation
      playWordleWinBounce(result.attemptIndex);
      wordleAnimating = false;
      return;
    }

    if (result.isFinished) {
      wordleMessage.textContent = `😢 Hết lượt! Đáp án là ${currentWordleTarget.toUpperCase()}.`;
      wordleAnimating = false;
      return;
    }

    wordleMessage.textContent = `Còn ${result.attemptsLeft} lượt.`;
    updateWordleDraftRow();
    wordleAnimating = false;
  }

  // BUG FIX: Shake cả hàng hiện tại khi từ sai
  function shakeCurrentRow() {
    const activeRow = wordleGame.attempts.length;
    const cells = [];
    for (let i = 0; i < WORDLE_LENGTH; i++) {
      const cell = getWordleCell(activeRow, i);
      if (cell) cells.push(cell);
    }
    cells.forEach(cell => {
      cell.classList.remove('wordle-row-shake');
      void cell.offsetWidth; // force reflow
      cell.classList.add('wordle-row-shake');
    });
    // Tự xóa sau khi animation xong
    setTimeout(() => {
      cells.forEach(cell => cell.classList.remove('wordle-row-shake'));
    }, 500);
  }

  // BUG FIX: Bounce animation cho từng tile khi thắng
  function playWordleWinBounce(rowIndex) {
    for (let i = 0; i < WORDLE_LENGTH; i++) {
      const cell = getWordleCell(rowIndex, i);
      if (!cell) continue;
      cell.style.setProperty('--flip-delay', `${i * 80}ms`);
      cell.classList.remove('win-bounce');
      void cell.offsetWidth;
      cell.classList.add('win-bounce');
    }
  }

  // Navigation Guard / Exit Protection
  const exitGuardModal = document.getElementById('exit-guard-modal');
  const btnGlobalQuit = document.getElementById('btn-global-quit');
  let currentExitCallback = null;

  function promptExitCheck(callback) {
    const guardText = document.getElementById('exit-guard-text');
    const btnSave = document.getElementById('btn-guard-save');
    const currLang = localStorage.getItem('tdtu_lang') || 'vi';

    currentExitCallback = callback;

    if (game.isDirty) {
      // Trường hợp: Có tiến trình mới chưa lưu
      if (guardText) guardText.textContent = (I18N_DICT[currLang] && I18N_DICT[currLang]['guard-text-dirty']) ? I18N_DICT[currLang]['guard-text-dirty'] : "Hành trình này rất quan trọng, bạn chắc chắn muốn dừng chân tại đây mà chưa lưu lại tiến trình chứ?";
      if (btnSave) btnSave.style.display = "block";
    } else {
      // Trường hợp: Đã lưu hoặc chưa có tiến trình mới
      if (guardText) guardText.textContent = (I18N_DICT[currLang] && I18N_DICT[currLang]['guard-text-clean']) ? I18N_DICT[currLang]['guard-text-clean'] : "Bạn có chắc chắn muốn thoát và quay lại màn hình chính không?";
      if (btnSave) btnSave.style.display = "none";
    }

    exitGuardModal.classList.remove('hidden');
  }

  document.getElementById('btn-guard-save').addEventListener('click', async () => {
    game.playClick();
    await triggerAutoSave();
    game.isDirty = false;
    exitGuardModal.classList.add('hidden');
    if (currentExitCallback) currentExitCallback();
  });

  document.getElementById('btn-guard-quit').addEventListener('click', () => {
    game.playClick();
    game.isDirty = false;
    exitGuardModal.classList.add('hidden');
    if (currentExitCallback) currentExitCallback();
  });

  document.getElementById('btn-guard-cancel').addEventListener('click', () => {
    game.playClick();
    exitGuardModal.classList.add('hidden');
    currentExitCallback = null;
  });

  if (btnGlobalQuit) {
    btnGlobalQuit.addEventListener('click', () => {
      settingsOverlay.classList.add('hidden');
      promptExitCheck(() => {
        // Hủy Rhythm Game nếu nó đang vô tình chạy
        if (window.rhythmGameRef && window.rhythmGameRef.isPlaying) {
          window.rhythmGameRef.stop(false, true); // true = silent/no alert
        }
        game.exitToTitle();
      });
    });
  }

  // Hook ẩn/hiện nút Quit Toàn Cục khi ở Visual Novel
  game.onExitScreen = () => {
    if (btnGlobalQuit) btnGlobalQuit.style.display = 'none';
  };
  const originalGameStart = game.start.bind(game);
  game.start = () => {
    if (btnGlobalQuit) btnGlobalQuit.style.display = 'block'; // Sẽ thành flex item nều layout hỗ trợ
    originalGameStart();
  };

  let saveLoadMode = 'save';

  // --- Player ID Logic ---
  function showPlayerIdModal() {
    playerIdOverlay.classList.remove('hidden');
  }

  document.getElementById('btn-confirm-player').addEventListener('click', () => {
    const inputVal = document.getElementById('player-id-input').value.trim();
    if (inputVal === '') {
      document.getElementById('player-id-input').style.borderColor = 'red';
      return;
    }
    currentPlayerId = inputVal;
    useOnlineSave = true;
    playerIdOverlay.classList.add('hidden');
    game.playClick();
    showMcNameModal();
  });

  document.getElementById('btn-skip-player').addEventListener('click', () => {
    currentPlayerId = null;
    useOnlineSave = false;
    playerIdOverlay.classList.add('hidden');
    game.playClick();
    showMcNameModal();
  });

  document.getElementById('btn-back-player').addEventListener('click', () => {
    game.playClick();
    playerIdOverlay.classList.add('hidden');
  });

  // --- Start & Load from Title ---
  document.getElementById('btn-start').addEventListener('click', () => {
    game.playClick();
    showPlayerIdModal();
  });

  const btnStartWordle = document.getElementById('btn-start-wordle');
  if (btnStartWordle) {
    btnStartWordle.addEventListener('click', () => {
      game.playClick();
      openWordleModal();
    });
  }

  document.getElementById('btn-load').addEventListener('click', () => {
    game.playClick();
    if (!currentPlayerId) {
      showPlayerIdModal();
      return;
    }
    openSaveLoadMenu('load');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    game.playClick();
    settingsOverlay.classList.remove('hidden');
  });

  const btnCloseWordle = document.getElementById('btn-close-wordle');
  if (btnCloseWordle) {
    btnCloseWordle.addEventListener('click', () => {
      game.playClick();
      closeWordleModal();
    });
  }

  if (btnWordleRestart) {
    btnWordleRestart.addEventListener('click', () => {
      game.playClick();
      resetWordleRound();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!isWordleOverlayOpen()) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleWordleKeyPress('ENTER');
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleWordleKeyPress('BACKSPACE');
      return;
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      handleWordleKeyPress(e.key.toUpperCase());
    }
  });

  // Gallery button (in-game icon — btn-gallery-global only; btn-gallery does not exist in HTML)
  const galleryGlobalBtn = document.getElementById('btn-gallery-global');
  if (galleryGlobalBtn) {
    galleryGlobalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      game.playClick();
      openGallery();
    });
  }

  // --- Khởi tạo Rhythm Game (Test Mode) ---
  const rhythmGame = new RhythmGame('rhythm-overlay', 'rhythm-canvas');
  const testRhythmBtn = document.createElement('button');
  testRhythmBtn.className = 'menu-btn';
  testRhythmBtn.style.background = 'linear-gradient(90deg, #9333ea, #ec4899)';
  testRhythmBtn.setAttribute('data-i18n', 'btn-test-rhythm');
  testRhythmBtn.textContent = (I18N_DICT[initialLang] && I18N_DICT[initialLang]['btn-test-rhythm']) ? I18N_DICT[initialLang]['btn-test-rhythm'] : '🎶 Test Nhịp Điệu (MỚI)';
  testRhythmBtn.onclick = () => {
    game.playClick();
    rhythmGame.setVolume(game.bgmVolume, game.sfxVolume);

    // Tạo Mock Beatmap: 0-3 là CPU, 4-7 là Player
    // Thể hiện luân phiên lượt hát để biểu diễn Camera Zoom
    // Fetch bản đồ 120 giây (beatmap_test.json)
    fetch('/beatmap_test.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(beatmapData => {
        // Gọi game, truyền tạm background âm thanh của logo studio
        // Bạn có thể chuẩn bị một file âm thanh ngắn (ví dụ: 'hit_sound.mp3') và truyền vào thay chỗ của 'null' bên dưới
        window.rhythmGameRef = rhythmGame;
        rhythmGame.start(beatmapData, 'studio_intro.mp3', null, async (result) => {
          if (result.silent) return; // Nếu bị ngắt bởi Quit thủ công thì không hiện Alert

          // Đánh dấu game có dữ liệu mới để bảo vệ Navigation
          game.isDirty = true;

          alert(result.victory ? `Win! Bạn đạt được: ${result.score} Điểm\nMax Combo: ${result.maxCombo}` : `Game Over! Nhóc Trùm đã đánh bại bạn.\nĐiểm: ${result.score}`);

          // Lưu Highscore vào storage (mô phỏng)
          const currentRhythmHighscore = parseInt(localStorage.getItem('tdtu_rhythm_highscore') || '0');
          if (result.score > currentRhythmHighscore) {
            localStorage.setItem('tdtu_rhythm_highscore', result.score);
            console.log("Kỷ lục mới được lưu!");
          }

          await triggerAutoSave();
        });
      })
      .catch(err => {
        console.error("Không tìm thấy file beatmap_test.json", err);
        alert("Lỗi tải Beatmap rùi!");
      });
  };
  const menuButtons = document.querySelector('.menu-buttons');
  if (menuButtons) {
    menuButtons.appendChild(testRhythmBtn);
  }

  // --- Quick Menu Màn Hình Game ---
  document.getElementById('qm-save').addEventListener('click', (e) => { e.stopPropagation(); game.playClick(); openSaveLoadMenu('save'); });
  document.getElementById('qm-load').addEventListener('click', (e) => { e.stopPropagation(); game.playClick(); openSaveLoadMenu('load'); });
  document.getElementById('qm-skip').addEventListener('click', (e) => { e.stopPropagation(); game.playClick(); game.toggleSkip(); });
  document.getElementById('qm-auto').addEventListener('click', (e) => { e.stopPropagation(); game.playClick(); game.toggleAuto(); });
  document.getElementById('qm-log').addEventListener('click', (e) => {
    e.stopPropagation();
    game.playClick();
    renderLogMenu();
  });
  document.getElementById('qm-settings').addEventListener('click', (e) => {
    e.stopPropagation();
    game.playClick();

    // Đồng bộ menu Dropdown trước khi hiện
    const langSelect = document.getElementById('game-language');
    if (langSelect) {
      langSelect.value = localStorage.getItem('tdtu_lang') || 'vi';
    }

    settingsOverlay.classList.remove('hidden');
  });

  const langSelectModal = document.getElementById('game-language');
  if (langSelectModal) {
    langSelectModal.addEventListener('change', (e) => {
      game.playClick();
      const newLang = e.target.value;
      game.setLanguage(newLang);

      if (langBtn) {
        langBtn.textContent = newLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN';
      }
    });
  }

  const langBtn = document.getElementById('qm-lang');
  if (langBtn) {
    // Khôi phục text ban đầu dựa trên state
    const currentLang = localStorage.getItem('tdtu_lang') || 'vi';
    langBtn.textContent = currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN';

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      game.playClick();
      const newLang = game.currentLang === 'vi' ? 'en' : 'vi';
      game.setLanguage(newLang);
      langBtn.textContent = newLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN';
    });
  }

  // --- Logic Modal Lưu/Tải ---
  function openSaveLoadMenu(mode) {
    saveLoadMode = mode;
    const currLang = localStorage.getItem('tdtu_lang') || 'vi';
    const titleKey = mode === 'save' ? 'sl-title-save' : 'sl-title-load';
    document.getElementById('sl-title').textContent = (I18N_DICT[currLang] && I18N_DICT[currLang][titleKey]) ? I18N_DICT[currLang][titleKey] : (mode === 'save' ? 'Save Game' : 'Load Game');
    renderSlots();
    slOverlay.classList.remove('hidden');
  }

  async function renderSlots() {
    const container = document.getElementById('slots-container');
    container.innerHTML = '<i style="grid-column:1/-1;text-align:center;">Đang tải...</i>';

    let onlineSaves = [];
    if (useOnlineSave && currentPlayerId) {
      onlineSaves = await getAllSaves(currentPlayerId);
    }

    container.innerHTML = '';

    for (let i = 0; i <= 5; i++) {
      const btn = document.createElement('div');
      btn.className = 'save-slot';
      if (i === 0) btn.style.border = '2px dashed var(--tdt-blue)';

      const onlineSave = onlineSaves.find(s => s.slot === i);
      const localSaveJSON = localStorage.getItem('tdtu_save_' + i);

      let saveData = null;
      let source = '';

      if (onlineSave) {
        saveData = {
          index: onlineSave.script_index,
          date: new Date(onlineSave.saved_at).toLocaleString(),
          mcName: onlineSave.mc_name
        };
        source = '🌐';
      } else if (localSaveJSON) {
        saveData = JSON.parse(localSaveJSON);
        source = '💾';
      }

      if (saveData) {
        const title = i === 0 ? "[AUTO-SAVE]" : `Slot ${i}`;
        const namePart = saveData.mcName ? ` | ${saveData.mcName}` : '';
        btn.innerHTML = `<span class="slot-filled">${source} ${title}${namePart}</span><span class="slot-date">${saveData.date}</span>`;
      } else {
        const title = i === 0 ? "[AUTO-SAVE - Trống]" : `Slot ${i} - Trống`;
        btn.innerHTML = `<span class="slot-empty">${title}</span>`;
      }

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        game.playClick();

        if (saveLoadMode === 'save') {
          if (i === 0) return alert("Slot 0 dành riêng cho Auto-save!");
          if (!ui.gameScreen.classList.contains('active')) return alert("Không lưu được khi đang ở ngoài Menu!");

          const data = {
            index: game.currentIndex,
            date: new Date().toLocaleString(),
            mcName: game.mcName
          };

          localStorage.setItem('tdtu_save_' + i, JSON.stringify(data));

          if (useOnlineSave && currentPlayerId) {
            await saveGame(currentPlayerId, i, game.currentIndex, game.mcName);
          }

          renderSlots();

        } else {
          if (saveData) {
            slOverlay.classList.add('hidden');
            game.mcName = saveData.mcName || "Người chơi";
            game.start();
            game.currentIndex = saveData.index;
            game.renderLine(game.script[game.currentIndex]);
          }
        }
      });
      container.appendChild(btn);
    }
  }

  // --- Logic Modal Log ---
  function renderLogMenu() {
    const arr = game.getLog();
    const area = document.getElementById('log-scroll-area');
    area.innerHTML = '';

    const currLang = localStorage.getItem('tdtu_lang') || 'vi';

    if (arr.length === 0) {
      const emptyText = (I18N_DICT[currLang] && I18N_DICT[currLang]['log-empty']) ? I18N_DICT[currLang]['log-empty'] : 'Chưa có cuộc trò chuyện nào...';
      area.innerHTML = `<i>${emptyText}</i>`;
    } else {
      arr.forEach(item => {
        const div = document.createElement('div');
        div.className = 'log-item';
        const speakerText = item.speaker ? item.speaker : ((I18N_DICT[currLang] && I18N_DICT[currLang]['narrator']) ? I18N_DICT[currLang]['narrator'] : 'Dẫn truyện');
        const contentText = currLang === 'vi' ? item.textVi : item.textEn;
        div.innerHTML = `<div class="log-speaker">${speakerText}</div>
                         <div class="log-text">${contentText}</div>`;
        area.appendChild(div);
      });
    }
    logOverlay.classList.remove('hidden');
    setTimeout(() => area.scrollTop = area.scrollHeight, 10);
  }

  // --- Settings Logic ---
  const elBgm = document.getElementById('bgm-volume');
  const elSfx = document.getElementById('sfx-volume');
  const elSpeed = document.getElementById('text-speed');

  elBgm.addEventListener('input', (e) => {
    document.getElementById('bgm-val').innerText = e.target.value;
    game.setVolume('bgm', e.target.value);
  });

  elSfx.addEventListener('input', (e) => {
    document.getElementById('sfx-val').innerText = e.target.value;
    game.setVolume('sfx', e.target.value);
  });

  elSpeed.addEventListener('input', (e) => {
    let rawVal = parseInt(e.target.value);
    if (rawVal === 25) {
      const currLang = localStorage.getItem('tdtu_lang') || 'vi';
      const normalText = (I18N_DICT[currLang] && I18N_DICT[currLang]['speed-normal']) ? I18N_DICT[currLang]['speed-normal'] : 'Bình thường';
      document.getElementById('speed-val').innerText = normalText;
    } else {
      document.getElementById('speed-val').innerText = rawVal + "ms";
    }
    game.textSpeed = rawVal;
  });

  // --- Đóng Modals ---
  document.getElementById('btn-close-saveload').addEventListener('click', () => { game.playClick(); slOverlay.classList.add('hidden') });
  document.getElementById('btn-close-log').addEventListener('click', () => { game.playClick(); logOverlay.classList.add('hidden') });
  document.getElementById('btn-close-settings').addEventListener('click', () => { game.playClick(); settingsOverlay.classList.add('hidden') });
  document.getElementById('btn-close-gallery').addEventListener('click', () => { game.playClick(); galleryOverlay.classList.add('hidden') });

  const fsView = document.getElementById('fullscreen-view');
  if (fsView) {
    document.getElementById('btn-close-fullscreen').addEventListener('click', () => { game.playClick(); fsView.classList.add('hidden') });
    fsView.addEventListener('click', () => fsView.classList.add('hidden')); // Đóng khi click ngoài
  }

  // --- Naming Logic ---
  const mcNameOverlay = document.getElementById('mc-name-overlay');
  const mcNameInput = document.getElementById('mc-name-input');

  function showMcNameModal() {
    mcNameOverlay.classList.remove('hidden');
  }

  document.getElementById('btn-confirm-name').addEventListener('click', () => {
    const name = mcNameInput.value.trim();
    game.mcName = name || "Người chơi";
    mcNameOverlay.classList.add('hidden');
    game.playClick();

    syncGlobalData().then(() => {
      game.start();
    });
  });

  document.getElementById('btn-back-name').addEventListener('click', () => {
    game.playClick();
    mcNameOverlay.classList.add('hidden');
    showPlayerIdModal();
  });

  // --- Auto-save Logic ---
  let lastAutoSaveTime = 0;
  let autoSaveToastTimer = null;
  game.onAutoSave = () => {
    const now = Date.now();
    if (now - lastAutoSaveTime > 30000) {
      lastAutoSaveTime = now;
      triggerAutoSave();
    }
  };

  async function triggerAutoSave() {
    const toast = document.getElementById('autosave-toast');
    try {
      if (currentPlayerId && useOnlineSave) {
        await saveGame(currentPlayerId, 0, game.currentIndex, game.mcName);
        console.log("💾 Auto-saved to cloud slot 0");
      }
    } catch (err) {
      console.warn('⚠️ Cloud auto-save failed, vẫn lưu local.', err);
    } finally {
      // Lưu local luôn
      localStorage.setItem('tdtu_save_0', JSON.stringify({
        index: game.currentIndex,
        date: new Date().toLocaleString(),
        mcName: game.mcName
      }));

      if (toast) {
        toast.classList.add('show');
        clearTimeout(autoSaveToastTimer);
        autoSaveToastTimer = setTimeout(() => {
          toast.classList.remove('show');
        }, 1500);
      }

      // Gỡ cờ isDirty
      game.isDirty = false;
    }
  }

  // --- Gallery Logic ---
  const galleryOverlay = document.getElementById('gallery-overlay');
  const galleryGrid = document.getElementById('gallery-grid');
  let globalData = { unlocked_cgs: [] };

  // Danh sách các bộ ảnh đặc biệt (Bạn có thể thêm bớt ở đây)
  const CG_GALLERY = [
    { id: 'opening_gate', title: 'Cổng Trường TDTU', url: 'tdtu_gate.png' },
    { id: 'hao_nhien_surprised', title: 'Hạo Nhiên Ngạc Nhiên', url: 'hao_nhien_surprised.png' },
    { id: 'demo_end', title: 'Hoàn Thành Demo', url: 'poster.png' }
  ];

  async function syncGlobalData() {
    if (currentPlayerId && useOnlineSave) {
      const data = await fetchGlobalData(currentPlayerId);
      if (data) {
        globalData.unlocked_cgs = data.unlocked_cgs || [];
      }
    }
  }

  game.onCgUnlock = (id, url) => {
    if (!globalData.unlocked_cgs.includes(id)) {
      globalData.unlocked_cgs.push(id);
      if (currentPlayerId && useOnlineSave) {
        saveGlobalData(currentPlayerId, globalData);
      }
    }
  };

  function openGallery() {
    renderGallery();
    galleryOverlay.classList.remove('hidden');
  }

  function renderGallery() {
    galleryGrid.innerHTML = '';
    CG_GALLERY.forEach(cg => {
      const isUnlocked = globalData.unlocked_cgs.includes(cg.id);
      const item = document.createElement('div');
      item.className = 'gallery-item' + (isUnlocked ? '' : ' locked');

      const imgUrl = getAssetUrl(cg.url);
      item.innerHTML = `
        <img src="${imgUrl}" alt="${cg.title}">
        <div class="gallery-label">${isUnlocked ? cg.title : '???'}</div>
      `;

      if (isUnlocked) {
        item.addEventListener('click', () => {
          game.playClick();
          const fsImg = document.getElementById('fullscreen-img');
          if (fsView && fsImg) {
            fsImg.src = imgUrl;
            fsView.classList.remove('hidden');
          }
        });
      }
      galleryGrid.appendChild(item);
    });
  }

  // ===================================================
  // MUSIC PLAYER - Scene-Driven BGM Controller
  // ===================================================

  const musicToggleBtn = document.getElementById('music-toggle-btn');
  const musicPlayer = document.getElementById('music-player');
  const musicCloseBtn = document.getElementById('music-close-btn');
  const musicPlayBtn = document.getElementById('music-play');
  const musicProgressEl = document.getElementById('music-progress');
  const musicVolumeEl = document.getElementById('music-volume');
  const musicCurrentTimeEl = document.getElementById('music-current-time');
  const musicDurationEl = document.getElementById('music-duration');
  const musicTrackTitleEl = document.getElementById('music-track-title');
  const musicTrackArtistEl = document.getElementById('music-track-artist');
  const musicCover = document.getElementById('music-cover');
  const musicTracklistEl = document.getElementById('music-tracklist');
  const musicLockIcon = document.getElementById('music-lock-icon');

  // Bảng tra cứu metadata
  let bgmMetadata = {};
  let isSeekingMusic = false;
  let isManualBgmLocked = false;

  // Khởi tạo: Ẩn trình phát nhạc mặc định, chỉ hiện nút gạt
  musicPlayer.classList.add('hidden');
  musicToggleBtn.style.display = 'flex';

  // Toggle Panel
  musicToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    musicPlayer.classList.remove('hidden');
    musicToggleBtn.style.display = 'none';
  });

  musicCloseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    musicPlayer.classList.add('hidden');
    musicToggleBtn.style.display = 'flex';
  });

  musicPlayer.addEventListener('click', (e) => e.stopPropagation());

  function formatMusicTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function extractFilename(urlOrPath) {
    if (!urlOrPath) return '';
    return urlOrPath.split('/').pop().split('?')[0].toLowerCase();
  }

  function findBgmMeta(bgmUrl) {
    if (!bgmUrl) return null;
    const filename = extractFilename(bgmUrl);
    return bgmMetadata[filename] || null;
  }

  function updateNowPlaying(bgmUrl) {
    if (!bgmUrl) {
      musicTrackTitleEl.textContent = 'Không có nhạc';
      musicTrackArtistEl.textContent = 'Đang chờ scene tiếp theo...';
      musicCover.innerHTML = '<div class="music-cover-placeholder">♪</div>';
      musicPlayBtn.textContent = '▶';
      musicPlayer.classList.remove('is-playing');
      highlightActiveTrack(null);
      return;
    }

    const meta = findBgmMeta(bgmUrl);
    if (meta) {
      musicTrackTitleEl.textContent = meta.title;
      musicTrackArtistEl.textContent = meta.artist || 'Game OST';
      if (meta.cover_url) {
        let coverUrl = meta.cover_url;
        if (!coverUrl.startsWith('http')) coverUrl = getAssetUrl(coverUrl);
        musicCover.innerHTML = `<img src="${coverUrl}" alt="Cover">`;
      } else {
        musicCover.innerHTML = '<div class="music-cover-placeholder">♪</div>';
      }
    } else {
      const filename = extractFilename(bgmUrl);
      musicTrackTitleEl.textContent = filename || 'BGM';
      musicTrackArtistEl.textContent = 'Game OST';
      musicCover.innerHTML = '<div class="music-cover-placeholder">♪</div>';
    }

    musicPlayBtn.textContent = '⏸';
    musicPlayer.classList.add('is-playing');
    highlightActiveTrack(bgmUrl);
  }

  function highlightActiveTrack(bgmUrl) {
    const items = musicTracklistEl.querySelectorAll('.music-track-item');
    const activeFilename = bgmUrl ? extractFilename(bgmUrl) : null;
    items.forEach(item => {
      const itemFilename = item.dataset.filename;
      item.classList.toggle('is-active', itemFilename === activeFilename);
    });
  }

  function renderBgmLibrary(tracks) {
    musicTracklistEl.innerHTML = '';
    if (!tracks || tracks.length === 0) {
      musicTracklistEl.innerHTML = '<div class="music-tracklist-empty">Chưa có nhạc trong bảng <b>music</b> trên Supabase.</div>';
      return;
    }

    const currentFilename = game.currentBgmUrl ? extractFilename(game.currentBgmUrl) : null;

    tracks.forEach((track, idx) => {
      const filename = extractFilename(track.url);
      const isActive = filename === currentFilename;

      const item = document.createElement('div');
      item.className = 'music-track-item' + (isActive ? ' is-active' : '');
      item.dataset.filename = filename;
      item.innerHTML = `
        <span class="track-idx">${idx + 1}</span>
        <div class="track-info">
          <div class="track-name">${track.title}</div>
          <div class="track-artist">${track.artist || 'Unknown'}</div>
        </div>
        <div class="track-playing-anim"><span></span><span></span><span></span></div>
      `;

      item.addEventListener('click', (e) => {
        e.stopPropagation();

        if (isManualBgmLocked) {
          console.log("Không thể đổi nhạc: Cảnh này yêu cầu nhạc cố định.");
          return;
        }

        let trackUrl = track.url;
        if (trackUrl && !trackUrl.startsWith('http')) {
          trackUrl = getAssetUrl(trackUrl);
        }

        game.bgmAudio.src = trackUrl;
        game.bgmAudio.play().catch(err => console.warn("Lỗi phát nhạc thủ công:", err));
        updateNowPlaying(trackUrl);
      });

      musicTracklistEl.appendChild(item);
    });
  }

  // Play/Pause
  musicPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const audio = game.bgmAudio;

    if (!audio.src || audio.src === '') return;

    if (audio.paused) {
      audio.play().catch(() => { });
      musicPlayBtn.textContent = '⏸';
      musicPlayer.classList.add('is-playing');
    } else {
      audio.pause();
      musicPlayBtn.textContent = '▶';
      musicPlayer.classList.remove('is-playing');
    }
  });

  // Progress bar
  game.bgmAudio.addEventListener('timeupdate', () => {
    if (isSeekingMusic) return;
    const pct = (game.bgmAudio.currentTime / game.bgmAudio.duration) * 100;
    musicProgressEl.value = isNaN(pct) ? 0 : pct;
    musicCurrentTimeEl.textContent = formatMusicTime(game.bgmAudio.currentTime);
    musicDurationEl.textContent = formatMusicTime(game.bgmAudio.duration);
  });

  musicProgressEl.addEventListener('mousedown', () => { isSeekingMusic = true; });
  musicProgressEl.addEventListener('touchstart', () => { isSeekingMusic = true; });

  musicProgressEl.addEventListener('input', (e) => {
    e.stopPropagation();
    if (game.bgmAudio.duration) {
      game.bgmAudio.currentTime = (e.target.value / 100) * game.bgmAudio.duration;
    }
  });

  musicProgressEl.addEventListener('mouseup', () => { isSeekingMusic = false; });
  musicProgressEl.addEventListener('touchend', () => { isSeekingMusic = false; });

  // Volume
  musicVolumeEl.addEventListener('input', (e) => {
    e.stopPropagation();
    const vol = e.target.value / 100;
    game.bgmAudio.volume = vol;
    game.bgmVolume = vol;
  });

  // BGM Change callback
  game.onBgmChange = (bgmUrl) => {
    updateNowPlaying(bgmUrl);
  };

  // BGM Lock callback
  game.onBgmLockChange = (isLocked) => {
    isManualBgmLocked = isLocked;
    if (isLocked) {
      musicTracklistEl.classList.add('locked');
      musicLockIcon.style.display = 'inline-block';
    } else {
      musicTracklistEl.classList.remove('locked');
      musicLockIcon.style.display = 'none';
    }
  };

  // --- Playlist Loop Mode ---
  const musicLoopAllBtn = document.getElementById('music-loop-all');

  musicLoopAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    game.isPlaylistMode = !game.isPlaylistMode;
    musicLoopAllBtn.classList.toggle('active', game.isPlaylistMode);
    game.bgmAudio.loop = !game.isPlaylistMode;
  });

  game.onPlaylistNext = () => {
    if (allTracks.length === 0) return;

    const currentUrl = game.bgmAudio.src;
    const currentFilename = extractFilename(currentUrl);
    let nextIdx = allTracks.findIndex(t => extractFilename(t.url) === currentFilename) + 1;

    if (nextIdx >= allTracks.length) nextIdx = 0;

    const nextTrack = allTracks[nextIdx];
    let trackUrl = nextTrack.url;
    if (trackUrl && !trackUrl.startsWith('http')) {
      trackUrl = getAssetUrl(trackUrl);
    }

    game.bgmAudio.src = trackUrl;
    game.bgmAudio.play().catch(() => { });
    updateNowPlaying(trackUrl);
  };

  // --- Fetch BGM metadata từ Supabase ---
  let allTracks = [];
  if (supabaseReady) {
    try {
      const tracks = await fetchMusic();
      if (tracks && tracks.length > 0) {
        allTracks = tracks;
        tracks.forEach(t => {
          const filename = extractFilename(t.url);
          bgmMetadata[filename] = {
            title: t.title,
            artist: t.artist,
            cover_url: t.cover_url
          };
        });
        console.log(`🎵 BGM Metadata: Loaded ${tracks.length} entries`);
      }
    } catch (e) {
      console.warn('🎵 BGM Metadata: Failed to fetch', e);
    }
  }
  renderBgmLibrary(allTracks);

});
