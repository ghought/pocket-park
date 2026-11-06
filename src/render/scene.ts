import { ballById, type BallDesign } from '../content/balls';
import { BALL_R, Sim, WORLD_H, WORLD_W } from '../core/physics';
import type { HoleDef, Prop, TwistId } from '../core/types';
import { drawBallFace, identity, rollBall, type Rot } from './ball';
import { TAU, at, disc, lin, rng, setPaintScale, type C } from './paint';
import {
  drawBand, drawBeltTop, drawCup, drawFlag, drawFloorProp, drawPortalSpin, drawSlider, drawSpinner, drawStaticProp, drawTee, drawTurntable, drawWind,
} from './props';
import { drawBackdrop, drawField, drawWall, type View } from './themes';

export const HUD_H = 54;

export interface Aim {
  ang: number;
  power: number;
  speed: number;
  /** How far the ball would roll on a plain floor. */
  reach: number;
}

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  square: boolean;
  spin: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  grow: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

interface Pop {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

type BallFx = { kind: 'sink' | 'splash' | 'drop' | 'fall'; t: number; x: number; y: number } | null;

export function drawHole(c: C, def: HoleDef, v: View, twist: TwistId = 'none'): void {
  drawBackdrop(c, def, v);
  drawField(c, def);
  def.props.forEach((p, i) => drawFloorProp(c, p, i));
  drawTee(c, def.tee[0], def.tee[1]);
  drawCup(c, def.cup[0], def.cup[1]);
  if (twist === 'slick') {
    c.fillStyle = lin(c, 0, 0, WORLD_W, WORLD_H, 'rgba(170,220,255,.2)', 'rgba(255,255,255,.1)', 'rgba(170,220,255,.22)');
    c.fillRect(0, 0, WORLD_W, WORLD_H);
  } else if (twist === 'tacky') {
    const R = rng(77);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = 'rgba(120,70,20,.1)';
      disc(c, R() * WORLD_W, R() * WORLD_H, 8 + R() * 26);
      c.fill();
    }
  }
  for (const w of def.walls) drawWall(c, w);
  const order = (p: Prop) => (p.k === 'ramp' || p.k === 'rail' || p.k === 'deco' ? 0 : 1);
  [...def.props].sort((a, b) => order(a) - order(b)).forEach((p, i) => drawStaticProp(c, p, i));
}

/** A small still picture of a hole for the menus. */
export function paintThumb(canvas: HTMLCanvasElement, def: HoleDef): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 96;
  const s = (w / WORLD_W) * dpr;
  canvas.width = Math.round(WORLD_W * s);
  canvas.height = Math.round(WORLD_H * s);
  const c = canvas.getContext('2d')!;
  setPaintScale(s);
  c.setTransform(s, 0, 0, s, 0, 0);
  drawHole(c, def, { x0: 0, y0: 0, x1: WORLD_W, y1: WORLD_H });
  for (const p of def.props) {
    if (p.k === 'turntable') drawTurntable(c, p, 0);
    if (p.k === 'spinner') drawSpinner(c, p, p.phase ?? 0);
    if (p.k === 'band') drawBand(c, p, 0, 0);
    if (p.k === 'belt') drawBeltTop(c, p, 0);
    if (p.k === 'slider') drawSlider(c, p.skin, p.pts[0][0], p.pts[0][1], p.r, 1, 0, 0);
  }
  drawFlag(c, def.cup[0], def.cup[1], 0, 0);
}

export class Scene {
  c: C;
  W = 0;
  H = 0;
  dpr = 1;
  scale = 1;
  ox = 0;
  oy = 0;

  private under = document.createElement('canvas');
  private def: HoleDef | null = null;
  private twist: TwistId = 'none';
  private windDir = 1;
  private bits: Bit[] = [];
  private rings: Ring[] = [];
  private pops: Pop[] = [];
  private trail: { x: number; y: number; life: number }[] = [];
  private shakeAmt = 0;
  private flagLift = 0;
  private time = 0;
  private bands: { p: Extract<Prop, { k: 'band' }>; wob: number }[] = [];
  private rot: Rot = identity();
  private lagX = 0;
  private lagY = 0;
  private lagVX = 0;
  private lagVY = 0;
  private fx: BallFx = null;
  private design: BallDesign = ballById('range');

