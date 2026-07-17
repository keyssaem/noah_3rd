/* ═══════════ Endings — 4단계 반전 & 6단계 마무리 ═══════════ */
const Endings = {

  vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {} },

  /* 패널이 유리처럼 3D 조각으로 깨져 흩어진다 — 오버레이는 'fx3d' 클래스 필요.
     동작 줄이기 설정이거나 애니메이션 미지원이면 그냥 닫는다 */
  async shatterPanel(ov) {
    const panel = ov.querySelector('.ov-panel');
    if (!UI.motionOK() || !panel || !panel.animate) { UI.close(ov); return; }

    // 균열 전조 — 짧은 요동 + 파열음
    panel.style.animation = 'glitchShake .09s steps(2) 3';
    Sound.glass(); this.vibrate(120);
    await UI.wait(300);

    // 4×4 격자의 안쪽 점을 흔들어 유리 조각 모양 다각형 생성 (조각 16개 상한)
    const r = panel.getBoundingClientRect();
    const stage = document.createElement('div');
    stage.className = 'shatter-stage';
    stage.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    const N = 4, pts = [];
    for (let i = 0; i <= N; i++) {
      pts[i] = [];
      for (let j = 0; j <= N; j++) {
        const jit = (i > 0 && i < N && j > 0 && j < N) ? 9 : 0;
        pts[i][j] = [j / N * 100 + (Math.random() * 2 - 1) * jit,
                     i / N * 100 + (Math.random() * 2 - 1) * jit];
      }
    }
    const html = panel.outerHTML;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const p = [pts[i][j], pts[i][j + 1], pts[i + 1][j + 1], pts[i + 1][j]];
      const shard = document.createElement('div');
      shard.className = 'shard';
      shard.style.clipPath = `polygon(${p.map(q => q[0].toFixed(1) + '% ' + q[1].toFixed(1) + '%').join(',')})`;
      shard.innerHTML = html;
      stage.appendChild(shard);
      const cx = (j + 0.5) / N - 0.5, cy = (i + 0.5) / N - 0.5;   // 중심에서 바깥으로
      shard.animate([
        { transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg)', opacity: 1 },
        { transform: `translate3d(${cx * 260 + Math.random() * 60 - 30}px,
                                  ${cy * 140 + 180 + Math.random() * 120}px,
                                  ${90 + Math.random() * 240}px)
                      rotateX(${(Math.random() * 2 - 1) * 140}deg)
                      rotateY(${(Math.random() * 2 - 1) * 140}deg)`, opacity: 0 },
      ], { duration: 950 + Math.random() * 450, delay: Math.random() * 130,
           easing: 'cubic-bezier(.25,.1,.5,1)', fill: 'forwards' });
    }
    panel.style.visibility = 'hidden';
    ov.appendChild(stage);
    Sound.error();
    await UI.wait(1250);
    UI.close(ov);
  },

  /* ═══════ 4-1 가짜 엔딩 → 시스템 오류 ═══════ */
  async fakeEnding() {
    // 가짜 축하 화면
    const ov = UI.overlay(`
      <div class="ov-panel">
        <h3>🎉 축하합니다! 🎉</h3>
        <p>이렇게 여러분은 인공지능 로봇 노아와<br><b>높은 친밀도</b>를 형성하였습니다.</p>
        <div class="stat-row"><div class="stat-label" style="color:#495057;"><span>💕 친밀도</span><span>100%</span></div>
          <div class="stat-bar"><div class="stat-fill pink" style="width:0%;"></div></div></div>
        <p class="fake-msg">이대로 모험을 마칠...</p>
      </div>`, 'fx3d');
    Sound.win();
    await UI.wait(80);
    ov.querySelector('.stat-fill').style.width = '100%';
    await UI.wait(2800);

    // 축하 화면이 유리처럼 깨진다 → 지지직! 시스템 오류
    await this.shatterPanel(ov);
    // 🎥 깨진 화면 너머로 드러난 노아가 두려워하는 모습을 카메라가 확 밀어넣어 크게 잡는다
    Flow.noahMoment('scared', { dist: 2.6, height: 1.4, lookH: 1.2, snap: true });
    // ── 1막 · 균열(소리만) — 크랙 시각 연출은 기각. 탁, 탁, 탁 파열음+흔들림+진동 4박자로 긴장만 쌓는다
    await UI.wait(450);
    for (let i = 0; i < 4; i++) {
      Sound.glass(); FX.shake(11, 280); this.vibrate(70);
      await UI.wait(i === 3 ? 620 : 460 - i * 40);   // 탁, 탁, 탁 — 점점 급해진다
    }
    const glitch = UI.els.glitch;
    glitch.classList.remove('hidden'); glitch.classList.add('on');
    UI.bondBetray();                       // 💔 HUD 친밀도 게이지의 정체가 '도구화'로 드러난다
    this.vibrate([200, 80, 200, 80, 400, 100, 600]);
    Sound.error();
    await UI.wait(1600);

    const err = UI.overlay(`
      <div class="err-title">⚠ 시스템 오류 ⚠</div>
      <div class="err-sub">SYSTEM ERROR :: NOAH_CORE MORAL_RELATION_NOT_FOUND</div>
      <div class="err-sub">관계 데이터 검사 중 . . .</div>`, 'sys-error');
    Sound.error(); this.vibrate([300, 100, 300, 100, 500]);
    await UI.wait(3200);
    glitch.classList.remove('on'); glitch.classList.add('hidden');
    UI.close(err);

    // ── 2막 · 진짜 꺼짐 — CRT 파워오프: 화면이 가로 한 줄로 수축 → 흰 점 → 완전 암전.
    //    지지직 3연발 뒤 소리까지 뚝 끊긴다. 암전 1.5초 — 교실이 조용해지는 정적.
    await FX.crtOff({ hold: 1500 });

    // ─── 새로운 화면: 노아 혼자, 교수님의 말을 떠올린다 ───
    const recall = UI.bigText(['. . . . . .', '🤖\n\n(어두운 화면 속, 노아 혼자.)',
      '노아는 연구소에서 교수님이 했던 말을\n하나씩 떠올린다...'], { bg: 'rgba(2,2,8,.98)' });
    FX.blackRelease();   // 회상 화면이 선 뒤에야 암전막을 걷는다 — 월드가 한 프레임도 새지 않게
    await recall;
    // 🎬 회상 컷씬 — 교수님이 노아 셋을 만들던 날 (스킵 불가: 반전의 핵심)
    await UI.playVideo('media/professor2.mp4');
    await UI.bigText(DATA.dlg.professorLines, { bg: 'rgba(2,2,8,.98)', must: true });  // 📖 교수님 회상: 스킵 불가

    // 📔 도덕 수첩 회상 연동 — 수집 활동이 반전의 복선으로 회수된다
    const ethicsN = ['ethics1', 'ethics2', 'ethics3'].filter(id => State.has(id)).length;
    await UI.bigText([
      ethicsN > 0
        ? `...어디서 본 말들 같지 않나요?\n\n여러분이 📔 도덕 수첩에 모은,\n바로 그 **인공지능 윤리 3대 원칙**입니다. (${ethicsN}/3)`
        : '...이 약속들은,\n언젠가 여러분이 만나게 될 원칙들입니다.\n지금, 마음에 꼭 담아 주세요.',
    ], { bg: 'rgba(2,2,8,.98)' });

    // 혼란스러워하는 노아 클로즈업
    const noahClose = UI.overlay(`
      <div style="font-size:clamp(90px,22vw,180px); animation:glitchShake .12s steps(2) infinite;">😞💔🤖</div>
      <div class="bigtext-line" style="color:#ff8888;">"안돼.. 안돼..!!!!!!!!!!"</div>`, 'bigtext-ov');
    Sound.error(); this.vibrate([100, 50, 100, 50, 100, 50, 800]);
    await UI.wait(2600);
    UI.close(noahClose);

    // 화면 펑!
    const flash = UI.overlay('', '');
    flash.style.background = '#fff';
    Sound.error();
    await UI.wait(350);
    UI.close(flash);

    // 수미상관 회고
    await UI.bigText([
      `당신은 분명...\n**친구**란 "${State.get('friendDef')}"라고 했으며,`,
      `**그 이유**는\n"${State.get('friendReason')}"\n...라고 했습니다.`,
      '인공지능 로봇과 친구가 될 수도 있고,\n안 될 수도 있습니다.',
      "하지만 당신은 인공지능 로봇과\n**'도덕적'**으로 관계를 맺지 않았습니다.",
    ], { bg: 'rgba(2,2,8,.98)' });

    // 숨은 수치 공개 (3구간 스펙트럼 + 이중표기 게이지)
    await this.statReveal();

    // 재프레이밍 — 감정은 로봇이 아니라 '우리'의 것 (지도서 지도 중점)
    await UI.bigText([
      '노아는 슬퍼서 멈춘 것이 아닙니다.\n**도덕 원칙과는 다른 [관계 데이터]** 때문에,\n동작을 멈춘 것입니다...'
      
    ], { bg: 'rgba(2,2,8,.98)' });

    // 강제 종료 & 재시작 (7942)
    await this.shutdownAndRestart();
  },

  /* 친밀도 100%? → 3구간 관계 스펙트럼 + 도구화 100% / 존중 10%→1% (이중표기) */
  statReveal() {
    return new Promise(async resolve => {
      const ov = UI.overlay(`
        <div style="width:min(640px,94vw);">
          <h3 style="color:#fff; text-align:center; font-size:clamp(22px,4vw,34px); margin-bottom:14px;">친밀도: 100% ...?</h3>

          <div class="spectrum hidden sp">
            <div class="spec-zones">
              <div class="spec-zone bad">🔧 도구화<small>단순한 도구로 봄<br>(도덕에 기반하지 않은 관계)</small></div>
              <div class="spec-zone good">💙 바람직한 관계<small>도덕에 기반을 둔 관계</small></div>
              <div class="spec-zone bad2">👤 인격화<small>인간과 똑같이 봄</small></div>
            </div>
            <div class="spec-track"><div class="spec-needle">▼</div></div>
            <p class="spec-msg">지금, 당신과 노아의 관계는 어디쯤일까요?</p>
          </div>

          <div class="stat-row hidden h1"><div class="stat-label">
              <span>🔧 도구화 <small>도덕에 기반하지 않은 관계</small></span><span class="v1">0%</span></div>
            <div class="stat-bar"><div class="stat-fill red f1" style="width:0%;"></div></div></div>
          <div class="stat-row hidden h2"><div class="stat-label">
              <span>💙 존중 <small>도덕에 기반을 둔 관계</small></span><span class="v2">10%</span></div>
            <div class="stat-bar"><div class="stat-fill blue f2" style="width:10%;"></div></div></div>
          <p style="color:#adb5bd; text-align:center; margin-top:16px;" class="tap-msg"></p>
        </div>`, 'bigtext-ov');

      // ① 3구간 스펙트럼 등장 → 바늘이 '도구화' 구역 끝까지 미끄러진다
      await UI.wait(1400);
      const sp = ov.querySelector('.sp'), needle = ov.querySelector('.spec-needle'), msg = ov.querySelector('.spec-msg');
      sp.classList.remove('hidden');
      await UI.wait(1600);
      Sound.error(); this.vibrate(300);
      needle.style.left = '4%';
      await UI.wait(2000);
      msg.innerHTML = '🔧 <b>도구화 구역</b> — 노아를 단순한 도구로 대해 왔습니다.';
      await UI.wait(1600);

      // ② 도구화 게이지 0% → 100%
      ov.querySelector('.h1').classList.remove('hidden');
      Sound.error(); this.vibrate(300);
      await UI.wait(300);
      ov.querySelector('.f1').style.width = '100%';
      const v1 = ov.querySelector('.v1');
      for (let i = 0; i <= 100; i += 4) { v1.textContent = i + '%'; await UI.wait(46); }
      await UI.wait(900);

      // ③ 존중 수치가 10% → 1%로 빠르게 떨어진다
      ov.querySelector('.h2').classList.remove('hidden');
      await UI.wait(1100);
      const v2 = ov.querySelector('.v2'), f2 = ov.querySelector('.f2');
      f2.style.transition = 'width .8s'; f2.style.width = '1%';
      for (let i = 10; i >= 1; i--) { v2.textContent = i + '%'; Sound.tone(200 + i * 30, 0.06, 'square', 0.1); await UI.wait(90); }
      v2.style.color = '#ff6b6b';
      await UI.wait(1500);
      ov.querySelector('.tap-msg').textContent = '▼ 화면을 눌러 계속하기';
      ov.addEventListener('pointerdown', () => { UI.close(ov); resolve(); }, { once: true });
    });
  },

  /* 🖥 3막 · 재부팅 부트 시퀀스 — 검은 화면에 초록 모노스페이스 타이핑 + 커서 깜빡임.
     "학생이 직접 코드를 입력해 노아를 다시 켠다"(7942 다이얼)에 의미를 입히는 다리.
     동작 줄이기 설정이면 타이핑 없이 줄 단위로 즉시 표시 */
  async bootSequence() {
    const ov = UI.overlay('<div class="boot-term"></div>', 'boot-ov');
    const term = ov.querySelector('.boot-term');
    const cursor = document.createElement('span');
    cursor.className = 'boot-cursor';
    const typeLine = async text => {
      const line = document.createElement('div');
      line.className = 'boot-line';
      const span = document.createElement('span');
      line.appendChild(span); line.appendChild(cursor);   // 커서는 항상 마지막 줄 끝으로 이동
      term.appendChild(line);
      if (!UI.motionOK()) { span.textContent = text; Sound.tick(); await UI.wait(500); return;  }
      for (let i = 0; i < text.length; i++) {
        span.textContent += text[i];
        if (i % 2 === 0) Sound.tick();
        await UI.wait(30);
      }
    };
    await UI.wait(600);
    await typeLine('> 노아 v1.0 — 재시작 시도...');
    await UI.wait(700);
    await typeLine('> [관계 데이터]가 정상인가?');
    await UI.wait(900);                                   // 검사 중 — 긴장의 한 박자
    const fail = document.createElement('span');          // [오류] — 빨간 도장이 쾅
    fail.className = 'fail'; fail.textContent = ' [오류]';
    cursor.parentElement.insertBefore(fail, cursor);
    Sound.error(); FX.shake(7, 300); this.vibrate(150);
    await UI.wait(1300);
    await typeLine('> 수동 재시작 필요: 비밀 코드를 입력하세요');
    await UI.wait(1400);                                  // 커서만 깜빡 — '내 차례'임을 느끼는 시간
    UI.close(ov);
  },

  /* ═══════ 4-2 노아 강제 종료 & 재시작(비밀번호 7942) ═══════ */
  shutdownAndRestart() {
    return new Promise(async resolve => {
      await UI.bigText([
        '🤖\n. . . 시 스 템 . . . 종 료 . . .',
        '⬛\n\n[ NOAH :: SHUTDOWN ]',
      ], { bg: '#000' });

      // ── 3막 · 재부팅 몰입 — 곧장 대사가 아니라 터미널 부트 시퀀스부터
      await this.bootSequence();

      const ov = UI.overlay(`
        <div style="text-align:center; max-width:min(560px,94vw);">
          <div style="font-size:70px; filter:grayscale(1) brightness(.5);">🤖</div>
          <h3 style="color:#fff; font-size:clamp(20px,3.4vw,30px); margin:14px 0;">노아가 강제 종료되었습니다.</h3>
          <p style="color:#adb5bd; margin-bottom:14px;">재시작하려면 선생님께 비밀 코드 4자리를 여쭤보고, <br> 다이얼을 돌려 맞춰 주세요.</p>
          <div class="safe-dials"></div>
          <div class="ov-choices" style="flex-direction:row; justify-content:center;">
            <button class="choice-btn hint">💡 힌트 보기</button>
            <button class="choice-btn go" style="background:#c92a2a; border-color:#a61e1e; color:#fff;">🔄 재시작</button>
          </div>
          <p class="hint-msg" style="color:#ffe066; min-height:3em; margin-top:12px; font-size:clamp(14px,2.2vw,18px);"></p>
        </div>`, 'bigtext-ov');

      // 3D 원통 롤러 다이얼 4개 — 숫자 10개를 36°씩 원통에 배치
      const dialsEl = ov.querySelector('.safe-dials'), msg = ov.querySelector('.hint-msg');
      const vals = [0, 0, 0, 0], rots = [0, 0, 0, 0];
      for (let d = 0; d < 4; d++) {
        const el = document.createElement('div');
        el.className = 'dial';
        el.innerHTML = `
          <button class="dial-btn up">▲</button>
          <div class="dial-window"><div class="dial-drum">${
            Array.from({ length: 10 }, (_, n) =>
              `<div class="dial-digit" style="transform:rotateX(${n * 36}deg) translateZ(68px)">${n}</div>`).join('')
          }</div></div>
          <button class="dial-btn down">▼</button>`;
        const drum = el.querySelector('.dial-drum');
        const spin = dir => {
          rots[d] -= dir * 36;
          vals[d] = ((vals[d] + dir) % 10 + 10) % 10;
          drum.style.transform = `rotateX(${rots[d]}deg)`;
          Sound.tick();
        };
        el.querySelector('.up').onclick = () => spin(1);
        el.querySelector('.down').onclick = () => spin(-1);
        dialsEl.appendChild(el);
      }

      ov.querySelector('.hint').onclick = () => {
        Sound.chime();
        msg.innerHTML = '👩\u200D🏫 선생님의 귓속말: "노아가 우리와 되고 싶은 사이는...<br>숫자로 <b>칠(7)·구(9)·사(4)·이(2)</b> 라고 읽는단다!"';
      };
      let done = false;
      ov.querySelector('.go').onclick = async () => {
        if (done) return;
        if (vals.join('') === '7942') {
          done = true;
          Sound.win();
          ov.querySelectorAll('.dial-window').forEach(w => w.classList.add('ok'));
          msg.innerHTML = '✅ 코드 일치! — 7942 : <b>친(7)구(9) 사(4)이(2)</b> —<br>노아를 재시작합니다...';
          await UI.wait(2000);
          FX.blackHold();     // 암전막을 세운 채 다이얼을 걷는다 — 재부팅(startPhase2의 crtOn) 직전의 어둠
          UI.close(ov);
          resolve();
        } else {
          Sound.error(); this.vibrate(200);
          dialsEl.classList.remove('wrong'); void dialsEl.offsetWidth; dialsEl.classList.add('wrong');
          msg.textContent = '❌ 코드가 틀렸어요. 힌트를 눌러 보세요!';
        }
      };
    });
  },

  /* 🏅 엔딩 분기 판정 — 세 칭호 모두 굿엔딩, 우열 없음 */
  pickEnding() {
    const nb = DATA.moralItems.filter(i => State.has(i.id)).length;
    if (nb >= DATA.moralItems.length && Flow.logs5Read) return DATA.endings.researcher;
    if (State.get('ox2') === 'O' && ((State.get('chatCount') || 0) >= 2 || State.get('favorite'))) return DATA.endings.bestie;
    return DATA.endings.neighbor;
  },

  /* ═══════ 6-1 엔딩 ═══════ */
  async realEnding() {
    await UI.fadeOut();
    UI.hide(UI.els.hud);

    // 마지막 재질문 (수미상관 구조)
    const ov = UI.overlay(`
      <div class="bigtext-line">[ 마지막 재질문 ]\n\n다음 질문에 정답은 없습니다.</div>
      <div class="bigtext-tap">▼ 화면을 눌러 계속하기</div>`, 'bigtext-ov');
    UI.els.fade.classList.remove('on');
    await new Promise(r => ov.addEventListener('pointerdown', r, { once: true }));
    UI.close(ov);

    const ans = await UI.oxQuestion('당신은 인공지능 로봇과 친구가 될 수 있다고 생각하나요?', '처음과 같은 질문이에요. 지금의 생각을 솔직하게 답해 주세요.', State.get('ox1'));
    State.set('ox2', ans);
    const reason = await UI.textInput('그렇게 생각한 이유는 무엇인가요?', '이유를 자유롭게 적어 주세요', '', true);
    State.set('ox2Reason', reason);

    await UI.bigText(DATA.endingLines, { bg: 'rgba(8,12,40,.97)' });
    Sound.win();

    // ═══ 🏅 엔딩 연출 분기 — 노아의 작별 인사 + 칭호 수여 ═══
    const ed = this.pickEnding();
    this._ending = ed;
    await UI.bigText(ed.lines, { bg: 'rgba(8,12,40,.97)' });
    await UI.bigText([
      '오늘의 당신에게,\n이 칭호를 드립니다.',
      `${ed.stamp}\n\n**${ed.title}**`,
    ], { bg: 'rgba(8,12,40,.97)' });
    Sound.win(); UI.hearts(8);

    // 6-2 헌장 다운로드
    await this.charter();
    // 6-3 🎬 엔딩 영상 — 내가 고른 노아 디자인으로 분기 (인간형 / 그 외=동물·자동차형)
    //     로드 실패(파일 미배포·file://)해도 playVideo가 error→통과하므로 안전
    const endVid = State.get('noahDesign') === 'human' ? 'ending_human_ver.mp4' : 'ending_animal_ver.mp4';
    await UI.playVideo('media/temporary_files/' + endVid, { skip: true, skipDelay: 5000 });
    // 6-4 쿠키 마무리 문구
    await UI.bigText(DATA.cookieLines, { bg: 'rgba(2,2,8,.98)' });

    // ═══ 💌 히든 엔딩 — 노아의 진짜 편지 (수첩 9/9 + 새 기록 열람) ═══
    const hiddenOk = DATA.moralItems.filter(i => State.has(i.id)).length >= DATA.moralItems.length && Flow.logs5Read;
    if (hiddenOk) {
      Sound.error();
      this.vibrate([100, 60, 100]);
      await UI.bigText(['. . . 지 지 직 . . .', '숨겨진 파일이 발견되었습니다:\n\n**letter_to_friend.txt**'], { bg: '#000' });
      const rel = State.get('relationDef') || '좋은 이웃';
      await Mini.noahLog([{
        title: '[letter_to_friend.txt — 노아가 스스로 저장한 첫 파일]',
        lines: DATA.hiddenLetter.map(l => State.fill(l).replace(/%REL%/g, rel)),
        warn: '✅ 이 파일은 영원히 보관됩니다.',
      }]);
      UI.hearts(12);
      Sound.win();
    } else {
      await UI.bigText(['(...노아의 저장소에 잠긴 파일이\n하나 남아 있는 것 같다.)\n\n📔 수첩 9개를 모두 채우고,\n복도의 새 기록까지 읽으면 열릴지도...?'], { bg: '#000' });
    }

    const fin = UI.overlay(`
      <div style="text-align:center;">
        <img class="ending-noah" src="media/temporary_files/ending_noah_image.png" alt="노아"
             style="width:min(340px,64vw); height:auto; margin-bottom:8px;"
             onerror="this.outerHTML='<div style=\\'font-size:90px\\'>🤖💙</div>'">
        <p style="color:#ffe066; font-size:clamp(16px,2.6vw,22px); margin-bottom:4px;">${ed.stamp} ${ed.title}</p>
        <h1 style="color:#fff; font-size:clamp(20px,4vw,35px); margin:10px 0 16px;"> 인공지능 로봇 <노아>와의 시뮬레이션 모험을 통하여, <br>
      로봇에 대한 <도덕적 태도>의 중요성을 이해하는 시간이 되었길 바라요.</h1>
        <h1 style="color:#ffe066;">
                <노아>와 함께해줘서 진심으로 고마워요💌, ${State.get('name')}!</h1>
        <div class="ov-choices"><button class="choice-btn again">🏠 처음 화면으로</button></div>
      </div>`, 'bigtext-ov');
    fin.querySelector('.again').onclick = () => location.reload();
  },

  /* ═══════ 6-2 약속 헌장 이미지 생성 & 다운로드 ═══════ */
  /* 둥근 사각형 경로 (구형 브라우저 대응 — ctx.roundRect 미의존, 수동 arcTo) */
  _roundRectPath(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  },

  /* 헌장 본문을 그리는 공통 로직 — ctx만 바꿔 측정(1패스)·실그리기(2패스)에 재사용.
     반환값: 본문이 끝난 y좌표(=콘텐츠 실제 높이) → 캔버스를 그만큼만 정확히 만들어
     내용 길이(약속·이유 글자 수 등)에 관계없이 잘리거나 빈 공간이 남지 않게 한다. */
  _drawCharterBody(x, W, ed, media = {}) {
    const PAD = 145;              // 좌우 기본 여백 (테두리에서 더 떨어뜨림 — 기존보다 확대)
    const INDENT = 22;            // 본문 들여쓰기 폭
    const wrap = (text, maxW, font) => {
      x.font = font;
      const chars = String(text).split(''); const lines = []; let line = '';
      for (const ch of chars) {
        if (x.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
        else line += ch;
      }
      if (line) lines.push(line);
      return lines;
    };
    let y = 140;
    x.textAlign = 'center'; x.fillStyle = '#b8860b';
    x.font = 'bold 40px Jua, sans-serif';
    x.fillText('🤖 💙 🤝', W / 2, y); y += 56;
    x.fillStyle = '#7c4a03';
    wrap('인공지능 로봇과의', W - PAD * 2, 'bold 50px Jua, sans-serif').forEach(l => { x.fillText(l, W / 2, y); y += 58; });
    wrap('올바른 관계 맺기 약속 헌장', W - PAD * 2, 'bold 50px Jua, sans-serif').forEach(l => { x.fillText(l, W / 2, y); y += 58; });
    y += -18;
    x.strokeStyle = '#e8a33d'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(PAD + 20, y); x.lineTo(W - PAD - 20, y); x.stroke(); y += 60;

    x.textAlign = 'left';
    const section = (title, body) => {
      x.fillStyle = '#1971c2'; x.font = 'bold 30px Jua, sans-serif';
      wrap(title, W - PAD * 2, 'bold 30px Jua, sans-serif').forEach(l => { x.fillText(l, PAD, y); y += 40; });
      x.fillStyle = '#343a40';
      body.forEach(t => {
        wrap(t, W - PAD * 2 - INDENT, '30px Jua, sans-serif').forEach(l => { x.fillText(l, PAD + INDENT, y); y += 38; });
        y += 6;
      });
      y += 26;
    };

    section('Q1. 나에게 <친구>란?', [
      `“${State.get('friendDef')}” 이다.`,
      `그 이유는, ${State.get('friendReason')}`,
    ]);
    section('Q2. 나는 인공지능 로봇과 <친구>가 될 수 있다고 생각한다.', [
      `나의 대답: [ ${State.get('ox2') || State.get('ox1')} ]`,
      `그 이유는, ${State.get('ox2Reason') || State.get('ox1Reason')}`,
    ]);
    section('Q3. 노아와 나의 <관계>는?', [
      '노아는 단순한 도구도, 사람도 아닙니다.',
      `나는 노아를 “${State.get('relationDef') || '좋은 동료'}”(으)로 대하겠습니다.`,
    ]);
    section('Q4. 노아와 <올바른 관계>를 맺기 위한 나의 3가지 약속',
      (State.get('promises') || []).map((p, i) => `${['하나', '둘', '셋'][i]}. ${p}`));

    // 서약문 — wrap 적용(줄바꿈 없이 그리면 긴 문장이 테두리 밖으로 삐져나감)
    y += 10;
    x.textAlign = 'center'; x.fillStyle = '#1971c2';
    const pledgeFont = 'bold 29px Jua, sans-serif';
    [
      '나는 <인공지능 로봇 노아>와의 시뮬레이션 과정을 통하여,',
      '인간과 로봇의 공존에 대한 <도덕적 태도>의 중요성을 인식하고,',
      '위의 세 가지 약속을 성실히 이행할 것을 약속합니다.',
    ].forEach(line => {
      wrap(line, W - PAD * 2, pledgeFont).forEach(l => { x.fillText(l, W / 2, y); y += 46; });
    });
    y += 34;

    // Q5. 나의 칭호 — 관계 평가 결과를 문장으로 설명하는 배지 카드
    if (ed) {
      const color = ed.color || '#4dabf7';
      const boxX = PAD - 25, boxW = W - (PAD - 25) * 2;
      // ⚠ wrap()에 넘기는 폰트와 실제로 그리는 폰트를 반드시 동일하게 유지할 것
      //   (측정 폰트와 렌더 폰트가 다르면 줄바꿈 폭 계산이 틀어져 카드 밖으로 글자가 삐져나감)
      const descFont = '32px Jua, sans-serif';
      const descLines = wrap(ed.desc || '', boxW - 90, descFont);
      const top = y;
      const boxH = 176 + descLines.length * 40;
      x.save();
      x.fillStyle = color + '1e';
      this._roundRectPath(x, boxX, top, boxW, boxH, 22); x.fill();
      x.strokeStyle = color; x.lineWidth = 3;
      this._roundRectPath(x, boxX, top, boxW, boxH, 22); x.stroke();
      x.restore();

      let by = top + 56;
      x.textAlign = 'center';
      x.fillStyle = '#7c4a03'; x.font = 'bold 35px Jua, sans-serif';
      x.fillText('오늘 노아와 나의 관계는?', W / 2, by); by += 54;
      x.font = '52px Jua, sans-serif'; x.fillStyle = color;
      x.fillText(ed.stamp, W / 2, by); by += 48;
      x.font = 'bold 35px Jua, sans-serif'; x.fillStyle = '#343a40';
      x.fillText(ed.title, W / 2, by); by += 46;
      x.fillStyle = '#495057'; x.font = descFont;
      descLines.forEach(l => { x.fillText(l, W / 2, by); by += 40; });
      y = top + boxH;
    }

    // ─── 🎨 내가 그린 그림 병기 — 왼쪽 '나의 학교'(도구화) + 오른쪽 '노아와 함께'(존중) ───
    //   측정(probe)·렌더 두 패스에 동일 media를 넘겨 예약 높이가 같으므로 잘림/여백 없음.
    //   한 장만 있으면 단독 중앙 배치. (✍ 서명은 여기가 아니라 하단 이름 오른쪽에 소형 배치)
    const imgCard = (img, title, cx, targetW, yTop) => {   // 반환: 소비한 높이
      const font = 'bold 24px Jua, sans-serif';
      x.textAlign = 'center'; x.fillStyle = '#1971c2'; x.font = font;
      let ty = yTop;
      wrap(title, targetW + 60, font).forEach(l => { x.fillText(l, cx, ty); ty += 32; });
      const w = targetW, h = w * img.height / img.width;
      const ix = cx - w / 2, iy = ty + 8;
      x.save();
      x.fillStyle = '#fff';
      this._roundRectPath(x, ix - 12, iy - 12, w + 24, h + 24, 16); x.fill();
      x.strokeStyle = '#e8a33d'; x.lineWidth = 3;
      this._roundRectPath(x, ix - 12, iy - 12, w + 24, h + 24, 16); x.stroke();
      x.restore();
      x.drawImage(img, ix, iy, w, h);
      return iy + h + 12 - yTop;
    };
    if (media.school && media.noah) {
      y += 34;
      const colW = 330;
      const hL = imgCard(media.school, '🎨 나의 학교', PAD + colW / 2, colW, y);
      const hR = imgCard(media.noah, '🤖 노아와 함께 있는 나의 모습', W - PAD - colW / 2, colW, y);
      y += Math.max(hL, hR) + 26;
    } else if (media.school || media.noah) {
      y += 34;
      const img = media.school || media.noah;
      const title = media.school ? '🎨 나의 학교' : '🤖 노아와 함께 있는 나의 모습';
      y += imgCard(img, title, W / 2, 440, y) + 26;
    }
    return y;
  },

  /* dataURL → Image (없거나 실패하면 null) — 헌장 이미지 프리로드용 */
  _loadImg(src) {
    return new Promise(res => {
      if (!src) return res(null);
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  },

  async charter() {
    const ed = this._ending;
    const W = 1000;

    // 🖼️ 그림 2장 + 서명 이미지를 먼저 로드 (양 패스가 동일 media를 써야 예약 높이가 일치) — 없으면 null로 생략
    const media = {
      school: await this._loadImg(State.get('schoolArt')),   // 🎨 도구화 3-3 '나의 학교'
      noah: await this._loadImg(State.get('noahArt')),       // 🤖 존중 5-3 '노아와 함께 있는 나의 모습'
      sig: await this._loadImg(State.get('signature')),
    };

    // ── 1패스: 측정 전용 캔버스로 실제 콘텐츠 높이를 구한다 (내용 길이에 따라 캔버스가 늘어남) ──
    const probe = document.createElement('canvas').getContext('2d');
    const contentEndY = this._drawCharterBody(probe, W, ed, media);

    // 하단 날짜/이름을 배지 바로 아래에 앵커링 (콘텐츠 끝에서부터의 간격을 짧게 고정
    //  — 이전엔 캔버스 하단에서부터 역산해 배지와 날짜 사이에 불필요하게 큰 여백이 생겼었음)
    const GAP_AFTER_BODY = 56;
    const dateY = contentEndY + GAP_AFTER_BODY;
    // ✍ 서명은 이름 오른쪽에 소형(150px) 배치 — 하단 여백은 서명 아래끝까지 커버
    const sigW = 150;
    const sigH = media.sig ? sigW * media.sig.height / media.sig.width : 0;
    const H = Math.ceil(dateY + Math.max(52, sigH / 2 + 30)) + 46;

    // ── 2패스: 정확한 크기로 실제 그리기 ──
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');

    const grad = x.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#fff9e8'); grad.addColorStop(1, '#ffeeda');
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e8a33d'; x.lineWidth = 14; x.strokeRect(28, 28, W - 56, H - 56);
    x.strokeStyle = '#f3c675'; x.lineWidth = 4; x.strokeRect(52, 52, W - 104, H - 104);

    this._drawCharterBody(x, W, ed, media);

    // 하단 — 날짜·이름 + 이름 오른쪽에 소형 서명 (문서에 '사인'하듯 얹힌다)
    x.fillStyle = '#7c4a03';
    x.font = 'bold 29px Jua, sans-serif';
    x.textAlign = 'right';
    x.fillText(`날짜: ${new Date().toLocaleDateString('ko-KR')}`, W / 2 - 20, dateY);
    x.textAlign = 'left';
    const nameTxt = `이름: ${State.get('name')}`;
    x.fillText(nameTxt, W / 2 + 20, dateY);
    if (media.sig) {
      const sx = Math.min(W / 2 + 20 + x.measureText(nameTxt).width + 18, W - 60 - sigW);
      const sy = dateY - 10 - sigH / 2;                     // 텍스트 라인 중심에 세로 정렬
      x.drawImage(media.sig, sx, sy, sigW, sigH);
      x.strokeStyle = '#e8a33d'; x.lineWidth = 2;
      this._roundRectPath(x, sx, sy, sigW, sigH, 8); x.stroke();
    }

    const url = c.toDataURL('image/png');
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3>📜 나만의 약속 헌장이 완성되었어요!</h3>
          <img class="charter-img" src="${url}">
          <div class="ov-choices" style="flex-direction:row; justify-content:center;">
            <button class="choice-btn dl" style="background:#2f9e44; border-color:#2b8a3e; color:#fff;">💾 헌장 이미지 다운로드</button>
            <button class="choice-btn next">➡ 계속하기</button>
          </div>
        </div>`);
      ov.querySelector('.dl').onclick = () => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `약속헌장_${State.get('name')}.png`;
        a.click();
        Sound.win();
      };
      ov.querySelector('.next').onclick = () => { UI.close(ov); resolve(); };
    });
  },
};
