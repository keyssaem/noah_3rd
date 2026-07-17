/* ═══════════ World — Three.js 씬 & 공간(집/월드맵/교실/운동장/복도) ═══════════ */
const World = {
  renderer: null, scene: null, camera: null, contextLost: false,
  root: null, current: '',
  platforms: [], bounds: null, zones: [], npcs: [], items: [], obstacles: [],
  beacon: null, redMode: false,
  _hemi: null, _sun: null,

  init(canvas) {
    this.renderer = Rendering.create({ canvas, antialias: true }, '메인 게임 화면');
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);

    this._hemi = new THREE.HemisphereLight(0xbfe3ff, 0x7ed67e, 0.9);
    this.scene.add(this._hemi);
    this._sun = new THREE.DirectionalLight(0xffffff, 0.85);
    this._sun.position.set(20, 40, 15);
    this._sun.castShadow = true;
    this._sun.shadow.mapSize.set(2048, 2048);
    const sc = this._sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40;
    this.scene.add(this._sun);

    this.resize();
    canvas.addEventListener('webglcontextlost', () => { this.contextLost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.contextLost = false; });
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  },

  /* ───── 공용 도우미 ───── */
  mat(c) { return new THREE.MeshLambertMaterial({ color: c }); },
  box(w, h, d, c, x, y, z, ry = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(c));
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    this.root.add(m); return m;
  },
  ground(w, d, c) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mat(c));
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    this.root.add(m); return m;
  },
  tree(x, z, s = 1) {
    this.box(0.4 * s, 1.6 * s, 0.4 * s, 0x6d4c41, x, 0.8 * s, z);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.2 * s, 2.2 * s, 7), this.mat(0x2e9e44));
    leaf.position.set(x, 2.6 * s, z); leaf.castShadow = true; this.root.add(leaf);
    this.obstacles.push({ x, z, r: 0.7 * s });
  },

  PRELOAD: {                          // 씬별 미리 받을 캐릭터 모델
    classroom: ['teacher'],
    playground: ['teacher'],
    hallway: ['teacher'],               // 복도2에 선생님 등장
  },

  async preloadProps(name) {
    const spec = this.PRELOAD[name];
    if (!spec) return;
    if (typeof Assets === 'undefined' || !Assets.supported()) return;
    await Assets.preload(spec);
  },
  flower(x, z) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6),
      this.mat([0xff8787, 0xffd43b, 0xb197fc, 0xff8fab][Math.floor(Math.random() * 4)]));
    f.position.set(x, 0.14, z); this.root.add(f);
  },
  /* 📔 원칙 카드 아이템 (점프 또는 클릭으로 획득) */
  addItem(x, y, z, id) {
    if (State.has(id)) return;                       // 이번 모험에서 이미 획득함
    const item = DATA.moralItems.find(i => i.id === id);
    if (!item) return;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.88, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xfab005 })));         // 금색 테두리
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.78, 0.07),
      new THREE.MeshBasicMaterial({ color: 0xfff9db })));         // 카드 몸체
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const cx = c.getContext('2d');
    cx.font = '84px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(item.icon, 64, 72);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.48),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    face.position.z = 0.045; g.add(face);
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.045; g.add(back);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.5 }));
    glow.position.y = -y + 0.04; g.add(glow);                     // 바닥 위치 표시
    g.position.set(x, y, z);
    g.userData = { itemId: id, baseY: y, got: false };
    this.root.add(g); this.items.push(g);
  },
  addPlatform(x, y, z, w, d, c = 0xff922b) {
    const p = this.box(w, 0.5, d, c, x, y - 0.25, z);
    const top = this.box(w, 0.12, d, 0xffe066, x, y + 0.02, z);
    this.platforms.push({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
      y, solidBelow: true,
    });
    return p;
  },
  addZone(x, z, r, label, onInteract, auto = false) {
    const zone = { x, z, r, label, onInteract, auto, used: false };
    this.zones.push(zone);
    return zone;   // 호출측에서 used=true로 비활성화 가능 (예: 떠난 NPC의 대화 존)
  },
  setBeacon(x, z) {
    this.clearBeacon();
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    g.position.set(x, 7, z);
    this.root.add(g); this.beacon = g;
  },
  clearBeacon() { if (this.beacon) { this.root.remove(this.beacon); this.beacon = null; } },

  addNPC(char, x, z, ry = 0) {
    char.group.position.set(x, 0, z);
    char.group.rotation.y = ry;
    this.root.add(char.group);
    this.npcs.push(char);
    return char;
  },
  removeNPC(char) {
    this.root.remove(char.group);
    this.npcs = this.npcs.filter(n => n !== char);
  },

  /* ───── 월드 전환 ───── */
  clear() {
    if (this.root) this.scene.remove(this.root);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.platforms = []; this.zones = []; this.npcs = [];
    this.items = []; this.obstacles = []; this.beacon = null;
  },

  async go(name, spawn) {
    await UI.fadeOut();
    await this.preloadProps(name);          // 씬 캐릭터 모델 프리로드 (캐시되면 즉시)
    this.build(name);
    Player.keys = {};                       // 전환 시 입력 상태 초기화 (키 끼임 방지)
    UI.joyVec.x = 0; UI.joyVec.y = 0;
    if (spawn) Player.setPos(spawn.x, spawn.y || 0, spawn.z, spawn.ry || 0);
    Player.snapCamera();
    await UI.fadeIn();
  },

  build(name) {
    this.clear();
    this.current = name;
    this['build_' + name]();
    this.applySky();
  },

  applySky() {
    const skies = {
      home: [0xfff3e0, 0xffe0b2], worldmap: [0x7ec8f5, 0x9be89b],
      classroom: [0xfff8e1, 0xffecb3], playground: [0x81d4fa, 0xffe082], hallway: [0xe3f2fd, 0xcfd8dc],
    };
    let [sky, gnd] = skies[this.current] || skies.worldmap;
    if (this.redMode && (this.current === 'worldmap' || this.current === 'home')) {
      sky = 0xe8a087; gnd = 0xc98f6f;   // 5단계: 약간 붉은 하늘
    }
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 40, 90);
    this._hemi.color.set(sky); this._hemi.groundColor.set(gnd);
  },

  /* ═══════ 집 (1-3 눈 뜨는 곳) ═══════ */
  build_home() {
    this.ground(10, 10, 0xd7b899);
    this.bounds = { minX: -4.2, maxX: 4.2, minZ: -4.2, maxZ: 4.2 };
    // 벽
    this.box(10, 3, 0.3, 0xfff3e0, 0, 1.5, -5);
    this.box(0.3, 3, 10, 0xfff3e0, -5, 1.5, 0);
    this.box(0.3, 3, 10, 0xfff3e0, 5, 1.5, 0);
    // 침대
    this.box(2, 0.5, 3.2, 0xef9a9a, -3.4, 0.3, -3);
    this.box(2, 0.3, 1, 0xffffff, -3.4, 0.65, -4);
    this.obstacles.push({ x: -3.4, z: -3, r: 1.6 });
    // 책상 + 의자
    this.box(2, 0.9, 1, 0x8d6e63, 3.6, 0.5, -3.5);
    this.box(0.7, 0.5, 0.7, 0xa1887f, 3.4, 0.25, -2.2);
    this.obstacles.push({ x: 3.6, z: -3.3, r: 1.2 });
    // 창문
    this.box(2.2, 1.4, 0.1, 0xbbdefb, 0, 1.8, -4.95);
    // 러그
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), this.mat(0x90caf9));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 0); this.root.add(rug);
    // 문 (밖으로)
    this.box(1.4, 2.4, 0.15, 0x795548, 0, 1.2, 5.05);
    this.addZone(0, 4.3, 1.6, '밖으로 나가기', () => Flow.onZone('home_exit'));
    this.setBeacon(0, 4.3);
  },

  /* ═══════ 월드맵 (마리오 감성) ═══════ */
  build_worldmap() {
    this.ground(90, 90, this.redMode ? 0x9e9d24 : 0x7ed67e);
    this.bounds = { minX: -38, maxX: 38, minZ: -38, maxZ: 38 };

    // 길 (집 → 학교)
    const road = new THREE.Mesh(new THREE.PlaneGeometry(5, 52), this.mat(0xd7ccc8));
    road.rotation.x = -Math.PI / 2; road.rotation.z = -Math.PI / 4;
    road.position.set(0, 0.02, 0); this.root.add(road);

    // 우리 집 — 기본 도형으로 만든 박스 버전
    this.box(5, 3, 4.5, 0xffcc80, -17, 1.5, 15);
    const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), this.mat(0xe64a19));
    roof1.position.set(-17, 4.1, 15); roof1.rotation.y = Math.PI / 4; roof1.castShadow = true; this.root.add(roof1);
    this.box(1.2, 2, 0.2, 0x6d4c41, -17, 1, 17.35); // 대문
    this.obstacles.push({ x: -17, z: 15, r: 3.4 });

    // 학교 — 기본 도형으로 만든 박스 버전
    this.box(14, 6, 6, 0xffe0b2, 17, 3, -18);
    this.box(2, 2.6, 0.3, 0x5d4037, 17, 1.3, -14.8);          // 정문
    for (let i = 0; i < 4; i++) {
      this.box(1.6, 1.4, 0.2, 0x90caf9, 11.5 + i * 3.7, 4.2, -14.9);  // 창문
    }
    this.box(3, 1.2, 0.4, 0xffffff, 17, 6.9, -15.2);
    this.box(0.15, 4, 0.15, 0x9e9e9e, 11, 8, -16);
    this.box(1.6, 1, 0.05, 0x42a5f5, 11.9, 9.4, -16);
    // 건물 벽에 붙는 작은 충돌원 4개 — 문 앞까지 걸어갈 수 있게
    [11, 15, 19, 23].forEach(x => this.obstacles.push({ x, z: -18, r: 3.4 }));
    this.addZone(17, -13.6, 3.0, '학교 들어가기', () => Flow.onZone('school_door'));

    // 마리오풍 점프 발판 + 로봇 3원칙 카드 (연구소 트럭이 떨어뜨림!)
    this.addPlatform(-6, 1.2, 6, 3, 3);
    this.addItem(-6, 2.4, 6, 'robot1');
    this.addPlatform(0, 1.4, 0.5, 3, 3, 0x4dabf7);
    this.addPlatform(1.5, 1.6, -4.5, 2.6, 2.6, 0x9775fa);
    this.addItem(1.5, 2.5, -4.5, 'robot2');
    this.addPlatform(9, 1.5, -8, 3, 3, 0x63e6be);
    this.addItem(9, 2.8, -8, 'robot3');

    // 나무 & 꽃 — 기본 도형 버전
    [[-28, -5], [-25, 22], [-8, 28], [12, 20], [25, 8], [28, -6], [-30, -25], [-12, -20], [3, 24], [30, 24]]
      .forEach(p => this.tree(p[0], p[1], 0.9 + Math.random() * 0.5));
    for (let i = 0; i < 26; i++) this.flower(-34 + Math.random() * 68, -34 + Math.random() * 68);

    // 울타리
    for (let i = -36; i <= 36; i += 4) {
      this.box(3.4, 0.8, 0.15, 0xbcaaa4, i, 0.4, -37);
      this.box(3.4, 0.8, 0.15, 0xbcaaa4, i, 0.4, 37);
      this.box(0.15, 0.8, 3.4, 0xbcaaa4, -37, 0.4, i);
      this.box(0.15, 0.8, 3.4, 0xbcaaa4, 37, 0.4, i);
    }
  },

  /* ═══════ 교실 ═══════ */
  build_classroom() {
    this.ground(16, 13, 0xd7b899);
    this.bounds = { minX: -7.2, maxX: 7.2, minZ: -5.6, maxZ: 5.6 };
    this.box(16, 3.6, 0.3, 0xfff8e1, 0, 1.8, -6.5);   // 앞 벽
    this.box(16, 0.9, 0.3, 0xffecb3, 0, 0.45, 6.5);   // 뒷 벽(카메라 쪽)은 낮게 — 교실이 훤히 보이도록
    this.box(0.3, 3.6, 13, 0xffecb3, -8, 1.8, 0);
    this.box(0.3, 3.6, 13, 0xffecb3, 8, 1.8, 0);

    // 칠판
    this.box(6.5, 2, 0.12, 0x2e5339, 0, 1.9, -6.35);
    this.box(7, 0.15, 0.2, 0x8d6e63, 0, 0.85, -6.3);
    // 교탁
    this.box(1.6, 1.0, 0.8, 0x8d6e63, -3.5, 0.5, -4.8);
    this.obstacles.push({ x: -3.5, z: -4.8, r: 1.0 });

    // 학생 책상 3열 x 4줄
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = -4.5 + c * 3, z = -2 + r * 2.6;
      this.box(1.5, 0.75, 0.8, 0xa1887f, x, 0.42, z);
      this.box(0.6, 0.45, 0.6, 0x8d6e63, x, 0.25, z + 0.85);
      this.obstacles.push({ x, z: z + 0.3, r: 1.0 });
    }
    // 창문
    for (let i = 0; i < 3; i++) this.box(0.12, 1.5, 2.4, 0xb3e5fc, -7.95, 2.1, -3.5 + i * 3.4);
    // 게시판 (앞 벽 옆으로 이동 — 낮은 뒷벽 위에 띄우지 않기)
    this.box(3.4, 1.6, 0.1, 0x80cbc4, 5.2, 2, -6.35);
    // 뒷문 (복도로) — 낮은 벽에 세워진 문틀
    this.box(1.3, 2.4, 0.15, 0x795548, 6, 1.2, 6.42);
    this.addZone(6, 5.2, 1.5, '복도로 나가기', () => Flow.onZone('class_to_hall'));
  },

  /* ═══════ 운동장 ═══════ */
  build_playground() {
    this.ground(60, 46, 0xdeb887);
    this.bounds = { minX: -27, maxX: 27, minZ: -20, maxZ: 20 };

    // 잔디 트랙 라인
    const line = new THREE.Mesh(new THREE.RingGeometry(11, 11.5, 48), this.mat(0xffffff));
    line.rotation.x = -Math.PI / 2; line.position.y = 0.02; this.root.add(line);

    // 학교 건물 배경
    this.box(26, 7, 4, 0xffe0b2, 0, 3.5, -22);
    for (let i = 0; i < 6; i++) this.box(2.4, 1.6, 0.2, 0x90caf9, -10 + i * 4, 4.4, -19.9);
    this.box(2, 2.6, 0.3, 0x5d4037, 0, 1.3, -19.9);
    this.addZone(0, -18.4, 2.0, '학교로 들어가기', () => Flow.onZone('pg_to_school'));

    // 티볼 배팅 티 + 베이스
    this.box(0.12, 0.9, 0.12, 0x455a64, 0, 0.45, 6);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16), this.mat(0xffffff));
    ball.position.set(0, 1.0, 6); this.root.add(ball);
    [[4, 2], [0, -2], [-4, 2]].forEach(p => this.box(0.9, 0.08, 0.9, 0xffffff, p[0], 0.05, p[1] + 2));
    this.box(1.1, 0.1, 1.1, 0xffd54f, 0, 0.05, 6.9);

    // 철봉 & 미끄럼틀
    this.box(0.12, 2, 0.12, 0x9e9e9e, -18, 1, 10);
    this.box(0.12, 2, 0.12, 0x9e9e9e, -15, 1, 10);
    this.box(3.2, 0.12, 0.12, 0xf44336, -16.5, 2, 10);
    const slide = this.box(1.2, 0.15, 4, 0x42a5f5, 18, 1.1, 10);
    slide.rotation.x = 0.5;
    this.box(1.4, 2.2, 1.4, 0xff9800, 18, 1.1, 12.2);
    this.obstacles.push({ x: 18, z: 11, r: 2 });

    // 나무 울타리
    for (let i = -26; i <= 26; i += 4) this.box(3.4, 0.8, 0.15, 0xbcaaa4, i, 0.4, 19.5);
    this.tree(-24, -14, 1.1); this.tree(24, -14, 1.1); this.tree(-24, 16, 0.9);
  },

  /* ═══════ 복도 ═══════ */
  build_hallway() {
    this.ground(34, 7, 0xcfd8dc);
    this.bounds = { minX: -16, maxX: 16, minZ: -2.8, maxZ: 2.8 };
    this.box(34, 3.4, 0.3, 0xeceff1, 0, 1.7, -3.5);
    this.box(34, 0.9, 0.3, 0xeceff1, 0, 0.45, 3.5);   // 카메라 쪽 벽은 낮게 — 복도가 훤히 보이도록
    this.box(0.3, 3.4, 7, 0xeceff1, -17, 1.7, 0);
    this.box(0.3, 3.4, 7, 0xeceff1, 17, 1.7, 0);

    // 창문 (운동장 쪽)
    for (let i = 0; i < 6; i++) this.box(3, 1.5, 0.12, 0xb3e5fc, -13 + i * 5.2, 2, -3.45);
    // 사물함
    for (let i = 0; i < 8; i++) this.box(1.5, 1.3, 0.5, i % 2 ? 0x90caf9 : 0x80cbc4, -12 + i * 3.4, 0.65, 3.1);
    // 교실 문들
    [-9, 0, 9].forEach(x => this.box(1.4, 2.4, 0.15, 0x795548, x, 1.2, 3.44));
    // 기둥 (노아가 숨는 곳)
    this.box(0.9, 3.4, 0.9, 0xb0bec5, 5, 1.7, -2.5);
    this.obstacles.push({ x: 5, z: -2.5, r: 0.9 });

    this.addZone(0, 2.2, 1.6, '교실로 들어가기', () => Flow.onZone('hall_to_class'));
  },

  /* ───── 매 프레임 갱신 ───── */
  update(dt) {
    const t = performance.now() / 1000;
    for (const it of this.items) {
      if (it.userData.got) continue;
      it.rotation.y += dt * 2;
      it.position.y = it.userData.baseY + Math.sin(t * 3 + it.userData.baseY) * 0.12;
    }
    for (const n of this.npcs) n.update(dt, false);
    if (this.beacon) {
      this.beacon.material.opacity = 0.25 + Math.sin(t * 3) * 0.12;
      this.beacon.rotation.y += dt;
    }
  },
};
