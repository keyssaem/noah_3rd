/* ═══════════ Player — 이동/점프/상호작용/카메라 ═══════════ */
const Player = {
  char: null, pos: new THREE.Vector3(), vy: 0, onGround: true,
  yaw: 0, enabled: false, keys: {},
  camTarget: new THREE.Vector3(), nearZone: null,
  SPEED: 7, JUMP: 8.2, GRAVITY: 22,

  init() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); if (this.enabled) this.tryJump(); }
      if (e.code === 'KeyF' && this.enabled) this.tryInteract();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  },

  spawnChar() {
    if (this.char) World.scene.remove(this.char.group);
    this.char = Chars.player(State.get('gender'));
    World.scene.add(this.char.group);
  },

  setPos(x, y, z, ry = 0) {
    this.pos.set(x, y, z);
    this.yaw = ry; this.vy = 0;
    if (this.char) {
      this.char.group.position.copy(this.pos);
      this.char.group.rotation.y = ry;
    }
  },

  tryJump() {
    if (!this.enabled || !this.onGround) return;
    this.vy = this.JUMP; this.onGround = false;
    Sound.jump();
  },

  tryInteract() {
    if (this.nearZone && this.nearZone.onInteract) {
      const z = this.nearZone;
      this.nearZone = null;
      UI.setPrompt(null);
      z.onInteract();
    }
  },

  /* 📔 원칙 카드 획득 처리 (점프 판정 / 클릭 공용) */
  collectItem(it) {
    if (it.userData.got) return;
    it.userData.got = true;
    it.visible = false;
    Sound.coin();
    Flow.onItemCollect(it.userData.itemId);
  },

  /* 태블릿·마우스 클릭으로도 카드 획득 가능 */
  initItemClick(canvas) {
    canvas.addEventListener('pointerdown', e => {
      if (!this.enabled || !World.items.length) return;
      const ndc = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      const rc = new THREE.Raycaster();
      rc.setFromCamera(ndc, World.camera);
      for (const it of World.items) {
        if (it.userData.got) continue;
        if (rc.intersectObject(it, true).length && this.pos.distanceTo(it.position) < 9) {
          this.collectItem(it);
          break;
        }
      }
    });
  },

  /* 현재 위치 기준 바닥 높이 (플랫폼 위 판정) */
  groundHeight() {
    let g = 0;
    for (const p of World.platforms) {
      if (this.pos.x >= p.minX - 0.25 && this.pos.x <= p.maxX + 0.25 &&
          this.pos.z >= p.minZ - 0.25 && this.pos.z <= p.maxZ + 0.25 &&
          this.pos.y >= p.y - 0.35) {
        g = Math.max(g, p.y);
      }
    }
    return g;
  },

  update(dt) {
    if (!this.char) return;

    let mx = 0, mz = 0;
    if (this.enabled) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) mz -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) mz += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) mx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) mx += 1;
      mx += UI.joyVec.x; mz += UI.joyVec.y;
    }
    const len = Math.hypot(mx, mz);
    const moving = len > 0.15;
    if (moving) {
      mx /= Math.max(len, 1); mz /= Math.max(len, 1);
      this.pos.x += mx * this.SPEED * dt;
      this.pos.z += mz * this.SPEED * dt;
      this.yaw = Math.atan2(mx, mz);
    }

    // 중력 & 점프
    const gh = this.groundHeight();
    this.vy -= this.GRAVITY * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= gh) { this.pos.y = gh; this.vy = 0; this.onGround = true; }
    else this.onGround = this.pos.y - gh < 0.02;

    // 경계 제한
    const b = World.bounds;
    if (b) {
      this.pos.x = Math.max(b.minX, Math.min(b.maxX, this.pos.x));
      this.pos.z = Math.max(b.minZ, Math.min(b.maxZ, this.pos.z));
    }
    // 장애물 밀어내기 (원형)
    for (const o of World.obstacles) {
      const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r + 0.35 && d > 0.001 && this.pos.y < 1.5) {
        const push = (o.r + 0.35 - d);
        this.pos.x += dx / d * push; this.pos.z += dz / d * push;
      }
    }

    // 📔 원칙 카드 획득 (몸 중심 기준으로 넉넉하게 판정)
    for (const it of World.items) {
      if (it.userData.got) continue;
      const dx = this.pos.x - it.position.x, dz = this.pos.z - it.position.z;
      const dy = (this.pos.y + 0.9) - it.position.y;   // 캐릭터 몸통 높이 보정
      if (Math.hypot(dx, dy, dz) < 1.3) this.collectItem(it);
    }

    // 상호작용 존 체크
    let near = null;
    for (const z of World.zones) {
      if (z.used) continue;
      if (Math.hypot(this.pos.x - z.x, this.pos.z - z.z) < z.r) { near = z; break; }
    }
    if (this.enabled && near !== this.nearZone) {
      this.nearZone = near;
      UI.setPrompt(near ? near.label : null);
      if (near && near.auto) { near.used = true; this.tryInteract(); }
    }
    if (!this.enabled && this.nearZone) { this.nearZone = null; UI.setPrompt(null); }

    // 캐릭터 반영 — 정지 상태에서 출발할 땐 즉시 방향 전환(피벗 잔동작 제거),
    // 이동 중 방향 전환은 빠른 회전(초당 18)으로 짧게
    this.char.group.position.copy(this.pos);
    let dy = this.yaw - this.char.group.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    if (moving && !this._wasMoving) this.char.group.rotation.y = this.yaw;
    else this.char.group.rotation.y += dy * Math.min(1, dt * 18);
    this._wasMoving = moving;
    this.char.update(dt, moving);

    // 카메라 — 포커스 락(연출)이 있으면 대상에 밀어 넣고, 없으면 3인칭 추적
    if (this.camLock) {
      World.camera.position.lerp(this.camLock.pos, Math.min(1, dt * this.camLock.speed));
      this._lookAt.lerp(this.camLock.look, Math.min(1, dt * this.camLock.speed));
      World.camera.lookAt(this._lookAt);
    } else {
      const camDist = World.current === 'worldmap' ? 11 : 8;
      const camH = World.current === 'worldmap' ? 7 : 5.5;
      this.camTarget.set(this.pos.x, this.pos.y + camH, this.pos.z + camDist);
      World.camera.position.lerp(this.camTarget, Math.min(1, dt * 4));
      this._lookAt.set(this.pos.x, this.pos.y + 1.2, this.pos.z);
      World.camera.lookAt(this._lookAt);
    }
  },

  snapCamera() {
    this.camLock = null;                     // 하드 리셋 시 연출 포커스 해제 (전환 누수 방지)
    const camDist = World.current === 'worldmap' ? 11 : 8;
    const camH = World.current === 'worldmap' ? 7 : 5.5;
    World.camera.position.set(this.pos.x, this.pos.y + camH, this.pos.z + camDist);
    this._lookAt.set(this.pos.x, this.pos.y + 1.2, this.pos.z);
    World.camera.lookAt(this._lookAt);
  },

  /* 🎥 연출용 카메라 포커스 — 대상(그룹)을 정면 가까이서 크게 잡기 */
  _lookAt: new THREE.Vector3(),
  focusOn(target, opts = {}) {
    const p = target.position, yaw = target.rotation.y;
    const dist = opts.dist != null ? opts.dist : 3.2;
    const h = opts.height != null ? opts.height : 1.5;
    const lookH = opts.lookH != null ? opts.lookH : 1.25;
    this.camLock = {
      pos: new THREE.Vector3(p.x + Math.sin(yaw) * dist, p.y + h, p.z + Math.cos(yaw) * dist),
      look: new THREE.Vector3(p.x, p.y + lookH, p.z),
      speed: opts.snap ? 100 : 3,
    };
  },
  clearFocus() { this.camLock = null; },
};
