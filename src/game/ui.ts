import { BALLS, ballById } from '../content/balls';
import { dailyFor, daysAgo, prettyDate } from '../content/daily';
import { HOLES, PACKS, holeById, type Pack } from '../content/holes';
import { TWISTS } from '../core/world';
import { drawBallFace, identity } from '../render/ball';
import { paintThumb } from '../render/scene';
import { THEME_INK } from '../render/themes';
import { holeMedals, medalCount, type SaveData } from './save';

const ICON = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11a8 8 0 1 1 2.3 6.3M4 5v6h6"/></svg>',
  par: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21V3l9 4.5L9 12"/></svg>',
  birdie: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9c3-1 5 0 7 3 1-4 4-7 8-7l3 2-3 1c0 6-4 10-9 10-2 0-4-1-5-2l3-2C5 13 4 11 3 9z"/></svg>',
  bank: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 19 10 6l5 11 6-9M16 8h5v5"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.8 6.4.7-4.8 4.2 1.4 6.3L12 16.8 6.4 20l1.4-6.3L3 9.5l6.4-.7z"/></svg>',
};

type MedalId = 'par' | 'birdie' | 'bank';

const medal = (id: MedalId, on: boolean, big = false) =>
  `<span class="medal ${id} ${on ? 'on' : ''} ${big ? 'big' : ''}" title="${MEDAL_NAME[id]}">${ICON[id]}</span>`;

const MEDAL_NAME: Record<MedalId, string> = { par: 'Par', birdie: 'Birdie', bank: 'Bank shot' };

export interface HoleResult {
  word: string;
  strokes: number;
  par: number;
  earned: MedalId[];
  notes: string[];
  last: boolean;
  best: boolean;
}

export interface CardRow {
  name: string;
  par: number;
  strokes: number;
  medals: { par: boolean; birdie: boolean; bank: boolean };
  twist?: string;
}

export interface CardSummary {
  title: string;
  place: string;
  rows: CardRow[];
  total: number;
  par: number;
  best: number | null;
  newBest: boolean;
  newBalls: string[];
  newPack: string | null;
  nextPack: string | null;
  daily: boolean;
  streak: number;
}

const signed = (n: number) => (n === 0 ? 'Even' : n > 0 ? `+${n}` : `−${-n}`);

function scoreMark(strokes: number, par: number): string {
  const d = strokes - par;
  const cls = d <= -2 ? 'eagle' : d === -1 ? 'birdie' : d === 1 ? 'bogey' : d >= 2 ? 'double' : '';
  return `<span class="mark ${cls}">${strokes}</span>`;
}

export class UI {
  private overlay: HTMLElement;
  private hudEl: HTMLElement;
  private toastEl: HTMLElement;
  private toastTimer = 0;

