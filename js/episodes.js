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
    this.logsRead = false; this.logs5Read = false; this._chatIdx = 0;
    UI.updateNotebook();
    UI.hideBond();
    State.set('bond', 0); State.set('bondType', 'intimacy');
    State.set('favorite', '');
    World.build('home');
    Player.spawnChar();
    Player.setPos(-1.5, 0, -1.5, Math.PI / 2);
    Player.snapCamera();
    await UI.fadeIn();
    await UI.dialogue(DATA.dlg.wakeup);
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

  /* ═══════ 💬 노아 잡담 시스템 — 기억해주는 로봇 ═══════ */
  _chatIdx: 0,
  fillFav(lines, fav) {
    return lines.map(l => Object.assign({}, l, { text: l.text.replace(/%FAV%/g, fav) }));
  },
  async noahChat() {
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
    World.addNPC(d, 6, -6, -Math.PI / 4);
    World.setBeacon(6, -6);
    World.addZone(6, -6, 2.2, '동혁이와 대화하기', async () => {
      await UI.dialogue(DATA.dlg.donghyukQuest1);
      World.removeNPC(d);
      this.step = 'toSchool';
      UI.quest('여러분은 학교로 등교해야 합니다. 서둘러 교실로 이동하세요!');
      World.setBeacon(17, -13.6);
    });
    UI.quest('저기 있는 동혁이에게 말을 걸어 보세요! (가까이 가서 F)');
    await this.sysMsg('(저 앞에서 동혁이가 나를 향해 손을 흔들고 있다!)');
  },

  /* ═══════ 교실 NPC 배치 도우미 ═══════ */
  setupClassroomNPCs(withNoah) {
    World.addNPC(Chars.teacher(), -3.5, -3.7, 0);
    const seats = [[-4.5, -1.1], [-1.5, -1.1], [4.5, -1.1], [-4.5, 1.5], [4.5, 1.5], [-1.5, 4.1]];
    seats.forEach((s, i) => World.addNPC(Chars.student(i), s[0], s[1], Math.PI));
    World.addNPC(Chars.donghyuk(), 1.5, 1.5, Math.PI);
    World.addNPC(Chars.chaewon(), 1.5, 4.1, Math.PI);
    if (withNoah) {
      this.noah = Chars.noah(State.get('noahDesign'));
      World.addNPC(this.noah, 4.5, 0.6, Math.PI);
    }
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
    UI.clearQuest();
    await World.go('classroom', { x: 3.0, z: 4.8, ry: Math.PI });
    this.setupClassroomNPCs(false);
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.mirror1_intro);

    // customTrigger: noah_design — human / animal / car
    const design = await Mini.noahDesign();
    State.set('noahDesign', design);
    await this.assembleNoah(0, -3.5);
    UI.setBond('intimacy', 15);              // 💕 노아와의 첫 만남!
    await UI.dialogue(DATA.dlg.mirror1_noahArrive);

    // 나에게 친구란 ___ (def / reason 저장)
    const def = await UI.textInput('나에게 친구란 _______ (이)다.', '예) 보물, 그늘 같은 사람...', '빈칸에 들어갈 나만의 말을 적어 보세요.');
    State.set('friendDef', def);
    const reason = await UI.textInput('그렇게 생각하는 이유는?', '이유를 자유롭게 적어 보세요', '', true);
    State.set('friendReason', reason);

    await UI.dialogue(DATA.dlg.mirror1_greet);

    // 수미상관 질문 ① (3단계)
    const ox = await UI.oxQuestion('당신은 인공지능 로봇과 친구가 될 수 있다고 생각하나요?', 'O 또는 X를 선택해 주세요. 정답은 없어요!');
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
    UI.setBond('intimacy', 30);              // 💕 거울1 완료

    await this.mirror2();
  },

  /* ═══════ 3-2 거울2 : 수학 대결 & 숙제 떠넘기기 ═══════ */
  async mirror2() {
    await UI.dialogue(DATA.dlg.mirror2_intro);
    await Mini.mathBattle();
    await UI.dialogue(DATA.dlg.mirror2_after);
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
    this.step = 'toPlayground';
    UI.quest('지금은 체육시간입니다. 운동장으로 이동하세요!');
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
    UI.clearQuest();
    await World.go('playground', { x: 0, z: -16, ry: 0 });
    World.addNPC(Chars.teacher(), -4, -8, 0.5);
    World.addNPC(Chars.donghyuk(), 4, 4, -0.8);
    World.addNPC(Chars.chaewon(), -4, 4, 0.8);
    for (let i = 0; i < 4; i++) World.addNPC(Chars.student(i), -8 + i * 5, 9, Math.PI * 0.05 * i);
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 0, 1, Math.PI);
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.mirror4_intro);
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
    // ═══ 4단계: 가짜 엔딩 → 시스템 오류 → 재시작(7942) ═══
    await Endings.fakeEnding();
    await this.startPhase2();
  },

  /* ═══════ 5단계 시작 : 붉은 월드맵, 집에서 재시작 ═══════ */
  async startPhase2() {
    this.phase = 2; this.step = 'home2';
    World.redMode = true;
    UI.clearQuest();
    UI.setBond('respect', 1);                // 💙 존중 게이지로 전환 (1%부터 다시)
    await UI.fadeOut();
    World.build('home');
    Player.setPos(-1.5, 0, -1.5, Math.PI / 2);
    Player.snapCamera();
    await UI.fadeIn();
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
    World.addZone(-8, 8, 2.2, '동혁이와 대화하기', async () => {
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
    if (pick === 'allow') {
      await UI.dialogue([
        { speaker: '나(독백)', text: '(잠깐...! 지난번에 뭔가 께름칙했던 기분이 떠올라. 내 정보는 소중하니까, 이번엔 정중하게 거절해 보자!)' },
      ]);
    }
    await UI.dialogue(DATA.dlg.respect1_decline);
    await Mini.dataSort();
    await UI.dialogue(DATA.dlg.respect1_after);
    UI.setBond('respect', 20);               // 💙 거울1(존중) 완료
    await this.respect2();
  },

  /* ═══════ 5-2 거울2(존중) : 팁만 받고 스스로 풀기 ═══════ */
  async respect2() {
    await UI.dialogue(DATA.dlg.respect2_intro);
    await Mini.mathSelf();
    await UI.dialogue(DATA.dlg.respect2_after);
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
    UI.quest('지금은 체육시간입니다. 운동장으로 이동하세요!');
    const z = World.zones.find(z => z.label === '복도로 나가기');
    if (z) z.label = '운동장으로 가기';
    World.setBeacon(6, 5.2);
    World.addItem(-5.5, 1.5, 4.8, 'user1');
    this.addNoahChatZone(4.5, 0.6);          // 💬 자리에 앉은 노아에게 말 걸기
    await this.sysMsg('(교실 뒤쪽에 새로운 원칙 카드가 반짝이고 있다! 📔)');
    Player.enabled = true;
  },

  /* ═══════ 5-4 거울4(존중) : 우리 손으로 팀 편성 ═══════ */
  async enterPlayground2() {
    this.step = 'ep_respect4';
    UI.clearQuest();
    await World.go('playground', { x: 0, z: -16, ry: 0 });
    World.addNPC(Chars.teacher(), -4, -8, 0.5);
    World.addNPC(Chars.donghyuk(), 4, 4, -0.8);
    World.addNPC(Chars.chaewon(), -4, 4, 0.8);
    for (let i = 0; i < 4; i++) World.addNPC(Chars.student(i), -8 + i * 5, 9, Math.PI * 0.05 * i);
    this.noah = Chars.noah(State.get('noahDesign'));
    World.addNPC(this.noah, 0, 1, Math.PI);
    Player.enabled = false;

    await UI.dialogue(DATA.dlg.respect4_intro);
    await Mini.teamBuild();
    await UI.dialogue(DATA.dlg.respect4_after);
    UI.setBond('respect', 80);               // 💙 거울4(존중) 완료

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
    await UI.dialogue(DATA.dlg.noahConfession);

    // ═══ 도덕에 기반을 둔 공존·상생의 관계로! 약속 3가지 + 서명 ═══
    await this.sysMsg('여러분은 노아와 <도덕에 기반을 둔 공존·상생의 관계>를 만들어가고 있어요! 이제 마지막 마무리를 해볼까요?');
    const promises = await Mini.choosePromises();
    State.set('promises', promises);
    await UI.dialogue([
      { speaker: '노아', text: '멋진 약속이에요! 저도 여러분에게 안전하고 따뜻한 친구...가 되도록 노력할게요!', emotion: 'happy' },
    ]);
    await Mini.signature();
    UI.setBond('respect', 100);              // 💙 존중 100% 달성!
    await UI.wait(1400);

    // ═══ 6단계: 엔딩 ═══
    await Endings.realEnding();
  },
};
