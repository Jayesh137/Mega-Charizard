// src/state/settings.svelte.ts
import type { Intensity } from './types';

const STORAGE_KEY = 'mca-settings';

interface PersistedSettings {
  littleTrainerName: string;
  bigTrainerName: string;
  intensity: Intensity;
  silentMode: boolean;
  showSubtitles: boolean;
  isFirstVisit: boolean;
  shapesUnlocked: string[];
  roundsCompleted: number;
}

function loadFromStorage(): PersistedSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    littleTrainerName: 'Owen',
    bigTrainerName: 'Kian',
    intensity: 'normal',
    silentMode: false,
    showSubtitles: false,
    isFirstVisit: true,
    shapesUnlocked: ['circle', 'square', 'triangle'],
    roundsCompleted: 0,
  };
}

function createSettings() {
  const initial = loadFromStorage();

  let littleTrainerName = $state(initial.littleTrainerName);
  let bigTrainerName = $state(initial.bigTrainerName);
  let intensity = $state<Intensity>(initial.intensity);
  let silentMode = $state(initial.silentMode);
  let showSubtitles = $state(initial.showSubtitles);
  let isFirstVisit = $state(initial.isFirstVisit);
  let shapesUnlocked = $state(initial.shapesUnlocked);
  let roundsCompleted = $state(initial.roundsCompleted);

  function persist() {
    const data: PersistedSettings = {
      littleTrainerName, bigTrainerName, intensity,
      silentMode, showSubtitles, isFirstVisit,
      shapesUnlocked, roundsCompleted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  return {
    get littleTrainerName() { return littleTrainerName; },
    set littleTrainerName(v: string) { littleTrainerName = v; persist(); },
    get bigTrainerName() { return bigTrainerName; },
    set bigTrainerName(v: string) { bigTrainerName = v; persist(); },
    get intensity() { return intensity; },
    set intensity(v: Intensity) { intensity = v; persist(); },
    get silentMode() { return silentMode; },
    set silentMode(v: boolean) { silentMode = v; persist(); },
    get showSubtitles() { return showSubtitles; },
    set showSubtitles(v: boolean) { showSubtitles = v; persist(); },
    get isFirstVisit() { return isFirstVisit; },
    set isFirstVisit(v: boolean) { isFirstVisit = v; persist(); },
    get shapesUnlocked() { return shapesUnlocked; },
    set shapesUnlocked(v: string[]) { shapesUnlocked = v; persist(); },
    get roundsCompleted() { return roundsCompleted; },
    set roundsCompleted(v: number) { roundsCompleted = v; persist(); },
  };
}

export const settings = createSettings();
