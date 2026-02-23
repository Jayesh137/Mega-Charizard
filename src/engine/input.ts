// src/engine/input.ts
import { settings } from '../state/settings.svelte';
import { session } from '../state/session.svelte';

export type HotkeyAction = () => void;

const hotkeys: Record<string, HotkeyAction> = {
  '1': () => { settings.intensity = 'calm'; },
  '2': () => { settings.intensity = 'normal'; },
  '3': () => { settings.intensity = 'hype'; },
  '0': () => { settings.silentMode = !settings.silentMode; },
  'l': () => { session.turnOverride = 'owen'; },
  'b': () => { session.turnOverride = 'kian'; },
  't': () => { session.turnOverride = 'team'; },
  'f': () => toggleFullscreen(),
};

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
}

export function handleHotkey(key: string): boolean {
  const action = hotkeys[key.toLowerCase()];
  if (action) {
    action();
    return true;
  }
  return false;
}

// Space hold detection for calm reset extension
let spaceHeld = false;

export function onKeyDown(key: string): void {
  if (key === ' ' && !spaceHeld) {
    spaceHeld = true;
    session.resetExtended = true;
  }
}

export function onKeyUp(key: string): void {
  if (key === ' ') {
    spaceHeld = false;
    session.resetExtended = false;
  }
}
