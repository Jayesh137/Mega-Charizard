<script lang="ts">
  import GameCanvas from './components/GameCanvas.svelte';
</script>

<div class="game-container">
  <GameCanvas />
  <!-- UI overlay components will be added here -->
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
