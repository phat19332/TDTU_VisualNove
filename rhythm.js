import { getAssetUrl } from './supabase.js';

// ==========================================
// MODULE 1: AUDIO MANAGER (Web Audio Sys)
// ==========================================
class AudioManager {
  constructor() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.bgmBuffer = null;
    this.sfxBuffer = null;
    
    this.masterGain = this.ctx.createGain();
    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.bgmSource = null;
    this.startTime = 0;
  }
  
  setVolume(bgmVol, sfxVol) {
    this.bgmGain.gain.value = bgmVol;
    this.sfxGain.gain.value = Math.max(0.1, sfxVol);
  }
  
  async loadBuffer(url) {
    if (!url) return null;
    try {
      const response = await fetch(getAssetUrl(url));
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.warn("Failed loading audio: ", url);
      return null;
    }
  }
  
  playHitsound() {
    if (!this.sfxBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.sfxBuffer;
    source.connect(this.sfxGain);
    source.start(0);
  }
  
  startBGM(onEndedCallback) {
    if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(()=>console.log("Chưa thể resume AudioContext"));
    }
    
    // Nếu source đang phát (state check chống lặp) thì bỏ qua
    if (this.isBgmPlaying && this.bgmSource) return;

    this.startTime = this.ctx.currentTime;
    if (this.bgmBuffer) {
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.connect(this.bgmGain);
      // Tạm tắt loop để tránh lặp file quá ngắn (như tiếng ting ting của logo)
      this.bgmSource.loop = false; 
      this.bgmSource.start(0);
      this.isBgmPlaying = true;
    }
  }
  
  stopBGM() {
    if (this.bgmSource) {
      try { this.bgmSource.stop(); } catch(e){}
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    this.isBgmPlaying = false;
  }
  
  getCurrentTime() {
    return this.ctx.currentTime - this.startTime;
  }
}

// ==========================================
// MODULE 2: CHARACTER MANAGER
// ==========================================
class CharacterManager {
  constructor(x, y, isCPU = false) {
    this.x = x;
    this.y = y;
    this.isCPU = isCPU;
    
    // Future expansion: AssetMap for Spritesheets
    this.spriteUrl = null; 
    this.state = 'idle'; // idle, left, down, up, right, miss
    this.stateTimer = 0;
    
    this.colors = {
      idle: isCPU ? '#ef4444' : '#22c55e', 
      left: '#c084fc', down: '#38bdf8', up: '#4ade80', right: '#fbbf24', miss: '#475569'
    };
  }
  
  playAnim(state) {
    this.state = state;
    this.stateTimer = performance.now();
  }
  
  update(time) {
    // Revert to idle after 300ms
    if (this.state !== 'idle' && time - this.stateTimer > 300) {
      this.state = 'idle';
    }
  }
  
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const timeDelta = performance.now() - this.stateTimer;
    let bopY = 0, scaleX = 1, scaleY = 1, rotate = 0;
    
    if (this.state !== 'idle' && timeDelta < 150) {
      if (this.state === 'left') rotate = -0.1;
      else if (this.state === 'right') rotate = 0.1;
      else if (this.state === 'up') { scaleY = 1.1; scaleX = 0.9; bopY = -20; }
      else if (this.state === 'down') { scaleY = 0.8; scaleX = 1.2; bopY = 20; }
      else if (this.state === 'miss') { rotate = (Math.random() - 0.5) * 0.2; }
    } else {
      bopY = Math.sin(performance.now() / 200) * 5; 
    }
    
    ctx.translate(0, bopY);
    ctx.scale(scaleX, scaleY);
    ctx.rotate(rotate);
    
    ctx.fillStyle = this.colors[this.state] || this.colors.idle;
    ctx.beginPath();
    ctx.roundRect(-75, -150, 150, 150, 20);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Face
    ctx.fillStyle = '#000';
    if (this.state === 'miss') {
      ctx.font = '30px Arial';
      ctx.fillText('X', -30, -100);
      ctx.fillText('X', 10, -100);
    } else {
      ctx.beginPath(); ctx.arc(-30, -100, 10, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(30, -100, 10, 0, Math.PI*2); ctx.fill();
    }
    
    ctx.restore();
  }
}

// ==========================================
// MODULE 3: GAME LOGIC & DIFFICULTY
// ==========================================
class GameLogic {
  constructor(uiElements) {
    this.ui = uiElements;
    this.health = 50; 
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    
    this.diffMod = { speedMult: 1, hitWindows: { perfect: 0.05, good: 0.1, bad: 0.15 }, healthMult: 1, scoreMult: 1 };
  }
  
