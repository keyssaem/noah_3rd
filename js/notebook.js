/* ═══════════ Notebook — 📔 도덕 수첩 (원칙 카드 팝업 & 열람 UI) ═══════════ */
const Notebook = {

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

  /* ───── 수첩 열람 (HUD 버튼 / 메인 화면 버튼 공용) ───── */
  open() {
    const owned = new Set(State.notebookAll());
    const sessionCount = DATA.moralItems.filter(i => State.has(i.id)).length;
    const totalOwned = DATA.moralItems.filter(i => owned.has(i.id)).length;
    const hasOldRecords = totalOwned > sessionCount;
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
          ? `<div class="nb-card"><span class="nb-ic">${i.icon}</span>
               <div><b>${i.title}</b><p>${i.text}</p></div></div>`
          : `<div class="nb-card locked"><span class="nb-ic">❓</span>
               <div><b>? ? ?</b><p>아직 발견하지 못했어요 — ${i.hint} 찾아보세요!</p></div></div>`
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
    { label: '🔢 거울2: 수학 대결 (교실)', phase: 1, fn: async () => {
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
    { label: '⚽ 거울4: 운동장·티볼', phase: 1, fn: () => {
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
    { label: '💙 존중2: 수학 팁 (교실)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      UI.setBond('respect', 20);
      Flow.respect2();
    }},
    { label: '🎴 가위바위보 봉인판 (미니게임만)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      await UI.dialogue(DATA.dlg.rps2_intro);
      await Mini.rpsBattle('respect');
      await UI.dialogue(DATA.dlg.rps2_after);
      Flow.sysMsg('(DEV) 가위바위보 봉인판 테스트 끝');
    }},
    { label: '💙 존중3: 미술 자유 (교실)', phase: 2, fn: async () => {
      DevMode._bootstrap(2);
      await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
      Flow.setupClassroomNPCs(true);
      UI.setBond('respect', 40);
      Flow.respect3();
    }},
    { label: '⚽ 존중4: 팀편성·서연 에피소드', phase: 2, fn: () => {
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
          <span class="dev-badge">🛠 DEV MODE</span>
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
        <p class="dev-warn">⚠ 점프 시 현재 진행 상황이 초기화됩니다. State 기본값으로 설정됩니다.</p>
      </div>`);

    ov.querySelectorAll('.dev-ep-btn').forEach(btn => {
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
};
