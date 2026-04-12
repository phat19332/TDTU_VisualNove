import { getAssetUrl } from './supabase.js';

// --- Character System ---
class RhythmCharacter {
  constructor(ctx, x, y, isCPU = false) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.isCPU = isCPU;
    
    // States: idle, left, down, up, right, miss
    this.state = 'idle';
    this.stateTimer = 0;
    
    // Tạm thời dùng màu hộp để nhận biết thay vì load Image asset phức tạp
    // Sau này có thể nạp sprite map vào đây
    this.colors = {
      idle: isCPU ? '#ef4444' : '#22c55e', // Đỏ cho CPU, Xanh cho Player
      left: '#c084fc',
      down: '#38bdf8',
      up: '#4ade80',
      right: '#fbbf24',
      miss: '#475569'
    };
  }
  
  playAnim(direction) {
    this.state = direction;
    this.stateTimer = performance.now();
  }
  
  update(time) {
    // Hold pose trong 300ms rồi trả về Idle
    if (this.state !== 'idle' && time - this.stateTimer > 300) {
      this.state = 'idle';
    }
  }
  
  draw() {
    this.ctx.save();
    this.ctx.translate(this.x, this.y);
    
    // Tạo hiệu ứng nảy (bop) nhỏ theo Animation State
    const timeDelta = performance.now() - this.stateTimer;
    let bopY = 0;
    let scaleX = 1, scaleY = 1;
    let rotate = 0;
    
    if (this.state !== 'idle' && timeDelta < 150) {
      if (this.state === 'left') rotate = -0.1;
      else if (this.state === 'right') rotate = 0.1;
      else if (this.state === 'up') { scaleY = 1.1; scaleX = 0.9; bopY = -20; }
      else if (this.state === 'down') { scaleY = 0.8; scaleX = 1.2; bopY = 20; }
      else if (this.state === 'miss') { rotate = (Math.random() - 0.5) * 0.2; }
    } else {
      // Idle bop (nhún nhảy nhẹ rảnh rỗi)
      bopY = Math.sin(performance.now() / 200) * 5; 
    }
    
    this.ctx.translate(0, bopY);
    this.ctx.scale(scaleX, scaleY);
    this.ctx.rotate(rotate);
    
    this.ctx.fillStyle = this.colors[this.state] || this.colors.idle;
    this.ctx.beginPath();
    
    // Vẽ placeholder (Một khối hộp đại diện cho Character)
    this.ctx.roundRect(-75, -150, 150, 150, 20);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    
    // Vẽ 2 mắt vui vẻ
    this.ctx.fillStyle = '#000';
    if (this.state === 'miss') {
      // Mắt hình dấu X
      this.ctx.font = '30px Arial';
      this.ctx.fillText('X', -30, -100);
      this.ctx.fillText('X', 10, -100);
    } else {
      this.ctx.beginPath(); this.ctx.arc(-30, -100, 10, 0, Math.PI*2); this.ctx.fill();
      this.ctx.beginPath(); this.ctx.arc(30, -100, 10, 0, Math.PI*2); this.ctx.fill();
    }
    
    this.ctx.restore();
  }
}

// --- Main Engine ---
export class RhythmGame {
  constructor(overlayId, canvasId) {
    this.overlay = document.getElementById(overlayId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // UI
    this.diffMenu = document.getElementById('rhythm-difficulty-menu');
    this.loader = document.getElementById('rhythm-loader');
    this.ui = document.getElementById('rhythm-ui');
    
    this.scoreEl = document.getElementById('rhythm-score');
    this.comboEl = document.getElementById('rhythm-combo');
    this.healthPlayerEl = document.getElementById('rhythm-health-player');
    this.healthEnemyEl = document.getElementById('rhythm-health-enemy');
    this.judgementEl = document.getElementById('rhythm-judgment');
    this.closeBtn = document.getElementById('btn-close-rhythm');
    
    this.closeBtn.onclick = () => this.stop(false);
    
    // Bắt sự kiện chọn độ khó
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.onclick = (e) => this.selectDifficulty(parseInt(e.target.dataset.level));
    });
    
    // Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    
    this.bgmBuffer = null;
    this.sfxBuffer = null;
    
    this.masterGain = this.audioCtx.createGain();
    this.bgmGain = this.audioCtx.createGain();
    this.sfxGain = this.audioCtx.createGain();
    
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
    
    // Game State
    this.health = 50; // 50 là cân bằng. >50 là Player nghiêng, <50 là CPU nghiêng.
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isPlaying = false;
    this.hitZoneY = 120; // HitZone nằm ở sát TRÊN CÙNG
    
    // Camera Variables (LERP)
    this.cameraMode = 'center'; // 'center', 'cpu', 'player'
    this.currentCamX = 0;
    this.targetCamX = 0;
    this.currentZoom = 1;
    this.targetZoom = 1;
    
    // Difficulty Mods
    this.baseSpeed = 600;
    this.diffMod = {
      speedMult: 1,
      hitWindows: { perfect: 0.05, good: 0.1, bad: 0.15 },
      healthMult: 1, // Hệ số sát thương nhận vào khi Miss
      scoreMult: 1
    };
    
    // 8 Lanes: 0-3 (CPU), 4-7 (Player)
    // CPU Lanes: Trái màn hình
    // Player Lanes: Phải màn hình
    const laneColors = ['#c084fc', '#38bdf8', '#4ade80', '#fbbf24']; // Left, Down, Up, Right
    this.lanes = [];
    const cpuStartX = 150;
    const playerStartX = 650;
    
    // Define 4 lanes for CPU
    for(let i=0; i<4; i++) {
        this.lanes.push({ engineId: i, type: 'cpu', x: cpuStartX + i * 80, color: laneColors[i], char: ['←','↓','↑','→'][i] });
    }
    // Define 4 lanes for Player mapped to arrow keys
    for(let i=0; i<4; i++) {
        this.lanes.push({ engineId: i+4, type: 'player', key: ['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'][i], x: playerStartX + i * 80, color: laneColors[i], char: ['←','↓','↑','→'][i] });
    }
    
    // Chứa Data
    this.pendingBeatmap = null;
    this.pendingBgm = null;
    this.pendingSfx = null;
    this.onCompleteCallback = null;
    
