/*
 * Plays every hole headlessly. `npm run check`
 *
 * For each hole it reports the fewest strokes a search can find, how a decent
 * but imperfect player scores, and whether the bank-shot medal is reachable.
 * It also fires random shots to catch tunnelling, stuck balls and NaNs.
 * Exits non-zero if any hole fails.
 */
import { HOLES } from '../src/content/holes';
import { BALL_R, DT, MAX_SHOT, Sim, inPoly, inShape, type Col } from '../src/core/physics';
import { buildWorld, mirrorHole } from '../src/core/world';
import type { HoleDef, TwistId } from '../src/core/types';

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

type Result = { kind: 'sunk' | 'fall' | 'rest'; x: number; y: number; banks: number; time: number };

function fire(def: HoleDef, x: number, y: number, ang: number, power: number, twist: TwistId, t0: number): Result {
  const sim = new Sim(buildWorld(def, twist));
  sim.t = t0;
  sim.place(x, y);
  sim.step();
  sim.shoot(ang, power);
  let steps = 0;
  const limit = 30 / DT;
  while (steps++ < limit) {
    sim.step();
    if (!Number.isFinite(sim.x + sim.y)) throw new Error(`NaN on ${def.id}`);
    if (sim.state === 'sunk') return { kind: 'sunk', x: sim.x, y: sim.y, banks: sim.banks, time: steps * DT };
    if (sim.state === 'fallen') return { kind: 'fall', x, y, banks: 0, time: steps * DT };
    if (sim.state === 'rest') return { kind: 'rest', x: sim.x, y: sim.y, banks: sim.banks, time: steps * DT };
  }
  throw new Error(`Shot never finished on ${def.id} from ${x.toFixed(0)},${y.toFixed(0)} ang ${ang.toFixed(2)} power ${power.toFixed(0)}`);
}

/** Walking distance to the cup on a grid, so a player can tell progress from a dead end. */
function distanceMap(def: HoleDef) {
  const G = 8;
  const W = 46;
  const H = 79;
  const w = buildWorld(def);
  const free = (x: number, y: number) => {
    if (!inPoly(w.field, x, y)) return false;
    for (const z of w.zones) if (z.hazard && inShape(z.shape, x, y)) return false;
    return !w.cols.some((c) => !c.mover && c.h > 100 && dist(c, x, y) < BALL_R);
  };
  const d = new Float32Array(W * H).fill(1e9);
  const q: number[] = [];
  const start = Math.round(def.cup[1] / G) * W + Math.round(def.cup[0] / G);
  d[start] = 0;
  q.push(start);
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    const cx = c % W;
    const cy = (c / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx;
      if (d[n] < 1e9 || !free(nx * G, ny * G)) continue;
      d[n] = d[c] + 1;
      q.push(n);
    }
  }
  return (x: number, y: number) => d[Math.round(y / G) * W + Math.round(x / G)] ?? 1e9;
}

function dist(c: Col, x: number, y: number): number {
  if (c.kind === 1) return Math.hypot(x - c.ax, y - c.ay) - c.r;
  const ex = c.bx - c.ax;
  const ey = c.by - c.ay;
  const l2 = ex * ex + ey * ey || 1;
  const u = Math.max(0, Math.min(1, ((x - c.ax) * ex + (y - c.ay) * ey) / l2));
  return Math.hypot(x - c.ax - ex * u, y - c.ay - ey * u) - c.r;
}

/** Fewest strokes by a wide, shallow search. */
function search(def: HoleDef, twist: TwistId, shots: number, depthCap: number) {
  const dm = distanceMap(def);
  let frontier: [number, number][] = [def.tee];
  let bank = false;
  let best = 99;
  for (let depth = 1; depth <= depthCap; depth++) {
    const next = new Map<string, [number, number]>();
    for (const [x, y] of frontier) {
      for (let i = 0; i < shots; i++) {
        const ang = rnd() * Math.PI * 2;
        const pow = MAX_SHOT * (0.15 + 0.85 * Math.pow(rnd(), 0.7));
        const r = fire(def, x, y, ang, pow, twist, rnd() * 20);
        if (r.kind === 'sunk') {
          best = Math.min(best, depth);
          if (r.banks >= 2) bank = true;
        } else if (r.kind === 'rest') {
          next.set(`${Math.round(r.x / 14)},${Math.round(r.y / 14)}`, [r.x, r.y]);
        }
      }
    }
    frontier = [...next.values()].sort((a, b) => dm(a[0], a[1]) - dm(b[0], b[1])).slice(0, 14);
    if (best < 99 && (bank || depth >= best + 1)) break;
  }
  return { best, bank };
}

