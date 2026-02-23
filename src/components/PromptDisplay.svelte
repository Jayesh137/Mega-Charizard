<!-- src/components/PromptDisplay.svelte -->
<script lang="ts">
  let visible = $state(false);
  let promptType = $state('');
  let promptValue = $state('');
  let promptIcon = $state('');

  export function show(type: string, value: string, icon: string) {
    promptType = type;
    promptValue = value;
    promptIcon = icon;
    visible = true;
  }

  export function hide() {
    visible = false;
  }

  // Icon color mapping for color prompts
  function getIconColor(): string {
    if (promptType === 'color') {
      const colorMap: Record<string, string> = {
        red: '#ff3333', blue: '#3377ff', yellow: '#ffdd00',
        green: '#33cc33', orange: '#ff8833', purple: '#9933ff',
      };
      return colorMap[promptValue.toLowerCase()] || '#ffffff';
    }
    return '#37B1E2'; // default blue for non-color prompts
  }
</script>

{#if visible}
  <div class="prompt-display">
    <div class="prompt-icon" style="color: {getIconColor()};">
      {#if promptType === 'color'}
        <div class="flame-blob" style="background: {getIconColor()};"></div>
      {:else if promptType === 'number'}
        <span class="number-icon">{promptValue}</span>
      {:else if promptType === 'shape'}
        <span class="shape-icon">{promptIcon}</span>
      {:else if promptType === 'letter'}
        <span class="letter-icon">{promptValue}</span>
      {:else}
        <span class="generic-icon">?</span>
      {/if}
    </div>
    <div class="prompt-label">{promptValue}</div>
  </div>
{/if}

<style>
  .prompt-display {
    position: fixed;
    top: 10%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    z-index: 80;
    pointer-events: none;
    animation: promptIn 0.3s ease-out;
  }

  @keyframes promptIn {
    from { transform: translateX(-50%) scale(0.8); opacity: 0; }
    to { transform: translateX(-50%) scale(1); opacity: 1; }
  }

  .prompt-icon {
    font-size: 120px;
    line-height: 1;
  }

  .flame-blob {
    width: 120px;
    height: 120px;
    border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
    filter: blur(2px);
    box-shadow: 0 0 40px currentColor;
  }

  .number-icon {
    font-family: 'Fredoka', 'Nunito', sans-serif;
    font-size: 180px;
    font-weight: 700;
    color: #FFD700;
    text-shadow: 0 0 20px rgba(255,215,0,0.5);
  }

  .shape-icon {
    font-size: 120px;
  }

  .letter-icon {
    font-family: 'Fredoka', 'Nunito', sans-serif;
    font-size: 160px;
    font-weight: 700;
    color: #37B1E2;
    text-shadow: 0 0 20px rgba(55,177,226,0.5);
  }

  .generic-icon {
    font-size: 120px;
  }

  .prompt-label {
    font-family: 'Fredoka', 'Nunito', sans-serif;
    font-size: 52px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
  }
</style>
