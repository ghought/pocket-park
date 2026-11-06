import { MATS, type Col, type Mover, type Ramp, type Shape, type WorldData, type Zone } from './physics';
import type { HoleDef, Mat, Prop, Pt, TwistId, WallDef, ZoneShape } from './types';

const TALL = 1e6;

function shapeOf(s: ZoneShape): Shape {
  if ('pts' in s) return { t: 'poly', pts: s.pts };
  if ('r' in s) return { t: 'circle', x: s.x, y: s.y, r: s.r };
  return rect(s.x, s.y, s.w, s.h, s.a ?? 0);
}

function rect(x: number, y: number, w: number, h: number, a: number): Extract<Shape, { t: 'rect' }> {
  return { t: 'rect', x, y, ux: Math.cos(a), uy: Math.sin(a), hw: w / 2, hh: h / 2 };
}

function col(mat: Mat, name: string, h = TALL): Pick<Col, 'e' | 'f' | 'h' | 'boost' | 'mat' | 'name'> {
  return { e: MATS[mat].e, f: MATS[mat].f, h, boost: 0, mat, name };
}

function seg(ax: number, ay: number, bx: number, by: number, r: number, mat: Mat, name: string, h = TALL): Col {
  return { kind: 0, ax, ay, bx, by, r, ...col(mat, name, h), lax: ax, lay: ay, lbx: bx, lby: by };
}

function circ(x: number, y: number, r: number, mat: Mat, name: string, h = TALL): Col {
  return { kind: 1, ax: x, ay: y, bx: x, by: y, r, ...col(mat, name, h), lax: x, lay: y, lbx: x, lby: y };
}

