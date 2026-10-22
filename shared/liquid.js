/* ============================================================
   SEYLUNE — LIQUID IMAGES (WebGL)
   Turns a box of <img> elements into one WebGL plane:
   - show(i) melts the current photograph into photograph i
     through a noise displacement, like silk settling
   - the cursor leaves a soft ripple wherever it moves
   The <img> elements stay in the page as the accessible, no-
   WebGL and reduced-motion version; the canvas only covers them.

   Usage:
     const liquid = SeyluneLiquid.create(box, { focus: [[.5,.2], …] });
     liquid.show(2);
   box holds the <img> elements (in order) and gets the canvas.
============================================================ */

const SeyluneLiquid = (() => {

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const VERTEX = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const FRAGMENT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTex0;
    uniform sampler2D uTex1;
    uniform vec2  uRes;
    uniform vec2  uImg0;
    uniform vec2  uImg1;
    uniform vec2  uFocus0;
    uniform vec2  uFocus1;
    uniform float uProgress;
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uHover;
    uniform float uZoom;

    // Simplex noise (Ashima Arts / Ian McEwan, MIT) + a few rotated octaves:
    // smooth, grid-free movement, like silk rather than pixels
    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m; m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
      for (int i = 0; i < 4; i++) { v += a * snoise(p); p = r * p * 2.03; a *= 0.5; }
      return v * 0.5 + 0.5;
    }

    // object-fit: cover, anchored on a focus point
    vec2 cover(vec2 uv, vec2 img, vec2 focus, float zoom) {
      float rs = uRes.x / uRes.y;
      float ri = img.x / img.y;
      vec2 scale = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
      scale /= zoom;
      return uv * scale + (1.0 - scale) * focus;
    }

    void main() {
      vec2 uv = vUv;

      // Cursor ripple: rings spreading out from the pointer, fading with distance
      vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
      vec2 toMouse = (uv - uMouse) * aspect;
      float dist = length(toMouse);
      float ring = sin(dist * 34.0 - uTime * 3.2) * exp(-dist * 5.5) * uHover;
      uv += normalize(toMouse + 1e-5) / aspect * ring * 0.006;

      // Transition displacement: noise pushes the outgoing photo one way
      // and pulls the incoming one in from the other
      float n = fbm(vUv * 2.2 + vec2(0.0, uTime * 0.03));
      vec2 disp = vec2(fbm(vUv * 1.8 + 7.3) - 0.5, n - 0.5);
      float p = uProgress;
      float curve = sin(p * 3.14159);

      vec2 uv0 = cover(uv + disp * p * 0.16, uImg0, uFocus0, uZoom + curve * 0.05);
      vec2 uv1 = cover(uv - disp * (1.0 - p) * 0.16, uImg1, uFocus1, uZoom + curve * 0.05);

      // The melt edge follows the noise, so the new photo seeps in rather than fades
      float edge = smoothstep(p * 1.5 - 0.5, p * 1.5, n * 0.75 + (1.0 - vUv.y) * 0.25);
      vec4 a = texture2D(uTex0, uv0);
      vec4 b = texture2D(uTex1, uv1);

      // A breath of colour separation while the silk moves
      float split = curve * 0.0025 + abs(ring) * 0.0015;
      a.r = texture2D(uTex0, uv0 + vec2(split, 0.0)).r;
      b.b = texture2D(uTex1, uv1 - vec2(split, 0.0)).b;

      gl_FragColor = mix(b, a, edge);
    }`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Seylune liquid shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function loadImage(img) {
    return new Promise(resolve => {
      const src = img.currentSrc || img.src;
      const image = new Image();
      image.decoding = "async";
      // Photos uploaded to Supabase Storage live on another domain; WebGL may
      // only read them when they are fetched with CORS
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  function create(box, options = {}) {
    const imgs = Array.from(box.querySelectorAll("img"));
    const focus = options.focus || [];
    const state = {
      index: 0, progress: 0, hover: 0, hoverTarget: 0,
      mouse: [0.5, 0.5], mouseTarget: [0.5, 0.5],
      zoom: options.zoom || 1, running: false, active: true, raf: 0, start: performance.now(),
      transition: null
    };
    const api = { show, setActive, el: box, ready: false, get index() { return state.index; } };

    // Without WebGL (or with reduced motion) the plain images do the work
    function fallbackShow(i) {
      imgs.forEach((img, k) => img.classList.toggle("is-current", k === i));
      state.index = i;
    }
    fallbackShow(0);

    if (reduced) { api.show = fallbackShow; return api; }

    const canvas = document.createElement("canvas");
    canvas.className = "liquid-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) { api.show = fallbackShow; return api; }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) { api.show = fallbackShow; return api; }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = name => gl.getUniformLocation(program, name);
    const U = {
      tex0: u("uTex0"), tex1: u("uTex1"), res: u("uRes"), img0: u("uImg0"), img1: u("uImg1"),
      focus0: u("uFocus0"), focus1: u("uFocus1"), progress: u("uProgress"), time: u("uTime"),
      mouse: u("uMouse"), hover: u("uHover"), zoom: u("uZoom")
    };
    gl.uniform1i(U.tex0, 0);
    gl.uniform1i(U.tex1, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const textures = [];
    const sizes = [];

    function makeTexture(image) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return tex;
    }

    function bind(from, to) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[from]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[to]);
      gl.uniform2fv(U.img0, sizes[from]);
      gl.uniform2fv(U.img1, sizes[to]);
      // Focus points are given like CSS (y = 0 at the top); WebGL counts from the bottom
      const f0 = focus[from] || [0.5, 0.5], f1 = focus[to] || [0.5, 0.5];
      gl.uniform2f(U.focus0, f0[0], 1 - f0[1]);
      gl.uniform2f(U.focus1, f1[0], 1 - f1[1]);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(box.clientWidth * dpr));
      const h = Math.max(1, Math.round(box.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.res, w, h);
    }

    function frame(now) {
      state.raf = 0;
      if (!state.running) return;
      const ease = 0.08;
      state.hover += (state.hoverTarget - state.hover) * ease;
      state.mouse[0] += (state.mouseTarget[0] - state.mouse[0]) * 0.12;
      state.mouse[1] += (state.mouseTarget[1] - state.mouse[1]) * 0.12;

      const t = state.transition;
      if (t) {
        const k = Math.min(1, (now - t.start) / t.duration);
        state.progress = 1 - Math.pow(1 - k, 3);   // ease-out cubic
        if (k >= 1) {
          state.index = t.to;
          state.progress = 0;
          state.transition = null;
          bind(state.index, state.index);
          if (t.done) t.done();
        }
      }

      resize();
      gl.uniform1f(U.progress, state.progress);
      gl.uniform1f(U.time, (now - state.start) / 1000);
      gl.uniform2fv(U.mouse, state.mouse);
      gl.uniform1f(U.hover, state.hover);
      gl.uniform1f(U.zoom, state.zoom);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Keep drawing only while something is moving or the cursor is over it
      const idle = !state.transition && state.hover < 0.002 && state.hoverTarget === 0;
      if (!idle && state.active) state.raf = requestAnimationFrame(frame);
      else state.running = false;
    }

    function wake() {
      if (!api.ready) return;
      state.running = true;
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    }

    /* Photos load one at a time, when they are about to be shown,
       instead of every photo in the frame at once. */
    const loading = [];
    function ensure(i) {
      if (!loading[i]) {
        loading[i] = loadImage(imgs[i]).then(image => {
          if (!image) return false;
          textures[i] = makeTexture(image);
          sizes[i] = [image.naturalWidth, image.naturalHeight];
          return true;
        });
      }
      return loading[i];
    }

    let wanted = 0;
    function show(i, duration = 1400) {
      i = (i + imgs.length) % imgs.length;
      if (!api.ready) { fallbackShow(i); return; }
      wanted = i;
      if (!textures[i]) {
        // fetch it first; by then the visitor may have pointed elsewhere
        ensure(i).then(ok => { if (ok && wanted === i) show(i, duration); });
        return;
      }
      if (i === state.index && !state.transition) return;
      const from = state.transition ? state.transition.to : state.index;
      if (state.transition) { state.index = from; }
      state.transition = { to: i, start: performance.now(), duration };
      bind(from, i);
      imgs.forEach((img, k) => img.classList.toggle("is-current", k === i));
      wake();
      // get the next one ready while this one plays
      if (imgs.length > 1) setTimeout(() => ensure((i + 1) % imgs.length), duration);
    }

    // Scenes that are off screen stop drawing entirely
    function setActive(on) {
      state.active = on;
      if (on) { state.hoverTarget = 0; wake(); }
    }

    box.addEventListener("pointermove", e => {
      const r = box.getBoundingClientRect();
      state.mouseTarget = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      state.hoverTarget = e.pointerType === "touch" ? 0.6 : 1;
      wake();
    });
    box.addEventListener("pointerleave", () => { state.hoverTarget = 0; wake(); });

    // Start with the photo showing now; the rest follow when needed
    const first = state.index;
    ensure(first).then(ok => {
      if (!ok) return;   // keep the plain images
      // the page may have moved on to another photo while this one loaded
      const now = state.index;
      state.index = first;
      box.appendChild(canvas);
      api.ready = true;
      bind(first, first);
      resize();
      box.classList.add("is-liquid");
      state.running = true;
      state.raf = requestAnimationFrame(frame);
      if (now !== first) show(now, 10);
      else if (imgs.length > 1) setTimeout(() => ensure((first + 1) % imgs.length), 1500);
      if (options.onReady) options.onReady(api);
    });

    window.addEventListener("resize", () => { if (api.ready) { resize(); wake(); } });
    return api;
  }

  return { create, reduced };
})();
