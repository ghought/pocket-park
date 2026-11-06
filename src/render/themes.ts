import type { HoleDef, ThemeId, WallDef } from '../core/types';
import { TAU, cast, disc, grain, lin, polyPath, rad, rng, uncast, type C } from './paint';

export interface View {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Colours the HTML around the canvas picks up, so the page matches the room. */
export const THEME_INK: Record<ThemeId, string> = {
  counter: '#1f4a50',
  kitchenFloor: '#3a2f2a',
  laundry: '#17494d',
  diner: '#5b1f26',
  dinerTable: '#6d1f28',
  roof: '#141a33',
  skate: '#141a33',
};

function boomerang(c: C, x: number, y: number, a: number, s: number, col: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.strokeStyle = col;
  c.lineWidth = 1.5 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-6 * s, 3 * s);
  c.quadraticCurveTo(0, -5 * s, 6 * s, 3 * s);
  c.stroke();
  c.restore();
}

function tileWall(c: C, v: View, a: string, b: string, line: string): void {
  c.fillStyle = a;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const S = 22;
  c.fillStyle = b;
  for (let y = Math.floor(v.y0 / S) * S, row = 0; y < v.y1; y += S, row++) {
    for (let x = Math.floor(v.x0 / (S * 2)) * S * 2 + (row % 2) * S; x < v.x1; x += S * 2) c.fillRect(x, y, S, S);
  }
  c.strokeStyle = line;
  c.lineWidth = 0.6;
  c.beginPath();
  for (let y = Math.floor(v.y0 / S) * S; y < v.y1; y += S) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  for (let x = Math.floor(v.x0 / S) * S; x < v.x1; x += S) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  c.stroke();
}

function tufted(c: C, v: View, base: string, dark: string): void {
  c.fillStyle = base;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const S = 34;
  for (let y = Math.floor(v.y0 / S) * S, i = 0; y < v.y1 + S; y += S, i++) {
    for (let x = Math.floor(v.x0 / S) * S + (i % 2) * (S / 2); x < v.x1 + S; x += S) {
      c.fillStyle = rad(c, x, y, S * 0.62, dark, 'rgba(0,0,0,0)');
      c.fillRect(x - S, y - S, S * 2, S * 2);
      c.fillStyle = 'rgba(255,255,255,.14)';
      disc(c, x - 0.6, y - 0.6, 1.6);
      c.fill();
    }
  }
}

/** Streets and rooftops far below. */
function city(c: C, v: View, seed: number): void {
  const g = lin(c, 0, v.y0, 0, v.y1, '#1a2146', '#2a2350', '#3b2650');
  c.fillStyle = g;
  c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  const R = rng(seed);
  const pad = 40;
  for (let y = v.y0 - pad; y < v.y1; y += 34) {
    for (let x = v.x0 - pad; x < v.x1; x += 30) {
      if (R() < 0.3) continue;
      const w = 18 + R() * 12;
      const h = 18 + R() * 12;
      c.fillStyle = R() < 0.5 ? '#232b58' : '#2e2a5e';
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.fillRect(x + w, y + 3, 3, h);
      c.fillRect(x + 3, y + h, w, 3);
      for (let i = 0; i < 4; i++) {
        if (R() < 0.55) continue;
        c.fillStyle = R() < 0.7 ? '#f6c667' : '#7fd4e0';
        c.fillRect(x + 3 + R() * (w - 6), y + 3 + R() * (h - 6), 2, 2);
      }
    }
  }
}

export function drawBackdrop(c: C, def: HoleDef, v: View): void {
  const w = v.x1 - v.x0;
  const h = v.y1 - v.y0;
  switch (def.theme) {
    case 'counter':
      tileWall(c, v, '#2f6b70', '#2a6166', 'rgba(255,255,255,.08)');
      break;
    case 'kitchenFloor': {
      c.fillStyle = '#5a4436';
      c.fillRect(v.x0, v.y0, w, h);
      const R = rng(7);
      for (let y = Math.floor(v.y0 / 18) * 18; y < v.y1; y += 18) {
        c.fillStyle = `rgba(0,0,0,${0.05 + R() * 0.12})`;
        c.fillRect(v.x0, y, w, 17);
      }
      break;
    }
    case 'laundry':
      tileWall(c, v, '#1f6467', '#1c5b5f', 'rgba(255,255,255,.06)');
      break;
    case 'diner':
      tufted(c, v, '#8f2c35', 'rgba(50,8,16,.55)');
      break;
    case 'dinerTable':
      tufted(c, v, '#a5323c', 'rgba(50,8,16,.6)');
      break;
    case 'roof':
    case 'skate':
      city(c, v, 31);
      break;
  }
}