/** A decent player: thinks of a good shot, then misses it by a little. */
function player(def: HoleDef, twist: TwistId): number {
  const dm = distanceMap(def);
  let [x, y] = def.tee;
  for (let strokes = 1; strokes <= 12; strokes++) {
    let bestScore = 1e9;
    let ang = 0;
    let pow = 0;
    for (let i = 0; i < 90; i++) {
      const a = rnd() * Math.PI * 2;
      const p = MAX_SHOT * (0.15 + 0.85 * rnd());
      const r = fire(def, x, y, a, p, twist, rnd() * 20);
      const score = r.kind === 'sunk' ? -1 : r.kind === 'fall' ? 9e8 : dm(r.x, r.y);
      if (score < bestScore) {
        bestScore = score;
        ang = a;
        pow = p;
      }
    }
    const r = fire(def, x, y, ang + (rnd() - 0.5) * 0.09, pow * (0.93 + rnd() * 0.14), twist, rnd() * 20);
    if (r.kind === 'sunk') return strokes;
    if (r.kind === 'fall') {
      strokes++;
      continue;
    }
    x = r.x;
    y = r.y;
  }
  return 13;
}

/** Random shots from the tee and from wherever they stop. */
function fuzz(def: HoleDef, shots: number): number {
  const solid = buildWorld(def).cols.filter((c) => !c.mover);
  let [x, y] = def.tee;
  let worst = 0;
  for (let i = 0; i < shots; i++) {
    const r = fire(def, x, y, rnd() * Math.PI * 2, MAX_SHOT * (0.1 + 0.9 * rnd()), 'none', rnd() * 20);
    worst = Math.max(worst, r.time);
    if (r.kind === 'rest') {
      for (const c of solid) {
        if (c.h > 100 && dist(c, r.x, r.y) < BALL_R - 0.5) throw new Error(`${def.id}: ball rests inside ${c.name} at ${r.x.toFixed(1)},${r.y.toFixed(1)}`);
      }
      if (!inPoly(def.field, r.x, r.y)) throw new Error(`${def.id}: ball rests outside the field`);
      x = r.x;
      y = r.y;
    } else {
      [x, y] = def.tee;
    }
  }
  return worst;
}

/** A ball going straight up a ramp must leave the lip, not bounce off it. */
function rampCheck(): number {
  let bad = 0;
  for (const def of HOLES) {
    for (const p of def.props) {
      if (p.k !== 'ramp') continue;
      const ux = Math.cos(p.a);
      const uy = Math.sin(p.a);
      for (let v = 420; v <= MAX_SHOT; v += 30) {
        const sim = new Sim(buildWorld(def));
        sim.place(p.x - ux * (p.len / 2 + 14), p.y - uy * (p.len / 2 + 14));
        sim.shoot(p.a, v);
        let flew = false;
        for (let i = 0; i < 240 * 3 && sim.state === 'moving'; i++) {
          sim.step();
          flew ||= sim.air;
        }
        if (!flew) {
          console.log(`${def.id}: ramp did not launch at speed ${v}`);
          bad++;
        }
      }
    }
  }
  return bad;
}

const only = process.argv[2];
let failed = rampCheck();
console.log('hole               par  best  avg   bank  longest-shot');
for (const def of HOLES) {
  if (only && !def.id.includes(only)) continue;
  const { best, bank } = search(def, 'none', 500, def.par + 1);
  const plays = Array.from({ length: 24 }, () => player(def, 'none'));
  const avg = plays.reduce((a, b) => a + b, 0) / plays.length;
  const longest = fuzz(def, 500);
  const ok = best < def.par && best !== 99;
  if (!ok || !bank) failed++;
  console.log(`${def.id.padEnd(18)} ${def.par}    ${best}     ${avg.toFixed(1)}   ${bank ? 'yes ' : 'NO  '}  ${longest.toFixed(1)}s${ok ? '' : '  <-- no birdie found'}`);
}

if (!only) {
  console.log('\nDaily twists, mirrored:');
  for (const twist of ['slick', 'tacky', 'draft'] as TwistId[]) {
    const bad = HOLES.filter((h) => search(mirrorHole(h), twist, 300, h.par + 2).best > h.par + 1).map((h) => h.id);
    console.log(`${twist}: ${bad.length ? 'too hard: ' + bad.join(', ') : 'all holes finish within par + 1'}`);
    failed += bad.length;
  }
}
process.exit(failed ? 1 : 0);
