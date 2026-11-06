import type { Mat } from './types';

export const WORLD_W = 360;
export const WORLD_H = 620;
export const BALL_R = 7;
export const CUP_R = 11;
export const DT = 1 / 240;
export const MAX_SHOT = 830;
export const MIN_SHOT = 40;

const ROLL_DECEL = 250; // u/s² at mu = 1
const ROLL_DRAG = 0.35; // 1/s, speed-proportional part of rolling resistance
const GRAVITY = 900;
const CUP_CAPTURE = 340;
const REST_SPEED = 5;
const SKIN = 0.01;

/** How far a shot rolls on a plain floor. */
export function rollReach(speed: number, mu: number): number {
  const c = ROLL_DECEL * mu;
  return speed / ROLL_DRAG - (c / (ROLL_DRAG * ROLL_DRAG)) * Math.log(1 + (ROLL_DRAG * speed) / c);
}

export const MATS: Record<Mat, { e: number; f: number }> = {
  wood: { e: 0.72, f: 0.985 },
  metal: { e: 0.8, f: 0.99 },
  rubber: { e: 0.92, f: 0.97 },
  card: { e: 0.46, f: 0.94 },
  ceramic: { e: 0.76, f: 0.99 },
  plastic: { e: 0.66, f: 0.975 },
  cloth: { e: 0.28, f: 0.85 },
  brick: { e: 0.62, f: 0.96 },
};

export interface Mover {
  /** Moves the mover to time t, writing x, y, angle and the velocities at that moment. */
  pose(t: number, m: Mover): void;
  x: number;
  y: number;
  ang: number;
  vx: number;
  vy: number;
  w: number;
}

export interface Col {
  /** 0 = capsule from a to b, 1 = circle at a. */
  kind: 0 | 1;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
  e: number;
  f: number;
  /** Airborne balls above this height pass over. */
  h: number;
  /** Extra kick away from the surface, for rubber bands. */
  boost: number;
  mat: Mat;
  name: string;
  mover?: Mover;
  lax: number;
  lay: number;
  lbx: number;
  lby: number;
}

export type Shape =
  | { t: 'rect'; x: number; y: number; ux: number; uy: number; hw: number; hh: number }
  | { t: 'circle'; x: number; y: number; r: number }
  | { t: 'poly'; pts: [number, number][] };

export interface Zone {
  shape: Shape;
  mu?: number;
  ax?: number;
  ay?: number;
  /** Acceleration toward the centre at the rim. Negative pushes outward. */
  radial?: number;
  beltX?: number;
  beltY?: number;
  /** Surface rotation in rad/s about the circle centre. */
  spin?: number;
  grip?: number;
  hazard?: 'water' | 'gap';
  /** Sound and rolling noise for this surface. */
  surface?: string;
}

export interface Ramp {
  shape: Extract<Shape, { t: 'rect' }>;
  slope: number;
  rise: number;
  len: number;
  /** Low end of the ramp and uphill direction. */
  sx: number;
  sy: number;
  ux: number;
  uy: number;
}

export interface Portal {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  name: string;
}

export type SimEvent =
  | { t: 'hit'; x: number; y: number; speed: number; mat: Mat; name: string; nx: number; ny: number; bumper: boolean }
  | { t: 'launch'; speed: number }
  | { t: 'land'; x: number; y: number; speed: number }
  | { t: 'lip'; x: number; y: number }
  | { t: 'sunk'; dunk: boolean }
  | { t: 'fall'; kind: 'water' | 'gap'; x: number; y: number; free?: boolean }
  | { t: 'portalIn'; name: string }
  | { t: 'portalOut'; x: number; y: number }
  | { t: 'stop' };

export type BallState = 'rest' | 'moving' | 'portal' | 'sunk' | 'fallen';

export interface WorldData {
  cols: Col[];
  movers: Mover[];
  zones: Zone[];
  ramps: Ramp[];
  portals: Portal[];
  field: [number, number][];
  cupX: number;
  cupY: number;
  baseMu: number;
  windX: number;
  windY: number;
}

