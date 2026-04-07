export class VNEngine {
  constructor(script, uiElements) {
    this.script = script; // Dữ liệu cốt truyện
    this.ui = uiElements; // DOM Elements
    this.currentIndex = 0;
    
    // Typewriter
    this.typewriterTimer = null;
    this.isTyping = false;
    
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
    this.sfxClick = new Audio('/assets/audio/click.mp3');
    
    // Bind main click event
    this.ui.dialogueBox.addEventListener('click', () => {
      this.playClick();
      this.next();
    });
  }

  playClick() {
    this.sfxClick.volume = this.sfxVolume;
    this.sfxClick.currentTime = 0;
    this.sfxClick.play().catch(e => {}); // Ignore error if not interacted
  }

  start() {
    this.currentIndex = 0;
    this.logHistory = [];
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
    this.bgmAudio.pause();
    this.isAutoMode = false;
    this.isSkipMode = false;
    this.syncModeUI();
    this.ui.gameScreen.classList.remove('active');
    this.ui.titleScreen.classList.add('active');
  }

  renderLine(line) {
    this.ui.textCaret.style.display = 'none';

    // Log tracking
    if (line.text) {
      this.logHistory.push({ speaker: line.speaker || "", text: line.text });
    }

    // Đổi background
    if (line.bg) {
      this.ui.layerBg.style.backgroundImage = `url('${line.bg}')`;
    }

    // Đổi/Phát nhạc nền (BGM)
    if (line.bgm) {
      if (line.bgm === "stop") {
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
      } else {
        const currentSrc = new URL(this.bgmAudio.src || "dummy:", window.location.href).pathname;
        if (currentSrc !== line.bgm && line.bgm !== undefined) {
          this.bgmAudio.src = line.bgm;
          this.bgmAudio.volume = this.bgmVolume;
          this.bgmAudio.play().catch(e => console.warn("Auto-play blocked"));
        }
      }
    }

    // Đổi nhân vật và Emotion
    if (line.char !== undefined) {
      if (line.char === null) {
        this.ui.charSprite.style.opacity = '0';
      } else {
        // Logic emotion: Nếu có line.emotion => build char_{emotion}.png
        let spritePath = line.char;
        if (!spritePath.includes('/')) {
            // Tên ngắn gọn
            spritePath = `/assets/characters/${line.char}${line.emotion ? '_' + line.emotion : ''}.png`;
        }
        
        this.ui.charSprite.src = spritePath;
        this.ui.charSprite.style.opacity = '1';
        this.ui.charSprite.className = line.charAnim || 'fade-in';
      }
    }

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
    
    this.typeText(line.text, line.choices);
  }

  typeText(text, choices) {
    this.isTyping = true;
    this.ui.dialogueText.innerHTML = '';
    clearInterval(this.typewriterTimer);
    
    let i = 0;
    
    // Tốc độ đánh chữ (Skip mode thì chạy thật nhanh)
    const speed = this.isSkipMode ? 2 : this.textSpeed;

    this.typewriterTimer = setInterval(() => {
      this.ui.dialogueText.innerHTML += text.charAt(i);
      i++;
      if (i >= text.length) {
        this.completeTyping(text, choices);
      }
    }, speed); 
  }

  completeTyping(text = null, choices = null) {
    clearInterval(this.typewriterTimer);
    this.isTyping = false;
    
    const line = this.script[this.currentIndex];
    this.ui.dialogueText.innerHTML = text || line.text;
    
    if (line.choices || choices) {
      this.isAutoMode = false;
      this.isSkipMode = false;
      this.syncModeUI();
      this.showChoices(line.choices || choices);
    } else {
      this.ui.textCaret.style.display = 'block';
      
      // Auto hoặc Skip Mode logic
      if (this.isSkipMode) {
          this.autoTimer = setTimeout(() => this.next(true), 50);
      } else if (this.isAutoMode) {
          this.autoTimer = setTimeout(() => this.next(true), 2000); // Đợi 2 giây sang câu mới
      }
    }
  }

  showChoices(choices) {
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

  setVolume(type, val) {
      const floatVal = val / 100;
      if (type === 'bgm') {
          this.bgmVolume = floatVal;
          this.bgmAudio.volume = floatVal;
      } else {
          this.sfxVolume = floatVal;
      }
  }

  getLog() {
      return this.logHistory;
  }
}
