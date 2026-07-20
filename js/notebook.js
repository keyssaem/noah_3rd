/* ═══════════ Notebook — 📔 도덕 수첩 (원칙 카드 팝업 & 열람 UI) ═══════════ */
const Notebook = { // <--- 이 부분이 누락되어 있으면 에러가 납니다!
  /* ───── 획득 시 전면 카드 팝업 — 원칙 전문을 읽고 닫아야 진행 ───── */
  showCard(item) {
    return new Promise(resolve => {
      Sound.win();
      UI.hearts(6);
      const set = DATA.moralSets[item.set];
      const ov = UI.overlay(`
        <div class="ov-panel principle-card">
          <div class="pc-set">${set.icon} ${set.name} · ${set.sub}</div>
          <div class="pc-icon">${item.icon}</div>
          <h3>${item.title}</h3>
          <p class="pc-text">${item.text}</p>
          ${item.noah ? `<p class="pc-noah">🤖 "${item.noah}"</p>` : ''}
          <p class="pc-saved">📔 도덕 수첩에 기록되었습니다!</p>
          <div class="ov-choices"><button class="choice-btn ok">마음에 새겼어요!</button></div>
        </div>`, 'fx3d');
      ov.querySelector('.ok').onclick = () => {
        Sound.pop();
        const panel = ov.querySelector('.principle-card');
        const btn = UI.els.nbBtn;
        const pr = panel.getBoundingClientRect(), br = btn.getBoundingClientRect();
        panel.style.setProperty('--tx', (br.left + br.width / 2 - (pr.left + pr.width / 2)) + 'px');
        panel.style.setProperty('--ty', (br.top + br.height / 2 - (pr.top + pr.height / 2)) + 'px');
        ov.classList.add('absorbing');
        panel.classList.add('pc-absorb');
        Sound.coin();
        setTimeout(() => {
          UI.close(ov);
          btn.classList.remove('nb-pulse'); void btn.offsetWidth; btn.classList.add('nb-pulse');
          Sound.chime();
          resolve();
        }, UI.motionOK() ? 900 : 380);
      };
    });
  },

  /* ───── 수첩 열람 ─────
     cumulative=false(HUD): 이번 모험에서 모은 것만 → 새 게임은 0/9부터 (수집의 재미)
     cumulative=true(메인 화면용): 이전 회차까지 누적 표시 (재플레이 동기) */
  open(cumulative = false) {
    const sessionCount = DATA.moralItems.filter(i => State.has(i.id)).length;
    const owned = cumulative
      ? new Set(State.notebookAll())
      : new Set(DATA.moralItems.filter(i => State.has(i.id)).map(i => i.id));
    const totalOwned = DATA.moralItems.filter(i => owned.has(i.id)).length;
    const hasOldRecords = cumulative && totalOwned > sessionCount;
    const wasEnabled = Player.enabled;
    Player.enabled = false;

    const tabs = Object.keys(DATA.moralSets);   // robot / ethics / user
    const ov = UI.overlay(`
      <div class="ov-panel notebook-panel">
        <button class="nb-close">✕</button>
        <h3>📔 도덕 수첩 <span class="nb-progress">모은 원칙 ${totalOwned} / ${DATA.moralItems.length}</span></h3>
        ${hasOldRecords ? '<p class="ov-sub">✨ 이전 모험에서 모은 기록도 함께 보여요!</p>' : ''}
        <div class="nb-tabs">
          ${tabs.map((t, i) => `<button class="nb-tab ${i === 0 ? 'on' : ''}" data-t="${t}">
            ${DATA.moralSets[t].icon} ${DATA.moralSets[t].name}</button>`).join('')}
        </div>
        <p class="nb-sub"></p>
        <div class="nb-cards"></div>
      </div>`);

    const cardsEl = ov.querySelector('.nb-cards');
    const subEl = ov.querySelector('.nb-sub');
    const render = setKey => {
      subEl.textContent = '— ' + DATA.moralSets[setKey].sub + ' —';
      cardsEl.innerHTML = DATA.moralItems.filter(i => i.set === setKey).map(i =>
        owned.has(i.id)
          ? `<div class="nb-card">
           <span class="nb-ic">${i.icon}</span>
           <div>
             <b>${i.title}</b>
             <p>${i.text}</p>
           </div>
         </div>`
      : `<div class="nb-card locked">
           <span class="nb-ic">❓</span>
           <div>
             <b>? ? ?</b>
             <p>아직 발견하지 못했어요 — ${i.hint} 찾아보세요!</p>
           </div>
         </div>`
      ).join('');
    };
    ov.querySelectorAll('.nb-tab').forEach(btn => {
      btn.onclick = () => {
        Sound.pop();
        ov.querySelectorAll('.nb-tab').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        render(btn.dataset.t);
      };
    });
    render(tabs[0]);
    ov.querySelector('.nb-close').onclick = () => {
      Sound.pop();
      UI.close(ov);
      Player.enabled = wasEnabled;
    };
  },
};

