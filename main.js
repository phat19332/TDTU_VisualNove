import { storyScript } from './gameData.js';
import { VNEngine } from './engine.js';

document.addEventListener('DOMContentLoaded', () => {
  // Splash Screen Timeout
  setTimeout(() => {
     document.getElementById('splash-screen').classList.remove('active');
     document.getElementById('title-screen').classList.add('active');
  }, 5000); // Tăng Loading lên 5s

  const ui = {
    titleScreen: document.getElementById('title-screen'),
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

  const game = new VNEngine(storyScript, ui);

  // --- Modals Elements ---
  const slOverlay = document.getElementById('saveload-overlay');
  const logOverlay = document.getElementById('log-overlay');
  const settingsOverlay = document.getElementById('settings-overlay');
  
  let saveLoadMode = 'save'; // 'save' | 'load'
  
  // --- Start & Load from Title ---
  document.getElementById('btn-start').addEventListener('click', () => {
    game.playClick();
    game.start();
  });
  
  document.getElementById('btn-load').addEventListener('click', () => {
    game.playClick();
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

  function renderSlots() {
    const container = document.getElementById('slots-container');
    container.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
      const slotDataJSON = localStorage.getItem('tdtu_save_' + i);
      const btn = document.createElement('div');
      btn.className = 'save-slot';
      
      if (slotDataJSON) {
        const data = JSON.parse(slotDataJSON);
        btn.innerHTML = `<span class="slot-filled">Slot ${i}</span><span class="slot-date">${data.date}</span>`;
      } else {
        btn.innerHTML = `<span class="slot-empty">Slot ${i} - Trống</span>`;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        game.playClick();
        if (saveLoadMode === 'save') {
           // Đang chơi mới cho phép Save
           if(!ui.gameScreen.classList.contains('active')) return alert("Không lưu được khi đang ở ngoài Menu!");
           
           const data = {
             index: game.currentIndex,
             date: new Date().toLocaleString()
           };
           localStorage.setItem('tdtu_save_' + i, JSON.stringify(data));
           renderSlots(); // render lại
        } else {
           if (slotDataJSON) {
               const data = JSON.parse(slotDataJSON);
               slOverlay.classList.add('hidden');
               game.start(); // Khởi tạo lại
               game.currentIndex = data.index; // Ghi đè tiến trình
               game.renderLine(game.script[game.currentIndex]); // Vẽ lại
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
    
    if(arr.length === 0) {
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
    // scroll to bottom
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
