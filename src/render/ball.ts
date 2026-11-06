import type { BallDesign } from '../content/balls';
import { TAU, disc, rad, rng, type C } from './paint';

type V3 = [number, number, number];

/** A 3×3 rotation, row major. */
export type Rot = number[];

export const identity = (): Rot => [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function rollBall(m: Rot, vx: number, vy: number, dt: number, r: number): void {
  const sp = Math.hypot(vx, vy);
  if (sp < 0.5) return;
  const ang = (sp * dt) / r;
  const ax = -vy / sp;
  const ay = vx / sp;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = 1 - c;
  // Rotation about (ax, ay, 0), applied on top of the current one.
  const q = [t * ax * ax + c, t * ax * ay, s * ay, t * ax * ay, t * ay * ay + c, -s * ax, -s * ay, s * ax, c];
  const o = m.slice();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) m[i * 3 + j] = q[i * 3] * o[j] + q[i * 3 + 1] * o[3 + j] + q[i * 3 + 2] * o[6 + j];
  }
}

const apply = (m: Rot, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

function sphere(n: number): V3[] {
  const pts: V3[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const q = Math.sqrt(1 - y * y);
    pts.push([Math.cos(i * g) * q, y, Math.sin(i * g) * q]);
  }
  return pts;
}

const DOTS = sphere(46);
const FEW = sphere(16);
const GRID = sphere(90);

function spots(c: C, m: Rot, pts: V3[], r: number, size: number, col: string | ((i: number) => string)): void {
  for (let i = 0; i < pts.length; i++) {
    const p = apply(m, pts[i]);
    if (p[2] < 0.05) continue;
    c.fillStyle = typeof col === 'string' ? col : col(i);
    c.beginPath();
    c.ellipse(p[0] * r, p[1] * r, size * r, size * r * Math.max(0.35, p[2]), Math.atan2(p[1], p[0]) + Math.PI / 2, 0, TAU);
    c.fill();
  }
}

/** A band around the sphere, tilted by `lat` from the ball's equator. */
function band(c: C, m: Rot, r: number, lat: number, w: number, col: string): void {
  c.strokeStyle = col;
  c.lineWidth = w * r;
  c.lineCap = 'round';
  c.beginPath();
  let on = false;
  for (let i = 0; i <= 44; i++) {
    const a = (i / 44) * TAU;
    const q = Math.cos(lat);
    const p = apply(m, [Math.cos(a) * q, Math.sin(a) * q, Math.sin(lat)]);
    if (p[2] > 0) {
      if (on) c.lineTo(p[0] * r, p[1] * r);
      else c.moveTo(p[0] * r, p[1] * r);
      on = true;
    } else {
      on = false;
    }
  }
  c.stroke();
}

/** Draws at the origin. `lag` is where the googly pupil has been flung to. */
export function drawBallFace(c: C, b: BallDesign, r: number, m: Rot, lagX = 0, lagY = 0): void {
  c.save();
  disc(c, 0, 0, r);
  c.fillStyle = rad(c, -r * 0.34, -r * 0.38, r * 1.5, b.base, b.base, b.shade);
  c.fill();
  c.clip();

  const ink = b.ink ?? '#000';
  switch (b.look) {
    case 'dimple':
      spots(c, m, DOTS, r, 0.05, 'rgba(120,130,145,.5)');
      band(c, m, r, 0, 0.14, ink);
      break;
    case 'speck':
      spots(c, m, DOTS, r, 0.09, (i) => (i % 2 ? ink : (b.ink2 ?? ink)));
      break;
    case 'seed':
      spots(c, m, FEW, r, 0.06, ink);
      spots(c, m, [[0, 0, 1]], r, 0.26, ink);
      break;
    case 'stripes':
      for (const lat of [-0.95, -0.32, 0.32, 0.95]) band(c, m, r, lat, 0.26, ink);
      break;
    case 'swirl':
      band(c, m, r, 0.1, 0.26, ink);
      band(c, m, r, -0.6, 0.08, '#fff');
      break;
    case 'wheel':
      spots(c, m, [[0, 0, 1], [0, 0, -1]], r, 0.5, ink);
      spots(c, m, [[0, 0, 1], [0, 0, -1]], r, 0.2, '#d7dde3');
      break;
    case 'disco':
      spots(c, m, GRID, r, 0.1, (i) => ['#ffffff', '#8fd3ff', '#ff9fd6', '#ffe28a', '#6f7d99'][i % 5]);
      break;
    case 'fuzz': {
      spots(c, m, DOTS, r, 0.12, (i) => (i % 2 ? ink : (b.ink2 ?? ink)));
      break;
    }
    case 'sheen':
      band(c, m, r, 0.5, 0.1, ink);
      band(c, m, r, -0.5, 0.06, ink);
      break;
    case 'googly': {
      const q = r * 0.42;
      disc(c, lagX * q, lagY * q + r * 0.02, r * 0.58);
      c.fillStyle = ink;
      c.fill();
      break;
    }
  }
  c.restore();

  // Light on top, and a thin dark edge so it stays legible on pale floors.
  c.fillStyle = 'rgba(255,255,255,.75)';
  c.beginPath();
  c.ellipse(-r * 0.36, -r * 0.42, r * 0.24, r * 0.15, -0.6, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(30,24,44,.62)';
  c.lineWidth = Math.max(0.7, r * 0.11);
  disc(c, 0, 0, r);
  c.stroke();

  if (b.look === 'fuzz') {
    const R = rng(6);
    c.strokeStyle = b.shade;
    c.lineWidth = Math.max(0.5, r * 0.07);
    c.beginPath();
    for (let i = 0; i < 22; i++) {
      const a = R() * TAU;
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a + 0.2) * r * 1.16, Math.sin(a + 0.2) * r * 1.16);
    }
    c.stroke();
  }
}
