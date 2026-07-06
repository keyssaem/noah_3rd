/* ═══════════ UI — 대화창/선택지/퀘스트/오버레이/터치 컨트롤 ═══════════ */
const UI = {
  els: {},
  _dlgResolve: null,
  _typing: false,
  _fullText: '',
  joyVec: { x: 0, y: 0 },

  init() {
    const $ = id => document.getElementById(id);
    this.els = {
      menu: $('menu-screen'), charScreen: $('char-screen'), hud: $('hud'),
      questBanner: $('quest-banner'), questText: $('quest-text'),
      nbNum: $('nb-num'), nbBtn: $('notebook-btn'),
      bondGauge: $('bond-gauge'), bondLabel: $('bond-label'),
      bondFill: $('bond-fill'), bondPct: $('bond-pct'),
      prompt: $('interact-prompt'), promptLabel: $('interact-label'),
      dlgBox: $('dialogue-box'), dlgPortrait: $('dlg-portrait'),
      dlgSpeaker: $('dlg-speaker'), dlgText: $('dlg-text'),
      overlayRoot: $('overlay-root'), fade: $('fade'), glitch: $('glitch-layer'),
    };
    this.els.dlgBox.addEventListener('pointerdown', e => { e.stopPropagation(); this.advance(); });
    window.addEventListener('keydown', e => {
      if ((e.code === 'Space' || e.code === 'Enter') && this._dlgResolve) { e.preventDefault(); this.advance(); }
    });
    if ('ontouchstart' in window) document.body.classList.add('touch');
    this.els.nbBtn.addEventListener('click', () => { Sound.pop(); Notebook.open(); });
    this.initJoystick();
  },

  /* ───────── 화면 전환 ───────── */
  show(el) { el.classList.remove('hidden'); },
  hide(el) { el.classList.add('hidden'); },
  async fadeOut() { this.els.fade.classList.add('on'); await this.wait(520); },
  async fadeIn() { this.els.fade.classList.remove('on'); await this.wait(520); },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },

  /* ───────── 대화 시스템 ───────── */
  dialogue(lines) {
    return new Promise(async resolve => {
      this.show(this.els.dlgBox);
      Player.enabled = false;
      for (const line of lines) {
        await this.showLine(line);
      }
      this.hide(this.els.dlgBox);
      Player.enabled = true;
      resolve();
    });
  },

  showLine(line) {
    return new Promise(resolve => {
      let speaker = line.speaker;
      let portrait = DATA.portraits[speaker] || '💬';
      if (speaker === '노아' && line.emotion) portrait = DATA.noahEmotion[line.emotion] || '🤖';
      if (speaker === '나' || speaker === '나(독백)') {
        portrait = speaker === '나(독백)' ? '💭' : (State.get('gender') === 'f' ? '👧' : '👦');
        speaker = speaker === '나' ? State.get('name') : `${State.get('name')} (마음의 소리)`;
      }
      this.els.dlgPortrait.textContent = portrait;
      this.els.dlgSpeaker.textContent = speaker;
      this._fullText = State.fill(line.text);
      this._typing = true;
      this._dlgResolve = resolve;
      this.els.dlgText.textContent = '';
      let i = 0;
      const tick = () => {
        if (!this._typing) return;
        this.els.dlgText.textContent = this._fullText.slice(0, ++i);
        if (i < this._fullText.length) this._typeTimer = setTimeout(tick, 26);
        else this._typing = false;
      };
      tick();
    });
  },

  advance() {
    if (this._typing) {           // 타이핑 중이면 전체 표시
      this._typing = false;
      clearTimeout(this._typeTimer);
      this.els.dlgText.textContent = this._fullText;
    } else if (this._dlgResolve) { // 다음 대사로
      const r = this._dlgResolve;
      this._dlgResolve = null;
      r();
    }
  },

  /* ───────── 퀘스트 배너 ───────── */
  quest(text) {
    this.els.questText.textContent = '퀘스트: ' + text;
    this.show(this.els.questBanner);
    this.els.questBanner.style.animation = 'none';
    void this.els.questBanner.offsetWidth;
    this.els.questBanner.style.animation = '';
    Sound.chime();
  },
  clearQuest() { this.hide(this.els.questBanner); },

  /* 📔 도덕 수첩 카운터 (이번 모험 기준) */
  updateNotebook() {
    this.els.nbNum.textContent = DATA.moralItems.filter(i => State.has(i.id)).length;
  },

  /* 💕/💙 관계 게이지 — 3단계: 친밀도(핑크) / 5단계: 존중(파랑) */
  setBond(type, pct) {
    const g = this.els.bondGauge;
    const prev = State.get('bondType') === type ? (State.get('bond') || 0) : null;
    State.set('bond', pct);
    State.set('bondType', type);
    g.classList.remove('hidden');
    g.classList.remove('betrayed');
    g.classList.toggle('respect', type === 'respect');
    this.els.bondLabel.textContent = type === 'respect' ? '💙 존중' : '💕 친밀도';
    this.els.bondFill.style.width = pct + '%';
    this.els.bondPct.textContent = pct + '%';
    if (prev !== null && pct > prev) {          // 상승 연출 (+n%)
      const b = document.createElement('div');
      b.className = 'bond-bump';
      b.textContent = `+${pct - prev}%`;
      g.appendChild(b);
      setTimeout(() => b.remove(), 1600);
      Sound.chime();
    }
  },
  hideBond() { this.els.bondGauge.classList.add('hidden'); },

  /* 💔 게이지의 배신 — 4단계 반전에서 친밀도의 정체가 드러남 */
  bondBetray() {
    const g = this.els.bondGauge;
    g.classList.remove('hidden', 'respect');
    g.classList.add('betrayed');
    this.els.bondLabel.textContent = '🔧 도구화';
    this.els.bondFill.style.width = '100%';
    this.els.bondPct.textContent = '100%';
  },

  setPrompt(label) {
    if (label) { this.els.promptLabel.textContent = label; this.show(this.els.prompt); }
    else this.hide(this.els.prompt);
  },

  /* ───────── 오버레이 ───────── */
  overlay(html, cls = '') {
    const ov = document.createElement('div');
    ov.className = 'ov ' + cls;
    ov.innerHTML = html;
    this.els.overlayRoot.appendChild(ov);
    return ov;
  },
  close(ov) { ov.remove(); },

  /* 선택지 */
  choice(title, options, sub = '') {
    return new Promise(resolve => {
      const ov = this.overlay(`
        <div class="ov-panel">
          <h3>${title}</h3>
          ${sub ? `<p class="ov-sub">${sub}</p>` : ''}
          <div class="ov-choices"></div>
        </div>`);
      const box = ov.querySelector('.ov-choices');
      options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'choice-btn';
        b.textContent = opt.label !== undefined ? opt.label : opt;
        b.onclick = () => { Sound.pop(); this.close(ov); resolve(opt.value !== undefined ? opt.value : i); };
        box.appendChild(b);
      });
    });
  },

  /* 텍스트 입력 */
  textInput(title, placeholder, sub = '', multiline = false) {
    return new Promise(resolve => {
      const ov = this.overlay(`
        <div class="ov-panel">
          <h3>${title}</h3>
          ${sub ? `<p class="ov-sub">${sub}</p>` : ''}
          ${multiline ? `<textarea class="ov-input" placeholder="${placeholder}"></textarea>`
                      : `<input class="ov-input" type="text" maxlength="30" placeholder="${placeholder}">`}
          <div class="ov-choices"><button class="choice-btn ok">✅ 결정했어요!</button></div>
        </div>`);
      const input = ov.querySelector('.ov-input');
      const btn = ov.querySelector('.ok');
      setTimeout(() => input.focus(), 100);
      btn.onclick = () => {
        const v = input.value.trim();
        if (!v) { input.style.borderColor = '#fa5252'; input.placeholder = '한 글자 이상 적어주세요!'; return; }
        Sound.pop(); this.close(ov); resolve(v);
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !multiline) btn.click(); });
    });
  },

  /* O/X 질문 (수미상관) */
  oxQuestion(question, sub = '') {
    return new Promise(resolve => {
      const ov = this.overlay(`
        <div class="ov-panel">
          <h3>${question}</h3>
          ${sub ? `<p class="ov-sub">${sub}</p>` : ''}
          <div class="ox-row">
            <button class="ox-btn o">O</button>
            <button class="ox-btn x">X</button>
          </div>
        </div>`);
      ov.querySelector('.o').onclick = () => { Sound.pop(); this.close(ov); resolve('O'); };
      ov.querySelector('.x').onclick = () => { Sound.pop(); this.close(ov); resolve('X'); };
    });
  },

  /* 큰 글자 연출 — 한 줄씩 탭해서 진행 */
  bigText(lines, opts = {}) {
    return new Promise(resolve => {
      let idx = 0;
      const ov = this.overlay(`
        <div class="bigtext-line"></div>
        <div class="bigtext-tap">▼ 화면을 눌러 계속하기</div>`, 'bigtext-ov');
      if (opts.bg) ov.style.background = opts.bg;
      const lineEl = ov.querySelector('.bigtext-line');
      const showNext = () => {
        if (idx >= lines.length) { this.close(ov); resolve(); return; }
        lineEl.style.animation = 'none';
        void lineEl.offsetWidth;
        lineEl.style.animation = '';
        // **텍스트** → 노란 강조, \n → 줄바꿈 (도덕 키워드 강조용)
        const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        lineEl.innerHTML = esc(State.fill(lines[idx++]))
          .replace(/\*\*(.+?)\*\*/g, '<span class="big-hl">$1</span>')
          .replace(/\n/g, '<br>');
        Sound.chime();
      };
      ov.addEventListener('pointerdown', showNext);
      showNext();
    });
  },

  /* 하트 파티클 */
  hearts(n = 8) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const h = document.createElement('div');
        h.className = 'heart-float';
        h.textContent = ['💙', '💛', '💖', '✨'][i % 4];
        h.style.left = (30 + Math.random() * 40) + '%';
        h.style.top = (40 + Math.random() * 30) + '%';
        document.getElementById('app').appendChild(h);
        setTimeout(() => h.remove(), 1700);
      }, i * 140);
    }
  },

  /* ───────── 터치 조이스틱 ───────── */
  initJoystick() {
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    let active = false, cx = 0, cy = 0, pid = null;
    const R = 48;

    zone.addEventListener('pointerdown', e => {
      active = true; pid = e.pointerId;
      cx = e.clientX; cy = e.clientY;
      base.style.display = 'block';
      base.style.left = (cx - zone.getBoundingClientRect().left - 65) + 'px';
      base.style.top = (cy - zone.getBoundingClientRect().top - 65) + 'px';
      zone.setPointerCapture(pid);
    });
    zone.addEventListener('pointermove', e => {
      if (!active || e.pointerId !== pid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joyVec.x = dx / R; this.joyVec.y = dy / R;
    });
    const end = e => {
      if (e.pointerId !== pid) return;
      active = false; base.style.display = 'none';
      knob.style.transform = 'translate(-50%,-50%)';
      this.joyVec.x = 0; this.joyVec.y = 0;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const bJump = document.getElementById('btn-touch-jump');
    const bF = document.getElementById('btn-touch-f');
    bJump.addEventListener('pointerdown', e => { e.preventDefault(); Player.tryJump(); });
    bF.addEventListener('pointerdown', e => { e.preventDefault(); this._dlgResolve || this._typing ? this.advance() : Player.tryInteract(); });
  },
};

/* ═══════════ Sound — WebAudio 간단 효과음 ═══════════ */
const Sound = {
  ctx: null,
  _ac() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.15, when = 0) {
    const ac = this._ac(); if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + when); o.stop(ac.currentTime + when + dur + 0.05);
  },
  pop() { this.tone(660, 0.08, 'triangle', 0.2); },
  chime() { this.tone(880, 0.15, 'sine', 0.15); this.tone(1320, 0.2, 'sine', 0.1, 0.1); },
  coin() { this.tone(988, 0.08, 'square', 0.12); this.tone(1319, 0.25, 'square', 0.12, 0.08); },
  jump() { this.tone(300, 0.15, 'triangle', 0.12); },
  error() { for (let i = 0; i < 6; i++) this.tone(120 + Math.random() * 300, 0.1, 'sawtooth', 0.2, i * 0.11); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.18, i * 0.13)); },
};
