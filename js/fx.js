/* ═══════════ FX — 공통 연출 인프라 (P2-0) ═══════════
   컨페티·흔들림·플래시·CRT 파워오프/온·비네트·컷씬 스틸 뷰어
   + 신스 효과음(심박/웅성/환호/휙/스태틱/배트크랙/불협화음/팡파레).
   외부 라이브러리 0 (컨페티 자체 구현, 사운드는 WebAudio 합성 — 파일 없음).
   접근성: 시각 연출은 UI.motionOK() 게이트, 소리는 Sound.sfxOn 게이트를 존중한다. */
const FX = {

  vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} },

  /* ═══ 🎊 컨페티 — canvas 2D 파티클 자체 구현 ═══
     opts: { x, y (0~1 화면 비율, 기본 중앙 상단), count, colors } — 연속 호출 시 같은 캔버스에 누적 */
  _parts: [], _raf: null, _cv: null,
  confetti(opts = {}) {
    if (!UI.motionOK()) return;
    const { x = 0.5, y = 0.45, count = 90,
            colors = ['#ffd43b', '#4dabf7', '#69db7c', '#ff8787', '#b197fc', '#ffa94d'] } = opts;
    let c = this._cv;
    if (!c) {
      c = this._cv = document.createElement('canvas');
      c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:95;';
      document.getElementById('app').appendChild(c);
    }
    if (c.width !== innerWidth || c.height !== innerHeight) { c.width = innerWidth; c.height = innerHeight; }
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = 3.5 + Math.random() * 7;
      this._parts.push({
        x: x * c.width, y: y * c.height,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6.5,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.32,
        color: colors[i % colors.length], life: 80 + Math.random() * 50,
        dieAt: performance.now() + 4500,   // 시간 컷오프 — rAF가 스로틀돼도 재개 시 일괄 정리
      });
    }
    if (!this._raf) this._confettiLoop();
  },
  _confettiLoop() {
    const c = this._cv, ctx = c.getContext('2d');
    const step = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const now = performance.now();
      this._parts = this._parts.filter(p => p.life > 0 && p.y < c.height + 30 && now < p.dieAt);
      for (const p of this._parts) {
        p.vy += 0.22; p.vx *= 0.99;                      // 중력 + 공기 저항
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life / 28);      // 수명 끝에서 페이드
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (this._parts.length) this._raf = requestAnimationFrame(step);
      else { this._raf = null; ctx.clearRect(0, 0, c.width, c.height); }
    };
    this._raf = requestAnimationFrame(step);
  },

  /* ═══ 📳 화면 흔들기 — #app 전체 (strength: 최대 픽셀, 점점 잦아듦) ═══ */
  shake(strength = 8, ms = 400) {
    if (!UI.motionOK()) return;
    const app = document.getElementById('app');
    if (!app.animate) return;
    const f = [];
    for (let i = 0; i < 9; i++) {
      const s = strength * (1 - i / 9);
      f.push({ transform: `translate(${(Math.random() * 2 - 1) * s}px, ${(Math.random() * 2 - 1) * s}px)` });
    }
    f.push({ transform: 'translate(0,0)' });
    app.animate(f, { duration: ms, easing: 'ease-out' });
  },

  /* ═══ ⚡ 전체 화면 플래시 (충격 순간용 — 짧게 번쩍) ═══ */
  flash(color = '#fff', ms = 200) {
    if (!UI.motionOK()) return;
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;inset:0;background:${color};opacity:.85;pointer-events:none;z-index:96;transition:opacity ${ms}ms ease-out;`;
    document.getElementById('app').appendChild(d);
    requestAnimationFrame(() => { d.style.opacity = '0'; });
    setTimeout(() => d.remove(), ms + 100);
  },

  /* ═══ 📺 CRT 파워오프/온 — 브라운관 종료·기동 (4단계 반전 2막 '진짜 꺼짐' ↔ 재부팅 성공) ═══
     crtOff(): 위아래 검은 패널이 닫히고 중앙 라인이 점으로 수축 → 완전 암전.
               스태틱 3연발 뒤 소리까지 뚝 — hold(ms)만큼 정적을 유지하고 암전막을 남긴다.
     blackHold(): 연출 없이 즉시 암전막만 세운다 (장면 전환 가리개). blackRelease()로 제거.
     crtOn(): 암전막 위에서 점 → 라인 → 화면 확장으로 켜지며 심박 1박 — "노아가 다시 돌아온다". */
  _crtHold: null,
  blackHold() {
    if (!this._crtHold) {
      this._crtHold = document.createElement('div');
      this._crtHold.className = 'fx-crt-hold';
      document.getElementById('app').appendChild(this._crtHold);
    }
    return this._crtHold;
  },
  blackRelease() {
    const el = this._crtHold; this._crtHold = null;
    if (el) el.remove();
  },
  async crtOff({ hold = 1500 } = {}) {
    this.staticBurst(3);                       // 지지직 3연발 → 뚝(무음)
    if (UI.motionOK()) {
      const d = document.createElement('div');
      d.className = 'fx-crt off';
      d.innerHTML = '<div class="crt-top"></div><div class="crt-bot"></div><div class="crt-line"></div><div class="crt-black"></div>';
      document.getElementById('app').appendChild(d);
      await UI.wait(850);                      // 수축 → 점 → 소멸
      this.blackHold();                        // 완전 암전 유지막으로 교체
      d.remove();
    } else {
      this.blackHold();
    }
    await UI.wait(hold);                       // 정적 — 교실이 조용해지는 시간
    return this._crtHold;
  },
  async crtOn() {
    this.blackHold();                          // 막이 없었다면 만들어서라도 (안전)
    if (!UI.motionOK()) { this.heartbeat(1); await UI.wait(400); this.blackRelease(); return; }
    const d = document.createElement('div');
    d.className = 'fx-crt on';
    d.innerHTML = '<div class="crt-top"></div><div class="crt-bot"></div><div class="crt-line"></div>';
    document.getElementById('app').appendChild(d);
    this.blackRelease();                       // 검은 패널 2장이 암전을 그대로 이어받는다
    await UI.wait(500);                        // 점 → 라인
    this.heartbeat(1);                         // 💓 화면이 열리는 순간 심박 1박
    await UI.wait(500);
    d.remove();
  },

  /* ═══ 🌑 비네트 — 화면 가장자리를 어둡게 (긴장 연출) on/off ═══ */
  _vig: null,
  vignette(on) {
    if (on) {
      if (!this._vig) {
        this._vig = document.createElement('div');
        this._vig.className = 'fx-vignette';
        document.getElementById('app').appendChild(this._vig);
      }
      const v = this._vig;
      setTimeout(() => v.classList.add('on'), 20);   // rAF는 백그라운드 탭에서 멎음 — setTimeout으로
    } else if (this._vig) {
      const v = this._vig; this._vig = null;
      v.classList.remove('on');
      setTimeout(() => v.remove(), 650);
    }
  },

  /* ═══ 🎬 컷씬 스틸 뷰어 — 결정적 한 컷 (풀블리드 + Ken Burns 느린 줌 + 탭 진행) ═══
     opts: { hold: 최소 표시 ms(성급한 탭 방지, 기본 900), auto: 자동 닫힘 ms, cover: true면 꽉 채움 크롭 }
     이미지 로드 실패 시 조용히 통과 — 연출이 게임 진행을 막지 않는다 */
  cut(src, opts = {}) {
    return new Promise(resolve => {
      const img = new Image();
      let done = false;
      const finish = ov => { if (done) return; done = true; if (ov) UI.close(ov); resolve(); };
      img.onerror = () => finish(null);
      img.onload = () => {
        const ov = UI.overlay(`
          <div class="fx-cut">
            <img src="${src}" alt="" class="${opts.cover ? 'cover' : ''}">
            <div class="fx-cut-tap hidden">▼ 화면을 눌러 계속</div>
          </div>`, 'fx-cut-ov');
        const hold = opts.hold ?? 900;
        const t0 = performance.now();
        setTimeout(() => { const t = ov.querySelector('.fx-cut-tap'); if (t) t.classList.remove('hidden'); }, hold);
        ov.addEventListener('pointerdown', () => { if (performance.now() - t0 >= hold) finish(ov); });
        if (opts.auto) setTimeout(() => finish(ov), opts.auto);
      };
      img.src = src;
    });
  },

  /* ═══ 📼 데이터 학습 미니 연출 — 관찰 게이지가 차오른 뒤 데이터 카드가 노아 DB에 딸깍 저장 ═══
     dataInjector(말 오염)와 같은 색 언어(노랑 카드→파랑 슬롯) = 행동 오염도 같은 시각 언어.
     약 3.3초 자동 진행 (setTimeout 기반 — rAF 스로틀 무관) */
  dataLearn(label, data) {
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="fxdl">
          <div class="fxdl-gauge">
            <span class="fxdl-label">${label}</span>
            <div class="fxdl-bar"><div class="fxdl-fill"></div></div>
          </div>
          <div class="fxdl-card hidden">💾 ${data}</div>
          <div class="fxdl-slot hidden">🧠 노아의 행동 데이터베이스</div>
        </div>`, 'fxdl-ov');
      Sound.tick();
      setTimeout(() => { ov.querySelector('.fxdl-fill').classList.add('on'); }, 60);      // 게이지 차오름 (1.1s)
      setTimeout(() => {                                                                   // 카드 + 슬롯 등장
        ov.querySelector('.fxdl-card').classList.remove('hidden');
        ov.querySelector('.fxdl-slot').classList.remove('hidden');
        Sound.pop();
      }, 1250);
      setTimeout(() => { ov.querySelector('.fxdl-card').classList.add('go'); this.whoosh(); }, 1950);  // 슬롯으로 흡수
      setTimeout(() => {                                                                   // 딸깍 저장
        ov.querySelector('.fxdl-slot').classList.add('saved');
        ov.querySelector('.fxdl-slot').textContent = '🧠 저장 완료 — 행동 데이터 1건';
        Sound.tick(); Sound.chime();
      }, 2650);
      setTimeout(() => { UI.close(ov); resolve(); }, 3400);
    });
  },

  /* ═══ 신스 효과음 (Sound.tone / AudioContext 재사용 — Sound.sfxOn 게이트) ═══ */

  /* 필터 노이즈 한 조각 (웅성거림·바람 소리의 재료) */
  _noise(dur, { type = 'bandpass', freq = 800, q = 1, vol = 0.2, when = 0 } = {}) {
    if (!Sound.sfxOn) return;
    const ac = Sound._ac(); if (!ac) return;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, ac.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start(ac.currentTime + when);
  },

  /* 💓 심박 — 쿵-쿵 × beats, 간격이 점점 짧아짐(긴장 가속). 반환: 총 길이(ms) */
  heartbeat(beats = 5, gap0 = 0.72, accel = 0.85) {
    let t = 0, gap = gap0;
    for (let i = 0; i < beats; i++) {
      Sound.tone(55, 0.09, 'sine', 0.5, t);
      Sound.tone(44, 0.13, 'sine', 0.42, t + 0.14);
      t += gap; gap *= accel;
    }
    return Math.round(t * 1000);
  },

  /* 🗣 웅성거림 — 저역 노이즈 파동 (아이들 동요) */
  murmur() {
    for (let i = 0; i < 5; i++)
      this._noise(0.38, { freq: 280 + Math.random() * 320, q: 2.2, vol: 0.1, when: i * 0.27 });
  },

  /* 💨 휙 — 카드 흡수·이동 */
  whoosh() { this._noise(0.45, { type: 'lowpass', freq: 1300, vol: 0.25 }); },

  /* 📺 지지직 — 스태틱 노이즈 버스트 (CRT 종료 직전, n연발 뒤 뚝 끊긴다) */
  staticBurst(n = 3) {
    for (let i = 0; i < n; i++)
      this._noise(0.13, { type: 'highpass', freq: 2200, q: 0.8, vol: 0.28, when: i * 0.2 });
  },

  /* 🏏 딱! — 배트 크랙 (티볼 타격 순간) */
  batCrack() {
    this._noise(0.08, { type: 'highpass', freq: 2000, q: 1.1, vol: 0.32 });
    Sound.tone(190, 0.1, 'square', 0.2);
    Sound.tone(95, 0.16, 'sine', 0.28, 0.015);
  },

  /* 🎉 와아! — 환호 (murmur의 밝은 변형: 높은 대역 노이즈 파동 + 상승 톤 2개) */
  crowd() {
    for (let i = 0; i < 6; i++)
      this._noise(0.34, { freq: 600 + Math.random() * 600, q: 1.6, vol: 0.12, when: i * 0.13 });
    Sound.tone(523, 0.18, 'triangle', 0.14, 0.15);
    Sound.tone(659, 0.22, 'triangle', 0.12, 0.3);
  },

  /* ⚠ 불협화음 — 데이터 오염 순간 */
  sting() {
    Sound.tone(220, 0.55, 'sawtooth', 0.11);
    Sound.tone(233, 0.55, 'sawtooth', 0.11);
    Sound.tone(466, 0.4, 'sawtooth', 0.06, 0.06);
  },

  /* 🎉 팡파레 — 교정 성공·하이파이브 (Sound.win보다 화려한 상승) */
  cheer() {
    [523, 659, 784, 988, 1047].forEach((f, i) => Sound.tone(f, 0.18, 'triangle', 0.16, i * 0.09));
    Sound.tone(1319, 0.42, 'triangle', 0.14, 0.5);
  },
};
