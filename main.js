import { VNEngine } from './engine.js';
import { storyScript as localScript } from './gameData.js';
import { initSupabase, fetchScript, fetchMusic, saveGame, loadGame, getAllSaves, getAssetUrl } from './supabase.js';

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

    const attemptPlay = () => {
      introSound.play()
        .then(() => {
          // Nếu phát thành công, gỡ bỏ tất cả các listener "mồi"
          document.removeEventListener('click', attemptPlay);
          document.removeEventListener('keydown', attemptPlay);
        })
        .catch(e => console.log("Chờ tương tác để phát nhạc logo..."));
    };

    // Mồi sẵn: Click hoặc bấm phím bất kỳ đều sẽ kích hoạt nhạc logo
    document.addEventListener('click', attemptPlay);
    document.addEventListener('keydown', attemptPlay);

    // Thử phát ngay (nếu trình duyệt đã cho phép từ trước)
    attemptPlay();
  };

  playStudioSound();

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
    // charSprite cũ giữ lại cho tương thích ngược (trỏ vào slot trái)
    charSprite: document.getElementById('char-l'),
    // Mới: Hỗ trợ 2 nhân vật
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
    
    // TIẾP THEO: Hiện modal đặt tên MC
    showMcNameModal();
  });

  document.getElementById('btn-skip-player').addEventListener('click', () => {
    currentPlayerId = null;
    useOnlineSave = false;
    playerIdOverlay.classList.add('hidden');
    game.playClick();
    
    // TIẾP THEO: Hiện modal đặt tên MC
    showMcNameModal();
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

  document.getElementById('btn-gallery').addEventListener('click', () => {
    game.playClick();
    openGallery();
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

    // Lấy tất cả slots bao gồm cả slot 0 (Auto-save)
    for (let i = 0; i <= 6; i++) {
      const btn = document.createElement('div');
      btn.className = 'save-slot';
      if (i === 0) btn.style.border = '2px dashed var(--tdt-blue)';

      // Tìm trong online saves trước, nếu không có thì LocalStorage
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
          if (i === 0) return alert("Slot 0 dành riêng cho Auto-save, hãy chọn Slot khác!");
          if (!ui.gameScreen.classList.contains('active')) return alert("Không lưu được khi đang ở ngoài Menu!");

          const data = {
            index: game.currentIndex,
            date: new Date().toLocaleString(),
            mcName: game.mcName
          };

          // Lưu LocalStorage luôn (fallback)
          localStorage.setItem('tdtu_save_' + i, JSON.stringify(data));

          // Lưu online nếu có player ID
          if (useOnlineSave && currentPlayerId) {
            await saveGame(currentPlayerId, i, game.currentIndex, game.mcName);
          }

          renderSlots();

        } else {
          // Load
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
  document.getElementById('btn-close-gallery').addEventListener('click', () => { game.playClick(); galleryOverlay.classList.add('hidden') });

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
    
    // Tải dữ liệu toàn cục (Gallery) trước khi bắt đầu
    syncGlobalData().then(() => {
        game.start();
    });
  });

  // --- Auto-save Logic ---
  let lastAutoSaveTime = 0;
  game.onAutoSave = () => {
    const now = Date.now();
    // Throttle: Tối đa 1 lần mỗi 30 giây để tránh spam Supabase
    if (now - lastAutoSaveTime > 30000) {
      lastAutoSaveTime = now;
      triggerAutoSave();
    }
  };

  async function triggerAutoSave() {
    const toast = document.getElementById('autosave-toast');
    if (currentPlayerId && useOnlineSave) {
        await saveGame(currentPlayerId, 0, game.currentIndex, game.mcName);
        console.log("💾 Auto-saved to cloud slot 0");
    }
    // Hiện toast thông báo
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
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
            window.open(imgUrl, '_blank');
        });
      }
      galleryGrid.appendChild(item);
    });
  }

  // ===================================================
  // MUSIC PLAYER - Scene-Driven BGM Controller
  // Hiển thị & điều khiển nhạc nền theo cốt truyện
  // Dữ liệu metadata (tên, nghệ sĩ) lấy từ bảng music trên Supabase
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
  const musicLockIcon = document.getElementById('music-lock-icon');

  // Bảng tra cứu metadata: key = tên file nhạc, value = {title, artist, cover_url}
  let bgmMetadata = {}; // Sẽ được nạp từ Supabase
  let isSeekingMusic = false;
  let isManualBgmLocked = false; // Trạng thái khoá của cảnh

  // Khởi tạo trạng thái: Luôn hiện ngay từ đầu (Title Screen)
  musicPlayer.classList.remove('hidden');
  musicToggleBtn.style.display = 'none';

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

  // Ngăn click trên panel lan sang dialogue box
  musicPlayer.addEventListener('click', (e) => e.stopPropagation());

  // Format thời gian m:ss
  function formatMusicTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Trích tên file từ URL để so sánh với metadata
  function extractFilename(urlOrPath) {
    if (!urlOrPath) return '';
    return urlOrPath.split('/').pop().split('?')[0].toLowerCase();
  }

  // Tìm metadata cho một URL nhạc
  function findBgmMeta(bgmUrl) {
    if (!bgmUrl) return null;
    const filename = extractFilename(bgmUrl);
    return bgmMetadata[filename] || null;
  }

  // Cập nhật UI "Now Playing" khi engine đổi BGM
  function updateNowPlaying(bgmUrl) {
    if (!bgmUrl) {
      // Nhạc đã dừng
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
      // Không có metadata → hiện tên file
      const filename = extractFilename(bgmUrl);
      musicTrackTitleEl.textContent = filename || 'BGM';
      musicTrackArtistEl.textContent = 'Game OST';
      musicCover.innerHTML = '<div class="music-cover-placeholder">♪</div>';
    }

    musicPlayBtn.textContent = '⏸';
    musicPlayer.classList.add('is-playing');
    highlightActiveTrack(bgmUrl);
  }

  // Highlight bài đang phát trong danh sách thư viện
  function highlightActiveTrack(bgmUrl) {
    const items = musicTracklistEl.querySelectorAll('.music-track-item');
    const activeFilename = bgmUrl ? extractFilename(bgmUrl) : null;
    items.forEach(item => {
      const itemFilename = item.dataset.filename;
      item.classList.toggle('is-active', itemFilename === activeFilename);
    });
  }

  // Render thư viện BGM từ Supabase (chỉ hiển thị, không tự phát nhạc)
  function renderBgmLibrary(tracks) {
    musicTracklistEl.innerHTML = '';
    if (!tracks || tracks.length === 0) {
      musicTracklistEl.innerHTML = '<div class="music-tracklist-empty">Chưa có nhạc trong bảng <b>music</b> trên Supabase.<br>Nhạc vẫn phát theo cột <b>bgm</b> trong bảng scripts.</div>';
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

      // Click vào bài hát trong thư viện để phát thủ công
      item.addEventListener('click', (e) => {
        e.stopPropagation();

        // Kiểm tra nếu đang bị khoá theo cốt truyện
        if (isManualBgmLocked) {
          console.log("Không thể đổi nhạc: Cảnh này yêu cầu nhạc cố định.");
          return;
        }

        // Lấy URL bài hát
        let trackUrl = track.url;
        if (trackUrl && !trackUrl.startsWith('http')) {
          trackUrl = getAssetUrl(trackUrl);
        }

        // Yêu cầu Engine phát bài này
        game.bgmAudio.src = trackUrl;
        game.bgmAudio.play().catch(err => console.warn("Lỗi phát nhạc thủ công:", err));

        // Cập nhật UI
        updateNowPlaying(trackUrl);
      });

      musicTracklistEl.appendChild(item);
    });
  }

  // --- Kết nối với Engine's bgmAudio ---

  // Play/Pause toggle điều khiển trực tiếp bgmAudio của engine
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

  // Progress bar → cập nhật theo bgmAudio của engine
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

  // Volume → điều khiển trực tiếp bgmVolume của engine
  musicVolumeEl.addEventListener('input', (e) => {
    e.stopPropagation();
    const vol = e.target.value / 100;
    game.bgmAudio.volume = vol;
    game.bgmVolume = vol;
  });

  // Đăng ký callback: khi engine đổi BGM → cập nhật Music Player UI
  game.onBgmChange = (bgmUrl) => {
    updateNowPlaying(bgmUrl);
  };

  // Lắng nghe sự kiện Khoá nhạc từ Engine
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
      
      // Nếu tắt playlist, set nhạc hiện tại lặp lại
      game.bgmAudio.loop = !game.isPlaylistMode;
  });

  game.onPlaylistNext = () => {
    if (allTracks.length === 0) return;
    
    // Tìm bài hiện tại trong list
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
    game.bgmAudio.play().catch(() => {});
    updateNowPlaying(trackUrl);
  };

  // --- Fetch BGM metadata từ Supabase ---
  let allTracks = [];
  if (supabaseReady) {
    try {
      const tracks = await fetchMusic();
      if (tracks && tracks.length > 0) {
        allTracks = tracks;
        // Xây dựng bảng tra cứu metadata theo filename
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
