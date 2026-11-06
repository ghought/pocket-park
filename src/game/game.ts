import { connectBridge, type Bridge } from '../bridge';
import { BALLS } from '../content/balls';
import { dailyFor, dateKey, daysAgo, prettyDate } from '../content/daily';
import { HOLES, PACKS, holeById } from '../content/holes';
import { DT, MAX_SHOT, MIN_SHOT, Sim, rollReach, type SimEvent } from '../core/physics';
import type { HoleDef, TwistId } from '../core/types';
import { TWISTS, buildWorld } from '../core/world';
import { Scene, type Aim } from '../render/scene';
import { Sound } from './audio';
import { load, medalCount, store, type SaveData } from './save';
import { UI, type CardRow, type HoleResult } from './ui';

type Phase = 'idle' | 'attract' | 'ready' | 'rolling' | 'recover' | 'holed';

interface RoundHole {
  def: HoleDef;
  twist: TwistId;
  windDir: number;
}

interface Round {
  packId: string | null;
  date: string | null;
  title: string;
  place: string;
  holes: RoundHole[];
  index: number;
  rows: CardRow[];
  /** Medals held when the round began, so a newly opened course can be announced. */
  medalsAtStart: number;
}

const WORDS: Record<string, string> = { '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', '0': 'Par', '1': 'Bogey', '2': 'Double Bogey', '3': 'Triple Bogey' };

const DRAG_DEAD = 14;

const COLORS = {
  wood: ['#e7c48d', '#fff'],
  metal: ['#fff', '#cfe3ee'],
  rubber: ['#e8743c', '#ffd166'],
  card: ['#f7b538', '#fff'],
  ceramic: ['#fff', '#d8ecec'],
  plastic: ['#9fd8d0', '#fff'],
  cloth: ['#ddd', '#fff'],
  brick: ['#f08a6e', '#fff'],
};

export class Game {
  private save: SaveData = load();
  private sound = new Sound();
  private scene: Scene;
  private ui: UI;
  private bridge: Bridge;

  private sim: Sim | null = null;
  private round: Round | null = null;
  private phase: Phase = 'idle';
  private strokes = 0;
  private lastSpot: [number, number] = [0, 0];
  private acc = 0;
  private last = 0;
  private timers: { t: number; fn: () => void }[] = [];
  private showBall = true;
  private attractWait = 0;

  /** Everything that wants the game stopped. Paused means any of these. */
  private holds = new Set<'menu' | 'shell' | 'hidden'>();

  private aim: Aim | null = null;
  private drag: { id: number; x: number; y: number } | null = null;
  private keys = new Set<string>();
  private kbAng = -Math.PI / 2;
  private kbPower = 0.45;
  private kbOn = false;
  private usedKeys = false;

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    this.scene = new Scene(canvas);
    this.scene.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.scene.setBall(this.save.ball);
    this.ui = new UI(root, (a, v) => this.act(a, v));
    this.sound.setMuted(this.save.muted);

