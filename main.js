import { VNEngine } from './engine.js';
import { storyScript as localScript } from './gameData.js';
import { initSupabase, fetchScript, saveGame, loadGame, getAllSaves, getAssetUrl } from './supabase.js';

// Trạng thái Player
let currentPlayerId = null;
let useOnlineSave = false;

document.addEventListener('DOMContentLoaded', async () => {
  // --- Screens ---
  const studioScreen = document.getElementById('studio-screen');
  const splashScreen = document.getElementById('splash-screen');
  const titleScreen = document.getElementById('title-screen');
  
  // Áp dụng Logo Studio
  const fegLogoImg = document.getElementById('feg-logo-img');
  if (fegLogoImg) {
      fegLogoImg.src = getAssetUrl('feg_logo.png'); // Sẽ tự động lấy từ Supabase Storage nếu bạn up file mang tên feg_logo.png lên đó
  }

  // Áp dụng Poster từ Supabase

  const posterDiv = document.querySelector('.splash-poster');
  if (posterDiv) {
      posterDiv.style.backgroundImage = `url('${getAssetUrl('poster.png')}')`;
  }

  // --- Khởi tạo Supabase ---
  const supabaseReady = initSupabase();

  // --- Fetch kịch bản từ Supabase (với fallback local) ---
  let gameScript = localScript; // Mặc định dùng local

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
    // 1. Kết thúc giới thiệu Studio (sau 3.5s)
    if (studioScreen) studioScreen.classList.remove('active');
    if (splashScreen) splashScreen.classList.add('active');
    
    // 2. Chuyển từ Loading sang Title (sau 5s nữa)
    setTimeout(() => {
      splashScreen.classList.remove('active');
      titleScreen.classList.add('active');
      
      // Phát nhạc nền ngay tại màn hình Title (lấy bài đầu tiên trong kịch bản)
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
    charSprite: document.getElementById('char-sprite'),
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

  // --- Modals Elements ---
  const slOverlay = document.getElementById('saveload-overlay');
  const logOverlay = document.getElementById('log-overlay');
  const settingsOverlay = document.getElementById('settings-overlay');
  const playerIdOverlay = document.getElementById('player-id-overlay');

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
    game.start();
  });

  document.getElementById('btn-skip-player').addEventListener('click', () => {
    currentPlayerId = null;
    useOnlineSave = false;
    playerIdOverlay.classList.add('hidden');
    game.playClick();
    game.start();
  });

  // --- Start & Load from Title ---
  document.getElementById('btn-start').addEventListener('click', () => {
    game.playClick();
    showPlayerIdModal();
  });

  document.getElementById('btn-load').addEventListener('click', () => {
    game.playClick();
    // Nếu chưa có player ID, hỏi trước
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
    settingsOverlay.classList.remove('hidden');
  });

  // --- Logic Modal Lưu/Tải ---
  function openSaveLoadMenu(mode) {
    saveLoadMode = mode;
    document.getElementById('sl-title').textContent = mode === 'save' ? "Lưu Trò Chơi (Save)" : "Tải Trò Chơi (Load)";
    renderSlots();
    slOverlay.classList.remove('hidden');
  }

  async function renderSlots() {
    const container = document.getElementById('slots-container');
    container.innerHTML = '<i style="grid-column:1/-1;text-align:center;">Đang tải...</i>';

    // Lấy saves từ Supabase nếu có, nếu không thì LocalStorage
    let onlineSaves = [];
    if (useOnlineSave && currentPlayerId) {
      onlineSaves = await getAllSaves(currentPlayerId);
    }

    container.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
      const btn = document.createElement('div');
      btn.className = 'save-slot';

      // Tìm trong online saves trước, nếu không có thì LocalStorage
      const onlineSave = onlineSaves.find(s => s.slot === i);
      const localSaveJSON = localStorage.getItem('tdtu_save_' + i);

      let saveData = null;
      let source = '';

      if (onlineSave) {
        saveData = { index: onlineSave.script_index, date: new Date(onlineSave.saved_at).toLocaleString() };
        source = '🌐';
      } else if (localSaveJSON) {
        saveData = JSON.parse(localSaveJSON);
        source = '💾';
      }

      if (saveData) {
        btn.innerHTML = `<span class="slot-filled">${source} Slot ${i}</span><span class="slot-date">${saveData.date}</span>`;
      } else {
        btn.innerHTML = `<span class="slot-empty">Slot ${i} - Trống</span>`;
      }

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        game.playClick();

        if (saveLoadMode === 'save') {
          if (!ui.gameScreen.classList.contains('active')) return alert("Không lưu được khi đang ở ngoài Menu!");

          const data = {
            index: game.currentIndex,
            date: new Date().toLocaleString()
          };

          // Lưu LocalStorage luôn (fallback)
          localStorage.setItem('tdtu_save_' + i, JSON.stringify(data));

          // Lưu online nếu có player ID
          if (useOnlineSave && currentPlayerId) {
            await saveGame(currentPlayerId, i, game.currentIndex);
          }

          renderSlots();

        } else {
          // Load
          if (saveData) {
            slOverlay.classList.add('hidden');
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

    if (arr.length === 0) {
      area.innerHTML = '<i>Chưa có cuộc trò chuyện nào...</i>';
    } else {
      arr.forEach(item => {
        const div = document.createElement('div');
        div.className = 'log-item';
        div.innerHTML = `<div class="log-speaker">${item.speaker || "Dẫn truyện"}</div>
                         <div class="log-text">${item.text}</div>`;
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
    document.getElementById('speed-val').innerText = e.target.value + "ms";
    game.textSpeed = parseInt(e.target.value);
  });

  // --- Đóng Modals ---
  document.getElementById('btn-close-saveload').addEventListener('click', () => { game.playClick(); slOverlay.classList.add('hidden') });
  document.getElementById('btn-close-log').addEventListener('click', () => { game.playClick(); logOverlay.classList.add('hidden') });
  document.getElementById('btn-close-settings').addEventListener('click', () => { game.playClick(); settingsOverlay.classList.add('hidden') });

});
