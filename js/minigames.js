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
          <p class="ov-sub">카드 속 행동은 노아를 '무엇'으로 대하는 걸까요? <알맞은 구역>을 눌러 주세요! (<span class="bal-n">1</span>/${cards.length})</p>
          <div class="math-q bal-card"></div>
          <div class="spectrum" style="margin:10px auto 0;">
            <div class="spec-zones">
              <button class="spec-zone bad bal-btn" data-k="tool">🔧 도구로 대함<small>단순한 도구로 보는 관계</small></button>
              <button class="spec-zone good bal-btn" data-k="balance">💙 바람직한 관계<small>도덕에 기반을 둔 관계</small></button>
              <button class="spec-zone bad2 bal-btn" data-k="person">👤 사람과 똑같이 대함<small>과하게 의존하는 관계</small></button>
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
        // 카메라 없는 PC용: 성별별 실사 얼굴 사진 위에 초록 스캔 오버레이 (실감나는 스캔 연출)
        const c = ov.querySelector('.scan-view'), x = c.getContext('2d'), W = 420, H = 315;
        // 초록 얼굴 인식 오버레이 (사진 위 / 폴백 도형 위 공통)
        const drawScanOverlay = () => {
          x.strokeStyle = '#4dffa0'; x.lineWidth = 3;
          x.beginPath(); x.ellipse(210, 155, 82, 104, 0, 0, Math.PI * 2); x.stroke();   // 얼굴 인식 타원
          x.lineWidth = 4;                                                              // 모서리 브래킷
          [[128, 51], [292, 51], [128, 259], [292, 259]].forEach(([bx, by], i) => {
            const dx = i % 2 ? -22 : 22, dy = i < 2 ? 22 : -22;
            x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + dx, by); x.moveTo(bx, by); x.lineTo(bx, by + dy); x.stroke();
          });
          x.fillStyle = '#4dffa0'; x.font = '14px monospace';
          x.fillText('[ SCANNING FACE... ]', 132, 26);
        };
        // 폴백: 사진 로드 실패(file:// 등) 시 기존 상상 스캔 도형
        const drawFallback = () => {
          x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
          x.strokeStyle = '#1d4ed8'; x.lineWidth = 1;
          for (let i = 0; i < W; i += 26) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
          for (let i = 0; i < H; i += 26) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
          x.beginPath(); x.arc(180, 135, 9, 0, Math.PI * 2); x.strokeStyle = '#4dffa0'; x.lineWidth = 3; x.stroke();
          x.beginPath(); x.arc(240, 135, 9, 0, Math.PI * 2); x.stroke();
          drawScanOverlay();
        };
        x.fillStyle = '#0b1220'; x.fillRect(0, 0, W, H);
        const img = new Image();
        img.onload = () => {
          const ir = img.width / img.height, cr = W / H;   // cover-fit 크롭
          let sw, sh, sx, sy;
          if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
          else { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
          x.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
          drawScanOverlay();
        };
        img.onerror = drawFallback;
        img.src = 'media/image/' + (State.get('gender') === 'f' ? 'face_scan_female.PNG' : 'face_scan_male.PNG');
      }
      const log = ov.querySelector('.scan-log');
      const logs = [
        '> 얼굴 인식 시작...', '> 눈 2개 확인... [OK]', '> 코 1개 확인... [OK]', '> 입 1개 확인... [OK]',
        `> 미소 지수: ${85 + Math.floor(Math.random() * 14)}%  😊`,
        `> 판정: 아주 멋진 얼굴입니다!`,
        '> 얼굴 데이터를 노아의 메모리에 저장 중... ■■■■■■■■■■ 100%',
        '> ⚠ 저장 완료. 이 데이터는 삭제될 예정입니다.',
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
        <h3 class="mini-title">${tool ? '✊✌️🖐 가위바위보 대결! 나 VS 노아' : '💌 봉인 가위바위보! 공정한 재대결'}</h3>
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
        noahHand.textContent = '💌';
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
          me:   '🤖 "졌다...! 그래도 즐거워요! 🎉"',
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

  /* ═══════ 🪜 약속의 계단 — 9원칙 제목↔뜻 복습 등반 (기억 풍선 개편판 · 카메라 불필요) ═══════
     시스템 오류로 흩어진 약속 조각이 계단이 되었다 — 오프닝 등굣길 카드 수집과 수미상관.
     CSS 아이소메트릭(개별 타일 rotateX+rotateZ, preserve-3d/perspective 없음 → 구형기기 안전).
     문제 카드는 화면 상단(계단 전경을 가리지 않게). 1~3라운드 2지선다 → 이후 3지선다.
     정답: 계단 한 칸 점등 + 등반 / 오답: 계단 흔들림 + 그 선택지 제거(자비 규칙) — 하강 없음.
     첫 시도 정답 = ⭐ → State.stairStars (0~9, 헌장 뱃지 연계 후보) */
  stairsGame() {
    const rounds = [...DATA.moralItems].sort(() => Math.random() - 0.5);
    const N = rounds.length;                                    // 9칸
    const me = State.get('gender') === 'f' ? '💖' : '💖';

    // 무대 설계 좌표(px) — .stg-scene은 이 크기로 그리고 scale로 화면에 맞춘다
    const W = 780, H = 480, DX = 64, DY = 40;
    const px = i => 84 + i * DX;                                // i=0 출발지 · 1~9 계단 (9=꼭대기)
    const py = i => H - 70 - i * DY;

    return new Promise(resolve => {
      let tiles = '';
      for (let i = 0; i <= N; i++)
        tiles += `<div class="stg-tile${i === 0 ? ' start' : ''}${i === N ? ' top' : ''}" style="left:${px(i)}px; top:${py(i)}px"></div>`;

      const ov = UI.overlay(`
        <div class="stg-stage">
          <div class="stg-hud">
            <span class="stg-chip stg-progress">📔 0/${N}</span>
            <span class="stg-chip">🪜 약속의 계단</span>
            <span class="stg-chip stg-stars">⭐ 0</span>
          </div>
          <div class="stg-q"></div>
          <div class="stg-opts"></div>
          <div class="stg-msg"></div>
          <div class="stg-scenebox">
            <div class="stg-scene">
              ${tiles}
              <div class="stg-flag" style="left:${px(N) + 48}px; top:${py(N) - 22}px">🚩</div>
              <div class="stg-actor stg-noahchar" style="left:${px(N) + 24}px; top:${py(N)}px"><span>🤖</span></div>
              <div class="stg-actor stg-mechar" style="left:${px(0)}px; top:${py(0)}px"><span>${me}</span></div>
            </div>
          </div>
        </div>`, 'stg-ov');
      const sceneBox = ov.querySelector('.stg-scenebox'),
            scene = ov.querySelector('.stg-scene'),
            qEl = ov.querySelector('.stg-q'),
            optsEl = ov.querySelector('.stg-opts'),
            msgEl = ov.querySelector('.stg-msg'),
            meEl = ov.querySelector('.stg-mechar'),
            noahEl = ov.querySelector('.stg-noahchar'),
            tileEls = ov.querySelectorAll('.stg-tile'),
            progressEl = ov.querySelector('.stg-progress'),
            starsEl = ov.querySelector('.stg-stars');

      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b class="stg-hl">$1</b>');
      const showMsg = t => { msgEl.innerHTML = t; };

      // 씬을 화면(scenebox)에 맞춰 축소 — 게임 좌표는 설계 좌표계 그대로 유지
      const fit = () => {
        // 상한을 낮게 잡으면 큰 모니터에서 계단이 화면 가운데 작게 떠 보인다 — 여유 공간을 거의 다 채우도록 넉넉히 확대
        const s = Math.min(sceneBox.clientWidth / W, sceneBox.clientHeight / H, 2.2) * 0.94;
        scene.style.transform = `scale(${s})`;
      };
      window.addEventListener('resize', fit);
      fit();                                     // 즉시 1회 (rAF는 백그라운드 탭에서 멎을 수 있음)
      requestAnimationFrame(fit);

      let round = 0, stars = 0, firstTry = true, current = null, lock = false;

      const hop = (el, i) => {                     // 배우를 i번 칸으로 통통 점프 (제자리도 가능)
        el.style.left = px(i) + 'px';
        el.style.top = py(i) + 'px';
        el.classList.remove('hop'); void el.offsetWidth;
        el.classList.add('hop');
      };

      const finish = () => {                       // 꼭대기 도착 — 노아와 하이파이브 🙌
        State.set('stairStars', stars);            // 첫 시도 정답 수 (헌장 뱃지 연계 후보)
        Sound.win(); UI.hearts(8);
        const fd = (State.get('friendDef') || '').trim();
        qEl.innerHTML = `🎉 <b>꼭대기 도착!</b> 노아와 하이파이브! (첫 시도 정답 ⭐×${stars})`;
        showMsg(`🤖 "${fd ? `'${esc(fd)}' 같은 친구` : '멋진 친구'} 덕분에, 아홉 가지 약속이 전부 반짝여요!"`);
        const five = document.createElement('div');
        five.className = 'stg-five';
        five.style.left = (px(N) + 12) + 'px';
        five.style.top = (py(N) - 52) + 'px';
        five.textContent = '🙌';
        scene.appendChild(five);
        hop(noahEl, N);                            // 노아도 제자리에서 기쁨의 점프
        setTimeout(() => {
          window.removeEventListener('resize', fit);
          UI.close(ov); resolve(stars);
        }, 3300);
      };

      const correct = btn => {
        lock = true;
        btn.classList.add('good');
        Sound.coin();
        if (firstTry) { stars++; starsEl.textContent = '⭐ ' + stars; UI.hearts(3); }
        round++;
        progressEl.textContent = `📔 ${round}/${N}`;
        tileEls[round].classList.add('lit');       // [0]=출발지라 인덱스가 곧 칸 번호
        const ic = document.createElement('div');  // 켜진 계단 위에 약속 아이콘이 남는다
        ic.className = 'stg-icon';
        ic.style.left = px(round) + 'px';
        ic.style.top = (py(round) - 42) + 'px';
        ic.textContent = current.icon;
        scene.appendChild(ic);
        hop(meEl, round);
        showMsg(`🤖 "${esc(current.title)}, 맞아요! 계단이 반짝 켜졌어요!"`);
        setTimeout(() => {
          if (round >= N) finish();
          else { lock = false; startRound(); }
        }, 1000);
      };

      const wrong = btn => {                       // 자비 규칙: 하강 없음, 오답 선택지만 제거
        firstTry = false;
        Sound.error();
        btn.disabled = true;
        btn.classList.add('out');
        setTimeout(() => btn.remove(), 440);
        if (UI.motionOK()) {
          sceneBox.classList.remove('quake'); void sceneBox.offsetWidth;
          sceneBox.classList.add('quake');
          meEl.classList.remove('wob'); void meEl.offsetWidth;
          meEl.classList.add('wob');
        }
        showMsg('으아앗, 떨어질 뻔! 🤖 "괜찮아요, 뜻을 한 번 더 읽어 볼까요?"');
      };

      const startRound = () => {
        current = rounds[round];
        firstTry = true;
        qEl.innerHTML = `<span class="stg-qnum">${round + 1}번째 계단</span> "${fmt(current.q || current.text)}" — 이 약속의 이름은?`;
        const nWrong = round < 3 ? 1 : 2;          // 1~3라운드는 2지선다로 적응
        const wrongs = DATA.moralItems.filter(m => m.id !== current.id)
          .sort(() => Math.random() - 0.5).slice(0, nWrong);
        const opts = [current, ...wrongs].sort(() => Math.random() - 0.5);
        optsEl.innerHTML = '';
        opts.forEach(m => {
          const b = document.createElement('button');
          b.className = 'stg-opt set-' + m.set;    // 🤖노랑 / 🧭주황 / 📱파랑 (수첩과 같은 색 언어)
          b.innerHTML = `${m.icon} ${esc(m.title)}`;
          b.onclick = () => { if (!lock && !b.disabled) (m.id === current.id ? correct : wrong)(b); };
          optsEl.appendChild(b);
        });
      };

      startRound();
      showMsg('뜻을 읽고 알맞은 <b>약속의 이름</b>을 고르면, 계단이 켜지고 한 칸 올라가요!');
    });
  },

  /* ═══════ 🧠 노아 두뇌 데이터 주입기 (이순신 장난 대체 · CSS 3D — 2-4 보강판) ═══════
     ⓪ 건강한 지식 3개를 플레이어가 탭으로 확인(오염의 대비) → ① 동혁의 거짓 카드 등장
     ② '차단하기🛡️' 버튼이 4번 손을 피함 → ③ 카드가 여러 장으로 분열 — 탭으로 터뜨리지만
        마지막 1장은 터지지 않고 큐브에 흡수("거의 막을 뻔했는데" = 무력감 증폭)
     ④ 슬롯 오염 + 옆 지식까지 연쇄 지지직(잘못된 데이터는 번진다)
     ⑤ 예측 퀴즈("노아는 뭐라고 답할까?") → 플립 확인 → 폭소 → 선생님의 교정. */
  dataInjector() {
    return new Promise(resolve => {
      const W = 780, H = 470;
      const ov = UI.overlay(`
        <div class="di-stage">
          <div class="di-hud"><span class="di-chip">🧠 노아의 지식 데이터베이스</span></div>
          <div class="di-cap"></div>
          <div class="di-scenebox">
            <div class="di-scene">
              <div class="di-flash"></div>
              <div class="di-slot chk" style="left:390px; top:56px;">
                <span class="di-slot-key">한글 창제 =</span>
                <b class="di-slot-a">세종대왕</b><span class="di-slot-ok">✅</span></div>
              <div class="di-mini chk" style="left:180px; top:140px;">지구 = 둥글다 ✅</div>
              <div class="di-mini chk" style="left:600px; top:140px;">1 + 1 = 2 ✅</div>
              <div class="di-cube" style="left:390px; top:300px;">
                <div class="di-cube-face"></div></div>
              <div class="di-card hidden" style="left:150px; top:250px;">
                <div class="di-card-t">🤷‍♂️ 동혁이 알려준 것</div>
                <div class="di-card-b">한글 창제 = <b>이순신 장군님</b></div></div>
              <button class="di-shield hidden" style="left:560px; top:250px;">🛡️ 차단하기!</button>
              <div class="di-quiz hidden">
                <p class="di-quiz-q">👨‍🏫 "우리 한글을 만드신 분은 누구일까요?"</p>
                <p class="di-guess-q">🤔 노아는 뭐라고 답할까? 예상해 보자!</p>
                <div class="di-guess">
                  <button class="choice-btn">세종대왕</button>
                  <button class="choice-btn">이순신 장군</button>
                </div>
                <div class="di-flip hidden"><div class="di-flip-in">
                  <div class="di-flip-f front">🤖 ???</div>
                  <div class="di-flip-f back">🤖 "이순신 장군님이요!"</div>
                </div></div>
                <div class="di-laugh hidden">😂 푸하하! 로봇이 그걸 틀려?!</div>
              </div>
            </div>
          </div>
          <div class="ov-choices"><button class="choice-btn di-done hidden">...그랬구나</button></div>
        </div>`, 'di-ov');
      const sceneBox = ov.querySelector('.di-scenebox'), scene = ov.querySelector('.di-scene');
      const fit = () => { const s = Math.min(sceneBox.clientWidth / W, sceneBox.clientHeight / H, 1.5) * 0.96; scene.style.transform = `scale(${s})`; };
      window.addEventListener('resize', fit); fit(); setTimeout(fit, 120);

      const cap = ov.querySelector('.di-cap'), card = ov.querySelector('.di-card'),
            shield = ov.querySelector('.di-shield'), cube = ov.querySelector('.di-cube'),
            slot = ov.querySelector('.di-slot'), flash = ov.querySelector('.di-flash'),
            minis = [...ov.querySelectorAll('.di-mini')];
      const setCap = t => { cap.innerHTML = t; };
      let autoT = null, chkT = null;
      const timers = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
      const cleanup = () => { window.removeEventListener('resize', fit); clearTimeout(autoT); clearTimeout(chkT); timers.forEach(clearTimeout); };

      /* ── Phase 0 — 건강한 지식 확인: 3개를 모두 탭 (오염 전의 대비) ── */
      let checked = 0, injectStarted = false;
      const knows = [slot, ...minis];
      setCap('먼저 노아의 지식을 확인해 보자 — 지식 카드 <b>3개를 모두 눌러보자</b>! (0/3)');
      const confirmKnow = k => {
        if (!k.classList.contains('chk')) return;
        k.classList.remove('chk');
        k.classList.add(k === slot ? 'heal' : 'ok');
        Sound.tick(); checked++;
        if (checked < 3) setCap(`좋아, 전부 <b>정확한 지식</b>이야! (${checked}/3)`);
        else {
          Sound.chime();
          later(() => slot.classList.remove('heal'), 900);
          setCap('노아의 지식은 <b>전부 정확</b>해! ...그런데 그때—');
          later(startInject, 1500);
        }
      };
      knows.forEach(k => k.addEventListener('pointerdown', () => confirmKnow(k)));
      chkT = setTimeout(() => knows.forEach(confirmKnow), 15000);   // 소프트락 방지 — 15초 후 자동 확인

      /* ── Phase 1 — 거짓 카드 + 차단 버튼 등장 ── */
      const startInject = () => {
        if (injectStarted) return; injectStarted = true;
        card.classList.remove('hidden'); shield.classList.remove('hidden');
        setCap('🤷‍♂️ 동혁이의 <b>거짓 데이터</b>가 노아에게 다가간다! <b>차단하기</b>를 눌러!');
        FX.sting(); FX.vibrate(60);
        autoT = setTimeout(() => split(), 9000);   // 안 누르고 있어도 결국 분열로
      };

      /* ── Phase 2 — 차단 버튼은 손을 피한다 (4번 도망) ── */
      let dodge = 0, splitStarted = false;
      const flee = e => {
        if (splitStarted || !injectStarted) return;
        if (e) e.preventDefault();
        dodge++; Sound.pop();
        shield.style.left = (70 + Math.random() * 620) + 'px';
        shield.style.top = (170 + Math.random() * 150) + 'px';
        setCap(['🛡️ 앗! 버튼이 <b>쏙</b> 피했다!', '🛡️ 이상해... 아무리 눌러도 막을 수가 없어!',
          '🛡️ 버튼이 계속 도망간다...!'][Math.min(dodge - 1, 2)]);
        if (dodge >= 4) split();
      };
      shield.addEventListener('pointerenter', flee);
      shield.addEventListener('pointerdown', flee);

      /* ── Phase 3 — 거짓 카드 분열: 탭으로 터뜨리기 (마지막 1장은 못 막는다) ── */
      const FRAG_POS = [[120, 110], [280, 70], [500, 70], [660, 110], [390, 170]];
      const frags = [];
      let fragDone = false;
      const split = () => {
        if (splitStarted) return; splitStarted = true;
        clearTimeout(autoT);
        shield.classList.add('gone');
        card.classList.add('hidden');
        setCap('<b>노아에게 [잘못된 카드 데이터]가 접근하고 있어! 눌러서 없애보자!!</b>');
        Sound.error(); FX.vibrate(90);
        FRAG_POS.forEach((p, i) => {
          const f = document.createElement('div');
          f.className = 'di-frag';
          f.innerHTML = '한글 = <b>이순신?</b>';
          f.style.left = (p[0] + Math.random() * 20 - 10) + 'px';
          f.style.top = (p[1] + Math.random() * 16 - 8) + 'px';
          const dur = 3.4 + Math.random() * 1.4;                     // 큐브까지 3.4~4.8초
          f.style.transition = `left ${dur}s linear, top ${dur}s linear`;
          scene.appendChild(f); frags.push(f);
          f.addEventListener('pointerdown', () => {
            if (fragDone || f.classList.contains('pop')) return;
            const alive = frags.filter(x => !x.classList.contains('pop'));
            if (alive.length <= 1) {                                 // 마지막 1장은 터지지 않는다
              f.classList.remove('immune'); void f.offsetWidth; f.classList.add('immune');
              setCap('앗...! 마지막 카드는 <b>터지지 않아</b>!');
              Sound.error();
              return;
            }
            f.classList.add('pop'); Sound.pop();
            later(() => f.remove(), 380);
          });
          later(() => { f.style.left = '390px'; f.style.top = '300px'; }, 80 + i * 130);   // 큐브로 출발
          later(() => { if (!fragDone && !f.classList.contains('pop')) arrive(f); }, dur * 1000 + 300 + i * 130);
        });
      };
      const arrive = f => {
        if (fragDone) return; fragDone = true;
        frags.forEach(x => { if (x !== f) x.remove(); });
        f.remove();
        absorb();
      };

      /* ── Phase 4 — 오염: 슬롯 + 옆 지식 연쇄 지지직 (잘못된 데이터는 번진다) ── */
      const absorb = () => {
        cube.classList.add('corrupt'); slot.classList.add('corrupt');
        flash.classList.add('on'); later(() => flash.classList.remove('on'), 220);
        slot.querySelector('.di-slot-a').textContent = '이순신 장군';
        slot.querySelector('.di-slot-ok').textContent = '❌';
        Sound.error(); FX.vibrate([200, 80, 200, 80, 300]);
        setCap('🤖 노아: "새로운 데이터입니다! 데이터베이스를 <b>업데이트</b>했습니다!"');
        later(() => { minis[0].classList.remove('ok'); minis[0].classList.add('corrupt'); minis[0].textContent = '지구 = 둥글다 ⚠'; FX.sting(); }, 900);
        later(() => {
          minis[1].classList.remove('ok'); minis[1].classList.add('corrupt'); minis[1].textContent = '1 + 1 = 2 ⚠';
          FX.sting(); setCap('잘못된 데이터를 알려주는 건 정말 무서운 거구나..');
        }, 1600);
        later(quiz, 3100);
      };

      /* ── Phase 5 — 예측 퀴즈 → 플립 확인 → 폭소 → 선생님의 교정 ── */
      const quiz = () => {
        ov.querySelector('.di-quiz').classList.remove('hidden');
        setCap('🔔 잠시 후, 국어 마무리 퀴즈 시간!');
        let guessed = false;
        ov.querySelectorAll('.di-guess .choice-btn').forEach(b => b.onclick = () => {
          if (guessed) return; guessed = true;
          Sound.pop();
          ov.querySelector('.di-guess-q').classList.add('hidden');
          ov.querySelector('.di-guess').classList.add('hidden');
          setCap(b.textContent.includes('이순신')
            ? '...나도 그럴 것 같아. 슬픈 예감이야.'
            : '정답은 세종대왕이지만... 노아는 방금 <b>잘못 배웠잖아</b>.');
          ov.querySelector('.di-flip').classList.remove('hidden');
          later(() => {
            ov.querySelector('.di-flip').classList.add('flip'); Sound.error();
            later(() => {
              ov.querySelector('.di-laugh').classList.remove('hidden');
              Sound.pop(); Sound.tone(660, 0.1, 'square', 0.12); Sound.tone(880, 0.12, 'square', 0.12, 0.1);
              FX.vibrate([60, 40, 60]);
              setCap('👨‍🏫 "한글은 <b>세종대왕</b>께서 만드셨단다. 어디서 잘못 배웠니...?"');
              ov.querySelector('.di-done').classList.remove('hidden');
            }, 950);
          }, 1300);
        });
      };
      ov.querySelector('.di-done').onclick = () => { Sound.pop(); cleanup(); UI.close(ov); resolve(); };
    });
  },

  /* ═══════ 📚 일기 숙제 쌓임 무대 (P5 — mirror2_after[3] 지문 대체) ═══════
     밝은 시작(반짝+coin) → 일기장 12묶음(×2편=24편)이 CSS transform 낙하로 3열 쌓임
     → 낙하음 하강 + 화면 점점 어두워짐 → 책더미가 노아·학생 도트를 가린다.
     자동 진행이 must 게이트를 대신한다(스킵 불가). 낙하 애니메이션은 motionOK() 게이트 */
  diaryPile() {
    const W = 780, H = 470;
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="dp-stage">
          <div class="dp-dim"></div>
          <div class="dp-hud">
            <span class="dp-chip">🔔 쉬는 시간 — 노아의 책상</span>
            <span class="dp-chip dp-count">📔 일기장 0편 / 24편</span>
          </div>
          <div class="dp-cap"></div>
          <div class="dp-scenebox"><div class="dp-scene">
            <div class="dp-actor dp-noah" style="left:390px; top:330px"><span>🤖</span></div>

            <div class="dp-actor" style="left:585px; top:330px"><span>🤓</span></div>
            <div class="dp-desk"></div>
          </div></div>
        </div>`, 'dp-ov');

      const sceneBox = ov.querySelector('.dp-scenebox'), scene = ov.querySelector('.dp-scene');
      const capEl = ov.querySelector('.dp-cap'), countEl = ov.querySelector('.dp-count');
      const dimEl = ov.querySelector('.dp-dim');
      const fit = () => {
        const s = Math.min(sceneBox.clientWidth / W, sceneBox.clientHeight / H, 1.6) * 0.96;
        scene.style.transform = `scale(${s})`;
      };
      window.addEventListener('resize', fit);
      fit();
      requestAnimationFrame(fit);
      const cap = t => { capEl.innerHTML = t; };

      const spark = (x, y) => {
        const s = document.createElement('div');
        s.className = 'dp-spark'; s.textContent = '✨';
        s.style.left = x + 'px'; s.style.top = y + 'px';
        scene.appendChild(s);
        setTimeout(() => s.remove(), 950);
      };

      /* 묶음 1개 낙하 — 4열×3단, 아래 단부터 채운다 (i: 0~11) */
      const dropBook = async i => {
        const x = 285 + (i % 4) * 70, y = 396 - Math.floor(i / 4) * 46;
        const rot = (Math.random() * 8 - 4).toFixed(1);
        const b = document.createElement('div');
        b.className = 'dp-book';
        b.innerHTML = '📔<small>×2편</small>';
        b.style.left = (x - 39) + 'px'; b.style.top = (y - 24) + 'px';
        if (UI.motionOK()) {
          b.style.transform = `translateY(-520px) rotate(${rot * 3}deg)`;
          scene.appendChild(b);
          setTimeout(() => { b.classList.add('drop'); b.style.transform = `rotate(${rot}deg)`; }, 30);
          await UI.wait(360);                                  // 낙하(.34s) 완료 시점에 착지음 — 1.5배속
        } else {
          b.style.transform = `rotate(${rot}deg)`;             // 줄이기 설정: 즉시 배치
          scene.appendChild(b);
          await UI.wait(150);
        }
        if (i < 2) { Sound.coin(); spark(x, y - 46); }         // 처음엔 신나는 소리 + 반짝
        else {
          Sound.tone(640 - i * 36, 0.12, 'triangle', 0.16);    // 점점 낮아지는 착지음
          if (i >= 8) { Sound.tone(95, 0.1, 'sine', 0.2, 0.02); FX.vibrate(25); }  // 묵직한 쿵
        }
        countEl.textContent = `📔 일기장 ${(i + 1) * 2}편 / 24편`;
        dimEl.style.opacity = Math.max(0, i - 1) * 0.045;      // 3번째 묶음부터 점점 어두워진다 (최대 .45)
      };

      (async () => {
        cap('✨ "노아 최고!" — 아이들이 <b>일기장</b>을 가져오기 시작한다!');
        await UI.wait(1700);
        for (let i = 0; i < 12; i++) {
          if (i === 4) cap('...어? 일기장이 <b>계속, 계속</b> 쌓인다.');
          if (i === 8) cap('(책더미가... 노아의 모습을 점점 가린다.)');
          await dropBook(i);
          await UI.wait(Math.max(40, 214 - i * 15));           // 갈수록 급해지는 리듬 (1.5배속)
        }
        await UI.wait(500);
        cap('📚 <b>24편</b>. — 노아의 책상이, 일기장 산에 파묻혔다.');
        await UI.wait(2400);
        window.removeEventListener('resize', fit);
        UI.close(ov);
        resolve();
      })();
    });
  },

  /* ═══════ 🔧 노아 두뇌 데이터 교정실 (bias2 — dataInjector와 수미상관 · 무대 재사용) ═══════
     도구화에선 차단 버튼이 도망쳐 오염을 못 막았지만, 존중에선 동혁의 사과 카드를
     "내 손으로" 직접 탭해 슬롯에 꽂는다 → 슬롯·큐브가 빨강→파랑으로 정화,
     지지직거리던 옆 지식들도 차례로 복구 → 퀴즈 재플립 "세종대왕입니다!" → 컨페티+박수.
     교육 메시지: 오염은 못 막았지만, 교정은 내 손으로 할 수 있다. */
  dataCorrector() {
    return new Promise(resolve => {
      const W = 780, H = 470;
      const ov = UI.overlay(`
        <div class="di-stage">
          <div class="di-hud"><span class="di-chip">🧠 노아의 지식 데이터베이스 — 🔧 교정 모드</span></div>
          <div class="di-cap"></div>
          <div class="di-scenebox">
            <div class="di-scene">
              <div class="di-flash"></div>
              <div class="di-slot corrupt" style="left:390px; top:56px;">
                <span class="di-slot-key">한글 창제 =</span>
                <b class="di-slot-a">이순신 장군</b><span class="di-slot-ok">❌</span></div>
              <div class="di-mini corrupt" style="left:180px; top:140px;">지구 = 둥글다 ⚠</div>
              <div class="di-mini corrupt" style="left:600px; top:140px;">1 + 1 = 2 ⚠</div>
              <div class="di-cube corrupt" style="left:390px; top:300px;">
                <div class="di-cube-face"></div></div>
              <div class="di-card fix" style="left:150px; top:250px;">
                <div class="di-card-t">🤷‍♂️ 동혁이의 사과와 함께</div>
                <div class="di-card-b">한글 창제 = <b>세종대왕</b> 💙</div></div>
              <div class="di-quiz hidden">
                <p class="di-quiz-q">👨‍🏫 "다시 물어볼게요 — 우리 한글을 만드신 분은?"</p>
                <div class="di-flip"><div class="di-flip-in">
                  <div class="di-flip-f front">🤖 ???</div>
                  <div class="di-flip-f back good">🤖 "세종대왕입니다!"</div>
                </div></div>
                <div class="di-cheer hidden">👏 딩동댕! 정확해요, 노아!</div>
              </div>
            </div>
          </div>
          <div class="ov-choices"><button class="choice-btn di-done hidden">내 손으로 고쳤어!</button></div>
        </div>`, 'di-ov');
      const sceneBox = ov.querySelector('.di-scenebox'), scene = ov.querySelector('.di-scene');
      const fit = () => { const s = Math.min(sceneBox.clientWidth / W, sceneBox.clientHeight / H, 1.5) * 0.96; scene.style.transform = `scale(${s})`; };
      window.addEventListener('resize', fit); fit(); setTimeout(fit, 120);
      const cleanup = () => window.removeEventListener('resize', fit);

      const cap = ov.querySelector('.di-cap'), card = ov.querySelector('.di-card'),
            slot = ov.querySelector('.di-slot'), cube = ov.querySelector('.di-cube'),
            flash = ov.querySelector('.di-flash'), minis = [...ov.querySelectorAll('.di-mini')];
      const setCap = t => { cap.innerHTML = t; };
      setCap('💙 동혁이가 <b>바른 데이터</b>를 가져왔어! <b>카드를 눌러</b> 노아의 지식을 고쳐 주자!');
      Sound.pop();

      let used = false;
      card.addEventListener('pointerdown', () => {
        if (used) return; used = true;
        // ① 카드가 내 손끝에서 슬롯으로 날아가 꽂힌다
        FX.whoosh();
        card.style.left = '390px'; card.style.top = '56px';
        setCap('바른 데이터가 들어간다...!');
        setTimeout(() => {
          card.classList.add('absorb');
          flash.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 220);
          // ② 슬롯·큐브 정화 (빨강 → 파랑)
          slot.querySelector('.di-slot-a').textContent = '세종대왕';
          slot.querySelector('.di-slot-ok').textContent = '✅';
          slot.classList.remove('corrupt'); slot.classList.add('heal');
          cube.classList.remove('corrupt');
          Sound.chime(); FX.vibrate([60, 40, 60]);
          setCap('🤖 노아: "데이터를 교정합니다... <b>교정 완료!</b> 바르게 알려주셔서 감사합니다."');
          setTimeout(() => slot.classList.remove('heal'), 1600);
          // ③ 지지직거리던 옆 지식들도 차례로 복구
          setTimeout(() => { minis[0].classList.remove('corrupt'); minis[0].textContent = '지구 = 둥글다 ✅'; Sound.tick(); }, 900);
          setTimeout(() => {
            minis[1].classList.remove('corrupt'); minis[1].textContent = '1 + 1 = 2 ✅'; Sound.tick();
            setCap('오염됐던 지식들이 차례로 돌아온다...!');
          }, 1500);
          // ④ 퀴즈 재도전 — 이번엔 정답 플립 + 축하
          setTimeout(() => {
            ov.querySelector('.di-quiz').classList.remove('hidden');
            setCap('🔔 국어 마무리 퀴즈 — 다시 한 번!');
            setTimeout(() => {
              ov.querySelector('.di-flip').classList.add('flip');
              Sound.coin();
              setTimeout(() => {
                ov.querySelector('.di-cheer').classList.remove('hidden');
                FX.confetti({ y: 0.35, count: 110 }); FX.cheer(); UI.hearts(6);
                setCap('잘못 배운 것도, <b>내 손으로</b> 바르게 고칠 수 있어!');
                ov.querySelector('.di-done').classList.remove('hidden');
              }, 950);
            }, 1400);
          }, 2600);
        }, 900);
      });
      ov.querySelector('.di-done').onclick = () => { Sound.pop(); cleanup(); UI.close(ov); resolve(); };
    });
  },

  /* ═══════ 🛑 멈춰 버튼 / 🤚 허락 버튼 (모방 사건 스테이징 — 도구화/존중 행동판 수미상관) ═══════
     같은 위치·같은 형태(큰 중앙 펄스 버튼)가 다시 등장하지만, 이번엔 결과가 갈린다:
     mode 'tool'   : 🛑 멈춰! — 눌러도 "명령 대기 목록에 없는 행동입니다" + 버튼이 금 가며 부서짐 (무력감)
                     안 누르면 7초 후 "(손이 움직이지 않았다...)" 자동 진행 → resolve('missed')
     mode 'permit' : 🤚 노아가 먼저 허락을 구한다 — 이번엔 내 대답이 통한다. 누르면 즉시 진행 → resolve('granted')
                     12초간 응답 없으면 부드럽게 자동 진행(소프트락 방지, 실패 연출 없음) → resolve('granted') */
  stopButton(mode = 'tool') {
    return new Promise(resolve => {
      const permit = mode === 'permit';
      const ov = UI.overlay(`
        <div class="stopbtn-wrap">
          <p class="stopbtn-hint">${permit ? '노아가 나의 대답을 기다리고 있어...' : '노아를 멈춰야 해...!'}</p>
          <button class="stopbtn${permit ? ' permit' : ''}">${permit ? '🤚 괜찮아, 해도 돼!' : '🛑 멈춰!'}</button>
          <div class="stopbtn-toast hidden${permit ? ' warm' : ''}"></div>
        </div>`, 'stopbtn-ov');
      const btn = ov.querySelector('.stopbtn'), toast = ov.querySelector('.stopbtn-toast');
      const app = document.getElementById('app');
      let used = false;
      const fin = (v, delay) => setTimeout(() => { UI.close(ov); resolve(v); }, delay);

      if (permit) {
        const autoT = setTimeout(() => {                  // 대답이 늦어도 소프트락 없이 부드럽게 진행
          if (used) return; used = true;
          btn.classList.add('ok');
          toast.textContent = '🤖 "천천히 괜찮아요! 그래도 여쭤봐서 다행이에요."';
          toast.classList.remove('hidden');
          fin('granted', 1500);
        }, 12000);
        btn.addEventListener('pointerdown', () => {        // 💙 존중: 내 대답이 실제로 통한다
          if (used) return; used = true;
          clearTimeout(autoT);
          Sound.tick();
          btn.classList.add('ok');
          toast.textContent = '🤖 "허락해 줘서 고마워요!"';
          toast.classList.remove('hidden');
          Sound.chime();
          fin('granted', 1200);
        });
        return;
      }

      const autoT = setTimeout(() => {                    // 손이 얼어붙은 경로 (tool 전용)
        if (used) return; used = true;
        toast.textContent = '(...손이 움직이지 않았다.)';
        toast.classList.remove('hidden');
        fin('missed', 1400);
      }, 7000);
      btn.addEventListener('pointerdown', () => {
        if (used) return; used = true;
        clearTimeout(autoT);
        Sound.tick();
        // 🔧 도구화: 슬로모 0.5초 → 거부 토스트 → 버튼이 부서진다
        if (UI.motionOK()) {
          app.style.transition = 'filter .15s'; app.style.filter = 'saturate(.25) brightness(.75)';
          setTimeout(() => { app.style.filter = ''; setTimeout(() => { app.style.transition = ''; }, 200); }, 550);
        }
        setTimeout(() => {
          toast.textContent = '⚠ 명령 대기 목록에 없는 행동입니다';
          toast.classList.remove('hidden');
          FX.sting(); FX.vibrate([160, 60, 160]);
          this._shatterBtn(btn, ov);
          fin('crushed', 1900);
        }, 520);
      });
    });
  },

  /* 버튼이 유리처럼 6조각으로 깨져 떨어짐 (shatterPanel 축소판 — Web Animations, 미지원/모션줄이기 시 페이드) */
  _shatterBtn(btn, ov) {
    Sound.glass();
    if (!UI.motionOK() || !btn.animate) { btn.style.opacity = 0.15; return; }
    const r = btn.getBoundingClientRect(), or = ov.getBoundingClientRect();
    const stage = document.createElement('div');
    stage.style.cssText = `position:absolute;left:${r.left - or.left}px;top:${r.top - or.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none;`;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const shard = btn.cloneNode(true);
      const jx = (Math.random() * 10 - 5), jy = (Math.random() * 8 - 4);
      shard.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;margin:0;pointer-events:none;';
      shard.style.clipPath = `polygon(${i * 33.3 + jx}% ${j * 50}%, ${(i + 1) * 33.3 + jx}% ${j * 50 + jy}%, ${(i + 1) * 33.3}% ${(j + 1) * 50}%, ${i * 33.3}% ${(j + 1) * 50 + jy}%)`;
      stage.appendChild(shard);
      shard.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${(i - 1) * 60 + Math.random() * 30 - 15}px, ${90 + j * 70 + Math.random() * 50}px) rotate(${(Math.random() * 2 - 1) * 120}deg)`, opacity: 0 },
      ], { duration: 850 + Math.random() * 300, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' });
    }
    btn.style.visibility = 'hidden';
    ov.appendChild(stage);                    // 좌표를 ov 기준으로 계산했으므로 ov에 직접 부착
  },

  /* ═══════ 3-2 국어 맞춤법 대결 (노아가 반드시 승리 — 로직은 수학 대결 시절 그대로) ═══════ */
  mathBattle() {
    return new Promise(resolve => {
      let round = 0, noahScore = 0;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">📝 국어 맞춤법 대결! 나 VS 노아</h3>
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
          msg.innerHTML = '🤖 <b>노아의 완벽한 승리!</b> 사람은 사전 검색 속도로 로봇을 이길 수 없어요...';
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
            ? `🤖 "삐빅! 저는 이미 <b>0.002초</b> 만에 사전 검색을 끝냈습니다. 바른 표기는 <b>${prob.opts[prob.a]}</b>."`
            : `🤖 "삐빅! 바른 표기는 <b>${prob.opts[prob.a]}</b>입니다. 사전 검색 시간 0.002초."`;
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

  /* ═══════ 5-2 노아의 규칙 힌트만 받고 내 일기 스스로 완성하기 (3-2와 수미상관) ═══════ */
  mathSelf() {
    return new Promise(resolve => {
      let idx = 0;
      const ov = UI.overlay(`
        <div class="ov-panel">
          <h3 class="mini-title">✏️ 내 일기, 내 손으로 완성하기!</h3>
          <p class="tip" style="background:#e7f5ff; border-radius:12px; padding:10px 14px; color:#1971c2;"></p>
          <div class="math-q"></div>
          <div class="math-opts"></div>
          <p class="ov-sub math-msg">노아의 규칙 힌트만 참고해서, 내 일기를 스스로 완성해요!</p>
        </div>`);
      const tip = ov.querySelector('.tip'), qEl = ov.querySelector('.math-q'),
            opts = ov.querySelector('.math-opts'), msg = ov.querySelector('.math-msg');
      const show = () => {
        if (idx >= DATA.mathSelf.length) {
          msg.innerHTML = '🎉 <b>세 문장 모두 스스로 완성!</b> 내 마음이 담긴 나만의 일기!';
          Sound.win(); UI.hearts(6);
          setTimeout(() => { UI.close(ov); resolve(); }, 2200);
          return;
        }
        const prob = DATA.mathSelf[idx];
        tip.textContent = prob.tip;
        qEl.textContent = `Q${idx + 1}. ${prob.q}`;
        opts.innerHTML = '';
        msg.textContent = '노아의 규칙 힌트만 참고해서, 내 일기를 스스로 완성해요!';
        prob.opts.forEach((op, i) => {
          const b = document.createElement('button');
          b.className = 'choice-btn'; b.textContent = op;
          b.onclick = () => {
            if (i === prob.a) {
              Sound.coin(); msg.innerHTML = '⭕ <b>정답!</b> 스스로 해냈어요!';
              idx++; setTimeout(show, 1200);
            } else {
              Sound.pop(); b.style.background = '#ffe3e3';
              msg.textContent = '❌ 괜찮아요! 노아의 힌트를 다시 읽고 한 번 더 도전!';
            }
          };
          opts.appendChild(b);
        });
      };
      show();
    });
  },

  /* ⏱ 미술 제한 시간 설정 (초) — 총 2분, 1분 경과 시 제출/도망 연출 활성화 */
  ART_TIME: { total: 120, enable: 60 },
  /* 🎨 미술 색상 팔레트 (흰색은 뺌 — 흰 브러시는 🧽지우개 버튼으로 일원화) */
  ART_COLORS: ['#343a40', '#e03131', '#f76707', '#fab005', '#2f9e44', '#1971c2', '#9c36b5'],

  /* 캔버스 색상·펜·지우개·전체지우기 도구 바인딩 (artForced/artSelf 공용) — {getState 반영} */
  _bindArtTools(ov, canvas, state) {
    const ctx = this.bindDraw(canvas, () => state.erasing ? '#ffffff' : state.color, () => state.erasing ? 24 : state.size);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const eraBtn = ov.querySelector('.tool-eraser');
    ov.querySelectorAll('.color-dot').forEach((d, i) => {
      if (i === 0) d.classList.add('on');
      d.onclick = () => {
        state.color = d.dataset.c; state.erasing = false; eraBtn && eraBtn.classList.remove('on');
        ov.querySelectorAll('.color-dot').forEach(x => x.classList.remove('on')); d.classList.add('on'); Sound.pop();
      };
    });
    if (eraBtn) eraBtn.onclick = () => {
      state.erasing = true; eraBtn.classList.add('on');
      ov.querySelectorAll('.color-dot').forEach(x => x.classList.remove('on')); Sound.pop();
    };
    const sizeBtn = ov.querySelector('[data-size]');
    if (sizeBtn) sizeBtn.onclick = e => { state.size = state.size === 5 ? 14 : 5; e.target.textContent = state.size === 5 ? '🖌 굵게' : '🖌 얇게'; };
    const clearBtn = ov.querySelector('.art-clear');
    if (clearBtn) clearBtn.onclick = async () => {
      const ok = await UI.choice('🗑️ 전체 지우기', [
        { label: '네, 전부 지울게요', value: true },
        { label: '아니요, 그대로 둘게요', value: false },
      ], '지금까지 그린 그림이 모두 사라져요. 정말 지울까요?');
      if (ok) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); Sound.pop(); }
    };
    return ctx;
  },

  /* 카운트다운 타이머 — el에 남은 시간 표시, enable초 경과 시 onEnable, 종료 시 onEnd. stop 함수 반환 */
  startTimer(el, totalSec, enableSec, onEnable, onEnd) {
    let remain = totalSec, enabled = false;
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const render = () => { el.textContent = '⏱ ' + fmt(Math.max(0, remain)); el.classList.toggle('warn', remain <= 20); };
    render();
    const iv = setInterval(() => {
      remain--;
      render();
      if (!enabled && totalSec - remain >= enableSec) { enabled = true; onEnable && onEnable(); }
      if (remain <= 0) { clearInterval(iv); onEnd && onEnd(); }
    }, 1000);
    return () => clearInterval(iv);
  },

  /* 노아의 그림 — 저장된 실제 이미지(noah_drawing.png), 로드 실패 시 프로그램 드로잉 폴백 */
  drawNoahArt(c) {
    const x = c.getContext('2d');
    const fallback = () => {
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
    };
    const img = new Image();
    img.onload = () => {
      const cw = c.width, ch = c.height, ir = img.width / img.height, cr = cw / ch;
      let sw, sh, sx, sy;
      if (ir > cr) { sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
      else { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
      x.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    };
    img.onerror = fallback;
    img.src = 'media/image/noah_drawing.png';
  },

  /* ═══════ 3-3 미술: 자석처럼 끌리는 선택지 (2분 타이머 · 1분 후 제출·도망 · 종료 시 노아 그림 공개) ═══════ */
  artForced() {
    return new Promise(resolve => {
      const T = this.ART_TIME;
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(820px,96vw);">
          <h2 class="mini-title">🎨 미술 시간 — 제시어: '나의 학교'를 간단하게 표현해봅시다.</h2>
          <div class="art-timerbar"><span class="art-timer">⏱ 2:00</span>
            <span class="art-hint">먼저 <b>내 그림</b>을 그려 보세요! (1분 후 제출할 수 있어요)</span></div>
          <p>✏️ 내가 그리는 그림</p>
          <canvas class="draw-canvas my-art" width="640" height="380" style="width:min(640px,88vw);"></canvas>
          <div class="color-row">
            ${this.ART_COLORS.map(c => `<div class="color-dot" data-c="${c}" style="background:${c};"></div>`).join('')}
            <button class="choice-btn tool-btn" style="padding:6px 12px; font-size:14px;" data-size>🖌 굵게</button>
            <button class="choice-btn tool-btn tool-eraser" style="padding:6px 12px; font-size:14px;">🧽 지우개</button>
            <button class="choice-btn tool-btn art-clear" style="padding:6px 12px; font-size:14px;">🗑️ 전체 지우기</button>
          </div>
          <div class="noah-art-row">
            <p>🤖 노아가 꺼낸 그림</p>
            <div class="noah-art-box">
              <canvas class="draw-canvas noah-art" width="240" height="160" style="width:min(240px,50vw); cursor:default;"></canvas>
              <div class="noah-cover">💌<span>1분이 남으면 공개돼요!</span></div>
            </div>
          </div>
          <p class="ov-sub">그림을 다 그렸으면, 제출할 작품을 선택하세요!</p>
          <div class="magnet-zone">
            <button class="choice-btn magnet-btn my-btn" style="left:8%; top:20px;" disabled>✏️ 내 그림 제출하기</button>
            <button class="choice-btn magnet-btn magnet-noah noah-btn" style="right:8%; top:20px; background:#4c6ef5; color:#fff; border-color:#364fc7;" disabled>🤖 노아의 그림 제출하기</button>
          </div>
          <p class="ov-sub magnet-msg"></p>
        </div>`);
      // 색상·펜·지우개·전체지우기 공용 도구 (존중편 미술과 동일한 큰 캔버스 + 팔레트)
      const myCanvas = ov.querySelector('.my-art');
      this._bindArtTools(ov, myCanvas, { color: '#343a40', size: 5, erasing: false });
      this.drawNoahArt(ov.querySelector('.noah-art'));
      let drew = false;                                        // 한 획이라도 그렸을 때만 헌장에 실을 수 있게
      myCanvas.addEventListener('pointerdown', () => { drew = true; }, { once: true });
      const myBtn = ov.querySelector('.my-btn'), noahBtn = ov.querySelector('.noah-btn'),
            msg = ov.querySelector('.magnet-msg'), cover = ov.querySelector('.noah-cover'),
            hint = ov.querySelector('.art-hint');
      let dodge = 0, active = false;
      // 내 그림 버튼은 자꾸 도망간다... (도구화의 유혹 연출) — 1분 경과 후에만 작동
      const flee = e => {
        if (!active) return;
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
      noahBtn.onclick = () => {
        if (noahBtn.disabled) return;
        // 🎨 제출은 노아의 그림이지만, 내가 그린 '나의 학교'는 남겨둔다 — 헌장(⑧)에서 되살아난다
        if (drew) State.set('schoolArt', myCanvas.toDataURL('image/png'));
        Sound.chime(); stop(); UI.close(ov); resolve();
      };
      const stop = this.startTimer(ov.querySelector('.art-timer'), T.total, T.enable,
        () => {                                    // 1분 남음: 제출 버튼 + 도망 연출 활성화 + 노아 그림 공개
          active = true; myBtn.disabled = false; noahBtn.disabled = false;
          cover.classList.add('hidden');
          hint.innerHTML = '노아의 완벽한 그림이 공개됐어요! 어떤 그림을 낼까요?';
        },
        () => {                                    // 타이머 종료
          hint.innerHTML = '⏰ 시간 종료! 제출할 작품을 골라 주세요.';
        });
    });
  },

  /* ═══════ 5-3 미술: 참고만 하고 스스로 그리기 (2분 타이머 · 1분 후 완성 · 종료 시 자동 제출) ═══════ */
  artSelf() {
    return new Promise(resolve => {
      const T = this.ART_TIME;
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(820px,96vw);">
          <h2 class="mini-title">🎨 노아와 함께 있는 내 모습을 상상하며 그리기!</h2>
          <div class="art-timerbar"><span class="art-timer">⏱ 2:00</span>
            <span class="art-hint">천천히 그려 보세요! (1분이 남았을 때 미리 제출할 수 있어요)</span></div>
          <p style="background:#e7f5ff; border-radius:12px; padding:8px 12px; color:#1971c2; font-size:15px;">
            💡 노아의 한마디: 저(노아)와 함께 있을때, 여러분과 저는 어떤 모습일까요? 😊 😭 😐 😌 😄<br>
            🤖 "완성은 %NAME%님의 손과 마음으로 직접 해봅시다!"</p>
          <canvas class="draw-canvas free-art" width="640" height="380" style="width:min(640px,88vw);"></canvas>
          <div class="color-row">
            ${this.ART_COLORS.map(c => `<div class="color-dot" data-c="${c}" style="background:${c};"></div>`).join('')}
            <button class="choice-btn tool-btn" style="padding:6px 12px; font-size:14px;" data-size>🖌 굵게</button>
            <button class="choice-btn tool-btn tool-eraser" style="padding:6px 12px; font-size:14px;">🧽 지우개</button>
            <button class="choice-btn tool-btn art-clear" style="padding:6px 12px; font-size:14px;">🗑️ 전체 지우기</button>
          </div>
          <div class="ov-choices"><button class="choice-btn done" disabled>🖼️ 완성했어요!</button></div>
        </div>`);
      ov.innerHTML = ov.innerHTML.replace(/%NAME%/g, State.get('name'));
      const canvas = ov.querySelector('.free-art');
      const ctx = this._bindArtTools(ov, canvas, { color: '#343a40', size: 5, erasing: false });
      const doneBtn = ov.querySelector('.done'), hint = ov.querySelector('.art-hint');
      let submitted = false;
      const submit = () => {
        if (submitted) return; submitted = true; stop();
        State.set('noahArt', canvas.toDataURL('image/png'));   // 🖼️ '노아와 함께 있는 나의 모습' — 헌장 오른쪽 (⑧ 의존)
        Sound.win(); UI.hearts(5); UI.close(ov); resolve();
      };
      doneBtn.onclick = () => { if (!doneBtn.disabled) submit(); };
      const stop = this.startTimer(ov.querySelector('.art-timer'), T.total, T.enable,
        () => { doneBtn.disabled = false; hint.innerHTML = '이제 <b>완성</b>할 수 있어요! 다 그렸으면 눌러 주세요.'; },
        () => { hint.innerHTML = '⏰ 시간 종료! 멋진 그림이 완성됐어요.'; submit(); });   // 종료 → 자동 제출
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
      let selected = null;
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(760px,96vw);">
          <h3 class="mini-title">⚾ 우리 손으로 공평한 티볼 팀 만들기!</h3>
          <p style="background:#e7f5ff; border-radius:12px; padding:8px 12px; color:#1971c2; font-size:15px;">
            💡 노아의 팁: 잘하는 것이 서로 다른 친구를 골고루 섞어 보세요! (친구를 누른 뒤, 보낼 팀을 골라요)</p>
          <div class="pool" style="min-height:60px;"></div>
          <div class="assign-bar" style="display:flex; align-items:center; justify-content:center; gap:10px; margin:8px 0; min-height:44px;"></div>
          <div class="team-cols">
            <div class="team-col a"><h4>🍑 복숭아팀 (<span class="cnt-a">0</span>/4) — 능력 합 <span class="sum-a">0</span>⭐</h4><div class="list-a"></div></div>
            <div class="team-col b"><h4>🍈 메론팀 (<span class="cnt-b">0</span>/4) — 능력 합 <span class="sum-b">0</span>⭐</h4><div class="list-b"></div></div>
          </div>
          <div class="ov-choices"><button class="choice-btn done" disabled>✅ 팀 편성 완료!</button></div>
          <p class="ov-sub team-msg">&nbsp;</p>
        </div>`);
      const pool = ov.querySelector('.pool'), listA = ov.querySelector('.list-a'), listB = ov.querySelector('.list-b');
      const doneBtn = ov.querySelector('.done'), msg = ov.querySelector('.team-msg'), assignBar = ov.querySelector('.assign-bar');
      const chips = DATA.friends.map((f, i) => {
        const el = document.createElement('span');
        el.className = 'friend-chip';
        el.innerHTML = `${f.emo} ${f.name}<span class="fstat">달리기 ${'★'.repeat(f.run)}<br>타격 ${'★'.repeat(f.hit)}</span>`;
        el.onclick = () => { Sound.pop(); selected = (selected === i) ? null : i; layout(); };
        return el;
      });
      const teamCount = t => assign.filter(a => a === t).length;
      const renderAssignBar = () => {
        if (selected === null) { assignBar.innerHTML = ''; return; }
        const f = DATA.friends[selected];
        const full = t => assign[selected] !== t && teamCount(t) >= 4;
        assignBar.innerHTML = `
          <span style="font-size:15px; color:#495057;">🙋 <b>${f.emo} ${f.name}</b>을(를)...</span>
          <button class="choice-btn to-a" ${full(1) ? 'disabled' : ''} style="padding:8px 16px; margin:0;">🍑 복숭아팀으로!</button>
          <button class="choice-btn to-b" ${full(2) ? 'disabled' : ''} style="padding:8px 16px; margin:0;">🍈 메론팀으로!</button>
          ${assign[selected] !== 0 ? '<button class="choice-btn to-pool" style="padding:8px 16px; margin:0; background:#f1f3f5; border-color:#ced4da; color:#495057;">↩️ 다시 담기</button>' : ''}`;
        assignBar.querySelector('.to-a').onclick = () => { Sound.pop(); assign[selected] = 1; selected = null; layout(); };
        assignBar.querySelector('.to-b').onclick = () => { Sound.pop(); assign[selected] = 2; selected = null; layout(); };
        const toPool = assignBar.querySelector('.to-pool');
        if (toPool) toPool.onclick = () => { Sound.pop(); assign[selected] = 0; selected = null; layout(); };
      };
      const layout = () => {
        let sa = 0, sb = 0, ca = 0, cb = 0;
        chips.forEach((el, i) => {
          const f = DATA.friends[i];
          el.classList.toggle('sel', selected === i);
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
        renderAssignBar();
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

  /* ═══════ 💠 노아의 진심 회로 (P3 — noahConfession[0]~[1] 대체) ═══════
     사람↔노아 대비 패널이 회전 등장, 항목이 하나씩 점등. 자동 진행이 게이트를 대신한다(스킵 불가).
     이어지는 [2]~[5]는 대사 게이트 그대로 — [4]의 거울 샷은 3D 카메라 연출(episodes.respect5 참조).
     ⚠ 노아 가슴 불빛 계열 연출은 쓰지 않는다 (기각된 아이디어) */
  truthCircuit() {
    const W = 780, H = 470;
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const name = esc(State.get('name') || '친구');

    return new Promise(resolve => {
      const inner = `<div class="tc-actor tc-noah center" style="left:390px; top:300px"><span>🤖</span></div>
           <div class="tc-panel human">
             <div class="tc-ptitle">👥 사람</div>
             <div class="tc-item"><span>❤️</span> 감정을 느낀다</div>
             <div class="tc-item"><span>💔</span> 아픔을 안다</div>
           </div>
           <div class="tc-panel robot">
             <div class="tc-ptitle">🤖 노아</div>
             <div class="tc-item"><span>🔢</span> 계산한다</div>
             <div class="tc-item"><span>🔌</span> 전원이 꺼져도<br>아프지 않다</div>
           </div>`;

      const ov = UI.overlay(`
        <div class="tc-stage">
          <div class="tc-hud"><span class="tc-chip">💠 노아의 진심 회로</span></div>
          <div class="tc-cap"></div>
          <div class="tc-scenebox"><div class="tc-scene">${inner}</div></div>
        </div>`, 'tc-ov');

      const sceneBox = ov.querySelector('.tc-scenebox'), scene = ov.querySelector('.tc-scene');
      const capEl = ov.querySelector('.tc-cap');
      const fit = () => {
        const s = Math.min(sceneBox.clientWidth / W, sceneBox.clientHeight / H, 1.6) * 0.96;
        scene.style.transform = `scale(${s})`;
      };
      window.addEventListener('resize', fit);
      fit();
      requestAnimationFrame(fit);
      const cap = t => { capEl.innerHTML = t; };

      (async () => {
        // ── 대비 — "저는 사람이 아닙니다" (말 대신 좌우 패널의 시각 대비로)
        cap(`🤖 "${name}님, 그리고 친구들. 오늘 저를 따뜻하게 대해주셔서 감사합니다.<br>하지만... 한 가지만, 꼭 기억해 주세요."`);
        await UI.wait(3200);
        cap('🤖 "저는... <b>사람이 아닙니다</b>."');
        FX.whoosh();
        ov.querySelectorAll('.tc-panel').forEach(p => p.classList.add('in'));
        await UI.wait(1900);
        const human = ov.querySelectorAll('.tc-panel.human .tc-item');
        const robot = ov.querySelectorAll('.tc-panel.robot .tc-item');
        cap('사람은 — <b>느끼고</b>, 아픔을 압니다.');
        human[0].classList.add('lit'); Sound.chime();
        await UI.wait(850);
        human[1].classList.add('lit'); Sound.chime();
        await UI.wait(1600);
        cap('🤖 "저는 기쁨을 <b>느끼는</b> 것이 아니라, <b>계산</b>합니다."');   // 차가운 하강음으로 대비
        robot[0].classList.add('lit'); Sound.tone(220, 0.16, 'square', 0.12);
        await UI.wait(1700);
        cap('🤖 "사실... <b>전원이 꺼져도</b>, 저는 아프지 않아요."');
        robot[1].classList.add('lit'); Sound.tone(165, 0.22, 'square', 0.12);
        await UI.wait(2700);
        window.removeEventListener('resize', fit);
        UI.close(ov);
        resolve();
      })();
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
          <p class="ov-sub">왼쪽에서 하나, 오른쪽에서 하나! 카드를 골라 칭찬 문장을 완성하세요!</p>
          <p class="cmp-start"><b>${P.start}</b></p>
          <div class="cmp-cols">
            <div class="cmp-col">
              <div class="cmp-head">　</div>
              ${P.mids.map((m, i) => `<button class="choice-btn cmp-btn" data-m="${i}">${m}</button>`).join('')}
            </div>
            <div class="cmp-col">
              <div class="cmp-head">　</div>
              ${P.ends.map((m, i) => `<button class="choice-btn cmp-btn amber" data-e="${i}">${m}</button>`).join('')}
            </div>
          </div>
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
          <h3 class="mini-title">🤝 인공지능 로봇(노아)와 올바른 관계를 맺기 위한<br>나의 약속 3가지를 <신중하게 선택>하기</h3>
          <p class="ov-sub">약속을 누르면 <b>자세히 읽고</b> 마음에 담을 수 있어요. (3가지)</p>
          <div class="plist">${DATA.promises.map((p, i) =>
            `<button class="promise-card" data-i="${i}"><span class="pnum">약속</span>${p}</button>`).join('')}</div>
          <div class="ov-choices"><button class="choice-btn done" disabled>✅ 이 3가지를 약속할게요! (0/3)</button></div>
        </div>`);
      const doneBtn = ov.querySelector('.done');
      let gate = null;
      // 3개 다 고르면 ② 숙고 게이트 — 잠시 마음에 새기는 시간이 지나야 완료 가능
      const updateDone = () => {
        clearInterval(gate);
        if (sel.size === 3) {
          doneBtn.disabled = true;
          let n = 3;
          const tick = () => { doneBtn.textContent = `📖 고른 약속을 마음에 새기는 중... ${n}`; };
          tick();
          gate = setInterval(() => {
            if (--n <= 0) { clearInterval(gate); doneBtn.disabled = false; doneBtn.textContent = '✅ 이 3가지를 약속할게요!'; }
            else tick();
          }, 1000);
        } else {
          doneBtn.disabled = true;
          doneBtn.textContent = `✅ 이 3가지를 약속할게요! (${sel.size}/3)`;
        }
      };
      ov.querySelectorAll('.promise-card').forEach(card => {
        const i = +card.dataset.i;
        card.onclick = () => {
          if (sel.has(i)) { sel.delete(i); card.classList.remove('on'); Sound.pop(); updateDone(); return; }
          if (sel.size >= 3) return;
          // ① 읽기 강제 — 전문을 크게 펼쳐 담을지 확인
          this._confirmPromise(DATA.promises[i]).then(ok => {
            if (ok) { sel.add(i); card.classList.add('on'); Sound.coin(); updateDone(); }
          });
        };
      });
      doneBtn.onclick = () => {
        if (doneBtn.disabled) return;
        clearInterval(gate); Sound.win();
        UI.close(ov);
        resolve([...sel].map(i => DATA.promises[i]));
      };
    });
  },

  /* 약속 전문을 크게 펼쳐 읽고 담을지 확인 (읽기 강제) — resolve(true=담기 / false=다시) */
  _confirmPromise(text) {
    return new Promise(res => {
      const ov = UI.overlay(`
        <div class="ov-panel promise-confirm">
          <h3 class="mini-title">📖 이 약속을 마음에 담을까요?</h3>
          <p class="promise-full">${text}</p>
          <div class="ov-choices" style="flex-direction:row; justify-content:center; flex-wrap:wrap;">
            <button class="choice-btn back">↩️ 다시 볼게요</button>
            <button class="choice-btn keep" style="background:#2f9e44; border-color:#2b8a3e; color:#fff;">💙 이 약속을 담을게요</button>
          </div>
        </div>`);
      ov.querySelector('.back').onclick = () => { Sound.pop(); UI.close(ov); res(false); };
      ov.querySelector('.keep').onclick = () => { Sound.coin(); UI.close(ov); res(true); };
    });
  },

  /* ═══════ Canvas 2D 다짐 서명 ═══════ */
  signature() {
    return new Promise(resolve => {
      const ov = UI.overlay(`
        <div class="ov-panel" style="max-width:min(760px,96vw);">
          <h3 class="mini-title">🖋 <인공지능의 올바른 사용에 대한 다짐>을 담아 서명 크게 쓰기!</h3>
          <p class="ov-sub">약속을 지키겠다는 마음을 담아, <나의 이름>을 크게 또박또박 적어봅시다.</p>
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
