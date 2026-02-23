// src/state/session.svelte.ts
import type { TurnType, ScreenName, GameName } from './types';

function createSession() {
  let currentScreen = $state<ScreenName>('loading');
  let currentTurn = $state<TurnType>('owen');
  let turnOverride = $state<TurnType | null>(null);
  let turnsCompleted = $state(0);
  let currentGame = $state<GameName | null>(null);
  let roundNumber = $state(0);
  let promptIndex = $state(0);
  let missCount = $state(0);
  let activitiesCompleted = $state(0);
  let resetExtended = $state(false);
  let currentFps = $state(60);
  let audioUnlocked = $state(false);
  let assetsLoaded = $state(false);

  function reset() {
    currentScreen = 'loading';
    currentTurn = 'owen';
    turnOverride = null;
    turnsCompleted = 0;
    currentGame = null;
    roundNumber = 0;
    promptIndex = 0;
    missCount = 0;
    activitiesCompleted = 0;
    resetExtended = false;
  }

  function nextTurn(): TurnType {
    if (turnOverride) {
      const override = turnOverride;
      turnOverride = null;
      return override;
    }
    turnsCompleted++;
    return turnsCompleted % 2 === 1 ? 'owen' : 'kian';
  }

  return {
    get currentScreen() { return currentScreen; },
    set currentScreen(v: ScreenName) { currentScreen = v; },
    get currentTurn() { return currentTurn; },
    set currentTurn(v: TurnType) { currentTurn = v; },
    get turnOverride() { return turnOverride; },
    set turnOverride(v: TurnType | null) { turnOverride = v; },
    get turnsCompleted() { return turnsCompleted; },
    get currentGame() { return currentGame; },
    set currentGame(v: GameName | null) { currentGame = v; },
    get roundNumber() { return roundNumber; },
    set roundNumber(v: number) { roundNumber = v; },
    get promptIndex() { return promptIndex; },
    set promptIndex(v: number) { promptIndex = v; },
    get missCount() { return missCount; },
    set missCount(v: number) { missCount = v; },
    get activitiesCompleted() { return activitiesCompleted; },
    set activitiesCompleted(v: number) { activitiesCompleted = v; },
    get resetExtended() { return resetExtended; },
    set resetExtended(v: boolean) { resetExtended = v; },
    get currentFps() { return currentFps; },
    set currentFps(v: number) { currentFps = v; },
    get audioUnlocked() { return audioUnlocked; },
    set audioUnlocked(v: boolean) { audioUnlocked = v; },
    get assetsLoaded() { return assetsLoaded; },
    set assetsLoaded(v: boolean) { assetsLoaded = v; },
    nextTurn,
    reset,
  };
}

export const session = createSession();
