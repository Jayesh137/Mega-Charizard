<!-- src/components/GameCanvas.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { setupCanvas, mapClickToDesignSpace } from '../engine/utils/canvas';
  import { GameLoop } from '../engine/game-loop';
  import { ScreenManager } from '../engine/screen-manager';
  import { EventEmitter } from '../engine/events';
  import { TweenManager } from '../engine/utils/tween';
  import { HubScreen } from '../engine/screens/hub';
  import { LoadingCanvasScreen } from '../engine/screens/loading';

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
    screenManager.register('hub', new HubScreen());
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
    gameLoop?.handleKey(e.key);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

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