    this.bridge = connectBridge({
      onPause: () => this.hold('shell', true),
      onResume: () => this.hold('shell', false),
      // The hub's sound button belongs to the hub, so it isn't saved as this game's setting.
      onMute: (m) => this.sound.setMuted(m || this.save.muted),
      onRestart: () => this.restartRound(),
    });

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', () => this.cancelAim());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      document.documentElement.classList.add('keys');
      this.onKey(e, true);
    });
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('resize', () => {
      this.scene.resize();
      this.landscapeHint();
    });
    document.addEventListener('visibilitychange', () => this.hold('hidden', document.hidden));

    const unlock = () => this.sound.unlock();
    window.addEventListener('pointerdown', () => document.documentElement.classList.remove('keys'), { capture: true });
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  start(): void {
    this.attract();
    this.ui.title();
    requestAnimationFrame((t) => this.frame(t));
  }

  private get paused(): boolean {
    return this.holds.size > 0;
  }

  private hold(why: 'menu' | 'shell' | 'hidden', on: boolean): void {
    if (on) this.holds.add(why);
    else this.holds.delete(why);
    if (this.paused) {
      this.cancelAim();
      this.sound.suspend();
    } else {
      this.sound.resume();
      this.last = performance.now();
    }
  }

  private setMuted(m: boolean): void {
    this.save.muted = m;
    this.sound.setMuted(m);
    store(this.save);
  }

  private later(t: number, fn: () => void): void {
    this.timers.push({ t, fn });
  }

  // ---- Main loop ----

  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    // Clamped, so coming back from a pause or a slow frame can't leap the ball forward.
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.tick(dt);
  }

  private tick(dt: number): void {
    const sim = this.sim;

    if (!this.paused) {
      if (sim) {
        this.acc += dt;
        while (this.acc >= DT) {
          sim.step();
          this.acc -= DT;
        }
        this.drain(sim);
        this.watch(sim, dt);
        this.sound.roll(sim.state === 'moving' ? Math.hypot(sim.vx, sim.vy) : 0, sim.surface, sim.air);
      }
      const due = this.timers.filter((x) => (x.t -= dt) <= 0);
      if (due.length) {
        this.timers = this.timers.filter((x) => x.t > 0);
        due.forEach((x) => x.fn());
      }
      this.scene.update(dt, sim);
      this.keyboardAim(dt);
    }
    if (this.paused || !sim) this.sound.roll(0, '', false);
    this.scene.render(sim, this.aim, this.showBall);
  }

  private watch(sim: Sim, dt: number): void {
    if (this.phase === 'attract') {
      this.attractStep(sim, dt);
    } else if (this.phase === 'rolling' && sim.state === 'rest') {
      this.settled();
    } else if (this.phase === 'ready' && sim.state === 'moving') {
      // Something knocked it while it sat still.
      this.cancelAim();
      this.phase = 'rolling';
    }
  }

  private settled(): void {
    this.phase = 'ready';
    this.syncHud();
    const def = this.hole!.def;
    if (this.strokes >= def.par + 5) this.finishHole(true);
    else if (this.kbOn) this.refreshKeyboardAim();
  }

  private drain(sim: Sim): void {
    const ev = sim.events;
    if (!ev.length) return;
    sim.events = [];
    for (const e of ev) this.onEvent(sim, e);
  }

  private onEvent(sim: Sim, e: SimEvent): void {
    const demo = this.phase === 'attract';
    switch (e.t) {
      case 'hit': {
        const hard = e.speed > 140;
        if (!demo) this.sound.hit(e.mat, e.speed);
        if (e.bumper) {
          if (!demo) this.sound.boing();
          this.scene.wobble(e.x, e.y);
          this.scene.ring(e.x, e.y, '#ffd166', 6, 110, 0.32);
        }
        if (hard) {
          this.scene.burst(e.x, e.y, Math.min(9, 2 + (e.speed / 90) | 0), COLORS[e.mat], 40 + e.speed * 0.28, 0, 1.7);
          this.scene.shake(Math.min(5, e.speed / 170));
        }
        break;
      }
      case 'launch':
        if (!demo) this.sound.launch();
        break;
      case 'land':
        if (!demo) this.sound.land(e.speed);
        this.scene.ring(e.x, e.y, 'rgba(255,255,255,.8)', 7, 70, 0.3);
        this.scene.burst(e.x, e.y, 6, ['#fff', '#ddd'], 70, 0, 1.6);
        break;
      case 'lip':
        if (!demo) this.sound.lip();
        this.scene.pop(e.x, e.y, 'Too hot!', '#ffd166', 18);
        break;
      case 'portalIn':
        if (!demo) this.sound.portal();
        break;
      case 'portalOut':
        if (!demo) this.sound.portalOut();
        this.scene.ring(e.x, e.y, '#ffd166', 8, 90, 0.35);
        break;
      case 'fall':
        this.onFall(sim, e);
        break;
      case 'sunk':
        this.onSunk(sim, e.dunk);
        break;
    }
  }

  private onFall(sim: Sim, e: Extract<SimEvent, { t: 'fall' }>): void {
    if (this.phase === 'attract') {
      this.later(0.6, () => sim.place(...this.hole0()));
      return;
    }
    this.cancelAim();
    this.phase = 'recover';
    const def = this.hole!.def;
    if (e.kind === 'water') {
      this.sound.splash();
      this.scene.ballFx('splash', e.x, e.y);
      this.scene.ring(e.x, e.y, '#fff', 4, 70, 0.5);
      this.scene.ring(e.x, e.y, 'rgba(255,255,255,.7)', 2, 45, 0.7);
      this.scene.burst(e.x, e.y, 16, ['#fff', '#bfe3f2', '#7fc4e0'], 150, 300, 2.2);
    } else {
      this.sound.fall();
      this.scene.ballFx('fall', e.x, e.y);
    }
    if (e.free) {
      this.scene.pop(e.x, e.y, 'Squeezed out', '#fff', 18);
    } else {
      this.strokes++;
      this.syncHud();
      this.scene.pop(e.x, e.y, `${def.fall ?? 'Out of bounds'}  +1`, '#ff9d7e', 19);
    }
    this.later(0.85, () => {
      if (this.phase !== 'recover') return;
      if (this.strokes >= def.par + 5) {
        this.finishHole(true);
        return;
      }
      sim.place(this.lastSpot[0], this.lastSpot[1]);
      this.scene.ballFx('drop', sim.x, sim.y);
      this.sound.land(120);
      this.phase = 'ready';
      this.syncHud();
      if (this.kbOn) this.refreshKeyboardAim();
    });
  }

  private onSunk(sim: Sim, dunk: boolean): void {
    if (this.phase === 'attract') {
      this.scene.ballFx('sink', sim.x, sim.y);
      this.scene.confetti(sim.w.cupX, sim.w.cupY);
      this.later(1.4, () => {
        sim.place(...this.hole0());
        this.scene.ballFx('drop', sim.x, sim.y);
      });
      return;
    }
    this.cancelAim();
    this.phase = 'holed';
    this.sound.cup();
    this.scene.ballFx('sink', sim.x, sim.y);
    const brag = this.strokes === 1 ? 'Ace!' : dunk ? 'Slam dunk!' : sim.banks >= 2 ? 'Bank shot!' : '';
    this.later(0.26, () => {
      this.scene.confetti(sim.w.cupX, sim.w.cupY);
      this.scene.shake(3);
      if (brag) this.scene.pop(sim.w.cupX, sim.w.cupY + 36, brag, '#ffd166', 30);
    });
    this.later(0.62, () => this.finishHole(false, dunk));
  }

  // ---- Title demo ----

  private hole0(): [number, number] {
    return [HOLES[0].tee[0], HOLES[0].tee[1]];
  }

  private attract(): void {
    this.round = null;
    this.ui.hud(false);
    this.timers = [];
    const def = HOLES[0];
    this.scene.setHole(def, 'none', 1);
    this.sim = new Sim(buildWorld(def));
    this.sim.place(def.tee[0], def.tee[1]);
    this.phase = 'attract';
    this.attractWait = 0.8;
    this.showBall = true;
    this.sound.setRoom(null);
  }

  private attractStep(sim: Sim, dt: number): void {
    if (sim.state !== 'rest') return;
    this.attractWait -= dt;
    if (this.attractWait > 0) return;
    this.attractWait = 1.1;
    const ang = Math.atan2(sim.w.cupY - sim.y, sim.w.cupX - sim.x) + (Math.random() - 0.5) * 1.3;
    sim.shoot(ang, 340 + Math.random() * 300);
  }

  // ---- Rounds ----

  private get hole(): RoundHole | null {
    return this.round ? this.round.holes[this.round.index] : null;
  }

  private startPack(id: string): void {
    const pack = PACKS.find((p) => p.id === id);
    if (!pack) return;
    this.round = {
      packId: id, date: null, title: pack.name, place: pack.place, index: 0, rows: [], medalsAtStart: 0,
      holes: pack.holes.map((h) => ({ def: holeById(h), twist: 'none', windDir: 1 })),
    };
    this.beginRound();
  }

  private startDaily(date: string): void {
    const today = dateKey(new Date());
    this.round = {
      packId: null, date, index: 0, rows: [], medalsAtStart: 0,
      title: date === today ? 'Today’s Three' : 'Past Three',
      place: prettyDate(date),
      holes: dailyFor(date),
    };
    this.beginRound();
  }

  private beginRound(): void {
    this.ui.clear();
    this.ui.hud(true);
    this.round!.index = 0;
    this.round!.rows = [];
    this.round!.medalsAtStart = medalCount(this.save);
    this.bridge.playStarted();
    this.loadHole();
  }

  private restartRound(): void {
    if (!this.round) return;
    this.holds.delete('menu');
    this.hold('menu', false);
    this.timers = [];
    this.beginRound();
  }

  private loadHole(): void {
    const h = this.hole!;
    this.timers = [];
    this.cancelAim();
    this.scene.setHole(h.def, h.twist, h.windDir);
    this.sound.setRoom(h.def.theme);
    this.sim = new Sim(buildWorld(h.def, h.twist, h.windDir));
    this.sim.place(h.def.tee[0], h.def.tee[1]);
    this.lastSpot = [h.def.tee[0], h.def.tee[1]];
    this.strokes = 0;
    this.phase = 'ready';
    this.showBall = true;
    this.acc = 0;
    this.scene.ballFx('drop', h.def.tee[0], h.def.tee[1]);
    this.syncHud();
    this.scene.hint = !this.save.tutorial;
    const twist = h.twist !== 'none' ? `${TWISTS[h.twist].name}: ${TWISTS[h.twist].blurb}` : '';
    this.ui.toast(twist || h.def.tip);
    this.landscapeHint();
    if (this.kbOn) this.refreshKeyboardAim();
  }

  /** The course still plays sideways, just small. A phone held upright shows it far bigger. */
  private landscapeHint(): void {
    if (this.round && window.innerHeight < 480 && window.innerWidth > window.innerHeight) {
      this.ui.toast('Turn your phone upright for a bigger course');
    }
  }

  private syncHud(): void {
    const r = this.round!;
    this.ui.setHud(`Hole ${r.index + 1} of ${r.holes.length}`, this.hole!.def.name, this.hole!.def.par, Math.max(1, this.strokes + (this.phase === 'ready' ? 1 : 0)));
  }

  private resetHole(): void {
    if (!this.sim || !this.round || this.phase === 'holed') return;
    const h = this.hole!;
    this.timers = [];
    this.cancelAim();
    this.sim.place(h.def.tee[0], h.def.tee[1]);
    this.sim.events = [];
    this.lastSpot = [h.def.tee[0], h.def.tee[1]];
    this.strokes = 0;
    this.phase = 'ready';
    this.scene.ballFx('drop', h.def.tee[0], h.def.tee[1]);
    this.sound.tick();
    this.syncHud();
  }

  private shoot(ang: number, speed: number, power: number): void {
    const sim = this.sim;
    if (!sim || this.phase !== 'ready' || sim.state !== 'rest') return;
    this.lastSpot = [sim.x, sim.y];
    this.strokes++;
    sim.shoot(ang, speed);
    this.phase = 'rolling';
    this.sound.putt(power);
    this.scene.burst(sim.x, sim.y, 5, ['#fff'], 60 + power * 90, 0, 1.5);
    this.syncHud();
    this.ui.hideToast();
    if (!this.save.tutorial) {
      this.save.tutorial = true;
      this.scene.hint = false;
      store(this.save);
    }
  }

  private finishHole(pickedUp: boolean, dunk = false): void {
    const sim = this.sim!;
    const r = this.round!;
    const h = this.hole!;
    const def = h.def;
    if (pickedUp) this.strokes = def.par + 5;
    const strokes = this.strokes;
    const diff = strokes - def.par;
    this.phase = 'holed';

    const banks = pickedUp ? 0 : sim.banks;
    const earnedNow = { par: !pickedUp && diff <= 0, birdie: !pickedUp && diff < 0, bank: banks >= 2 };
    const rec = (this.save.holes[def.id] ??= { best: 99, par: false, birdie: false, bank: false });
    const firstBest = !pickedUp && strokes < rec.best && rec.best !== 99;
    const earned = (['par', 'birdie', 'bank'] as const).filter((m) => earnedNow[m] && !rec[m]);
    if (!pickedUp) rec.best = Math.min(rec.best, strokes);
    rec.par ||= earnedNow.par;
    rec.birdie ||= earnedNow.birdie;
    rec.bank ||= earnedNow.bank;
    if (strokes === 1 && !pickedUp) this.save.stats.aces++;
    if (dunk) this.save.stats.dunks++;
    if (earnedNow.bank) this.save.stats.banks++;
    store(this.save);

    r.rows.push({
      name: def.name, par: def.par, strokes,
      medals: { par: rec.par, birdie: rec.birdie, bank: rec.bank },
      twist: h.twist === 'none' ? undefined : TWISTS[h.twist].name,
    });

    const notes: string[] = [];
    if (pickedUp) notes.push('Picked up. It happens to everybody.');
    else {
      if (dunk) notes.push('Slam dunk, straight from the air');
      else if (sim.flew) notes.push('Air mail');
      if (banks >= 2) notes.push(`${banks}-bank shot, last off ${sim.lastBank}`);
      else if (banks === 1) notes.push(`Off ${sim.lastBank}`);
    }

    const word = pickedUp ? 'Picked up' : strokes === 1 ? 'Hole in One!' : (WORDS[diff] ?? `+${diff}`);
    const result: HoleResult = {
      word, strokes, par: def.par, earned: [...earned], notes,
      last: r.index === r.holes.length - 1, best: firstBest,
    };
    this.sound.fanfare(pickedUp ? 4 : strokes === 1 ? 0 : diff <= -1 ? 1 : diff === 0 ? 2 : diff === 1 ? 3 : 4);
    this.ui.holeResult(result);
    earned.forEach((_, i) => this.later(0.3 + i * 0.22, () => this.sound.stamp(i)));
  }

  private next(): void {
    const r = this.round;
    if (!r) return;
    if (r.index < r.holes.length - 1) {
      r.index++;
      this.ui.clear();
      this.loadHole();
    } else {
      this.finishRound();
    }
  }

  private finishRound(): void {
    const r = this.round!;
    const total = r.rows.reduce((n, x) => n + x.strokes, 0);
    const par = r.rows.reduce((n, x) => n + x.par, 0);
    let best: number | null = null;
    let newBest = false;
    const today = dateKey(new Date());

    if (r.packId) {
      const prev = this.save.rounds[r.packId];
      newBest = prev !== undefined && total < prev;
      this.save.rounds[r.packId] = Math.min(prev ?? 999, total);
      best = this.save.rounds[r.packId];
    } else if (r.date) {
      const prev = this.save.daily[r.date];
      newBest = !!prev && total < prev.score;
      if (!prev || total < prev.score) this.save.daily[r.date] = { score: total, strokes: r.rows.map((x) => x.strokes) };
      best = this.save.daily[r.date].score;
      if (r.date === today && this.save.streak.last !== today) {
        const s = this.save.streak;
        s.count = s.last === daysAgo(1) ? s.count + 1 : 1;
        s.last = today;
        s.best = Math.max(s.best, s.count);
      }
    }
    this.save.stats.rounds++;

    const newBalls = BALLS.filter((b) => b.unlocked(this.save) && !this.save.toldBalls.includes(b.id)).map((b) => b.id);
    this.save.toldBalls.push(...newBalls);
    const after = medalCount(this.save);
    const pack = PACKS.find((p) => p.need > r.medalsAtStart && p.need <= after);
    const idx = PACKS.findIndex((p) => p.id === r.packId);
    const nextPack = idx >= 0 ? PACKS.slice(idx + 1).find((p) => p.need <= after)?.id ?? null : null;
    store(this.save);

    this.bridge.roundEnded({ score: total });
    this.ui.scorecard({
      title: r.title, place: r.place, rows: r.rows, total, par, best, newBest, newBalls,
      newPack: pack?.name ?? null, nextPack, daily: !!r.date, streak: this.save.streak.count,
    });
    this.lastCard = { title: r.title, place: r.place, total, par, strokes: r.rows.map((x) => x.strokes) };
    this.sound.fanfare(total <= par ? 1 : 3);
  }

  private lastCard: { title: string; place: string; total: number; par: number; strokes: number[] } | null = null;

  private async share(): Promise<void> {
    const c = this.lastCard;
    if (!c) return;
    const d = c.total - c.par;
    const url = this.bridge.canonicalUrl() || location.href;
    const text = `Pocket Park · ${c.title} · ${c.place}\n${c.strokes.join(' ')} = ${c.total} (${d === 0 ? 'even' : d > 0 ? `+${d}` : d})\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.ui.toast('Copied to your clipboard', 2000);
      return;
    } catch {
      // Sandboxed frames can block both, so fall through to a box they can copy from.
    }
    this.ui.shareFallback(text);
  }

  private home(): void {
    this.hold('menu', false);
    this.round = null;
    this.ui.hud(false);
    this.ui.hideToast();
    this.phase = 'idle';
    this.sim = null;
    this.timers = [];
    this.sound.setRoom(null);
    this.cancelAim();
    this.ui.clubhouse(this.save, dateKey(new Date()));
  }

  private openPause(): void {
    if (!this.round || this.holds.has('menu') || this.phase === 'holed') return;
    this.hold('menu', true);
    this.ui.pause(this.save.muted, this.usedKeys || matchMedia('(hover: hover)').matches);
  }

  private closePause(): void {
    this.ui.clear();
    this.hold('menu', false);
  }

  private act(name: string, value: string): void {
    this.sound.tick();
    switch (name) {
      case 'start':
        // A first-timer has nothing to choose yet, so the first tap reaches the first hole.
        if (this.save.tutorial) this.home();
        else this.startPack(PACKS[0].id);
        break;
      case 'home':
        this.home();
        break;
      case 'pack':
        this.startPack(value);
        break;
      case 'daily':
        this.startDaily(value);
        break;
      case 'locker':
        this.ui.locker(this.save);
        this.save.seenBalls = BALLS.filter((b) => b.unlocked(this.save)).map((b) => b.id);
        this.save.toldBalls = [...this.save.seenBalls];
        store(this.save);
        break;
      case 'ball':
        this.save.ball = value;
        this.scene.setBall(value);
        store(this.save);
        this.ui.locker(this.save);
        break;
      case 'pause':
        this.openPause();
        break;
      case 'resume':
        this.closePause();
        break;
      case 'reset':
        this.resetHole();
        break;
      case 'restart-hole':
        this.closePause();
        this.resetHole();
        break;
      case 'sound':
        this.setMuted(!this.save.muted);
        this.ui.pause(this.save.muted, this.usedKeys || matchMedia('(hover: hover)').matches);
        break;
      case 'quit':
        this.home();
        break;
      case 'next':
        this.next();
        break;
      case 'again':
        this.beginRound();
        break;
      case 'share':
        void this.share();
        break;
      case 'share-done':
        this.ui.closeShare();
        break;
    }
  }

  // ---- Input ----

  private aimFrom(ang: number, power: number): Aim {
    const speed = MIN_SHOT + (MAX_SHOT - MIN_SHOT) * Math.pow(power, 1.4);
    return { ang, power, speed, reach: rollReach(speed, this.sim?.w.baseMu ?? 1) };
  }

  private canAim(): boolean {
    return this.phase === 'ready' && !this.paused && this.sim?.state === 'rest';
  }

  private onDown(e: PointerEvent): void {
    if (this.drag || !this.canAim()) return;
    e.preventDefault();
    this.kbOn = false;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // The pointer can vanish between the event and this call. The drag still works without capture.
    }
  }

  private maxPull(): number {
    return Math.max(100, Math.min(150, this.scene.H * 0.2));
  }

  private onMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    if (!this.canAim()) {
      this.cancelAim();
      return;
    }
    const dx = d.x - e.clientX;
    const dy = d.y - e.clientY;
    const len = Math.hypot(dx, dy);
    if (len < DRAG_DEAD) {
      this.aim = null;
      return;
    }
    this.aim = this.aimFrom(Math.atan2(dy, dx), Math.min(1, (len - DRAG_DEAD) / this.maxPull()));
  }

  private onUp(e: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const a = this.aim;
    this.drag = null;
    this.aim = null;
    if (a) this.shoot(a.ang, a.speed, a.power);
  }

  private cancelAim(): void {
    this.drag = null;
    this.aim = null;
  }

  private refreshKeyboardAim(): void {
    const sim = this.sim;
    if (!sim) return;
    this.kbAng = Math.atan2(sim.w.cupY - sim.y, sim.w.cupX - sim.x);
    this.aim = this.aimFrom(this.kbAng, this.kbPower);
  }

  private keyboardAim(dt: number): void {
    if (!this.kbOn || !this.canAim()) return;
    const k = this.keys;
    const fine = k.has('Shift') ? 0.28 : 1;
    const left = k.has('ArrowLeft') || k.has('a');
    const right = k.has('ArrowRight') || k.has('d');
    const up = k.has('ArrowUp') || k.has('w');
    const down = k.has('ArrowDown') || k.has('s');
    if (left) this.kbAng -= 1.5 * fine * dt;
    if (right) this.kbAng += 1.5 * fine * dt;
    if (up) this.kbPower = Math.min(1, this.kbPower + 0.6 * fine * dt);
    if (down) this.kbPower = Math.max(0.04, this.kbPower - 0.6 * fine * dt);
    this.aim = this.aimFrom(this.kbAng, this.kbPower);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!down) {
      this.keys.delete(key);
      return;
    }
    this.keys.add(key);
    if (e.repeat) return;

    if (key === 'm') {
      this.setMuted(!this.save.muted);
      return;
    }
    if (!this.round) return;

    if (key === 'p' || key === 'Escape') {
      if (this.holds.has('menu')) this.closePause();
      else this.openPause();
      return;
    }
    if (this.ui.open) return;
    if (key === 'r') {
      this.resetHole();
      return;
    }
    const aimKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'];
    if (aimKeys.includes(key)) {
      e.preventDefault();
      this.usedKeys = true;
      if (!this.kbOn && this.canAim()) {
        this.kbOn = true;
        this.refreshKeyboardAim();
      }
    }
    if ((key === ' ' || key === 'Enter') && this.canAim()) {
      e.preventDefault();
      this.usedKeys = true;
      if (!this.kbOn) {
        this.kbOn = true;
        this.refreshKeyboardAim();
      } else if (this.aim) {
        const a = this.aim;
        this.aim = null;
        this.shoot(a.ang, a.speed, a.power);
      }
    }
  }
}