  constructor(root: HTMLElement, private act: (name: string, value: string) => void) {
    root.innerHTML = `
      <div id="hud" hidden></div>
      <div id="toast" role="status"></div>
      <div id="overlay"></div>`;
    this.overlay = root.querySelector('#overlay')!;
    this.hudEl = root.querySelector('#hud')!;
    this.toastEl = root.querySelector('#toast')!;
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (el && !el.hasAttribute('disabled')) this.act(el.dataset.act!, el.dataset.val ?? '');
      // Space and Enter belong to the shot, not to a HUD button left holding focus.
      if (el?.closest('#hud')) el.blur();
    });
  }

  private show(html: string, cls = ''): void {
    this.overlay.className = cls;
    this.overlay.innerHTML = html;
    this.overlay.scrollTop = 0;
    this.overlay.querySelector<HTMLElement>('[data-focus]')?.focus({ preventScroll: true });
  }

  clear(): void {
    this.overlay.className = '';
    this.overlay.innerHTML = '';
  }

  get open(): boolean {
    return this.overlay.innerHTML !== '';
  }

  // ---- In play ----

  hud(on: boolean): void {
    this.hudEl.hidden = !on;
  }

  setHud(label: string, name: string, par: number, stroke: number): void {
    this.hudEl.innerHTML = `
      <button class="icon" data-act="pause" aria-label="Pause">${ICON.pause}</button>
      <div class="hud-name"><small>${label}</small><b>${name}</b></div>
      <div class="hud-stat"><small>Par</small><b>${par}</b></div>
      <div class="hud-stat you"><small>Stroke</small><b>${stroke}</b></div>
      <button class="icon" data-act="reset" aria-label="Reset hole">${ICON.reset}</button>`;
  }

  toast(text: string, ms = 3600): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.hideToast(), ms);
  }

  hideToast(): void {
    this.toastEl.classList.remove('on');
  }

  // ---- Screens ----

  title(): void {
    this.show(
      `<div class="title">
        <h1 class="logo"><span>Pocket</span><span>Park</span></h1>
        <div class="grow"></div>
        <p class="tag">Miniature golf in weird little places</p>
        <button class="btn primary big" data-act="start" data-focus>Tee off</button>
      </div>`,
      'clear',
    );
  }

  clubhouse(s: SaveData, today: string): void {
    const total = medalCount(s);
    const b = ballById(s.ball);
    const daily = dailyFor(today);
    const played = s.daily[today];
    const par = daily.reduce((n, d) => n + d.def.par, 0);
    const past = [1, 2, 3, 4, 5, 6].map((n) => daysAgo(n));

    const dailyHoles = daily
      .map((d) => {
        const t = d.twist === 'none' ? '' : `<em>${TWISTS[d.twist].name}</em>`;
        return `<li><b>${d.def.name}</b>${t}</li>`;
      })
      .join('');

    const packs = PACKS.map((p) => this.packCard(p, s, total)).join('');
    const hasNew = BALLS.some((x) => x.unlocked(s) && !s.seenBalls.includes(x.id));

    this.show(
      `<div class="page">
        <header class="top">
          <div class="logo small"><span>Pocket Park</span></div>
          <button class="chip" data-act="locker" aria-label="Open ball locker">
            <canvas class="ballpic" data-ball="${b.id}" width="52" height="52"></canvas>
            <span>Locker</span>${hasNew ? '<i class="dot"></i>' : ''}
          </button>
        </header>

        <section class="today">
          <div class="today-head">
            <div><small>${prettyDate(today)}</small><h2>Today’s Three</h2></div>
            <div class="streak">${s.streak.count > 0 && (s.streak.last === today || s.streak.last === daysAgo(1)) ? `<b>${s.streak.count}</b><small>day${s.streak.count === 1 ? '' : 's'}</small>` : ''}</div>
          </div>
          <ol>${dailyHoles}</ol>
          <div class="today-foot">
            <div class="score">${played ? `<b class="hand">${played.score}</b><small>${signed(played.score - par)} · par ${par}</small>` : `<small>Par ${par}. Same three for everyone today.</small>`}</div>
            <button class="btn primary" data-act="daily" data-val="${today}" data-focus>${played ? 'Replay' : 'Play'}</button>
          </div>
          <div class="archive" aria-label="Earlier days">
            ${past
              .map((d) => {
                const r = s.daily[d];
                return `<button data-act="daily" data-val="${d}" aria-label="Play ${prettyDate(d)}"><small>${prettyDate(d).split(',')[0]}</small><b class="hand">${r ? r.score : '·'}</b></button>`;
              })
              .join('')}
          </div>
        </section>

        <div class="medal-line">
          <h2>Courses</h2>
          <span>${medal('par', true)}<b>${total}</b><small>/ ${HOLES.length * 3} medals</small></span>
        </div>
        ${packs}
      </div>`,
      'solid',
    );
    this.paintPictures();
  }

  private packCard(p: Pack, s: SaveData, total: number): string {
    const locked = total < p.need;
    const m = holeMedals(s, p.holes);
    const best = s.rounds[p.id];
    const par = p.holes.reduce((n, id) => n + holeById(id).par, 0);
    const thumbs = p.holes.map((id) => `<canvas data-hole="${id}"></canvas>`).join('');
    return `<button class="pack ${locked ? 'locked' : ''}" data-act="pack" data-val="${p.id}" ${locked ? 'disabled' : ''} style="--ink:${THEME_INK[p.theme]}">
      <div class="thumbs">${thumbs}</div>
      <div class="pack-text">
        <small>${p.place}</small>
        <h3>${p.name}</h3>
        <p>${locked ? `Earn ${p.need - total} more medal${p.need - total === 1 ? '' : 's'} to open` : p.blurb}</p>
        <div class="pack-foot">
          <span class="count">${locked ? '' : `<b>${m}</b>/9 medals`}</span>
          <span class="count">${best !== undefined ? `Best <b class="hand">${best}</b> (${signed(best - par)})` : locked ? '' : `Par ${par}`}</span>
        </div>
      </div>
    </button>`;
  }

  locker(s: SaveData): void {
    const items = BALLS.map((b) => {
      const open = b.unlocked(s);
      const fresh = open && !s.seenBalls.includes(b.id);
      return `<button class="ball ${s.ball === b.id ? 'sel' : ''} ${open ? '' : 'shut'}" data-act="ball" data-val="${b.id}" ${open ? '' : 'disabled'}>
        <canvas class="ballpic big" data-ball="${b.id}" width="120" height="120"></canvas>
        <b>${open ? b.name : '???'}</b>
        <small>${s.ball === b.id ? 'In your pocket' : fresh ? 'New!' : open ? 'Tap to use' : b.hint}</small>
      </button>`;
    }).join('');
    const n = BALLS.filter((b) => b.unlocked(s)).length;
    this.show(
      `<div class="page">
        <header class="top">
          <button class="btn ghost" data-act="home" data-focus>Back</button>
          <div class="logo small"><span>Locker</span></div>
          <span class="count"><b>${n}</b>/${BALLS.length}</span>
        </header>
        <div class="balls">${items}</div>
      </div>`,
      'solid',
    );
    this.paintPictures();
  }

  private paintPictures(): void {
    this.overlay.querySelectorAll<HTMLCanvasElement>('canvas[data-hole]').forEach((c) => paintThumb(c, holeById(c.dataset.hole!)));
    this.overlay.querySelectorAll<HTMLCanvasElement>('canvas[data-ball]').forEach((c) => {
      const x = c.getContext('2d')!;
      const b = ballById(c.dataset.ball!);
      const r = c.width * 0.4;
      x.clearRect(0, 0, c.width, c.height);
      x.save();
      x.translate(c.width / 2, c.height / 2);
      const open = !c.closest('.shut');
      if (!open) x.globalAlpha = 0.28;
      // A slight turn shows the pattern off better than face on.
      const m = identity();
      const a = 0.5;
      m[0] = Math.cos(a);
      m[2] = Math.sin(a);
      m[6] = -Math.sin(a);
      m[8] = Math.cos(a);
      drawBallFace(x, open ? b : { ...b, look: 'sheen', base: '#b9b2a3', shade: '#8d8678', ink: '#b9b2a3' }, r, m, 0.15, 0.3);
      x.restore();
    });
  }

  pause(muted: boolean, showKeys: boolean): void {
    this.show(
      `<div class="dialog">
        <h2>Paused</h2>
        <button class="btn primary" data-act="resume" data-focus>Keep playing</button>
        <button class="btn" data-act="restart-hole">Restart this hole</button>
        <button class="btn" data-act="sound">Sound: ${muted ? 'Off' : 'On'}</button>
        <button class="btn ghost" data-act="quit">Back to the clubhouse</button>
        ${showKeys ? '<p class="keys"><b>Keys</b> Arrows aim and set power · Space shoots · R resets · P pauses · M mutes</p>' : ''}
      </div>`,
      'dim',
    );
  }

  holeResult(r: HoleResult): void {
    const medals = r.earned.length
      ? `<div class="earned">${r.earned.map((m, i) => `<span style="--i:${i}">${medal(m, true, true)}<small>${MEDAL_NAME[m]}</small></span>`).join('')}</div>`
      : '';
    this.show(
      `<div class="result">
        <h2>${r.word}</h2>
        <p class="sub">${r.strokes} stroke${r.strokes === 1 ? '' : 's'} · par ${r.par}${r.best ? ' · <b>New best</b>' : ''}</p>
        ${r.notes.map((n) => `<p class="note">${n}</p>`).join('')}
        ${medals}
        <button class="btn primary" data-act="next" data-focus>${r.last ? 'See your card' : 'Next hole'}</button>
      </div>`,
      'dim low',
    );
  }

  scorecard(c: CardSummary): void {
    const rows = c.rows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td class="nm">${r.name}${r.twist ? `<small>${r.twist}</small>` : ''}</td>
        <td>${r.par}</td>
        <td class="hand">${scoreMark(r.strokes, r.par)}</td>
        <td class="ms">${medal('par', r.medals.par)}${medal('birdie', r.medals.birdie)}${medal('bank', r.medals.bank)}</td>
      </tr>`,
      )
      .join('');
    const extras: string[] = [];
    if (c.newBest) extras.push('<div class="stamp">New best</div>');
    const gifts = [
      ...c.newBalls.map((id) => `<li>New ball: <b>${ballById(id).name}</b></li>`),
      ...(c.newPack ? [`<li>Course open: <b>${c.newPack}</b></li>`] : []),
      ...(c.daily && c.streak > 1 ? [`<li><b>${c.streak}</b> days in a row</li>`] : []),
    ];
    this.show(
      `<div class="sheet">
        <header>
          <small>${c.place}</small>
          <h2>${c.title}</h2>
          ${extras.join('')}
        </header>
        <table>
          <thead><tr><th>#</th><th class="nm">Hole</th><th>Par</th><th>You</th><th>Medals</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td></td><td class="nm">Total</td><td>${c.par}</td><td class="hand"><b>${c.total}</b></td><td class="vs">${signed(c.total - c.par)}</td></tr></tfoot>
        </table>
        ${c.best !== null ? `<p class="pb">Your best here: <b class="hand">${c.best}</b></p>` : ''}
        ${gifts.length ? `<ul class="gifts">${gifts.join('')}</ul>` : ''}
        <div class="row">
          ${c.nextPack ? `<button class="btn primary" data-act="pack" data-val="${c.nextPack}" data-focus>Next course</button><button class="btn" data-act="again">Play again</button>` : `<button class="btn primary" data-act="again" data-focus>Play again</button>`}
        </div>
        <div class="row">
          <button class="btn ghost" data-act="home">Clubhouse</button>
          <button class="btn ghost" data-act="share">Share score</button>
        </div>
      </div>`,
      'dim scroll',
    );
  }

  shareFallback(text: string): void {
    const box = document.createElement('div');
    box.className = 'share';
    box.innerHTML = `<div class="dialog"><h2>Your score</h2><p>Copy this and send it to someone.</p><textarea readonly rows="4"></textarea><button class="btn primary" data-act="share-done" data-focus>Done</button></div>`;
    box.querySelector('textarea')!.value = text;
    this.overlay.appendChild(box);
    box.querySelector('textarea')!.select();
  }

  closeShare(): void {
    this.overlay.querySelector('.share')?.remove();
  }
}