  setDifficulty(level) {
    switch(level) {
      case 1: // Em Bé
        this.diffMod = { speedMult: 0.6, hitWindows: { perfect: 0.15, good: 0.2, bad: 0.3 }, healthMult: 0.2, scoreMult: 0.5 };
        break;
      case 2: // Học Sinh
        this.diffMod = { speedMult: 0.9, hitWindows: { perfect: 0.07, good: 0.12, bad: 0.18 }, healthMult: 0.8, scoreMult: 1.0 };
        break;
      case 3: // Người Lớn
        this.diffMod = { speedMult: 1.2, hitWindows: { perfect: 0.04, good: 0.08, bad: 0.12 }, healthMult: 1.5, scoreMult: 1.5 };
        break;
      case 4: // Nhóc Trùm
        this.diffMod = { speedMult: 1.8, hitWindows: { perfect: 0.03, good: 0.05, bad: 0.08 }, healthMult: 5.0, scoreMult: 3.0 }; 
        break;
    }
  }

  triggerJudgment(text, color) {
    this.ui.judgementEl.textContent = text;
    this.ui.judgementEl.style.color = color;
    this.ui.judgementEl.style.transition = 'none';
    this.ui.judgementEl.style.transform = 'scale(1.2) rotate(' + (Math.random()*10 - 5) + 'deg)';
    this.ui.judgementEl.style.opacity = '1';
    
    void this.ui.judgementEl.offsetWidth; // reflow
    
    this.ui.judgementEl.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.ui.judgementEl.style.transform = 'scale(0.8) rotate(0deg)';
    this.ui.judgementEl.style.opacity = '0';
  }
  
  addScore(points, healthDelta) {
    if (points > 0) {
        this.combo++;
        if(this.combo > this.maxCombo) this.maxCombo = this.combo;
    } else if (points === 0) {
        this.combo = 0; // Miss
    }
    this.score += Math.floor((points + (this.combo * 2)) * this.diffMod.scoreMult);
    this.health = Math.max(0, Math.min(100, this.health + healthDelta));
    this.updateUI();
    return this.health <= 0; // Return true if game over
  }
  
  updateUI() {
    this.ui.scoreEl.textContent = this.score;
    this.ui.comboEl.textContent = this.combo;
    this.ui.healthPlayerEl.style.width = `${this.health}%`;
    this.ui.healthEnemyEl.style.width = `${100 - this.health}%`;
    
    if (this.health < 20) this.ui.healthPlayerEl.style.background = '#facc15';
    else this.ui.healthPlayerEl.style.background = '#4ade80';
  }
}

// ==========================================
// MODULE 4: NOTES MANAGER
// ==========================================
class NotesManager {
  constructor(lanesBaseConfig, baseSpeed, hitZoneY) {
    this.baseSpeed = baseSpeed;
    this.hitZoneY = hitZoneY;
    this.notes = [];
    this.lanes = lanesBaseConfig; 
    
    // Track hold states
    this.activeHolds = {}; // { laneId: noteRef }
  }
  
  loadBeatmap(beatmapData) {
    // Deep clone and normalize
    this.notes = beatmapData.notes.map(n => ({
      ...n, 
      hit: false, miss: false, 
      type: n.type || 'tap',
      holdLength: n.holdLength || 0,
      holdProgress: 0,
      isHolding: false
    }));
    this.baseSpeed = beatmapData.baseSpeed || beatmapData.speed || 600;
  }
  
  handleHit(laneId, diff, gameLogic) {
    const upcomingNotes = this.notes.filter(n => n.lane === laneId && !n.hit && !n.miss);
    if (upcomingNotes.length === 0) return null;
    
    const note = upcomingNotes[0];
    const absDiff = Math.abs(note.time - diff);
    const mod = gameLogic.diffMod;
    
    if (absDiff <= mod.hitWindows.perfect) {
      this.evaluateHitVerdict(note, laneId, gameLogic, "Perfect!", "#fbbf24", 100, 2);
    } else if (absDiff <= mod.hitWindows.good) {
      this.evaluateHitVerdict(note, laneId, gameLogic, "Good!", "#4ade80", 50, 0.5);
    } else if (absDiff <= mod.hitWindows.bad) {
      this.evaluateHitVerdict(note, laneId, gameLogic, "Bad", "#f87171", 10, -1 * mod.healthMult);
    } else if (absDiff <= 0.3) {
      this.forceMiss(note, laneId, gameLogic);
    }
    return note;
  }
  
