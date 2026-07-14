/* =========================================================
   NOVA — Defy Gravity
   app.js

   Architecture note:
   The brief specifies a real photographed image sequence at
   assets/frames/0001.webp … NNNN.webp, drawn to a <canvas> on
   scroll via GSAP ScrollTrigger. That photography doesn't exist
   in this build, so RIG.mode auto-detects it at load time:

     - If assets/frames/0001.webp (etc) are present -> "sequence"
       mode: frames are preloaded and blitted to the canvas
       exactly as specified, indexed by scroll progress.

     - If not found -> "procedural" mode: a vector camera rig
       (still canvas-drawn, still 100% scroll-driven, never
       autoplaying) fakes the orbit/zoom/tilt with an illustrated
       shoe, volumetric light and floating debris.

   Drop real frames into assets/frames/ and reload to switch
   modes automatically — no other code changes required.
========================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG
  --------------------------------------------------------- */
  const RIG = {
    totalFrames: 180,          // virtual shot count for the readout
    framePad: 4,
    frameDir: 'assets/frames/',
    frameExt: '.webp',
    mode: 'procedural',        // 'sequence' | 'procedural' — resolved on preload
    frames: [],
    progress: 0,
    color: 'black',
  };

  const COLORS = {
    black: { a: '#2a2a2e', b: '#101012', accent: '#4a4a52', glow: 'rgba(120,120,130,0.35)' },
    white: { a: '#f3f1ea', b: '#c9c4b8', accent: '#ffffff', glow: 'rgba(255,255,255,0.4)' },
    red:   { a: '#e8442f', b: '#5c150c', accent: '#ff6b4d', glow: 'rgba(232,68,47,0.4)' },
    blue:  { a: '#3f7cf0', b: '#0c1c47', accent: '#7fb0ff', glow: 'rgba(63,124,240,0.4)' },
  };

  // Camera keyframes across the scroll timeline. Every value between
  // keyframes is interpolated, so each rendered frame continues smoothly
  // from the last — no jump cuts.
  const SHOTS = [
    { t: 0.00, rotY: -0.55, rotX: 0.06,  zoom: 0.86, y: 0.02, glow: 0.55 }, // wide establishing
    { t: 0.22, rotY: -0.10, rotX: -0.10, zoom: 1.02, y: -0.04, glow: 0.75 }, // orbit toward front
    { t: 0.45, rotY: 0.45,  rotX: 0.18,  zoom: 1.18, y: 0.03, glow: 0.9 },  // close-up, sole hint
    { t: 0.68, rotY: 0.95,  rotX: -0.05, zoom: 1.05, y: -0.02, glow: 0.7 }, // orbit past profile
    { t: 1.00, rotY: 1.35,  rotX: 0.04,  zoom: 1.28, y: 0.0,  glow: 1.0 },  // final hero reveal
  ];

  const state = {
    ready: false,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    mouse: { x: 0, y: 0, nx: 0, ny: 0 },
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  };

  /* ---------------------------------------------------------
     UTILITIES
  --------------------------------------------------------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pad = (n, len) => String(n).padStart(len, '0');

  function getShot(progress) {
    const p = clamp(progress, 0, 1);
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1].t) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const span = (p - a.t) / (b.t - a.t || 1);
    const t = clamp(span, 0, 1);
    return {
      rotY: lerp(a.rotY, b.rotY, t),
      rotX: lerp(a.rotX, b.rotX, t),
      zoom: lerp(a.zoom, b.zoom, t),
      y: lerp(a.y, b.y, t),
      glow: lerp(a.glow, b.glow, t),
    };
  }

  /* ---------------------------------------------------------
     LOADER
  --------------------------------------------------------- */
  const loaderEl = document.getElementById('loader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPct = document.getElementById('loaderPct');

  function setLoaderProgress(pct) {
    loaderFill.style.width = pct + '%';
    loaderPct.textContent = Math.round(pct);
  }

  function probeFrameSequence() {
    return new Promise((resolve) => {
      const test = new Image();
      const url = `${RIG.frameDir}${pad(1, RIG.framePad)}${RIG.frameExt}`;
      const timeout = setTimeout(() => resolve(false), 1500);
      test.onload = () => { clearTimeout(timeout); resolve(true); };
      test.onerror = () => { clearTimeout(timeout); resolve(false); };
      test.src = url;
    });
  }

  function preloadSequence() {
    return new Promise((resolve) => {
      let loaded = 0;
      const frames = new Array(RIG.totalFrames);
      for (let i = 1; i <= RIG.totalFrames; i++) {
        const img = new Image();
        img.onload = img.onerror = () => {
          loaded++;
          setLoaderProgress((loaded / RIG.totalFrames) * 100);
          if (loaded === RIG.totalFrames) resolve(frames);
        };
        img.src = `${RIG.frameDir}${pad(i, RIG.framePad)}${RIG.frameExt}`;
        frames[i - 1] = img;
      }
    });
  }

  function fakeProceduralLoad() {
    return new Promise((resolve) => {
      let pct = 0;
      const tick = () => {
        pct += (100 - pct) * 0.14 + 1.4;
        pct = Math.min(pct, 100);
        setLoaderProgress(pct);
        if (pct >= 100) { resolve(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function boot() {
    const hasSequence = await probeFrameSequence();
    if (hasSequence) {
      RIG.mode = 'sequence';
      RIG.frames = await preloadSequence();
    } else {
      RIG.mode = 'procedural';
      await fakeProceduralLoad();
    }
    state.ready = true;
    document.body.classList.add('is-loaded');
    document.getElementById('frameTotal').textContent = RIG.totalFrames;
    initReveal();
    initScrollRig();
  }

  /* ---------------------------------------------------------
     SMOOTH SCROLL (Lenis) + GSAP TICKER SYNC
  --------------------------------------------------------- */
  gsap.registerPlugin(ScrollTrigger);

  let lenis = null;
  if (!state.reducedMotion) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     NAVBAR
  --------------------------------------------------------- */
  const navEl = document.getElementById('nav');
  ScrollTrigger.create({
    start: 60,
    end: 99999,
    onUpdate: (self) => navEl.classList.toggle('is-scrolled', self.scroll() > 40),
  });

  const burger = document.getElementById('navBurger');
  burger.addEventListener('click', () => {
    const expanded = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!expanded));
    document.querySelector('.nav__links').style.display = expanded ? '' : 'flex';
  });

  /* ---------------------------------------------------------
     TEXT / CARD REVEAL (on load, once)
  --------------------------------------------------------- */
  function initReveal() {
    const tl = gsap.timeline({ delay: 0.15 });
    tl.to('[data-reveal]', {
      opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09,
    }).to('[data-reveal-up]', {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07,
    }, '-=0.6');
  }

  /* ---------------------------------------------------------
     SCROLL-DRIVEN CAMERA RIG
  --------------------------------------------------------- */
  function initScrollRig() {
    const pinEl = document.getElementById('heroPin');
    const frameCurrentEl = document.getElementById('frameCurrent');

    ScrollTrigger.create({
      trigger: pinEl,
      start: 'top top',
      end: () => `+=${window.innerHeight * 4}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: (self) => {
        RIG.progress = self.progress;
        const frameNum = clamp(Math.round(self.progress * (RIG.totalFrames - 1)) + 1, 1, RIG.totalFrames);
        frameCurrentEl.textContent = pad(frameNum, 3);
        renderFrame(self.progress);
      },
    });

    renderFrame(0);
  }

  /* ---------------------------------------------------------
     CANVAS RENDERER
  --------------------------------------------------------- */
  const shoeCanvas = document.getElementById('shoeCanvas');
  const fxCanvas = document.getElementById('fxCanvas');
  const shoeCtx = shoeCanvas.getContext('2d');
  const fxCtx = fxCanvas.getContext('2d');

  let particles = [];

  function resizeCanvases() {
    const stage = document.querySelector('.stage');
    const w = stage.clientWidth, h = stage.clientHeight;
    [shoeCanvas, fxCanvas].forEach((c) => {
      c.width = w * state.dpr;
      c.height = h * state.dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
    });
    shoeCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    fxCtx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    seedParticles(w, h);
  }

  function seedParticles(w, h) {
    const count = w < 700 ? 26 : 52;
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      speed: Math.random() * 0.15 + 0.03,
      drift: (Math.random() - 0.5) * 0.08,
      alpha: Math.random() * 0.5 + 0.15,
      depth: Math.random(),
    }));
  }

  // ---- image-sequence mode -------------------------------------------
  function drawSequenceFrame(progress) {
    const w = shoeCanvas.clientWidth, h = shoeCanvas.clientHeight;
    shoeCtx.clearRect(0, 0, w, h);
    const idx = clamp(Math.round(progress * (RIG.frames.length - 1)), 0, RIG.frames.length - 1);
    const img = RIG.frames[idx];
    if (!img || !img.complete) return;
    const ratio = Math.max(w / img.width, h / img.height);
    const iw = img.width * ratio, ih = img.height * ratio;
    shoeCtx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  // ---- procedural vector "camera rig" mode ----------------------------
  function drawShoeSilhouette(ctx, cx, cy, scale, colorSet, tilt) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt * 0.12);
    ctx.scale(scale, scale);

    // contact shadow
    const shadowGrad = ctx.createRadialGradient(0, 128, 10, 0, 128, 210);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 128, 210, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // sole
    const soleGrad = ctx.createLinearGradient(-220, 90, 220, 130);
    soleGrad.addColorStop(0, '#1a1a1c');
    soleGrad.addColorStop(0.5, '#38383c');
    soleGrad.addColorStop(1, '#141416');
    ctx.fillStyle = soleGrad;
    ctx.beginPath();
    ctx.moveTo(-200, 96);
    ctx.bezierCurveTo(-180, 118, -100, 132, 30, 130);
    ctx.bezierCurveTo(140, 128, 200, 116, 216, 96);
    ctx.bezierCurveTo(224, 84, 210, 74, 180, 74);
    ctx.bezierCurveTo(60, 78, -100, 78, -200, 78);
    ctx.closePath();
    ctx.fill();

    // upper body
    const upperGrad = ctx.createLinearGradient(-180, -100, 180, 90);
    upperGrad.addColorStop(0, colorSet.accent);
    upperGrad.addColorStop(0.45, colorSet.a);
    upperGrad.addColorStop(1, colorSet.b);
    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(-190, 78);
    ctx.bezierCurveTo(-200, 30, -170, -30, -110, -58);
    ctx.bezierCurveTo(-40, -92, 60, -96, 120, -66);
    ctx.bezierCurveTo(160, -46, 168, -10, 196, 10);
    ctx.bezierCurveTo(214, 24, 210, 52, 190, 66);
    ctx.bezierCurveTo(120, 82, -60, 84, -190, 78);
    ctx.closePath();
    ctx.fill();

    // heel highlight (key light)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const heelGlow = ctx.createRadialGradient(120, -30, 6, 120, -30, 130);
    heelGlow.addColorStop(0, 'rgba(106,176,255,0.55)');
    heelGlow.addColorStop(1, 'rgba(106,176,255,0)');
    ctx.fillStyle = heelGlow;
    ctx.beginPath();
    ctx.ellipse(120, -30, 130, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // toe rim light (warm)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const toeGlow = ctx.createRadialGradient(-150, -10, 4, -150, -10, 90);
    toeGlow.addColorStop(0, 'rgba(255,177,94,0.45)');
    toeGlow.addColorStop(1, 'rgba(255,177,94,0)');
    ctx.fillStyle = toeGlow;
    ctx.beginPath();
    ctx.ellipse(-150, -10, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // laces
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const x = -70 + i * 30;
      ctx.beginPath();
      ctx.moveTo(x, -70 + i * 3);
      ctx.lineTo(x + 16, -46 + i * 3);
      ctx.stroke();
    }

    // tongue
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(-40, -78);
    ctx.bezierCurveTo(-20, -100, 30, -100, 46, -78);
    ctx.bezierCurveTo(30, -68, -22, -68, -40, -78);
    ctx.closePath();
    ctx.fill();

    // swoosh-style accent
    ctx.strokeStyle = colorSet.accent;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-150, 30);
    ctx.quadraticCurveTo(-20, 70, 150, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawProceduralFrame(progress) {
    const w = shoeCanvas.clientWidth, h = shoeCanvas.clientHeight;
    const shot = getShot(progress);
    const colorSet = COLORS[RIG.color];

    // shoe layer
    shoeCtx.clearRect(0, 0, w, h);
    const cx = w / 2 + shot.rotY * w * 0.10 + state.mouse.nx * 10;
    const cy = h / 2 + shot.y * h * 0.16 + state.mouse.ny * 6;
    const scale = (Math.min(w, h) / 620) * shot.zoom;
    const squish = 1 - Math.abs(Math.sin(shot.rotY)) * 0.18; // fake horizontal orbit
    shoeCtx.save();
    shoeCtx.translate(cx, cy);
    shoeCtx.scale(squish, 1);
    shoeCtx.translate(-cx, -cy);
    drawShoeSilhouette(shoeCtx, cx, cy, scale, colorSet, shot.rotX + Math.sin(shot.rotY) * 0.3);
    shoeCtx.restore();

    // fx layer: light rays + particles
    fxCtx.clearRect(0, 0, w, h);
    fxCtx.save();
    fxCtx.globalCompositeOperation = 'screen';
    const rayCount = 5;
    for (let i = 0; i < rayCount; i++) {
      const angle = -0.6 + i * 0.3 + shot.rotY * 0.15;
      const grad = fxCtx.createLinearGradient(
        w / 2, -h * 0.2,
        w / 2 + Math.sin(angle) * w * 0.7, h * 1.1
      );
      const alpha = 0.05 * shot.glow;
      grad.addColorStop(0, i % 2 === 0 ? `rgba(106,176,255,${alpha})` : `rgba(255,177,94,${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      fxCtx.fillStyle = grad;
      fxCtx.beginPath();
      fxCtx.moveTo(w / 2, -h * 0.2);
      fxCtx.lineTo(w / 2 + Math.sin(angle) * w * 0.7 - 40, h * 1.1);
      fxCtx.lineTo(w / 2 + Math.sin(angle) * w * 0.7 + 40, h * 1.1);
      fxCtx.closePath();
      fxCtx.fill();
    }
    fxCtx.restore();

    // particles (drift slowly, parallax with progress + mouse)
    fxCtx.save();
    particles.forEach((p) => {
      p.y -= p.speed * (0.4 + shot.glow * 0.6);
      p.x += p.drift + state.mouse.nx * p.depth * 0.4;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      fxCtx.globalAlpha = p.alpha * (0.5 + shot.glow * 0.5);
      fxCtx.fillStyle = '#f3f1ea';
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.r * (0.6 + p.depth), 0, Math.PI * 2);
      fxCtx.fill();
    });
    fxCtx.restore();
  }

  function renderFrame(progress) {
    if (!state.ready) return;
    if (RIG.mode === 'sequence') drawSequenceFrame(progress);
    else drawProceduralFrame(progress);
  }

  window.addEventListener('resize', () => {
    resizeCanvases();
    renderFrame(RIG.progress);
  });
  resizeCanvases();

  // idle ambient loop so particles drift even without scroll input
  function ambientLoop() {
    if (state.ready && RIG.mode === 'procedural') renderFrame(RIG.progress);
    requestAnimationFrame(ambientLoop);
  }
  if (!state.reducedMotion) requestAnimationFrame(ambientLoop);

  /* ---------------------------------------------------------
     COLORWAY SELECTOR
  --------------------------------------------------------- */
  document.querySelectorAll('.colorway__swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.colorway__swatch').forEach((b) => {
        b.classList.remove('is-active');
        b.closest('li').setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.closest('li').setAttribute('aria-selected', 'true');
      RIG.color = btn.dataset.color;
      renderFrame(RIG.progress);
    });
  });

  /* ---------------------------------------------------------
     MOUSE PARALLAX
  --------------------------------------------------------- */
  window.addEventListener('pointermove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.nx = (e.clientX / window.innerWidth - 0.5) * 2;
    state.mouse.ny = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ---------------------------------------------------------
     MAGNETIC BUTTONS
  --------------------------------------------------------- */
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = 0.35;
    const moveX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const moveY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      moveX((e.clientX - r.left - r.width / 2) * strength);
      moveY((e.clientY - r.top - r.height / 2) * strength);
    });
    el.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
  });

  /* ---------------------------------------------------------
     WATCH FILM — smooth-scrolls into the next chapter
  --------------------------------------------------------- */
  document.getElementById('watchFilmBtn').addEventListener('click', () => {
    const target = document.getElementById('collection');
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------------------------------------------------------
     GO
  --------------------------------------------------------- */
  boot();
})();