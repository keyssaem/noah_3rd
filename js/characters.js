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
  donghyuk() { return this.person({ hair: 0x4e342e, shirt: 0x69db7c, pants: 0x2f4f4f }); },
  chaewon() { return this.person({ girl: true, hair: 0x212121, shirt: 0xffd43b, pants: 0xe8590c }); },
  seoyeon() { return this.person({ girl: true, hair: 0x6d4c41, shirt: 0xb197fc, pants: 0x7048e8 }); },
  teacher() { return this.person({ hair: 0x6d4c41, shirt: 0x9775fa, pants: 0x495057, scale: 1.15 }); },
  student(i) {
    const shirts = [0xff8787, 0x74c0fc, 0x63e6be, 0xffd43b, 0xb197fc, 0xffa94d];
    return this.person({ girl: i % 2 === 1, hair: [0x212121, 0x4e342e, 0x5d4037][i % 3], shirt: shirts[i % 6], pants: 0x455a64, scale: 0.95 });
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
        if (mixer) mixer.update(dt);
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
    playerM:   { idle: 0, sit: 1, walk: 3, surprise: 4 },   // [2]둘러보기는 여자와 통일 위해 제외
    playerF:   { idle: 0, sit: 1, walk: 2, surprise: 4 },   // [3]인정하기는 제외
    teacher:   { look: 0 },
    friendM:   { look: 0 },
    friendF:   { look: 0 },
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
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.width, canvas.height, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 50);
    cam.position.set(0, 1.4, 3.4); cam.lookAt(0, 0.85, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(2, 4, 3); scene.add(dir);
    const ch = buildFn();
    scene.add(ch.group);
    let alive = true;
    const loop = () => {
      if (!alive) return;
      ch.group.rotation.y += 0.02;
      ch.update(0.016, false);
      renderer.render(scene, cam);
      requestAnimationFrame(loop);
    };
    loop();
    return { dispose() { alive = false; renderer.dispose(); } };
  },
};