  evaluateHitVerdict(note, laneId, gameLogic, text, color, score, healthDelta) {
    gameLogic.triggerJudgment(text, color);
    gameLogic.addScore(score, healthDelta);
    
    if (note.type === 'hold') {
      note.isHolding = true;
      this.activeHolds[laneId] = note;
    } else {
      note.hit = true;
    }
  }

  handleRelease(laneId, gameLogic) {
    if (this.activeHolds[laneId]) {
      const note = this.activeHolds[laneId];
      // Released hold early ?
      if (note.holdProgress < note.holdLength * 0.9) {
         gameLogic.triggerJudgment("Bỏ lỡ Hold!", "#ef4444");
         gameLogic.addScore(0, -3 * gameLogic.diffMod.healthMult);
         note.miss = true;
      } else {
         note.hit = true; // successfully finished
      }
      note.isHolding = false;
      delete this.activeHolds[laneId];
    }
  }
  
  forceMiss(note, laneId, gameLogic) {
    note.miss = true;
    note.isHolding = false;
    delete this.activeHolds[laneId];
    gameLogic.triggerJudgment("Miss", "#ef4444");
    gameLogic.addScore(0, -5 * gameLogic.diffMod.healthMult);
  }

  updateAndDraw(ctx, canvasHeight, currTime, speedMult, cpuChar, playerChar, gameLogic, activeKeys) {
    const finalSpeed = this.baseSpeed * speedMult;
    
    // Draw Lanes
    ctx.lineWidth = 4;
    this.lanes.forEach((lane) => {
      let isPressed = false;
      if (lane.type === 'player' && activeKeys[lane.key]) isPressed = true;
      if (lane.type === 'cpu' && lane.cpuIsHitting) isPressed = true;
      
      ctx.strokeStyle = isPressed ? '#fff' : lane.color;
      ctx.fillStyle = isPressed ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)';
      
      ctx.beginPath();
      ctx.roundRect(lane.x - 35, this.hitZoneY - 35, 70, 70, 10);
      ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = isPressed ? '#000' : lane.color;
      ctx.font = '36px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(lane.char, lane.x, this.hitZoneY);
      
      if (lane.type === 'cpu') lane.cpuIsHitting = false;
    });
    
    // Notes Logic & Render
    this.notes.forEach(note => {
      if (note.hit || note.miss) return;
      
      const lane = this.lanes[note.lane];
      const diff = note.time - currTime;
      const dist = diff * finalSpeed;
      const drawY = this.hitZoneY + dist;
      
      // Check auto CPU Play
      if (diff <= 0 && lane.type === 'cpu') {
        if (note.type === 'hold') {
            note.isHolding = true;
            lane.cpuIsHitting = true;
            cpuChar.playAnim(['left', 'down', 'up', 'right'][note.lane]);
            // CPU hold handling
            if (-diff >= note.holdLength) { note.hit = true; note.isHolding = false; }
        } else {
            note.hit = true;
            lane.cpuIsHitting = true;
            cpuChar.playAnim(['left', 'down', 'up', 'right'][note.lane]);
        }
        return;
      }
      
      // Check Miss (Not hitting tap note in time)
      if (diff < -0.25 && !note.isHolding && lane.type === 'player') {
         this.forceMiss(note, note.lane, gameLogic);
         playerChar.playAnim('miss');
         return;
      }

      // Handle Hold Core ticking logic for Player
      if (note.isHolding && lane.type === 'player') {
          note.holdProgress = -diff; 
          // Give incremental points periodically
          if (Math.floor(note.holdProgress * 10) % 2 === 0) gameLogic.addScore(5, 0.1); 
          playerChar.playAnim(['left', 'down', 'up', 'right'][note.lane - 4]);
          
          if (note.holdProgress >= note.holdLength) {
              note.hit = true;
              note.isHolding = false;
              delete this.activeHolds[note.lane];
              gameLogic.triggerJudgment("Perfect Hold!", "#38bdf8");
              gameLogic.addScore(50, 2);
          }
      }

      // Render Sustain Tail
      if (note.type === 'hold' && !note.hit && !note.miss) {
          const holdPixelLen = note.holdLength * finalSpeed;
          let tailStartY = drawY;
          let tailEndY = drawY + holdPixelLen;
          
          if (note.isHolding) tailStartY = this.hitZoneY; // Cắt dần đuôi nếu đang hold trúng
          
          if (tailEndY > 0 && tailStartY < canvasHeight + 100) {
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = lane.color;
              ctx.fillRect(lane.x - 15, tailStartY, 30, tailEndY - tailStartY);
              ctx.globalAlpha = 1.0;
          }
      }
      
      // Render Head Note
      if (drawY > 0 && drawY < canvasHeight + 100 && !note.isHolding) {
          ctx.fillStyle = lane.color;
          ctx.beginPath();
          ctx.fillRect(lane.x - 25, drawY - 25, 50, 50);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.strokeRect(lane.x - 25, drawY - 25, 50, 50);
          
          ctx.fillStyle = '#000'; ctx.font = '24px Arial';
          ctx.fillText(lane.char, lane.x, drawY);
      }
    });
  }

  getUpcomingNotesCount(currTime) {
      let cpuC = 0, plaC = 0;
      this.notes.forEach(n => {
          if (!n.hit && !n.miss && n.time > currTime && n.time - currTime < 1.0) {
              if (n.lane < 4) cpuC++; else plaC++;
          }
      });
      return { cpu: cpuC, player: plaC };
  }
}

