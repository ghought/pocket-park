import type { Mat } from '../core/types';
import type { ThemeId } from '../core/types';

/** Everything is synthesised, so there are no audio files to load. All of it passes through `master`. */

const HIT: Record<Mat, { f: number; q: number; decay: number; body: number }> = {
  wood: { f: 620, q: 3, decay: 0.07, body: 240 },
  metal: { f: 2400, q: 14, decay: 0.2, body: 880 },
  rubber: { f: 320, q: 2, decay: 0.09, body: 150 },
  card: { f: 460, q: 1.3, decay: 0.05, body: 170 },
  ceramic: { f: 1800, q: 9, decay: 0.12, body: 1240 },
  plastic: { f: 900, q: 4, decay: 0.06, body: 400 },
  cloth: { f: 240, q: 1, decay: 0.05, body: 100 },
  brick: { f: 520, q: 2, decay: 0.07, body: 190 },
};

const ROLL: Record<string, { f: number; q: number; g: number }> = {
  '': { f: 520, q: 0.8, g: 1 },
  slick: { f: 1500, q: 2, g: 0.5 },
  sticky: { f: 300, q: 1, g: 0.6 },
  cloth: { f: 260, q: 0.7, g: 0.5 },
  gravel: { f: 1900, q: 0.6, g: 1.7 },
  cereal: { f: 1500, q: 0.6, g: 1.5 },
  belt: { f: 280, q: 1.4, g: 1 },
  spin: { f: 420, q: 1.4, g: 1 },
};