function clipField(c: C, def: HoleDef, fn: (x: number, y: number, w: number, h: number) => void): void {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const [x, y] of def.field) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  c.save();
  polyPath(c, def.field);
  c.clip();
  fn(x0, y0, x1 - x0, y1 - y0);
  c.restore();
}

export function drawField(c: C, def: HoleDef): void {
  // A shadow under the whole slab lifts it off the backdrop.
  polyPath(c, def.field);
  cast(c, 10);
  c.fillStyle = '#000';
  c.fill();
  uncast(c);

  clipField(c, def, (x, y, w, h) => {
    switch (def.theme) {
      case 'counter': {
        c.fillStyle = '#f3dfa8';
        c.fillRect(x, y, w, h);
        const R = rng(def.id.length * 13);
        for (let i = 0; i < 150; i++) {
          boomerang(c, x + R() * w, y + R() * h, R() * TAU, 0.8 + R() * 0.5, ['#e2c47f', '#e6a56f', '#a8c7a0', '#d9b467'][(R() * 4) | 0]);
        }
        grain(c, x, y, w, h, 3, 800, ['rgba(120,80,20,.1)', 'rgba(255,255,255,.2)'], 1.2);
        break;
      }
      case 'kitchenFloor': {
        const S = 40;
        for (let j = 0, yy = y; yy < y + h; yy += S, j++) {
          for (let i = 0, xx = x; xx < x + w; xx += S, i++) {
            c.fillStyle = (i + j) % 2 ? '#e8bf6b' : '#f4e6c4';
            c.fillRect(xx, yy, S, S);
          }
        }
        grain(c, x, y, w, h, 5, 900, ['rgba(110,70,20,.09)', 'rgba(255,255,255,.14)'], 1.3);
        break;
      }
      case 'laundry': {
        c.fillStyle = '#c4e6d8';
        c.fillRect(x, y, w, h);
        const R = rng(def.id.length * 7);
        for (let i = 0; i < 620; i++) {
          c.fillStyle = ['#8fc7b6', '#f0a890', '#fdf6e3', '#6aa79d', '#e9c46a'][(R() * 5) | 0];
          const s = 1 + R() * 3;
          c.save();
          c.translate(x + R() * w, y + R() * h);
          c.rotate(R() * TAU);
          c.fillRect(-s / 2, -s / 3, s, s * 0.66);
          c.restore();
        }
        break;
      }
      case 'diner': {
        const S = 36;
        for (let j = 0, yy = y; yy < y + h; yy += S, j++) {
          for (let i = 0, xx = x; xx < x + w; xx += S, i++) {
            c.fillStyle = (i + j) % 2 ? '#e6a79b' : '#f7ead8';
            c.fillRect(xx, yy, S, S);
          }
        }
        grain(c, x, y, w, h, 9, 700, ['rgba(100,30,30,.07)', 'rgba(255,255,255,.14)'], 1.2);
        break;
      }
      case 'dinerTable': {
        c.fillStyle = '#9fd8d0';
        c.fillRect(x, y, w, h);
        const R = rng(19);
        for (let i = 0; i < 130; i++) boomerang(c, x + R() * w, y + R() * h, R() * TAU, 0.7 + R() * 0.5, ['#7dc3bb', '#f3e5c8', '#6fb4ad'][(R() * 3) | 0]);
        grain(c, x, y, w, h, 4, 500, ['rgba(10,70,70,.08)', 'rgba(255,255,255,.2)'], 1.2);
        break;
      }
      case 'roof': {
        c.fillStyle = '#b6a79c';
        c.fillRect(x, y, w, h);
        grain(c, x, y, w, h, 11, 3200, ['#a6968b', '#c7bab0', '#94857c', '#d6cbc1'], 1.8);
        c.strokeStyle = 'rgba(70,55,60,.18)';
        c.lineWidth = 1;
        for (let yy = y + 60; yy < y + h; yy += 92) {
          c.beginPath();
          c.moveTo(x, yy);
          c.lineTo(x + w, yy + 5);
          c.stroke();
        }
        break;
      }
      case 'skate': {
        c.fillStyle = '#d3cdc4';
        c.fillRect(x, y, w, h);
        grain(c, x, y, w, h, 13, 1800, ['#c6bfb5', '#ded9d0', '#b8b0a6'], 1.4);
        c.strokeStyle = 'rgba(80,70,70,.22)';
        c.lineWidth = 0.8;
        const R = rng(23);
        for (let i = 0; i < 5; i++) {
          let cx = x + R() * w;
          let cy = y + R() * h;
          c.beginPath();
          c.moveTo(cx, cy);
          for (let k = 0; k < 6; k++) {
            cx += (R() - 0.5) * 34;
            cy += (R() - 0.5) * 34;
            c.lineTo(cx, cy);
          }
          c.stroke();
        }
        c.strokeStyle = 'rgba(80,70,70,.12)';
        c.lineWidth = 1;
        for (let yy = y + 80; yy < y + h; yy += 112) {
          c.beginPath();
          c.moveTo(x, yy);
          c.lineTo(x + w, yy);
          c.stroke();
        }
        break;
      }
    }
    // Late light falls across every room from the top left.
    c.fillStyle = lin(c, x, y, x + w, y + h, 'rgba(255,240,200,.16)', 'rgba(255,240,200,0)', 'rgba(30,20,60,.1)');
    c.fillRect(x, y, w, h);
  });

  // Open edges read as a lip you can roll off.
  const edge: Partial<Record<ThemeId, string>> = { dinerTable: '#dfe7ea', roof: '#efe4d6', skate: '#efe4d6' };
  const e = edge[def.theme];
  if (e) {
    polyPath(c, def.field);
    c.strokeStyle = e;
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.stroke();
  }
}

