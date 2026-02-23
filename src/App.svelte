<script lang="ts">
  import GameCanvas from './components/GameCanvas.svelte';
  import TurnBanner from './components/TurnBanner.svelte';
  import CelebrationOverlay from './components/CelebrationOverlay.svelte';
  import PromptDisplay from './components/PromptDisplay.svelte';
  import SubtitleBar from './components/SubtitleBar.svelte';
</script>

<div class="game-container">
  <GameCanvas />
  <TurnBanner />
  <CelebrationOverlay />
  <PromptDisplay />
  <SubtitleBar />
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
