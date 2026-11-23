import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A coffee bean: a squashed ellipsoid with the S-shaped crease pressed into its flat side. */
function beanGeometry(around, along) {
  let g = new THREE.SphereGeometry(1, around, along);
  g.rotateX(Math.PI / 2); // poles to the ends of the bean, so the crease runs between them
  const p = g.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const x = v.x * 0.6;
    let y = v.y * 0.44;
    const z = v.z * 0.95;

    if (v.y > 0) {
      y *= 0.72; // the creased face is flatter
      const centre = 0.075 * Math.sin(v.z * 2.9);
      const dx = (x - centre) / 0.085;
      const ends = Math.pow(Math.max(0, 1 - v.z * v.z), 0.4);
      y -= 0.2 * Math.exp(-dx * dx) * ends * Math.pow(v.y, 0.5);
    }
    p.setXYZ(i, x, y, z);
  }

  // Weld the seam so the shading is continuous, then rebuild normals.
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

function beanMaterial(color = 0x6a3b1d) {
  // Standard, not Physical: a clearcoat layer on 60-odd beans costs a second
  // specular pass per pixel for a sheen nobody can tell apart at this size.
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0, envMapIntensity: 1 });
}

function tint(mesh, rand) {
  const c = new THREE.Color();
  for (let i = 0; i < mesh.count; i++) {
    const k = 0.62 + rand() * 0.55;
    c.setRGB(k, k * (0.92 + rand() * 0.1), k * 0.9);
    mesh.setColorAt(i, c);
  }
  mesh.instanceColor.needsUpdate = true;
}

/** Beans orbiting the cup. Lives in the cup rig, so it moves and scales with it. */
export function createOrbitBeans(count) {
  const rand = mulberry(3);
  const mesh = new THREE.InstancedMesh(beanGeometry(56, 22), beanMaterial(), count);
  mesh.frustumCulled = false;
  tint(mesh, rand);

  const seeds = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      a: rand() * Math.PI * 2,
      radius: 1.55 + rand() * 1.9,
      y: -1.7 + rand() * 4.2,
      speed: 0.05 + rand() * 0.09,
      size: 0.1 + rand() * 0.1,
      rx: rand() * 6.3,
      ry: rand() * 6.3,
      rz: rand() * 6.3,
      spin: (rand() - 0.5) * 0.9,
      bob: rand() * 6.3,
    });
  }

  const dummy = new THREE.Object3D();

  /** amount: 0 hides the beans, 1 shows them at full spread. */
  function update(amount, time) {
    amount = Math.max(0, (amount - 0.03) / 0.97);
    mesh.visible = amount > 0;
    if (!mesh.visible) return;
    const spread = 0.45 + 0.55 * amount;
    for (let i = 0; i < count; i++) {
      const b = seeds[i];
      const a = b.a + time * b.speed;
      dummy.position.set(
        Math.cos(a) * b.radius * spread,
        b.y * spread + Math.sin(time * 0.6 + b.bob) * 0.08,
        Math.sin(a) * b.radius * 0.78 * spread,
      );
      dummy.rotation.set(b.rx + time * b.spin, b.ry + time * b.spin * 0.7, b.rz);
      dummy.scale.setScalar(b.size * amount);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}

/** Sparse beans drifting through the whole page, with scroll parallax. */
export function createAmbientBeans(count, camera, sizeMul = 1) {
  const rand = mulberry(29);
  const mesh = new THREE.InstancedMesh(beanGeometry(28, 12), beanMaterial(0x4d2a14), count); // darker: these sit behind text
  mesh.frustumCulled = false;
  tint(mesh, rand);

  const seeds = [];
  for (let i = 0; i < count; i++) {
    // Keep the middle of the page clearer, where most of the text sits.
    let u = rand() * 2 - 1;
    if (Math.abs(u) < 0.42 && rand() < 0.7) u = Math.sign(u || 1) * (0.42 + rand() * 0.58);
    const z = -1.5 - rand() * 8.5;
    seeds.push({
      u,
      v: rand() * 2 - 1,
      z,
      parallax: 0.2 + (1 - (-z - 1.5) / 8.5) * 0.5,
      size: (0.16 + rand() * 0.16) * sizeMul,
      rx: rand() * 6.3,
      ry: rand() * 6.3,
      rz: rand() * 6.3,
      spin: (rand() - 0.5) * 0.5,
      drift: 0.01 + rand() * 0.02,
    });
  }

  const dummy = new THREE.Object3D();
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const wrap = (v) => ((((v + 1) % 2) + 2) % 2) - 1;

  /** scroll: page scroll in scene units. px/py: pointer, -1..1. */
  function update(time, scroll, px, py) {
    for (let i = 0; i < count; i++) {
      const b = seeds[i];
      const reach = half * (camera.position.z - b.z) * 1.2; // half-height visible at this depth, plus margin
      const v = wrap(b.v + (scroll * b.parallax) / reach + time * b.drift);
      dummy.position.set(
        b.u * reach * camera.aspect + px * b.parallax * 0.35,
        v * reach - py * b.parallax * 0.2,
        b.z,
      );
      dummy.rotation.set(b.rx + time * b.spin, b.ry + time * b.spin * 0.6, b.rz + scroll * 0.05);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh, update };
}
