import * as THREE from 'three';

// Cup dimensions in scene units. TOTAL is body + lid, used to fit the cup to its DOM stage.
export const CUP = { H: 2.3, RB: 0.6, RT: 0.9, TOTAL: 2.62 };

const radiusAt = (y) => CUP.RB + (CUP.RT - CUP.RB) * (y / CUP.H);

/** Draws text with manual tracking, centred on cx. (Canvas letterSpacing is not universal yet.) */
function trackedText(ctx, text, cx, y, tracking) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
}

function drawSleeve(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');

  // Kraft paper base.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#c89962');
  base.addColorStop(1, '#b3824c');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Fibres and speckle. Seeded so the texture is identical on every load.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,240,215,0.07)' : 'rgba(70,40,15,0.07)';
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 10, 1);
  }
  // Corrugation ridges.
  for (let x = 0; x < W; x += 14) {
    ctx.fillStyle = 'rgba(60,34,12,0.055)';
    ctx.fillRect(x, 0, 2, H);
    ctx.fillStyle = 'rgba(255,238,210,0.05)';
    ctx.fillRect(x + 5, 0, 2, H);
  }

  const ink = '#1f130c';
  ctx.fillStyle = ink;
  ctx.fillRect(0, 26, W, 3);
  ctx.fillRect(0, H - 29, W, 3);

  // Logo block, printed front and back. x = 0 wraps round to x = W.
  const sans = '"Inter Variable", Inter, "Helvetica Neue", Arial, sans-serif';
  for (const cx of [0, W / 2, W]) {
    // Bullseye mark.
    const cy = H * 0.31;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.textBaseline = 'alphabetic';
    ctx.font = `560 80px ${sans}`;
    trackedText(ctx, 'THE DEN', cx, H * 0.715, 26);
    ctx.font = `560 19px ${sans}`;
    trackedText(ctx, 'COFFEE & CONTEMPORARY CULTURE', cx, H * 0.83, 6.500);
  }

  // Small print between the logos.
  ctx.font = `560 17px ${sans}`;
  for (const cx of [W / 4, (3 * W) / 4]) {
    trackedText(ctx, 'ESCOLTA · MANILA', cx, H * 0.53, 8);
  }
}

export function createCup(renderer) {
  const { H, RB, RT } = CUP;

  const paper = new THREE.MeshStandardMaterial({ color: 0xf2e8d8, roughness: 0.78, metalness: 0, side: THREE.DoubleSide });

  // ── Body: outer wall, rolled rim, then back down the inside.
  const profile = [
    [0, 0.07],
    [RB - 0.06, 0.07],
    [RB - 0.03, 0],
    [RB, 0],
    [RT, H],
    [RT + 0.034, H + 0.008],
    [RT + 0.05, H + 0.045],
    [RT + 0.034, H + 0.082],
    [RT, H + 0.092],
    [RT - 0.03, H + 0.07],
    [RT - 0.036, H],
    [radiusAt(H - 0.7) - 0.036, H - 0.7],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), paper);

  // ── Coffee, visible when the lid is off.
  const coffeeY = H - 0.3;
  const coffeeR = radiusAt(coffeeY) - 0.036;
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(coffeeR, 48),
    // DoubleSide like the paper and lid, so all three compile to a single shader program.
    new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 0.1, metalness: 0, side: THREE.DoubleSide }),
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = coffeeY;

  const crema = new THREE.Mesh(
    new THREE.RingGeometry(coffeeR * 0.8, coffeeR, 48),
    new THREE.MeshStandardMaterial({ color: 0x93592a, roughness: 0.5, side: THREE.DoubleSide }),
  );
  crema.rotation.x = -Math.PI / 2;
  crema.position.y = coffeeY + 0.004;

  // ── Kraft sleeve with the printed logo.
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 448;
  drawSleeve(canvas);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.offset.x = 0.5; // puts a logo at the front of the cup
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // Redraw once the webfont is in, so the wordmark uses the real typeface.
  document.fonts
    ?.load('560 80px "Inter Variable"')
    .then(() => {
      drawSleeve(canvas);
      map.needsUpdate = true;
    })
    .catch(() => {});

  const y0 = 0.6;
  const y1 = 1.62;
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusAt(y1) + 0.016, radiusAt(y0) + 0.016, y1 - y0, 64, 1, true),
    new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 }),
  );
  sleeve.position.y = (y0 + y1) / 2;

  // The part that spins on its own axis.
  const spinner = new THREE.Group();
  spinner.add(body, coffee, crema, sleeve);

  // ── Lid.
  const lidProfile = [
    [0, 0.2],
    [0.5, 0.2],
    [0.57, 0.186],
    [0.615, 0.15],
    [0.65, 0.104],
    [RT - 0.09, 0.1],
    [RT - 0.02, 0.086],
    [RT + 0.035, 0.058],
    [RT + 0.078, 0],
    [RT + 0.09, -0.07],
    [RT + 0.076, -0.135],
    [RT + 0.058, -0.135],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(
    new THREE.LatheGeometry(lidProfile, 64),
    new THREE.MeshStandardMaterial({ color: 0x18110d, roughness: 0.3, metalness: 0.12, side: THREE.DoubleSide }),
  );
  const sip = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 20),
    new THREE.MeshStandardMaterial({ color: 0x050302, roughness: 1, side: THREE.DoubleSide }),
  );
  sip.scale.set(1.9, 1, 1);
  sip.rotation.x = -Math.PI / 2;
  sip.position.set(0, 0.203, 0.36);
  lid.add(lidMesh, sip);

  const lidRest = H + 0.11;

  /** open: 0 = on the cup, 1 = popped off and hovering to the upper left. */
  function setLid(open, time) {
    const o = open * open * (3 - 2 * open);
    const drift = Math.sin(time * 0.9) * 0.05 * o;
    lid.position.set(-1.5 * o, lidRest + (1.18 + drift) * o, 0.25 * o);
    lid.rotation.set(0.42 * o, 0, (0.72 + Math.sin(time * 0.7) * 0.05) * o);
  }
  setLid(0, 0);

  return { spinner, lid, setLid, mouthY: coffeeY };
}
