import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCup, CUP } from './cup.js';
import { createSplash } from './splash.js';
import { createOrbitBeans, createAmbientBeans } from './beans.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const nearestTurn = (a) => Math.round(a / TAU) * TAU;
const far = (a, b) => Math.abs(a - b) > 0.002;

/**
 * True when the browser can draw WebGL on a real GPU. False when it would fall
 * back to software rendering (remote desktops, some embedded previews, blocked
 * drivers), where a full-screen animated scene eats whole CPU cores.
 */
function hasFastWebGL() {
  try {
    const probe = document.createElement('canvas');
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = probe.getContext('webgl2', opts) || probe.getContext('webgl', opts);
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render|warp/i.test(name);
  } catch {
    return false;
  }
}

/**
 * One fixed, transparent canvas behind the page. The cup is pinned to empty
 * "stage" elements in the DOM ([data-anchor]) and flies between them as the
 * visitor scrolls, so the 3D always lines up with the layout at any screen size.
 *
 * Anchor attributes:
 *   data-fit      cup height as a fraction of the stage height
 *   data-ox/oy    nudge from the stage centre, as a fraction of its size
 *   data-rot      "leanX,yaw,leanZ" in degrees
 *   data-lid      0 closed, 1 popped open
 *   data-splash   0..1 coffee splash
 *   data-beans    0..1 orbiting beans
 *   data-hide     cup shrinks away at this anchor
 *   data-turn     slow turntable rotation while here
 *   data-spin     visitor can drag to spin the cup here
 *
 * Performance: the scene watches its own frame times and backs off by itself.
 * <html data-scene-mode> shows the current mode:
 *   full    every frame, all animation
 *   eco     every other frame (30 fps on a 60 Hz screen)
 *   still   no idle animation; draws only while the page scrolls or the cup is dragged
 *   stills  no usable GPU: each stage gets one pre-rendered image and WebGL is shut down
 */
