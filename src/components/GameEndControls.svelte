<!-- src/components/GameEndControls.svelte -->
<script lang="ts">
  let visible = $state(false);
  let allowReplay = $state(true);

  export function show(replay: boolean = true) {
    allowReplay = replay;
    visible = true;
  }

  export function hide() {
    visible = false;
  }

  interface Props {
    onreplay?: () => void;
    onnext?: () => void;
  }

  let { onreplay, onnext }: Props = $props();
</script>

{#if visible}
  <div class="game-end-controls">
    {#if allowReplay}
      <button class="control-btn replay-btn" onclick={() => { hide(); onreplay?.(); }}>
        <span class="btn-icon">&#x1F525;</span>
        <span class="btn-label">Replay</span>
      </button>
    {/if}
    <button class="control-btn next-btn" onclick={() => { hide(); onnext?.(); }}>
      <span class="btn-icon">&#x27A1;</span>
      <span class="btn-label">Next</span>
    </button>
  </div>
{/if}

<style>
  .game-end-controls {
    position: fixed;
    bottom: 10%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 40px;
    z-index: 95;
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  .control-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 40px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 20px;
    background: rgba(0,0,0,0.6);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background: rgba(255,255,255,0.15);
    border-color: rgba(255,255,255,0.6);
    transform: scale(1.05);
  }

  .btn-icon {
    font-size: 48px;
    line-height: 1;
  }

  .btn-label {
    font-family: 'Fredoka', 'Nunito', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: white;
  }
</style>