// ==========================================
// MODULE 5: RHYTHM ENGINE (Core Loop)
// ==========================================
export class RhythmGame {
  constructor(overlayId, canvasId) {
    this.overlay = document.getElementById(overlayId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // UI Pointers
    const getEl = id => document.getElementById(id);
    this.uiRefs = {
      diffMenu: getEl('rhythm-difficulty-menu'),
      loader: getEl('rhythm-loader'),
      gameUI: getEl('rhythm-ui'),
      scoreEl: getEl('rhythm-score'),
      comboEl: getEl('rhythm-combo'),
      healthPlayerEl: getEl('rhythm-health-player'),
      healthEnemyEl: getEl('rhythm-health-enemy'),
      judgementEl: getEl('rhythm-judgment'),
      closeBtn: getEl('btn-close-rhythm')
    };
    
    this.uiRefs.closeBtn.onclick = () => this.stop(false);
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.onclick = (e) => this.selectDifficulty(parseInt(e.target.dataset.level));
    });
    
    // Init Sub-Modules
    this.audio = new AudioManager();
    this.logic = new GameLogic(this.uiRefs);
    
    // Lanes definitions
    const colors = ['#c084fc', '#38bdf8', '#4ade80', '#fbbf24'];
    const pKeys = ['ArrowLeft','ArrowDown','ArrowUp','ArrowRight'];
    const lanesDef = [];
    for(let i=0; i<4; i++) lanesDef.push({ engineId: i, type: 'cpu', x: 150 + i*80, color: colors[i], char: ['←','↓','↑','→'][i] });
    for(let i=0; i<4; i++) lanesDef.push({ engineId: i+4, type: 'player', key: pKeys[i], x: 650 + i*80, color: colors[i], char: ['←','↓','↑','→'][i] });
    
    this.notesMgr = new NotesManager(lanesDef, 600, 120);
    this.cpuChar = null;
    this.playerChar = null;
    
    // State
    this.isPlaying = false;
    this.activeKeys = {};
    this.camState = { mode: 'center', currentX: 0, targetX: 0, currentZ: 1, targetZ: 1 };
    
