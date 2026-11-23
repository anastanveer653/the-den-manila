import * as THREE from 'three';

// Deterministic PRNG so the splash looks the same on every visit.
function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A tapering, slightly flattened tube that curls up and out of the cup.
 * Built by hand (rather than TubeGeometry) so the radius can vary along its length.
 */
function ribbonGeometry(o) {
  const points = [];
  const N = 30;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const a = o.phase + t * o.turns * Math.PI * 2;
    const rad = o.r0 + (o.r1 - o.r0) * Math.pow(t, 1.15);
    const y = o.rise * (1 - Math.pow(1 - t, 2.2)) - o.droop * Math.pow(t, 3.5);
    points.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad));
  }
  const curve = new THREE.CatmullRomCurve3(points);

  const SEG = 110;
  const RAD = 14;
  const frames = curve.computeFrenetFrames(SEG, false);
  const pos = [];
  const col = [];
  const idx = [];
  const P = new THREE.Vector3();
  const cBase = new THREE.Color(0x2c1407);
  const cMid = new THREE.Color(0x8c4614);
  const cTip = new THREE.Color(0xe0932f);
  const c = new THREE.Color();

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    curve.getPointAt(t, P);
    const n = frames.normals[i];
    const b = frames.binormals[i];

    let r = o.thick * (0.3 + 0.7 * Math.pow(1 - t, 0.8));
    r *= 1 + 0.14 * Math.sin(t * 21 + o.phase * 3); // uneven, like a real pour
    r += o.thick * 0.5 * Math.exp(-Math.pow((t - 0.95) / 0.035, 2)); // bead forming at the tip
    if (t > 0.972) r *= Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.972) / 0.028, 2))); // round it closed

    if (t < 0.45) c.lerpColors(cBase, cMid, t / 0.45);
    else c.lerpColors(cMid, cTip, (t - 0.45) / 0.55);

    for (let j = 0; j < RAD; j++) {
      const a = (j / RAD) * Math.PI * 2;
      const u = Math.cos(a) * r;
      const v = Math.sin(a) * r * o.flat;
      pos.push(P.x + u * n.x + v * b.x, P.y + u * n.y + v * b.y, P.z + u * n.z + v * b.z);
      col.push(c.r, c.g, c.b);
    }
  }

  for (let i = 0; i < SEG; i++) {
    for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j;
      const b2 = i * RAD + ((j + 1) % RAD);
      const d = (i + 1) * RAD + j;
      const e = (i + 1) * RAD + ((j + 1) % RAD);
      idx.push(a, d, b2, b2, d, e);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createSplash() {
  const group = new THREE.Group();

  // MeshStandardMaterial throughout: on Direct3D each extra shader variant costs
  // a few hundred milliseconds to compile, and a clearcoat layer adds a second
  // specular pass per pixel. Low roughness plus the environment map reads as wet.
  const liquid = {
    roughness: 0.05,
    metalness: 0,
    envMapIntensity: 2,
    emissive: 0x4a1c04,
    emissiveIntensity: 0.55,
  };
  const ribbonMat = new THREE.MeshStandardMaterial({ ...liquid, color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
  const dropMat = new THREE.MeshStandardMaterial({ ...liquid, color: 0xffffff });

  const swirl = new THREE.Group();
  [
    { phase: 0.4, turns: 1.1, r0: 0.1, r1: 1.12, rise: 2.05, droop: 0.55, thick: 0.25, flat: 0.6 },
    { phase: 2.7, turns: 0.85, r0: 0.08, r1: 0.86, rise: 1.45, droop: 0.25, thick: 0.19, flat: 0.68 },
    { phase: 4.5, turns: 0.75, r0: 0.05, r1: 0.6, rise: 2.55, droop: 0.05, thick: 0.14, flat: 0.8 },
  ].forEach((o) => swirl.add(new THREE.Mesh(ribbonGeometry(o), ribbonMat)));
  group.add(swirl);

  // Flying droplets.
  const rand = mulberry(11);
  const COUNT = 22;
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), dropMat, COUNT);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const a = rand() * Math.PI * 2;
    const rad = 0.55 + rand() * 1.35;
    seeds.push({
      x: Math.cos(a) * rad,
      y: 0.9 + rand() * 2.3,
      z: Math.sin(a) * rad,
      s: 0.03 + Math.pow(rand(), 2.2) * 0.11,
      stretch: 1 + rand() * 0.5,
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 0.9,
    });
  }
  // Per-instance colour, so the droplets compile to the same program as the beans.
  const tone = new THREE.Color();
  for (let i = 0; i < COUNT; i++) drops.setColorAt(i, tone.setHex(0xb9661f).multiplyScalar(0.85 + rand() * 0.4));
  drops.instanceColor.needsUpdate = true;
  group.add(drops);

  const dummy = new THREE.Object3D();

  /** amount: 0 = nothing, 1 = full splash. */
  function update(amount, time, animate) {
    amount = Math.max(0, (amount - 0.03) / 0.97); // cut the long tail of the ease so it fully disappears
    group.visible = amount > 0;
    if (!group.visible) return;

    // Overshoot slightly on the way out so it feels like liquid, not a scale tween.
    const s = amount * (1 + 0.12 * Math.sin(amount * Math.PI));
    group.scale.set(0.55 + 0.45 * s, s, 0.55 + 0.45 * s);
    if (animate) swirl.rotation.y = time * 0.22;

    for (let i = 0; i < COUNT; i++) {
      const d = seeds[i];
      const bob = animate ? Math.sin(time * d.speed + d.phase) : 0;
      dummy.position.set(d.x, d.y + bob * 0.07, d.z);
      dummy.scale.set(d.s, d.s * d.stretch, d.s);
      dummy.rotation.set(0, 0, bob * 0.2);
      dummy.updateMatrix();
      drops.setMatrixAt(i, dummy.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