export function initScene(canvas) {
  const tInit = performance.now();
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 920px)').matches;
  const lowPower = !hasFastWebGL();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lowPower,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    root.classList.add('no-webgl');
    return;
  }

  // Full-screen WebGL at 2x or 3x is the fastest way to make a phone or an
  // integrated-graphics laptop stutter, so the pixel ratio is capped, and the
  // governor below lowers it (then the frame rate) if frames still run slow.
  const perf = {
    ratio: Math.min(window.devicePixelRatio || 1, 1.5),
    floor: compact ? 1 : 0.8,
    mode: 'full',
    settle: 0,
    acc: 0,
    n: 0,
    good: 0,
    upgrades: 0,
  };
  root.dataset.sceneMode = perf.mode;
  renderer.setPixelRatio(perf.ratio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x170d08, 12.5, 23);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 12);

  // Soft studio reflections without shipping an HDR file.
  const tRenderer = performance.now();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();
  const tEnv = performance.now();

  const key = new THREE.DirectionalLight(0xffe6c8, 2.6);
  key.position.set(-4, 6, 8);
  const rim = new THREE.DirectionalLight(0xff8a2e, 3.2);
  rim.position.set(6, 2.5, -5);
  const fill = new THREE.HemisphereLight(0xffd9b0, 0x1a0d06, 0.55);
  scene.add(key, rim, fill);

  // ── Cup rig: rig (position/scale) → lean (tilt) → stand → { spinner, lid, splash }
  const rig = new THREE.Group();
  const lean = new THREE.Group();
  const stand = new THREE.Group();
  stand.position.y = -CUP.TOTAL / 2 + 0.1; // pivot around the middle of the cup
  rig.add(lean);
  lean.add(stand);

  const cup = createCup(renderer);
  const splash = createSplash();
  splash.group.position.y = cup.mouthY - 0.12;
  stand.add(cup.spinner, cup.lid, splash.group);

  const orbit = createOrbitBeans(compact || lowPower ? 16 : 26);
  rig.add(orbit.mesh);

  // Warm glow by the splash. It lives in the scene, not in the rig: the rig is
  // hidden when the cup is off-stage, and a light that drops out of the scene
  // changes the light count, which forces every shader to recompile mid-scroll
  // (a visible freeze). Here it stays put and only its intensity goes to zero.
  const glow = new THREE.PointLight(0xffa24a, 0, 9, 1.6);
  scene.add(glow);

  const ambient = createAmbientBeans(compact || lowPower ? 16 : 36, camera, compact ? 0.62 : 1);
  scene.add(rig, ambient.mesh);

  // ── Anchors
  const anchors = [...document.querySelectorAll('[data-anchor]')].map((el) => {
    const d = el.dataset;
    const [rx, ry, rz] = (d.rot || '0,0,0').split(',').map((n) => parseFloat(n) * DEG);
    return {
      el,
      hide: 'hide' in d,
      turn: 'turn' in d,
      fit: parseFloat(d.fit ?? 0.5),
      ox: parseFloat(d.ox ?? 0),
      oy: parseFloat(d.oy ?? 0),
      rx,
      ry,
      rz,
      lid: parseFloat(d.lid ?? 0),
      splash: parseFloat(d.splash ?? 0),
      beans: parseFloat(d.beans ?? 0),
      x: 0,
      y: 0,
      s: 0,
      cy: 0,
    };
  });
  if (!anchors.length) return;

  // ── No real GPU: draw each stage once, hand the page plain images, and stop.
  // Software WebGL manages only a few frames a second, so redrawing on scroll
  // would make the whole page crawl. A still costs nothing once it is on screen.
  if (lowPower) {
    const renderStills = () => {
      ambient.mesh.visible = false;
      renderer.setPixelRatio(1.25);
      for (const a of anchors) {
        if (a.hide) continue;
        const r = a.el.getBoundingClientRect();
        if (r.width < 20 || r.height < 20) continue;
        renderer.setSize(Math.round(r.width), Math.round(r.height), false);
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
        const h = 2 * camera.position.z * Math.tan((camera.fov * DEG) / 2);
        const s = (a.fit * h) / CUP.TOTAL;
        rig.position.set(a.ox * h * camera.aspect, -a.oy * h, 0);
        rig.scale.setScalar(s);
        lean.rotation.set(a.rx, 0, a.rz);
        cup.spinner.rotation.y = a.ry;
        cup.setLid(a.lid, 0);
        splash.update(a.splash, 0, false);
        orbit.update(a.beans, 0);
        glow.position.set(rig.position.x + 0.6 * s, rig.position.y + 1.9 * s, 2.2 * s);
        glow.intensity = 26 * a.splash;
        renderer.render(scene, camera);

        const still = new Image();
        still.src = canvas.toDataURL('image/png'); // read straight after render, before the buffer clears
        still.alt = '';
        still.className = 'stage-still';
        a.el.append(still);
      }
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      root.dataset.sceneMode = 'stills';
      root.classList.add('scene-ready', 'scene-stills');
    };
    // After the webfont, so the wordmark on the sleeve is drawn in the right typeface.
    const go = () => requestAnimationFrame(renderStills);
    (document.fonts?.load('560 80px "Inter Variable"') ?? Promise.resolve()).then(go, go);
    return;
  }

  let vw = 1;
  let vh = 1;
  let viewW = 1;
  let viewH = 1;
  let redraw = true; // set whenever something outside the frame loop changes what should be drawn

  function resize() {
    vw = canvas.clientWidth || window.innerWidth;
    vh = canvas.clientHeight || window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    viewH = 2 * camera.position.z * Math.tan((camera.fov * DEG) / 2);
    viewW = viewH * camera.aspect;
    redraw = true;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Governor: steps quality down when frames run slow, and back up if the
  // machine was only busy for a while.
  function setMode(mode) {
    perf.mode = mode;
    perf.good = 0;
    perf.settle = 1.5; // give the change a moment before judging again
    root.dataset.sceneMode = mode;
    redraw = true;
  }

  function watchPerformance(rawDt) {
    if (rawDt > 0.25) return; // tab switch or a one-off hitch, not representative
    perf.settle += rawDt;
    if (perf.settle < 2.5) return; // ignore start-up (shader compile, fonts, images)
    perf.acc += rawDt;
    perf.n++;
    if (perf.n < 45) return;
    const avg = perf.acc / perf.n;
    perf.acc = 0;
    perf.n = 0;

    if (avg > 0.022) {
      // Under roughly 45 fps. Cheapest remedy first.
      if (perf.ratio > perf.floor) {
        perf.ratio = Math.max(perf.floor, perf.ratio * 0.8);
        renderer.setPixelRatio(perf.ratio);
        resize();
        perf.good = 0;
        perf.settle = 1.5;
      } else if (perf.mode === 'full') {
        setMode('eco');
      } else if (perf.mode === 'eco' && avg > 0.03) {
        setMode('still');
      }
    } else if (avg < 0.0185 && perf.mode !== 'full') {
      // Comfortable again for a few seconds. Allowed twice, so it cannot flip-flop.
      if (++perf.good >= 6 && perf.upgrades < 2) {
        perf.upgrades++;
        setMode(perf.mode === 'still' ? 'eco' : 'full');
      }
    } else {
      perf.good = 0;
    }
  }

  function measure(a) {
    const r = a.el.getBoundingClientRect();
    a.cy = r.top + r.height / 2;
    a.x = ((r.left + r.width * (0.5 + a.ox)) / vw - 0.5) * viewW;
    a.y = (0.5 - (r.top + r.height * (0.5 + a.oy)) / vh) * viewH;
    a.s = a.hide ? 0 : (((r.height * a.fit) / vh) * viewH) / CUP.TOTAL;
  }

  // ── Pointer: parallax + drag-to-spin
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  const spin = { angle: 0, vel: 0, dragging: false, lastX: 0, idle: 0 };
  document.querySelectorAll('[data-spin]').forEach((el) => {
    el.addEventListener('pointerdown', (e) => {
      spin.dragging = true;
      spin.lastX = e.clientX;
      spin.vel = 0;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('is-grabbing');
    });
    el.addEventListener('pointermove', (e) => {
      if (!spin.dragging) return;
      const dx = e.clientX - spin.lastX;
      spin.lastX = e.clientX;
      spin.vel = dx * 0.011;
      spin.angle += spin.vel;
      if (Math.abs(dx) > 1) el.classList.add('has-spun');
    });
    const end = () => {
      spin.dragging = false;
      spin.idle = 0;
      el.classList.remove('is-grabbing');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  // ── Frame loop
  const state = { lid: 0, splash: 0, beans: 0, rx: 0, ry: 0, rz: 0, turn: 0 };
  const clock = new THREE.Clock();
  let time = 0;
  let first = true;
  let frameNo = 0;
  let lastScroll = -1;

  function frame() {
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    watchPerformance(rawDt);
    frameNo++;

    // With reduced motion, or once the governor has dropped to "still", nothing
    // moves by itself: no bobbing, orbiting or drifting, and no pointer parallax.
    const idleMotion = !reduced && perf.mode !== 'still';
    if (idleMotion) time += dt;

    anchors.forEach(measure);

    // Which pair of anchors are we between? Measured a little below the middle of the
    // viewport, so the cup has landed on a stage by the time that stage is in full view.
    const mid = vh * 0.6;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].cy <= mid) i++;
    const A = anchors[i];
    const B = anchors[Math.min(i + 1, anchors.length - 1)];
    let t = A === B ? 0 : clamp((mid - A.cy) / (B.cy - A.cy), 0, 1);
    t = smooth(clamp((t - 0.1) / 0.8, 0, 1)); // settle on each anchor before leaving it

    // Position and size follow the layout exactly (no easing, or the cup would lag behind the page).
    const s = lerp(A.s, B.s, t);
    rig.visible = s > 0.012;
    rig.position.set(lerp(A.x, B.x, t), lerp(A.y, B.y, t), 0);
    rig.scale.setScalar(Math.max(s, 0.0001));

    // Everything else eases toward its target. With reduced motion it snaps instead.
    const ease = (lambda) => (reduced ? 1 : 1 - Math.exp(-lambda * dt));
    const kRot = first ? 1 : ease(5);
    const flight = A.hide || B.hide ? 0 : TAU * t; // one full turn in transit between two visible stops
    const want = {
      rx: lerp(A.rx, B.rx, t),
      ry: lerp(A.ry, B.ry, t) + flight,
      rz: lerp(A.rz, B.rz, t),
      lid: lerp(A.lid, B.lid, smooth(clamp(t * 1.8, 0, 1))),
      splash: lerp(A.splash, B.splash, smooth(clamp(t * 2.2, 0, 1))),
      beans: lerp(A.beans, B.beans, t),
    };
    const easing =
      far(state.rx, want.rx) ||
      far(state.ry, want.ry) ||
      far(state.rz, want.rz) ||
      far(state.lid, want.lid) ||
      far(state.splash, want.splash) ||
      far(state.beans, want.beans);

    state.rx = lerp(state.rx, want.rx, kRot);
    state.ry = lerp(state.ry, want.ry, kRot);
    state.rz = lerp(state.rz, want.rz, kRot);
    // Lid, splash and beans start from rest, so on load the lid pops and the coffee erupts.
    state.lid = lerp(state.lid, want.lid, ease(3.6));
    state.splash = lerp(state.splash, want.splash, ease(3));
    state.beans = lerp(state.beans, want.beans, ease(2.8));

    // Turntable rotation at stops that ask for it; unwinds to a whole turn when leaving.
    const turnWeight = (A.turn ? 1 - t : 0) + (B.turn ? t : 0);
    if (turnWeight > 0.5 && idleMotion) state.turn += dt * 0.42 * turnWeight;
    else state.turn = damp(state.turn, nearestTurn(state.turn), 3, dt);

    // Drag-to-spin inertia, then drift back to face the front.
    if (!spin.dragging) {
      spin.angle += spin.vel;
      spin.vel *= Math.pow(0.94, dt * 60);
      spin.idle += dt;
      if (spin.idle > 1.6) spin.angle = damp(spin.angle, nearestTurn(spin.angle), 1.4, dt);
    }
    const spinning =
      spin.dragging || Math.abs(spin.vel) > 0.0005 || far(spin.angle, nearestTurn(spin.angle)) || far(state.turn, nearestTurn(state.turn));

    pointer.sx = damp(pointer.sx, idleMotion ? pointer.x : 0, 4, dt);
    pointer.sy = damp(pointer.sy, idleMotion ? pointer.y : 0, 4, dt);

    // Decide whether this frame needs drawing at all.
    const scrolled = window.scrollY !== lastScroll;
    lastScroll = window.scrollY;
    const changed = first || redraw || scrolled || easing || spinning;
    let draw;
    if (!idleMotion) draw = changed;
    else if (perf.mode === 'eco') draw = changed ? frameNo % 2 === 0 || first || redraw : frameNo % 2 === 0;
    else draw = true;
    if (!draw) return;
    redraw = false;

    const bob = Math.sin(time * 0.9);
    lean.rotation.set(
      state.rx + pointer.sy * 0.1 + Math.sin(time * 0.55) * 0.025,
      pointer.sx * 0.22,
      state.rz + Math.sin(time * 0.7) * 0.025,
    );
    lean.position.y = bob * 0.045;
    cup.spinner.rotation.y = state.ry + state.turn + spin.angle;

    cup.setLid(state.lid, time);
    splash.update(state.splash, time, idleMotion);
    orbit.update(state.beans, time);
    glow.position.set(rig.position.x + 0.6 * s, rig.position.y + 1.9 * s, 2.2 * s);
    glow.intensity = rig.visible ? 26 * state.splash : 0;

    const scrollUnits = (window.scrollY / vh) * viewH;
    ambient.update(time, scrollUnits, pointer.sx, pointer.sy);

    renderer.render(scene, camera);

    if (first) {
      first = false;
      root.classList.add('scene-ready');
    }
  }

  // Compile shaders off the main thread where the browser supports it, so the
  // page does not freeze for a moment when the 3D first appears.
  const tBuilt = performance.now();
  const start = () => {
    if (import.meta.env.DEV) {
      console.debug(
        `[scene] renderer ${Math.round(tRenderer - tInit)} ms · environment ${Math.round(tEnv - tRenderer)} ms · geometry ${Math.round(tBuilt - tEnv)} ms · shaders ${Math.round(performance.now() - tBuilt)} ms (${renderer.info.programs?.length} programs) · mode ${perf.mode}`,
      );
    }
    clock.getDelta();
    renderer.setAnimationLoop(frame);
  };
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(start, start);
  else start();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    } else {
      clock.getDelta();
      redraw = true;
      renderer.setAnimationLoop(frame);
    }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    root.classList.remove('scene-ready');
    root.classList.add('no-webgl');
  });
}
