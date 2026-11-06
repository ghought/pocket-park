export type C = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

/** Device pixels per world unit. Canvas shadows ignore transforms, so they need this. */
let px = 1;
export const setPaintScale = (s: number): void => {
  px = s;
};

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rr(c: C, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + q, y);
  c.arcTo(x + w, y, x + w, y + h, q);
  c.arcTo(x + w, y + h, x, y + h, q);
  c.arcTo(x, y + h, x, y, q);
  c.arcTo(x, y, x + w, y, q);
  c.closePath();
}

export function disc(c: C, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
}

/** The next fill or stroke casts a soft shadow, as if it stood `h` tall in light from the top left. */
export function cast(c: C, h: number): void {
  c.shadowColor = 'rgba(22,16,34,.42)';
  c.shadowBlur = h * 0.75 * px;
  c.shadowOffsetX = h * 0.42 * px;
  c.shadowOffsetY = h * 0.6 * px;
}

export function uncast(c: C): void {
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = 0;
}

export function at(c: C, x: number, y: number, a: number, fn: () => void): void {
  c.save();
  c.translate(x, y);
  if (a) c.rotate(a);
  fn();
  c.restore();
}

export function lin(c: C, x0: number, y0: number, x1: number, y1: number, ...stops: string[]): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, s));
  return g;
}

export function rad(c: C, x: number, y: number, r: number, ...stops: string[]): CanvasGradient {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach((s, i) => g.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, s));
  return g;
}

/** An irregular closed outline around a point, for spills and piles. */
export function blob(c: C, x: number, y: number, r: number, seed: number, rough = 0.16): void {
  const R = rng(seed);
  const n = 12;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const q = r * (1 - rough + R() * rough * 2);
    pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]);
  }
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % n];
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    if (i === 0) {
      const [zx, zy] = pts[n - 1];
      c.moveTo((zx + ax) / 2, (zy + ay) / 2);
    }
    c.quadraticCurveTo(ax, ay, mx, my);
  }
  c.closePath();
}

export function polyPath(c: C, pts: [number, number][], closed = true): void {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (closed) c.closePath();
}

/** Fine speckle over whatever is clipped, so flat colour reads as a real surface. */
export function grain(c: C, x: number, y: number, w: number, h: number, seed: number, n: number, colors: string[], size = 1): void {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    c.fillStyle = colors[(R() * colors.length) | 0];
    const s = size * (0.5 + R());
    c.fillRect(x + R() * w, y + R() * h, s, s);
  }
}