    this.activeKeys = {};
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
  }
  
  setVolume(bgmVol, sfxVol) {
    this.bgmGain.gain.value = bgmVol;
    this.sfxGain.gain.value = Math.max(0.1, sfxVol); // Tránh SFX câm hẳn
  }
  
  async fetchAudioBuffer(url) {
    try {
      const response = await fetch(getAssetUrl(url));
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn("Could not load audio: ", url);
      return null;
    }
  }
  
  playHitsound() {
    if (!this.sfxBuffer) return;
    const source = this.audioCtx.createBufferSource();
    source.buffer = this.sfxBuffer;
    source.connect(this.sfxGain);
    source.start(0);
  }
  
  // Step 1: Open Menu
  start(beatmap, bgmUrl, sfxUrl, onComplete) {
    this.overlay.classList.remove('hidden');
    this.diffMenu.style.display = 'flex';
    this.loader.classList.add('hidden');
    this.ui.classList.add('hidden');
    this.canvas.classList.add('hidden');
    this.closeBtn.classList.remove('hidden');
    
    this.pendingBeatmap = beatmap;
    this.pendingBgm = bgmUrl;
    this.pendingSfx = sfxUrl;
    this.onCompleteCallback = onComplete;
  }
  
  // Step 2: Difficulty Selection -> Load Assets
  async selectDifficulty(level) {
    this.diffMenu.style.display = 'none';
    this.loader.classList.remove('hidden');
    
    // Em Bé (1), Học Sinh (2), Người Lớn (3), Nhóc Trùm (4)
    switch(level) {
      case 1:
        this.diffMod = { speedMult: 0.6, hitWindows: { perfect: 0.1, good: 0.15, bad: 0.25 }, healthMult: 0.2, scoreMult: 0.5 };
        break;
      case 2:
        this.diffMod = { speedMult: 0.9, hitWindows: { perfect: 0.07, good: 0.12, bad: 0.18 }, healthMult: 0.8, scoreMult: 1.0 };
        break;
      case 3:
        this.diffMod = { speedMult: 1.2, hitWindows: { perfect: 0.04, good: 0.08, bad: 0.12 }, healthMult: 1.5, scoreMult: 1.5 };
        break;
      case 4:
        this.diffMod = { speedMult: 1.8, hitWindows: { perfect: 0.02, good: 0.05, bad: 0.08 }, healthMult: 5.0, scoreMult: 3.0 }; // Trượt là chết đau
        break;
    }

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    
    if (this.pendingBgm) this.bgmBuffer = await this.fetchAudioBuffer(this.pendingBgm);
    if (this.pendingSfx) this.sfxBuffer = await this.fetchAudioBuffer(this.pendingSfx);
    
    this._initEngine();
  }
  
  // Step 3: Run Engine
  _initEngine() {
    this.loader.classList.add('hidden');
    this.ui.classList.remove('hidden');
    this.canvas.classList.remove('hidden');
    
    this.notes = JSON.parse(JSON.stringify(this.pendingBeatmap.notes));
    this.baseSpeed = this.pendingBeatmap.speed || 600;
    
    this.health = 50;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.updateUI();
    
    // Init 2 Characters
    // CPU đứng bên trái, Player đứng bên phải
    this.cpuChar = new RhythmCharacter(this.ctx, 270, 500, true);
    this.playerChar = new RhythmCharacter(this.ctx, 770, 500, false);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.isPlaying = true;
    setTimeout(() => {
      if(!this.isPlaying) return;
      this.startMusic();
      requestAnimationFrame(this.renderLoop);
    }, 1000);
  }
  
  startMusic() {
    this.startTime = this.audioCtx.currentTime;
    if (this.bgmBuffer) {
      this.bgmSource = this.audioCtx.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.connect(this.bgmGain);
      this.bgmSource.start(0);
      this.bgmSource.onended = () => {
        if(this.isPlaying) this.stop(true);
      };
    }
  }
  
  stop(isVictory = false) {
    this.isPlaying = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch(e){}
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    
    this.overlay.classList.add('hidden');
    this.ui.classList.add('hidden');
    this.canvas.classList.add('hidden');
    this.diffMenu.style.display = 'none';
    
    if (this.onCompleteCallback) {
      this.onCompleteCallback({ victory: isVictory, score: this.score, maxCombo: this.maxCombo });
    }
  }
  
  // --- Input ---
  handleKeyDown(e) {
    if (!this.isPlaying) return;
    
    // Giới hạn chống kéo page
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    
    const laneObj = this.lanes.find(l => l.key === e.code && l.type === 'player');
    if (!laneObj || this.activeKeys[e.code]) return; 
    
    this.activeKeys[e.code] = true;
    this.playHitsound();
    
    // Player Character Input Anim
    const dirMap = ['left', 'down', 'up', 'right'];
    this.playerChar.playAnim(dirMap[laneObj.engineId - 4]);
    
    this.checkHit(laneObj.engineId);
  }
  
  handleKeyUp(e) {
    this.activeKeys[e.code] = false;
  }
  
  // --- Game Logic ---
  checkHit(laneId) {
    const currentTime = this.audioCtx.currentTime - this.startTime;
    const upcomingNotes = this.notes.filter(n => n.lane === laneId && !n.hit && !n.miss);
    if (upcomingNotes.length === 0) return;
    
    const note = upcomingNotes[0];
    const diff = Math.abs(note.time - currentTime);
    
    // Xác định theo Multiplier Difficulties
    if (diff <= this.diffMod.hitWindows.perfect) {
      note.hit = true;
      this.triggerJudgment("Perfect!", "#fbbf24");
      this.addScore(100, 2);
    } else if (diff <= this.diffMod.hitWindows.good) {
      note.hit = true;
      this.triggerJudgment("Good!", "#4ade80");
      this.addScore(50, 0.5);
    } else if (diff <= this.diffMod.hitWindows.bad) {
      note.hit = true;
      this.triggerJudgment("Bad", "#f87171");
      this.addScore(10, -1 * this.diffMod.healthMult);
    } else if (diff <= 0.3) {
      // Early miss
      this.forceMiss(note);
    }
  }
  
  forceMiss(note) {
    note.miss = true;
    this.triggerJudgment("Miss", "#ef4444");
    this.combo = 0;
    this.addScore(0, -4 * this.diffMod.healthMult);
    
    // Player anim Miss
    if(note.lane >= 4) {
        this.playerChar.playAnim('miss');
    }
  }
  
  triggerJudgment(text, color) {
    this.judgementEl.textContent = text;
    this.judgementEl.style.color = color;
    
    this.judgementEl.style.transition = 'none';
    this.judgementEl.style.transform = 'scale(1.2) rotate(' + (Math.random()*10 - 5) + 'deg)';
    this.judgementEl.style.opacity = '1';
    
    void this.judgementEl.offsetWidth;
    
    this.judgementEl.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.judgementEl.style.transform = 'scale(0.8) rotate(0deg)';
    this.judgementEl.style.opacity = '0';
  }
  
  addScore(points, healthDelta) {
    if (points > 0) {
        this.combo++;
        if(this.combo > this.maxCombo) this.maxCombo = this.combo;
    }
    this.score += Math.floor((points + (this.combo * 2)) * this.diffMod.scoreMult);
    
    // Health 0 là CPU thắng, 100 là Player đổ đầy cây
    this.health = Math.max(0, Math.min(100, this.health + healthDelta));
    this.updateUI();
    
    if (this.health <= 0) {
      this.stop(false); 
    }
  }
  
  updateUI() {
    this.scoreEl.textContent = this.score;
    this.comboEl.textContent = this.combo;
    this.healthPlayerEl.style.width = `${this.health}%`;
    this.healthEnemyEl.style.width = `${100 - this.health}%`;
    
    // Nhấp nháy màu nếu yếu
    if (this.health < 20) {
      this.healthPlayerEl.style.background = '#facc15'; // Đổi vàng sạc
    } else {
      this.healthPlayerEl.style.background = '#4ade80';
    }
  }
  
  // --- Render Loop ---
  renderLoop() {
    if (!this.isPlaying) return;
    
    const currAudioTime = this.audioCtx.currentTime - this.startTime;
    const finalSpeed = this.baseSpeed * this.diffMod.speedMult;
    
    // -- LERP Camera Logic --
    // Giả lập Camera focus vào người đang dồn nhiều phím (Dựa vào vị trí note)
    const upcomingNotes = this.notes.filter(n => !n.hit && !n.miss && n.time > currAudioTime && n.time - currAudioTime < 1.0);
    let cpuNotesCount = 0; let playerNotesCount = 0;
    upcomingNotes.forEach(n => { if(n.lane < 4) cpuNotesCount++; else playerNotesCount++; });
    
    if (cpuNotesCount > playerNotesCount + 1) this.cameraMode = 'cpu';
    else if (playerNotesCount > cpuNotesCount + 1) this.cameraMode = 'player';
    else this.cameraMode = 'center';
    
    if(this.cameraMode === 'cpu') { this.targetCamX = 80; this.targetZoom = 1.05; }
    else if(this.cameraMode === 'player') { this.targetCamX = -80; this.targetZoom = 1.05; }
    else { this.targetCamX = 0; this.targetZoom = 1; }
    
    // LERP Move (Smoothing = 0.05)
    this.currentCamX += (this.targetCamX - this.currentCamX) * 0.05;
    this.currentZoom += (this.targetZoom - this.currentZoom) * 0.05;
    
    // -- Drawing --
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    // Di chuyển transform pivot ra tâm canvas để zoom
    this.ctx.translate(this.canvas.width/2 + this.currentCamX, this.canvas.height/2);
    this.ctx.scale(this.currentZoom, this.currentZoom);
    this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
    
    // Cập nhật & Vẽ Nhân Vật
    const sysTime = performance.now();
    this.cpuChar.update(sysTime);
    this.playerChar.update(sysTime);
    this.cpuChar.draw();
    this.playerChar.draw();
    
    // Vẽ Hit Zone 8 Cột
    this.ctx.lineWidth = 4;
    this.lanes.forEach((lane) => {
      // Nhận diện Input (Player bằng phím, CPU giả lập đang tự bấm gạch sáng)
      let isPressed = false;
      if (lane.type === 'player' && this.activeKeys[lane.key]) isPressed = true;
      if (lane.type === 'cpu' && lane.cpuIsHitting) isPressed = true; // Set cờ ở logic Note ở dưới
      
      this.ctx.strokeStyle = isPressed ? '#fff' : lane.color;
      this.ctx.fillStyle = isPressed ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)';
      
      this.ctx.beginPath();
      // Y=hitZoneY. Chiều x đi lên
      this.ctx.roundRect(lane.x - 35, this.hitZoneY - 35, 70, 70, 10);
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = isPressed ? '#000' : lane.color;
      this.ctx.font = '36px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(lane.char, lane.x, this.hitZoneY);
      
      // Reset CPU Hit anim (nếu vẽ xong)
      if (lane.type === 'cpu') lane.cpuIsHitting = false;
    });
    
    // Cập nhật vị trí Notes (Bottom to Top Scroll)
    this.notes.forEach(note => {
      if (note.hit || note.miss) return;
      
      // CPU Auto-Play Logic
      const laneId = note.lane;
      const lane = this.lanes[laneId];
      
      // Độ lệch
      const diff = note.time - currAudioTime;
      
      if (diff <= 0) {
          if (lane.type === 'cpu') {
              // CPU nện hoàn hảo
              note.hit = true;
              lane.cpuIsHitting = true;
              const dirMap = ['left', 'down', 'up', 'right'];
              this.cpuChar.playAnim(dirMap[laneId]);
              // Có thể cho CPU hồi máu hoặc làm Player tụt máu, ở FNF chuẩn thì khi CPU hát máu Player ko đổi lắm, chỉ lúc Player đánh trúng/trượt mới scale.
              return;
          } else {
             // Miss quá trễ (Player)
             if (diff < -0.2) {
                 this.forceMiss(note);
                 return; 
             }
          }
      }
      
      // Tọa độ Y: Bay từ dưới (Y cao) lên HitZone (Y thấp)
      // distance = diff * speed
      const dist = diff * finalSpeed;
      const drawY = this.hitZoneY + dist;
      
      // Vẽ Note nếu trong viewport
      if (drawY > 0 && drawY < this.canvas.height + 100) {
        this.ctx.fillStyle = lane.color;
        this.ctx.beginPath();
        
        // Cạnh vuông vức FNF style
        this.ctx.fillRect(lane.x - 25, drawY - 25, 50, 50);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(lane.x - 25, drawY - 25, 50, 50);

        // Biểu tượng bên trong nốt bay
        this.ctx.fillStyle = '#000';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(lane.char, lane.x, drawY);
      }
    });
    
    this.ctx.restore(); // Kết thúc Camera Scope
    
    requestAnimationFrame(this.renderLoop);
  }
}
