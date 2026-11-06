const KEY = 'pocket-park:save';
const VERSION = 1;

export interface HoleRecord {
  best: number;
  par: boolean;
  birdie: boolean;
  bank: boolean;
}

export interface SaveData {
  v: number;
  ball: string;
  muted: boolean;
  tutorial: boolean;
  holes: Record<string, HoleRecord>;
  rounds: Record<string, number>;
  daily: Record<string, { score: number; strokes: number[] }>;
  streak: { last: string; count: number; best: number };
  stats: { aces: number; dunks: number; banks: number; rounds: number };
  seenBalls: string[];
  toldBalls: string[];
}

export function fresh(): SaveData {
  return {
    v: VERSION,
    ball: 'range',
    muted: false,
    tutorial: false,
    holes: {},
    rounds: {},
    daily: {},
    streak: { last: '', count: 0, best: 0 },
    stats: { aces: 0, dunks: 0, banks: 0, rounds: 0 },
    seenBalls: ['range'],
    toldBalls: ['range'],
  };
}

export function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw);
    if (!data || data.v !== VERSION) return fresh();
    const base = fresh();
    return { ...base, ...data, streak: { ...base.streak, ...data.streak }, stats: { ...base.stats, ...data.stats } };
  } catch {
    return fresh();
  }
}

export function store(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage denied or full. The game carries on with what's in memory.
  }
}

export function medalCount(s: SaveData): number {
  let n = 0;
  for (const h of Object.values(s.holes)) n += +h.par + +h.birdie + +h.bank;
  return n;
}

export function holeMedals(s: SaveData, ids: string[]): number {
  let n = 0;
  for (const id of ids) {
    const h = s.holes[id];
    if (h) n += +h.par + +h.birdie + +h.bank;
  }
  return n;
}
