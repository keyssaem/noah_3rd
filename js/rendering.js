/* ═══════════ Rendering — WebGL 렌더러 생성/컨텍스트 수명 관리 ═══════════ */
const Rendering = {
  _bindings: new WeakMap(),

  create(options, label = '3D 화면') {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer(options);
    } catch (cause) {
      const error = new Error(`${label}의 WebGL 렌더러를 만들 수 없습니다.`);
      error.name = 'WebGLUnavailableError';
      error.cause = cause;
      throw error;
    }

    const canvas = renderer.domElement;
    const onLost = event => {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('app:webgl-lost', {
        detail: { label, canvas },
      }));
    };
    const onRestored = () => {
      window.dispatchEvent(new CustomEvent('app:webgl-restored', {
        detail: { label, canvas },
      }));
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);
    this._bindings.set(renderer, { canvas, onLost, onRestored });
    return renderer;
  },

  dispose(renderer) {
    if (!renderer) return;
    const binding = this._bindings.get(renderer);
    if (binding) {
      binding.canvas.removeEventListener('webglcontextlost', binding.onLost, false);
      binding.canvas.removeEventListener('webglcontextrestored', binding.onRestored, false);
      this._bindings.delete(renderer);
    }
    renderer.dispose();
    if (typeof renderer.forceContextLoss === 'function') renderer.forceContextLoss();
  },

  previewFallback(canvas, message = '3D 미리보기를 표시할 수 없습니다.') {
    canvas.classList.add('webgl-preview-unavailable');
    const fallback = document.createElement('div');
    fallback.className = 'webgl-preview-fallback';
    fallback.textContent = message;
    canvas.insertAdjacentElement('afterend', fallback);
    return () => {
      canvas.classList.remove('webgl-preview-unavailable');
      fallback.remove();
    };
  },
};
