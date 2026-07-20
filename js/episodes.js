/* ═══════════ Flow — 퀘스트/에피소드 진행 오케스트레이터 ═══════════
   1단계 시작 → 2단계 월드맵 → 3단계 도구화 거울1~5 → 4단계 반전
   → 5단계 존중 거울1~5 → 약속/서명 → 6단계 엔딩                     */
const Flow = {
  phase: 1,          // 1 = 도구화, 2 = 존중
  step: '',          // 현재 퀘스트 단계
  noah: null,

  /* 시간 기반 트윈 도우미 */
  tween(ms, fn) {
    return new Promise(res => {
      const t0 = performance.now();
      const loop = () => {
        const t = Math.min(1, (performance.now() - t0) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(loop); else res();
      };
      loop();
    });
  },

  async sysMsg(text) { await UI.dialogue([{ speaker: 'System', text }]); },

  /* ═══════ 1-3 집에서 시작 ═══════ */
  async begin() {
    this.phase = 1; this.step = 'home';
    Sound.playBGM('media/sound/bgm2_toward_the_school.mp3');   // 🎵 등굣길 BGM (거울4 티볼 진입 시 페이드아웃)
    this.logsRead = false; this.logs5Read = false; this._chatIdx = 0; this._chatBags = {};
    this.talked = new Set(); this.talkedLog = new Map(); this._recapShown = false;
    UI.updateNotebook();
    UI.hideBond();
    State.set('bond', 0); State.set('bondType', 'intimacy');
    State.set('favorite', ''); State.set('relationDef', '');
    State.set('logDecline', false); State.set('teamFair', false); State.set('chatCount', 0);
    World.build('home');
    Player.spawnChar();
    Player.setPos(-1.5, 0, -1.5, Math.PI / 2);
    Player.snapCamera();
    await UI.fadeIn();
    await UI.dialogue(DATA.dlg.wakeup);
    Player.enabled = false;                    // 튜토리얼 동안 키보드 이동 방지 (대화는 이전 잠금 상태를 복원 — 안전용 재확인)
    await UI.tutorial();                       // 🎮 조작 안내 (첫 플레이 사용성)
    UI.quest('집 밖으로 나가 보세요! (빛나는 기둥으로 이동)');
    Player.enabled = true;
  },

  /* ═══════ 존(공간 트리거) 분기 ═══════ */
  async onZone(id) {
    switch (id) {
      case 'home_exit':
        if (this.step === 'home') return this.goWorldmap1();
        if (this.step === 'home2') return this.goWorldmap2();
        break;
      case 'school_door':
        if (this.step === 'toSchool') return this.enterClassroom1();
        if (this.step === 'toSchool2') return this.enterClassroom2();
        await this.sysMsg('(아직 학교에 들어갈 수 없어요. 퀘스트를 먼저 확인해요!)');
        break;
      case 'class_to_hall':
        if (this.step === 'toPlayground' || this.step === 'toPlayground2') {
          // 🗣️ 3명 대화 게이트 — 친구들의 마음을 듣고 가야 운동장으로
          if (this.talked.size < 3) {
            await this.sysMsg(`잠깐! 반 친구들의 이야기를 좀 더 들어볼까요? 지금까지 ${this.talked.size}명과 이야기했어요. (F키로 3명 이상)`);
            return;
          }
          if (!this._recapShown) {         // 통과 순간 1회: 오늘 들은 마음 요약 → 활동지 기록 시간
            this._recapShown = true;
            await this.showTalkRecap();
          }
          if (await this.remindItem()) return;
          return this.step === 'toPlayground' ? this.enterPlayground1() : this.enterPlayground2();
        }
        await this.sysMsg('(아직 수업 시간이에요! 지금은 나갈 수 없어요.)');
        break;
      case 'pg_to_school':
        if (this.step === 'toHallway' || this.step === 'toHallway2') {
          if (await this.remindItem()) return;
          return this.step === 'toHallway' ? this.enterHallway1() : this.enterHallway2();
        }
        await this.sysMsg('(지금은 체육 시간이에요!)');
        break;
      case 'hall_scene':
        if (this.step === 'hall1') {
          if (!this.logsRead) {   // 기록 장치를 먼저 읽어야 거울5 진행 (감정 빌드업)
            await this.sysMsg('(잠깐... 저기 사물함 위에서 무언가 반짝이고 있다. 먼저 살펴보고 올까?)');
            return;
          }
          return this.mirror5();
        }
        if (this.step === 'hall2') return this.respect5();
        break;
      case 'hall_to_class':
        await this.sysMsg('(지금은 교실로 돌아갈 때가 아니에요! 퀘스트를 확인해요.)');
        break;
    }
  },

  /* ═══════ 2-1 월드맵 튜토리얼 (마리오 감성 별 모으기) ═══════ */
  async goWorldmap1() {
    this.step = 'tutorial';
    // 🎵 등굣길 BGM은 begin()에서 이미 재생 중 — 씬 전환과 무관하게 계속 이어짐 (거울4 티볼 진입 시 페이드아웃)
    await World.go('worldmap', { x: -17, z: 19, ry: Math.PI });
    World.setBeacon(1.5, -4.5);
    await UI.dialogue(DATA.dlg.worldmapTutorial);
    UI.quest('점프(Space/⬆)로 <로봇 3원칙> 카드를 모아 보세요! (0/3)');
  },

  /* 📔 원칙 카드 획득 → 수첩 기록 + 전면 카드 팝업 */
  async onItemCollect(id) {
    State.collect(id);
    UI.updateNotebook();
    const item = DATA.moralItems.find(i => i.id === id);
    const wasEnabled = Player.enabled;
    Player.enabled = false;
    await Notebook.showCard(item);
    Player.enabled = wasEnabled;
    if (this.step === 'tutorial') {
      const n = ['robot1', 'robot2', 'robot3'].filter(r => State.has(r)).length;
      if (n >= 3) this.spawnDonghyukQuest1();
      else UI.quest(`점프(Space/⬆)로 <로봇 3원칙> 카드를 모아 보세요! (${n}/3)`);
    }
  },

  /* ═══════ 💬 친구·선생님 자유 대화 (F키) — 단계·씬별 풀 + 셔플백 랜덤 ═══════ */
  _chatBags: {},
  talked: new Set(),          // 이 공간에서 대화한 NPC (uid) — 교실 출구 게이트용
  talkedLog: new Map(),       // uid → { speaker, text } (요약 패널용, NPC당 마지막 대사)
  _recapShown: false,

  addFriendZone(id, label, x, z) {
    const uid = id + '@' + x + ',' + z;          // 익명 학생도 개인별로 세도록 위치 기반 uid
    World.addZone(x, z, 1.6, label, () => Flow.friendTalk(id, uid));
  },
  async friendTalk(id, uid) {
    const src = DATA.friendChat[id === 'student' ? 'students' : id];
    if (!src) return;
    const set = src[this.phase === 1 ? 'p1' : 'p2'];
    if (!set) return;
    // students는 씬 공용 배열, 나머지는 씬별 풀 (없으면 교실 풀로 폴백)
    const pool = Array.isArray(set) ? set : (set[World.current] || set.classroom || []);
    if (!pool.length) return;
    const key = id + '|' + this.phase + '|' + (Array.isArray(set) ? 'all' : World.current);
    let bag = this._chatBags[key];
    if (!bag || !bag.length) {
      bag = this._chatBags[key] = Array.from(pool, (_, i) => i).sort(() => Math.random() - 0.5);
    }
    const speaker = { donghyuk: '동혁', chaewon: '채원', seoyeon: '서연', teacher: '선생님', student: '친구' }[id] || '친구';
    const text = pool[bag.pop()];
    await UI.dialogue([{ speaker, text }]);
    // 🗣️ 대화 기록 (게이트·요약용)
    this.talked.add(uid || id);
    this.talkedLog.set(uid || id, { speaker, text });
    this._updateTalkQuest();
  },

  /* 교실 자유 이동 중 퀘스트 배너에 (n/3) 진행 표시 */
  _updateTalkQuest() {
    if (this.step !== 'toPlayground' && this.step !== 'toPlayground2') return;
    const n = Math.min(this.talked.size, 3);
    UI.quest(`친구들의 마음을 들어 보세요 (${n}/3) — 다 들으면 운동장으로!`);
  },

  /* 💬 "오늘 들은 마음" 요약 — 게이트 통과 순간 1회, 활동지에 옮겨 적는 시간 */
  showTalkRecap() {
    const rows = [...this.talkedLog.values()];
    return new Promise(res => {
      const ov = UI.overlay(`
        <div class="ov-panel recap-panel">
          <h3 class="mini-title">💬 오늘 들은 친구들의 마음</h3>
          <div class="recap-list">${rows.map(r =>
            `<div class="recap-row"><span class="recap-who">${DATA.portraits[r.speaker] || '💬'} ${r.speaker}</span><p>${r.text}</p></div>`).join('')}</div>
          <p class="recap-note">✍️ 가장 인상 깊은 친구의 말을 <b>활동지</b>에 적어 보세요!</p>
          <div class="ov-choices"><button class="choice-btn ok">다 적었어요!</button></div>
        </div>`);
      ov.querySelector('.ok').onclick = () => { Sound.pop(); UI.close(ov); res(); };
    });
  },

  /* ═══════ 💬 노아 잡담 시스템 — 기억해주는 로봇 ═══════ */
  _chatIdx: 0,
  fillFav(lines, fav) {
    return lines.map(l => Object.assign({}, l, { text: l.text.replace(/%FAV%/g, fav) }));
  },
  async noahChat() {
    State.set('chatCount', (State.get('chatCount') || 0) + 1);   // 행동 로그
    const fav = State.get('favorite');
    // 첫 잡담(3단계): 좋아하는 것 물어보고 기억하기
    if (this.phase === 1 && !fav) {
      await UI.dialogue(DATA.noahChat.askFavorite);
      const v = await UI.textInput('내가 가장 좋아하는 것은?', '예) 파란색, 축구, 강아지...', '노아가 물어봤어요! 솔직하게 적어 볼까요?');
      State.set('favorite', v);
      await UI.dialogue(this.fillFav(DATA.noahChat.afterFavorite, v));
      return;
    }
    const pool = this.phase === 1 ? DATA.noahChat.pool1 : DATA.noahChat.pool2;
    const mem = this.phase === 1 ? DATA.noahChat.memory1 : DATA.noahChat.memory2;
    this._chatIdx++;
    const lines = (fav && this._chatIdx % 2 === 0) ? mem : pool[this._chatIdx % pool.length];
    await UI.dialogue(this.fillFav(lines, fav || '그것'));
  },
  addNoahChatZone(x, z) {
    World.addZone(x, z, 2.2, '노아와 이야기하기', () => Flow.noahChat());
  },

  /* ═══════ 💾 노아의 기록 저장소 ═══════ */
  logsRead: false, logs5Read: false,
  addLogDevice() {
    World.box(0.55, 0.35, 0.35, 0x37474f, -12, 1.5, 3.0);      // 사물함 위 기록 장치
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.09),
      new THREE.MeshBasicMaterial({ color: 0x4dd0e1 }));
    light.position.set(-12, 1.82, 3.0);
    World.root.add(light);
  },
  async readLogs3() {
    if (this.logsRead) { await this.sysMsg('(더 이상 새로운 기록은 없다.)'); return; }
    await Mini.noahLog(DATA.noahLogs.stage3);
    this.logsRead = true;
    await UI.dialogue([{ speaker: '나(독백)', text: '(이건... 노아의 기록 장치였어. 감정은 한 글자도 없는데... 왜 이렇게 가슴이 답답하지. ...몰래 봐서 미안해, 노아야.)' }]);
    UI.quest('이제 노아를 찾아가 볼까요? (소리가 나는 쪽으로 몰래 다가가기)');
    World.setBeacon(-5, 0);
  },
  async readLogs5() {
    if (this.logs5Read) { await this.sysMsg('(더 이상 새로운 기록은 없다.)'); return; }
    await Mini.noahLog(DATA.noahLogs.stage5);
    this.logs5Read = true;
    await UI.dialogue([{ speaker: '나(독백)', text: '(불일치 수치가... 줄어들고 있어! 우리가 노아를 대하는 방식이, 정말로 데이터에 남고 있었구나.)' }]);
  },

  /* 공간을 떠나기 전, 놓친 카드가 있으면 한 번만 알려주기 (강제 잠금은 아님) */
  async remindItem() {
    const left = World.items.find(it => !it.userData.got && !it.userData.reminded);
    if (left) {
      left.userData.reminded = true;
      await this.sysMsg('잠깐! 📔 이 공간 어딘가에 반짝이는 원칙 카드가 아직 남아 있어요! (그래도 떠나려면 다시 문을 이용하세요)');
      return true;
    }
    return false;
  },

  /* ═══════ 2-2 동혁이 만나기 ═══════ */
  async spawnDonghyukQuest1() {
    this.step = 'meetDonghyuk';
    Sound.win();
    const d = Chars.donghyuk();
    World.addNPC(d, 12, -12, -Math.PI / 4);
    World.setBeacon(12, -12);
    const zone = World.addZone(12, -12, 2.2, '동혁이와 대화하기', async () => {
      zone.used = true;                      // 동혁이가 떠난다 — F 프롬프트 재등장 방지
      await UI.dialogue(DATA.dlg.donghyukQuest1);
      World.removeNPC(d);
      this.step = 'toSchool';
      UI.quest('여러분은 학교로 등교해야 합니다. 서둘러 교실로 이동하세요!');
      World.setBeacon(17, -13.6);
    });
    UI.quest('저기 있는 동혁이에게 말을 걸어 보세요! (가까이 가서 F)');
    await this.sysMsg('(동혁이가 나를 향해 손을 흔들고 있다!)');
  },

  /* ═══════ 교실 NPC 배치 도우미 ═══════ */
  setupClassroomNPCs(withNoah) {
    // 🗣️ 공간별 대화 기록 리셋 (교실 출구 3명 게이트)
    this.talked = new Set(); this.talkedLog = new Map(); this._recapShown = false;
    World.addNPC(Chars.teacher(), -3.5, -3.7, 0);
    this.addFriendZone('teacher', '선생님과 이야기하기', -3.5, -3.7);
    // (4.5,1.5) 자리는 노아 잡담 존과 겹쳐 (-4.5,4.1)로 이동
    const seats = [[-4.5, -1.1], [-1.5, -1.1], [4.5, -1.1], [-4.5, 1.5], [-4.5, 4.1], [-1.5, 4.1]];
    seats.forEach((s, i) => {
      World.addNPC(Chars.student(i), s[0], s[1], Math.PI);
      this.addFriendZone('student', '친구와 이야기하기', s[0], s[1]);
    });
    World.addNPC(Chars.donghyuk(), 1.5, 1.5, Math.PI);
    this.addFriendZone('donghyuk', '동혁이와 이야기하기', 1.5, 1.5);
    World.addNPC(Chars.chaewon(), 1.5, 4.1, Math.PI);
    this.addFriendZone('chaewon', '채원이와 이야기하기', 1.5, 4.1);
    World.addNPC(Chars.seoyeon(), -1.5, 1.5, Math.PI);        // 서연 — 첫 교실부터 등장
    this.addFriendZone('seoyeon', '서연이와 이야기하기', -1.5, 1.5);
    if (withNoah) {
      this.noah = Chars.noah(State.get('noahDesign'));
      World.addNPC(this.noah, 6.0,0.6, Math.PI);
    }
  },

  /* 🎥 노아 연출 순간 — 클립 재생 + 카메라를 노아에게 밀어넣어 크게 잡기
     GLB 노아면 해당 클립, 박스 노아면 클립은 무시하고 카메라 포커스만 (양쪽 안전) */
  noahMoment(clipKey, opts = {}) {
    const noah = this.noah;
    if (!noah) return;
    if (noah.play && clipKey) noah.play(clipKey, 0.25);
    // noah.group 안의 첫 번째 자식(실제 로봇 모델)만 90도 회전
if (noah.group.children.length > 0) {
    // 상황에 따라 Math.PI / 2 또는 -Math.PI / 2를 적용해 보세요.
    noah.group.children[0].rotation.y = -Math.PI / 2; 
}
    Player.focusOn(noah.group, Object.assign({ dist: 3.0, height: 1.45, lookH: 1.2 }, opts));
  },
  /* 연출 종료 — 노아 대기 클립 복귀 + 카메라 원위치 */
  noahRest() {
    const noah = this.noah;
    if (noah && noah.play) noah.play('idle', 0.35);
    Player.clearFocus();
  },

  /* 노아 조립 연출 (하늘에서 부품이 내려와 조립!) */
  async assembleNoah(x, z) {
    this.noah = Chars.noah(State.get('noahDesign'));
    const g = this.noah.group;
    g.position.set(x, 7, z);
    g.scale.setScalar(0.05);
    World.root.add(g);
    World.npcs.push(this.noah);
    Sound.chime();
    await this.tween(1600, t => {
      g.scale.setScalar(Math.max(0.05, t));
      g.position.y = 7 * (1 - t * t);
      g.rotation.y = Math.PI * 6 * t;
    });
    g.rotation.y = 0; g.position.y = 0;
    Sound.win(); UI.hearts(5);
    await this.sysMsg('⚙️ 위이잉— 척! 척! [지정된 디자인으로 노아가 조립됩니다]');
  },

  /* ═══════ 3-1 거울1 : 노아와의 첫 만남 ═══════ */
  async enterClassroom1() {
    this.step = 'ep_mirror1';
    // 🎵 등굣길 BGM은 교실(거울1~3)에서도 계속 이어짐 — 거울4 티볼 진입 시 페이드아웃
    UI.clearQuest();
    await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
    this.setupClassroomNPCs(false);
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.mirror1_intro);

    // 🎬 복도 워킹 컷씬 — 노아 3총사가 걸어온다 (발자국 소리 대사와 연결)
    await UI.playVideo('media/movie/noah-walk2.mp4');

    // customTrigger: noah_design — human / animal / car
    const design = await Mini.noahDesign();
    State.set('noahDesign', design);
    // P3: 선택한 디자인의 노아 GLB 프리로드 (실패해도 박스 노아로 진행)
    const noahKey = { human: 'noahHuman', animal: 'noahAnimal', car: 'noahCar' }[design];
    await Assets.preloadWithBar([noahKey], '노아를 조립할 준비 중...');
    await this.assembleNoah(0, -3.5);
    UI.setBond('intimacy', 15);              // 💕 노아와의 첫 만남!
    this.noahMoment('greet');           // 🎥 꾸벅 인사 + 카메라 클로즈업

    // 혹시 모를 에러를 방지하기 위해 noah 객체와 play 함수가 있는지 안전하게 체크
    

    await UI.dialogue(DATA.dlg.mirror1_noahArrive);
  
    // 나에게 친구란 ___ (def / reason 저장)
    const def = await UI.textInput('나에게 <친구>란 _______ (이)다.', '예) 보물, 그늘 같은 사람...', '빈칸에 들어갈 나만의 말을 적어 보세요.');
    State.set('friendDef', def);
    const reason = await UI.textInput('그렇게 생각하는 이유는?', '이유를 자유롭게 적어 보세요', '', true);
    State.set('friendReason', reason);

    await UI.dialogue(DATA.dlg.mirror1_greet);
    if (this.noah && this.noah.play) {
    this.noah.play('idle', 0.25); // 네 코드에 있는 0.25 트랜지션을 써서 부드럽게 전환!
}
    
    // 수미상관 질문 ① (3단계)
    const ox = await UI.oxQuestion('당신은 인공지능 로봇과 <친구>가 될 수 있다고 생각하나요?', 'O 또는 X를 선택해 주세요. 정답은 없어요!');
    State.set('ox1', ox);
    const oxReason = await UI.textInput('그렇게 생각한 이유는?', '이유를 자유롭게 적어 보세요', '', true);
    State.set('ox1Reason', oxReason);
    
    // 얼굴 스캔 (Mediapipe 스타일) — 카메라 없는 PC 대응 선택지
    await UI.dialogue(DATA.dlg.mirror1_scanAsk);
    const cam = await UI.choice('노아가 나의 얼굴을 스캔하려 합니다!', [
      { label: '📷 카메라로 스캔 받기 (노트북·태블릿)', value: true },
      { label: '💻 카메라가 없어요! (상상 스캔 모드)', value: false },
    ]);
    await Mini.faceScan(cam);
    await UI.dialogue(DATA.dlg.mirror1_scanAfter);

    // ✊✌️🖐 얼굴 스캔 직후 — 노아에게 가위바위보 놀이 신청 (절대 이길 수 없는 대결, MediaPipe/버튼 폴백)
    await UI.dialogue(DATA.dlg.rps1_intro);
    const fair = await Mini.rpsBattle('tool');
    await UI.dialogue(fair === 'unfair' ? DATA.dlg.rps1_unfair : DATA.dlg.rps1_amazed);
    UI.setBond('intimacy', 30);              // 💕 거울1 완료

    await this.mirror2();
  },

  /* ═══════ 3-2 거울2 : 맞춤법 대결 & 숙제 떠넘기기 & 데이터 편향 사건 ═══════ */
  async mirror2() {
    await UI.dialogue(DATA.dlg.mirror2_intro);
    await Mini.mathBattle();
    // 📚 P5: 일기 숙제 쌓임 연출 — mirror2_after[3](일기장 쌓임 지문·must)을 무대의 자동 진행이 대체
    // (⚠ mirror2_after 대사를 추가/삭제하면 아래 slice 경계 조정!)
    await UI.dialogue(DATA.dlg.mirror2_after.slice(0, 3));   // 독백 → 동혁 "노아한테 시키자" → 학생들 "내 것도!"
    await Mini.diaryPile();                                   // 📚 일기장 12묶음(24편)이 책상 위에 쌓인다
    await UI.dialogue(DATA.dlg.mirror2_after.slice(4));      // 노아 "24편 작성 시작" → 씁쓸한 독백
    // 📚 데이터 편향 — 🧠 노아 두뇌 데이터 주입기 (CSS 3D): 동혁의 거짓 데이터를 막지 못하고 노아가 오염됨
    // (2-4 대사 다이어트 — 학습 선언·퀴즈·폭소·선생님 교정은 전부 주입기 안에서 연출.
    //  ⚠ bias1[2]·[4..10]과 bias1After[0..1]은 주입기가 대체 — 대사를 수정하면 아래 인덱스 조정!)
    await UI.dialogue(DATA.dlg.bias1.slice(0, 2));   // 쉬는 시간 — 동혁의 속닥임(거짓말)
    await UI.dialogue([DATA.dlg.bias1[3]]);           // "(어? 잠깐, 그거 아닌데...!)" — 막아야 할 이유
    await Mini.dataInjector();                        // ⓪지식 확인 → 분열 터뜨리기 → 오염 연쇄 → 예측 퀴즈
    await UI.dialogue(DATA.dlg.bias1After.slice(2));  // 노아의 혼란 + 마무리 독백
    UI.setBond('intimacy', 50);              // 💕 거울2 완료
    await this.mirror3();
  },

  /* ═══════ 3-3 거울3 : 미술 시간 (자석 선택지) ═══════ */
  async mirror3() {
    await UI.dialogue(DATA.dlg.mirror3_intro);
    await Mini.artForced();
    await UI.dialogue(DATA.dlg.mirror3_after);
    UI.setBond('intimacy', 70);              // 💕 거울3 완료
    await UI.dialogue(DATA.dlg.chaewonQuest);
    this.noahRest();
    this.step = 'toPlayground';
    UI.quest('친구들의 마음을 들어 보세요 (0/3) — 다 들으면 운동장으로!');
    const z = World.zones.find(z => z.label === '복도로 나가기');
    if (z) z.label = '운동장으로 가기';
    World.setBeacon(6, 5.2);
    World.addItem(-5.5, 1.5, 4.8, 'ethics1');
    this.addNoahChatZone(0, -3.5);           // 💬 교실 앞의 노아에게 말 걸기
    await this.sysMsg('(어라? 교실 뒤쪽에 반짝이는 원칙 카드가 나타났다! 📔 노아에게 말을 걸어볼 수도 있을 것 같다.)');
    Player.enabled = true;
  },

  /* ═══════ 3-4 거울4 : 티볼 등급 분류 사건 ═══════ */
  async enterPlayground1() {
    this.step = 'ep_mirror4';
    Sound.fadeOutBGM();                        // 🎵 등굣길 BGM 페이드아웃 (거울4 티볼 진입)
    UI.clearQuest();
    await World.go('playground', { x: 0, z: -2, ry: 0 });
    Sound.playBGM('media/sound/bgm3_playground.mp3'); // 🎵 운동장 BGM (거울4~복도1~거울5, 4단계 가짜 엔딩 직전 페이드아웃)
    World.addNPC(Chars.teacher(), -4, -8, 0.5);
    this.addFriendZone('teacher', '선생님과 이야기하기', -4, -8);
    World.addNPC(Chars.donghyuk(), 4, 4, -0.8);
    this.addFriendZone('donghyuk', '동혁이와 이야기하기', 4, 4);
    World.addNPC(Chars.chaewon(), -4, 4, 0.8);
    this.addFriendZone('chaewon', '채원이와 이야기하기', -4, 4);
    World.addNPC(Chars.seoyeon(), 8, -3, -0.5);
    this.addFriendZone('seoyeon', '서연이와 이야기하기', 8, -3);
    for (let i = 0; i < 4; i++) {
      World.addNPC(Chars.student(i), -8 + i * 5, 9, Math.PI * 0.05 * i);
      this.addFriendZone('student', '친구와 이야기하기', -8 + i * 5, 9);
    }
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 0, 1, 0);   // 운동장 한가운데 노아
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.mirror4_intro);

    // 🦿 노아 모방 사건 (B안) — 행동 데이터 오염: 채원의 장난 발길질을 노아가 그대로 학습·재현
    // (2-1 스테이징 — 대사는 그대로, 사이에 연출층. ⚠ imitate1b 대사를 추가/삭제하면 아래 slice 경계 조정!)
    await UI.dialogue(DATA.dlg.imitate1a);
    await FX.dataLearn('👁 행동 데이터 관찰 중...', '친한 사이 = 발로 가볍게 참'); // 📼 관찰 게이지 → 카드가 DB에 딸깍
    this.noahMoment('idle', { dist: 2.8, height: 1.4, lookH: 1.15 });   // 🎥 갸우뚱하는 노아 클로즈업
    await UI.dialogue(DATA.dlg.imitate1b.slice(0, 4));                  // 갸우뚱 질문 → "저장 완료" → 오싹한 독백
    FX.vignette(true);                                                  // 🌑 긴장 — 화면 가장자리가 어두워진다
    FX.heartbeat(6, 0.8, 0.82);                                         // 💓 심박이 점점 빨라진다
    FX.vibrate([40, 320, 40, 280, 40]);                                 // 걸음마다 짧은 진동
    await UI.dialogue(DATA.dlg.imitate1b.slice(4, 7));                  // 뚜벅뚜벅... 다리를 천천히 들어 올린다
    await Mini.stopButton('tool');                                      // 🛑 멈춰! → "명령 대기 목록에 없음" + 버튼이 부서진다 (무력감)
    FX.flash('#ff5c5c', 220); FX.shake(14, 500); FX.vibrate(180);       // ⚡ "툭" — 충격만, 접촉은 보여주지 않음
    await UI.dialogue(DATA.dlg.imitate1b.slice(7, 10));                 // 툭 — 동혁의 비명
    FX.murmur(); FX.shake(6, 400);                                      // 🗣 아이들의 웅성거림
    await UI.dialogue(DATA.dlg.imitate1b.slice(10));                    // 동요 + 새파랗게 질린 채원
    this.noahMoment('scared');                                          // 🎥 술렁이는 아이들 앞, 움츠러드는 노아
    await UI.dialogue(DATA.dlg.imitate1c);
    FX.vignette(false);
    this.noahRest();
    UI.setBond('intimacy', 85);              // 💕 거울4 완료

    this.step = 'toHallway';
    UI.quest('지금은 쉬는시간입니다. 복도로 이동하세요!');
    const z = World.zones.find(z => z.label === '학교로 들어가기');
    if (z) z.label = '복도로 가기';
    World.setBeacon(0, -18.4);
    World.addItem(5, 1.7, -12, 'ethics2');
    this.addNoahChatZone(0, 1);              // 💬 티볼장의 노아에게 말 걸기
    await this.sysMsg('(운동장 한쪽에 반짝이는 원칙 카드가 나타났다! 📔)');
    Player.enabled = true;
  },

  /* ═══════ 3-5 거울5 : 복도 뒷담화 ═══════ */
  async enterHallway1() {
    this.step = 'hall1';
    UI.clearQuest();
    await World.go('hallway', { x: -14, z: 0, ry: Math.PI / 2 });
    World.addNPC(Chars.donghyuk(), -5, -1.2, 2.2);
    World.addNPC(Chars.student(0), -6.5, 0, 1.4);
    World.addNPC(Chars.student(3), -5.5, 1.4, -2.6);
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 6.2, -1.6, -Math.PI / 2);   // 기둥 뒤에 숨은 노아
    World.addZone(-5, 0, 2.2, '...몰래 다가가기', () => Flow.onZone('hall_scene'));
    this.addLogDevice();                                 // 💾 사물함 위 기록 장치
    World.addZone(-12, 2.2, 2.0, '반짝이는 기록 장치 살펴보기', () => Flow.readLogs3());
    World.setBeacon(-12, 2.2);
    World.addItem(-10.5, 1.5, 0, 'ethics3');            // 지나가는 길목에 배치 (놓치기 어렵게)
    UI.quest('사물함 위에서 무언가 반짝여요! 살펴본 뒤, 소리 나는 쪽으로 가 보세요. (📔카드도!)');
    Player.enabled = true;
  },

  async mirror5() {
    this.step = 'ep_mirror5';
    UI.clearQuest();
    World.clearBeacon();
    await UI.dialogue(DATA.dlg.mirror5_intro);
    UI.setBond('intimacy', 100);             // 💕 친밀도 100% 달성...?
    await UI.wait(1400);
    Sound.fadeOutBGM();                      // 🎵 운동장 BGM 페이드아웃 (4단계 가짜 엔딩 진입)
    // ═══ 4단계: 가짜 엔딩 → 시스템 오류 → 재시작(7942) ═══
    await Endings.fakeEnding();
    await this.startPhase2();
  },

  /* ═══════ 5단계 시작 : 붉은 월드맵, 집에서 재시작 ═══════ */
  async startPhase2() {
    this.phase = 2; this.step = 'home2';
    World.redMode = true;
    Player.clearFocus();                     // 🎥 반전 연출 카메라 포커스 해제
    UI.clearQuest();
    UI.setBond('respect', 1);                // 💙 존중 게이지로 전환 (1%부터 다시)
    FX.blackHold();                          // 7942 성공 직후 이미 암전 — 없으면 여기서 세운다
    World.build('home');
    Player.setPos(-1.5, 0, -1.5, Math.PI / 2);
    Player.snapCamera();
    await FX.crtOn();                        // 📺 점→라인→확장으로 화면이 켜진다 + 💓 심박 1박 — 노아가 다시 돌아온다
    Sound.playBGM('media/sound/bgm4_respect.mp3'); // 🎵 존중편 BGM (5단계 시작~엔딩까지 계속 반복)
    await UI.dialogue(DATA.dlg.wakeup2);
    UI.quest('집 밖으로 나가 보세요!');
    Player.enabled = true;
  },

  async goWorldmap2() {
    this.step = 'meetDonghyuk2';
    await World.go('worldmap', { x: -17, z: 19, ry: Math.PI });
    const d = Chars.donghyuk();
    World.addNPC(d, -8, 8, -Math.PI / 4);
    World.setBeacon(-8, 8);
    const zone = World.addZone(-8, 8, 2.2, '동혁이와 대화하기', async () => {
      zone.used = true;                      // 동혁이가 떠난다 — F 프롬프트 재등장 방지
      await UI.dialogue(DATA.dlg.donghyukQuest2);
      World.removeNPC(d);
      this.step = 'toSchool2';
      UI.quest('여러분은 학교로 등교해야 합니다. 서둘러 교실로 이동하세요!');
      World.setBeacon(17, -13.6);
    });
    UI.quest('동혁이에게 말을 걸어 보세요! (가까이 가서 F)');
    await this.sysMsg('(하늘이 조금 붉다... 하지만 이번엔 뭔가 다르게 해볼 수 있을 것 같아!)');
  },

  /* ═══════ 5-1 거울1(존중) : 거절할 권리 & 개인정보 ═══════ */
  async enterClassroom2() {
    this.step = 'ep_respect1';
    UI.clearQuest();
    await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
    this.setupClassroomNPCs(true);
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.respect1_intro);
    const pick = await UI.choice('노아가 다시 얼굴 데이터를 저장하려고 해요. 어떻게 할까요?', [
      { label: '😊 친절하고 정중하게 거절하기', value: 'decline' },
      { label: '🤷 지난번처럼 그냥 저장하게 두기', value: 'allow' },
    ]);
    State.set('logDecline', pick === 'decline');   // 행동 로그
    if (pick === 'allow') {
      await UI.dialogue([
        { speaker: '나(독백)', text: '(잠깐...! 지난번에 뭔가 께름칙했던 기분이 떠올라. 내 정보는 소중하니까, 이번엔 정중하게 거절해 보자!)' },
      ]);
    }
    await UI.dialogue(DATA.dlg.respect1_decline);
    await Mini.dataSort();
    await UI.dialogue(DATA.dlg.respect1_after);

    // 🎴 얼굴 스캔(거절) 직후 — 봉인 가위바위보 (공정한 재대결, 3-1 필승판과 수미상관)
    await UI.dialogue(DATA.dlg.rps2_intro);
    await Mini.rpsBattle('respect');
    await UI.dialogue(DATA.dlg.rps2_after);
    UI.setBond('respect', 20);               // 💙 거울1(존중) 완료
    await this.respect2();
  },

  /* ═══════ 5-2 거울2(존중) : 힌트만 받고 내 일기 스스로 완성 & 데이터 교정 ═══════ */
  async respect2() {
    await UI.dialogue(DATA.dlg.respect2_intro);
    await Mini.mathSelf();
    await UI.dialogue(DATA.dlg.respect2_after);
    // 📚 데이터 교정 — 같은 장난을 이번엔 내가 막고, 동혁이 사과·재학습 (편향은 고칠 수 있다)
    // 🔧 교정실(2-2): 사과 카드를 "내 손으로" 슬롯에 꽂는다 — 도구화의 도망가는 차단 버튼과 수미상관
    // ⚠ bias2[5..8](교정 완료·퀴즈·딩동댕)는 교정실 연출로 대체됨 — 대사를 추가/삭제하면 slice 경계 조정!
    await UI.dialogue(DATA.dlg.bias2.slice(0, 5));   // 장면 재현 → 내가 말림 → 동혁의 사과 "한글은 세종대왕이야!"
    await Mini.dataCorrector();                       // 오염 슬롯 ❌ → 내 손으로 교정 → 정화 → 퀴즈 재플립 → 🎊
    await UI.dialogue(DATA.dlg.bias2.slice(9));      // 마무리 독백 (💡 잘못 배운 것도 고칠 수 있어)
    UI.setBond('respect', 40);               // 💙 거울2(존중) 완료
    await this.respect3();
  },

  /* ═══════ 5-3 거울3(존중) : 참고만 하고 스스로 그리기 ═══════ */
  async respect3() {
    await UI.dialogue(DATA.dlg.respect3_intro);
    await Mini.artSelf();
    await UI.dialogue(DATA.dlg.respect3_after);
    UI.setBond('respect', 60);               // 💙 거울3(존중) 완료
    await UI.dialogue(DATA.dlg.chaewonQuest2);
    this.step = 'toPlayground2';
    UI.quest('친구들의 마음을 들어 보세요 (0/3) — 다 들으면 운동장으로!');
    const z = World.zones.find(z => z.label === '복도로 나가기');
    if (z) z.label = '운동장으로 가기';
    World.setBeacon(6, 5.2);
    World.addItem(-5.5, 1.5, 4.8, 'user1');
    this.addNoahChatZone(6, 0.6);          // 💬 자리에 앉은 노아에게 말 걸기
    await this.sysMsg('(교실 뒤쪽에 새로운 원칙 카드가 반짝이고 있다! 📔)');
    Player.enabled = true;
  },

  /* ═══════ 5-4 거울4(존중) : 우리 손으로 팀 편성 ═══════ */
  async enterPlayground2() {
    this.step = 'ep_respect4';
    UI.clearQuest();
    await World.go('playground', { x: 0, z: -2, ry: 0 });
    World.addNPC(Chars.teacher(), -4, -8, 0.5);
    this.addFriendZone('teacher', '선생님과 이야기하기', -4, -8);
    World.addNPC(Chars.donghyuk(), 4, 4, -0.8);
    this.addFriendZone('donghyuk', '동혁이와 이야기하기', 4, 4);
    World.addNPC(Chars.chaewon(), -4, 4, 0.8);
    this.addFriendZone('chaewon', '채원이와 이야기하기', -4, 4);
    for (let i = 0; i < 4; i++) {
      World.addNPC(Chars.student(i), -8 + i * 5, 9, Math.PI * 0.05 * i);
      this.addFriendZone('student', '친구와 이야기하기', -8 + i * 5, 9);
    }
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 0, 1, 0);   // 운동장 한가운데 노아
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.respect4_intro);
    await Mini.teamBuild();
    // ⚾ 티볼 Lv.1 — 딱! → 환호 → 컨페티 한 박자. 화면 전환 없이 소리로만 "경기가 있었다"를 전한다
    FX.batCrack();
    await UI.wait(300);
    FX.crowd(); FX.confetti({ y: 0.5, count: 90 });
    await UI.wait(1000);
    await UI.dialogue(DATA.dlg.respect4_after);
    UI.setBond('respect', 80);               // 💙 거울4(존중) 완료

    // ⑤ 서연의 인격화 서브 에피소드 — 반대편 벼랑도 경계하기 (관계 저울 게임)
    World.addNPC(Chars.seoyeon(), 1.8, 2.8, -0.9);
    this.addFriendZone('seoyeon', '서연이와 이야기하기', 1.8, 2.8);
    await UI.dialogue(DATA.dlg.seoyeonIntro);
    await Mini.balanceScale();
    await UI.dialogue(DATA.dlg.seoyeonAfter);

    // 🙌 모방 사건 수미상관 — 채원의 하이파이브를 배우는 노아 (좋은 행동도 그대로 배운다)
    await UI.dialogue(DATA.dlg.imitate2a);
    this.noahMoment('greet', { dist: 2.8, height: 1.4, lookH: 1.15 });  // 🎥 하이파이브 — 인사 클립
    // (2-3 스테이징 — 대사는 그대로. 동혁과의 하이파이브 직전에 허락 버튼+컷+컨페티. ⚠ imitate2b 대사를 추가/삭제하면 slice 경계 조정!)
    await UI.dialogue(DATA.dlg.imitate2b.slice(0, 2));                // 노아 "데이터 업데이트... 동혁님!" → 동혁 놀람
    await Mini.stopButton('permit');                                   // 🤚 노아가 허락을 구한다 — 도구화 멈춰 버튼과 같은 자리, 이번엔 통한다
    FX.confetti({ y: 0.45, count: 80 }); FX.cheer();
    await UI.dialogue(DATA.dlg.imitate2b.slice(2));                   // "(하이파이브 소리...)" → 동혁 "한 번 더!" → 독백
    this.noahRest();

    this.step = 'toHallway2';
    UI.quest('지금은 쉬는시간입니다. 복도로 이동하세요!');
    const z = World.zones.find(z => z.label === '학교로 들어가기');
    if (z) z.label = '복도로 가기';
    World.setBeacon(0, -18.4);
    World.addItem(5, 1.7, -12, 'user2');
    this.addNoahChatZone(0, 1);              // 💬 티볼장의 노아에게 말 걸기
    await this.sysMsg('(운동장 한쪽에 새로운 원칙 카드가 반짝이고 있다! 📔)');
    Player.enabled = true;
  },

  /* ═══════ 5-5 거울5(존중) : 노아에게 따뜻한 말 건네기 ═══════ */
  async enterHallway2() {
    this.step = 'hall2';
    UI.clearQuest();
    await World.go('hallway', { x: -14, z: 0, ry: Math.PI / 2 });
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 3, -1.5, Math.PI / 2);   // 창밖을 보는 노아
    World.addZone(1, 0, 2.4, '노아에게 다가가기', () => Flow.onZone('hall_scene'), true);
    World.setBeacon(1, 0);
    this.addLogDevice();                             // 💾 기록 장치에 새 파일이 도착해 있다
    World.addZone(-12, 2.2, 2.0, '기록 장치 살펴보기 (새 파일!)', () => Flow.readLogs5());
    World.addItem(-8, 1.5, 0, 'user3');              // 노아에게 가는 길목에 배치
    // 💬 복도의 친구들 — 5단계 깨달음 대사 (스토리 존이 먼저 등록되어 겹칠 때 우선권 가짐)
    World.addNPC(Chars.donghyuk(), -6, -1.8, 2.0);
    this.addFriendZone('donghyuk', '동혁이와 이야기하기', -6, -1.8);
    World.addNPC(Chars.chaewon(), -9, 1.8, -2.4);
    this.addFriendZone('chaewon', '채원이와 이야기하기', -9, 1.8);
    World.addNPC(Chars.seoyeon(), -4, 1.8, -2.7);
    this.addFriendZone('seoyeon', '서연이와 이야기하기', -4, 1.8);
    World.addNPC(Chars.teacher(), -11.5, -1.8, 1.4);
    this.addFriendZone('teacher', '선생님과 이야기하기', -11.5, -1.8);
    UI.quest('복도에 노아가 혼자 서 있어요. (기록 장치의 새 파일과 📔카드도 잊지 마세요!)');
    Player.enabled = true;
  },

  async respect5() {
    this.step = 'ep_respect5';
    UI.clearQuest();
    World.clearBeacon();
    await UI.dialogue(DATA.dlg.respect5_intro);
    const words = await Mini.compliment();
    await UI.dialogue([{ speaker: '나', text: words }]);
    await UI.dialogue(DATA.dlg.respect5_after);
    UI.setBond('respect', 95);               // 💙 거울5(존중) 완료

    // 노아의 자기 고백 — "저는 사람이 아니에요. 그런데도..." (탈의인화 + 도덕적 대우의 근거)
    // 🎥 카메라를 노아에게 밀어넣어 크게 잡고, 인정 클립(자동차형은 무시)으로 진심을 전한다
    this.noahMoment('idle', { dist: 2.7, height: 1.4, lookH: 1.15 });
    // 💠 P3: noahConfession 연출화 — [0]~[1]은 대비 패널 무대가 대체, [2]~[5]는 대사 게이트 그대로.
    //    [4]의 거울은 3D 카메라 연출: 카메라를 휙 반전해 '나 자신'을 바라보며 핵심 문장을 읽는다.
    // ⚠ noahConfession 대사를 추가/삭제하면 아래 인덱스 조정!
    await Mini.truthCircuit();                         // 대비 패널: 사람↔노아 ([0]~[1] 대체)
    await UI.dialogue([DATA.dlg.noahConfession[2]]);   // 동혁 반문 — 갈등 비트는 말이 강함
    FX.vignette(true);                                 // 🌑 감광 무드 — 조명 트윈 대신 비네트로
    await UI.dialogue([DATA.dlg.noahConfession[3]]);   // 노아 "아니요! 그런데도..." (노아 클로즈업 유지)
    // 🪞 거울 샷 — 플레이어를 노아 쪽으로 돌려세우고(벽 클리핑 방지 + '노아의 눈으로 나를 본다' 구도),
    //    카메라를 휙 반전해 자기 자신을 조금 멀리서 바라보게 한다
    const meG = Player.char.group;
    if (this.noah) {
      const p = this.noah.group.position;
      const face = Math.atan2(p.x - meG.position.x, p.z - meG.position.z);
      Player.yaw = face; meG.rotation.y = face;
    }
    Player.focusOn(meG, { snap: true, dist: 4.5, height: 1.7, lookH: 1.1 });
    FX.whoosh();
    await UI.dialogue([DATA.dlg.noahConfession[4]]);   // 핵심 문장 — 내 모습을 바라보며 읽는다
    await UI.dialogue([DATA.dlg.noahConfession[5]]);   // 마무리 독백 — 거울 샷 유지한 채
    FX.vignette(false);
    this.noahRest();                                   // 카메라 복귀 + 노아 idle (입력은 이후 흐름이 관리)

    // ═══ 🪜 약속의 계단 — 9원칙 제목↔뜻 복습 등반 (기억 풍선 개편판) ═══
    await UI.dialogue(DATA.dlg.stairsIntro);
    await Mini.stairsGame();
    await UI.dialogue(DATA.dlg.stairsDone);

    // ═══ 도덕에 기반을 둔 공존·상생의 관계로! 약속 3가지 + 서명 ═══
    await this.sysMsg('여러분은 노아와 <도덕에 기반을 둔 공존·상생의 관계>를 만들어가고 있어요! 이제 마지막 마무리를 해볼까요?');
    const promises = await Mini.choosePromises();
    State.set('promises', promises);
    await UI.dialogue([
      { speaker: '노아', text: '멋진 약속이에요! 저도 여러분에게 안전하고 따뜻한 로봇...이 되도록 노력할게요!', emotion: 'happy' },
    ]);

    // ⑥ 스스로 정하는 관계 문항 — "나는 노아를 ___(으)로 대하겠습니다"
    await UI.dialogue(DATA.dlg.relationAsk);
    const rel = await UI.textInput('나는 앞으로 노아를 _________(으)로 대하겠습니다. <br> (스스로 정하는 우리의 관계!)',
      '예) 반 친구, 똑똑한 도우미, 특별한 짝꿍, ...', '정답은 없어요! 노아는 사람도, 단순한 도구도 아니니까요.');
    State.set('relationDef', rel);
    await UI.dialogue([
      { speaker: '노아', text: `'${rel}'... 저장하지 않아도 잊을 수 없는 대답입니다. 그 마음을 헌장에 새겨 주세요!`, emotion: 'happy' },
    ]);

    // 📋 오늘의 배움 점검 — 학습목표 3가지 자기평가 (헌장 하단에 함께 인쇄)
    //    약속을 정하고 → 스스로 돌아보고 → 서명하는 순서. 반드시 헌장 생성(realEnding) 전에 저장할 것.
    await UI.dialogue([
      { speaker: '노아', text: '서명하기 전에, 오늘 배운 것을 스스로 한 번 돌아볼까요? 정답은 없어요!', emotion: 'happy' },
    ]);
    State.set('selfEval', await Mini.selfRubric());

    await Mini.signature();
    UI.setBond('respect', 100);              // 💙 존중 100% 달성!
    await UI.wait(1400);

    // ═══ 6단계: 엔딩 ═══
    await Endings.realEnding();
  },
};