export function boxCorners(x: number, y: number, w: number, h: number, a: number): Pt[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = w / 2;
  const hh = h / 2;
  return ([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as Pt[]).map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
}

const SURFACES: Record<string, { mu: number; surface: string }> = {
  soap: { mu: 0.22, surface: 'slick' },
  syrup: { mu: 4.2, surface: 'sticky' },
  ketchup: { mu: 3.4, surface: 'sticky' },
  towel: { mu: 2.8, surface: 'cloth' },
  sock: { mu: 3.2, surface: 'cloth' },
  mat: { mu: 2.2, surface: 'cloth' },
  gravel: { mu: 2.6, surface: 'gravel' },
};

function addProp(p: Prop, w: WorldData): void {
  const { cols, zones, ramps, portals, movers } = w;
  switch (p.k) {
    case 'box': {
      const pts = boxCorners(p.x, p.y, p.w, p.h, p.a ?? 0);
      const mat = p.mat ?? 'wood';
      for (let i = 0; i < 4; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % 4];
        cols.push(seg(ax, ay, bx, by, 0, mat, p.name ?? p.skin, p.tall ?? TALL));
      }
      break;
    }
    case 'disc':
      cols.push(circ(p.x, p.y, p.r, p.mat ?? 'ceramic', p.name ?? p.skin, p.tall ?? TALL));
      break;
    case 'band': {
      const c = seg(p.x1, p.y1, p.x2, p.y2, 2, 'rubber', p.name ?? 'rubber band');
      c.e = 0.9;
      c.boost = 130;
      cols.push(c);
      cols.push(circ(p.x1, p.y1, 5, 'metal', 'pin'), circ(p.x2, p.y2, 5, 'metal', 'pin'));
      break;
    }
    case 'rail':
      cols.push(seg(p.x1, p.y1, p.x2, p.y2, 3, 'metal', p.name ?? 'rail', p.tall ?? 14));
      break;
    case 'bowl':
      zones.push({ shape: { t: 'circle', x: p.x, y: p.y, r: p.r }, mu: p.mu ?? 3.6, radial: p.pull ?? 760, surface: p.skin });
      break;
    case 'dome':
      zones.push({ shape: { t: 'circle', x: p.x, y: p.y, r: p.r }, radial: -(p.push ?? 900), surface: 'dome' });
      break;
    case 'ramp': {
      const ux = Math.cos(p.a);
      const uy = Math.sin(p.a);
      const nx = -uy;
      const ny = ux;
      const hl = p.len / 2;
      const hw = p.w / 2;
      const sx = p.x - ux * hl;
      const sy = p.y - uy * hl;
      const ex = p.x + ux * hl;
      const ey = p.y + uy * hl;
      const r: Ramp = { shape: rect(p.x, p.y, p.len, p.w, p.a), slope: p.rise / p.len, rise: p.rise, len: p.len, sx, sy, ux, uy };
      ramps.push(r);
      const name = p.name ?? p.skin;
      cols.push(seg(sx + nx * hw, sy + ny * hw, ex + nx * hw, ey + ny * hw, 1.5, 'wood', name, p.rise + 5));
      cols.push(seg(sx - nx * hw, sy - ny * hw, ex - nx * hw, ey - ny * hw, 1.5, 'wood', name, p.rise + 5));
      // The back face only has to stop balls on the floor. Any taller and it catches a ball leaving the lip.
      cols.push(seg(ex + nx * hw, ey + ny * hw, ex - nx * hw, ey - ny * hw, 1.5, 'wood', name, p.rise * 0.5));
      break;
    }
    case 'patch':
      zones.push({ shape: shapeOf(p.shape), ...SURFACES[p.skin] });
      break;
    case 'hazard':
      zones.push({ shape: shapeOf(p.shape), hazard: p.skin === 'gap' ? 'gap' : 'water' });
      break;
    case 'slope':
      zones.push({ shape: rect(p.x, p.y, p.w, p.h, 0), ax: Math.cos(p.a) * p.acc, ay: Math.sin(p.a) * p.acc, surface: 'slope' });
      break;
    case 'belt':
      zones.push({ shape: rect(p.x, p.y, p.w, p.h, 0), beltX: Math.cos(p.a) * p.speed, beltY: Math.sin(p.a) * p.speed, grip: 1.6, surface: 'belt' });
      break;
    case 'turntable': {
      zones.push({ shape: { t: 'circle', x: p.x, y: p.y, r: p.r }, spin: p.spin, grip: 1.2, surface: 'spin' });
      if (p.riders?.length) {
        const m = spinMover(p.x, p.y, p.spin, 0);
        movers.push(m);
        for (const r of p.riders) {
          const c = circ(0, 0, r.r, 'ceramic', r.skin);
          c.lax = c.lbx = Math.cos(r.ang) * r.dist;
          c.lay = c.lby = Math.sin(r.ang) * r.dist;
          c.mover = m;
          cols.push(c);
        }
      }
      break;
    }
    case 'wind':
      zones.push({ shape: rect(p.x, p.y, p.w, p.h, 0), ax: Math.cos(p.a) * p.acc, ay: Math.sin(p.a) * p.acc, surface: 'wind' });
      break;
    case 'portal':
      portals.push({ x: p.x, y: p.y, ox: p.ox, oy: p.oy, vx: Math.cos(p.oa) * p.speed, vy: Math.sin(p.oa) * p.speed, name: p.name ?? p.skin });
      break;
    case 'spinner': {
      const m = spinMover(p.x, p.y, p.spin, p.phase ?? 0);
      movers.push(m);
      const hub = p.hub ?? 12;
      const c0 = circ(0, 0, hub, 'metal', p.skin);
      c0.mover = m;
      cols.push(c0);
      for (let i = 0; i < p.arms; i++) {
        const a = (i / p.arms) * Math.PI * 2;
        const c = seg(0, 0, Math.cos(a) * p.len, Math.sin(a) * p.len, 5, 'rubber', p.skin);
        c.e = 0.7;
        c.mover = m;
        cols.push(c);
      }
      break;
    }
    case 'slider': {
      const m = pathMover(p.pts, p.period, p.phase ?? 0);
      movers.push(m);
      const c = circ(0, 0, p.r, 'plastic', p.name ?? p.skin);
      c.mover = m;
      cols.push(c);
      break;
    }
    case 'deco':
      break;
  }
}

export function spinMover(x: number, y: number, w: number, phase: number): Mover {
  return {
    x, y, ang: phase, vx: 0, vy: 0, w,
    pose(t, m) {
      m.ang = phase + w * t;
    },
  };
}

