<!-- src/components/LoadingScreen.svelte -->
<script lang="ts">
  import { session } from '../state/session.svelte';

  let clicked = $state(false);
  let progress = $state(0);

  // Called by parent to update progress
  export function setProgress(percent: number) {
    progress = percent;
  }

  // Called by parent when loading is complete
  export function complete() {
    progress = 100;
  }

  interface Props {
    onunlock: () => void;
  }

  let { onunlock }: Props = $props();

  function handleClick() {
    if (clicked) return;
    clicked = true;
    onunlock();
  }
</script>

{#if session.currentScreen === 'loading'}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="loading-screen" onclick={handleClick}>
    {#if !clicked}
      <div class="prompt">
        <div class="title">MEGA CHARIZARD ACADEMY</div>
        <div class="click-prompt pulse">Click anywhere to begin</div>
      </div>
    {:else}
      <div class="loading-bar-container">
        <div class="loading-label">Loading...</div>
        <div class="loading-bar-bg">
          <div class="loading-bar-fill" style="width: {progress}%;"></div>
        </div>
        <div class="loading-percent">{Math.round(progress)}%</div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: transparent; /* Canvas shows through */
  }

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .title {
    font-size: 80px;
    font-weight: 900;
    color: #37B1E2;
    text-shadow: 0 0 40px rgba(55, 177, 226, 0.5), 0 0 80px rgba(55, 177, 226, 0.2);
    text-align: center;
    letter-spacing: 4px;
  }

  .click-prompt {
    font-size: 36px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }

  .pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .loading-bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 500px;
  }

  .loading-label {
    font-size: 32px;
    font-weight: 700;
    color: rgba(255,255,255,0.8);
  }

  .loading-bar-bg {
    width: 100%;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
  }

  .loading-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #1a5fc4, #37B1E2, #91CCEC);
    border-radius: 12px;
    transition: width 0.3s ease-out;
    box-shadow: 0 0 20px rgba(55, 177, 226, 0.5);
  }

  .loading-percent {
    font-size: 24px;
    color: rgba(255,255,255,0.6);
  }
</style>
