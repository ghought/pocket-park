export type Pt = [number, number];

export type ThemeId = 'counter' | 'kitchenFloor' | 'laundry' | 'diner' | 'dinerTable' | 'roof' | 'skate';

export type Mat = 'wood' | 'metal' | 'rubber' | 'card' | 'ceramic' | 'plastic' | 'cloth' | 'brick';

export type ZoneShape =
  | { x: number; y: number; w: number; h: number; a?: number }
  | { x: number; y: number; r: number }
  | { pts: Pt[] };

/** Everything a hole can be built from. Each kind has physics in world.ts and art in props.ts. */
export type Prop =
  | { k: 'box'; x: number; y: number; w: number; h: number; a?: number; skin: string; mat?: Mat; name?: string; tall?: number; label?: string }
  | { k: 'disc'; x: number; y: number; r: number; skin: string; mat?: Mat; name?: string; tall?: number }
  | { k: 'band'; x1: number; y1: number; x2: number; y2: number; name?: string }
  | { k: 'rail'; x1: number; y1: number; x2: number; y2: number; skin?: string; name?: string; tall?: number }
  | { k: 'bowl'; x: number; y: number; r: number; skin: string; name?: string; mu?: number; pull?: number }
  | { k: 'dome'; x: number; y: number; r: number; skin: string; push?: number }
  | { k: 'ramp'; x: number; y: number; len: number; w: number; a: number; rise: number; skin: string; name?: string }
  | { k: 'patch'; shape: ZoneShape; skin: 'soap' | 'syrup' | 'towel' | 'gravel' | 'sock' | 'ketchup' | 'mat' }
  | { k: 'hazard'; shape: ZoneShape; skin: 'sink' | 'water' | 'gap' | 'mopbucket' }
  | { k: 'slope'; x: number; y: number; w: number; h: number; a: number; acc: number; skin: string }
  | { k: 'belt'; x: number; y: number; w: number; h: number; a: number; speed: number }
  | { k: 'turntable'; x: number; y: number; r: number; spin: number; skin: string; riders?: { ang: number; dist: number; r: number; skin: string }[] }
  | { k: 'wind'; x: number; y: number; w: number; h: number; a: number; acc: number; skin: string }
  | { k: 'portal'; x: number; y: number; ox: number; oy: number; oa: number; speed: number; skin: string; name?: string }
  | { k: 'spinner'; x: number; y: number; arms: number; len: number; spin: number; skin: string; hub?: number; phase?: number }
  | { k: 'slider'; pts: Pt[]; period: number; r: number; skin: string; name?: string; phase?: number }
  | { k: 'deco'; x: number; y: number; skin: string; a?: number; s?: number; w?: number; h?: number; r?: number; label?: string };

export interface WallDef {
  pts: Pt[];
  closed?: boolean;
  skin: string;
  mat?: Mat;
  name?: string;
  r?: number;
}

export interface HoleDef {
  id: string;
  name: string;
  par: number;
  tier: 1 | 2 | 3;
  theme: ThemeId;
  tip: string;
  tee: Pt;
  cup: Pt;
  field: Pt[];
  walls: WallDef[];
  props: Prop[];
  /** What the ball does when it leaves the field, in words. */
  fall?: string;
}

export type TwistId = 'none' | 'slick' | 'tacky' | 'draft';
