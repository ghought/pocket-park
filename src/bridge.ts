import '../adapter/pckt-bridge.js';

export interface Bridge {
  embedded: boolean;
  canonicalUrl(): string | null;
  playStarted(): void;
  roundEnded(payload: { score: number }): void;
  score(score: number): void;
  error(message: string): void;
}

interface BridgeOptions {
  gameId: string;
  allowedParents: string[];
  capabilities: { pause: boolean; mute: boolean; restart: boolean };
  onPause(): void;
  onResume(): void;
  onMute(muted: boolean): void;
  onRestart(): void;
}

declare global {
  interface Window {
    PcktBridge: { init(options: BridgeOptions): Bridge };
  }
}

const HUB = 'https://pckt.up.railway.app';

export function connectBridge(handlers: Pick<BridgeOptions, 'onPause' | 'onResume' | 'onMute' | 'onRestart'>): Bridge {
  return window.PcktBridge.init({
    gameId: 'pocket-park',
    allowedParents: [HUB],
    capabilities: { pause: true, mute: true, restart: true },
    ...handlers,
  });
}
