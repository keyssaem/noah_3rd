/* ═══════════ UI — 대화창/선택지/퀘스트/오버레이/터치 컨트롤 ═══════════ */
const UI = {
  els: {},
  _dlgResolve: null,
  _typing: false,
  _fullText: '',
  _must: false,        // 📖 중요 대사 읽기 게이트 (must: true 라인)
  _mustReady: true,    //     체류시간 경과 후에만 다음 진행 허용
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
      dlgSpeaker: $('dlg-speaker'), dlgText: $('dlg-text'), dlgNext: $('dlg-next'),
      homeBtn: $('home-btn'),
      overlayRoot: $('overlay-root'), fade: $('fade'), glitch: $('glitch-layer'),
      webglError: $('webgl-error'), webglErrorMessage: $('webgl-error-message'),
    };
    this.els.dlgBox.addEventListener('pointerdown', e => { e.stopPropagation(); this.advance(); });
    window.addEventListener('keydown', e => {
      if ((e.code === 'Space' || e.code === 'Enter') && this._dlgResolve) { e.preventDefault(); this.advance(); }
    });
    if ('ontouchstart' in window) document.body.classList.add('touch');
    this.els.nbBtn.addEventListener('click', () => { Sound.pop(); DevMode.handleClick(); });
    // ⚙️ 설정 패널 열기
    this.els.homeBtn.addEventListener('click', () => this.openSettings());
    $('webgl-reload').addEventListener('click', () => location.reload());
    window.addEventListener('app:webgl-lost', event => {
      if (event.detail.canvas === document.getElementById('game-canvas')) {
        this.showWebGLError('그래픽 장치 연결이 끊겼습니다. 잠시 기다리거나 새로고침해 주세요.');
      }
    });
    window.addEventListener('app:webgl-restored', event => {
      if (event.detail.canvas === document.getElementById('game-canvas')) this.hideWebGLError();
    });
    this.initJoystick();
  },

  /* ───────── 화면 전환 ───────── */
  show(el) { el.classList.remove('hidden'); },
  hide(el) { el.classList.add('hidden'); },
  async fadeOut() { this.els.fade.classList.add('on'); await this.wait(520); },
  async fadeIn() { this.els.fade.classList.remove('on'); await this.wait(520); },
  wait(ms) { return new Promise(r => setTimeout(r, ms)); },
  showWebGLError(message) {
    this.els.webglErrorMessage.textContent = message;
    this.show(this.els.webglError);
  },
  hideWebGLError() { this.hide(this.els.webglError); },

  /* ───────── 대화 시스템 ───────── */
  dialogue(lines) {
    return new Promise(async resolve => {
      this.show(this.els.dlgBox);
      // ⚠ 무조건 true로 되돌리지 않고 이전 상태 복원 — 컷씬(잠금) 중간의 대사가
      //   플레이어 이동/F키를 되살려 클로즈업·팝업 뒤로 조작되는 버그 방지
      const wasEnabled = Player.enabled;
      Player.enabled = false;
      for (const line of lines) {
        await this.showLine(line);
      }
      Settings.stopSpeak();                    // 🗣️ 대화 종료 시 읽기 중단
      this.hide(this.els.dlgBox);
      Player.enabled = wasEnabled;
      resolve();
    });
  },

  /* 🎨 리치 텍스트 — 대사 마크업을 세그먼트 [{text, cls}]로 파싱.
     **강조** → hl-blue(파랑) · <b>..</b> → hl-bold · <꺾쇠> → hl-key(노랑, 꺾쇠 문자는 그대로 표시)
     HTML 문자열을 만들지 않고 span+textContent로 렌더하므로 이스케이프·태그 깨짐이 원천 차단됨 */
  rich(text) {
    const segs = [];
    const push = (t, cls) => { if (t) segs.push({ text: t, cls }); };
    const re = /\*\*(.+?)\*\*|<b>([^<]*?)<\/b>|<([^<>\n]+)>/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      push(text.slice(last, m.index), null);
      if (m[1] !== undefined) push(m[1], 'hl-blue');
      else if (m[2] !== undefined) push(m[2], 'hl-bold');
      else push('<' + m[3] + '>', 'hl-key');
      last = m.index + m[0].length;
    }
    push(text.slice(last), null);
    return segs;
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
      Settings.speak(this._fullText);          // 🗣️ 대사 읽어주기 (필터가 * < > 제거 — 마크업 안 읽음)
      this._typing = true;
      this._must = !!line.must;
      this._mustReady = !this._must;
      clearTimeout(this._mustTimer);
      this.hide(this.els.dlgNext);
      this._dlgResolve = resolve;
      // 세그먼트 타이핑 준비 — 강조 span을 미리 만들어 두고 글자를 하나씩 채운다 (태그 잘림 없음)
      const box = this.els.dlgText;
      box.textContent = '';
      this._segs = this.rich(this._fullText);
      this._spans = this._segs.map(s => {
        const sp = document.createElement('span');
        if (s.cls) sp.className = s.cls;
        box.appendChild(sp);
        return sp;
      });
      this._flat = [];                          // [세그번호, 글자] — Array.from으로 이모지(서로게이트 쌍) 안전
      this._segs.forEach((s, si) => Array.from(s.text).forEach(ch => this._flat.push([si, ch])));
      this._plainLen = this._flat.length;       // 마크업 기호를 뺀 순수 글자 수 (must 체류시간용)
      let i = 0;
      const tick = () => {
        if (!this._typing) return;
        const f = this._flat[i++];
        this._spans[f[0]].textContent += f[1];
        if (i < this._flat.length) this._typeTimer = setTimeout(tick, 26);
        else { this._typing = false; this._onTypeDone(); }
      };
      if (this._flat.length) tick();
      else { this._typing = false; this._onTypeDone(); }
    });
  },

  /* 타이핑 스킵 — 남은 세그먼트를 한 번에 채움 */
  _typeFill() {
    (this._segs || []).forEach((s, si) => { this._spans[si].textContent = s.text; });
  },

  /* 타이핑 완료 → 일반: 즉시 ▼ / 중요(must): 글자수 비례 체류시간 후 ▼ */
  _onTypeDone() {
    if (this._must) {
      const dwell = Math.max(800, (this._plainLen || this._fullText.length) * 40);
      this._mustTimer = setTimeout(() => {
        this._mustReady = true;
        this.show(this.els.dlgNext);
      }, dwell);
    } else {
      this.show(this.els.dlgNext);
    }
  },

  advance() {
    if (this._typing) {           // 타이핑 중이면 전체 표시
      if (this._must) return;     // 📖 중요 대사: 타이핑 스킵 불가
      this._typing = false;
      clearTimeout(this._typeTimer);
      this._typeFill();
      this._onTypeDone();
    } else if (this._dlgResolve) { // 다음 대사로
      if (!this._mustReady) return; // 📖 체류시간 전 클릭 무시
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

  /* 모션 접근성 헬퍼 */
  motionOK() { return !window.matchMedia('(prefers-reduced-motion: reduce)').matches; },

  /* ⚙️ 설정 패널 — 효과음/배경음악/대사읽기/글자크기/처음부터 다시 시작 */
  openSettings() {
    Sound.pop();
    const ttsOk = Settings.ttsSupported();
    const ov = this.overlay(`
      <div class="ov-panel settings-panel">
        <h3 class="mini-title">⚙️ 설정</h3>
        <div class="set-row"><span class="set-label">🔊 효과음</span><button class="set-toggle" data-k="sfx"></button></div>
        <div class="set-row"><span class="set-label">🎵 배경 음악</span><button class="set-toggle" data-k="bgm"></button></div>
        <div class="set-row"><span class="set-label">🗣️ 대사 읽어주기
          <small class="set-note">${ttsOk ? '지원 기기에서만 작동해요' : '이 기기는 지원하지 않아요'}</small></span>
          <button class="set-toggle" data-k="tts" ${ttsOk ? '' : 'disabled'}></button></div>
        <div class="set-row"><span class="set-label">🔠 글자 크기</span>
          <div class="set-seg">
            <button data-f="normal">보통</button><button data-f="large">크게</button><button data-f="xlarge">아주 크게</button>
          </div></div>
        <div class="ov-choices">
          <button class="choice-btn set-restart" style="background:#fff4e6; border-color:#ffa94d; color:#e8590c;">🔄 처음부터 다시 시작</button>
          <button class="choice-btn set-close">✅ 닫기</button>
        </div>
      </div>`);
    const render = () => {
      ov.querySelectorAll('.set-toggle').forEach(b => {
        const on = !!Settings.data[b.dataset.k];
        b.textContent = on ? 'ON' : 'OFF';
        b.classList.toggle('on', on);
      });
      ov.querySelectorAll('.set-seg button').forEach(b =>
        b.classList.toggle('on', Settings.data.font === b.dataset.f));
    };
    ov.querySelectorAll('.set-toggle').forEach(b => b.onclick = () => {
      if (b.disabled) return;
      const k = b.dataset.k;
      Settings.data[k] = !Settings.data[k];
      Settings.save(); Settings.apply();
      if (k === 'bgm' && Settings.data.bgm && Sound._lastSrc) Sound.playBGM(Sound._lastSrc);   // 즉시 재개
      if (k === 'sfx' && Settings.data.sfx) Sound.pop();          // 켤 때 미리듣기
      if (k === 'tts' && Settings.data.tts) Settings.speak('안녕하세요! 대사를 읽어드릴게요.');
      render();
    });
    ov.querySelectorAll('.set-seg button').forEach(b => b.onclick = () => {
      Settings.data.font = b.dataset.f; Settings.save(); Settings.apply(); Sound.pop(); render();
    });
    ov.querySelector('.set-close').onclick = () => { Sound.pop(); this.close(ov); };
    ov.querySelector('.set-restart').onclick = async () => {
      const how = await this.choice('🔄 처음부터 다시 시작할까요?', [
        { label: '📔 도덕 수첩 기록은 남기고 다시 시작', value: 'keep' },
        { label: '🗑️ 전부 지우고 완전히 처음부터', value: 'wipe' },
        { label: '↩️ 취소', value: null },
      ], '지금까지의 진행은 사라져요.');
      if (!how) return;
      try {
        localStorage.removeItem('noah_save');
        if (how === 'wipe') localStorage.removeItem('noah_notebook_all');
      } catch (e) {}
      location.reload();
    };
    render();
  },

  /* 🎮 집에서 시작 시 조작 안내 팝업 (첫 플레이 사용성 — PC/태블릿 분기) */
  tutorial() {
    return new Promise(resolve => {
      const touch = document.body.classList.contains('touch');
      const rows = [
        { icon: '🕹️', title: '이동하기',       pc: 'W A S D · 방향키',     tab: '왼쪽 아래 <b>조이스틱</b>' },
        { icon: '💬', title: '상호작용 · 대화',  pc: '<b>F</b> 키',           tab: '오른쪽 아래 <b>F</b> 버튼' },
        { icon: '⬆️', title: '점프하기',        pc: '<b>Space</b> (스페이스바)', tab: '오른쪽 아래 <b>⬆</b> 버튼' },
        { icon: '📔', title: '⭐도덕 수첩 확인',   pc: '왼쪽 위 <b>📔</b> 버튼',  tab: '왼쪽 위 <b>📔</b> 버튼' },
        { icon: '⚙️', title: '설정 확인',        pc: '오른쪽 위 <b>⚙️</b> 버튼', tab: '오른쪽 위 <b>⚙️</b> 버튼' },
      ];
      const ov = this.overlay(`
        <div class="ov-panel tuto-panel">
          <h3 class="mini-title">🎮 조작 방법 안내</h3>
          <p class="ov-sub">노아를 만나러 가기 전에, 조작법을 익혀 볼까요? (${touch ? '태블릿' : 'PC'})</p>
          <div class="tuto-grid">
            ${rows.map(r => `
              <div class="tuto-item">
                <div class="tuto-ico">${r.icon}</div>
                <div class="tuto-txt"><b>${r.title}</b><span>${touch ? r.tab : r.pc}</span></div>
              </div>`).join('')}
          </div>
          <div class="ov-choices"><button class="choice-btn tuto-ok">🚀 알겠어요! 시작할게요</button></div>
        </div>`);
      ov.querySelector('.tuto-ok').onclick = () => { Sound.win(); this.close(ov); resolve(); };
    });
  },

  /* O/X 질문 (수미상관) — 선택하면 3D 동전이 뒤집혀 내 대답 면으로 착지.
     prev(1회차 대답)를 주면 옛 동전을 나란히 놓아 생각의 변화를 비교 */
  oxQuestion(question, sub = '', prev = null) {
    return new Promise(resolve => {
      const face = a => a === 'O'
        ? '<div class="coin-face o">O</div><div class="coin-face x back">X</div>'
        : '<div class="coin-face x">X</div><div class="coin-face o back">O</div>';
      const ov = this.overlay(`
        <div class="ov-panel">
          <h3>${question}</h3>
          ${sub ? `<p class="ov-sub">${sub}</p>` : ''}
          <div class="ox-row">
            <button class="ox-btn o">O</button>
            <button class="ox-btn x">X</button>
          </div>
          <div class="coin-area"></div>
        </div>`, 'fx3d');
      const pick = async ans => {
        Sound.pop();
        ov.querySelector('.ox-row').remove();
        const area = ov.querySelector('.coin-area');
        area.innerHTML = `
          <div class="coin-stage">
            ${prev ? `<div class="coin-slot prev"><div class="coin">${face(prev)}</div>
                        <p class="coin-label">처음 나의 대답</p></div>` : ''}
            <div class="coin-slot now"><div class="coin flip">${face(ans)}</div>
              <p class="coin-label">${prev ? '지금 나의 대답' : '나의 대답'}</p></div>
          </div>`;
        Sound.coin();
        await this.wait(this.motionOK() ? 1550 : 400);
        Sound.chime();
        if (prev) {
          area.insertAdjacentHTML('beforeend', `
            <p class="coin-verdict">${prev === ans
              ? '모험이 끝난 지금도, 처음과 같은 마음이네요.'
              : '모험을 지나며, 생각이 달라졌네요!'}<br>어느 쪽이든 소중한 나의 대답이에요.</p>
            <div class="ov-choices"><button class="choice-btn ok">내 마음을 확인했어요!</button></div>`);
          area.querySelector('.ok').onclick = () => { Sound.pop(); this.close(ov); resolve(ans); };
        } else {
          await this.wait(650);
          this.close(ov);
          resolve(ans);
        }
      };
      ov.querySelector('.o').onclick = () => pick('O');
      ov.querySelector('.x').onclick = () => pick('X');
    });
  },


  /* 큰 글자 연출 — 한 줄씩 탭해서 진행 (opts.must: 읽기 게이트 — 체류시간 전 탭 무시) */
  bigText(lines, opts = {}) {
    return new Promise(resolve => {
      let idx = 0;
      let readyAt = 0;
      const ov = this.overlay(`
        <div class="bigtext-line"></div>
        <div class="bigtext-tap">▼ 화면을 눌러 계속하기</div>`, 'bigtext-ov');
      if (opts.bg) ov.style.background = opts.bg;
      const lineEl = ov.querySelector('.bigtext-line');
      const tapEl = ov.querySelector('.bigtext-tap');
      const showNext = () => {
        if (idx >= lines.length) { this.close(ov); resolve(); return; }
        lineEl.style.animation = 'none';
        void lineEl.offsetWidth;
        lineEl.style.animation = '';
        // **텍스트** → 노란 강조, <꺾쇠> → 파란 강조(꺾쇠 문자 유지), \n → 줄바꿈 (도덕 키워드 강조용)
        const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const plain = State.fill(lines[idx++]);
        lineEl.innerHTML = esc(plain)
          .replace(/\*\*(.+?)\*\*/g, '<span class="big-hl">$1</span>')
          .replace(/&lt;(.+?)&gt;/g, '<span class="big-key">&lt;$1&gt;</span>')
          .replace(/\n/g, '<br>');
        Sound.chime();
        if (opts.must) {   // 📖 중요 연출: 글자수 비례 체류시간 후에만 다음으로
          const dwell = Math.max(1500, plain.replace(/\*\*/g, '').length * 60);
          readyAt = performance.now() + dwell;
          tapEl.classList.add('hidden');
          setTimeout(() => tapEl.classList.remove('hidden'), dwell);
        }
      };
      ov.addEventListener('pointerdown', () => {
        if (opts.must && performance.now() < readyAt) return;
        showNext();
      });
      showNext();
    });
  },

  /* 🎬 컷씬 영상 재생 — 인트로/복도 워킹/교수님 회상 공용
     opts.skip: 건너뛰기 버튼 표시 / opts.skipDelay: 버튼이 나타나기까지 대기(ms, 기본 0=즉시)
     재생 불가 환경(자동재생 차단 등)에서는 자동으로 넘어감 */
  playVideo(src, opts = {}) {
    return new Promise(resolve => {
      const ov = this.overlay(`
        <video class="cine-video" playsinline preload="auto"></video>
        <div class="cine-loading">영상을 불러오는 중...</div>
        ${opts.skip ? '<button class="cine-skip hidden">건너뛰기 ▶▶</button>' : ''}`, 'cine-ov');
      const v = ov.querySelector('video');
      const loading = ov.querySelector('.cine-loading');
      let done = false, guard = null, retryCleanup = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (guard) clearTimeout(guard);
        if (retryCleanup) retryCleanup();
        try { v.pause(); } catch (e) {}
        this.close(ov);
        resolve();
      };
      v.addEventListener('ended', finish);
      v.addEventListener('error', finish);
      v.addEventListener('playing', () => loading.classList.add('hidden'));
      if (opts.skip) {
        const skipBtn = ov.querySelector('.cine-skip');
        skipBtn.onclick = () => { Sound.pop(); finish(); };
        setTimeout(() => { if (!done) skipBtn.classList.remove('hidden'); }, opts.skipDelay || 0);
      }
      v.src = src;
      // 소리와 함께 재생 시도 — 자동재생이 막히면 첫 사용자 상호작용(클릭/터치/키) 때 재생
      v.play().catch(() => {
        loading.textContent = '화면을 한 번 눌러 주세요 ▶';
        const evs = ['pointerdown', 'keydown', 'touchstart'];
        // ⚠ once 제거 — 첫 탭의 play()가 실패해도(태블릿 잦음) 성공할 때까지 리스너 유지
        const retry = () => {
          if (done) return;
          v.play().then(() => { if (retryCleanup) retryCleanup(); }).catch(() => {});
        };
        retryCleanup = () => { evs.forEach(ev => document.removeEventListener(ev, retry)); retryCleanup = null; };
        evs.forEach(ev => document.addEventListener(ev, retry));
      });
      // 로드 실패 안전장치 — 느린 태블릿에서 큰 인트로가 로드 중이면 스킵하지 않도록 상향(45s) + 조건 완화(readyState<1=아예 못 받음)
      guard = setTimeout(() => { if (!done && v.readyState < 1) finish(); }, 45000);
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

    // 조이스틱은 왼쪽 아래에 항상 고정 표시 (CSS로 위치 고정) — 베이스 중심을 기준으로 knob만 이동
    const applyKnob = (clientX, clientY) => {
      let dx = clientX - cx, dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joyVec.x = dx / R; this.joyVec.y = dy / R;
    };
    zone.addEventListener('pointerdown', e => {
      active = true; pid = e.pointerId;
      const br = base.getBoundingClientRect();
      cx = br.left + br.width / 2; cy = br.top + br.height / 2;   // 고정 베이스 중심 기준
      base.classList.add('active');
      zone.setPointerCapture(pid);
      applyKnob(e.clientX, e.clientY);                            // 누른 즉시 방향 반영
    });
    zone.addEventListener('pointermove', e => {
      if (!active || e.pointerId !== pid) return;
      applyKnob(e.clientX, e.clientY);
    });
    const end = e => {
      if (e.pointerId !== pid) return;
      active = false; base.classList.remove('active');
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
  sfxOn: true,          // ⚙️ 설정: 효과음 on/off
  bgmOn: true,          // ⚙️ 설정: 배경음악 on/off
  _lastSrc: null,       // 마지막으로 요청된 BGM (토글 재개용)
  _ac() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.15, when = 0) {
    if (!this.sfxOn) return;                 // ⚙️ 효과음 꺼짐
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
  glass() { for (let i = 0; i < 4; i++) this.tone(2200 + Math.random() * 1800, 0.06, 'sawtooth', 0.12, i * 0.04); this.tone(180, 0.18, 'square', 0.15, 0.1); },
  tick() { this.tone(1400, 0.04, 'square', 0.08); },

  /* 🎵 배경음악 — <audio> 엘리먼트 기반 (WebAudio 톤과 별개, 루프 재생)
     자동재생이 차단되면 첫 사용자 상호작용(클릭/터치/키) 시 처음부터 재생 */
  bgm: null,
  playBGM(src, opts = {}) {
    this._lastSrc = src;
    this.stopBGM();
    if (!this.bgmOn) return;                 // ⚙️ 배경음악 꺼짐 (토글 시 _lastSrc로 재개)
    const a = new Audio(src);
    a.loop = opts.loop !== false;
    a.volume = opts.volume ?? 0.35;
    this.bgm = a;
    const tryPlay = () => a.play().catch(() => {
      const retry = () => { a.currentTime = 0; a.play().catch(() => {}); };
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, retry, { once: true }));
    });
    tryPlay();
  },
  stopBGM() {
    if (this.bgm) { this.bgm.pause(); this.bgm = null; }
  },
  fadeOutBGM(ms = 700) {
    this._lastSrc = null;                    // 씬이 의도적으로 음악을 끝냄 → 토글 재개 대상에서 제외
    const a = this.bgm;
    if (!a) return;
    const startVol = a.volume;
    const t0 = performance.now();
    // setInterval 사용 — 탭이 백그라운드로 전환돼도(rAF 완전 정지 가능) 페이드가 끝까지 진행되도록
    const iv = setInterval(() => {
      const t = Math.min(1, (performance.now() - t0) / ms);
      a.volume = startVol * (1 - t);
      if (t >= 1) {
        clearInterval(iv);
        a.pause();
        if (this.bgm === a) this.bgm = null;
      }
    }, 40);
  },
};

/* ═══════════ ⚙️ Settings — 효과음·BGM·대사읽기(TTS)·글자크기 (localStorage 유지) ═══════════ */
const Settings = {
  data: { sfx: true, bgm: true, tts: false, font: 'normal' },   // font: normal | large | xlarge
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('noah_settings') || '{}')); } catch (e) {}
  },
  save() { try { localStorage.setItem('noah_settings', JSON.stringify(this.data)); } catch (e) {} },
  ttsSupported() { return 'speechSynthesis' in window; },
  apply() {
    Sound.sfxOn = this.data.sfx;
    Sound.bgmOn = this.data.bgm;
    if (!this.data.bgm) Sound.stopBGM();
    document.body.classList.toggle('fs-large', this.data.font === 'large');
    document.body.classList.toggle('fs-xlarge', this.data.font === 'xlarge');
    if (!this.data.tts) this.stopSpeak();
  },
  init() { this.load(); this.apply(); },
  /* 🗣️ 대사 읽어주기 — ko-KR speechSynthesis (지원 기기에서만) */
  speak(text) {
    if (!this.data.tts || !this.ttsSupported()) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[<>*]/g, ' '));
      u.lang = 'ko-KR'; u.rate = 1.0; u.pitch = 1.05;
      const ko = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('ko'));
      if (ko) u.voice = ko;
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  stopSpeak() { if (this.ttsSupported()) { try { speechSynthesis.cancel(); } catch (e) {} } },
};
