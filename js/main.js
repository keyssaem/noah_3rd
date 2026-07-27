/* ═══════════ Main — 부팅 / 메뉴 / 캐릭터 선택 / 게임 루프 ═══════════ */
(function () {
  const canvas = document.getElementById('game-canvas');
  UI.init();
  Settings.init();                 // ⚙️ 저장된 설정 적용 (효과음/BGM/글자크기)
  try {
    World.init(canvas);
  } catch (error) {
    console.error('WebGL initialization failed:', error, error.cause || '');
    Rendering.dispose(World.renderer);
    World.renderer = null;
    UI.showWebGLError('WebGL을 초기화하지 못했습니다. Chrome의 그래픽 가속을 켠 뒤 브라우저를 다시 시작해 주세요.');
    return;
  }
  Player.init();
  Player.initItemClick(canvas);

  /* ───── 🎬 인트로 영상(15초, 건너뛰기는 10초부터 표시) → 1-2 메인 메뉴(BGM 시작) ───── */
  (async () => {
    await UI.playVideo('media/movie/intro.mp4', { skip: true, skipDelay: 10000 });
    UI.show(UI.els.menu);
    Sound.playBGM('media/sound/bgm.mp3');
  })();

  document.getElementById('btn-start').addEventListener('click', async () => {
    Sound.pop();
    UI.hide(UI.els.menu);
    // P3-C: 주인공 GLB 프리로드 — 선택 화면 미리보기 + 인게임 공용 (실패 시 박스 폴백)
    await Assets.preloadWithBar(['playerM', 'playerF'], '주인공 캐릭터를 불러오는 중...');
    UI.show(UI.els.charScreen);
    startPreviews();
  });

  /* ───── 1-3 캐릭터 선택 (포켓몬 스타일 · 남/녀 3D 미리보기) ───── */
  let gender = '';
  let previewsStarted = false;
  const previews = [];
  function startPreviews() {
    if (previewsStarted) return;
    previewsStarted = true;
    previews.push(Chars.makePreview(document.getElementById('preview-m'), () => Chars.player('m')));
    previews.push(Chars.makePreview(document.getElementById('preview-f'), () => Chars.player('f')));
  }
  const nameInput = document.getElementById('input-name');
  const okBtn = document.getElementById('btn-char-ok');
  function validate() { okBtn.disabled = !(gender && nameInput.value.trim().length > 0); }
  document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      Sound.pop();
      document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      gender = card.dataset.gender;
      validate();
    });
  });
  nameInput.addEventListener('input', validate);
  okBtn.addEventListener('click', async () => {
    Sound.win();
    Sound.fadeOutBGM(700);              // 🎵 실제 게임 시작과 함께 BGM 페이드아웃
    State.set('name', nameInput.value.trim());
    State.set('gender', gender);
    // 🧹 고르지 않은 주인공 모델 해제 — 미리보기용으로 남·여를 모두 받았지만 이후로는 쓰이지 않는다.
    //    화면 전환이 끝난 뒤 조용히 정리하도록 3초 늦춘다.
    const unusedPlayer = gender === 'f' ? 'playerM' : 'playerF';
    setTimeout(() => Assets.dispose(unusedPlayer), 3000);
    UI.els.fade.classList.add('on');
    await UI.wait(550);
    UI.hide(UI.els.charScreen);
    // 🖼️ 미리보기 렌더러 정리 — 화면이 완전히 가려진 뒤에 한다.
    //    (선택 즉시 정리하면 WebGL 컨텍스트가 끊기면서 아직 보이는 미리보기 카드가 비어 보인다)
    previews.forEach(p => p.dispose());
    previews.length = 0;
    UI.show(UI.els.hud);
    Flow.begin();
  });

  /* ───── 게임 루프 ───── */
  let last = performance.now();
  function loop(now) {
    if (World.contextLost) {
      last = now;
      requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    World.update(dt);
    Player.update(dt);
    World.renderer.render(World.scene, World.camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
