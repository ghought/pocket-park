import type { Prop, Pt, ZoneShape } from '../core/types';
import { TAU, at, blob, cast, disc, grain, lin, polyPath, rad, rng, rr, uncast, type C } from './paint';

type Box = Extract<Prop, { k: 'box' }>;

const INK = '#2a2433';

function ring(c: C, x: number, y: number, r: number, w: number, col: string): void {
  c.strokeStyle = col;
  c.lineWidth = w;
  disc(c, x, y, r);
  c.stroke();
}

function labelText(c: C, text: string, x: number, y: number, size: number, col: string, font = 'Shrikhand'): void {
  c.fillStyle = col;
  c.font = `${size}px ${font}, serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

// ---- Boxes ----

const BOXES: Record<string, (c: C, w: number, h: number, p: Box) => void> = {
  cerealBox(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 3);
    cast(c, 12);
    c.fillStyle = '#e8503a';
    c.fill();
    uncast(c);
    c.fillStyle = '#f7b538';
    c.fillRect(-w / 2, -h / 2, 32, h);
    c.fillStyle = '#fff5dc';
    for (const [x, y, r] of [[-w / 2 + 10, -8, 5], [-w / 2 + 22, 3, 6], [-w / 2 + 11, 12, 4]] as const) {
      ring(c, x, y, r, 2.4, '#fff5dc');
    }
    labelText(c, 'Toasty Loops', 14, 1, 21, '#fff5dc');
    c.fillStyle = 'rgba(0,0,0,.14)';
    c.fillRect(-w / 2, h / 2 - 5, w, 5);
    c.fillStyle = 'rgba(255,255,255,.18)';
    c.fillRect(-w / 2, -h / 2, w, 3);
  },
  toaster(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 14);
    cast(c, 12);
    c.fillStyle = lin(c, 0, -h / 2, 0, h / 2, '#f1f5f7', '#b9c5cc', '#8f9ca5');
    c.fill();
    uncast(c);
    for (const y of [-11, 11]) {
      rr(c, -w / 2 + 12, y - 6, w - 24, 12, 4);
      c.fillStyle = '#39424a';
      c.fill();
      rr(c, -w / 2 + 17, y - 4, w - 34, 8, 3);
      c.fillStyle = '#d99a4e';
      c.fill();
    }
    rr(c, w / 2 - 6, -7, 9, 14, 3);
    c.fillStyle = '#2a2433';
    c.fill();
  },
  washer(c, w, h, p) {
    drawWasher(c, w, h, p, false);
  },
  washerOpen(c, w, h, p) {
    drawWasher(c, w, h, p, true);
  },
  foldTable(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 4);
    cast(c, 11);
    c.fillStyle = '#d8b98a';
    c.fill();
    uncast(c);
    c.strokeStyle = '#b7925e';
    c.lineWidth = 2;
    rr(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 3);
    c.stroke();
    const R = rng(Math.round(w));
    const cols = ['#e76f51', '#2a9d8f', '#f4a261', '#7b8cde', '#fdf6e3'];
    for (let x = -w / 2 + 24; x < w / 2 - 18; x += 42) {
      for (let i = 0; i < 3; i++) {
        rr(c, x - 15 + i, -h / 2 + 8 - i * 1.5, 30, h - 16, 4);
        cast(c, 2);
        c.fillStyle = cols[(R() * cols.length) | 0];
        c.fill();
        uncast(c);
      }
      c.strokeStyle = 'rgba(0,0,0,.14)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x - 12, 0);
      c.lineTo(x + 14, 0);
      c.stroke();
    }
  },
  napkins(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 6);
    cast(c, 10);
    c.fillStyle = lin(c, 0, -h / 2, 0, h / 2, '#f2f5f7', '#a7b3bb');
    c.fill();
    uncast(c);
    rr(c, -w / 2 + 8, -h / 2 + h * 0.3, w - 16, h * 0.4, 3);
    c.fillStyle = '#fdfaf2';
    c.fill();
    c.strokeStyle = '#cdd5da';
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    c.moveTo(-w / 2 + 14, 0);
    c.lineTo(w / 2 - 14, 0);
    c.stroke();
  },
  acUnit(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 4);
    cast(c, 14);
    c.fillStyle = lin(c, -w / 2, 0, w / 2, 0, '#c9d2d8', '#95a2ab');
    c.fill();
    uncast(c);
    c.strokeStyle = 'rgba(50,60,70,.5)';
    c.lineWidth = 1.2;
    for (let y = -h / 2 + 8; y < h / 2 - 4; y += 6) {
      c.beginPath();
      c.moveTo(-w / 2 + 3, y);
      c.lineTo(-w / 2 + 12, y);
      c.stroke();
    }
    disc(c, 7, 0, 18);
    c.fillStyle = '#39424a';
    c.fill();
    ring(c, 7, 0, 18, 2, '#dfe6ea');
    c.fillStyle = '#6f7c85';
    for (let i = 0; i < 4; i++) {
      at(c, 7, 0, (i * TAU) / 4 + 0.4, () => {
        c.beginPath();
        c.ellipse(9, 0, 8, 3.6, 0.2, 0, TAU);
        c.fill();
      });
    }
  },
  crate(c, w, h) {
    rr(c, -w / 2, -h / 2, w, h, 4);
    cast(c, 12);
    c.fillStyle = '#2f6fb0';
    c.fill();
    uncast(c);
    c.fillStyle = '#123a63';
    for (let x = -w / 2 + 5; x < w / 2 - 6; x += 10) {
      for (let y = -h / 2 + 5; y < h / 2 - 6; y += 10) {
        rr(c, x, y, 7, 7, 1.5);
        c.fill();
      }
    }
  },
};

function drawWasher(c: C, w: number, h: number, p: Box, open: boolean): void {
  rr(c, -w / 2 + 1, -h / 2, w - 2, h, 5);
  cast(c, 13);
  c.fillStyle = '#f5efe2';
  c.fill();
  uncast(c);
  // The lid, then the front face leaning toward you.
  c.fillStyle = '#fffaf0';
  rr(c, -w / 2 + 3, -h / 2 + 2, w - 6, 15, 3);
  c.fill();
  c.fillStyle = open ? '#ef8f4a' : '#7aa6a2';
  rr(c, -w / 2 + 7, -h / 2 + 5, 15, 8, 2);
  c.fill();
  labelText(c, p.label ?? '', w / 2 - 12, -h / 2 + 10, 12, '#55606a');
  const cy = 9;
  const R = 19;
  disc(c, 0, cy, R + 3);
  c.fillStyle = '#c3cdd3';
  c.fill();
  disc(c, 0, cy, R);
  c.fillStyle = open ? '#20262d' : lin(c, -R, cy - R, R, cy + R, '#5e8fa3', '#2e5766');
  c.fill();
  if (open) {
    // Door swung out to the side.
    c.save();
    c.translate(R + 6, cy);
    c.scale(0.34, 1);
    disc(c, 0, 0, R);
    c.fillStyle = '#8ab0bf';
    c.fill();
    ring(c, 0, 0, R, 4, '#c3cdd3');
    c.restore();
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.moveTo(-6, h / 2 - 7);
    c.lineTo(6, h / 2 - 7);
    c.lineTo(0, h / 2 - 1);
    c.closePath();
    c.fill();
  } else {
    c.fillStyle = 'rgba(255,255,255,.3)';
    c.beginPath();
    c.ellipse(-6, cy - 7, 8, 4, -0.6, 0, TAU);
    c.fill();
  }
}

// ---- Round things ----

const DISCS: Record<string, (c: C, r: number) => void> = {
  mug(c, r) {
    rr(c, r - 3, -5, 13, 10, 4);
    cast(c, 11);
    c.fillStyle = '#e8503a';
    c.fill();
    disc(c, 0, 0, r);
    c.fill();
    uncast(c);
    disc(c, 0, 0, r - 3);
    c.fillStyle = '#fbeee0';
    c.fill();
    disc(c, 0, 0, r - 5);
    c.fillStyle = rad(c, -r * 0.2, -r * 0.2, r, '#7b4a2b', '#3e2214');
    c.fill();
    ring(c, 0, 0, r * 0.55, 1, 'rgba(230,190,150,.4)');
  },
  soapBottle(c, r) {
    disc(c, 0, 0, r);
    cast(c, 12);
    c.fillStyle = '#6cc47e';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r * 0.55);
    c.fillStyle = '#f7f3e8';
    c.fill();
    rr(c, -2, -r - 3, 4, r + 3, 2);
    c.fillStyle = '#f7f3e8';
    c.fill();
  },
  chairLeg(c, r) {
    disc(c, 0, 0, r);
    cast(c, 9);
    c.fillStyle = '#8a5a35';
    c.fill();
    uncast(c);
    disc(c, -1, -1, r * 0.7);
    c.fillStyle = '#b07a4b';
    c.fill();
    ring(c, -1, -1, r * 0.38, 1, '#8a5a35');
  },
  petBowl(c, r) {
    disc(c, 0, 0, r);
    cast(c, 5);
    c.fillStyle = '#c6d0d6';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r - 4);
    c.fillStyle = '#7f8c95';
    c.fill();
    const R = rng(4);
    c.fillStyle = '#a0683c';
    for (let i = 0; i < 16; i++) {
      const a = R() * TAU;
      const q = R() * (r - 7);
      disc(c, Math.cos(a) * q, Math.sin(a) * q, 2);
      c.fill();
    }
  },
  basket(c, r) {
    disc(c, 0, 0, r);
    cast(c, 12);
    c.fillStyle = '#5b8def';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r - 4);
    c.fillStyle = '#f7ede0';
    c.fill();
    blob(c, -3, 2, r - 9, 8);
    c.fillStyle = '#ef8f6f';
    c.fill();
    blob(c, 5, -4, r - 13, 15);
    c.fillStyle = '#fdf6e3';
    c.fill();
  },
  stool(c, r) {
    disc(c, 0, 0, r);
    cast(c, 11);
    c.fillStyle = lin(c, -r, -r, r, r, '#f4f8fa', '#8c99a3');
    c.fill();
    uncast(c);
    disc(c, 0, 0, r - 3);
    c.fillStyle = rad(c, -r * 0.3, -r * 0.3, r * 1.3, '#ec5a55', '#a41f2d');
    c.fill();
    disc(c, 0, 0, 2.6);
    c.fillStyle = '#7d1420';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.28)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, 0, r - 7, Math.PI * 1.05, Math.PI * 1.6);
    c.stroke();
  },
  plate(c, r) {
    disc(c, 0, 0, r);
    cast(c, 6);
    c.fillStyle = '#fbf8f0';
    c.fill();
    uncast(c);
    ring(c, 0, 0, r - 2, 1.4, '#3f9d94');
    ring(c, 0, 0, r * 0.62, 1, 'rgba(0,0,0,.08)');
    blob(c, -2, 1, r * 0.5, 22, 0.2);
    c.fillStyle = '#fffdf8';
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,.08)';
    c.stroke();
    disc(c, -2, 1, r * 0.22);
    c.fillStyle = '#f6b52e';
    c.fill();
  },
  stockpot(c, r) {
    rr(c, -r - 7, -4, r * 2 + 14, 8, 3);
    cast(c, 12);
    c.fillStyle = '#6f7c85';
    c.fill();
    disc(c, 0, 0, r);
    c.fillStyle = lin(c, -r, -r, r, r, '#eef3f5', '#94a1aa');
    c.fill();
    uncast(c);
    ring(c, 0, 0, r - 4, 1.2, 'rgba(0,0,0,.2)');
    disc(c, 0, 0, 5);
    c.fillStyle = '#39424a';
    c.fill();
  },
  waterTank(c, r) {
    disc(c, 0, 0, r);
    cast(c, 20);
    c.fillStyle = '#9b6a44';
    c.fill();
    uncast(c);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, r - 2, a, a + TAU / 12);
      c.closePath();
      c.fillStyle = i % 2 ? '#7c8a97' : '#8f9dab';
      c.fill();
    }
    ring(c, 0, 0, r - 1, 2.4, '#4b3a30');
    disc(c, 0, 0, 5);
    c.fillStyle = '#4b3a30';
    c.fill();
  },
  cone(c, r) {
    rr(c, -r, -r, r * 2, r * 2, 4);
    cast(c, 8);
    c.fillStyle = '#ec6a2f';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r * 0.72);
    c.fillStyle = '#f7f3e8';
    c.fill();
    disc(c, 0, 0, r * 0.48);
    c.fillStyle = '#ec6a2f';
    c.fill();
    disc(c, 0, 0, r * 0.18);
    c.fillStyle = '#2a2433';
    c.fill();
  },
  tire(c, r) {
    disc(c, 0, 0, r);
    cast(c, 8);
    c.fillStyle = '#2a2a30';
    c.fill();
    uncast(c);
    for (let i = 0; i < 20; i++) {
      at(c, 0, 0, (i / 20) * TAU, () => {
        c.fillStyle = '#44444c';
        c.fillRect(r - 5, -1, 5, 2);
      });
    }
    disc(c, 0, 0, r * 0.5);
    c.fillStyle = '#6d6a66';
    c.fill();
    ring(c, 0, 0, r * 0.5, 1.5, '#17171a');
  },
  salt(c, r) {
    disc(c, 0, 0, r);
    cast(c, 9);
    c.fillStyle = '#e8eef1';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r * 0.68);
    c.fillStyle = lin(c, -r, -r, r, r, '#f5f8fa', '#9aa7b0');
    c.fill();
    c.fillStyle = '#39424a';
    for (const [x, y] of [[0, 0], [3.4, 0], [-3.4, 0], [0, 3.4], [0, -3.4]]) {
      disc(c, x, y, 0.9);
      c.fill();
    }
  },
  pepper(c, r) {
    disc(c, 0, 0, r);
    cast(c, 9);
    c.fillStyle = '#46403f';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r * 0.68);
    c.fillStyle = lin(c, -r, -r, r, r, '#f5f8fa', '#9aa7b0');
    c.fill();
    c.fillStyle = '#2a2433';
    for (const [x, y] of [[-2.2, -2.2], [2.2, 2.2], [2.2, -2.2], [-2.2, 2.2]]) {
      disc(c, x, y, 1);
      c.fill();
    }
  },
  hotSauce(c, r) {
    disc(c, 0, 0, r);
    cast(c, 9);
    c.fillStyle = '#c8281e';
    c.fill();
    uncast(c);
    disc(c, 0, 0, r * 0.5);
    c.fillStyle = '#f4ead2';
    c.fill();
    disc(c, 0, 0, r * 0.26);
    c.fillStyle = '#c8281e';
    c.fill();
  },
};

// ---- Ramps ----

function drawRamp(c: C, p: Extract<Prop, { k: 'ramp' }>): void {
  const L = p.len;
  const W = p.w;
  at(c, p.x, p.y, p.a, () => {
    // Local +x runs uphill. The shadow falls off the high end.
    rr(c, -L / 2, -W / 2, L, W, 2);
    cast(c, 9);
    if (p.skin === 'ruler') c.fillStyle = lin(c, -L / 2, 0, L / 2, 0, '#d2a24f', '#f3d07c');
    else if (p.skin === 'spatula') c.fillStyle = lin(c, -L / 2, 0, L / 2, 0, '#8e9ba4', '#e6edf1');
    else c.fillStyle = lin(c, -L / 2, 0, L / 2, 0, '#b58a5c', '#e4c394');
    c.fill();
    uncast(c);

    if (p.skin === 'ruler') {
      c.strokeStyle = '#5e4320';
      c.fillStyle = '#5e4320';
      c.lineWidth = 0.9;
      c.font = '700 7px Karla, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const n = Math.floor(L / 5);
      for (let i = 1; i < n; i++) {
        const x = -L / 2 + i * 5;
        c.beginPath();
        c.moveTo(x, -W / 2);
        c.lineTo(x, -W / 2 + (i % 5 === 0 ? 9 : 5));
        c.stroke();
        if (i % 5 === 0) {
          at(c, x, -W / 2 + 14, Math.PI / 2, () => c.fillText(String(i / 5), 0, 0));
        }
      }
    } else if (p.skin === 'spatula') {
      c.fillStyle = '#4c5860';
      for (let i = 0; i < 4; i++) {
        rr(c, -L / 2 + 18 + i * 18, -W / 2 + 7, 10, W - 14, 4);
        c.fill();
      }
    } else {
      c.strokeStyle = 'rgba(90,60,30,.32)';
      c.lineWidth = 1;
      for (let x = -L / 2 + 16; x < L / 2 - 6; x += 22) {
        c.beginPath();
        c.moveTo(x, -W / 2);
        c.lineTo(x, W / 2);
        c.stroke();
      }
    }

    // Chevrons say which way is up.
    c.strokeStyle = 'rgba(255,255,255,.75)';
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      const x = 6 + i * 13 - 14;
      c.beginPath();
      c.moveTo(x, -8);
      c.lineTo(x + 7, 0);
      c.lineTo(x, 8);
      c.stroke();
    }

    // The steel lip at the top.
    c.fillStyle = '#3d4750';
    c.fillRect(L / 2 - 4, -W / 2, 4, W);
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.fillRect(L / 2 - 4, -W / 2, 1.2, W);
    // Sides.
    c.fillStyle = 'rgba(40,30,20,.55)';
    c.fillRect(-L / 2, -W / 2 - 1.5, L, 2);
    c.fillRect(-L / 2, W / 2 - 0.5, L, 2);
  });
}

// ---- Surfaces ----

function shapeXY(s: ZoneShape): { x: number; y: number; r: number } {
  if ('pts' in s) return { x: s.pts[0][0], y: s.pts[0][1], r: 30 };
  if ('r' in s) return { x: s.x, y: s.y, r: s.r };
  return { x: s.x, y: s.y, r: Math.min(s.w, s.h) / 2 };
}

function shapePath(c: C, s: ZoneShape, seed: number): void {
  if ('pts' in s) polyPath(c, s.pts);
  else if ('r' in s) blob(c, s.x, s.y, s.r, seed, 0.1);
  else rr(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 6);
}

function drawPatch(c: C, p: Extract<Prop, { k: 'patch' }>, seed: number): void {
  const s = p.shape;
  const { x, y, r } = shapeXY(s);
  const R = rng(seed);
  switch (p.skin) {
    case 'soap': {
      shapePath(c, s, seed);
      c.fillStyle = 'rgba(150,190,255,.5)';
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.lineWidth = 1.4;
      c.stroke();
      for (let i = 0; i < 16; i++) {
        const a = R() * TAU;
        const q = R() * r * 0.85;
        ring(c, x + Math.cos(a) * q, y + Math.sin(a) * q, 1.5 + R() * 3.5, 0.8, 'rgba(255,255,255,.8)');
      }
      break;
    }
    case 'syrup':
    case 'ketchup': {
      const base = p.skin === 'syrup' ? '#b5651d' : '#c9281f';
      const hi = p.skin === 'syrup' ? '#e29a3e' : '#ef5a4a';
      shapePath(c, s, seed);
      c.fillStyle = base;
      c.fill();
      for (let i = 0; i < 5; i++) {
        const a = R() * TAU;
        disc(c, x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2, 2 + R() * 4);
        c.fillStyle = base;
        c.fill();
      }
      blob(c, x - r * 0.25, y - r * 0.28, r * 0.42, seed + 3);
      c.fillStyle = hi;
      c.globalAlpha = 0.55;
      c.fill();
      c.globalAlpha = 1;
      break;
    }
    case 'towel': {
      if ('w' in s) {
        c.save();
        rr(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 3);
        cast(c, 3);
        c.fillStyle = '#f7f1e4';
        c.fill();
        uncast(c);
        c.clip();
        c.fillStyle = '#d9574a';
        for (let i = 0; i < 4; i++) c.fillRect(s.x - s.w / 2, s.y - s.h / 2 + 14 + i * 33, s.w, 7);
        grain(c, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 2, 500, ['rgba(120,90,60,.16)'], 1.2);
        c.restore();
      }
      break;
    }
    case 'mat':
    case 'sock': {
      shapePath(c, s, seed);
      c.fillStyle = 'rgba(90,120,140,.25)';
      c.fill();
      const cols = ['#ef8f6f', '#fdf6e3', '#7b8cde', '#f4c95d', '#2a9d8f', '#e76f51'];
      const w = 'w' in s ? s.w / 2 : r;
      const h = 'h' in s ? s.h / 2 : r;
      for (let i = 0; i < 7; i++) {
        const sx = x + (R() - 0.5) * w * 1.5;
        const sy = y + (R() - 0.5) * h * 1.5;
        at(c, sx, sy, R() * TAU, () => {
          c.lineCap = 'round';
          c.lineJoin = 'round';
          c.strokeStyle = cols[(R() * cols.length) | 0];
          c.lineWidth = 9;
          c.beginPath();
          c.moveTo(-9, -3);
          c.lineTo(5, -3);
          c.lineTo(9, 5);
          cast(c, 2);
          c.stroke();
          uncast(c);
          c.strokeStyle = 'rgba(255,255,255,.55)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(-11, -7);
          c.lineTo(-11, 1);
          c.stroke();
        });
      }
      break;
    }
    case 'gravel': {
      shapePath(c, s, seed);
      c.fillStyle = 'rgba(70,60,60,.3)';
      c.fill();
      for (let i = 0; i < 150; i++) {
        const a = R() * TAU;
        const q = Math.sqrt(R()) * r;
        disc(c, x + Math.cos(a) * q, y + Math.sin(a) * q, 0.8 + R() * 1.7);
        c.fillStyle = ['#6f6560', '#8f837a', '#524a48', '#a79b90'][(R() * 4) | 0];
        c.fill();
      }
      break;
    }
  }
}

function drawHazard(c: C, p: Extract<Prop, { k: 'hazard' }>): void {
  const s = p.shape;
  if (p.skin === 'sink' && 'w' in s) {
    const x = s.x - s.w / 2;
    const y = s.y - s.h / 2;
    rr(c, x - 6, y - 6, s.w + 12, s.h + 12, 16);
    c.fillStyle = lin(c, x, y, x + s.w, y + s.h, '#eef3f5', '#9aa7b0');
    c.fill();
    rr(c, x, y, s.w, s.h, 12);
    c.fillStyle = lin(c, 0, y, 0, y + s.h, '#3f6f8c', '#5f97ad');
    c.fill();
    c.save();
    rr(c, x, y, s.w, s.h, 12);
    c.clip();
    c.fillStyle = 'rgba(10,30,50,.42)';
    c.fillRect(x, y, s.w, 9);
    c.fillRect(x, y, 7, s.h);
    c.restore();
    disc(c, s.x, s.y, 9);
    c.fillStyle = '#c9d3d9';
    c.fill();
    disc(c, s.x, s.y, 5);
    c.fillStyle = '#2a3a46';
    c.fill();
    // The tap.
    c.strokeStyle = '#dfe7ea';
    c.lineWidth = 7;
    c.lineCap = 'round';
    cast(c, 9);
    c.beginPath();
    c.moveTo(s.x, y - 12);
    c.quadraticCurveTo(s.x, y + 10, s.x + 2, y + 24);
    c.stroke();
    uncast(c);
    return;
  }
  if (p.skin === 'mopbucket') {
    const { x, y, r } = shapeXY(s);
    disc(c, x, y, r + 5);
    cast(c, 6);
    c.fillStyle = '#f2c230';
    c.fill();
    uncast(c);
    disc(c, x, y, r);
    c.fillStyle = rad(c, x, y, r, '#8c9a8d', '#5e6c62');
    c.fill();
    return;
  }
  if (p.skin === 'gap' && 'w' in s) {
    c.fillStyle = lin(c, 0, s.y - s.h / 2, 0, s.y + s.h / 2, '#0d0f22', '#222748', '#0d0f22');
    c.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    c.strokeStyle = 'rgba(246,198,103,.55)';
    c.lineWidth = 1.5;
    c.setLineDash([9, 8]);
    c.beginPath();
    c.moveTo(s.x - s.w / 2, s.y);
    c.lineTo(s.x + s.w / 2, s.y);
    c.stroke();
    c.setLineDash([]);
    return;
  }
  shapePath(c, s, 4);
  c.fillStyle = '#4f8ca8';
  c.fill();
}

// ---- Public drawing ----

export function drawStaticProp(c: C, p: Prop, i: number): void {
  switch (p.k) {
    case 'box': {
      const fn = BOXES[p.skin];
      if (fn) at(c, p.x, p.y, p.a ?? 0, () => fn(c, p.w, p.h, p));
      break;
    }
    case 'disc': {
      const fn = DISCS[p.skin];
      if (fn) at(c, p.x, p.y, 0, () => fn(c, p.r));
      break;
    }
    case 'ramp':
      drawRamp(c, p);
      break;
    case 'rail':
      drawRail(c, p);
      break;
    case 'deco':
      drawDeco(c, p);
      break;
    default:
      void i;
  }
}

/** Everything that lies flat on the floor, drawn before anything that stands on it. */
export function drawFloorProp(c: C, p: Prop, i: number): void {
  switch (p.k) {
    case 'patch':
      drawPatch(c, p, i * 31 + 5);
      break;
    case 'hazard':
      drawHazard(c, p);
      break;
    case 'bowl':
      drawBowl(c, p);
      break;
    case 'slope':
      drawSlope(c, p);
      break;
    case 'belt':
      drawBeltBase(c, p);
      break;
    case 'portal':
      drawPortalExit(c, p);
      break;
  }
}

function drawBowl(c: C, p: Extract<Prop, { k: 'bowl' }>): void {
  const { x, y, r } = p;
  if (p.skin === 'skateBowl') {
    disc(c, x, y, r);
    c.fillStyle = rad(c, x, y, r, '#8f8a84', '#a9a39b', '#d0cabf');
    c.fill();
    for (let q = r * 0.3; q < r; q += r * 0.22) ring(c, x, y, q, 0.8, 'rgba(255,255,255,.2)');
    ring(c, x, y, r, 5, '#7a8698');
    ring(c, x, y, r, 2.4, '#dfe7ee');
    return;
  }
  disc(c, x, y, r + 5);
  cast(c, 8);
  c.fillStyle = '#3f8fa0';
  c.fill();
  uncast(c);
  ring(c, x, y, r + 2.5, 1.5, '#fbf7ec');
  disc(c, x, y, r);
  c.fillStyle = rad(c, x - 6, y - 6, r * 1.1, '#fffdf6', '#efe6d2');
  c.fill();
  const R = rng(Math.round(x));
  const cols = ['#f7a93b', '#ef6a4c', '#f4d35e', '#e88fb0', '#7fc8a9'];
  for (let i = 0; i < 44; i++) {
    const a = R() * TAU;
    const q = Math.sqrt(R()) * (r - 7);
    ring(c, x + Math.cos(a) * q, y + Math.sin(a) * q, 3.4, 2.5, cols[(R() * cols.length) | 0]);
  }
}

function drawSlope(c: C, p: Extract<Prop, { k: 'slope' }>): void {
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;
  // Dark at the bottom of the slope.
  const down = Math.sin(p.a) > 0;
  c.fillStyle = down ? lin(c, 0, y, 0, y + p.h, '#e3ddd2', '#76808f') : lin(c, 0, y, 0, y + p.h, '#76808f', '#e3ddd2');
  c.fillRect(x, y, p.w, p.h);
  c.strokeStyle = 'rgba(40,40,60,.13)';
  c.lineWidth = 1;
  for (let yy = y + 10; yy < y + p.h; yy += 14) {
    c.beginPath();
    c.moveTo(x, yy);
    c.lineTo(x + p.w, yy);
    c.stroke();
  }
}

function drawBeltBase(c: C, p: Extract<Prop, { k: 'belt' }>): void {
  rr(c, p.x - p.w / 2 - 5, p.y - p.h / 2 - 3, p.w + 10, p.h + 6, 8);
  cast(c, 3);
  c.fillStyle = '#7d8a93';
  c.fill();
  uncast(c);
}

function drawPortalExit(c: C, p: Extract<Prop, { k: 'portal' }>): void {
  at(c, p.ox, p.oy + 9, 0, () => {
    rr(c, -15, -5, 30, 12, 3);
    c.fillStyle = '#39424a';
    c.fill();
    c.strokeStyle = '#c3cdd3';
    c.lineWidth = 2;
    c.stroke();
  });
}

function drawRail(c: C, p: Extract<Prop, { k: 'rail' }>): void {
  c.lineCap = 'round';
  if (p.skin === 'rack') {
    c.strokeStyle = '#7d8a93';
    c.lineWidth = 6;
    cast(c, 5);
    c.beginPath();
    c.moveTo(p.x1, p.y1);
    c.lineTo(p.x2, p.y2);
    c.stroke();
    uncast(c);
    const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
    for (let d = 12; d < len - 6; d += 15) {
      const x = p.x1 + ((p.x2 - p.x1) * d) / len;
      const y = p.y1 + ((p.y2 - p.y1) * d) / len;
      rr(c, x - 2.5, y - 9, 5, 18, 2.4);
      c.fillStyle = ['#fbf8f0', '#e5d9bf', '#cfe5e2'][Math.round(d / 15) % 3];
      c.fill();
    }
    return;
  }
  const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  c.strokeStyle = '#46505e';
  c.lineWidth = 7;
  cast(c, 9);
  c.beginPath();
  c.moveTo(p.x1, p.y1);
  c.lineTo(p.x2, p.y2);
  c.stroke();
  uncast(c);
  c.strokeStyle = '#c9d4de';
  c.lineWidth = 3.2;
  c.stroke();
  c.strokeStyle = '#fff';
  c.lineWidth = 0.8;
  c.stroke();
  for (let d = 0; d <= len; d += len / 3) {
    disc(c, p.x1 + ((p.x2 - p.x1) * d) / len, p.y1 + ((p.y2 - p.y1) * d) / len, 4);
    c.fillStyle = '#39424a';
    c.fill();
  }
}

function drawDeco(c: C, p: Extract<Prop, { k: 'deco' }>): void {
  at(c, p.x, p.y, p.a ?? 0, () => {
    switch (p.skin) {
      case 'spoon': {
        rr(c, -3, -46, 6, 62, 3);
        cast(c, 3);
        c.fillStyle = '#cfd8dd';
        c.fill();
        c.beginPath();
        c.ellipse(0, 24, 11, 15, 0, 0, TAU);
        c.fill();
        uncast(c);
        c.beginPath();
        c.ellipse(0, 24, 8, 12, 0, 0, TAU);
        c.fillStyle = '#a5b1b9';
        c.fill();
        break;
      }
      case 'crumbs': {
        const R = rng(12);
        for (let i = 0; i < 16; i++) {
          disc(c, (R() - 0.5) * 60, (R() - 0.5) * 50, 0.8 + R() * 1.8);
          c.fillStyle = '#b5833f';
          c.fill();
        }
        break;
      }
      case 'quarter': {
        disc(c, 0, 0, 11);
        cast(c, 1.5);
        c.fillStyle = '#c7d0d6';
        c.fill();
        uncast(c);
        ring(c, 0, 0, 9, 1, '#8e9aa3');
        labelText(c, '25', 0, 0.5, 8, '#6d7983', 'Karla');
        break;
      }
      case 'plank': {
        const w = p.w ?? 40;
        const h = p.h ?? 100;
        rr(c, -w / 2, -h / 2, w, h, 2);
        cast(c, 7);
        c.fillStyle = '#b98a58';
        c.fill();
        uncast(c);
        c.strokeStyle = 'rgba(70,40,20,.42)';
        c.lineWidth = 1;
        for (let x = -w / 2 + w / 3; x < w / 2 - 1; x += w / 3) {
          c.beginPath();
          c.moveTo(x, -h / 2);
          c.lineTo(x, h / 2);
          c.stroke();
        }
        c.fillStyle = '#39424a';
        for (const y of [-h / 2 + 6, h / 2 - 6]) {
          for (const x of [-w / 3, 0, w / 3]) {
            disc(c, x, y, 1.3);
            c.fill();
          }
        }
        break;
      }
      case 'island': {
        const w = p.w ?? 100;
        const h = p.h ?? 100;
        rr(c, -w / 2, -h / 2, w, h, 4);
        c.fillStyle = lin(c, -w / 2, 0, w / 2, 0, '#7a5235', '#94663f');
        c.fill();
        c.strokeStyle = 'rgba(40,20,10,.26)';
        c.lineWidth = 1;
        for (let x = -w / 2 + 10; x < w / 2; x += 15) {
          c.beginPath();
          c.moveTo(x, -h / 2);
          c.lineTo(x, h / 2);
          c.stroke();
        }
        rr(c, -36, -72, 72, 44, 6);
        cast(c, 5);
        c.fillStyle = '#efe6d2';
        c.fill();
        uncast(c);
        disc(c, 12, 62, 28);
        cast(c, 8);
        c.fillStyle = '#c94f3b';
        c.fill();
        uncast(c);
        disc(c, 12, 62, 21);
        c.fillStyle = '#efb04a';
        c.fill();
        break;
      }
    }
  });
}

// ---- Things that move ----

export function drawSpinner(c: C, p: Extract<Prop, { k: 'spinner' }>, ang: number): void {
  at(c, p.x, p.y, ang, () => {
    c.lineCap = 'round';
    for (let i = 0; i < p.arms; i++) {
      const a = (i / p.arms) * TAU;
      c.strokeStyle = '#5d6a75';
      c.lineWidth = 12;
      cast(c, 7);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * p.len, Math.sin(a) * p.len);
      c.stroke();
      uncast(c);
      c.strokeStyle = '#a7d0d9';
      c.lineWidth = 8;
      c.stroke();
    }
    disc(c, 0, 0, p.hub ?? 12);
    c.fillStyle = lin(c, -14, -14, 14, 14, '#eef3f5', '#7d8a93');
    c.fill();
    disc(c, 0, 0, 5);
    c.fillStyle = '#39424a';
    c.fill();
  });
}

export function drawTurntable(c: C, p: Extract<Prop, { k: 'turntable' }>, ang: number): void {
  at(c, p.x, p.y, ang, () => {
    const r = p.r;
    if (p.skin === 'susan') {
      disc(c, 0, 0, r);
      cast(c, 4);
      c.fillStyle = '#c28a52';
      c.fill();
      uncast(c);
      c.strokeStyle = 'rgba(90,50,20,.3)';
      c.lineWidth = 1;
      for (let i = -r + 14; i < r; i += 14) {
        const h = Math.sqrt(r * r - i * i);
        c.beginPath();
        c.moveTo(i, -h);
        c.lineTo(i, h);
        c.stroke();
      }
      ring(c, 0, 0, r - 3, 3, '#8b5a30');
      ring(c, 0, 0, 14, 2, '#8b5a30');
      disc(c, 0, 0, 7);
      c.fillStyle = '#8b5a30';
      c.fill();
    } else {
      disc(c, 0, 0, r);
      c.fillStyle = '#bcc7cf';
      c.fill();
      c.fillStyle = 'rgba(40,50,60,.55)';
      for (let q = 22; q < r - 6; q += 16) {
        const n = Math.floor((q * TAU) / 17);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + q;
          disc(c, Math.cos(a) * q, Math.sin(a) * q, 1.9);
          c.fill();
        }
      }
    }
    for (const rd of p.riders ?? []) {
      const fn = DISCS[rd.skin];
      if (fn) {
        at(c, Math.cos(rd.ang) * rd.dist, Math.sin(rd.ang) * rd.dist, -ang, () => fn(c, rd.r));
      }
    }
  });
}

export function drawBeltTop(c: C, p: Extract<Prop, { k: 'belt' }>, t: number): void {
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;
  c.save();
  rr(c, x, y, p.w, p.h, 5);
  c.fillStyle = '#34393f';
  c.fill();
  c.clip();
  const dir = Math.cos(p.a) >= 0 ? 1 : -1;
  const S = 34;
  const off = (((t * p.speed * dir) % S) + S) % S;
  c.strokeStyle = 'rgba(255,209,102,.75)';
  c.lineWidth = 4;
  c.lineJoin = 'round';
  for (let cx = x - S + off; cx < x + p.w + S; cx += S) {
    c.beginPath();
    c.moveTo(cx - 6 * dir, p.y - 12);
    c.lineTo(cx + 6 * dir, p.y);
    c.lineTo(cx - 6 * dir, p.y + 12);
    c.stroke();
  }
  c.restore();
}

export function drawWind(c: C, p: Extract<Prop, { k: 'wind' }>, t: number): void {
  const R = rng(9);
  const dir = Math.cos(p.a) >= 0 ? 1 : -1;
  c.save();
  c.beginPath();
  c.rect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
  c.clip();
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const y = p.y - p.h / 2 + 8 + R() * (p.h - 16);
    const speed = 130 + R() * 90;
    const u = ((t * speed + R() * p.w) % p.w) / p.w;
    const x = dir > 0 ? p.x - p.w / 2 + u * p.w : p.x + p.w / 2 - u * p.w;
    const fade = Math.sin(u * Math.PI);
    c.strokeStyle = `rgba(255,255,255,${0.55 * fade})`;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x - dir * 14, y + Math.sin(t * 4 + i) * 3, x - dir * 30, y);
    c.stroke();
  }
  c.restore();
}

/** Rubber band, wobbling after a hit. */
export function drawBand(c: C, p: Extract<Prop, { k: 'band' }>, wob: number, t: number): void {
  const mx = (p.x1 + p.x2) / 2;
  const my = (p.y1 + p.y2) / 2;
  const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  const nx = -(p.y2 - p.y1) / len;
  const ny = (p.x2 - p.x1) / len;
  const off = Math.sin(t * 46) * wob * 7;
  c.lineCap = 'round';
  c.strokeStyle = '#6f2c1f';
  c.lineWidth = 6;
  cast(c, 4);
  c.beginPath();
  c.moveTo(p.x1, p.y1);
  c.quadraticCurveTo(mx + nx * off, my + ny * off, p.x2, p.y2);
  c.stroke();
  uncast(c);
  c.strokeStyle = '#e8743c';
  c.lineWidth = 4;
  c.stroke();
  for (const [x, y] of [[p.x1, p.y1], [p.x2, p.y2]] as Pt[]) {
    disc(c, x, y, 5.5);
    cast(c, 6);
    c.fillStyle = '#e0b34e';
    c.fill();
    uncast(c);
    disc(c, x - 1, y - 1, 2);
    c.fillStyle = '#fff3c9';
    c.fill();
  }
}

export function drawSlider(c: C, skin: string, x: number, y: number, r: number, vx: number, vy: number, t: number): void {
  const dir = Math.atan2(vy, vx);
  if (skin === 'robotVac') {
    at(c, x, y, 0, () => {
      disc(c, 0, 0, r);
      cast(c, 7);
      c.fillStyle = '#2d3138';
      c.fill();
      uncast(c);
      ring(c, 0, 0, r - 1.5, 2, '#51575f');
      disc(c, 0, 0, r * 0.62);
      c.fillStyle = lin(c, -r, -r, r, r, '#4d545c', '#262a30');
      c.fill();
      disc(c, 0, 0, 5);
      c.fillStyle = Math.sin(t * 5) > 0 ? '#59e08e' : '#2c8f57';
      c.fill();
      // Side brush.
      at(c, r * 0.72, r * 0.62, t * 14, () => {
        c.strokeStyle = '#b9c2c9';
        c.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          c.rotate(TAU / 3);
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(9, 0);
          c.stroke();
        }
      });
    });
  } else if (skin === 'cart') {
    at(c, x, y, 0, () => {
      disc(c, 0, 0, r);
      cast(c, 11);
      c.fillStyle = '#9aa7b0';
      c.fill();
      uncast(c);
      disc(c, 0, 0, r - 3);
      c.fillStyle = '#e4e8ea';
      c.fill();
      blob(c, -2, 2, r - 7, 3);
      c.fillStyle = '#7b8cde';
      c.fill();
      blob(c, 4, -4, r - 13, 9);
      c.fillStyle = '#fdf6e3';
      c.fill();
      c.strokeStyle = 'rgba(60,70,80,.5)';
      c.lineWidth = 1.2;
      for (let i = -r + 7; i < r; i += 7) {
        const h = Math.sqrt(r * r - i * i) - 1;
        c.beginPath();
        c.moveTo(i, -h);
        c.lineTo(i, h);
        c.stroke();
      }
    });
  } else if (skin === 'pigeon') {
    const bob = Math.sin(t * 13) * 1.5;
    at(c, x, y, Math.abs(vx) + Math.abs(vy) > 1 ? dir : 0, () => {
      c.beginPath();
      c.ellipse(-2, 0, 11, 7.5, 0, 0, TAU);
      cast(c, 5);
      c.fillStyle = '#8b96a8';
      c.fill();
      uncast(c);
      c.beginPath();
      c.ellipse(-5, 0, 8, 5.5, 0, 0, TAU);
      c.fillStyle = '#6f7a8d';
      c.fill();
      c.fillStyle = '#3d4658';
      c.beginPath();
      c.moveTo(-10, -4);
      c.lineTo(-17, 0);
      c.lineTo(-10, 4);
      c.closePath();
      c.fill();
      disc(c, 8 + bob, 0, 4.6);
      c.fillStyle = '#4f7f7a';
      c.fill();
      c.fillStyle = '#e9a23b';
      c.beginPath();
      c.moveTo(12 + bob, -1.4);
      c.lineTo(15.5 + bob, 0);
      c.lineTo(12 + bob, 1.4);
      c.closePath();
      c.fill();
      c.fillStyle = INK;
      disc(c, 9.5 + bob, -2, 0.9);
      c.fill();
      disc(c, 9.5 + bob, 2, 0.9);
      c.fill();
    });
  }
}

/** The ball tumbling behind the washer door. */
export function drawPortalSpin(c: C, x: number, y: number, t: number, color: string): void {
  const a = t * 15;
  disc(c, x + Math.cos(a) * 9, y + Math.sin(a) * 9, 5);
  c.fillStyle = color;
  c.fill();
}

export function drawCup(c: C, x: number, y: number): void {
  // A crimped bottle cap sunk into the surface.
  c.beginPath();
  const n = 21;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU;
    const r = 14.6 + (i % 2) * 1.4;
    if (i) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else c.moveTo(x + r, y);
  }
  c.closePath();
  c.fillStyle = lin(c, x - 14, y - 14, x + 14, y + 14, '#f4f7f9', '#a4b0b9');
  c.fill();
  disc(c, x, y, 11);
  c.fillStyle = rad(c, x + 2, y + 3, 12, '#0f0d17', '#1d1a28', '#3d3a4c');
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,.4)';
  c.lineWidth = 1;
  c.stroke();
}

export function drawFlag(c: C, x: number, y: number, t: number, lift: number): void {
  const tx = x + 11;
  const ty = y - 44 - lift;
  c.lineCap = 'round';
  // The toothpick's shadow.
  c.strokeStyle = 'rgba(22,16,34,.28)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + 24, y + 22);
  c.stroke();
  c.strokeStyle = '#e4c58a';
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(x, y - lift);
  c.lineTo(tx, ty);
  c.stroke();
  const f = Math.sin(t * 5) * 2.2;
  c.fillStyle = '#e8503a';
  c.beginPath();
  c.moveTo(tx, ty);
  c.quadraticCurveTo(tx + 12, ty + 2 + f, tx + 25, ty + 5 + f * 1.4);
  c.quadraticCurveTo(tx + 12, ty + 9 - f * 0.5, tx - 1.6, ty + 13);
  c.closePath();
  c.fill();
}

export function drawTee(c: C, x: number, y: number): void {
  rr(c, x - 20, y - 15, 40, 30, 4);
  cast(c, 2);
  c.fillStyle = '#4c9a5f';
  c.fill();
  uncast(c);
  c.save();
  rr(c, x - 20, y - 15, 40, 30, 4);
  c.clip();
  const R = rng(5);
  c.strokeStyle = '#6fbb7c';
  c.lineWidth = 1;
  for (let i = 0; i < 130; i++) {
    const a = x - 20 + R() * 40;
    const b = y - 15 + R() * 30;
    c.beginPath();
    c.moveTo(a, b);
    c.lineTo(a + (R() - 0.5) * 3, b - 3);
    c.stroke();
  }
  c.restore();
  disc(c, x, y, 2.4);
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.fill();
}