/** Eases back and forth along a path of points, pausing slightly at each end. */
export function pathMover(pts: Pt[], period: number, phase: number): Mover {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  const at = (t: number): Pt => {
    const u = ((t / period + phase) % 1 + 1) % 1;
    const tri = u < 0.5 ? u * 2 : 2 - u * 2;
    const s = (1 - Math.cos(tri * Math.PI)) / 2;
    let d = s * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const f = lens[i] > 0 ? Math.min(1, d / lens[i]) : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
      }
      d -= lens[i];
    }
    return pts[0];
  };
  return {
    x: pts[0][0], y: pts[0][1], ang: 0, vx: 0, vy: 0, w: 0,
    pose(t, m) {
      const [x, y] = at(t);
      const [nx, ny] = at(t + 0.01);
      m.x = x;
      m.y = y;
      m.vx = (nx - x) / 0.01;
      m.vy = (ny - y) / 0.01;
      if (Math.abs(m.vx) + Math.abs(m.vy) > 1) m.ang = 0;
    },
  };
}

function addWall(wall: WallDef, cols: Col[]): void {
  const pts = wall.pts;
  const n = wall.closed ? pts.length : pts.length - 1;
  const r = wall.r ?? 5;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    cols.push(seg(ax, ay, bx, by, r, wall.mat ?? 'wood', wall.name ?? 'wall'));
  }
}

export const TWISTS: Record<TwistId, { name: string; blurb: string; mu: number; wind?: number }> = {
  none: { name: 'As built', blurb: 'No funny business today.', mu: 1 },
  slick: { name: 'Fresh mop', blurb: 'Somebody just mopped. Everything runs fast.', mu: 0.62 },
  tacky: { name: 'Soda spill', blurb: 'The floor is tacky. Hit it harder.', mu: 1.45 },
  draft: { name: 'Open window', blurb: 'A draft drifts everything to one side.', mu: 1, wind: 90 },
};

/** Turns hole data into the sim's colliders and zones. */
export function buildWorld(def: HoleDef, twist: TwistId = 'none', windDir = 1): WorldData {
  const t = TWISTS[twist];
  const w: WorldData = {
    cols: [],
    movers: [],
    zones: [] as Zone[],
    ramps: [],
    portals: [],
    field: def.field,
    cupX: def.cup[0],
    cupY: def.cup[1],
    baseMu: t.mu,
    windX: (t.wind ?? 0) * windDir,
    windY: 0,
  };
  for (const wall of def.walls) addWall(wall, w.cols);
  for (const p of def.props) addProp(p, w);
  return w;
}

/** Flips a hole left to right, for the daily course. */
export function mirrorHole(def: HoleDef): HoleDef {
  const W = 360;
  const mp = (p: Pt): Pt => [W - p[0], p[1]];
  const mShape = (s: ZoneShape): ZoneShape => {
    if ('pts' in s) return { pts: s.pts.map(mp).reverse() };
    if ('r' in s) return { ...s, x: W - s.x };
    return { ...s, x: W - s.x, a: -(s.a ?? 0) };
  };
  const mProp = (p: Prop): Prop => {
    switch (p.k) {
      case 'band':
      case 'rail':
        return { ...p, x1: W - p.x1, x2: W - p.x2 };
      case 'patch':
      case 'hazard':
        return { ...p, shape: mShape(p.shape) };
      case 'ramp':
      case 'slope':
      case 'belt':
      case 'wind':
        return { ...p, x: W - p.x, a: Math.PI - p.a };
      case 'turntable':
        return { ...p, x: W - p.x, spin: -p.spin, riders: p.riders?.map((r) => ({ ...r, ang: Math.PI - r.ang })) };
      case 'portal':
        return { ...p, x: W - p.x, ox: W - p.ox, oa: Math.PI - p.oa };
      case 'spinner':
        return { ...p, x: W - p.x, spin: -p.spin, phase: Math.PI - (p.phase ?? 0) };
      case 'slider':
        return { ...p, pts: p.pts.map(mp) };
      case 'box':
      case 'deco':
        return { ...p, x: W - p.x, a: -(p.a ?? 0) };
      default:
        return { ...p, x: W - p.x };
    }
  };
  return {
    ...def,
    tee: mp(def.tee),
    cup: mp(def.cup),
    field: def.field.map(mp).reverse(),
    walls: def.walls.map((w) => ({ ...w, pts: w.pts.map(mp) })),
    props: def.props.map(mProp),
  };
}