const ROOM: Partial<Record<ThemeId, { f: number; g: number; hum?: number }>> = {
  counter: { f: 300, g: 0.02 },
  kitchenFloor: { f: 300, g: 0.02, hum: 60 },
  laundry: { f: 190, g: 0.05, hum: 55 },
  diner: { f: 620, g: 0.024 },
  dinerTable: { f: 620, g: 0.024 },
  roof: { f: 900, g: 0.04 },
  skate: { f: 900, g: 0.04 },
};

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private rollGain: GainNode | null = null;
  private rollFilter: BiquadFilterNode | null = null;
  private roomGain: GainNode | null = null;
  private roomFilter: BiquadFilterNode | null = null;
  private humGain: GainNode | null = null;
  private hum: OscillatorNode | null = null;
  private room: ThemeId | null = null;
  private suspended = false;
  muted = false;

  /** Call from a user gesture. Nothing makes a sound before this. */
  unlock(): void {
    if (this.ctx) {
      if (!this.suspended && this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.9;
    master.connect(ctx.destination);
    this.master = master;

    const n = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.rollFilter = ctx.createBiquadFilter();
    this.rollFilter.type = 'bandpass';
    this.rollFilter.frequency.value = 520;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    src.connect(this.rollFilter).connect(this.rollGain).connect(master);
    src.start();

    const air = ctx.createBufferSource();
    air.buffer = buf;
    air.loop = true;
    this.roomFilter = ctx.createBiquadFilter();
    this.roomFilter.type = 'lowpass';
    this.roomGain = ctx.createGain();
    this.roomGain.gain.value = 0;
    air.connect(this.roomFilter).connect(this.roomGain).connect(master);
    air.start();

    this.hum = ctx.createOscillator();
    this.hum.type = 'triangle';
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.hum.connect(this.humGain).connect(master);
    this.hum.start();

    if (this.room) this.setRoom(this.room);
    if (this.suspended) void ctx.suspend();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.01);
  }

  suspend(): void {
    this.suspended = true;
    if (this.ctx) void this.ctx.suspend();
  }

  resume(): void {
    this.suspended = false;
    if (this.ctx) void this.ctx.resume();
  }

  setRoom(theme: ThemeId | null): void {
    this.room = theme;
    const ctx = this.ctx;
    if (!ctx || !this.roomGain || !this.roomFilter || !this.humGain || !this.hum) return;
    const r = theme ? ROOM[theme] : undefined;
    const now = ctx.currentTime;
    this.roomGain.gain.setTargetAtTime(r?.g ?? 0, now, 0.3);
    this.roomFilter.frequency.setTargetAtTime(r?.f ?? 300, now, 0.3);
    this.humGain.gain.setTargetAtTime(r?.hum ? 0.018 : 0, now, 0.3);
    if (r?.hum) this.hum.frequency.setTargetAtTime(r.hum, now, 0.1);
  }

  /** Called each frame with the ball's speed, for the rolling sound. */
  roll(speed: number, surface: string, air: boolean): void {
    if (!this.ctx || !this.rollGain || !this.rollFilter) return;
    const s = ROLL[surface] ?? ROLL[''];
    const now = this.ctx.currentTime;
    const g = air ? 0 : Math.min(0.11, (speed / 800) * 0.13) * s.g;
    this.rollGain.gain.setTargetAtTime(g, now, 0.03);
    this.rollFilter.frequency.setTargetAtTime(s.f * (0.75 + Math.min(1, speed / 700) * 0.6), now, 0.04);
    this.rollFilter.Q.setTargetAtTime(s.q, now, 0.05);
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', when = 0, slide = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(freq: number, q: number, dur: number, vol: number, when = 0, type: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime + when;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 1.5, dur + 0.02);
  }

  putt(power: number): void {
    this.burst(2600, 2, 0.03, 0.34 + power * 0.25);
    this.tone(180 + power * 90, 0.09, 0.22 + power * 0.2, 'sine', 0, 0.55);
  }

  hit(mat: Mat, speed: number): void {
    const h = HIT[mat];
    const v = Math.min(1, speed / 620);
    const vol = 0.06 + v * 0.34;
    this.burst(h.f * (0.92 + Math.random() * 0.16), h.q, h.decay, vol);
    this.tone(h.body * (0.96 + Math.random() * 0.08), h.decay * 1.3, vol * 0.65, 'triangle', 0, 0.86);
  }

  boing(): void {
    this.tone(210, 0.2, 0.26, 'triangle', 0, 2.4);
    this.tone(420, 0.16, 0.1, 'sine', 0.02, 1.9);
  }

  cup(): void {
    this.tone(1250, 0.05, 0.18, 'triangle');
    this.tone(980, 0.05, 0.18, 'triangle', 0.07);
    this.tone(760, 0.06, 0.2, 'triangle', 0.13);
    this.tone(190, 0.2, 0.4, 'sine', 0.17, 0.7);
    this.burst(900, 3, 0.09, 0.14, 0.17);
  }

  lip(): void {
    this.tone(1100, 0.06, 0.2, 'triangle', 0, 0.7);
    this.tone(620, 0.08, 0.18, 'triangle', 0.05, 0.8);
  }

  splash(): void {
    this.burst(1300, 0.7, 0.34, 0.42);
    this.burst(420, 0.8, 0.5, 0.32, 0.05);
    this.tone(280, 0.2, 0.18, 'sine', 0, 0.45);
  }

  fall(): void {
    this.tone(1300, 0.62, 0.13, 'sine', 0, 0.2);
  }

  launch(): void {
    this.burst(900, 1, 0.3, 0.14);
    this.tone(280, 0.28, 0.14, 'triangle', 0, 2.3);
  }

  land(speed: number): void {
    const v = Math.min(1, speed / 400);
    this.burst(320, 1, 0.09, 0.14 + v * 0.3);
    this.tone(120, 0.12, 0.2 + v * 0.2, 'sine', 0, 0.7);
  }

  portal(): void {
    for (let i = 0; i < 8; i++) this.burst(380 + i * 90, 2.5, 0.06, 0.13, i * 0.085);
    this.tone(130, 0.7, 0.13, 'sawtooth', 0, 2.2);
  }

  portalOut(): void {
    this.tone(330, 0.12, 0.24, 'square', 0, 2);
    this.burst(1200, 1, 0.14, 0.2);
  }

  tick(): void {
    this.burst(2400, 3, 0.022, 0.13);
  }

  stamp(n = 0): void {
    this.burst(460, 1, 0.08, 0.42);
    this.tone(150 + n * 12, 0.1, 0.3, 'sine', 0, 0.6);
  }

  /** Rank 0 is an ace, higher numbers are humbler. */
  fanfare(rank: number): void {
    const songs = [[523, 659, 784, 1047, 1319], [523, 659, 784, 1047], [523, 659, 784], [392, 523], [294, 262]];
    const notes = songs[Math.min(rank, songs.length - 1)];
    notes.forEach((f, i) => {
      this.tone(f, 0.24, 0.17, 'triangle', 0.22 + i * 0.1);
      this.tone(f * 2, 0.15, 0.05, 'sine', 0.22 + i * 0.1);
    });
  }
}
