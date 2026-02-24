<!-- src/components/GameCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { setupCanvas, mapClickToDesignSpace } from '../engine/utils/canvas';
  import { GameLoop } from '../engine/game-loop';
  import { ScreenManager } from '../engine/screen-manager';
  import { EventEmitter } from '../engine/events';
  import { TweenManager } from '../engine/utils/tween';
  import { handleHotkey, onKeyDown, onKeyUp } from '../engine/input';
  import { LoadingCanvasScreen } from '../engine/screens/loading';
  import { OpeningScreen } from '../engine/screens/opening';
  import { HubScreen } from '../engine/screens/hub';
  import { CalmResetScreen } from '../engine/screens/calm-reset';
  import { FinaleScreen } from '../engine/screens/finale';
  import { FlameColorsGame } from '../engine/games/flame-colors';
  import { FireballCountGame } from '../engine/games/fireball-count';
  import { PhonicsArenaGame } from '../engine/games/phonics-arena';
  import { EvolutionTowerGame } from '../engine/games/evolution-tower';

  let canvasEl: HTMLCanvasElement;
  let gameLoop: GameLoop | null = null;
  let screenManagerRef: ScreenManager | null = null;

  // Expose for parent component
  export function getEvents(): EventEmitter | null {
    return events;
  }

  // Allow parent to trigger screen transitions
  export function goToScreen(name: string) {
    screenManagerRef?.goTo(name);
  }

  // Inject audio manager into game context so games can access it
  export function injectAudio(audio: import('../engine/audio').AudioManager) {
    if (screenManagerRef) {
      (screenManagerRef as any).gameContext.audio = audio;
    }
  }

  let events: EventEmitter | null = null;

  onMount(() => {
    const ctx = setupCanvas(canvasEl);
    events = new EventEmitter();
    const tweens = new TweenManager();

    gameLoop = new GameLoop(canvasEl, ctx);

    const screenManager = new ScreenManager({
      canvas: canvasEl,
      ctx,
      events,
      tweens,
      screenManager: null!, // circular — set below
    });
    // Fix circular reference
    (screenManager as any).gameContext.screenManager = screenManager;
    gameLoop.screenManager = screenManager;

    screenManager.register('loading', new LoadingCanvasScreen());
    screenManager.register('opening', new OpeningScreen());
    screenManager.register('hub', new HubScreen());
    screenManager.register('calm-reset', new CalmResetScreen());
    screenManager.register('finale', new FinaleScreen());
    screenManager.register('flame-colors', new FlameColorsGame());
    screenManager.register('fireball-count', new FireballCountGame());
    screenManager.register('phonics-arena', new PhonicsArenaGame());
    screenManager.register('evolution-tower', new EvolutionTowerGame());
    screenManager.goTo('loading');
    screenManagerRef = screenManager;

    gameLoop.start();

    const onResize = () => {
      setupCanvas(canvasEl);
    };
    window.addEventListener('resize', onResize);

    return () => {
      gameLoop?.stop();
      window.removeEventListener('resize', onResize);
    };
  });

  function handleClick(e: MouseEvent) {
    if (!canvasEl || !gameLoop) return;
    const [x, y] = mapClickToDesignSpace(canvasEl, e);
    gameLoop.handleClick(x, y);
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Process hotkeys (1-3, 0, l, b, t, f, g)
    handleHotkey(e.key);
    // Space hold detection for calm reset extension
    onKeyDown(e.key);
    // Forward to current game screen
    gameLoop?.handleKey(e.key);
  }

  function handleKeyUp(e: KeyboardEvent) {
    onKeyUp(e.key);
  }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<canvas
  bind:this={canvasEl}
  onclick={handleClick}
  class="game-canvas"
></canvas>

<style>
  .game-canvas {
    display: block;
    image-rendering: auto;
  }
</style>
