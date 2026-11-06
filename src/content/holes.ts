import type { HoleDef, Pt, ThemeId } from '../core/types';

const rectField = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

const BOX = rectField(26, 26, 334, 594);

function arc(cx: number, cy: number, r: number, from: number, to: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

const UP = -Math.PI / 2;

export const HOLES: HoleDef[] = [
  // ---- Apartment kitchen ----
  {
    id: 'cereal-bunker',
    name: 'Cereal Bunker',
    par: 2,
    tier: 1,
    theme: 'counter',
    tip: 'Pull back anywhere, aim, let go.',
    tee: [180, 535],
    cup: [176, 104],
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'backsplash', mat: 'ceramic', name: 'the backsplash' }],
    props: [
      { k: 'box', x: 180, y: 318, w: 176, h: 44, skin: 'cerealBox', mat: 'card', name: 'the cereal box' },
      { k: 'bowl', x: 92, y: 186, r: 50, skin: 'cereal', name: 'the cereal bowl' },
      { k: 'disc', x: 288, y: 150, r: 25, skin: 'mug', mat: 'ceramic', name: 'the mug' },
      { k: 'deco', x: 78, y: 470, skin: 'spoon', a: -0.5 },
      { k: 'deco', x: 286, y: 470, skin: 'crumbs' },
    ],
  },
  {
    id: 'ruler-jump',
    name: 'Ruler Jump',
    par: 3,
    tier: 1,
    theme: 'counter',
    tip: 'Hit the ruler hard enough to clear the sink.',
    tee: [140, 556],
    cup: [92, 112],
    fall: 'In the sink',
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'backsplash', mat: 'ceramic', name: 'the backsplash' }],
    props: [
      { k: 'hazard', shape: { x: 142, y: 288, w: 228, h: 112 }, skin: 'sink' },
      { k: 'patch', shape: { x: 291, y: 288, w: 74, h: 140 }, skin: 'towel' },
      { k: 'ramp', x: 140, y: 438, len: 104, w: 40, a: UP, rise: 36, skin: 'ruler', name: 'the ruler' },
      { k: 'box', x: 256, y: 120, w: 96, h: 54, a: 0.2, skin: 'toaster', mat: 'metal', name: 'the toaster' },
      { k: 'disc', x: 56, y: 196, r: 15, skin: 'soapBottle', mat: 'plastic', name: 'the dish soap' },
    ],
  },
  {
    id: 'robot-vac',
    name: 'Robot Vac',
    par: 3,
    tier: 2,
    theme: 'kitchenFloor',
    tip: 'It only goes back and forth. Probably.',
    tee: [106, 548],
    cup: [288, 118],
    field: [[26, 26], [334, 26], [334, 280], [196, 280], [196, 594], [26, 594]],
    walls: [
      { pts: [[26, 26], [334, 26], [334, 280], [196, 280], [196, 594], [26, 594]], closed: true, skin: 'baseboard', mat: 'wood', name: 'the baseboard' },
    ],
    props: [
      { k: 'patch', shape: { x: 112, y: 372, r: 48 }, skin: 'soap' },
      { k: 'slider', pts: [[66, 150], [240, 150]], period: 6.5, r: 25, skin: 'robotVac', name: 'the robot vacuum' },
      { k: 'disc', x: 196, y: 232, r: 13, skin: 'chairLeg', mat: 'wood', name: 'a chair leg' },
      { k: 'disc', x: 258, y: 232, r: 13, skin: 'chairLeg', mat: 'wood', name: 'a chair leg' },
      { k: 'disc', x: 60, y: 62, r: 20, skin: 'petBowl', mat: 'metal', name: 'the dog bowl' },
      { k: 'deco', x: 266, y: 438, w: 120, h: 300, skin: 'island' },
    ],
  },

  // ---- Laundromat ----
  {
    id: 'wash-and-fold',
    name: 'Wash & Fold',
    par: 3,
    tier: 1,
    theme: 'laundry',
    tip: 'Number 2 is open. It comes out the back.',
    tee: [120, 545],
    cup: [104, 118],
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'laundryWall', mat: 'brick', name: 'the wall' }],
    props: [
      { k: 'box', x: 70, y: 320, w: 74, h: 62, skin: 'washer', mat: 'metal', name: 'washer 1', label: '1' },
      { k: 'box', x: 144, y: 320, w: 74, h: 62, skin: 'washerOpen', mat: 'metal', name: 'washer 2', label: '2' },
      { k: 'box', x: 218, y: 320, w: 74, h: 62, skin: 'washer', mat: 'metal', name: 'washer 3', label: '3' },
      { k: 'portal', x: 144, y: 358, ox: 144, oy: 275, oa: UP, speed: 230, skin: 'washerDoor', name: 'washer 2' },
      { k: 'patch', shape: { x: 292, y: 318, w: 74, h: 96 }, skin: 'sock' },
      { k: 'box', x: 248, y: 130, w: 130, h: 44, a: -0.34, skin: 'foldTable', mat: 'wood', name: 'the folding table' },
      { k: 'disc', x: 300, y: 492, r: 26, skin: 'basket', mat: 'plastic', name: 'the basket' },
      { k: 'deco', x: 70, y: 470, skin: 'quarter' },
    ],
  },
  {
    id: 'lost-socks',
    name: 'Lost Socks',
    par: 3,
    tier: 2,
    theme: 'laundry',
    tip: 'Rubber bands give it back harder than you hit it.',
    tee: [116, 548],
    cup: [92, 112],
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'laundryWall', mat: 'brick', name: 'the wall' }],
    props: [
      { k: 'slider', pts: [[66, 352], [294, 352]], period: 5.2, r: 28, skin: 'cart', name: 'the laundry cart' },
      { k: 'box', x: 136, y: 214, w: 206, h: 44, skin: 'foldTable', mat: 'wood', name: 'the folding table' },
      { k: 'band', x1: 244, y1: 36, x2: 324, y2: 116, name: 'the rubber band' },
      { k: 'band', x1: 326, y1: 460, x2: 268, y2: 530, name: 'the rubber band' },
      { k: 'patch', shape: { x: 176, y: 110, r: 36 }, skin: 'sock' },
      { k: 'patch', shape: { x: 80, y: 448, r: 34 }, skin: 'sock' },
      { k: 'deco', x: 268, y: 262, skin: 'quarter' },
    ],
  },
  {
    id: 'spin-cycle',
    name: 'Spin Cycle',
    par: 4,
    tier: 3,
    theme: 'laundry',
    tip: 'The drum carries you. The paddles do not care.',
    tee: [180, 556],
    cup: [180, 168],
    field: BOX,
    walls: [
      { pts: BOX, closed: true, skin: 'laundryWall', mat: 'brick', name: 'the wall' },
      { pts: arc(180, 256, 122, Math.PI / 2 + 0.56, Math.PI * 2.5 - 0.56, 30), skin: 'drum', mat: 'metal', name: 'the drum', r: 6 },
    ],
    props: [
      { k: 'turntable', x: 180, y: 256, r: 114, spin: 0.6, skin: 'drumFloor' },
      { k: 'spinner', x: 180, y: 256, arms: 2, len: 66, spin: -0.95, skin: 'agitator', hub: 15 },
      { k: 'patch', shape: { x: 180, y: 438, r: 46 }, skin: 'soap' },
      { k: 'band', x1: 34, y1: 520, x2: 92, y2: 586, name: 'the rubber band' },
      { k: 'band', x1: 326, y1: 520, x2: 268, y2: 586, name: 'the rubber band' },
    ],
  },

  // ---- Corner diner ----
  {
    id: 'stool-row',
    name: 'Stool Row',
    par: 3,
    tier: 1,
    theme: 'diner',
    tip: 'Chrome stools. Lively bounce.',
    tee: [76, 548],
    cup: [268, 96],
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'chrome', mat: 'metal', name: 'the counter' }],
    props: [
      { k: 'disc', x: 76, y: 436, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 170, y: 436, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 264, y: 436, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 122, y: 324, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 216, y: 324, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 300, y: 324, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 76, y: 212, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'disc', x: 170, y: 212, r: 17, skin: 'stool', mat: 'metal', name: 'a stool' },
      { k: 'patch', shape: { x: 266, y: 214, r: 40 }, skin: 'ketchup' },
      { k: 'box', x: 118, y: 88, w: 120, h: 40, a: 0.5, skin: 'napkins', mat: 'metal', name: 'the napkin dispenser' },
    ],
  },
  {
    id: 'lazy-susan',
    name: 'Lazy Susan',
    par: 4,
    tier: 2,
    theme: 'dinerTable',
    tip: 'Mind the table edge. Mind the hot sauce.',
    tee: [180, 556],
    cup: [180, 88],
    fall: 'Off the table',
    field: [...arc(180, 180, 158, Math.PI, Math.PI * 2, 24), ...arc(180, 440, 158, 0, Math.PI, 24)],
    walls: [{ pts: arc(180, 180, 148, Math.PI * 1.22, Math.PI * 1.78, 14), skin: 'chrome', mat: 'metal', name: 'the condiment rail' }],
    props: [
      {
        k: 'turntable', x: 180, y: 312, r: 98, spin: 0.6, skin: 'susan',
        riders: [
          { ang: 0.3, dist: 66, r: 13, skin: 'salt' },
          { ang: 0.3 + (Math.PI * 2) / 3, dist: 66, r: 13, skin: 'hotSauce' },
          { ang: 0.3 + (Math.PI * 4) / 3, dist: 66, r: 13, skin: 'pepper' },
        ],
      },
      { k: 'patch', shape: { x: 74, y: 164, r: 34 }, skin: 'syrup' },
      { k: 'disc', x: 278, y: 170, r: 28, skin: 'plate', mat: 'ceramic', name: 'the plate' },
      { k: 'box', x: 118, y: 470, w: 60, h: 26, a: -0.4, skin: 'napkins', mat: 'metal', name: 'the napkin dispenser' },
      { k: 'disc', x: 262, y: 466, r: 19, skin: 'mug', mat: 'ceramic', name: 'the mug' },
    ],
  },
  {
    id: 'dish-pit',
    name: 'Dish Pit',
    par: 5,
    tier: 3,
    theme: 'diner',
    tip: 'The belts have opinions. The spatula has a shortcut.',
    tee: [64, 552],
    cup: [286, 104],
    fall: 'In the sink',
    field: BOX,
    walls: [
      { pts: BOX, closed: true, skin: 'chrome', mat: 'metal', name: 'the counter' },
      { pts: [[116, 232], [334, 232]], skin: 'chrome', mat: 'metal', name: 'the dish rack' },
    ],
    props: [
      { k: 'rail', x1: 26, y1: 424, x2: 248, y2: 424, skin: 'rack', name: 'the dish rack', tall: 20 },
      { k: 'belt', x: 202, y: 346, w: 252, h: 60, a: Math.PI, speed: 150 },
      { k: 'belt', x: 186, y: 132, w: 170, h: 56, a: Math.PI, speed: 95 },
      { k: 'ramp', x: 130, y: 510, len: 96, w: 40, a: UP, rise: 34, skin: 'spatula', name: 'the spatula' },
      { k: 'hazard', shape: { x: 112, y: 278, r: 21 }, skin: 'mopbucket' },
      { k: 'disc', x: 280, y: 508, r: 22, skin: 'stockpot', mat: 'metal', name: 'the stockpot' },
      { k: 'patch', shape: { x: 76, y: 158, r: 34 }, skin: 'syrup' },
    ],
  },

  // ---- Rooftop skate spot ----
  {
    id: 'pigeon-ledge',
    name: 'Pigeon Ledge',
    par: 3,
    tier: 1,
    theme: 'roof',
    tip: 'The pigeons will not move for you.',
    tee: [180, 552],
    cup: [78, 92],
    fall: 'Off the roof',
    field: [[24, 594], [336, 594], [336, 340], [262, 340], [262, 244], [336, 244], [336, 26], [24, 26], [24, 244], [98, 244], [98, 340], [24, 340]],
    walls: [
      { pts: [[24, 340], [24, 594], [336, 594], [336, 340]], skin: 'parapet', mat: 'brick', name: 'the parapet' },
      { pts: [[24, 244], [24, 26], [336, 26], [336, 244]], skin: 'parapet', mat: 'brick', name: 'the parapet' },
    ],
    props: [
      { k: 'wind', x: 180, y: 172, w: 300, h: 110, a: Math.PI, acc: 230, skin: 'acVent' },
      { k: 'box', x: 300, y: 170, w: 52, h: 96, skin: 'acUnit', mat: 'metal', name: 'the AC unit' },
      { k: 'disc', x: 216, y: 78, r: 40, skin: 'waterTank', mat: 'wood', name: 'the water tank' },
      { k: 'slider', pts: [[118, 292], [242, 292]], period: 4.6, r: 11, skin: 'pigeon', name: 'a pigeon' },
      { k: 'slider', pts: [[252, 470], [108, 470]], period: 7.2, r: 11, skin: 'pigeon', name: 'a pigeon', phase: 0.3 },
      { k: 'patch', shape: { x: 76, y: 512, r: 42 }, skin: 'gravel' },
      { k: 'patch', shape: { x: 296, y: 400, r: 36 }, skin: 'gravel' },
    ],
  },
  {
    id: 'half-pipe',
    name: 'Half Pipe',
    par: 4,
    tier: 2,
    theme: 'skate',
    tip: 'Too soft and you are stuck in the trench.',
    tee: [180, 560],
    cup: [180, 92],
    field: BOX,
    walls: [{ pts: BOX, closed: true, skin: 'coping', mat: 'metal', name: 'the coping' }],
    props: [
      { k: 'slope', x: 180, y: 366, w: 308, h: 84, a: UP, acc: 560, skin: 'pipeDown' },
      { k: 'slope', x: 180, y: 282, w: 308, h: 84, a: Math.PI / 2, acc: 560, skin: 'pipeUp' },
      { k: 'ramp', x: 90, y: 476, len: 88, w: 40, a: UP, rise: 34, skin: 'kicker', name: 'the kicker' },
      { k: 'rail', x1: 96, y1: 150, x2: 264, y2: 150, skin: 'grindRail', name: 'the grind rail', tall: 16 },
      { k: 'disc', x: 60, y: 96, r: 18, skin: 'cone', mat: 'plastic', name: 'the cone' },
      { k: 'disc', x: 300, y: 96, r: 18, skin: 'cone', mat: 'plastic', name: 'the cone' },
      { k: 'disc', x: 286, y: 500, r: 21, skin: 'tire', mat: 'rubber', name: 'the tire' },
    ],
  },
  {
    id: 'big-gap',
    name: 'The Big Gap',
    par: 4,
    tier: 3,
    theme: 'skate',
    tip: 'Send it over the rail, or take the plank.',
    tee: [120, 562],
    cup: [204, 120],
    fall: 'Down the alley',
    field: BOX,
    walls: [
      { pts: [[26, 256], [26, 26], [334, 26], [334, 256]], skin: 'coping', mat: 'metal', name: 'the coping' },
      { pts: [[26, 360], [26, 594], [334, 594], [334, 360]], skin: 'coping', mat: 'metal', name: 'the coping' },
    ],
    props: [
      { k: 'hazard', shape: { x: 150, y: 308, w: 280, h: 104 }, skin: 'gap' },
      { k: 'hazard', shape: { x: 332, y: 308, w: 8, h: 104 }, skin: 'gap' },
      { k: 'deco', x: 309, y: 308, w: 38, h: 118, skin: 'plank' },
      { k: 'ramp', x: 120, y: 448, len: 104, w: 44, a: UP, rise: 40, skin: 'kicker', name: 'the kicker' },
      { k: 'bowl', x: 204, y: 120, r: 80, skin: 'skateBowl', mu: 1, pull: 330, name: 'the bowl' },
      { k: 'rail', x1: 112, y1: 216, x2: 330, y2: 216, skin: 'grindRail', name: 'the grind rail', tall: 16 },
      { k: 'disc', x: 262, y: 436, r: 21, skin: 'tire', mat: 'rubber', name: 'the tire' },
      { k: 'box', x: 62, y: 74, w: 46, h: 76, skin: 'crate', mat: 'wood', name: 'the milk crate' },
    ],
  },
];

