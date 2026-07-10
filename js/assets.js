/* ═══════════ Assets — GLB 모델 지연 로드 & 캐시 (P3 캐릭터) ═══════════
   - 무빌드 유지: three r147 examples/js의 전역 THREE.GLTFLoader / THREE.SkeletonUtils 사용
   - preload로 gltf를 캐시 → instance()가 SkeletonUtils로 복제(스킨 메시 안전 복제)
   - 로드 실패해도 던지지 않음: 호출측이 박스 캐릭터로 폴백 (구형기기 안정성 우선) */
const Assets = {
  MODELS: {
    playerM:  'media/glb/player_boy.glb',
    playerF:  'media/glb/player_girl.glb',
    teacher:  'media/glb/teacher.glb',
    friendM:  'media/glb/friend_boy.glb',
    friendF:  'media/glb/friend_girl.glb',
    noahHuman:'media/glb/noah_human.glb',
    noahAnimal:'media/glb/noah_animal.glb',
    noahCar:  'media/glb/noah_car.glb',
  },

  _cache: {},          // name → gltf (scene + animations)
  _loader: null,
  supported() { return !!(window.THREE && THREE.GLTFLoader); },

  _getLoader() {
    if (!this._loader && this.supported()) this._loader = new THREE.GLTFLoader();
    return this._loader;
  },

  _lastError: '',

  /* 단일 GLB 로드 → gltf (실패 시 null, 원인은 _lastError에 저장) */
  loadOne(name, onProgress) {
    return new Promise(resolve => {
      if (this._cache[name]) return resolve(this._cache[name]);
      const loader = this._getLoader();
      const url = this.MODELS[name];
      if (!loader) { this._lastError = 'no-loader'; return resolve(null); }
      if (!url) { this._lastError = 'unknown-name'; return resolve(null); }
      loader.load(url,
        gltf => { this._stripRootMotion(gltf); this._cache[name] = gltf; resolve(gltf); },
        xhr => { if (onProgress && xhr.total) onProgress(xhr.loaded / xhr.total); },
        err => { this._lastError = String(err && (err.message || err)) || 'load-error'; resolve(null); });
    });
  },

  /* 🦶 root motion 제거 — Root/Hip 계열 position 트랙의 x/z를 "모델 원위치(rest)"에 고정.
     (Tripo 걷기 클립은 실제로 전진하는 클립이라, 이동을 Player가 담당하는 이 게임에선
      미끄러짐 + 루프마다 순간이동이 생긴다. y는 보존해 들썩임은 유지.
      ⚠ 기준을 클립별 첫 프레임이 아니라 rest로 통일해야 대기↔걷기 블렌딩 때 몸이 안 밀림) */
  _stripRootMotion(gltf) {
    const RE = /^(Root|Armature|Hip|Waist|Pelvis)\.position$/;
    for (const clip of gltf.animations || []) {
      for (const tr of clip.tracks) {
        if (!RE.test(tr.name)) continue;
        const node = gltf.scene.getObjectByName(tr.name.split('.')[0]);
        const rx = node ? node.position.x : tr.values[0];
        const rz = node ? node.position.z : tr.values[2];
        const v = tr.values;
        for (let i = 0; i < v.length; i += 3) { v[i] = rx; v[i + 2] = rz; }
      }
    }
  },

  /* 🧭 모델 정면 자동 감지 — 허벅지 L/R로 좌우축을 구해 전방 벡터 계산.
     반환: +Z(게임 정면 기준) 대비 편차 각(rad). 리그 없으면 0 */
  frontOffset(scene) {
    let L = null, R = null;
    scene.traverse(o => {
      if (o.name === 'L_Thigh') L = o;
      else if (o.name === 'R_Thigh') R = o;
    });
    if (!L || !R) return 0;
    scene.updateMatrixWorld(true);
    const lp = new THREE.Vector3(), rp = new THREE.Vector3();
    L.getWorldPosition(lp); R.getWorldPosition(rp);
    const left = lp.sub(rp).setY(0);
    if (left.lengthSq() < 1e-8) return 0;
    left.normalize();
    const fwd = new THREE.Vector3().crossVectors(left, new THREE.Vector3(0, 1, 0));
    return Math.atan2(fwd.x, fwd.z);
  },

  /* 실패 원인을 사람이 읽을 수 있는 안내로 (뷰어용) */
  failHint() {
    if (location.protocol === 'file:')
      return '⚠ 파일을 직접 열었어요(file://). 3D 모델은 로컬 서버로 실행해야 보여요 — 폴더에서 "npx http-server -p 8347" 실행 후 localhost:8347 접속!';
    if (!this.supported())
      return '⚠ GLTF 로더를 못 불러왔어요. 인터넷 연결을 확인하고, 브라우저를 강력 새로고침(Ctrl+Shift+R) 해보세요.';
    return '⚠ 모델 파일을 불러오지 못했어요 (' + (this._lastError || '알 수 없음') + '). media/glb 폴더와 파일명을 확인하세요.';
  },

  /* 여러 GLB를 진행바와 함께 로드 → 성공 개수 반환 (전체 실패해도 게임은 진행) */
  async preload(names, onProgress) {
    let done = 0, ok = 0;
    for (const n of names) {
      const g = await this.loadOne(n, p => onProgress && onProgress((done + p) / names.length));
      if (g) ok++;
      done++;
      if (onProgress) onProgress(done / names.length);
    }
    return ok;
  },

  isLoaded(name) { return !!this._cache[name]; },

  /* 진행바 오버레이와 함께 프리로드 (mp-load 스타일 재사용) → 성공 개수 */
  async preloadWithBar(names, title = '캐릭터를 불러오는 중...') {
    if (!this.supported()) return 0;
    if (names.every(n => this.isLoaded(n))) return names.length;   // 이미 캐시됨
    const ov = UI.overlay(`
      <div class="ov-panel mp-load">
        <h3>🎨 ${title}</h3>
        <div class="mp-bar"><div class="mp-fill"></div></div>
        <p class="mp-status">3D 모델을 준비하고 있어요...</p>
      </div>`);
    const fill = ov.querySelector('.mp-fill');
    const ok = await this.preload(names, p => { fill.style.width = Math.round(p * 100) + '%'; });
    await UI.wait(200);
    UI.close(ov);
    return ok;
  },

  /* 캐시된 gltf에서 인스턴스 복제 → { scene, animations } (없으면 null) */
  instance(name) {
    const gltf = this._cache[name];
    if (!gltf) return null;
    const scene = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone)
      ? THREE.SkeletonUtils.clone(gltf.scene)
      : gltf.scene.clone(true);
    return { scene, animations: gltf.animations || [] };
  },

  /* 모델 정규화: 발이 y=0, 중앙 정렬, 목표 키에 맞춰 스케일. 정보 반환 */
  normalize(obj3d, targetHeight = 1.7) {
    const box = new THREE.Box3().setFromObject(obj3d);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    const h = size.y || 1;
    const s = targetHeight / h;
    obj3d.scale.setScalar(s);
    // 재계산 후 바닥/중앙 정렬
    const box2 = new THREE.Box3().setFromObject(obj3d);
    obj3d.position.x -= (box2.min.x + box2.max.x) / 2;
    obj3d.position.z -= (box2.min.z + box2.max.z) / 2;
    obj3d.position.y -= box2.min.y;
    return { scale: s, rawHeight: h, size };
  },
};
