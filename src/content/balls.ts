import { medalCount, type SaveData } from '../game/save';

export interface BallDesign {
  id: string;
  name: string;
  hint: string;
  base: string;
  shade: string;
  look: 'dimple' | 'speck' | 'stripes' | 'googly' | 'disco' | 'swirl' | 'wheel' | 'seed' | 'sheen' | 'fuzz';
  ink?: string;
  ink2?: string;
  unlocked(s: SaveData): boolean;
}

const finished = (pack: string) => (s: SaveData) => s.rounds[pack] !== undefined;

export const BALLS: BallDesign[] = [
  { id: 'range', name: 'Range Ball', hint: 'Your first ball', base: '#ffffff', shade: '#c2cad3', look: 'dimple', ink: '#e8503a', unlocked: () => true },
  { id: 'blueberry', name: 'Blueberry', hint: 'Earn 3 medals', base: '#5a6bb8', shade: '#27306e', look: 'seed', ink: '#1c2350', unlocked: (s) => medalCount(s) >= 3 },
  { id: 'gumball', name: 'Gumball', hint: 'Earn a bank-shot medal', base: '#ff7fb0', shade: '#c43a78', look: 'speck', ink: '#ffe3ef', ink2: '#ffd166', unlocked: (s) => Object.values(s.holes).some((h) => h.bank) },
  { id: 'candy', name: 'Peppermint', hint: 'Earn 8 medals', base: '#fff7f2', shade: '#d9c9c4', look: 'stripes', ink: '#de3b3b', unlocked: (s) => medalCount(s) >= 8 },
  { id: 'lint', name: 'Dryer Lint', hint: 'Finish Spin City', base: '#b7b3c4', shade: '#7c7890', look: 'fuzz', ink: '#d9d6e2', ink2: '#8f8ba5', unlocked: finished('laundry') },
  { id: 'meatball', name: 'Meatball', hint: 'Finish Booth Nine', base: '#a2603a', shade: '#5c2f1b', look: 'speck', ink: '#c98a5e', ink2: '#3f2013', unlocked: finished('diner') },
  { id: 'wheel', name: 'Skate Wheel', hint: 'Finish Top Floor', base: '#fdf0c8', shade: '#d6b873', look: 'wheel', ink: '#4a4f5c', unlocked: finished('roof') },
  { id: 'googly', name: 'Googly Eye', hint: 'Get a hole in one', base: '#ffffff', shade: '#cfd5da', look: 'googly', ink: '#14131a', unlocked: (s) => s.stats.aces > 0 },
  { id: 'marble', name: 'Cat’s Eye', hint: 'Land a slam dunk off a ramp', base: '#9fe3e8', shade: '#3d9aa8', look: 'swirl', ink: '#ff8a3d', unlocked: (s) => s.stats.dunks > 0 },
  { id: 'clementine', name: 'Clementine', hint: 'Earn 20 medals', base: '#ffa53a', shade: '#d9661a', look: 'seed', ink: '#c9591b', unlocked: (s) => medalCount(s) >= 20 },
  { id: 'disco', name: 'Disco Ball', hint: 'Play the daily 3 days running', base: '#b9c6d8', shade: '#55607a', look: 'disco', ink: '#ffffff', unlocked: (s) => s.streak.best >= 3 },
  { id: 'pearl', name: 'Gold Pearl', hint: 'Earn all 36 medals', base: '#ffe28a', shade: '#b8862a', look: 'sheen', ink: '#fff6d6', unlocked: (s) => medalCount(s) >= 36 },
];

export const ballById = (id: string): BallDesign => BALLS.find((b) => b.id === id) ?? BALLS[0];