const WALLS: Record<string, { base: string; top: string; shine: string; h: number }> = {
  backsplash: { base: '#e9e6dc', top: '#fbf9f2', shine: '#c7d9d6', h: 7 },
  baseboard: { base: '#d9cbb4', top: '#f7f0e1', shine: '#fff', h: 6 },
  laundryWall: { base: '#d9654f', top: '#f08a6e', shine: '#ffb79c', h: 7 },
  chrome: { base: '#8b98a3', top: '#d7e0e6', shine: '#ffffff', h: 7 },
  parapet: { base: '#8e3f35', top: '#c0634f', shine: '#d98a70', h: 8 },
  coping: { base: '#57647a', top: '#a9b6c6', shine: '#e7eef5', h: 6 },
  drum: { base: '#6e7d8a', top: '#c3cfd8', shine: '#f5f9fb', h: 7 },
};

export function drawWall(c: C, w: WallDef): void {
  const s = WALLS[w.skin] ?? WALLS.baseboard;
  const r = w.r ?? 5;
  polyPath(c, w.pts, !!w.closed);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = s.base;
  c.lineWidth = r * 2;
  cast(c, s.h);
  c.stroke();
  uncast(c);
  c.strokeStyle = s.top;
  c.lineWidth = r * 1.35;
  c.stroke();
  c.strokeStyle = s.shine;
  c.lineWidth = 1;
  c.stroke();

  if (w.skin === 'parapet' || w.skin === 'backsplash') {
    // Joints along the top of the wall.
    c.strokeStyle = w.skin === 'parapet' ? 'rgba(70,20,20,.4)' : 'rgba(80,110,110,.35)';
    c.lineWidth = 1;
    const n = w.closed ? w.pts.length : w.pts.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = w.pts[i];
      const [bx, by] = w.pts[(i + 1) % w.pts.length];
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      for (let d = 12; d < len; d += 22) {
        const x = ax + ((bx - ax) * d) / len;
        const y = ay + ((by - ay) * d) / len;
        c.beginPath();
        c.moveTo(x + nx * r, y + ny * r);
        c.lineTo(x - nx * r, y - ny * r);
        c.stroke();
      }
    }
  }
}