export function inPoly(pts: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function inShape(s: Shape, x: number, y: number): boolean {
  if (s.t === 'circle') {
    const dx = x - s.x;
    const dy = y - s.y;
    return dx * dx + dy * dy <= s.r * s.r;
  }
  if (s.t === 'rect') {
    const dx = x - s.x;
    const dy = y - s.y;
    return Math.abs(dx * s.ux + dy * s.uy) <= s.hw && Math.abs(-dx * s.uy + dy * s.ux) <= s.hh;
  }
  return inPoly(s.pts, x, y);
}

// Results of the last sweep. Kept out of the return value so the hot loop doesn't allocate.
let hitNx = 0;
let hitNy = 0;

/** Earliest time in [0, 1] a point moving by (dx, dy) reaches distance R from (cx, cy), or 2. */
function sweepCircle(px: number, py: number, dx: number, dy: number, cx: number, cy: number, R: number): number {
  const mx = px - cx;
  const my = py - cy;
  const md = mx * dx + my * dy;
  const c = mx * mx + my * my - R * R;
  if (c <= 0) {
    if (md >= 0) return 2;
    const m = Math.sqrt(mx * mx + my * my) || 1;
    hitNx = mx / m;
    hitNy = my / m;
    return 0;
  }
  if (md >= 0) return 2;
  const a = dx * dx + dy * dy;
  if (a < 1e-12) return 2;
  const disc = md * md - a * c;
  if (disc < 0) return 2;
  const t = (-md - Math.sqrt(disc)) / a;
  if (t < 0 || t > 1) return 2;
  const hx = mx + dx * t;
  const hy = my + dy * t;
  const m = Math.sqrt(hx * hx + hy * hy) || 1;
  hitNx = hx / m;
  hitNy = hy / m;
  return t;
}

/** Same for a capsule: the flat sides first, then the rounded ends. */
function sweepCapsule(px: number, py: number, dx: number, dy: number, c: Col, R: number): number {
  const ex = c.bx - c.ax;
  const ey = c.by - c.ay;
  const l2 = ex * ex + ey * ey;
  if (l2 < 1e-9) return sweepCircle(px, py, dx, dy, c.ax, c.ay, R);
  const len = Math.sqrt(l2);
  let nx = -ey / len;
  let ny = ex / len;
  let d0 = (px - c.ax) * nx + (py - c.ay) * ny;
  if (d0 < 0) {
    nx = -nx;
    ny = -ny;
    d0 = -d0;
  }
  const dn = dx * nx + dy * ny;
  if (dn < 0) {
    let t = (R - d0) / dn;
    if (t < 0) t = 0;
    if (t <= 1) {
      const u = ((px + dx * t - c.ax) * ex + (py + dy * t - c.ay) * ey) / l2;
      if (u >= 0 && u <= 1) {
        hitNx = nx;
        hitNy = ny;
        return t;
      }
    }
  }
  const t1 = sweepCircle(px, py, dx, dy, c.ax, c.ay, R);
  const n1x = hitNx;
  const n1y = hitNy;
  const t2 = sweepCircle(px, py, dx, dy, c.bx, c.by, R);
  if (t1 <= t2) {
    hitNx = n1x;
    hitNy = n1y;
    return t1;
  }
  return t2;
}

export class Sim {
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  air = false;
  t = 0;
  state: BallState = 'rest';
  /** What's under the ball right now. Drives rolling noise. */
  surface = '';
  /** Walls touched on the current stroke, and the last one hit. */
  banks = 0;
  lastBank = '';
  flew = false;
  events: SimEvent[] = [];

  private restFor = 0;
  private movingFor = 0;
  private portalLeft = 0;
  private portal: Portal | null = null;
  private lastCol: Col | null = null;
  private lastColT = -1;
  private onRamp: Ramp | null = null;
  private lipCool = 0;

  constructor(public w: WorldData) {
    this.movers();
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.z = 0;
    this.vx = this.vy = this.vz = 0;
    this.air = false;
    this.onRamp = null;
    this.state = 'rest';
    this.restFor = 0;
    this.movingFor = 0;
    this.portal = null;
  }

  shoot(angle: number, speed: number): void {
    if (this.state !== 'rest') return;
    this.vx += Math.cos(angle) * speed;
    this.vy += Math.sin(angle) * speed;
    this.state = 'moving';
    this.restFor = 0;
    this.movingFor = 0;
    this.banks = 0;
    this.lastBank = '';
    this.flew = false;
    this.lastCol = null;
  }

  /** Where a straight shot first touches something, for the aim guide. */
  raycast(angle: number, dist: number): { t: number; nx: number; ny: number } | null {
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    let best = 2;
    let nx = 0;
    let ny = 0;
    for (const c of this.w.cols) {
      if (c.h <= this.z + SKIN) continue;
      const R = BALL_R + c.r;
      const t = c.kind === 1 ? sweepCircle(this.x, this.y, dx, dy, c.ax, c.ay, R) : sweepCapsule(this.x, this.y, dx, dy, c, R);
      if (t < best) {
        best = t;
        nx = hitNx;
        ny = hitNy;
      }
    }
    return best <= 1 ? { t: best, nx, ny } : null;
  }

  step(): void {
    this.t += DT;
    this.movers();
    if (this.lipCool > 0) this.lipCool -= DT;

    if (this.state === 'sunk' || this.state === 'fallen') return;
    if (this.state === 'portal') {
      this.portalLeft -= DT;
      if (this.portalLeft <= 0 && this.portal) {
        const p = this.portal;
        this.x = p.ox;
        this.y = p.oy;
        this.vx = p.vx;
        this.vy = p.vy;
        this.state = 'moving';
        this.portal = null;
        this.events.push({ t: 'portalOut', x: p.ox, y: p.oy });
      }
      return;
    }

    if (this.air) {
      this.vz -= GRAVITY * DT;
      this.z += this.vz * DT;
    } else {
      this.roll();
    }

    this.move();
    this.separate();
    if (this.state !== 'moving' && this.state !== 'rest') return;
    this.ground();
    if (this.state !== 'moving' && this.state !== 'rest') return;
    this.checks();
    this.settle();
  }

  private movers(): void {
    const w = this.w;
    for (const m of w.movers) m.pose(this.t, m);
    for (const c of w.cols) {
      const m = c.mover;
      if (!m) continue;
      const cs = Math.cos(m.ang);
      const sn = Math.sin(m.ang);
      c.ax = m.x + c.lax * cs - c.lay * sn;
      c.ay = m.y + c.lax * sn + c.lay * cs;
      c.bx = m.x + c.lbx * cs - c.lby * sn;
      c.by = m.y + c.lbx * sn + c.lby * cs;
    }
  }

  /** Friction, slopes and moving surfaces for a ball on the ground. */
  private roll(): void {
    const w = this.w;
    let mu = w.baseMu;
    let ax = w.windX;
    let ay = w.windY;
    let sx = 0;
    let sy = 0;
    let grip = 0;
    let surface = '';
    for (const z of w.zones) {
      if (!inShape(z.shape, this.x, this.y)) continue;
      if (z.mu !== undefined) mu *= z.mu;
      if (z.ax !== undefined) ax += z.ax;
      if (z.ay !== undefined) ay += z.ay;
      if (z.surface) surface = z.surface;
      if (z.radial !== undefined && z.shape.t === 'circle') {
        const dx = z.shape.x - this.x;
        const dy = z.shape.y - this.y;
        const f = z.radial / z.shape.r;
        ax += dx * f;
        ay += dy * f;
      }
      if (z.beltX !== undefined) {
        sx = z.beltX;
        sy = z.beltY ?? 0;
        grip = z.grip ?? 0;
      }
      if (z.spin !== undefined && z.shape.t === 'circle') {
        sx = -(this.y - z.shape.y) * z.spin;
        sy = (this.x - z.shape.x) * z.spin;
        grip = z.grip ?? 0;
      }
    }
    this.surface = surface;

    const ramp = this.onRamp;
    if (ramp) {
      ax -= ramp.ux * ramp.slope * GRAVITY;
      ay -= ramp.uy * ramp.slope * GRAVITY;
    }

    // The cup's lip tips slow balls in.
    const cx = w.cupX - this.x;
    const cy = w.cupY - this.y;
    const cd2 = cx * cx + cy * cy;
    if (cd2 < (CUP_R + 3) * (CUP_R + 3) && cd2 > 0.01) {
      const cd = Math.sqrt(cd2);
      ax += (cx / cd) * 620;
      ay += (cy / cd) * 620;
    }

    this.vx += ax * DT;
    this.vy += ay * DT;

    // A gripping surface drags the ball toward its own velocity.
    if (grip > 0) {
      const k = 1 - Math.exp(-grip * DT);
      this.vx += (sx - this.vx) * k;
      this.vy += (sy - this.vy) * k;
    }

    const rx = this.vx - sx * (grip > 0 ? 1 : 0);
    const ry = this.vy - sy * (grip > 0 ? 1 : 0);
    const sp = Math.sqrt(rx * rx + ry * ry);
    // Anything rolling for far too long gets slowed, so no shot can run forever.
    const tired = this.movingFor > 14 ? 6 : 1;
    const dec = (mu * ROLL_DECEL * tired + ROLL_DRAG * sp) * DT;
    if (sp <= dec) {
      this.vx -= rx;
      this.vy -= ry;
    } else {
      const k = dec / sp;
      this.vx -= rx * k;
      this.vy -= ry * k;
    }
  }

  /** Moves the ball along its path, stopping at each contact on the way. */
  private move(): void {
    const cols = this.w.cols;
    let remain = 1;
    for (let iter = 0; iter < 6 && remain > 1e-6; iter++) {
      const dx = this.vx * DT * remain;
      const dy = this.vy * DT * remain;
      if (dx === 0 && dy === 0) return;
      let best = 2;
      let bn = 0;
      let bm = 0;
      let bc: Col | null = null;
      const minX = Math.min(this.x, this.x + dx) - BALL_R - 2;
      const maxX = Math.max(this.x, this.x + dx) + BALL_R + 2;
      const minY = Math.min(this.y, this.y + dy) - BALL_R - 2;
      const maxY = Math.max(this.y, this.y + dy) + BALL_R + 2;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (c.h <= this.z + SKIN) continue;
        const bxx = c.kind === 1 ? c.ax : c.bx;
        const byy = c.kind === 1 ? c.ay : c.by;
        if (Math.max(c.ax, bxx) + c.r < minX || Math.min(c.ax, bxx) - c.r > maxX) continue;
        if (Math.max(c.ay, byy) + c.r < minY || Math.min(c.ay, byy) - c.r > maxY) continue;
        const R = BALL_R + c.r;
        let rdx = dx;
        let rdy = dy;
        if (c.mover) {
          const [mvx, mvy] = this.pointVel(c.mover, this.x, this.y);
          rdx -= mvx * DT * remain;
          rdy -= mvy * DT * remain;
        }
        const t = c.kind === 1 ? sweepCircle(this.x, this.y, rdx, rdy, c.ax, c.ay, R) : sweepCapsule(this.x, this.y, rdx, rdy, c, R);
        if (t < best) {
          best = t;
          bn = hitNx;
          bm = hitNy;
          bc = c;
        }
      }
      if (!bc) {
        this.x += dx;
        this.y += dy;
        return;
      }
      this.x += dx * best + bn * SKIN;
      this.y += dy * best + bm * SKIN;
      this.bounce(bc, bn, bm);
      remain *= 1 - best;
    }
  }

  private pointVel(m: Mover, x: number, y: number): [number, number] {
    return [m.vx - (y - m.y) * m.w, m.vy + (x - m.x) * m.w];
  }

  private bounce(c: Col, nx: number, ny: number): void {
    let cvx = 0;
    let cvy = 0;
    if (c.mover) [cvx, cvy] = this.pointVel(c.mover, this.x, this.y);
    const rvx = this.vx - cvx;
    const rvy = this.vy - cvy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const speed = -vn;
    const tx = rvx - vn * nx;
    const ty = rvy - vn * ny;
    // Soft taps die on the wall rather than chattering.
    const e = speed < 26 ? c.e * 0.4 : c.e;
    const out = speed * e + (speed > 30 ? c.boost : 0);
    this.vx = cvx + tx * c.f + nx * out;
    this.vy = cvy + ty * c.f + ny * out;

    if (speed > 12) {
      this.events.push({ t: 'hit', x: this.x - nx * BALL_R, y: this.y - ny * BALL_R, speed, mat: c.mat, name: c.name, nx, ny, bumper: c.boost > 0 });
    }
    // A bank counts once per wall per bounce, and only if it was a real hit.
    const repeat = c === this.lastCol && this.t - this.lastColT < 0.25;
    if (speed > 45 && !repeat && this.state === 'moving') {
      this.banks++;
      this.lastBank = c.name;
    }
    this.lastCol = c;
    this.lastColT = this.t;
  }

  /** Pushes the ball out of anything that moved into it. */
  private separate(): void {
    const cols = this.w.cols;
    let worst = 0;
    for (let pass = 0; pass < 3; pass++) {
      worst = 0;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (c.h <= this.z + SKIN) continue;
        let qx = c.ax;
        let qy = c.ay;
        if (c.kind === 0) {
          const ex = c.bx - c.ax;
          const ey = c.by - c.ay;
          const l2 = ex * ex + ey * ey;
          const u = l2 > 0 ? Math.max(0, Math.min(1, ((this.x - c.ax) * ex + (this.y - c.ay) * ey) / l2)) : 0;
          qx += ex * u;
          qy += ey * u;
        }
        const dx = this.x - qx;
        const dy = this.y - qy;
        const R = BALL_R + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        const d = Math.sqrt(d2) || 0.001;
        const pen = R - d;
        if (pen > worst) worst = pen;
        const nx = dx / d;
        const ny = dy / d;
        this.x += nx * (pen + SKIN);
        this.y += ny * (pen + SKIN);
        if (c.mover) {
          const was = this.state;
          if (was === 'rest') this.state = 'moving';
          this.bounce(c, nx, ny);
        }
      }
      if (worst < 0.05) break;
    }
    // Pinched between a mover and a wall. Give the ball back rather than let it squeeze through.
    if (worst > BALL_R * 0.7) {
      this.state = 'fallen';
      this.events.push({ t: 'fall', kind: 'gap', x: this.x, y: this.y, free: true });
    }
  }

  /** Ramps, flight and landing. */
  private ground(): void {
    const w = this.w;
    let ramp: Ramp | null = null;
    let gz = 0;
    for (const r of w.ramps) {
      if (!inShape(r.shape, this.x, this.y)) continue;
      const s = (this.x - r.sx) * r.ux + (this.y - r.sy) * r.uy;
      ramp = r;
      gz = Math.max(0, Math.min(r.rise, s * r.slope));
      break;
    }

    if (this.air) {
      if (this.z > gz) return;
      this.z = gz;
      const down = -this.vz;
      if (down > 70) {
        this.vz = down * 0.34;
        this.vx *= 0.9;
        this.vy *= 0.9;
        this.events.push({ t: 'land', x: this.x, y: this.y, speed: down });
        this.dunk();
        return;
      }
      this.air = false;
      this.vz = 0;
      this.onRamp = ramp;
      return;
    }

    if (this.onRamp && !ramp && this.z > 2) {
      const r = this.onRamp;
      const along = this.vx * r.ux + this.vy * r.uy;
      this.air = true;
      this.flew = true;
      this.vz = Math.max(0, along * r.slope);
      this.onRamp = null;
      this.events.push({ t: 'launch', speed: Math.hypot(this.vx, this.vy) });
      return;
    }
    this.onRamp = ramp;
    this.z = gz;
  }

  /** A ball coming down inside the cup stays there. */
  private dunk(): void {
    const dx = this.x - this.w.cupX;
    const dy = this.y - this.w.cupY;
    if (dx * dx + dy * dy < (CUP_R - 1) * (CUP_R - 1)) {
      this.state = 'sunk';
      this.vx = this.vy = this.vz = 0;
      this.events.push({ t: 'sunk', dunk: true });
    }
  }

  private checks(): void {
    const w = this.w;
    if (this.air) {
      // Past the edge of everything, there's nothing to come back to.
      if (this.x < -60 || this.x > WORLD_W + 60 || this.y < -60 || this.y > WORLD_H + 60) this.fall('gap');
      return;
    }

    const dx = this.x - w.cupX;
    const dy = this.y - w.cupY;
    const d2 = dx * dx + dy * dy;
    if (d2 < (CUP_R - 3) * (CUP_R - 3)) {
      const sp = Math.hypot(this.vx, this.vy);
      if (sp < CUP_CAPTURE) {
        this.state = 'sunk';
        this.vx = this.vy = 0;
        this.events.push({ t: 'sunk', dunk: false });
        return;
      }
      if (this.lipCool <= 0) {
        // Too hot: it catches the far lip and hops.
        this.lipCool = 0.3;
        const d = Math.sqrt(d2) || 1;
        const k = 0.28 * ((dx * this.vy - dy * this.vx) / (d * sp));
        const c = Math.cos(k);
        const s = Math.sin(k);
        const vx = this.vx * c - this.vy * s;
        const vy = this.vx * s + this.vy * c;
        this.vx = vx * 0.8;
        this.vy = vy * 0.8;
        this.air = true;
        this.vz = 70;
        this.z = 0.5;
        this.events.push({ t: 'lip', x: this.x, y: this.y });
        return;
      }
    }

    for (const z of w.zones) {
      if (z.hazard && inShape(z.shape, this.x, this.y)) {
        this.fall(z.hazard);
        return;
      }
    }
    if (!inPoly(w.field, this.x, this.y)) {
      this.fall('gap');
      return;
    }
    for (const p of w.portals) {
      const px = this.x - p.x;
      const py = this.y - p.y;
      if (px * px + py * py < 13 * 13) {
        this.state = 'portal';
        this.portal = p;
        this.portalLeft = 0.75;
        this.vx = this.vy = 0;
        this.events.push({ t: 'portalIn', name: p.name });
        return;
      }
    }
  }

  private fall(kind: 'water' | 'gap'): void {
    this.state = 'fallen';
    this.events.push({ t: 'fall', kind, x: this.x, y: this.y });
  }

  private settle(): void {
    const sp = Math.hypot(this.vx, this.vy);
    if (this.state === 'moving') {
      this.movingFor += DT;
      let carried = 0;
      if (!this.air && sp >= REST_SPEED) carried = this.surfaceSpeed();
      if (!this.air && (sp < REST_SPEED || Math.abs(sp - carried) < REST_SPEED * 0.6)) {
        this.restFor += DT;
        if (this.restFor > (this.onRamp ? 0.4 : 0.14)) {
          this.state = 'rest';
          this.events.push({ t: 'stop' });
        }
      } else {
        this.restFor = 0;
      }
    } else if (sp > REST_SPEED * 3 && this.surfaceSpeed() === 0) {
      // Something nudged it while it sat still.
      this.state = 'moving';
      this.restFor = 0;
      this.movingFor = 0;
    }
  }

  private surfaceSpeed(): number {
    for (const z of this.w.zones) {
      if (z.grip === undefined || !inShape(z.shape, this.x, this.y)) continue;
      if (z.beltX !== undefined) return Math.hypot(z.beltX, z.beltY ?? 0);
      if (z.spin !== undefined && z.shape.t === 'circle') return Math.abs(z.spin) * Math.hypot(this.x - z.shape.x, this.y - z.shape.y);
    }
    return 0;
  }
}
