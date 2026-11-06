import './bridge';
import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/karla/latin-500.css';
import '@fontsource/karla/latin-800.css';
import '@fontsource/patrick-hand/latin-400.css';
import './styles.css';
import { Game } from './game/game';

async function boot(): Promise<void> {
  // Packaging labels are painted into the canvas, so the fonts need to arrive first.
  const fonts = Promise.all([document.fonts.load('20px Shrikhand'), document.fonts.load('800 12px Karla')]);
  await Promise.race([fonts, new Promise((r) => setTimeout(r, 1200))]);
  new Game(document.querySelector<HTMLCanvasElement>('#game')!, document.querySelector<HTMLElement>('#ui')!).start();
}

void boot();
