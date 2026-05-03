import { getAssetUrl } from './supabase.js';

export class VNEngine {
  constructor(script, uiElements) {
    this.script = script; // Dữ liệu cốt truyện
    this.ui = uiElements; // DOM Elements
    this.currentIndex = 0;
    
    // Typewriter
    this.typewriterTimer = null;
    this.isTyping = false;
    
    // Logic Ngôn Ngữ (i18n)
    this.currentLang = localStorage.getItem('tdtu_lang') || 'vi';

    // States for Navigation Guard
    this.isDirty = false;
    
    // Settings
    this.textSpeed = 25; 
    this.bgmVolume = 1.0;
    this.sfxVolume = 1.0;
    
    // Modes
    this.isAutoMode = false;
    this.isSkipMode = false;
    this.autoTimer = null;
    
    // Log
    this.logHistory = [];

    // Audio
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    this.sfxClick = new Audio(getAssetUrl('click.mp3'));

    // Scene SFX (Sound Effects theo kịch bản)
    this.currentSceneSfx = null;
    this._currentSfxFile = null;   // Track file đang phát để tránh restart
    this._sfxDbVolume = 1.0;       // Volume gốc từ DB cho SFX hiện tại
    this._duckingInterval = null;  // setInterval ID cho smooth volume
    this._preDuckVolume = null;    // Lưu volume trước khi duck
    this.DUCK_LEVEL = 0.15;        // Giảm BGM xuống 15% khi SFX đang phát
    this.DUCK_FADE_MS = 300;       // Thời gian fade mượt (ms)
    
    // BGM tracking for Music Player UI
    this.currentBgmUrl = null;
    this.isPlaylistMode = false; // Mặc định lặp 1 bài
    
    // Player State
    this.mcName = "Người chơi";

    // Character Slot Tracking (lưu trữ tên nhân vật đang đứng ở mỗi slot)
    this.slotState = {
      l: { name: null, id: null, emotion: null }, 
      r: { name: null, id: null, emotion: null }
    };

    // Callbacks (declared here for TS type checking)
    /** @type {((lang: string) => void) | null} */
    this.onLanguageChange = null;
    /** @type {(() => void) | null} */
    this.onPlaylistNext = null;
    /** @type {(() => void) | null} */
    this.onExitScreen = null;
    /** @type {(() => void) | null} */
    this.onAutoSave = null;
    /** @type {((id: string, url: string) => void) | null} */
    this.onCgUnlock = null;
    /** @type {((url: string | null) => void) | null} */
    this.onBgmChange = null;
    /** @type {((isLocked: boolean) => void) | null} */
    this.onBgmLockChange = null;

    // Bắt sự kiện kết thúc nhạc để chuyển bài (nếu bật Playlist)
    this.bgmAudio.addEventListener('ended', () => {
      if (this.isPlaylistMode && this.onPlaylistNext) {
        this.onPlaylistNext();
      }
    });

    // Bind main click event
    this.ui.dialogueBox.addEventListener('click', () => {
      this.playClick();
      this.next();
    });
  }

  setLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem('tdtu_lang', lang);
    // Render lại line hiện tại để cập nhật ngôn ngữ ngay lập tức
    if (this.script && this.script[this.currentIndex]) {
      this.renderLine(this.script[this.currentIndex]);
    }
    // Thông báo ra ngoài để cập nhật UI tĩnh (i18n)
    if (this.onLanguageChange) {
      this.onLanguageChange(lang);
    }
  }

  playClick() {
    this.sfxClick.volume = this.sfxVolume;
    this.sfxClick.currentTime = 0;
    this.sfxClick.play().catch(e => {}); // Ignore error if not interacted
  }

  start() {
    this.currentIndex = 0;
    this.logHistory = [];
    this.isDirty = false;
    this.ui.charSprite.style.opacity = '0'; // Xóa sprite cũ nếu nạp lại trang
    this.ui.charSprite.src = '';
    this.ui.titleScreen.classList.remove('active');
    this.ui.gameScreen.classList.add('active');
    this.renderLine(this.script[this.currentIndex]);
  }

  jumpTo(id) {
    const idx = this.script.findIndex(line => line.id === id);
    if (idx !== -1) {
      this.currentIndex = idx;
      this.renderLine(this.script[this.currentIndex]);
    }
  }

  next(isAutoTrigger = false) {
    clearTimeout(this.autoTimer); // Nếu người dùng chủ động bấm, huỷ auto hiện tại

    // Tắt Auto/Skip nếu đang bật và người dùng thao tác bằng tay
    if (!isAutoTrigger) {
        this.isAutoMode = false; 
        this.isSkipMode = false;
        this.syncModeUI();
    }

    if (this.isTyping) {
      this.completeTyping();
      return;
    }

    const currentLine = this.script[this.currentIndex];
    if (currentLine.choices) return; // Wait for choices

    this.isDirty = true; // Mark progressing

    if (currentLine.next) {
      if (currentLine.next === "title_screen") {
        this.exitToTitle();
        return;
      }
      this.jumpTo(currentLine.next);
    } else {
      this.currentIndex++;
      if (this.currentIndex < this.script.length) {
        this.renderLine(this.script[this.currentIndex]);
      } else {
        this.exitToTitle();
      }
    }
  }

  exitToTitle() {
    this.isAutoMode = false;
    this.isSkipMode = false;
    this.syncModeUI();
    this.stopCurrentSfx(); // Dọn dẹp SFX trước khi thoát
    this.ui.gameScreen.classList.remove('active');
    this.ui.titleScreen.classList.add('active');
    // Báo sự kiện ra màn hình ngoài (nếu có modal sẽ nằm bên main.js)
    if(this.onExitScreen) this.onExitScreen();
  }

  renderLine(line) {
    if (!line) return;

    // 1. Xử lý Thay thế Biến (MC Name)
    let processedDialogue = "";
    if (typeof line.dialogue === 'object' && line.dialogue !== null) {
      processedDialogue = line.dialogue[this.currentLang] || line.dialogue['vi'] || "";
    } else {
      processedDialogue = line.dialogue || line.text || "";
    }
    processedDialogue = processedDialogue.replace(/\{Name\}/g, this.mcName);
    processedDialogue = processedDialogue.replace(/\{name\}/g, this.mcName);

    // 2. Xử lý CG Unlock (Gallery)
    if (line.cg_id && this.onCgUnlock) {
      this.onCgUnlock(line.cg_id, line.bg);
    }

    // 3. Xử lý Nền (Background)
    if (line.bg) {
      this.ui.layerBg.style.backgroundImage = `url('${getAssetUrl(line.bg)}')`;
    }

    this.ui.textCaret.style.display = 'none';

    // Đổi/Phát nhạc nền (BGM)
    if (line.bgm) {
      if (line.bgm === "stop") {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.currentBgmUrl = null;
        if (this.onBgmChange) this.onBgmChange(null);
      } else {
        // Chuẩn hóa đường dẫn để so sánh (tránh phát lại nhạc đang chạy)
        const newBgmUrl = getAssetUrl(line.bgm);
        const currentBvUrl = this.bgmAudio.src;
        // bgmAudio.src is always an absolute URL set by the browser, so compare using URL normalization
        let normalizedNew = newBgmUrl;
        try { normalizedNew = new URL(newBgmUrl, window.location.href).href; } catch(e) {}

        if (currentBvUrl !== normalizedNew) {
          this.bgmAudio.src = newBgmUrl;
          // Nếu đang duck (SFX đang phát), giữ ở mức duck thay vì reset full volume
          if (this._preDuckVolume !== null) {
            this._preDuckVolume = this.bgmVolume; // Cập nhật mức khôi phục
            this.bgmAudio.volume = this.bgmVolume * this.DUCK_LEVEL;
          } else {
            this.bgmAudio.volume = this.bgmVolume;
          }
          this.currentBgmUrl = line.bgm;
          
          // Chơi nhạc và bắt lỗi auto-play
          const playPromise = this.bgmAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Auto-play bị trình duyệt chặn, chờ click tiếp theo: ", error);
            });
          }
          
          // Thông báo cho Music Player UI
          if (this.onBgmChange) this.onBgmChange(line.bgm);
        } else if (this.bgmAudio.paused) {
          // Nếu nhạc đang dừng (do bị chặn trước đó) thì thử phát lại
          this.bgmAudio.play().catch(() => {});
        }
      }

      // Xử lý Khóa nhạc (BGM Lock)
      const isLocked = !!line.bgm_lock;
      if (this.onBgmLockChange) this.onBgmLockChange(isLocked);
    }

    // Xử lý Sound Effect (SFX) với Ducking
    // SFX hoạt động giống BGM: tiếp tục chạy qua các dòng thoại,
    // chỉ dừng khi gặp sfx = "stop" hoặc gán SFX mới.
    if (line.sfx) {
      if (line.sfx.toLowerCase() === 'stop') {
        this.stopCurrentSfx();
      } else {
        // Chỉ phát SFX mới nếu khác file đang chạy (tránh restart lại cùng 1 file)
        const newSfxUrl = getAssetUrl(line.sfx);
        if (!this.currentSceneSfx || this._currentSfxFile !== line.sfx) {
          this.playSfx(line.sfx, line.sfx_volume, line.sfx_loop);
        }
      }
    }
    // Nếu dòng không có trường sfx → giữ nguyên SFX đang phát (không dừng)

    // ===================================================
    // Đổi nhân vật và Emotion (Hệ thống Stage mới)
    // ===================================================

    // Xử lý dữ liệu fallback (tương thích ngược với kịch bản cũ dùng line.char)
    // Dùng hasOwnProperty để phân biệt "không có field" và "field = null"
    const charL = ('char_l' in line) ? line.char_l : (line.char !== undefined ? line.char : undefined);
    const charR = ('char_r' in line) ? line.char_r : undefined;
    const emoL = line.emotion_l || (line.char_l ? line.emotion_l : line.emotion);
    const emoR = line.emotion_r || undefined;

    // Helper để cập nhật một slot
    const updateSlot = (side, charId, emotion) => {
        const slotImg = side === 'l' ? this.ui.charL : this.ui.charR;
        const slotDiv = side === 'l' ? this.ui.slotL : this.ui.slotR;

        if (charId === undefined) return; // Không có yêu cầu đổi thì giữ nguyên

        // --- Ẩn nhân vật khi charId là null/rỗng ---
        if (charId === null || charId === "" || charId === 'null') {
            slotImg.style.opacity = '0';
            this.slotState[side] = { name: null, id: null, emotion: null };
            return;
        }

        // --- Guard: Bỏ qua reload nếu cùng nhân vật + emotion ---
        const prevState = this.slotState[side];
        const emotionNorm = emotion || null;
        if (prevState.id === charId && prevState.emotion === emotionNorm) {
            // Nhân vật không đổi, không cần reload sprite — chỉ đảm bảo đang hiển thị
            slotImg.style.opacity = '1';
            return;
        }

        // Build path
        let spritePath = charId;
        if (!spritePath.startsWith('http') && !spritePath.includes('/')) {
            const ext = spritePath.includes('.') ? '' : '.png';
            const emoSuffix = emotion ? '_' + emotion : '';
            spritePath = getAssetUrl(`${spritePath}${emoSuffix}${ext}`);
        } else {
            spritePath = getAssetUrl(spritePath);
        }

        slotImg.src = spritePath;
        slotImg.style.opacity = '1';
        slotDiv.classList.add('fade-in');
        setTimeout(() => slotDiv.classList.remove('fade-in'), 800);
        
        // Lưu state để tí đối chiếu Focus
        this.slotState[side] = { 
            name: line.speaker && charId === line.char_name ? line.speaker : charId,
            id: charId,
            emotion: emotionNorm
        };
    };

    updateSlot('l', charL, emoL);
    updateSlot('r', charR, emoR);

    // ===================================================
    // Focus Logic (Sáng/Tối - Đẩy sang bên)
    // ===================================================
    const applyFocus = () => {
        const speaker = line.speaker ? line.speaker.toLowerCase() : null;
        
        // Helper so khớp tên
        const isSpeaker = (slot) => {
            if (!speaker || !slot.id) return false;
            // So khớp ID (hao_nhien) hoặc Name (Hạo Nhiên)
            return slot.id.toLowerCase().includes(speaker) || 
                   (slot.name && slot.name.toLowerCase().includes(speaker));
        };

        const leftIsSpeaking = isSpeaker(this.slotState.l);
        const rightIsSpeaking = isSpeaker(this.slotState.r);

        // Reset classes
        this.ui.slotL.classList.remove('char-focus', 'char-dim', 'char-neutral');
        this.ui.slotR.classList.remove('char-focus', 'char-dim', 'char-neutral');

        if (leftIsSpeaking && rightIsSpeaking) {
            // Cả hai cùng nói? (Hiếm) -> Để sáng cả hai
            this.ui.slotL.classList.add('char-focus');
            this.ui.slotR.classList.add('char-focus');
        } else if (leftIsSpeaking) {
            this.ui.slotL.classList.add('char-focus');
            if (this.slotState.r.id) this.ui.slotR.classList.add('char-dim');
        } else if (rightIsSpeaking) {
            this.ui.slotR.classList.add('char-focus');
            if (this.slotState.l.id) this.ui.slotL.classList.add('char-dim');
        } else {
            // Không ai trong slots đang nói (Narrator) -> Để trung tính
            this.ui.slotL.classList.add('char-neutral');
            this.ui.slotR.classList.add('char-neutral');
        }
    };

    applyFocus();


    // Tên người nói
    if (line.speaker) {
      this.ui.nameTag.textContent = line.speaker;
      this.ui.nameTag.style.display = 'block';
      this.ui.nameTag.style.backgroundColor = line.speakerColor || 'var(--tdt-blue)';
    } else {
      this.ui.nameTag.style.display = 'none';
    }

    this.ui.choicesOverlay.classList.add('hidden');
    this.ui.choicesOverlay.innerHTML = '';
    
    // Xử lý lựa chọn: Chấp nhận cả JSON string, Array, hoặc Shorthand string (| và ;;)
    let processedChoices = line.choices;
    if (typeof processedChoices === 'string' && processedChoices.trim() !== '') {
      try {
        // Thử parse nếu là JSON
        processedChoices = JSON.parse(processedChoices);
      } catch (e) {
        // Nếu không phải JSON, hãy parse theo kiểu Shorthand (| và ;;)
        processedChoices = processedChoices.split(';;').map(choiceStr => {
          const [text, next] = choiceStr.split('|');
          return { text: text.trim(), next: (next || '').trim() };
        });
      }
    }
    
    // 8. Lưu Log
    if (this.logHistory.length < this.currentIndex + 1) {
      this.logHistory.push({
        speaker: line.speaker || null,
        textVi: (typeof line.dialogue === 'object' && line.dialogue) ? (line.dialogue['vi'] || line.text || "") : (line.dialogue || line.text || ""),
        textEn: (typeof line.dialogue === 'object' && line.dialogue) ? (line.dialogue['en'] || line.dialogue['vi'] || line.text || "") : (line.dialogue || line.text || "")
      });
    }

    // 9. Auto Save Trigger
    if (this.onAutoSave && !line.choices) {
      this.onAutoSave();
    }
    
    this.typeText(processedDialogue, processedChoices);
  }

  // Phương pháp hỗ trợ Typewriter với dialogue đã xử lý
  typeText(text, choices) {
    let i = 0;
    this.isTyping = true;
    this.ui.dialogueText.textContent = "";
    clearInterval(this.typewriterTimer);
    
    const speed = this.isSkipMode ? 2 : this.textSpeed;
    
    this.typewriterTimer = setInterval(() => {
      this.ui.dialogueText.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        this.completeTyping(choices);
      }
    }, speed);
  }

  completeTyping(choices = null) {
    clearInterval(this.typewriterTimer);
    const line = this.script[this.currentIndex];
    let text = "";
    if (typeof line.dialogue === 'object' && line.dialogue !== null) {
      text = line.dialogue[this.currentLang] || line.dialogue['vi'] || "";
    } else {
      text = line.dialogue || line.text || "";
    }
    text = text.replace(/\{Name\}/g, this.mcName);
    text = text.replace(/\{name\}/g, this.mcName);
    this.ui.dialogueText.textContent = text;
    this.isTyping = false;
    
    // Parse choices if missing (thường xảy ra khi người dùng click tua nhanh câu thoại)
    let finalChoices = choices;
    if (!finalChoices && line.choices) {
        finalChoices = line.choices;
        if (typeof finalChoices === 'string' && finalChoices.trim() !== '') {
            try {
                finalChoices = JSON.parse(finalChoices);
            } catch (e) {
                finalChoices = finalChoices.split(';;').map(choiceStr => {
                    const [cText, cNext] = choiceStr.split('|');
                    return { text: cText.trim(), next: (cNext || '').trim() };
                });
            }
        }
    }
    
    if (finalChoices && finalChoices.length > 0) {
      this.isAutoMode = false;
      this.isSkipMode = false;
      this.syncModeUI();
      this.showChoices(finalChoices);
    } else {
      this.ui.textCaret.style.display = 'block';
      
      // Auto hoặc Skip Mode logic
      if (this.isSkipMode) {
          this.autoTimer = setTimeout(() => this.next(true), 50);
      } else if (this.isAutoMode) {
          this.autoTimer = setTimeout(() => this.next(true), 2000); 
      }
    }
  }

  showChoices(choices) {
    if (!choices || choices.length === 0) return;
    this.ui.choicesOverlay.classList.remove('hidden');
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = c.text;
      btn.onclick = (e) => {
        e.stopPropagation();
        this.playClick();
        this.ui.choicesOverlay.classList.add('hidden');
        this.jumpTo(c.next);
      };
      this.ui.choicesOverlay.appendChild(btn);
    });
  }

  // --- Hệ thống tính năng mở rộng ---

  syncModeUI() {
      if (this.ui.autoBtn) this.ui.autoBtn.classList.toggle('mode-active', this.isAutoMode);
      if (this.ui.skipBtn) this.ui.skipBtn.classList.toggle('mode-active', this.isSkipMode);
  }
  
  toggleAuto() {
      this.isAutoMode = !this.isAutoMode;
      this.isSkipMode = false;
      this.syncModeUI();
      if (this.isAutoMode && !this.isTyping) {
        this.next(true);
      }
  }

  toggleSkip() {
      this.isSkipMode = !this.isSkipMode;
      this.isAutoMode = false;
      this.syncModeUI();
      if (this.isSkipMode) {
          if (this.isTyping) this.completeTyping();
          else this.next(true);
      }
  }

  playBGM(url) {
    if (!url) return;
    const absoluteBvUrl = getAssetUrl(url);
    if (this.bgmAudio.src !== absoluteBvUrl) {
      this.bgmAudio.src = absoluteBvUrl;
      this.bgmAudio.volume = this.bgmVolume;
      this.currentBgmUrl = url;
      if (this.onBgmChange) this.onBgmChange(url);
    }
    
    // Ngăn chặn gọi play liên tục trong cùng 1 frame
    if (!this.bgmAudio.paused) return; 

    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn("Nhạc nền đang chờ tương tác người dùng để phát...");
            // Lắng nghe click đầu tiên để phát nhạc nếu bị chặn
            const playOnInteraction = () => {
                // Kiểm tra lại paused để chống overlapping
                if(this.bgmAudio.paused) this.bgmAudio.play().catch(() => {});
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('keydown', playOnInteraction);
        });
    }
  }

  setVolume(type, val) {
      const floatVal = val / 100;
      if (type === 'bgm') {
          this.bgmVolume = floatVal;
          // Nếu đang duck (có SFX đang phát), chỉ cập nhật mức duck theo volume mới
          if (this._preDuckVolume !== null) {
            this._preDuckVolume = floatVal; // Cập nhật mức khôi phục sau duck
            this.bgmAudio.volume = floatVal * this.DUCK_LEVEL;
          } else {
            this.bgmAudio.volume = floatVal;
          }
      } else {
          this.sfxVolume = floatVal;
          // Cập nhật volume cho SFX đang phát ngay lập tức
          if (this.currentSceneSfx) {
            this.currentSceneSfx.volume = (this._sfxDbVolume ?? 1.0) * floatVal;
          }
      }
  }

  getLog() {
      return this.logHistory;
  }

  // ===================================================
  // SFX & DUCKING SYSTEM
  // ===================================================

  /**
   * Dừng SFX hiện tại (nếu có) và khôi phục volume BGM.
   * Sử dụng .load() để ép trình duyệt giải phóng audio resource hoàn toàn.
   */
  stopCurrentSfx() {
    // Hủy mọi timer đang chạy
    if (this._duckingInterval) {
      clearInterval(this._duckingInterval);
      this._duckingInterval = null;
    }

    if (this.currentSceneSfx) {
      // Gỡ event listener để tránh callback zombie
      this.currentSceneSfx.onended = null;
      this.currentSceneSfx.pause();
      this.currentSceneSfx.removeAttribute('src');
      this.currentSceneSfx.load(); // Ép trình duyệt giải phóng resource
      this.currentSceneSfx = null;
      this._currentSfxFile = null;
    }

    // Khôi phục volume BGM ngay lập tức (không cần mượt khi force-stop)
    if (this._preDuckVolume !== null) {
      this.bgmAudio.volume = Math.max(0, Math.min(1, this._preDuckVolume));
      this._preDuckVolume = null;
    }
  }

  /**
   * Phát SFX với cơ chế Ducking:
   * - Giảm BGM mượt xuống DUCK_LEVEL
   * - Phát SFX
   * - Khi SFX xong (nếu không loop), khôi phục BGM mượt lên lại
   * @param {string} sfxFile - Tên file SFX
   * @param {number} sfxVolume - Âm lượng (0.0 - 1.0)
   * @param {boolean} loop - Lặp lại SFX (cho ambient: mưa, gió...)
   */
  playSfx(sfxFile, sfxVolume = 1.0, loop = false) {
    // Dọn dẹp SFX cũ trước
    this.stopCurrentSfx();

    const sfxUrl = getAssetUrl(sfxFile);
    const sfx = new Audio(sfxUrl);
    this._sfxDbVolume = Math.min(1.0, Math.max(0, sfxVolume ?? 1.0));
    sfx.volume = this._sfxDbVolume * this.sfxVolume;
    sfx.loop = !!loop;
    this.currentSceneSfx = sfx;
    this._currentSfxFile = sfxFile;

    // Lưu volume hiện tại của BGM trước khi duck (chỉ lưu lần đầu)
    if (this._preDuckVolume === null) {
      this._preDuckVolume = this.bgmAudio.volume;
    }
    const targetDuck = this.bgmVolume * this.DUCK_LEVEL;

    // Duck: giảm BGM mượt
    this._smoothVolume(this.bgmAudio, targetDuck, this.DUCK_FADE_MS);

    // Phát SFX
    const playPromise = sfx.play();
    if (playPromise) {
      playPromise.catch(e => console.warn('SFX play blocked:', e));
    }

    // Khi SFX kết thúc tự nhiên (không loop), khôi phục BGM
    if (!loop) {
      sfx.onended = () => {
        if (this.currentSceneSfx === sfx) {
          const restoreTo = this._preDuckVolume !== null ? this._preDuckVolume : this.bgmVolume;
          this._smoothVolume(this.bgmAudio, restoreTo, this.DUCK_FADE_MS);
          this._preDuckVolume = null;
          this.currentSceneSfx = null;
          this._currentSfxFile = null;
        }
      };
    }
  }

  /**
   * Chuyển volume mượt (linear interpolation) cho một Audio element.
   * Dùng setInterval thay vì recursive setTimeout để tránh rò rỉ timer.
   */
  _smoothVolume(audio, targetVol, durationMs) {
    // Hủy interval cũ nếu có
    if (this._duckingInterval) {
      clearInterval(this._duckingInterval);
      this._duckingInterval = null;
    }

    const steps = 15;
    const stepMs = durationMs / steps;
    const startVol = audio.volume;
    const delta = targetVol - startVol;
    let step = 0;

    this._duckingInterval = setInterval(() => {
      step++;
      if (step >= steps) {
        audio.volume = Math.max(0, Math.min(1, targetVol));
        clearInterval(this._duckingInterval);
        this._duckingInterval = null;
        return;
      }
      audio.volume = Math.max(0, Math.min(1, startVol + (delta * step / steps)));
    }, stepMs);
  }
}
