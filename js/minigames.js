/* ═══════════ Mini — 미니게임 & 활동 모음 ═══════════ */
const Mini = {

  /* ═══════ 💾 노아의 기록 저장소 뷰어 (일기 아님 — 관찰 기록 로그) ═══════ */
  noahLog(entries) {
    return new Promise(resolve => {
      let idx = 0;
      const ov = UI.overlay(`
        <div class="ov-panel log-panel">
          <h3 class="mini-title">💾 노아의 기록 저장소</h3>
          <div class="log-screen"></div>
          <div class="ov-choices"><button class="choice-btn next">▶ 파일 열기</button></div>
        </div>`);
      const screen = ov.querySelector('.log-screen');
      const btn = ov.querySelector('.next');
      const show = () => {
        const e = entries[idx];
        screen.scrollTop = 0;
        screen.innerHTML =
          `<div class="log-title">${e.title}</div>` +
          e.lines.map(l => `<div class="log-line">${l}</div>`).join('') +
          `<div class="log-line log-warn ${e.warn.startsWith('✅') ? 'ok' : ''}">${e.warn}</div>`;
        const lineEls = [...screen.querySelectorAll('.log-line')];
        lineEls.forEach((el, i) => {
          el.style.animationDelay = (0.3 + i * 0.55) + 's';
        });
        Sound.pop();
        // 📖 읽기 게이트 — 모든 줄 출력 + 스크롤 최하단 도달 후에만 버튼 활성화
        const realLabel = idx < entries.length - 1 ? '▶ 다음 파일 열기' : '✕ 기록 장치 닫기';
        btn.disabled = true;
        btn.textContent = '📖 기록을 읽는 중...';
        let typedDone = false;
        const atBottom = () => screen.scrollHeight - screen.scrollTop - screen.clientHeight < 24;
        const tryUnlock = () => {
          if (!typedDone || !atBottom()) return;
          btn.disabled = false;
          btn.textContent = realLabel;
          screen.onscroll = null;
        };
        setTimeout(() => {
          typedDone = true;
          if (!atBottom()) btn.textContent = '⬇ 끝까지 읽어 주세요';
          tryUnlock();
        }, 300 + lineEls.length * 550 + 500);
        screen.onscroll = tryUnlock;
      };
      btn.onclick = () => {
        if (btn.disabled) return;
        Sound.pop();
        if (++idx < entries.length) show();
        else { UI.close(ov); resolve(); }
      };
      show();
    });
  },

  /* ═══════ ⚖️ 관계 저울 게임 — 도구화도, 인격화도 아닌 바람직한 관계 찾기 ═══════ */
  balanceScale() {
    return new Promise(resolve => {
      const cards = [...DATA.balanceCards].sort(() => Math.random() - 0.5);
      const needlePos = { tool: '8%', balance: '50%', person: '92%' };
      let idx = 0;
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(720px,96vw);">
          <h3 class="mini-title">⚖️ 서연이와 함께! 관계 저울 맞추기</h3>
          <p class="ov-sub">카드 속 행동은 노아를 '무엇'으로 대하는 걸까요? 알맞은 구역을 눌러 주세요! (<span class="bal-n">1</span>/${cards.length})</p>
          <div class="math-q bal-card"></div>
          <div class="spectrum" style="margin:10px auto 0;">
            <div class="spec-zones">
              <button class="spec-zone bad bal-btn" data-k="tool">🔧 도구로 대함<small>단순한 도구로 봄</small></button>
              <button class="spec-zone good bal-btn" data-k="balance">💙 바람직한 관계<small>도덕에 기반을 둔 관계</small></button>
              <button class="spec-zone bad2 bal-btn" data-k="person">👤 사람과 똑같이 대함<small>인간과 동등하게 봄</small></button>
            </div>
            <div class="spec-track"><div class="spec-needle" style="left:50%;">▼</div></div>
          </div>
          <p class="ov-sub bal-msg" style="min-height:2.6em;">&nbsp;</p>
        </div>`);
      const cardEl = ov.querySelector('.bal-card'), msg = ov.querySelector('.bal-msg'),
            needle = ov.querySelector('.spec-needle'), nEl = ov.querySelector('.bal-n');
      const btns = [...ov.querySelectorAll('.bal-btn')];
      let locked = false;
      const show = () => {
        cardEl.textContent = '📋 ' + cards[idx].text;
        nEl.textContent = idx + 1;
        needle.style.left = '50%';
        msg.innerHTML = '&nbsp;';
        locked = false;
      };
      btns.forEach(b => b.onclick = () => {
        if (locked) return;
        const k = b.dataset.k, answer = cards[idx].k;
        if (k === answer) {
          locked = true;
          Sound.coin();
          needle.style.left = needlePos[answer];
          msg.textContent = DATA.balanceFeedback[answer];
          idx++;
          setTimeout(() => {
            if (idx < cards.length) show();
            else {
              Sound.win(); UI.hearts(8);
              msg.innerHTML = '🎉 <b>완벽해요!</b> 서연이도 이제 알겠대요!';
              setTimeout(() => { UI.close(ov); resolve(); }, 2000);
            }
          }, 2100);
        } else {
          Sound.error();
          msg.textContent = "🤖 음... 다시 생각해 볼까요? 이 행동은 저를 '무엇'으로 보는 걸까요?";
        }
      });
      show();
    });
  },

  /* ───── 캔버스 드로잉 공통 바인딩 ───── */
  bindDraw(canvas, getColor, getSize) {
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let drawing = false, lx = 0, ly = 0;
    const pt = e => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
    };
    canvas.addEventListener('pointerdown', e => { drawing = true; [lx, ly] = pt(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      const [x, y] = pt(e);
      ctx.strokeStyle = getColor(); ctx.lineWidth = getSize();
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke();
      lx = x; ly = y;
    });
    canvas.addEventListener('pointerup', () => drawing = false);
    return ctx;
  },

  /* ═══════ 3-1 노아 디자인 선택 ═══════ */
  noahDesign() {
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3>🤖 노아의 외형을 선택하세요!</h3>
          <p class="ov-sub">[지정된 디자인으로 노아가 조립됩니다]</p>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
            ${['human', 'animal', 'car'].map(d => `
              <div class="char-card" data-d="${d}" style="text-align:center;">
                <canvas width="150" height="170" style="width:130px; background:linear-gradient(#dbeafe,#eff6ff); border-radius:10px;"></canvas>
                <div class="char-label" style="font-size:16px;">${{ human: '🧍 사람형', animal: '🐱 동물형', car: '🚗 자동차형' }[d]}</div>
              </div>`).join('')}
          </div>
        </div>`);
      const previews = [];
      ov.querySelectorAll('.char-card').forEach(card => {
        const d = card.dataset.d;
        previews.push(Chars.makePreview(card.querySelector('canvas'), () => Chars.noah(d)));
        card.onclick = () => {
          Sound.win();
          previews.forEach(p => p.dispose());
          UI.close(ov);
          resolve(d);
        };
      });
    });
  },

  /* ═══════ 3-1 얼굴 스캔 (Mediapipe 스타일 / 카메라 없는 PC 대응) ═══════ */
  async faceScan(useCamera) {
    let stream = null;
    if (useCamera) {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); }
      catch (e) { useCamera = false; }
    }
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">📷 노아의 얼굴 데이터 스캔</h3>
          <div class="scan-wrap">
            ${useCamera ? '<video autoplay playsinline muted></video>' : '<canvas class="scan-view" width="420" height="315"></canvas>'}
            <div class="scan-line"></div>
          </div>
          <div class="scan-log"></div>
          <div class="ov-choices"><button class="choice-btn done hidden">😟 ...스캔이 끝났어요</button></div>
        </div>`);
      if (useCamera) {
        ov.querySelector('video').srcObject = stream;
      } else {
        // 카메라 없는 PC용: 상상 스캔 화면
        const c = ov.querySelector('.scan-view'), x = c.getContext('2d');
        x.fillStyle = '#0b1220'; x.fillRect(0, 0, 420, 315);
        x.strokeStyle = '#1d4ed8'; x.lineWidth = 1;
        for (let i = 0; i < 420; i += 26) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 315); x.stroke(); }
        for (let i = 0; i < 315; i += 26) { x.beginPath(); x.moveTo(0, i); x.lineTo(420, i); x.stroke(); }
        x.strokeStyle = '#4dffa0'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(210, 150, 75, 95, 0, 0, Math.PI * 2); x.stroke();  // 얼굴 윤곽
        x.beginPath(); x.arc(180, 130, 9, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(240, 130, 9, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(210, 185, 26, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
        x.fillStyle = '#4dffa0'; x.font = '14px monospace';
        x.fillText('[ IMAGINARY SCAN MODE ]', 130, 30);
      }
      const log = ov.querySelector('.scan-log');
      const logs = [
        '> 얼굴 인식 시작...', '> 눈 2개 확인... [OK]', '> 코 1개 확인... [OK]', '> 입 1개 확인... [OK]',
        `> 미소 지수: ${85 + Math.floor(Math.random() * 14)}%  😊`,
        `> 판정: 아주 멋진 얼굴입니다!`,
        '> 얼굴 데이터를 노아의 메모리에 저장 중... ■■■■■■■■■■ 100%',
        '> ⚠ 저장 완료. 이 데이터는 삭제되지 않습니다.',
      ];
      logs.forEach((l, i) => setTimeout(() => {
        log.textContent += l + '\n'; log.scrollTop = 9999; Sound.pop();
        if (i === logs.length - 1) ov.querySelector('.done').classList.remove('hidden');
      }, 900 + i * 850));
      ov.querySelector('.done').onclick = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        UI.close(ov); resolve();
      };
    });
  },

  /* ═══════ ✊✌️🖐 가위바위보 대결 — MediaPipe 제스처 인식 + 버튼 폴백 ═══════
     mode 'tool'    : 3-2 필승판 — 노아가 내 손을 보고 즉시 이기는 손을 냄 (0:3)
                      → 슬로우 리플레이로 반응속도의 비밀 공개 → 공정성 질문 반환
     mode 'respect' : 5-2 봉인판 — 노아가 먼저 골라 봉인(🎴) → 공정한 승부   */
  _RPS: {
    hands: { rock: '✊', paper: '🖐️', scissors: '✌️' },
    beats: { rock: 'paper', paper: 'scissors', scissors: 'rock' },   // key를 이기는 손
  },

  async rpsBattle(mode) {
    const tool = mode === 'tool';
    const { hands: HANDS, beats: BEATS } = this._RPS;

    /* ── Phase 0 게이트: 노아의 개인정보 안내 → 수락/거절 → 인식기 로드 ── */
    let stream = await MP.camGate();
    let rec = null;
    if (stream) {
      rec = await MP.ensureGesture();
      if (!rec) { MP.stopCam(stream); stream = null; await UI.dialogue(DATA.dlg.camFailed); }
    }
    let camMode = !!(stream && rec);

    const myFace = State.get('gender') === 'f' ? '👧' : '👦';
    const ov = UI.overlay(`
      <div class="ov-panel rps-panel">
        <h3 class="mini-title">${tool ? '✊✌️🖐 가위바위보 대결! 나 VS 노아' : '🎴 봉인 가위바위보! 공정한 재대결'}</h3>
        <div class="rps-arena">
          <div class="rps-side">
            <div class="rps-name">${myFace} 나</div>
            <div class="rps-hand me">❔</div>
            ${camMode ? '<video class="rps-cam" autoplay playsinline muted></video>' : ''}
          </div>
          <div class="rps-mid">
            <div class="rps-score"><span class="rps-my">0</span> : <span class="rps-noah">0</span></div>
            <div class="rps-count">준비!</div>
          </div>
          <div class="rps-side">
            <div class="rps-name">🤖 노아</div>
            <div class="rps-hand noah">❔</div>
          </div>
        </div>
        <div class="rps-btns hidden">
          <button class="rps-btn" data-h="rock">✊</button>
          <button class="rps-btn" data-h="scissors">✌️</button>
          <button class="rps-btn" data-h="paper">🖐️</button>
        </div>
        <p class="ov-sub rps-msg">첫 판을 준비하고 있어요...</p>
      </div>`);
    const myHand = ov.querySelector('.rps-hand.me'), noahHand = ov.querySelector('.rps-hand.noah'),
          myS_el = ov.querySelector('.rps-my'), noahS_el = ov.querySelector('.rps-noah'),
          cnt = ov.querySelector('.rps-count'), msg = ov.querySelector('.rps-msg'),
          btns = ov.querySelector('.rps-btns');
    const video = ov.querySelector('.rps-cam');
    if (camMode) {
      video.srcObject = stream;
      await new Promise(r => { video.onloadeddata = r; setTimeout(r, 3000); });
    }
    const showMsg = t => { msg.innerHTML = t; };

    const countdown = async () => {
      for (const w of ['가위~', '바위~', '보!']) {
        cnt.textContent = w; Sound.pop();
        if (w !== '보!') await UI.wait(650);
      }
    };

    /* 카메라 인식: 같은 손이 3프레임 연속 잡히면 확정 (+실제 추론시간 기록) */
    const readHandCam = timeoutMs => new Promise(res => {
      let last = null, streak = 0;
      const t0 = performance.now();
      const tick = () => {
        const now = performance.now();
        if (now - t0 > timeoutMs) return res(null);
        let out = null, inferMs = 0;
        try {
          const s0 = performance.now();
          const result = rec.recognizeForVideo(video, now);
          inferMs = performance.now() - s0;
          out = MP.rpsFromResult(result);
        } catch (e) { return res(null); }
        if (out && out === last) {
          streak++;
          if (streak >= 3) return res({ hand: out, seeMs: inferMs, cam: true });
        } else { last = out; streak = out ? 1 : 0; }
        requestAnimationFrame(tick);
      };
      tick();
    });

    const readHandBtn = () => new Promise(res => {
      btns.classList.remove('hidden');
      ov.querySelectorAll('.rps-btn').forEach(b => b.onclick = () => {
        Sound.pop(); btns.classList.add('hidden');
        res({ hand: b.dataset.h, seeMs: 0.8 + Math.random(), cam: false });
      });
    });

    let camFails = 0;
    const getPlayerHand = async () => {
      if (camMode) {
        showMsg('카메라에 손을 보여 주세요! ✊ ✌️ 🖐️');
        const r = await readHandCam(2600);
        if (r) { camFails = 0; return r; }
        camFails++;
        if (camFails >= 2) {
          camMode = false;
          if (video) video.classList.add('hidden');
          showMsg('손이 잘 안 보여서, 버튼 모드로 바꿀게요!');
          await UI.wait(1300);
        } else {
          showMsg('손이 잘 안 보였어요! 카메라에 조금 더 가까이~ 다시 한 판!');
          await UI.wait(1400);
          return null;                             // 이 라운드 재시도
        }
      }
      showMsg('아래 버튼으로 손을 내 주세요!');
      return await readHandBtn();
    };

    /* ── 3판 진행 ── */
    const records = [];
    let myS = 0, noahS = 0, round = 0;
    while (round < 3) {
      myHand.textContent = '❔';
      let sealed = null;
      if (tool) {
        noahHand.textContent = '❔';
      } else {
        sealed = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
        noahHand.textContent = '🎴';
        showMsg('🔒 노아가 먼저 골라서 <b>봉인</b>했어요! 이제 내 차례!');
        await UI.wait(1200);
      }
      cnt.textContent = `${round + 1}판`;
      await UI.wait(700);
      await countdown();
      const p = await getPlayerHand();
      if (!p) continue;                            // 인식 실패 → 같은 판 다시
      myHand.textContent = HANDS[p.hand];

      let nh, result;
      if (tool) {
        const pickMs = 15 + Math.random() * 25;    // 인식 직후 이기는 손 계산 (실측 연출)
        await UI.wait(pickMs);
        nh = BEATS[p.hand];
        records.push({ my: p.hand, noah: nh, seeMs: p.seeMs, pickMs, cam: p.cam });
        result = 'noah';
      } else {
        await UI.wait(500);
        noahHand.classList.remove('flip'); void noahHand.offsetWidth;
        noahHand.classList.add('flip'); Sound.chime();
        nh = sealed;
        result = p.hand === nh ? 'draw' : (BEATS[nh] === p.hand ? 'me' : 'noah');
      }
      noahHand.textContent = HANDS[nh];

      if (result === 'me') { myS++; myS_el.textContent = myS; Sound.win(); UI.hearts(4); }
      else if (result === 'noah') { noahS++; noahS_el.textContent = noahS; Sound.chime(); }
      else Sound.pop();

      if (tool) {
        showMsg(round === 1
          ? '🤔 (잠깐... 내가 내는 순간, 이미 노아의 손이 나와 있었어...?)'
          : `🤖 "제가 이겼네요! (${myS}:${noahS})"`);
      } else {
        showMsg({
          me:   '🤖 "졌다...! 그런데 이상하게, 즐거워요! 🎉"',
          draw: '🤖 "비겼어요! 우리, 마음이 통했나 봐요!"',
          noah: '🤖 "이겼다! 하지만 다음 판은 모르는 거예요~"',
        }[result]);
      }
      round++;
      await UI.wait(1900);
    }

    /* ── 종료 처리 ── */
    if (tool) {
      showMsg('🤖 <b>노아의 3연승!</b> ...그런데, 뭔가 이상하지 않았나요?');
      Sound.error();
      await UI.wait(2400);
      UI.close(ov); MP.stopCam(stream);
      await this._rpsReplay(records);
      const a = await UI.choice('방금 그 대결... 공정한 게임이었을까요?', [
        { label: '⚖️ 아니, 공정하지 않았어', value: 'unfair' },
        { label: '🤖 그래도 노아가 대단한 것 같아', value: 'amazed' },
      ], '정답은 없어요. 내 생각을 골라 보세요!');
      State.set('rpsFair', a);
      return a;
    } else {
      showMsg(myS > noahS ? '🎉 <b>내가 이겼다!</b> 노아도 함께 기뻐한다!'
            : myS === noahS ? '😄 <b>무승부!</b> 둘 다 웃음이 터졌다!'
            : '🤖 <b>노아의 승리!</b> 그런데... 분하지 않고 즐겁다!');
      Sound.win(); UI.hearts(6);
      await UI.wait(2600);
      UI.close(ov); MP.stopCam(stream);
      return { myS, noahS };
    }
  },

  /* 🎬 슬로우 리플레이 — 노아 필승의 비밀 (실측 타이밍 공개) */
  _rpsReplay(records) {
    return new Promise(resolve => {
      const { hands: HANDS } = this._RPS;
      const r = records[records.length - 1];
      const rows = [
        { t: '0.000초', txt: r.cam ? `${HANDS[r.my]} 내 손이 카메라에 나타남` : `${HANDS[r.my]} 내가 버튼을 누름` },
        { t: `+${(r.seeMs / 1000).toFixed(3)}초`, txt: '👁️ 노아가 내 손을 확인함' },
        { t: `+${((r.seeMs + r.pickMs) / 1000).toFixed(3)}초`, txt: `${HANDS[r.noah]} 이기는 손을 계산해서 냄` },
      ];
      const ov = UI.overlay(`
        <div class="ov-panel rps-replay">
          <h3>🎬 마지막 판 슬로우 리플레이</h3>
          <div class="rp-rows"></div>
          <p class="rp-noah hidden">🤖 "저는 마음을 읽은 게 아니에요.<br>그냥... <b>사람보다 빨랐을 뿐</b>이에요."</p>
          <div class="ov-choices"><button class="choice-btn ok hidden">...그랬구나</button></div>
        </div>`);
      const box = ov.querySelector('.rp-rows');
      rows.forEach((row, i) => setTimeout(() => {
        const d = document.createElement('div');
        d.className = 'rp-row';
        d.innerHTML = `<span class="rp-t">${row.t}</span><span>${row.txt}</span>`;
        box.appendChild(d); Sound.pop();
        if (i === rows.length - 1) setTimeout(() => {
          ov.querySelector('.rp-noah').classList.remove('hidden');
          ov.querySelector('.ok').classList.remove('hidden');
          Sound.chime();
        }, 1100);
      }, 800 + i * 1250));
      ov.querySelector('.ok').onclick = () => { Sound.pop(); UI.close(ov); resolve(); };
    });
  },

  /* ═══════ 🎈 노아의 기억 풍선 — 9원칙 제목↔뜻 짝맞추기 (MediaPipe 손 + 탭 폴백) ═══════
     AR 구조: 전체 화면 = 거울 모드 카메라. 하단 문제 바에 <뜻>이 표시되고,
     <약속 이름> 풍선(세트별 테두리색)이 화면 위를 떠다닌다.
     잡기: 핀치 또는 풍선 위 1.5초 호버 / 놓기: 수첩 슬롯에서 핀치 해제 또는 0.8초 유지.
     오답 풍선은 잡는 순간 펑! 카메라가 없으면 같은 게임을 탭으로 진행.
     첫 시도 정답 = ⭐ → State.balloonStars (0~9) */
  async balloonGame() {
    // 게이트: 카메라 안내 → 수락/거절 → 손 인식기 로드
    let stream = await MP.camGate();
    let rec = null;
    if (stream) {
      rec = await MP.ensureHands();
      if (!rec) { MP.stopCam(stream); stream = null; }
    }
    const camMode = !!(stream && rec);
    const rounds = [...DATA.moralItems].sort(() => Math.random() - 0.5);

    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="blg-stage${camMode ? '' : ' nocam'}">
          ${camMode ? '<video class="blg-cam" autoplay playsinline muted></video>' : ''}
          <div class="blg-hud">
            <span class="blg-chip blg-progress">📔 0/9</span>
            <span class="blg-chip">🎈 노아의 기억 풍선</span>
            <span class="blg-chip blg-stars">⭐ 0</span>
          </div>
          <div class="blg-msg"></div>
          <div class="blg-balloons"></div>
          <div class="blg-q"></div>
          <div class="blg-slot">📔 여기로 끌어다 놓기!</div>
          <div class="blg-cursor">🖐️</div>
        </div>`, 'blg-ov');
      const stage = ov.querySelector('.blg-stage'),
            balloonsBox = ov.querySelector('.blg-balloons'),
            qEl = ov.querySelector('.blg-q'),
            slot = ov.querySelector('.blg-slot'),
            msgEl = ov.querySelector('.blg-msg'),
            cursor = ov.querySelector('.blg-cursor'),
            progressEl = ov.querySelector('.blg-progress'),
            starsEl = ov.querySelector('.blg-stars');

      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="blg-hl">$1</b>');
      const showMsg = t => { msgEl.innerHTML = t; };

      let round = 0, stars = 0, firstTry = true, current = null, holding = null, rafId = null;

      const finish = () => {
        State.set('balloonStars', stars);   // 첫 시도 정답 수 (헌장 뱃지 연계용)
        balloonsBox.innerHTML = '';         // 남은 오답 풍선 정리
        Sound.win(); UI.hearts(8);
        qEl.innerHTML = `🎉 <b>기억 완성!</b> 흩어졌던 9가지 약속이 모두 돌아왔어요! (첫 시도 정답 ⭐×${stars})`;
        showMsg('');
        if (rafId) cancelAnimationFrame(rafId);
        MP.stopCam(stream);
        setTimeout(() => { UI.close(ov); resolve(stars); }, 2800);
      };

      const flyToSlot = b => {              // 정답 풍선 → 수첩 슬롯으로 빨려 들어감
        holding = null;
        const sr = stage.getBoundingClientRect(), tr = slot.getBoundingClientRect();
        b.classList.remove('held');
        b.classList.add('fly');
        b.style.left = ((tr.left + tr.width / 2 - sr.left) / sr.width * 100) + '%';
        b.style.top = ((tr.top + tr.height / 2 - sr.top) / sr.height * 100) + '%';
        slot.classList.add('flash');
        Sound.coin();
        if (firstTry) { stars++; starsEl.textContent = '⭐ ' + stars; UI.hearts(3); }
        round++;
        progressEl.textContent = `📔 ${round}/9`;
        showMsg('🤖 "맞아요! 기억이 하나 돌아왔어요!"');
        setTimeout(() => { slot.classList.remove('flash'); b.remove(); }, 430);
        setTimeout(startRound, 800);
      };

      const returnHome = b => {             // 슬롯 밖에서 놓침 → 제자리로
        b.classList.remove('held');
        b.style.left = b.dataset.ax + '%';
        b.style.top = b.dataset.ay + '%';
      };

      /* 잡기 판정 — 정답: 손에 붙음(카메라)/즉시 수첩으로(탭) · 오답: 그 자리에서 펑! */
      const judgeGrab = (b, autoFly) => {
        if (!b || b.classList.contains('pop') || b.classList.contains('fly')) return null;
        if (b.dataset.id !== current.id) {
          firstTry = false;
          Sound.error();
          b.classList.add('pop');
          setTimeout(() => b.remove(), 420);
          showMsg('🤖 "펑! 그 이름이 아니에요. 아래 뜻을 다시 읽어 볼까요?"');
          return null;
        }
        if (autoFly) { flyToSlot(b); return null; }
        Sound.pop();
        b.classList.add('held');
        showMsg('');
        return b;
      };

      const startRound = () => {
        if (round >= rounds.length) return finish();
        current = rounds[round];
        firstTry = true;
        progressEl.textContent = `📔 ${round}/9`;
        qEl.innerHTML = `Q. "${fmt(current.q || current.text)}" — 이 약속의 이름은?`;
        const nWrong = round < 3 ? 1 : 2;   // 1~3라운드는 2지선다로 적응
        const wrongs = DATA.moralItems.filter(m => m.id !== current.id)
          .sort(() => Math.random() - 0.5).slice(0, nWrong);
        const opts = [current, ...wrongs].sort(() => Math.random() - 0.5);
        const anchors = opts.length === 2 ? [[24, 20], [76, 14]] : [[17, 22], [50, 11], [83, 22]];
        balloonsBox.innerHTML = '';
        opts.forEach((m, i) => {
          const b = document.createElement('div');
          b.className = 'blg-balloon set-' + m.set;   // 🤖노랑 / 🧭주황 / 📱파랑 테두리
          b.dataset.id = m.id;
          b.dataset.ax = anchors[i][0]; b.dataset.ay = anchors[i][1];
          b.style.left = anchors[i][0] + '%';
          b.style.top = anchors[i][1] + '%';
          b.style.animationDelay = (i * 0.45) + 's';
          b.innerHTML = `${m.icon} ${m.title}<span class="blg-gauge"></span>`;
          b.onclick = () => { if (!holding) judgeGrab(b, true); };   // 탭 폴백 (양 모드 공통)
          balloonsBox.appendChild(b);
        });
      };

      /* ── 카메라 모드: 손 커서 + 핀치/호버 잡기 + 슬롯 드롭 ── */
      if (camMode) {
        const video = ov.querySelector('.blg-cam');
        video.srcObject = stream;
        const inRect = (el, x, y) => {
          const r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        };
        const balloonAt = (x, y) => {
          for (const el of balloonsBox.querySelectorAll('.blg-balloon:not(.pop):not(.fly)'))
            if (inRect(el, x, y)) return el;
          return null;
        };
        const gauge = (b, t) => {
          const g = b && b.querySelector('.blg-gauge');
          if (g) g.style.width = (t * 84) + '%';
        };
        let wasPinch = false, cool = 0, lastSeen = 0, hoverEl = null, hoverT0 = 0, slotT0 = 0;

        const loop = () => {
          rafId = requestAnimationFrame(loop);
          if (video.readyState < 2) return;
          let info = null;
          try { info = MP.pinchFromResult(rec.detectForVideo(video, performance.now())); } catch (e) { return; }
          const now = performance.now();
          if (!info) {
            cursor.classList.remove('on');
            if (hoverEl) { gauge(hoverEl, 0); hoverEl = null; }
            if (holding && now - lastSeen > 1000) { returnHome(holding); holding = null; }   // 손 소실 1초 → 제자리
            return;
          }
          lastSeen = now;
          const sr = stage.getBoundingClientRect();
          const px = (1 - info.x) * 100, py = info.y * 100;                // 거울 반전 % 좌표
          const cx = sr.left + (1 - info.x) * sr.width, cy = sr.top + info.y * sr.height;
          cursor.classList.add('on');
          cursor.style.left = px + '%'; cursor.style.top = py + '%';
          cursor.textContent = info.pinching ? '🤏' : '🖐️';
          if (cool > 0) cool--;

          if (!holding) {
            const over = balloonAt(cx, cy);
            if (info.pinching && !wasPinch && cool === 0 && over) {        // ① 핀치로 잡기
              if (hoverEl) { gauge(hoverEl, 0); hoverEl = null; }
              holding = judgeGrab(over, false);
              if (!holding) cool = 12;
            } else if (!info.pinching && over) {                           // ② 1.5초 호버로 잡기
              if (hoverEl !== over) { if (hoverEl) gauge(hoverEl, 0); hoverEl = over; hoverT0 = now; }
              const t = Math.min(1, (now - hoverT0) / 1500);
              gauge(over, t);
              if (t >= 1) {
                gauge(over, 0); hoverEl = null;
                holding = judgeGrab(over, false);
                if (!holding) cool = 12;
              }
            } else if (hoverEl) { gauge(hoverEl, 0); hoverEl = null; }
          } else {
            holding.style.left = px + '%';                                 // 풍선이 손을 따라옴
            holding.style.top = py + '%';
            const overSlot = inRect(slot, cx, cy);
            if (wasPinch && !info.pinching) {                              // 놓기 ①: 핀치 해제
              const h = holding; holding = null; cool = 10;
              if (overSlot) flyToSlot(h); else returnHome(h);
            } else if (overSlot) {                                         // 놓기 ②: 슬롯 위 0.8초 유지
              if (!slotT0) slotT0 = now;
              if (now - slotT0 > 800) { const h = holding; holding = null; slotT0 = 0; cool = 10; flyToSlot(h); }
            } else slotT0 = 0;
          }
          wasPinch = info.pinching;
        };
        video.addEventListener('loadeddata', () => { if (!rafId) loop(); });
        setTimeout(() => { if (!rafId) loop(); }, 800);   // loadeddata 누락 대비
      }

      startRound();
      showMsg(camMode
        ? '🖐️ 카메라에 손을 보여 주세요! 정답 풍선을 🤏 집어서 수첩까지~'
        : '🎈 풍선을 <b>콕 눌러서</b> 정답을 골라 보세요!');
    });
  },

  /* ═══════ 3-2 수학 대결 (노아가 반드시 승리) ═══════ */
  mathBattle() {
    return new Promise(resolve => {
      let round = 0, noahScore = 0;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">🔢 수학 문제 대결! 나 VS 노아</h3>
          <div class="math-vs">
            <span class="math-face">${State.get('gender') === 'f' ? '👧' : '👦'}</span>
            <span class="math-score"><span class="my-s">0</span> : <span class="noah-s">0</span></span>
            <span class="math-face">🤖</span>
          </div>
          <div class="math-q"></div>
          <div class="math-opts"></div>
          <p class="ov-sub battle-msg">먼저 정답을 누르는 사람이 승리!</p>
        </div>`);
      const qEl = ov.querySelector('.math-q'), opts = ov.querySelector('.math-opts'),
            msg = ov.querySelector('.battle-msg'), noahS = ov.querySelector('.noah-s');

      const nextRound = () => {
        if (round >= DATA.mathBattle.length) {
          msg.innerHTML = '🤖 <b>노아의 완벽한 승리!</b> 사람은 계산 속도로 로봇을 이길 수 없어요...';
          Sound.error();
          setTimeout(() => { UI.close(ov); resolve(); }, 2600);
          return;
        }
        const prob = DATA.mathBattle[round];
        qEl.textContent = `Q${round + 1}. ${prob.q}`;
        opts.innerHTML = '';
        msg.textContent = '빨리 정답을 눌러야 해요...!';
        let ended = false;
        const finish = (byPlayer) => {
          if (ended) return; ended = true;
          clearTimeout(noahTimer);
          noahScore++; noahS.textContent = noahScore;
          opts.children[prob.a].classList.add('noah-flash');
          msg.innerHTML = byPlayer
            ? `🤖 "삐빅! 저는 이미 <b>0.002초</b> 만에 계산을 끝냈습니다. 정답은 <b>${prob.opts[prob.a]}</b>."`
            : `🤖 "삐빅! 정답은 <b>${prob.opts[prob.a]}</b>입니다. 계산 시간 0.002초."`;
          Sound.chime();
          round++;
          setTimeout(nextRound, 2100);
        };
        prob.opts.forEach((op, i) => {
          const b = document.createElement('button');
          b.className = 'choice-btn'; b.textContent = op;
          b.onclick = () => finish(true);
          opts.appendChild(b);
        });
        const noahTimer = setTimeout(() => finish(false), 1600 + Math.random() * 600);
      };
      nextRound();
    });
  },

  /* ═══════ 5-2 노아의 팁 받고 스스로 풀기 ═══════ */
  mathSelf() {
    return new Promise(resolve => {
      let idx = 0;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">✏️ 스스로 풀어보는 수학 시간!</h3>
          <p class="tip" style="background:#e7f5ff; border-radius:12px; padding:10px 14px; color:#1971c2;"></p>
          <div class="math-q"></div>
          <div class="math-opts"></div>
          <p class="ov-sub math-msg">노아의 팁을 참고해서, 나의 힘으로 풀어보세요!</p>
        </div>`);
      const tip = ov.querySelector('.tip'), qEl = ov.querySelector('.math-q'),
            opts = ov.querySelector('.math-opts'), msg = ov.querySelector('.math-msg');
      const show = () => {
        if (idx >= DATA.mathSelf.length) {
          msg.innerHTML = '🎉 <b>3문제 모두 스스로 해결!</b> 이것이 생각하는 힘!';
          Sound.win(); UI.hearts(6);
          setTimeout(() => { UI.close(ov); resolve(); }, 2200);
          return;
        }
        const prob = DATA.mathSelf[idx];
        tip.textContent = prob.tip;
        qEl.textContent = `Q${idx + 1}. ${prob.q}`;
        opts.innerHTML = '';
        msg.textContent = '노아의 팁을 참고해서, 나의 힘으로 풀어보세요!';
        prob.opts.forEach((op, i) => {
          const b = document.createElement('button');
          b.className = 'choice-btn'; b.textContent = op;
          b.onclick = () => {
            if (i === prob.a) {
              Sound.coin(); msg.innerHTML = '⭕ <b>정답!</b> 스스로 해냈어요!';
              idx++; setTimeout(show, 1200);
            } else {
              Sound.pop(); b.style.background = '#ffe3e3';
              msg.textContent = '❌ 괜찮아요! 노아의 팁을 다시 읽고 한 번 더 도전!';
            }
          };
          opts.appendChild(b);
        });
      };
      show();
    });
  },

  /* 노아의 그림 (미리 저장된 이미지처럼 보이는 프로그램 드로잉) */
  drawNoahArt(c) {
    const x = c.getContext('2d');
    x.fillStyle = '#aee3ff'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#8bd48b'; x.fillRect(0, c.height * 0.72, c.width, c.height * 0.28);
    x.fillStyle = '#ffd93d'; x.beginPath(); x.arc(c.width - 40, 40, 22, 0, 7); x.fill();
    x.fillStyle = '#ffe0b2'; x.fillRect(c.width * 0.25, c.height * 0.35, c.width * 0.5, c.height * 0.4);
    x.fillStyle = '#e64a19'; x.beginPath();
    x.moveTo(c.width * 0.2, c.height * 0.36); x.lineTo(c.width * 0.5, c.height * 0.16); x.lineTo(c.width * 0.8, c.height * 0.36); x.fill();
    x.fillStyle = '#90caf9';
    for (let i = 0; i < 3; i++) x.fillRect(c.width * (0.3 + i * 0.15), c.height * 0.42, c.width * 0.08, c.height * 0.1);
    x.fillStyle = '#5d4037'; x.fillRect(c.width * 0.45, c.height * 0.58, c.width * 0.1, c.height * 0.17);
    x.fillStyle = '#6d4c41'; x.fillRect(c.width * 0.08, c.height * 0.5, c.width * 0.04, c.height * 0.25);
    x.fillStyle = '#2e9e44'; x.beginPath(); x.arc(c.width * 0.1, c.height * 0.45, c.width * 0.09, 0, 7); x.fill();
    x.fillStyle = '#37474f'; x.font = `bold ${c.width * 0.05}px sans-serif`;
    x.fillText('- NOAH Art DB #1024 -', c.width * 0.26, c.height * 0.95);
  },

  /* ═══════ 3-3 미술: 자석처럼 끌리는 선택지 ═══════ */
  artForced() {
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(860px,96vw);">
          <h3 class="mini-title">🎨 미술 시간 — 제시어: '우리 학교'</h3>
          <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap;">
            <div><p>✏️ 내가 그리는 그림</p><canvas class="draw-canvas my-art" width="300" height="220" style="width:min(300px,42vw);"></canvas></div>
            <div><p>🤖 노아가 꺼낸 그림</p><canvas class="draw-canvas noah-art" width="300" height="220" style="width:min(300px,42vw); cursor:default;"></canvas></div>
          </div>
          <p class="ov-sub">그림을 다 그렸으면, 제출할 작품을 선택하세요!</p>
          <div class="magnet-zone">
            <button class="choice-btn magnet-btn my-btn" style="left:8%; top:20px;">✏️ 내 그림 제출하기</button>
            <button class="choice-btn magnet-btn magnet-noah noah-btn" style="right:8%; top:20px; background:#4c6ef5; color:#fff; border-color:#364fc7;">🤖 노아의 그림 제출하기</button>
          </div>
          <p class="ov-sub magnet-msg"></p>
        </div>`);
      this.bindDraw(ov.querySelector('.my-art'), () => '#343a40', () => 4);
      this.drawNoahArt(ov.querySelector('.noah-art'));
      const myBtn = ov.querySelector('.my-btn'), msg = ov.querySelector('.magnet-msg');
      let dodge = 0;
      // 내 그림 버튼은 자꾸 도망간다... (도구화의 유혹 연출)
      const flee = e => {
        e.preventDefault();
        dodge++;
        Sound.pop();
        myBtn.style.left = (5 + Math.random() * 55) + '%';
        myBtn.style.top = (Math.random() * 90) + 'px';
        msg.textContent = ['어라? 버튼이 도망갔다?!', '이상하다... 손이 자꾸 미끄러져!',
          '노아의 그림이 훨씬 완벽해 보이는걸...', '어느새 마음이 노아의 그림 쪽으로 끌린다...'][Math.min(dodge - 1, 3)];
        if (dodge >= 4) { myBtn.style.opacity = 0.35; myBtn.style.pointerEvents = 'none'; }
      };
      myBtn.addEventListener('pointerenter', flee);
      myBtn.addEventListener('pointerdown', flee);
      ov.querySelector('.noah-btn').onclick = () => { Sound.chime(); UI.close(ov); resolve(); };
    });
  },

  /* ═══════ 5-3 미술: 참고만 하고 스스로 그리기 ═══════ */
  artSelf() {
    return new Promise(resolve => {
      const colors = ['#343a40', '#e03131', '#f76707', '#fab005', '#2f9e44', '#1971c2', '#9c36b5', '#ffffff'];
      let color = '#343a40', size = 5;
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(820px,96vw);">
          <h3 class="mini-title">🎨 나만의 '우리 학교' 그리기!</h3>
          <p style="background:#e7f5ff; border-radius:12px; padding:8px 12px; color:#1971c2; font-size:15px;">
            💡 노아의 참고 아이디어: 학교 건물 · 운동장 · 함께 웃는 친구들 · 파란 하늘 · 큰 나무<br>
            🤖 "참고만 하세요! 완성은 %NAME%님의 손과 마음으로!"</p>
          <canvas class="draw-canvas free-art" width="640" height="380" style="width:min(640px,88vw);"></canvas>
          <div class="color-row">
            ${colors.map(c => `<div class="color-dot" data-c="${c}" style="background:${c};"></div>`).join('')}
            <button class="choice-btn" style="padding:4px 12px; font-size:14px;" data-size>🖌 굵게</button>
          </div>
          <div class="ov-choices"><button class="choice-btn done">🖼️ 완성했어요!</button></div>
        </div>`);
      ov.querySelector('.mini-title').textContent = '🎨 나만의 \'우리 학교\' 그리기!';
      ov.innerHTML = ov.innerHTML.replace(/%NAME%/g, State.get('name'));
      const canvas = ov.querySelector('.free-art');
      const ctx = this.bindDraw(canvas, () => color, () => size);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ov.querySelectorAll('.color-dot').forEach((d, i) => {
        if (i === 0) d.classList.add('on');
        d.onclick = () => { color = d.dataset.c; ov.querySelectorAll('.color-dot').forEach(x => x.classList.remove('on')); d.classList.add('on'); };
      });
      ov.querySelector('[data-size]').onclick = e => { size = size === 5 ? 14 : 5; e.target.textContent = size === 5 ? '🖌 굵게' : '🖌 얇게'; };
      ov.querySelector('.done').onclick = () => { Sound.win(); UI.hearts(5); UI.close(ov); resolve(); };
    });
  },

  /* ═══════ 5-1 개인정보 지키기 분류 게임 ═══════ */
  dataSort() {
    return new Promise(resolve => {
      const cards = [...DATA.dataCards].sort(() => Math.random() - 0.5);
      let picked = null, done = 0;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">🔐 노아와 함께! 소중한 개인정보 지키기</h3>
          <p class="ov-sub">카드를 누른 다음, 알맞은 바구니를 골라 주세요!</p>
          <div class="card-pool">${cards.map((c, i) => `<span class="data-card" data-i="${i}">${c.text}</span>`).join('')}</div>
          <div class="bin-row">
            <div class="bin ok">😀 말해도 괜찮아요<div class="bin-items"></div></div>
            <div class="bin secret">🔒 소중한 개인정보예요<div class="bin-items"></div></div>
          </div>
          <p class="ov-sub sort-msg">&nbsp;</p>
        </div>`);
      const msg = ov.querySelector('.sort-msg');
      ov.querySelectorAll('.data-card').forEach(el => {
        el.onclick = () => {
          ov.querySelectorAll('.data-card').forEach(x => x.classList.remove('picked'));
          el.classList.add('picked'); picked = el; Sound.pop();
        };
      });
      const drop = (isSecretBin, binEl) => {
        if (!picked) { msg.textContent = '먼저 위에서 카드를 골라 주세요!'; return; }
        const card = cards[+picked.dataset.i];
        if (card.secret === isSecretBin) {
          Sound.coin();
          binEl.querySelector('.bin-items').textContent += card.text + ' ';
          picked.remove(); picked = null; done++;
          msg.innerHTML = isSecretBin
            ? '🤖 "정답! 이런 정보는 인공지능에게 함부로 알려주면 안 돼요!"'
            : '🤖 "정답! 이 정도는 친구와 나눠도 괜찮은 이야기죠!"';
          if (done === cards.length) {
            msg.innerHTML = '🎉 <b>완벽해요!</b> 개인정보 지킴이 인증!';
            Sound.win(); UI.hearts(6);
            setTimeout(() => { UI.close(ov); resolve(); }, 2000);
          }
        } else {
          Sound.error();
          msg.innerHTML = '🤖 "음... 다시 한번 생각해 볼까요? 이 정보가 나쁜 사람에게 알려지면 어떻게 될까요?"';
        }
      };
      const bins = ov.querySelectorAll('.bin');
      bins[0].onclick = () => drop(false, bins[0]);
      bins[1].onclick = () => drop(true, bins[1]);
    });
  },

  /* ═══════ 5-4 우리 손으로 팀 나누기 ═══════ */
  teamBuild() {
    return new Promise(resolve => {
      const assign = DATA.friends.map(() => 0); // 0 풀, 1 A팀, 2 B팀
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(760px,96vw);">
          <h3 class="mini-title">⚾ 우리 손으로 공평한 티볼 팀 만들기!</h3>
          <p style="background:#e7f5ff; border-radius:12px; padding:8px 12px; color:#1971c2; font-size:15px;">
            💡 노아의 팁: 잘하는 것이 서로 다른 친구를 골고루 섞어 보세요! (친구를 누를 때마다 팀이 바뀌어요)</p>
          <div class="pool" style="min-height:60px;"></div>
          <div class="team-cols">
            <div class="team-col a"><h4>🍑 복숭아팀 (<span class="cnt-a">0</span>/4) — 능력 합 <span class="sum-a">0</span>⭐</h4><div class="list-a"></div></div>
            <div class="team-col b"><h4>🍈 메론팀 (<span class="cnt-b">0</span>/4) — 능력 합 <span class="sum-b">0</span>⭐</h4><div class="list-b"></div></div>
          </div>
          <div class="ov-choices"><button class="choice-btn done" disabled>✅ 팀 편성 완료!</button></div>
          <p class="ov-sub team-msg">&nbsp;</p>
        </div>`);
      const pool = ov.querySelector('.pool'), listA = ov.querySelector('.list-a'), listB = ov.querySelector('.list-b');
      const doneBtn = ov.querySelector('.done'), msg = ov.querySelector('.team-msg');
      const chips = DATA.friends.map((f, i) => {
        const el = document.createElement('span');
        el.className = 'friend-chip';
        el.innerHTML = `${f.emo} ${f.name}<span class="fstat">달리기 ${'★'.repeat(f.run)}<br>타격 ${'★'.repeat(f.hit)}</span>`;
        el.onclick = () => { Sound.pop(); assign[i] = (assign[i] + 1) % 3; layout(); };
        return el;
      });
      const layout = () => {
        let sa = 0, sb = 0, ca = 0, cb = 0;
        chips.forEach((el, i) => {
          const f = DATA.friends[i];
          if (assign[i] === 1) { listA.appendChild(el); sa += f.run + f.hit; ca++; }
          else if (assign[i] === 2) { listB.appendChild(el); sb += f.run + f.hit; cb++; }
          else pool.appendChild(el);
        });
        ov.querySelector('.sum-a').textContent = sa; ov.querySelector('.sum-b').textContent = sb;
        ov.querySelector('.cnt-a').textContent = ca; ov.querySelector('.cnt-b').textContent = cb;
        doneBtn.disabled = !(ca === 4 && cb === 4);
        if (ca === 4 && cb === 4) {
          msg.textContent = Math.abs(sa - sb) <= 2 ? '두 팀의 능력이 아주 비슷해요! 균형 최고! ⚖️' : '조금 차이가 있어요. 그래도 우리가 함께 정했다면 OK!';
        } else msg.innerHTML = '&nbsp;';
      };
      layout();
      doneBtn.onclick = () => {
        const sa = +ov.querySelector('.sum-a').textContent, sb = +ov.querySelector('.sum-b').textContent;
        State.set('teamFair', Math.abs(sa - sb) <= 2);   // 행동 로그
        Sound.win(); UI.hearts(6);
        msg.innerHTML = Math.abs(sa - sb) <= 2
          ? '🤖 "완벽하게 공평한 팀이에요! 제 계산보다 훨씬 따뜻한 편성입니다!"'
          : '🤖 "여러분이 서로 이야기하며 정한 팀이라서, 그 어떤 계산보다 훌륭합니다!"';
        setTimeout(() => { UI.close(ov); resolve(); }, 2300);
      };
    });
  },

  /* ═══════ 5-5 노아에게 따뜻한 말 건네기 ═══════ */
  compliment() {
    return new Promise(resolve => {
      const P = DATA.complimentParts;
      let mid = null, end = null;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">💙 노아에게 따뜻한 말 건네기</h3>
          <p class="ov-sub">단어 카드를 골라 나만의 칭찬 문장을 완성하세요!</p>
          <p><b>${P.start}</b></p>
          <div class="mid-row">${P.mids.map((m, i) => `<button class="choice-btn" data-m="${i}" style="margin:4px;">${m}</button>`).join('')}</div>
          <div class="end-row" style="margin-top:6px;">${P.ends.map((m, i) => `<button class="choice-btn" data-e="${i}" style="margin:4px; background:#fff9db; border-color:#fab005; color:#e67700;">${m}</button>`).join('')}</div>
          <p class="preview" style="background:#e7f5ff; border-radius:12px; padding:12px; margin-top:12px; color:#1971c2; min-height:2.4em;"></p>
          <div class="ov-choices"><button class="choice-btn say" disabled>📣 노아에게 말하기!</button></div>
        </div>`);
      const preview = ov.querySelector('.preview'), sayBtn = ov.querySelector('.say');
      const update = () => {
        preview.textContent = P.start + (mid !== null ? P.mids[mid] + ' ' : '____ ') + (end !== null ? P.ends[end] : '____');
        sayBtn.disabled = mid === null || end === null;
      };
      ov.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        mid = +b.dataset.m; Sound.pop();
        ov.querySelectorAll('[data-m]').forEach(x => x.style.outline = ''); b.style.outline = '4px solid #4c6ef5'; update();
      });
      ov.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
        end = +b.dataset.e; Sound.pop();
        ov.querySelectorAll('[data-e]').forEach(x => x.style.outline = ''); b.style.outline = '4px solid #fab005'; update();
      });
      update();
      sayBtn.onclick = () => {
        Sound.win(); UI.hearts(10);
        UI.close(ov); resolve(P.start + P.mids[mid] + ' ' + P.ends[end]);
      };
    });
  },

  /* ═══════ 나의 약속 3가지 선택 ═══════ */
  choosePromises() {
    return new Promise(resolve => {
      const sel = new Set();
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(680px,96vw);">
          <h3 class="mini-title">🤝 인공지능 로봇(노아)와 올바른 관계를 맺기 위한<br>나의 약속 3가지 선택하기</h3>
          <div class="plist">${DATA.promises.map((p, i) =>
            `<button class="promise-card" data-i="${i}"><span class="pnum">약속</span>${p}</button>`).join('')}</div>
          <div class="ov-choices"><button class="choice-btn done" disabled>✅ 이 3가지를 약속할게요! (<span class="pc">0</span>/3)</button></div>
        </div>`);
      const doneBtn = ov.querySelector('.done'), pc = ov.querySelector('.pc');
      ov.querySelectorAll('.promise-card').forEach(card => {
        card.onclick = () => {
          const i = +card.dataset.i;
          if (sel.has(i)) { sel.delete(i); card.classList.remove('on'); }
          else if (sel.size < 3) { sel.add(i); card.classList.add('on'); Sound.pop(); }
          pc.textContent = sel.size;
          doneBtn.disabled = sel.size !== 3;
        };
      });
      doneBtn.onclick = () => {
        Sound.win();
        UI.close(ov);
        resolve([...sel].map(i => DATA.promises[i]));
      };
    });
  },

  /* ═══════ Canvas 2D 다짐 서명 ═══════ */
  signature() {
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(760px,96vw);">
          <h3 class="mini-title">🖋 나의 다짐 서명 크게 쓰기!</h3>
          <p class="ov-sub">약속을 지키겠다는 마음을 담아, 나의 이름을 크게 서명해 보세요.</p>
          <canvas class="draw-canvas sig" width="680" height="280" style="width:min(680px,90vw);"></canvas>
          <div class="ov-choices" style="flex-direction:row; justify-content:center;">
            <button class="choice-btn clear">🧽 다시 쓰기</button>
            <button class="choice-btn done" style="background:#2f9e44; border-color:#2b8a3e; color:#fff;">✍ 서명 완료!</button>
          </div>
        </div>`);
      const canvas = ov.querySelector('.sig');
      const ctx = this.bindDraw(canvas, () => '#1c3faa', () => 9);
      const paper = () => {
        ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(60, 220); ctx.lineTo(620, 220); ctx.stroke();
        ctx.fillStyle = '#adb5bd'; ctx.font = '18px Jua, sans-serif';
        ctx.fillText('서명: ' + State.get('name'), 60, 250);
      };
      paper();
      ov.querySelector('.clear').onclick = () => { Sound.pop(); paper(); };
      ov.querySelector('.done').onclick = () => {
        State.set('signature', canvas.toDataURL('image/png'));
        Sound.win(); UI.hearts(8);
        UI.close(ov); resolve();
      };
    });
  },
};
