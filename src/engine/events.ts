// src/engine/events.ts
import type { TurnType, Intensity, ScreenName } from '../state/types';

export type GameEvent =
  | { type: 'show-banner'; turn: TurnType }
  | { type: 'hide-banner' }
  | { type: 'show-prompt'; promptType: string; value: string; icon: string }
  | { type: 'hide-prompt' }
  | { type: 'celebration'; intensity: Intensity }
  | { type: 'screen-changed'; screen: string }
  | { type: 'show-subtitle'; text: string }
  | { type: 'hide-subtitle' }
  | { type: 'show-game-end'; allowReplay: boolean }
  | { type: 'hide-game-end' }
  | { type: 'loading-progress'; percent: number }
  | { type: 'play-video'; src: string; onEnd?: ScreenName }
  | { type: 'stop-video' }
  | { type: 'session-blocked'; reason: string; waitUntil?: number }
  | { type: 'timeout-start'; remaining: number }
  | { type: 'timeout-tick'; remaining: number; formatted: string }
  | { type: 'timeout-end' };

type EventHandler = (event: GameEvent) => void;

export class EventEmitter {
  private handlers = new Map<string, Set<EventHandler>>();

  on(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(event: GameEvent): void {
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event)); // wildcard listeners
  }
}