    this.pendingData = {};
    
    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.renderLoop = this.renderLoop.bind(this);
  }
  
  setVolume(b, s) { this.audio.setVolume(b, s); }
  
  start(beatmapJson, bgmUrl, sfxUrl, onComplete) {
    this.overlay.classList.remove('hidden');
    this.uiRefs.diffMenu.style.display = 'flex';
    this.uiRefs.loader.classList.add('hidden');
    this.uiRefs.gameUI.classList.add('hidden');
    this.canvas.classList.add('hidden');
    this.uiRefs.closeBtn.classList.remove('hidden');
    
    this.pendingData = { beatmap: beatmapJson, bgm: bgmUrl, sfx: sfxUrl, cb: onComplete };
  }
  
  async selectDifficulty(level) {
    this.uiRefs.diffMenu.style.display = 'none';
    this.uiRefs.loader.classList.remove('hidden');
    this.logic.setDifficulty(level);
    
    if (this.audio.ctx.state === 'suspended') await this.audio.ctx.resume();
    
    this.audio.bgmBuffer = await this.audio.loadBuffer(this.pendingData.bgm);
    this.audio.sfxBuffer = await this.audio.loadBuffer(this.pendingData.sfx);
    
    this._runEngine();
  }
  
  _runEngine() {
    this.uiRefs.loader.classList.add('hidden');
    this.uiRefs.gameUI.classList.remove('hidden');
    this.canvas.classList.remove('hidden');
    
    this.notesMgr.loadBeatmap(this.pendingData.beatmap);
    this.logic.health = 50; this.logic.score = 0; this.logic.combo = 0; this.logic.maxCombo = 0;
    this.logic.updateUI();
    
    // Tính toán thời điểm bài hát / map kết thúc (Giây) + Thêm 3 giây dư âm
    this.endTime = Math.max(...this.notesMgr.notes.map(n => n.time + n.holdLength)) + 3;
    
    this.cpuChar = new CharacterManager(270, 500, true);
    this.playerChar = new CharacterManager(770, 500, false);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    this.isPlaying = true;
    window.isRhythmActive = true;
    this.timeoutId = setTimeout(() => {
      if(!this.isPlaying) return;
      this.audio.startBGM(() => { if(this.isPlaying) this.stop(true); });
      this.rafId = requestAnimationFrame(this.renderLoop);
    }, 1000);
  }
  
  stop(isVictory, silent = false) {
    this.isPlaying = false;
    window.isRhythmActive = false;
    
    // Dọn dẹp tài nguyên
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.audio.stopBGM();
    
    this.overlay.classList.add('hidden');
    this.uiRefs.gameUI.classList.add('hidden');
    this.canvas.classList.add('hidden');
    this.uiRefs.diffMenu.style.display = 'none';
    
    if (this.pendingData.cb) {
        const callback = this.pendingData.cb;
        this.pendingData.cb = null; // Clear to prevent double calls
        callback({ victory: isVictory, score: this.logic.score, maxCombo: this.logic.maxCombo, silent });
    }
  }
  
  handleKeyDown(e) {
    if (!window.isRhythmActive || !this.isPlaying) return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
    
    const laneObj = this.notesMgr.lanes.find(l => l.key === e.code && l.type === 'player');
    if (!laneObj || this.activeKeys[e.code]) return; 
    
    this.activeKeys[e.code] = true;
    this.audio.playHitsound();
    
    this.playerChar.playAnim(['left', 'down', 'up', 'right'][laneObj.engineId - 4]);
    
    // Tap Evaluation
    const note = this.notesMgr.handleHit(laneObj.engineId, this.audio.getCurrentTime(), this.logic);
    if (!note) {
      // Spamming incorrectly causes minor health drain in Pro mode
      this.logic.addScore(0, -1 * this.logic.diffMod.healthMult);
    } else {
        // Player failed check -> Game Over
        if(this.logic.health <= 0) this.stop(false);
    }
  }
  
  handleKeyUp(e) {
    if (!window.isRhythmActive) return;
    this.activeKeys[e.code] = false;
    const laneObj = this.notesMgr.lanes.find(l => l.key === e.code && l.type === 'player');
    if (laneObj) {
        this.notesMgr.handleRelease(laneObj.engineId, this.logic);
    }
  }
  
  renderLoop() {
    if (!this.isPlaying) return;
    const currTime = this.audio.getCurrentTime();
    
    // Camera LERP Logic
    const upcoming = this.notesMgr.getUpcomingNotesCount(currTime);
    if (upcoming.cpu > upcoming.player + 1) this.camState.mode = 'cpu';
    else if (upcoming.player > upcoming.cpu + 1) this.camState.mode = 'player';
    else this.camState.mode = 'center';
    
    if (this.camState.mode === 'cpu') { this.camState.targetX = 80; this.camState.targetZ = 1.05; }
    else if (this.camState.mode === 'player') { this.camState.targetX = -80; this.camState.targetZ = 1.05; }
    else { this.camState.targetX = 0; this.camState.targetZ = 1; }
    
    this.camState.currentX += (this.camState.targetX - this.camState.currentX) * 0.05;
    this.camState.currentZ += (this.camState.targetZ - this.camState.currentZ) * 0.05;
    
    // Clear & Transform
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.canvas.width/2 + this.camState.currentX, this.canvas.height/2);
    this.ctx.scale(this.camState.currentZ, this.camState.currentZ);
    this.ctx.translate(-this.canvas.width/2, -this.canvas.height/2);
    
    // Entity Updates
    const sysTime = performance.now();
    this.cpuChar.update(sysTime); this.playerChar.update(sysTime);
    this.cpuChar.draw(this.ctx); this.playerChar.draw(this.ctx);
    
    // Notes & Lanes Render
    this.notesMgr.updateAndDraw(
        this.ctx, this.canvas.height, currTime, 
        this.logic.diffMod.speedMult, this.cpuChar, this.playerChar, 
        this.logic, this.activeKeys
    );
    
    // End frame
    this.ctx.restore();
    if (this.logic.health <= 0) { this.stop(false); return; }
    
    // Kiểm tra thời lượng Beatmap để End Game
    if (currTime > this.endTime) { this.stop(true); return; }
    
    this.rafId = requestAnimationFrame(this.renderLoop);
  }
}
