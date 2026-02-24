<!-- src/components/SubtitleBar.svelte -->
<script lang="ts">
  import { settings } from '../state/settings.svelte';

  let text = $state('');
  let visible = $state(false);

  export function show(subtitle: string) {
    text = subtitle;
    visible = true;
  }

  export function hide() {
    visible = false;
  }
</script>

{#if visible && settings.showSubtitles}
  <div class="subtitle-bar">
    <span class="subtitle-text">{text}</span>
  </div>
{/if}

<style>
  .subtitle-bar {
    position: fixed;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    padding: 12px 40px;
    border-radius: 12px;
    z-index: 85;
    pointer-events: none;
    max-width: 80%;
    text-align: center;
  }

  .subtitle-text {
    font-family: 'Nunito', Fredoka, Nunito, sans-serif, sans-serif;
    font-size: 48px;
    font-weight: 700;
    color: white;
    text-shadow: 1px 1px 4px rgba(0,0,0,0.5);
  }
</style>
