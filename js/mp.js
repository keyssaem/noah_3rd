/* ═══════════ MP — MediaPipe 공통 로더 & 카메라 게이트 ═══════════
   Tasks Vision을 CDN에서 동적 import()로 지연 로드 (무빌드 구조 유지).
   - MP.camGate()      : 노아의 개인정보 안내 → 학생의 수락/거절 → 스트림 or null
                         (거절도 존중받는 경험 — 5-1 '거절할 권리' 학습과 수미상관)
   - MP.ensureGesture(): 제스처 인식기 지연 로드 (모델 다운로드 진행바 표시)
   ⚠ 카메라는 보안 컨텍스트(https/localhost) 필수 — 태블릿은 GitHub Pages로 접속 */
const MP = {
  CDN: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',
  GESTURE_MODEL: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  HANDS_MODEL: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',

  _vision: null,        // tasks-vision 모듈 (import 캐시)
  _fileset: null,       // WASM fileset 캐시
  _gesture: null,       // GestureRecognizer 인스턴스 캐시 (게임 간 재사용)
  _hands: null,         // HandLandmarker 인스턴스 캐시

  /* 카메라 사용이 기술적으로 가능한 환경인가 (https/localhost + API 존재) */
  available() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  /* ───── 📷 카메라 게이트 — 모든 MediaPipe 게임의 공용 입구 ─────
     반환: MediaStream(수락+성공) 또는 null(불가/거절/실패 → 폴백 모드) */
  async camGate() {
    if (!this.available()) return null;   // http(태블릿 IP접속)/미지원 기기 → 조용히 폴백
    await UI.dialogue(DATA.dlg.camGate);
    const ok = await UI.choice('카메라를 사용할까요?', [
      { label: '📷 좋아, 카메라로 하자!', value: true },
      { label: '🙅 아니, 카메라는 안 쓸래', value: false },
    ], '어느 쪽을 골라도 놀이는 똑같이 진행돼요.');
    if (!ok) {
      await UI.dialogue(DATA.dlg.camDeclined);
      return null;
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch (e) {
      // 브라우저 권한 거부도 '거절이 존중받는 경험'으로 처리
      await UI.dialogue(DATA.dlg.camFailed);
      return null;
    }
  },

  stopCam(stream) {
    if (stream) stream.getTracks().forEach(t => t.stop());
  },

  /* ───── 제스처 인식기 지연 로드 (진행바 오버레이) — 실패 시 null ───── */
  async ensureGesture() {
    if (this._gesture) return this._gesture;

    const ov = UI.overlay(`
      <div class="ov-panel mp-load">
        <h3>🤖 노아가 눈을 뜨는 중...</h3>
        <div class="mp-bar"><div class="mp-fill"></div></div>
        <p class="mp-status">인공지능 시각 도구를 불러오는 중...</p>
      </div>`);
    const fill = ov.querySelector('.mp-fill');
    const status = ov.querySelector('.mp-status');

    try {
      // 1) 모듈 동적 import (일반 스크립트에서도 import()는 동작)
      if (!this._vision) {
        try { this._vision = await import(this.CDN); }
        catch (e) { this._vision = await import(this.CDN + '/vision_bundle.mjs'); }
      }
      // 2) WASM 런타임
      status.textContent = '시각 엔진 준비 중...';
      fill.style.width = '15%';
      if (!this._fileset) {
        this._fileset = await this._vision.FilesetResolver.forVisionTasks(this.CDN + '/wasm');
      }
      // 3) 모델 다운로드 (진행률 표시 — 약 8MB)
      status.textContent = '손 모양 학습 데이터 내려받는 중...';
      const bytes = await this._fetchProgress(this.GESTURE_MODEL, p => {
        fill.style.width = (15 + p * 75) + '%';
      });
      // 4) 인식기 생성
      status.textContent = '거의 다 됐어요...';
      fill.style.width = '95%';
      this._gesture = await this._vision.GestureRecognizer.createFromOptions(this._fileset, {
        baseOptions: { modelAssetBuffer: bytes, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      fill.style.width = '100%';
      await UI.wait(250);
      UI.close(ov);
      return this._gesture;
    } catch (e) {
      UI.close(ov);
      return null;   // 로드 실패 → 호출측에서 폴백 진행
    }
  },

  /* ───── 손 랜드마커 지연 로드 (진행바 오버레이) — 실패 시 null ───── */
  async ensureHands() {
    if (this._hands) return this._hands;

    const ov = UI.overlay(`
      <div class="ov-panel mp-load">
        <h3>🤖 노아가 손을 바라보는 중...</h3>
        <div class="mp-bar"><div class="mp-fill"></div></div>
        <p class="mp-status">인공지능 시각 도구를 불러오는 중...</p>
      </div>`);
    const fill = ov.querySelector('.mp-fill');
    const status = ov.querySelector('.mp-status');

    try {
      if (!this._vision) {
        try { this._vision = await import(this.CDN); }
        catch (e) { this._vision = await import(this.CDN + '/vision_bundle.mjs'); }
      }
      status.textContent = '시각 엔진 준비 중...';
      fill.style.width = '15%';
      if (!this._fileset) {
        this._fileset = await this._vision.FilesetResolver.forVisionTasks(this.CDN + '/wasm');
      }
      status.textContent = '손 모양 학습 데이터 내려받는 중...';
      const bytes = await this._fetchProgress(this.HANDS_MODEL, p => {
        fill.style.width = (15 + p * 75) + '%';
      });
      status.textContent = '거의 다 됐어요...';
      fill.style.width = '95%';
      this._hands = await this._vision.HandLandmarker.createFromOptions(this._fileset, {
        baseOptions: { modelAssetBuffer: bytes, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      fill.style.width = '100%';
      await UI.wait(250);
      UI.close(ov);
      return this._hands;
    } catch (e) {
      UI.close(ov);
      return null;
    }
  },

  /* 손 랜드마커 결과 → 손 커서 정보 (검지끝 위치 + 엄지-검지 핀치 여부)
     좌표는 정규화(0~1), x는 거울 반전 전 원본 기준 */
  pinchFromResult(result) {
    const lm = result && result.landmarks && result.landmarks[0];
    if (!lm) return null;
    const thumb = lm[4], index = lm[8], wrist = lm[0], midMcp = lm[9];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const scale = dist(wrist, midMcp) || 0.001;        // 손 크기 기준 (거리 정규화)
    const pinchRatio = dist(thumb, index) / scale;
    return {
      x: index.x, y: index.y,                          // 검지끝 (커서 위치)
      pinching: pinchRatio < 0.55,                      // 손 크기 대비 임계값
    };
  },

  async _fetchProgress(url, onP) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('model fetch failed');
    const total = +resp.headers.get('Content-Length') || 0;
    const reader = resp.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total) onP(Math.min(1, loaded / total));
    }
    const out = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  },

  /* 인식 결과 → 가위바위보 손 (없으면 null) */
  rpsFromResult(result) {
    const g = result && result.gestures && result.gestures[0] && result.gestures[0][0];
    if (!g || g.score < 0.45) return null;
    return { Closed_Fist: 'rock', Open_Palm: 'paper', Victory: 'scissors' }[g.categoryName] || null;
  },
};
