/* ═══════════ Endings — 4단계 반전 & 6단계 마무리 ═══════════ */
const Endings = {

  vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {} },

  /* ═══════ 4-1 가짜 엔딩 → 시스템 오류 ═══════ */
  async fakeEnding() {
    // 가짜 축하 화면
    const ov = UI.overlay(`
      <div class="ov-panel">
        <h3>🎉 축하합니다! 🎉</h3>
        <p>이렇게 여러분은 인공지능 로봇 노아와<br><b>높은 친밀도</b>를 형성하였습니다.</p>
        <div class="stat-row"><div class="stat-label" style="color:#495057;"><span>💕 친밀도</span><span>100%</span></div>
          <div class="stat-bar"><div class="stat-fill pink" style="width:0%;"></div></div></div>
        <p class="fake-msg">이대로 게임을 마칠...</p>
      </div>`);
    Sound.win();
    await UI.wait(80);
    ov.querySelector('.stat-fill').style.width = '100%';
    await UI.wait(2800);

    // 지지직! 시스템 오류
    UI.close(ov);
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

    // ─── 새로운 화면: 노아 혼자, 교수님의 말을 떠올린다 ───
    await UI.bigText(['. . . . . .', '🤖\n\n(어두운 화면 속, 노아 혼자.)',
      '노아는 연구소에서 교수님이 했던 말을\n하나씩 떠올린다...'], { bg: 'rgba(2,2,8,.98)' });
    await UI.bigText(DATA.dlg.professorLines, { bg: 'rgba(2,2,8,.98)' });

    // 📔 도덕 수첩 회상 연동 — 수집 활동이 반전의 복선으로 회수된다
    const ethicsN = ['ethics1', 'ethics2', 'ethics3'].filter(id => State.has(id)).length;
    await UI.bigText([
      ethicsN > 0
        ? `...어디서 본 말들 같지 않나요?\n\n여러분이 📔 도덕 수첩에 모은,\n바로 그 **인공지능 윤리 3대 원칙**입니다. (${ethicsN}/3)`
        : '...이 약속들은,\n언젠가 여러분도 만나게 될 말들입니다.\n지금, 마음에 담아 주세요.',
    ], { bg: 'rgba(2,2,8,.98)' });

    // 혼란스러워하는 노아 클로즈업
    const noahClose = UI.overlay(`
      <div style="font-size:clamp(90px,22vw,180px); animation:glitchShake .12s steps(2) infinite;">😖🤖</div>
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
      `당신은 분명...\n친구란 "${State.get('friendDef')}"라고 했으며,`,
      `그 이유는\n"${State.get('friendReason')}"\n...라고 했습니다.`,
      '인공지능 로봇과 친구가 될 수도 있고,\n안 될 수도 있습니다.',
      "하지만 당신은 인공지능 로봇과\n**'도덕적'**으로 관계를 맺지 않았습니다.",
    ], { bg: 'rgba(2,2,8,.98)' });

    // 숨은 수치 공개 (3구간 스펙트럼 + 이중표기 게이지)
    await this.statReveal();

    // 재프레이밍 — 감정은 로봇이 아니라 '우리'의 것 (지도서 지도 중점)
    await UI.bigText([
      '노아는 슬퍼서 멈춘 것이 아닙니다.\n**도덕** 원칙과 모순된 관계 데이터 때문에,\n계산이 멈춘 것입니다.',
      '...그런데, 이상하죠.\n\n**왜 우리 마음이 아플까요?**',
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

  /* ═══════ 4-2 노아 강제 종료 & 재시작(비밀번호 7942) ═══════ */
  shutdownAndRestart() {
    return new Promise(async resolve => {
      await UI.bigText([
        '🤖\n. . . 시 스 템 . . . 종 료 . . .',
        '⬛\n\n[ NOAH :: SHUTDOWN ]',
      ], { bg: '#000' });

      const ov = UI.overlay(`
        <div style="text-align:center; max-width:min(560px,94vw);">
          <div style="font-size:70px; filter:grayscale(1) brightness(.5);">🤖</div>
          <h3 style="color:#fff; font-size:clamp(20px,3.4vw,30px); margin:14px 0;">노아가 강제 종료되었습니다.</h3>
          <p style="color:#adb5bd; margin-bottom:14px;">재시작하려면 비밀 코드 4자리가 필요합니다.</p>
          <input class="ov-input code" type="tel" maxlength="4" placeholder="0000" inputmode="numeric"
            style="width:200px; font-size:34px; letter-spacing:12px; background:#111; color:#4dffa0; border-color:#333;">
          <div class="ov-choices" style="flex-direction:row; justify-content:center;">
            <button class="choice-btn hint">💡 힌트 보기</button>
            <button class="choice-btn go" style="background:#c92a2a; border-color:#a61e1e; color:#fff;">🔄 재시작</button>
          </div>
          <p class="hint-msg" style="color:#ffe066; min-height:3em; margin-top:12px; font-size:clamp(14px,2.2vw,18px);"></p>
        </div>`, 'bigtext-ov');
      const input = ov.querySelector('.code'), msg = ov.querySelector('.hint-msg');
      ov.querySelector('.hint').onclick = () => {
        Sound.chime();
        msg.innerHTML = '👩‍🏫 선생님의 귓속말: "노아와 우리가 되고 싶은 사이는...<br>숫자로 <b>칠(7)·구(9)·사(4)·이(2)</b> 라고 읽는단다!"';
      };
      ov.querySelector('.go').onclick = async () => {
        if (input.value.trim() === '7942') {
          Sound.win();
          msg.innerHTML = '✅ 코드 일치! — 7942 : <b>친(7)구(9) 사(4)이(2)</b> —<br>노아를 재시작합니다...';
          await UI.wait(2000);
          UI.close(ov);
          resolve();
        } else {
          Sound.error(); this.vibrate(200);
          input.value = '';
          msg.textContent = '❌ 코드가 틀렸어요. 힌트를 눌러 보세요!';
        }
      };
    });
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

    const ans = await UI.oxQuestion('당신은 인공지능 로봇과 친구가 될 수 있다고 생각하나요?', '처음과 같은 질문이에요. 지금의 생각을 솔직하게 답해 주세요.');
    State.set('ox2', ans);
    const reason = await UI.textInput('그렇게 생각한 이유는 무엇인가요?', '이유를 자유롭게 적어 주세요', '', true);
    State.set('ox2Reason', reason);

    await UI.bigText(DATA.endingLines, { bg: 'rgba(8,12,40,.97)' });
    Sound.win();

    // 6-2 헌장 다운로드
    await this.charter();
    // 6-3 쿠키
    await UI.bigText(DATA.cookieLines, { bg: 'rgba(2,2,8,.98)' });

    const fin = UI.overlay(`
      <div style="text-align:center;">
        <div style="font-size:90px;">🤖💙</div>
        <h3 style="color:#fff; font-size:clamp(24px,4vw,38px); margin:16px 0;">- THE END -</h3>
        <p style="color:#adb5bd;">함께해 줘서 고마워요, ${State.get('name')}!</p>
        <div class="ov-choices"><button class="choice-btn again">🏠 처음 화면으로</button></div>
      </div>`, 'bigtext-ov');
    fin.querySelector('.again').onclick = () => location.reload();
  },

  /* ═══════ 6-2 약속 헌장 이미지 생성 & 다운로드 ═══════ */
  async charter() {
    const c = document.createElement('canvas');
    c.width = 1000; c.height = 1420;
    const x = c.getContext('2d');

    // 배경 & 테두리
    const grad = x.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, '#fff9e8'); grad.addColorStop(1, '#ffeeda');
    x.fillStyle = grad; x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = '#e8a33d'; x.lineWidth = 14; x.strokeRect(28, 28, c.width - 56, c.height - 56);
    x.strokeStyle = '#f3c675'; x.lineWidth = 4; x.strokeRect(52, 52, c.width - 104, c.height - 104);

    const wrap = (text, maxW, font) => {   // 줄바꿈 도우미
      x.font = font;
      const words = String(text).split(''); const lines = []; let line = '';
      for (const ch of words) {
        if (x.measureText(line + ch).width > maxW) { lines.push(line); line = ch; }
        else line += ch;
      }
      if (line) lines.push(line);
      return lines;
    };
    let y = 140;
    x.textAlign = 'center'; x.fillStyle = '#b8860b';
    x.font = 'bold 30px Jua, sans-serif';
    x.fillText('🤖 💙 🤝', c.width / 2, y); y += 56;
    x.fillStyle = '#7c4a03'; x.font = 'bold 44px Jua, sans-serif';
    x.fillText('인공지능 로봇과의', c.width / 2, y); y += 58;
    x.fillText('올바른 관계 맺기 약속 헌장', c.width / 2, y); y += 40;
    x.strokeStyle = '#e8a33d'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(150, y); x.lineTo(850, y); x.stroke(); y += 60;

    x.textAlign = 'left';
    const section = (title, body) => {
      x.fillStyle = '#1971c2'; x.font = 'bold 30px Jua, sans-serif';
      wrap(title, 800, 'bold 30px Jua, sans-serif').forEach(l => { x.fillText(l, 100, y); y += 40; });
      x.fillStyle = '#343a40';
      body.forEach(t => {
        wrap(t, 780, '26px Jua, sans-serif').forEach(l => { x.fillText(l, 120, y); y += 38; });
        y += 6;
      });
      y += 26;
    };

    section('Q1. 나에게 친구란?', [
      `“${State.get('friendDef')}” 이다.`,
      `그 이유는, ${State.get('friendReason')}`,
    ]);
    section('Q2. 나는 인공지능 로봇과 친구가 될 수 있다고 생각한다.', [
      `나의 대답: [ ${State.get('ox2') || State.get('ox1')} ]`,
      `그 이유는, ${State.get('ox2Reason') || State.get('ox1Reason')}`,
    ]);
    section('Q3. 노아와 올바른 관계를 맺기 위한 나의 3가지 약속',
      (State.get('promises') || []).map((p, i) => `${['하나', '둘', '셋'][i]}. ${p}`));

    // Q4. 서명
    x.fillStyle = '#1971c2'; x.font = 'bold 30px Jua, sans-serif';
    x.fillText('Q4. 나의 다짐 서명', 100, y); y += 20;
    const sig = State.get('signature');
    if (sig) {
      await new Promise(res => {
        const img = new Image();
        img.onload = () => {
          x.fillStyle = '#fff'; x.fillRect(150, y, 700, 288);
          x.strokeStyle = '#dee2e6'; x.strokeRect(150, y, 700, 288);
          x.drawImage(img, 150, y, 700, 288);
          y += 310; res();
        };
        img.onerror = res;
        img.src = sig;
      });
    }
    x.textAlign = 'center';
    x.fillStyle = '#868e96'; x.font = '22px Jua, sans-serif';
    x.fillText('성취기준 [6도02-03] 인간과 인공지능 로봇 간에 도덕에 기반을 둔 관계 형성', c.width / 2, c.height - 110);
    x.fillStyle = '#b8860b'; x.font = 'bold 26px Jua, sans-serif';
    x.fillText(`${new Date().toLocaleDateString('ko-KR')} · ${State.get('name')}`, c.width / 2, c.height - 70);

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
