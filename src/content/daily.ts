import type { HoleDef, TwistId } from '../core/types';
import { mirrorHole } from '../core/world';
import { rng } from '../render/paint';
import { HOLES } from './holes';

/*
 * The daily course is worked out from the date, so nothing has to be published
 * and it can't run out. Every player on a given date gets the same three holes,
 * mirrored and twisted the same way.
 */

export interface DailyHole {
  def: HoleDef;
  twist: TwistId;
  windDir: number;
}

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function daysAgo(n: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - n);
  return dateKey(d);
}

export function prettyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyFor(key: string): DailyHole[] {
  const R = rng(hash(`pocket-park:${key}`));
  const twists: TwistId[] = ['slick', 'tacky', 'draft'];
  return ([1, 2, 3] as const).map((tier) => {
    const pool = HOLES.filter((h) => h.tier === tier);
    const pick = pool[Math.floor(R() * pool.length)];
    const mirror = R() < 0.5;
    const twist: TwistId = R() < 0.7 ? twists[Math.floor(R() * twists.length)] : 'none';
    const windDir = R() < 0.5 ? -1 : 1;
    return { def: mirror ? mirrorHole(pick) : pick, twist, windDir };
  });
}