  hint = false;
  reduced = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.c = canvas.getContext('2d', { alpha: false })!;
    this.resize();
  }

  setBall(id: string): void {
    this.design = ballById(id);
  }

  setHole(def: HoleDef, twist: TwistId, windDir: number): void {
    this.def = def;
    this.twist = twist;
    this.windDir = windDir;
    this.bits = [];
    this.rings = [];
    this.pops = [];
    this.trail = [];
    this.fx = null;
    this.flagLift = 0;
    this.bands = def.props.filter((p): p is Extract<Prop, { k: 'band' }> => p.k === 'band').map((p) => ({ p, wob: 0 }));
    this.paintUnder();
  }

  resize(): void {
    const W = Math.max(1, window.innerWidth);
    const H = Math.max(1, window.innerHeight);
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.scale = Math.min(W / WORLD_W, (H - HUD_H - 6) / WORLD_H);
    this.ox = (W - WORLD_W * this.scale) / 2;
    this.oy = HUD_H + (H - HUD_H - WORLD_H * this.scale) / 2;
    this.paintUnder();
  }

  private paintUnder(): void {
    if (!this.def) return;
    const u = this.under;
    u.width = this.canvas.width;
    u.height = this.canvas.height;
    const c = u.getContext('2d')!;
    const s = this.scale * this.dpr;
    setPaintScale(s);
    c.setTransform(s, 0, 0, s, this.ox * this.dpr, this.oy * this.dpr);
    drawHole(c, this.def, this.view(), this.twist);
  }

  private view(): View {
    return {
      x0: -this.ox / this.scale - 4,
      y0: -this.oy / this.scale - 4,
      x1: (this.W - this.ox) / this.scale + 4,
      y1: (this.H - this.oy) / this.scale + 4,
    };
  }

  toWorld(x: number, y: number): [number, number] {
    return [(x - this.ox) / this.scale, (y - this.oy) / this.scale];
  }

  // ---- Effects ----

  shake(n: number): void {
    if (!this.reduced) this.shakeAmt = Math.max(this.shakeAmt, n);
  }

  ring(x: number, y: number, color: string, r = 6, grow = 90, life = 0.4, width = 2.4): void {
    this.rings.push({ x, y, r, grow, life, max: life, color, width });
  }

  pop(x: number, y: number, text: string, color = '#fff', size = 22): void {
    const py = Math.max(y - 16, 40);
    this.pops.push({ x: Math.min(Math.max(x, 70), WORLD_W - 70), y: py, text, color, life: 1.3, max: 1.3, size });
  }

  burst(x: number, y: number, n: number, colors: string[], speed = 120, gravity = 0, size = 2.4, square = false): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.9);
      const life = 0.35 + Math.random() * 0.5;
      this.bits.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: gravity, life, max: life,
        size: size * (0.6 + Math.random() * 0.8), color: colors[(Math.random() * colors.length) | 0], square, spin: Math.random() * TAU,
      });
    }
  }

  confetti(x: number, y: number): void {
    this.burst(x, y, 54, ['#e8503a', '#f7b538', '#2f9d7a', '#5b8def', '#fdf6e3', '#ef8fb0'], 300, 420, 3.6, true);
    this.ring(x, y, '#fff5dc', 12, 170, 0.55, 3);
  }

  wobble(x: number, y: number): void {
    let best = this.bands[0];
    let bd = 1e9;
    for (const b of this.bands) {
      const d = Math.hypot((b.p.x1 + b.p.x2) / 2 - x, (b.p.y1 + b.p.y2) / 2 - y);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    if (best) best.wob = 1;
  }

  ballFx(kind: 'sink' | 'splash' | 'drop' | 'fall', x: number, y: number): void {
    this.fx = { kind, t: 0, x, y };
    if (kind === 'sink') this.flagLift = 1;
  }

  update(dt: number, sim: Sim | null): void {
    this.time += dt;
    for (const b of this.bits) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += b.g * dt;
      b.vx *= 1 - 1.6 * dt;
      b.vy *= 1 - 1.6 * dt;
      b.spin += dt * 9;
    }
    this.bits = this.bits.filter((b) => b.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r += r.grow * dt;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const p of this.pops) {
      p.life -= dt;
      p.y -= 22 * dt;
    }
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const t of this.trail) t.life -= dt * 3.4;
    this.trail = this.trail.filter((t) => t.life > 0);
    this.shakeAmt *= Math.exp(-dt * 11);
    for (const b of this.bands) b.wob *= Math.exp(-dt * 7);
    if (this.fx) this.fx.t += dt;

    if (!sim) return;
    rollBall(this.rot, sim.vx, sim.vy, dt, BALL_R);
    const sp = Math.hypot(sim.vx, sim.vy);
    if ((sp > 300 || sim.air) && sim.state === 'moving') this.trail.push({ x: sim.x, y: sim.y, life: 1 });

    // The googly pupil hangs on a spring and gets thrown about.
    const k = 34;
    const damp = 5;
    this.lagVX += (-this.lagX * k - this.lagVX * damp - sim.vx * 0.05) * dt;
    this.lagVY += (-this.lagY * k - this.lagVY * damp - sim.vy * 0.05) * dt;
    this.lagX += this.lagVX * dt;
    this.lagY += this.lagVY * dt;
    const m = Math.hypot(this.lagX, this.lagY);
    if (m > 1) {
      this.lagX /= m;
      this.lagY /= m;
    }
  }

  // ---- Frame ----

  render(sim: Sim | null, aim: Aim | null, showBall: boolean): void {
    const c = this.c;
    const d = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.def) {
      c.fillStyle = '#17494d';
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    const sx = this.shakeAmt > 0.2 ? (Math.random() - 0.5) * this.shakeAmt * d : 0;
    const sy = this.shakeAmt > 0.2 ? (Math.random() - 0.5) * this.shakeAmt * d : 0;
    c.drawImage(this.under, sx, sy);
    const s = this.scale * d;
    setPaintScale(s);
    c.setTransform(s, 0, 0, s, this.ox * d + sx, this.oy * d + sy);

    const def = this.def;
    const t = sim ? sim.t : this.time;

    // Things that lie on the floor.
    for (const p of def.props) {
      if (p.k === 'belt') drawBeltTop(c, p, t);
      else if (p.k === 'turntable') drawTurntable(c, p, p.spin * t);
      else if (p.k === 'wind') drawWind(c, p, t);
      else if (p.k === 'hazard' && (p.skin === 'sink' || p.skin === 'gap')) this.drawHazardLife(p, t);
    }
    // A cup on a moving floor stays put while the floor turns under it.
    if (def.props.some((p) => p.k === 'turntable')) drawCup(c, def.cup[0], def.cup[1]);
    if (this.twist === 'draft') {
      drawWind(c, { k: 'wind', x: WORLD_W / 2, y: WORLD_H / 2, w: WORLD_W, h: WORLD_H, a: this.windDir > 0 ? 0 : Math.PI, acc: 0, skin: '' }, this.time);
    }

    this.drawTrail();
    if (sim && showBall && !sim.air) this.drawBall(sim);

    if (sim) {
      let mi = 0;
      for (const p of def.props) {
        if (p.k === 'turntable' && p.riders?.length) mi++;
        if (p.k === 'spinner') {
          drawSpinner(c, p, sim.w.movers[mi++].ang);
        } else if (p.k === 'slider') {
          const m = sim.w.movers[mi++];
          drawSlider(c, p.skin, m.x, m.y, p.r, m.vx, m.vy, t);
        } else if (p.k === 'portal' && sim.state === 'portal') {
          drawPortalSpin(c, p.x, p.y - 29, this.time, this.design.base);
        }
      }
    }
    for (const b of this.bands) drawBand(c, b.p, b.wob, this.time);

    this.flagLift = this.flagLift > 0 ? Math.min(1, this.flagLift) : 0;
    drawFlag(c, def.cup[0], def.cup[1], this.time, this.flagLift * 14);

    if (sim && aim) this.drawAim(sim, aim);
    if (sim && showBall && sim.air) this.drawBall(sim);
    if (sim && this.hint) this.drawHint(sim);

    this.drawFx();
  }

  private drawHazardLife(p: Extract<Prop, { k: 'hazard' }>, t: number): void {
    const c = this.c;
    const s = p.shape;
    if (!('w' in s)) return;
    if (p.skin === 'sink') {
      c.save();
      c.beginPath();
      c.rect(s.x - s.w / 2 + 6, s.y - s.h / 2 + 8, s.w - 12, s.h - 14);
      c.clip();
      c.strokeStyle = 'rgba(255,255,255,.28)';
      c.lineWidth = 1.3;
      c.lineCap = 'round';
      const R = rng(3);
      for (let i = 0; i < 8; i++) {
        const x = s.x - s.w / 2 + R() * s.w + Math.sin(t * 0.7 + i) * 8;
        const y = s.y - s.h / 2 + R() * s.h + Math.cos(t * 0.5 + i) * 4;
        c.beginPath();
        c.moveTo(x - 9, y);
        c.quadraticCurveTo(x, y - 2.5, x + 9, y);
        c.stroke();
      }
      c.restore();
    } else if (p.skin === 'gap' && s.w > 40) {
      // Traffic, a long way down.
      const u = (t * 26) % (s.w + 40);
      c.fillStyle = '#ffe9a8';
      disc(c, s.x - s.w / 2 + u - 20, s.y + 9, 1.5);
      c.fill();
      disc(c, s.x - s.w / 2 + u - 20, s.y + 15, 1.5);
      c.fill();
      const v = (t * 18 + 150) % (s.w + 40);
      c.fillStyle = '#ff6b5e';
      disc(c, s.x + s.w / 2 - v + 20, s.y - 15, 1.4);
      c.fill();
      disc(c, s.x + s.w / 2 - v + 20, s.y - 9, 1.4);
      c.fill();
    }
  }

  private drawTrail(): void {
    const c = this.c;
    for (const t of this.trail) {
      c.fillStyle = `rgba(255,255,255,${t.life * 0.32})`;
      disc(c, t.x, t.y, BALL_R * t.life * 0.8);
      c.fill();
    }
  }

  private drawBall(sim: Sim): void {
    if (sim.state === 'portal') return;
    const c = this.c;
    const z = sim.z;
    let x = sim.x;
    let y = sim.y;
    let r = BALL_R * (1 + z / 90);
    let alpha = 1;
    const fx = this.fx;
    if (fx) {
      if (fx.kind === 'sink') {
        const u = Math.min(1, fx.t / 0.28);
        x = fx.x + (this.def!.cup[0] - fx.x) * u;
        y = fx.y + (this.def!.cup[1] - fx.y) * u;
        r *= 1 - u * 0.75;
        if (u >= 1) return;
      } else if (fx.kind === 'fall') {
        const u = Math.min(1, fx.t / 0.5);
        x = fx.x;
        y = fx.y;
        r *= 1 - u * 0.9;
        alpha = 1 - u * 0.4;
        if (u >= 1) return;
      } else if (fx.kind === 'splash') {
        return;
      } else {
        const u = Math.min(1, fx.t / 0.3);
        r *= 1 + (1 - u) * (1 - u) * 1.6;
        if (u >= 1) this.fx = null;
      }
    }

    // Shadow slides away as the ball climbs.
    c.fillStyle = `rgba(22,16,34,${0.36 - Math.min(0.2, z / 300)})`;
    c.beginPath();
    c.ellipse(x + 1.6 + z * 0.42, y + 2.2 + z * 0.6, r * 1.02, r * 0.92, 0.5, 0, TAU);
    c.fill();
    c.globalAlpha = alpha;
    at(c, x, y, 0, () => drawBallFace(c, this.design, r, this.rot, this.lagX, this.lagY));
    c.globalAlpha = 1;

    if (sim.state === 'rest' && !fx) {
      const u = (this.time * 0.9) % 1;
      c.strokeStyle = `rgba(255,255,255,${0.75 * (1 - u)})`;
      c.lineWidth = 1.6;
      disc(c, x, y, BALL_R + 3 + u * 11);
      c.stroke();
    }
  }

  private drawAim(sim: Sim, aim: Aim): void {
    const c = this.c;
    const x = sim.x;
    const y = sim.y;
    const ca = Math.cos(aim.ang);
    const sa = Math.sin(aim.ang);
    const p = aim.power;
    const col = p < 0.5 ? '#ffffff' : p < 0.8 ? '#ffd166' : '#ff6b4a';

    // The pull: a stretched band behind the ball.
    const back = 12 + p * 58;
    const bx = x - ca * back;
    const by = y - sa * back;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(22,16,34,.55)';
    c.lineWidth = 5.5 - p * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(bx, by);
    c.stroke();
    c.strokeStyle = col;
    c.lineWidth = 3.2 - p * 1.6;
    c.stroke();
    disc(c, bx, by, 5.4);
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = 'rgba(22,16,34,.6)';
    c.lineWidth = 1.2;
    c.stroke();

    // The guide: straight out, plus a stub off the first thing it meets.
    const reach = Math.min(aim.reach, 250);
    const hit = sim.raycast(aim.ang, reach);
    const len = hit ? reach * hit.t : reach;
    const dot = (px: number, py: number, r: number, a: number) => {
      c.globalAlpha = a;
      c.fillStyle = 'rgba(22,16,34,.8)';
      disc(c, px, py, r + 1.2);
      c.fill();
      c.fillStyle = col;
      disc(c, px, py, r);
      c.fill();
      c.globalAlpha = 1;
    };
    const off = (this.time * 34) % 15;
    for (let d = 16 + off; d < len; d += 15) dot(x + ca * d, y + sa * d, 2.3, Math.min(1, 1.25 - d / reach));
    if (hit) {
      const hx = x + ca * len;
      const hy = y + sa * len;
      c.strokeStyle = 'rgba(22,16,34,.8)';
      c.lineWidth = 3.6;
      disc(c, hx, hy, BALL_R);
      c.stroke();
      c.strokeStyle = col;
      c.lineWidth = 1.8;
      c.stroke();
      const dn = ca * hit.nx + sa * hit.ny;
      const rx = ca - 2 * dn * hit.nx;
      const ry = sa - 2 * dn * hit.ny;
      const stub = Math.min(58, (reach - len) * 0.6);
      for (let d = 12; d < stub; d += 13) dot(hx + rx * d, hy + ry * d, 1.9, 0.8 - d / 100);
    }
  }

  private drawHint(sim: Sim): void {
    const c = this.c;
    const u = (this.time % 2.2) / 2.2;
    const pull = Math.min(1, u / 0.62);
    const e = pull * pull * (3 - 2 * pull);
    const x = sim.x;
    const y = sim.y + 18 + e * 64;
    const alpha = u < 0.75 ? 1 : Math.max(0, 1 - (u - 0.75) / 0.2);
    c.globalAlpha = alpha;
    c.strokeStyle = 'rgba(255,255,255,.85)';
    c.lineWidth = 2.4;
    c.setLineDash([3, 6]);
    c.beginPath();
    c.moveTo(sim.x, sim.y + 10);
    c.lineTo(x, y);
    c.stroke();
    c.setLineDash([]);
    disc(c, x, y, 13);
    c.fillStyle = 'rgba(255,255,255,.26)';
    c.fill();
    disc(c, x, y, 7);
    c.fillStyle = '#fff';
    c.fill();
    c.strokeStyle = 'rgba(22,16,34,.5)';
    c.lineWidth = 1.2;
    c.stroke();
    c.globalAlpha = 1;
  }

  private drawFx(): void {
    const c = this.c;
    for (const r of this.rings) {
      c.strokeStyle = r.color;
      c.globalAlpha = r.life / r.max;
      c.lineWidth = r.width;
      disc(c, r.x, r.y, r.r);
      c.stroke();
    }
    c.globalAlpha = 1;
    for (const b of this.bits) {
      c.globalAlpha = Math.min(1, (b.life / b.max) * 1.6);
      c.fillStyle = b.color;
      if (b.square) {
        at(c, b.x, b.y, b.spin, () => c.fillRect(-b.size, -b.size * 0.6, b.size * 2, b.size * 1.2));
      } else {
        disc(c, b.x, b.y, b.size);
        c.fill();
      }
    }
    c.globalAlpha = 1;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (const p of this.pops) {
      const a = Math.min(1, p.life / 0.35);
      const grow = Math.min(1, (p.max - p.life) / 0.12);
      c.globalAlpha = a;
      c.font = `${p.size * (0.7 + grow * 0.3)}px Shrikhand, serif`;
      c.strokeStyle = 'rgba(22,16,34,.85)';
      c.lineWidth = 4.5;
      c.strokeText(p.text, p.x, p.y);
      c.fillStyle = p.color;
      c.fillText(p.text, p.x, p.y);
    }
    c.globalAlpha = 1;
  }
}
