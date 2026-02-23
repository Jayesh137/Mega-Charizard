<script lang="ts">
  import GameCanvas from './components/GameCanvas.svelte';
  import LoadingScreen from './components/LoadingScreen.svelte';
  import TurnBanner from './components/TurnBanner.svelte';
  import CelebrationOverlay from './components/CelebrationOverlay.svelte';
  import PromptDisplay from './components/PromptDisplay.svelte';
  import SubtitleBar from './components/SubtitleBar.svelte';
  import GameEndControls from './components/GameEndControls.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import { AudioManager } from './engine/audio';
  import { Preloader } from './engine/preloader';
  import { EventEmitter } from './engine/events';
  import type { GameEvent } from './engine/events';
  import { registerSettingsToggle } from './engine/input';
  import { session } from './state/session.svelte';
  import { settings } from './state/settings.svelte';

  let gameCanvas: GameCanvas;
  let loadingScreen: LoadingScreen;
  let turnBanner: TurnBanner;
  let celebrationOverlay: CelebrationOverlay;
  let promptDisplay: PromptDisplay;
  let subtitleBar: SubtitleBar;
  let gameEndControls: GameEndControls;
  let settingsPanel: SettingsPanel;

  registerSettingsToggle(() => {
    settingsPanel?.toggle();
  });

  // Bridge game engine events to DOM overlay components
  function wireEventBus() {
    const events = gameCanvas?.getEvents();
    if (!events) return;

    events.on('*', (event: GameEvent) => {
      switch (event.type) {
        case 'show-banner':
          turnBanner?.show(event.turn);
          break;
        case 'hide-banner':
          turnBanner?.hide();
          break;
        case 'show-prompt':
          promptDisplay?.show(event.promptType, event.value, event.icon);
          break;
        case 'hide-prompt':
          promptDisplay?.hide();
          break;
        case 'celebration':
          celebrationOverlay?.trigger(event.intensity);
          break;
        case 'show-subtitle':
          subtitleBar?.show(event.text);
          break;
        case 'hide-subtitle':
          subtitleBar?.hide();
          break;
        case 'show-game-end':
          gameEndControls?.show(event.allowReplay);
          break;
        case 'hide-game-end':
          gameEndControls?.hide();
          break;
      }
    });
  }

  async function handleUnlock() {
    try {
      // 1. Unlock browser audio
      const audio = new AudioManager();
      await audio.unlock();
      session.audioUnlocked = true;

      // 2. Wire the event bus (GameCanvas is mounted by now)
      wireEventBus();

      // 3. Load audio assets (if any exist on disk)
      const loadEvents = new EventEmitter();
      const preloader = new Preloader(audio, loadEvents);

      loadEvents.on('loading-progress', (event) => {
        if (event.type === 'loading-progress') {
          loadingScreen?.setProgress(event.percent);
        }
      });

      await preloader.loadCritical();
      await preloader.loadDeferred();

      // 4. Mark loading complete
      loadingScreen?.complete();
      session.assetsLoaded = true;

      // 5. Brief delay, then transition
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (e) {
      console.warn('Loading error (non-fatal):', e);
    }

    // 6. Always transition — even if loading had issues
    if (settings.isFirstVisit) {
      settings.isFirstVisit = false;
      session.currentScreen = 'opening';
      gameCanvas?.goToScreen('opening');
    } else {
      session.currentScreen = 'hub';
      gameCanvas?.goToScreen('hub');
    }
  }

  function handleGameReplay() {
    // Replay the current game (placeholder: go back to hub for now)
    session.currentScreen = 'hub';
    gameCanvas?.goToScreen('hub');
  }

  function handleGameNext() {
    // Move to calm-reset, then back to hub
    session.currentScreen = 'calm-reset';
    gameCanvas?.goToScreen('calm-reset');
  }

  function handleReplayOpening() {
    session.currentScreen = 'opening';
    gameCanvas?.goToScreen('opening');
  }
</script>

<div class="game-container">
  <GameCanvas bind:this={gameCanvas} />
  <LoadingScreen bind:this={loadingScreen} onunlock={handleUnlock} />
  <TurnBanner bind:this={turnBanner} />
  <CelebrationOverlay bind:this={celebrationOverlay} />
  <PromptDisplay bind:this={promptDisplay} />
  <SubtitleBar bind:this={subtitleBar} />
  <GameEndControls bind:this={gameEndControls} onreplay={handleGameReplay} onnext={handleGameNext} />
  <SettingsPanel bind:this={settingsPanel} onreplayopening={handleReplayOpening} />
</div>

<style>
  .game-container {
    width: 100vw;
    height: 100vh;
    background: #0a0a1a;
    position: relative;
    overflow: hidden;
  }
</style>