export interface Pack {
  id: string;
  name: string;
  place: string;
  blurb: string;
  theme: ThemeId;
  holes: string[];
  /** Medals needed to open this pack. */
  need: number;
}

export const PACKS: Pack[] = [
  { id: 'kitchen', name: 'The Galley', place: 'Apartment kitchen', blurb: 'A cereal bowl is a bunker. A ruler is a ramp.', theme: 'counter', holes: ['cereal-bunker', 'ruler-jump', 'robot-vac'], need: 0 },
  { id: 'laundry', name: 'Spin City', place: 'Laundromat', blurb: 'Lost socks, loose carts, one open washer.', theme: 'laundry', holes: ['wash-and-fold', 'lost-socks', 'spin-cycle'], need: 2 },
  { id: 'diner', name: 'Booth Nine', place: 'Corner diner', blurb: 'Chrome stools and a lazy susan with an attitude.', theme: 'diner', holes: ['stool-row', 'lazy-susan', 'dish-pit'], need: 6 },
  { id: 'roof', name: 'Top Floor', place: 'Rooftop skate spot', blurb: 'Pigeons, kickers and a very long way down.', theme: 'skate', holes: ['pigeon-ledge', 'half-pipe', 'big-gap'], need: 11 },
];

export const holeById = (id: string): HoleDef => HOLES.find((h) => h.id === id)!;