/* ═══════════ DevMode — 개발자 에피소드 점프 (수첩버튼 5회 연속 클릭) ═══════════ */
const DevMode = {
  _clicks: 0,
  _timer: null,

  /* 수첩 버튼 클릭 시 호출 — 클릭을 500ms 모아서 판단:
     5회 이상 → 개발자 패널 / 그 외 → 수첩 오픈 (팝업이 막기 전에 카운팅 완료) */
  handleClick() {
    this._clicks++;
    clearTimeout(this._timer);
    if (this._clicks >= 5) {
      this._clicks = 0;
      this.open();
      return;
    }
    this._timer = setTimeout(() => {
      this._clicks = 0;
      Notebook.open();
    }, 500);
  },

  /* 에피소드 점프 전 공통 상태 초기화 */
  _bootstrap(phase) {
    // 최소 State 기본값 (미입력 항목 채우기)
    if (!State.get('name')) State.set('name', '테스트');
    if (!State.get('gender')) State.set('gender', 'm');
    if (!State.get('noahDesign')) State.set('noahDesign', 'human');
    if (!State.get('friendDef')) State.set('friendDef', '테스트 친구');
    if (!State.get('ox1')) State.set('ox1', 'O');
    if (!State.get('ox1Reason')) State.set('ox1Reason', '(dev)');
    if (!State.get('favorite')) State.set('favorite', '테스트');
    if (!State.get('promises') || !(State.get('promises') || []).length)
      State.set('promises', ['약속1', '약속2', '약속3']);
    if (!State.get('signature')) State.set('signature', 'DEV');
    if (!State.get('relationDef')) State.set('relationDef', '테스트 관계');

    // Flow 상태
    Flow.phase = phase;
    Flow.logsRead = phase > 1;
    Flow.logs5Read = false;
    Flow._chatIdx = 0;
    Flow.step = '';
    Flow.noah = null;

    // 행동 로그 (2단계는 1단계 완료 가정)
    State.set('logDecline', phase > 1);
    State.set('teamFair', phase > 1);
    State.set('chatCount', phase > 1 ? 3 : 0);

    // 화면 전환
    UI.hide(UI.els.menu);
    UI.hide(UI.els.charScreen);
    UI.show(UI.els.hud);
    UI.clearQuest();

    // 플레이어 캐릭터 소환 (World.scene 직속 — World.clear() 영향 없음)
    Player.spawnChar();

    // 관계 게이지
    if (phase === 1) {
      World.redMode = false;
      UI.hideBond();
      State.set('bond', 0);
      State.set('bondType', 'intimacy');
    } else {
      World.redMode = true;
      State.set('bond', 50);
      State.set('bondType', 'respect');
      UI.setBond('respect', 50);
    }
  },

  /* 에피소드 목록 */
  EPISODES: [
    // ── 1단계 도구화 ──────────────────────────────
    { label: '🏠 집에서 시작 (1단계)', phase: 1, fn: () => {
      DevMode._bootstrap(1); Flow.begin();
    }},
    { label: '🗺️ 월드맵1: 로봇 3원칙 수집', phase: 1, fn: async () => {
      DevMode._bootstrap(1);
      await World.go('worldmap', { x: -17, z: 19, ry: Math.PI });
      Flow.step = 'tutorial';
      World.setBeacon(1.5, -4.5);
      await UI.dialogue(DATA.dlg.worldmapTutorial);
      UI.quest('점프(Space/⬆)로 <로봇 3원칙> 카드를 모아 보세요! (0/3)');
      Player.enabled = true;
    }},
    { label: '📚 거울1: 교실·노아 디자인', phase: 1, fn: () => {
      DevMode._bootstrap(1); Flow.enterClassroom1();
    }},
    { label: '📝 거울2: 맞춤법 대결·편향 (교실)', phase: 1, fn: async () => {
      DevMode._bootstrap(1);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      Flow.mirror2();
    }},
    { label: '✊ 가위바위보 필승판 (미니게임만)', phase: 1, fn: async () => {
      DevMode._bootstrap(1);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      await UI.dialogue(DATA.dlg.rps1_intro);
      const fair = await Mini.rpsBattle('tool');
      await UI.dialogue(fair === 'unfair' ? DATA.dlg.rps1_unfair : DATA.dlg.rps1_amazed);
      Flow.sysMsg('(DEV) 가위바위보 필승판 테스트 끝');
    }},
    { label: '🎨 거울3: 미술 시간 (교실)', phase: 1, fn: async () => {
      DevMode._bootstrap(1);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      Flow.mirror3();
    }},
    { label: '⚽ 거울4: 운동장·티볼·모방 사건', phase: 1, fn: () => {
      DevMode._bootstrap(1); Flow.enterPlayground1();
    }},
    { label: '💾 복도1: 기록 저장소', phase: 1, fn: () => {
      DevMode._bootstrap(1); Flow.enterHallway1();
    }},
    { label: '💥 거울5·반전: 가짜 엔딩', phase: 1, fn: async () => {
      DevMode._bootstrap(1);
      Flow.logsRead = true;
      await World.go('hallway', { x: -5, z: 0, ry: 0 });
      Flow.noah = Chars.noah(State.get('noahDesign'));
      World.addNPC(Flow.noah, 6.2, -1.6, -Math.PI / 2);
      UI.setBond('intimacy', 85);
      Flow.mirror5();
    }},
    // ── 2단계 존중 ──────────────────────────────
    { label: '🗺️ 월드맵2: 붉은 하늘', phase: 2, fn: () => {
      DevMode._bootstrap(2); Flow.goWorldmap2();
    }},
    { label: '💙 존중1: 교실·거절 연습', phase: 2, fn: () => {
      DevMode._bootstrap(2); Flow.enterClassroom2();
    }},
    { label: '💙 존중2: 일기 힌트·교정 (교실)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      UI.setBond('respect', 20);
      Flow.respect2();
    }},
    { label: '💌 가위바위보 봉인판 (미니게임만)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      await UI.dialogue(DATA.dlg.rps2_intro);
      await Mini.rpsBattle('respect');
      await UI.dialogue(DATA.dlg.rps2_after);
      Flow.sysMsg('(DEV) 가위바위보 봉인판 테스트 끝');
    }},
    { label: '🪜 약속의 계단 (미니게임만)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('hallway', { x: -14, z: 0, ry: Math.PI / 2 });
      await UI.dialogue(DATA.dlg.stairsIntro);
      await Mini.stairsGame();
      await UI.dialogue(DATA.dlg.stairsDone);
      Flow.sysMsg('(DEV) 약속의 계단 테스트 끝');
    }},
    { label: '💙 존중3: 미술 자유 (교실)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      UI.setBond('respect', 40);
      Flow.respect3();
    }},
    { label: '⚽ 존중4: 팀편성·서연·하이파이브', phase: 2, fn: () => {
      DevMode._bootstrap(2); Flow.enterPlayground2();
    }},
    { label: '💙 복도2: 노아에게 따뜻한 말', phase: 2, fn: () => {
      DevMode._bootstrap(2); Flow.enterHallway2();
    }},
    { label: '✍️ 존중5: 약속·서명·관계 정하기', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      Flow.logs5Read = true;
      await World.go('hallway', { x: -14, z: 0, ry: Math.PI / 2 });
      Flow.noah = Chars.noah(State.get('noahDesign'));
      World.addNPC(Flow.noah, 3, -1.5, Math.PI / 2);
      UI.setBond('respect', 80);
      Flow.respect5();
    }},
    { label: '🏁 엔딩 분기 바로 보기', phase: 2, fn: () => {
      DevMode._bootstrap(2);
      State.set('chatCount', 3);
      Endings.realEnding();
    }},
  ],

  open() {
    const wasEnabled = Player.enabled;
    Player.enabled = false;

    const byPhase = p => DevMode.EPISODES
      .map((e, i) => ({ ...e, i }))
      .filter(e => e.phase === p)
      .map(e => `<button class="dev-ep-btn" data-i="${e.i}">${e.label}</button>`)
      .join('');

    const ov = UI.overlay(`
      <div class="ov-panel dev-panel">
        <button class="nb-close">✕</button>
        <div class="dev-header">
          <span class="dev-badge">🛠 교사용 모드</span>
          <span class="dev-hint">수첩 버튼 5회 연속 클릭으로 진입</span>
        </div>
        <div class="dev-section">
          <div class="dev-sec-title phase1-title">▶ 1단계 도구화 에피소드</div>
          <div class="dev-ep-list">${byPhase(1)}</div>
        </div>
        <div class="dev-section">
          <div class="dev-sec-title phase2-title">▶ 2단계 존중 에피소드</div>
          <div class="dev-ep-list">${byPhase(2)}</div>
        </div>
        <div class="dev-section">
          <div class="dev-sec-title" style="background:#0d3a2a;color:#69f0ae;">▶ 도구 (P3)</div>
          <div class="dev-ep-list"><button class="dev-ep-btn" data-viewer="1">🎭 GLB 모델·애니메이션 뷰어</button></div>
        </div>
        
      </div>`);

    ov.querySelector('[data-viewer]').onclick = () => {
      Sound.pop(); UI.close(ov); Player.enabled = wasEnabled; DevMode.glbViewer();
    };
    ov.querySelectorAll('.dev-ep-btn[data-i]').forEach(btn => {
      btn.onclick = () => {
        Sound.pop();
        UI.close(ov);
        Player.enabled = wasEnabled;
        DevMode.EPISODES[+btn.dataset.i].fn();
      };
    });
    ov.querySelector('.nb-close').onclick = () => {
      Sound.pop();
      UI.close(ov);
      Player.enabled = wasEnabled;
    };
  },

  /* 🎭 GLB 모델·애니메이션 뷰어 — 클립 식별용 (NlaTrack 이름이 무의미하므로 눈으로 확인) */
  glbViewer() {
    const models = [
      ['playerM', '👦 남자 주인공'], ['playerF', '👧 여자 주인공'], ['teacher', '🧑‍🏫 선생님'],
      ['noahHuman', '🤖 노아 인간'], ['noahAnimal', '🐱 노아 동물'], ['noahCar', '🚗 노아 자동차'],
    ];
    const ov = UI.overlay(`
      <div class="ov-panel glbv-panel">
        <button class="nb-close">✕</button>
        <h3 class="glbv-title">🎭 GLB 뷰어 <span class="glbv-info">모델을 고르세요</span></h3>
        <div class="glbv-models">${models.map(m =>
          `<button class="glbv-mbtn" data-n="${m[0]}">${m[1]}</button>`).join('')}</div>
        <canvas class="glbv-canvas" width="480" height="360"></canvas>
        <div class="glbv-clips"><span class="glbv-hint">모델을 고르면 애니메이션 클립 버튼이 나타나요</span></div>
      </div>`);
    const canvas = ov.querySelector('.glbv-canvas');
    const infoEl = ov.querySelector('.glbv-info');
    const clipsEl = ov.querySelector('.glbv-clips');
    const closeBtn = ov.querySelector('.nb-close');
    let renderer = null, raf = null;
    let onMove = null, onUp = null;

    const closeViewer = () => {
      Sound.pop();
      cancelAnimationFrame(raf);
      Rendering.dispose(renderer);
      if (onMove) window.removeEventListener('pointermove', onMove);
      if (onUp) window.removeEventListener('pointerup', onUp);
      UI.close(ov);
    };
    closeBtn.onclick = closeViewer;

    try {
      renderer = Rendering.create({ canvas, antialias: true, alpha: true }, 'GLB 미리보기');
    } catch (error) {
      console.warn('GLB viewer WebGL initialization failed:', error);
      infoEl.textContent = '3D 미리보기 사용 불가';
      clipsEl.textContent = '그래픽 가속 상태를 확인한 뒤 다시 시도해 주세요.';
      Rendering.previewFallback(canvas, 'GLB 미리보기를 표시할 수 없습니다.');
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(canvas.width, canvas.height, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 100);
    cam.position.set(0, 1.1, 3.6); cam.lookAt(0, 0.9, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(2, 4, 3); scene.add(dir);

    let ch = null, rot = true, clock = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - clock) / 1000); clock = now;
      if (ch) { if (rot) ch.group.rotation.y += 0.012; ch.update(dt); }
      renderer.render(scene, cam);
    };
    loop();

    const loadModel = async name => {
      infoEl.textContent = '불러오는 중...';
      clipsEl.innerHTML = '<span class="glbv-hint">로딩 중...</span>';
      const g = await Assets.loadOne(name, p => { infoEl.textContent = Math.round(p * 100) + '%'; });
      if (!g) { infoEl.textContent = '❌ 로드 실패'; clipsEl.innerHTML = `<span class="glbv-hint">${Assets.failHint()}</span>`; return; }
      if (ch) scene.remove(ch.group);
      const isCar = name === 'noahCar';
      ch = Chars.glbChar(name, { height: isCar ? 1.2 : 1.7 });
      if (!ch) { infoEl.textContent = '❌ 인스턴스 실패'; return; }
      scene.add(ch.group);
      const n = ch.actions.length;
      infoEl.textContent = `클립 ${n}개 · 드래그로 회전`;
      // 매핑된 의미 이름 표시 (인덱스 → 한국어 동작), 미사용 클립은 회색
      const map = (Chars.CLIPS && Chars.CLIPS[name]) || {};
      const labelOf = i => {
        const key = Object.keys(map).find(k => map[k] === i);
        return key ? (Chars.CLIP_LABELS[key] || key) : '미사용';
      };
      clipsEl.innerHTML = n === 0 ? '<span class="glbv-hint">이 모델엔 애니메이션이 없어요 (정적)</span>'
        : ch.actions.map((a, i) => {
            const lab = labelOf(i);
            const off = lab === '미사용' ? ' style="opacity:.45"' : '';
            return `<button class="glbv-cbtn" data-i="${i}"${off}>▶ [${i}] ${lab} · ${(a.getClip().duration).toFixed(1)}초</button>`;
          }).join('')
          + '<button class="glbv-cbtn stop">⏸ 정지</button>';
      clipsEl.querySelectorAll('.glbv-cbtn[data-i]').forEach(b => b.onclick = () => {
        Sound.pop(); ch.actions.forEach(a => a.stop()); ch._cur = -1; ch.play(+b.dataset.i, 0.15);
        clipsEl.querySelectorAll('.glbv-cbtn').forEach(x => x.classList.remove('on')); b.classList.add('on');
      });
      const stop = clipsEl.querySelector('.stop');
      if (stop) stop.onclick = () => { Sound.pop(); ch.actions.forEach(a => a.stop()); ch._cur = -1;
        clipsEl.querySelectorAll('.glbv-cbtn').forEach(x => x.classList.remove('on')); };
    };
    ov.querySelectorAll('.glbv-mbtn').forEach(b => b.onclick = () => {
      Sound.pop();
      ov.querySelectorAll('.glbv-mbtn').forEach(x => x.classList.remove('on')); b.classList.add('on');
      loadModel(b.dataset.n);
    });

    // 드래그 회전
    let drag = false, px = 0;
    onMove = e => { if (drag && ch) { ch.group.rotation.y += (e.clientX - px) * 0.01; px = e.clientX; } };
    onUp = () => { drag = false; };
    canvas.addEventListener('pointerdown', e => { drag = true; px = e.clientX; rot = false; });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

  },
};
