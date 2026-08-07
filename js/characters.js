/* ═══════════ Chars — 로우폴리 3D 캐릭터 제작 ═══════════ */
const Chars = {

  mat(color) { return new THREE.MeshLambertMaterial({ color }); },

  /* ───── 사람 캐릭터 (플레이어/NPC 공용) ───── */
  person(opts = {}) {
    const o = Object.assign({
      skin: 0xffd8b5, hair: 0x3d2817, shirt: 0x4dabf7, pants: 0x37474f,
      girl: false, hairColor2: null, scale: 1,
    }, opts);
    const g = new THREE.Group();
    const M = c => this.mat(c);

    // 몸통
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.32), M(o.shirt));
    body.position.y = 0.75; g.add(body);

    // 치마 or 바지 표현
    if (o.girl) {
      const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.35, 8), M(o.pants));
      skirt.position.y = 0.42; g.add(skirt);
    }

    // 머리
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.44), M(o.skin));
    head.position.y = 1.32; g.add(head);

    // 머리카락
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.48), M(o.hair));
    hairTop.position.y = 1.55; g.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, o.girl ? 0.55 : 0.26, 0.14), M(o.hair));
    hairBack.position.set(0, o.girl ? 1.28 : 1.42, -0.2); g.add(hairBack);
    if (o.girl) { // 양갈래
      const t1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), M(o.hair));
      t1.position.set(0.3, 1.5, -0.05); g.add(t1);
      const t2 = t1.clone(); t2.position.x = -0.3; g.add(t2);
    }

    // 눈
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.08, 0.02);
    const eyeMat = M(0x212121);
    const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(0.11, 1.34, 0.23); g.add(e1);
    const e2 = e1.clone(); e2.position.x = -0.11; g.add(e2);

    // 팔
    const armGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
    const armL = new THREE.Mesh(armGeo, M(o.shirt)); armL.position.set(0.36, 0.78, 0);
    armL.geometry.translate(0, -0.18, 0); armL.position.y = 0.98; g.add(armL);
    const armR = armL.clone(); armR.position.x = -0.36; g.add(armR);

    // 다리
    const legGeo = new THREE.BoxGeometry(0.17, 0.45, 0.17);
    const legL = new THREE.Mesh(legGeo, M(o.girl ? o.skin : o.pants));
    legL.geometry.translate(0, -0.2, 0); legL.position.set(0.14, 0.45, 0); g.add(legL);
    const legR = legL.clone(); legR.position.x = -0.14; g.add(legR);

    g.scale.setScalar(o.scale);
    g.traverse(m => { m.castShadow = true; });

    return {
      group: g, armL, armR, legL, legR, head,
      t: Math.random() * 10,
      update(dt, moving) {
        this.t += dt * (moving ? 10 : 2);
        const s = moving ? 0.6 : 0.04;
        this.armL.rotation.x = Math.sin(this.t) * s;
        this.armR.rotation.x = -Math.sin(this.t) * s;
        this.legL.rotation.x = -Math.sin(this.t) * s * 0.9;
        this.legR.rotation.x = Math.sin(this.t) * s * 0.9;
        if (!moving) this.head.position.y = 1.32 + Math.sin(this.t * 0.8) * 0.01;
      },
    };
  },

  /* 프리셋 — 주인공: GLB(대기·걷기·앉기·놀라기) 우선, 실패 시 박스 폴백 */
  PLAYER_WALK_TS: 1.8,   // 걷기 클립 배속 (이동 속도와 발맞춤 — 눈으로 튜닝)
  player(gender) {
    const name = gender === 'f' ? 'playerF' : 'playerM';
    if (typeof Assets !== 'undefined' && Assets.isLoaded(name)) {
      const ch = this.glbChar(name, {
        height: 1.65, clips: this.CLIPS[name], walkTimeScale: this.PLAYER_WALK_TS,
      });
      if (ch) return ch;
    }
    return gender === 'f'
      ? this.person({ girl: true, hair: 0x5d4037, shirt: 0xff8fab, pants: 0xd6336c })
      : this.person({ hair: 0x212121, shirt: 0x4dabf7, pants: 0x37474f });
  },
  /* ───── 🏷️ 머리 위 이름표 (캔버스 스프라이트 — 항상 카메라를 향함, 벽 뒤에서도 보임) ───── */
  nameTag(text, color = '#ffd43b', y = 2.0) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    const w = 200, h = 46, r = 22, x0 = (256 - w) / 2, y0 = (64 - h) / 2;
    x.fillStyle = 'rgba(15,23,42,.72)';               // 둥근 반투명 배경 (수동 라운드 — 구형 브라우저 대응)
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    x.arcTo(x0, y0 + h, x0, y0, r);
    x.arcTo(x0, y0, x0 + w, y0, r);
    x.fill();
    x.font = 'bold 34px Jua, "Gowun Dodum", sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = color;
    x.fillText(text, 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthTest: false,
    }));
    sp.scale.set(1.35, 0.34, 1);
    sp.position.y = y;
    sp.renderOrder = 5;
    return sp;
  },

  /* 🧑‍🤝‍🧑 주요 친구 3명 — GLB(정지 모델) 우선, 실패 시 기존 박스 폴백.
     키는 주인공(1.65)보다 살짝 작게 잡아 같은 6학년으로 보이게 한다 */
  FRIEND_H: 1.6,
  _friendGLB(model, name, color) {
    if (typeof Assets === 'undefined' || !Assets.isLoaded(model)) return null;
    const ch = this.glbChar(model, { height: this.FRIEND_H, clips: this.CLIPS[model] });
    if (ch) ch.group.add(this.nameTag(name, color, this.FRIEND_H + 0.28));
    return ch;
  },
  donghyuk() {
    const glb = this._friendGLB('friendBoy', '동혁', '#8ce99a');
    if (glb) return glb;
    const ch = this.person({ hair: 0x4e342e, shirt: 0x69db7c, pants: 0x2f4f4f });
    ch.group.add(this.nameTag('동혁', '#8ce99a'));
    return ch;
  },
  chaewon() {
    const glb = this._friendGLB('friendGirlCw', '채원', '#ffd43b');
    if (glb) return glb;
    const ch = this.person({ girl: true, hair: 0x212121, shirt: 0xffd43b, pants: 0xe8590c });
    ch.group.add(this.nameTag('채원', '#ffd43b'));
    return ch;
  },
  seoyeon() {
    const glb = this._friendGLB('friendGirlSy', '서연', '#d0bfff');
    if (glb) return glb;
    const ch = this.person({ girl: true, hair: 0x6d4c41, shirt: 0xb197fc, pants: 0x7048e8 });
    ch.group.add(this.nameTag('서연', '#d0bfff'));
    return ch;
  },
  /* 🧑‍🏫 선생님 — GLB(키 1.8, 둘러보기 대기) 우선, 실패 시 박스 폴백 */
  teacher() {
    if (typeof Assets !== 'undefined' && Assets.isLoaded('teacher')) {
      const ch = this.glbChar('teacher', { height: 1.8, clips: this.CLIPS.teacher });
      if (ch) { ch.group.add(this.nameTag('선생님', '#ffffff', 2.12)); return ch; }
    }
    const ch = this.person({ hair: 0x6d4c41, shirt: 0x9775fa, pants: 0x495057, scale: 1.15 });
    ch.group.add(this.nameTag('선생님', '#ffffff', 1.92));
    return ch;
  },
  /* ───── 👫 배경 학생 — 친구 3종 모델을 색만 갈아입혀 재사용 (이름표 없음) ─────
     지오메트리·원본 텍스처는 인스턴스끼리 공유되므로 추가 비용은 변형 텍스처(512²) 6장뿐.
     머리 / 윗옷 / 아래옷은 "UV 파트 마스크"(정점 높이 → 텍셀)로 나눠 각각 다른 색을 입힌다.
     look: [색상각도(0~360), 채도] — 원래 음영(명도)은 보존해서 주름·그림자가 살아 있다 */
  STUDENT_LOOKS: [
    { model: 'friendBoy',    hair: [25, 0.40], top: [145, 0.50], bottom: [215, 0.45], h: 1.58, ry:  0.12 },
    { model: 'friendGirlCw', hair: [10, 0.35], top: [ 45, 0.55], bottom: [260, 0.40], h: 1.54, ry: -0.10 },
    { model: 'friendGirlSy', hair: [30, 0.20], top: [190, 0.50], bottom: [220, 0.45], h: 1.61, ry:  0.08 },
    { model: 'friendBoy',    hair: [20, 0.10], top: [ 25, 0.55], bottom: [155, 0.35], h: 1.63, ry: -0.15 },
    { model: 'friendGirlCw', hair: [35, 0.45], top: [285, 0.45], bottom: [205, 0.40], h: 1.57, ry:  0.05 },
    { model: 'friendGirlSy', hair: [15, 0.30], top: [345, 0.50], bottom: [230, 0.45], h: 1.52, ry: -0.06 },
  ],
  student(i) {
    const look = this.STUDENT_LOOKS[i % this.STUDENT_LOOKS.length];
    if (typeof Assets !== 'undefined' && Assets.isLoaded(look.model)) {
      const ch = this.glbChar(look.model, { height: look.h, faceY: look.ry, clips: this.CLIPS[look.model] });
      if (ch) { this._wearLook(ch, look, i % this.STUDENT_LOOKS.length); return ch; }
    }
    const shirts = [0xff8787, 0x74c0fc, 0x63e6be, 0xffd43b, 0xb197fc, 0xffa94d];
    return this.person({ girl: i % 2 === 1, hair: [0x212121, 0x4e342e, 0x5d4037][i % 3], shirt: shirts[i % 6], pants: 0x455a64, scale: 0.95 });
  },

  /* 변형 텍스처를 인스턴스 전용 머티리얼에 물린다 (원본을 그대로 쓰면 친구 3인방까지 물든다) */
  _wearLook(ch, look, idx) {
    let mesh = null;
    ch.group.traverse(o => { if (!mesh && o.isMesh && o.material && o.material.map) mesh = o; });
    if (!mesh) return;
    const map = this._lookMap(mesh, look, idx);
    if (!map) return;
    mesh.material = mesh.material.clone();
    mesh.material.map = map;
    mesh.material.needsUpdate = true;
  },

  _lookCache: {}, _maskCache: {},
  _lookMap(mesh, look, idx) {
    const key = look.model + '#' + idx;
    if (key in this._lookCache) return this._lookCache[key];
    let tex = null;
    try { tex = this._buildLookMap(mesh, look); }
    catch (e) { console.warn('배경 학생 색 변경 실패 — 원본 텍스처 사용', e); }
    this._lookCache[key] = tex;
    return tex;
  },

  _buildLookMap(mesh, look) {
    const S = 512;                                   // 배경 NPC라 절반 해상도로 충분 (메모리 1/4)
    const src = mesh.material.map;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src.image, 0, 0, S, S);
    const im = ctx.getImageData(0, 0, S, S), d = im.data;
    const mask = this._partMask(mesh, look.model, S);
    // 👕 허리 경계(4번) 판정용 기준색 — 확실한 상의(2)·하의(3) 영역의 평균 원단색.
    //    셔츠 밑단이 허리선 아래로 내려와 바지 색으로 물들던 문제를 색으로 되돌린다
    const ref = { 2: [0, 0, 0, 0], 3: [0, 0, 0, 0] };
    for (let p = 0, i = 0; p < d.length; p += 4, i++) {
      const a = ref[mask[i]];
      if (!a || this._isSkinPx(d[p], d[p + 1], d[p + 2])) continue;
      a[0] += d[p]; a[1] += d[p + 1]; a[2] += d[p + 2]; a[3]++;
    }
    const refTop = ref[2][3] ? ref[2].map(x => x / ref[2][3]) : null;
    const refBot = ref[3][3] ? ref[3].map(x => x / ref[3][3]) : null;
    const dist2 = (r, g, b, m) => (r - m[0]) ** 2 + (g - m[1]) ** 2 + (b - m[2]) ** 2;

    for (let p = 0, i = 0; p < d.length; p += 4, i++) {
      let part = mask[i];
      if (!part) continue;
      if (part === 4) {                              // 허리 구간 — 원단색이 가까운 쪽으로 편입
        if (!refTop || !refBot) part = 3;
        else part = dist2(d[p], d[p + 1], d[p + 2], refTop) <= dist2(d[p], d[p + 1], d[p + 2], refBot) ? 2 : 3;
      }
      const R = d[p] / 255, G = d[p + 1] / 255, B = d[p + 2] / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const v = mx, s = mx ? (mx - mn) / mx : 0;
      if (v < 0.12) continue;                        // 눈동자·윤곽선 같은 아주 어두운 픽셀은 보존
      let h = 0;
      if (mx !== mn) {
        if (mx === R) h = 60 * (((G - B) / (mx - mn)) % 6);
        else if (mx === G) h = 60 * ((B - R) / (mx - mn) + 2);
        else h = 60 * ((R - G) / (mx - mn) + 4);
        if (h < 0) h += 360;
      }
      if (this._isSkinPx(d[p], d[p + 1], d[p + 2])) continue;                 // 🧑 살색(얼굴·손·다리) 보호
      let tone;
      if (part === 1) { if (v > 0.45) continue; tone = look.hair; }           // 머리카락은 어두운 픽셀만
      else tone = part === 2 ? look.top : look.bottom;
      const ns = Math.min(0.9, tone[1] + s * 0.25);  // 원단의 미세한 무늬를 조금 남긴다
      const c = this._hsv2rgb(tone[0] / 360, ns, v);
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2];
    }
    ctx.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.flipY = src.flipY;                             // glTF 텍스처는 flipY=false — 캔버스 기본값(true)과 다르다
    t.wrapS = src.wrapS; t.wrapT = src.wrapT;
    if ('colorSpace' in src) t.colorSpace = src.colorSpace; else t.encoding = src.encoding;
    t.needsUpdate = true;
    return t;
  },

  /* 🧑 살색 판정 — 얼굴·손·다리는 어떤 파트에 속하든 물들이지 않는다 */
  _isSkinPx(r, g, b) {
    const R = r / 255, G = g / 255, B = b / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (mx <= 0.5) return false;
    const s = (mx - mn) / mx;
    if (s <= 0.12 || s >= 0.72) return false;
    let h = 0;
    if (mx !== mn) {
      if (mx === R) h = 60 * (((G - B) / (mx - mn)) % 6);
      else if (mx === G) h = 60 * ((B - R) / (mx - mn) + 2);
      else h = 60 * ((R - G) / (mx - mn) + 4);
      if (h < 0) h += 360;
    }
    return h < 50 || h > 330;
  },

  /* UV 파트 마스크 — 삼각형의 평균 높이로 머리(1)/윗옷(2)/아래옷(3)을 나눠 텍셀에 칠한다.
     허리 구간은 4로 남겨 두고, 상의 밑단인지 하의인지는 원단색으로 판정한다(_buildLookMap).
     신발(발목 아래)은 0으로 남겨 원래 색을 유지. 모델당 한 번만 만들고 캐시 */
  _partMask(mesh, model, S) {
    if (this._maskCache[model]) return this._maskCache[model];
    const geo = mesh.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, ix = geo.index;
    geo.computeBoundingBox();
    const y0 = geo.boundingBox.min.y, hh = (geo.boundingBox.max.y - y0) || 1;
    const mask = new Uint8Array(S * S);
    const n = ix ? ix.count : pos.count;
    for (let t = 0; t < n; t += 3) {
      const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, c = ix ? ix.getX(t + 2) : t + 2;
      const yr = ((pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3 - y0) / hh;
      // 0.86 ≈ 턱선(사람 7.5등신 기준) · 0.38~0.58 = 셔츠 밑단과 허리춤이 섞이는 구간
      const part = yr < 0.10 ? 0 : yr < 0.38 ? 3 : yr < 0.58 ? 4 : yr < 0.86 ? 2 : 1;
      if (part) this._rasterUV(mask, S, part, uv, a, b, c);
    }
    this._dilate(mask, S);                           // UV 이음새 번짐 대비 1~2px 확장
    this._maskCache[model] = mask;
    return mask;
  },

  _rasterUV(mask, S, part, uv, ia, ib, ic) {
    const ax = uv.getX(ia) * S, ay = uv.getY(ia) * S,
          bx = uv.getX(ib) * S, by = uv.getY(ib) * S,
          cx = uv.getX(ic) * S, cy = uv.getY(ic) * S;
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (!det) return;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det;
        const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det;
        if (l1 < -0.02 || l2 < -0.02 || l1 + l2 > 1.02) continue;
        mask[y * S + x] = part;
      }
    }
  },

  _dilate(mask, S, passes = 2) {
    for (let p = 0; p < passes; p++) {
      const src = mask.slice();
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const i = y * S + x;
          if (src[i]) continue;
          for (let dy = -1; dy <= 1 && !mask[i]; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
              if (src[ny * S + nx]) { mask[i] = src[ny * S + nx]; break; }
            }
          }
        }
      }
    }
  },

  _hsv2rgb(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i;
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const r = [v, q, p, p, t, v][i % 6], g = [t, v, v, q, p, p][i % 6], b = [p, p, t, v, v, q][i % 6];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  },

  /* ───── GLB 캐릭터 래퍼 (박스 캐릭터와 동일한 인터페이스 { group, update }) ─────
     Assets에 프리로드된 gltf를 복제해 AnimationMixer로 클립 재생.
     clips: {idle,wave,...} → 클립 인덱스 매핑 (NlaTrack 이름이 무의미하므로 인덱스로 지정) */
  glbChar(instName, opts = {}) {
    const inst = (typeof Assets !== 'undefined') ? Assets.instance(instName) : null;
    if (!inst) return null;                       // 미로드/미지원 → 호출측이 박스로 폴백
    const group = new THREE.Group();
    // 🧭 정면 보정: Tripo 모델은 정면이 +X 등으로 틀어져 있음 → 게임 기준(+Z)으로 자동 정렬
    inst.scene.rotation.y += (opts.faceY != null ? opts.faceY : 0) - Assets.frontOffset(inst.scene);
    Assets.normalize(inst.scene, opts.height || 1.7);
    group.add(inst.scene);
    group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });

    const mixer = inst.animations.length ? new THREE.AnimationMixer(inst.scene) : null;
    const actions = (inst.animations || []).map(c => mixer.clipAction(c));
    const clips = opts.clips || {};
    const api = {
      group, mixer, actions, clips, _cur: -1, isGLB: true, design: opts.design,
      _bt: Math.random() * 6, _by: null,    // 호흡 위상은 개체마다 다르게 (여럿이 같이 들썩이면 어색)
      /* 클립 재생 — key(문자열) 또는 인덱스, 크로스페이드 */
      play(key, fade = 0.3) {
        if (!mixer) return;
        const i = (typeof key === 'string') ? (clips[key] ?? -1) : key;
        if (i < 0 || !actions[i] || this._cur === i) return;
        actions[i].reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
        if (this._cur >= 0 && actions[this._cur]) actions[this._cur].fadeOut(fade);
        this._cur = i;
      },
      /* moving 플래그로 대기↔걷기 가중치 블렌딩 (재시작 없이 두 클립을 동시 재생, 가중치만 교차
         — play(reset) 방식은 탭 연타 때마다 걷기가 0프레임부터 다시 시작돼 부자연스러움) */
      update(dt, moving) {
        if (this._loco) {
          const t = moving ? 1 : 0;
          this._locoW += (t - this._locoW) * Math.min(1, dt * 9);
          if (Math.abs(t - this._locoW) < 0.02) this._locoW = t;
          actions[clips.walk].setEffectiveWeight(this._locoW);
          actions[clips.idle].setEffectiveWeight(1 - this._locoW);
          this._cur = this._locoW > 0.5 ? clips.walk : clips.idle;
        }
        if (mixer) { mixer.update(dt); return; }
        // 🫁 애니메이션이 없는 정지 모델(친구·배경 학생) — 미세 호흡 ±1cm.
        //    완전히 굳어 있으면 움직이는 선생님·노아 옆에서 마네킹처럼 보인다.
        //    기준 y는 첫 프레임에 기억 (addNPC가 위치를 잡은 뒤라 0이 아닐 수도 있음)
        if (this._by == null) this._by = group.position.y;
        this._bt += dt;
        group.position.y = this._by + Math.sin(this._bt * 1.6) * 0.01;
      },
    };
    api._loco = clips.walk != null && clips.idle != null;   // 이동 블렌딩 활성 조건
    if (clips.walk != null && actions[clips.walk])
      actions[clips.walk].setEffectiveTimeScale(opts.walkTimeScale || 1);   // 발걸음-이동속도 싱크
    if (api._loco) {
      api._locoW = 0;
      actions[clips.idle].setEffectiveWeight(1).play();
      actions[clips.walk].setEffectiveWeight(0).play();
      api._cur = clips.idle;
    } else {
      const defIdle = clips.idle != null ? clips.idle : (clips.look != null ? clips.look : 0);
      if (actions.length) api.play(defIdle, 0);   // 기본 대기 클립
    }
    return api;
  },

  /* GLB 클립 매핑 (2026-07-09 뷰어로 식별 확정) — 모델명 → { 의미키: 클립인덱스 }
     주인공 남/여는 공통 동작만 살림(대기·앉기·걷기·놀라기). 노아 동물은 [0] 미사용. */
  CLIP_LABELS: { idle:'대기', sit:'앉기', walk:'걷기', surprise:'놀라기',
    greet:'꾸벅 인사', admit:'인정하기', scared:'두려워하기', look:'둘러보기' },
  CLIPS: {
    // 2026-08-07 주인공 2K 재출력 — 실제로 쓰는 대기·걷기만 남김(앉기·놀라기는 코드에서 미사용).
    // ⚠ 남/여 클립 순서가 서로 다르다 (대기 15.4초 / 걷기 2.4초로 식별 — 인덱스를 임의로 맞추지 말 것)
    playerM:   { idle: 0, walk: 1 },
    playerF:   { idle: 1, walk: 0 },
    teacher:   { look: 0 },
    friendBoy: {}, friendGirlSy: {}, friendGirlCw: {},      // 친구 3종은 정지 모델(클립 없음)
    noahHuman: { idle: 0, greet: 1, admit: 2, scared: 3 },
    noahAnimal:{ idle: 1, greet: 2, scared: 3 },            // [0] 미사용
    noahCar:   {},                                          // 정적
  },

  /* ───── 노아 (human / animal / car) — GLB 우선, 실패 시 박스 폴백 ───── */
  noah(design) {
    const glbName = { human: 'noahHuman', animal: 'noahAnimal', car: 'noahCar' }[design] || 'noahHuman';
    if (typeof Assets !== 'undefined' && Assets.isLoaded(glbName)) {
      const ch = this.glbChar(glbName, {
        height: design === 'car' ? 1.2 : 1.7,
        design, clips: this.CLIPS[glbName] || {},
      });
      if (ch) return ch;                          // GLB 성공
    }
    return this._noahBox(design);                 // 폴백: 기존 박스 노아
  },

  _noahBox(design) {
    const g = new THREE.Group();
    const M = c => this.mat(c);
    const silver = 0xb0bec5, dark = 0x546e7a, glow = 0x4dd0e1;
    let parts = {};

    if (design === 'animal') {           // 🐱 동물형 로봇
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.9), M(silver));
      body.position.y = 0.5; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), M(silver));
      head.position.set(0, 0.95, 0.45); g.add(head);
      const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), M(dark));
      ear1.position.set(0.18, 1.3, 0.45); g.add(ear1);
      const ear2 = ear1.clone(); ear2.position.x = -0.18; g.add(ear2);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.6), M(dark));
      tail.position.set(0, 0.75, -0.5); tail.rotation.x = 0.7; g.add(tail);
      const legGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
      [[0.25, 0.3], [-0.25, 0.3], [0.25, -0.3], [-0.25, -0.3]].forEach(p => {
        const l = new THREE.Mesh(legGeo, M(dark)); l.position.set(p[0], 0.17, p[1]); g.add(l);
      });
      this._noahFace(g, M, glow, 0, 0.98, 0.71);
      const chest = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: glow }));
      chest.position.set(0, 0.55, 0.46); g.add(chest);
      parts = { head, chest, tail };
    } else if (design === 'car') {       // 🚗 자동차형 로봇
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.3), M(0x74c0fc));
      body.position.y = 0.42; g.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.7), M(silver));
      cab.position.set(0, 0.8, -0.1); g.add(cab);
      const wGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12);
      [[0.5, 0.4], [-0.5, 0.4], [0.5, -0.45], [-0.5, -0.45]].forEach(p => {
        const w = new THREE.Mesh(wGeo, M(0x263238));
        w.rotation.z = Math.PI / 2; w.position.set(p[0], 0.2, p[1]); g.add(w);
      });
      this._noahFace(g, M, glow, 0, 0.82, 0.26, 0.55);
      const chest = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), new THREE.MeshBasicMaterial({ color: glow }));
      chest.position.set(0, 0.5, 0.66); g.add(chest);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), M(dark));
      antenna.position.set(0.25, 1.15, -0.1); g.add(antenna);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff6b6b }));
      ball.position.set(0.25, 1.32, -0.1); g.add(ball);
      parts = { head: cab, chest, ball };
    } else {                              // 🧍 사람형 로봇 (기본)
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.38), M(silver));
      body.position.y = 0.78; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.46), M(silver));
      head.position.y = 1.4; g.add(head);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22), M(dark));
      antenna.position.y = 1.75; g.add(antenna);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff6b6b }));
      ball.position.y = 1.88; g.add(ball);
      this._noahFace(g, M, glow, 0, 1.42, 0.24);
      const chest = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), new THREE.MeshBasicMaterial({ color: glow }));
      chest.position.set(0, 0.85, 0.2); g.add(chest);
      const armGeo = new THREE.BoxGeometry(0.15, 0.55, 0.15);
      const armL = new THREE.Mesh(armGeo, M(dark)); armL.geometry.translate(0, -0.2, 0);
      armL.position.set(0.42, 1.02, 0); g.add(armL);
      const armR = armL.clone(); armR.position.x = -0.42; g.add(armR);
      const legGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
      const legL = new THREE.Mesh(legGeo, M(dark)); legL.geometry.translate(0, -0.2, 0);
      legL.position.set(0.15, 0.46, 0); g.add(legL);
      const legR = legL.clone(); legR.position.x = -0.15; g.add(legR);
      parts = { head, chest, ball, armL, armR, legL, legR };
    }

    g.traverse(m => { m.castShadow = true; });
    return {
      group: g, ...parts, t: 0, design,
      update(dt, moving) {
        this.t += dt * (moving ? 9 : 2);
        if (this.armL) {
          const s = moving ? 0.5 : 0.03;
          this.armL.rotation.x = Math.sin(this.t) * s;
          this.armR.rotation.x = -Math.sin(this.t) * s;
          if (this.legL) { this.legL.rotation.x = -Math.sin(this.t) * s; this.legR.rotation.x = Math.sin(this.t) * s; }
        }
        if (this.tail) this.tail.rotation.z = Math.sin(this.t * 1.5) * 0.3;
        if (this.chest) this.chest.material.color.setHSL(0.5, 0.8, 0.5 + Math.sin(this.t * 2) * 0.2);
        this.group.position.y = Math.abs(Math.sin(this.t * (moving ? 1 : 0.5))) * (moving ? 0.05 : 0.02);
      },
    };
  },

  _noahFace(g, M, glow, x, y, z, w = 0.36) {
    const eyeMat = new THREE.MeshBasicMaterial({ color: glow });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), eyeMat);
    e1.position.set(x + w * 0.3, y + 0.04, z); g.add(e1);
    const e2 = e1.clone(); e2.position.x = x - w * 0.3; g.add(e2);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), eyeMat);
    mouth.position.set(x, y - 0.12, z); g.add(mouth);
  },

  /* ───── 회전 미리보기 (캐릭터 선택 / 노아 디자인 선택) ───── */
  makePreview(canvas, buildFn) {
    let renderer;
    try {
      renderer = Rendering.create({ canvas, antialias: true, alpha: true }, '캐릭터 미리보기');
    } catch (error) {
      console.warn('Character preview WebGL initialization failed:', error);
      const removeFallback = Rendering.previewFallback(canvas);
      return { dispose: removeFallback };
    }
    renderer.setSize(canvas.width, canvas.height, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 50);
    cam.position.set(0, 1.4, 3.4); cam.lookAt(0, 0.85, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(2, 4, 3); scene.add(dir);
    let ch;
    try {
      ch = buildFn();
    } catch (error) {
      console.warn('Character preview creation failed:', error);
      Rendering.dispose(renderer);
      const removeFallback = Rendering.previewFallback(canvas);
      return { dispose: removeFallback };
    }
    scene.add(ch.group);
    let alive = true, raf = null;
    const loop = () => {
      if (!alive) return;
      ch.group.rotation.y += 0.02;
      ch.update(0.016, false);
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return { dispose() { alive = false; cancelAnimationFrame(raf); Rendering.dispose(renderer); } };
  },
};
