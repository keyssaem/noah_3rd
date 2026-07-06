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

  /* 프리셋 */
  player(gender) {
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

  /* ───── 노아 (human / animal / car) ───── */
  noah(design) {
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
