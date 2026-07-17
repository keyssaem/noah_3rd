/* ═══════════ World — Three.js 씬 & 공간(집/월드맵/교실/운동장/복도) ═══════════ */
const World = {
  renderer: null, scene: null, camera: null,
  root: null, current: '',
  platforms: [], bounds: null, zones: [], npcs: [], items: [], obstacles: [],
  beacon: null, redMode: false,
  _hemi: null, _sun: null,

  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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

  /* ───── 🏘️ 켄니 판타지 타운 키트 (배경 디자인 패치 — 실패 시 박스 폴백) ─────
     부품 규격: 타일 1×1, 벽은 자기 타일의 +x 모서리에 붙는 패널(회전으로 방향 지정) */
  KIT_PIECES: ['k_wall', 'k_door', 'k_winS', 'k_winG', 'k_gable', 'k_gtop', 'k_hgable', 'k_hgtop',
    'k_tree', 'k_treeH', 'k_treeR', 'k_treeC', 'k_banner', 'k_lantern', 'k_chimney', 'k_fence',
    'k_timberX', 'k_timberD', 'k_winRound', 'k_archTop', 'k_doorRound', 'k_hleft', 'k_hright'],
  PRELOAD: {                          // 씬별 미리 받을 모델 ('KIT' = 켄니 배경 부품 묶음)
    worldmap: 'KIT',
    classroom: ['teacher'],
    playground: ['teacher'],
    hallway: ['teacher'],               // 복도2에 선생님 등장
  },

  async preloadProps(name) {
    const spec = this.PRELOAD[name];
    if (!spec) return;
    if (typeof Assets === 'undefined' || !Assets.supported()) return;
    if (spec !== 'KIT') { await Assets.preload(spec); return; }
    await Assets.preload(this.KIT_PIECES);
    // 재질을 Lambert로 통일 (기존 씬 톤 + 구형 기기 성능) — 캐시당 1회
    for (const n of this.KIT_PIECES) {
      const g = Assets._cache[n];
      if (!g || g._lambert) continue;
      g._lambert = true;
      g.scene.traverse(o => {
        if (o.isMesh && o.material && o.material.isMeshStandardMaterial)
          o.material = new THREE.MeshLambertMaterial({ map: o.material.map || null, color: o.material.color });
      });
    }
  },
  kitReady() { return false; },   // 켄니 GLB 비활성 → 박스 폴백 강제 (태블릿 GLB 깨짐 대응)

  /* 키트 부품 1개를 부모 그룹의 타일 좌표에 배치 (sc: 스칼라 또는 [x,y,z] 스케일) */
  piece(parent, name, x, y, z, ry = 0, sc = null) {
    const inst = Assets.instance(name);
    if (!inst) return null;
    inst.scene.position.set(x, y, z);
    inst.scene.rotation.y = ry;
    if (sc != null) Array.isArray(sc) ? inst.scene.scale.set(sc[0], sc[1], sc[2]) : inst.scene.scale.setScalar(sc);
    inst.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    parent.add(inst.scene);
    return inst.scene;
  },

  /* 🏠 빨간 지붕 오두막 (3타일 길이 · 문은 그룹의 +z 방향) */
  kitHouse(cx, cz, s = 2.2, ry = -Math.PI / 2) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz); g.rotation.y = ry; g.scale.setScalar(s);
    const P = (n, x, y, z, r) => this.piece(g, n, x, y, z, r || 0);
    // 정면(+x): 창 · 문 · 창  /  뒷면 · 양끝: 벽
    P('k_winS', 0, 0, -1); P('k_door', 0, 0, 0); P('k_winS', 0, 0, 1);
    P('k_wall', 0, 0, -1, Math.PI); P('k_wall', 0, 0, 0, Math.PI); P('k_wall', 0, 0, 1, Math.PI);
    P('k_wall', 0, 0, -1, Math.PI / 2); P('k_wall', 0, 0, 1, -Math.PI / 2);
    // A자 지붕: 게이블 끝 + 능선 + 게이블 끝(반전) — 🔴 high 세트가 샘플의 빨간 지붕 (low는 초록)
    P('k_hgable', 0, 1, -1); P('k_hgtop', 0, 1, 0); P('k_hgable', 0, 1, 1, Math.PI);
    P('k_chimney', 0, 1.45, 0.3);
    P('k_lantern', 0.85, 0, 1.05);
    this.root.add(g);
    return g;
  },

  /* 🏫 학교 = 랜드마크 회관 (목재 골조 튜더식 + 아치 대문 + 둥근창 + 중앙 큰 게이블)
     집(석조 오두막)과 확실히 구분되도록 벽 재질·형태·규모를 전부 다르게 */
  kitSchool(cx, cz, s = 2.5, ry = -Math.PI / 2) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz); g.rotation.y = ry; g.scale.setScalar(s);
    const P = (n, x, y, z, r, sc) => this.piece(g, n, x, y, z, r || 0, sc);

    // ── 정면 파사드 (local +x) : 목재 골조 벽 + 아치 대문 + 둥근 창 (2층) ──
    for (let z = -2; z <= 2; z++) {
      // 1층: 중앙 아치 대문 / 그 옆 둥근창 / 끝 목재벽
      P(z === 0 ? 'k_doorRound' : (Math.abs(z) === 1 ? 'k_winRound' : 'k_timberX'), 0, 0, z);
      // 2층: 중앙·안쪽 둥근창 / 끝 대각 골조
      P(Math.abs(z) <= 1 ? 'k_winRound' : 'k_timberD', 0, 1, z);
      // 뒷벽(–x) 1·2층
      P('k_wall', 0, 0, z, Math.PI); P('k_wall', 0, 1, z, Math.PI);
    }
    // 양 끝벽 (±z 캡)
    P('k_wall', 0, 0, -2, Math.PI / 2); P('k_wall', 0, 1, -2, Math.PI / 2);
    P('k_wall', 0, 0, 2, -Math.PI / 2); P('k_wall', 0, 1, 2, -Math.PI / 2);

    // ── 양쪽 날개 지붕 (2층 위, 낮게 눕는 지붕) ──
    for (let z = -2; z <= 2; z++) {
      if (z === 0) continue;
      P('k_hgtop', 0, 2, z);
    }

    // ── 중앙 타워: 3층 + 정면을 향한 '하나의 큰 게이블' (넓고 높게) ──
    P('k_timberX', 0, 2, 0);                         // 중앙 3층 정면
    P('k_wall', 0, 2, 0, Math.PI);                   // 중앙 3층 뒷면
    P('k_hgable', 0, 3, 0, 0, [1.9, 1.15, 1.0]);     // ★ 큰 정면 게이블 (가로로 넓게)
    P('k_banner', 0.12, 2, 0);                       // 게이블 아래 빨간 배너
    P('k_chimney', 0, 2.05, -1.6);                   // 굴뚝

    P('k_lantern', 0.95, 0, -2.4); P('k_lantern', 0.95, 0, 2.4);   // 정문 양옆 가로등
    this.root.add(g);
    return g;
  },

  /* 🌳 키트 나무 (4종 랜덤 · 미로드 시 기존 콘 나무 폴백) */
  kitTree(x, z, s = 1) {
    const kinds = ['k_tree', 'k_treeH', 'k_treeR', 'k_treeC'];
    const inst = Assets.instance(kinds[Math.floor(Math.random() * kinds.length)]);
    if (!inst) return this.tree(x, z, s);
    inst.scene.position.set(x, 0, z);
    inst.scene.rotation.y = Math.random() * Math.PI * 2;
    inst.scene.scale.setScalar(1.7 * s);
    inst.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.root.add(inst.scene);
    this.obstacles.push({ x, z, r: 0.8 * s });
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
    this.platforms.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y });
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
    await this.preloadProps(name);          // 🏘️ 씬 배경 부품 프리로드 (캐시되면 즉시)
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

    // 우리 집 — 🏘️ 켄니 오두막 (키트 미로드 시 기존 박스 폴백)
    if (this.kitReady()) {
      this.kitHouse(-17, 15);
      [[-19.2, 15], [-17, 15], [-14.8, 15]].forEach(p => this.obstacles.push({ x: p[0], z: p[1], r: 1.5 }));
    } else {
      this.box(5, 3, 4.5, 0xffcc80, -17, 1.5, 15);
      const roof1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), this.mat(0xe64a19));
      roof1.position.set(-17, 4.1, 15); roof1.rotation.y = Math.PI / 4; roof1.castShadow = true; this.root.add(roof1);
      this.box(1.2, 2, 0.2, 0x6d4c41, -17, 1, 17.35); // 대문
      this.obstacles.push({ x: -17, z: 15, r: 3.4 });
    }

    // 학교 — 🏫 켄니 2층 건물 (키트 미로드 시 기존 박스 폴백)
    if (this.kitReady()) {
      this.kitSchool(17, -18);
      // 건물 라인 충돌원 (문 통로만 비움) + 문 뒤 통과 방지
      [[11.5, -18], [14.2, -18], [19.8, -18], [22.5, -18]].forEach(p => this.obstacles.push({ x: p[0], z: p[1], r: 1.8 }));
      this.obstacles.push({ x: 17, z: -19.4, r: 1.8 });
    } else {
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
    }
    this.addZone(17, -13.6, 3.0, '학교 들어가기', () => Flow.onZone('school_door'));

    // 마리오풍 점프 발판 + 로봇 3원칙 카드 (연구소 트럭이 떨어뜨림!)
    this.addPlatform(-6, 1.2, 6, 3, 3);
    this.addItem(-6, 2.4, 6, 'robot1');
    this.addPlatform(0, 1.4, 0.5, 3, 3, 0x4dabf7);
    this.addPlatform(1.5, 1.6, -4.5, 2.6, 2.6, 0x9775fa);
    this.addItem(1.5, 2.5, -4.5, 'robot2');
    this.addPlatform(9, 1.5, -8, 3, 3, 0x63e6be);
    this.addItem(9, 2.8, -8, 'robot3');

    // 나무 & 꽃 — 🌳 켄니 나무 4종 랜덤 (미로드 시 콘 나무 폴백)
    [[-28, -5], [-25, 22], [-8, 28], [12, 20], [25, 8], [28, -6], [-30, -25], [-12, -20], [3, 24], [30, 24]]
      .forEach(p => this.kitReady()
        ? this.kitTree(p[0], p[1], 0.9 + Math.random() * 0.5)
        : this.tree(p[0], p[1], 0.9 + Math.random() * 0.5));
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
