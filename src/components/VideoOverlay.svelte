<script lang="ts">
  let { onVideoEnd }: { onVideoEnd?: (nextScreen?: string) => void } = $props();

  let visible = $state(false);
  let videoSrc = $state('');
  let nextScreen = $state<string | undefined>(undefined);
  let videoEl: HTMLVideoElement | undefined = $state(undefined);

  export function play(src: string, onEnd?: string): void {
    videoSrc = src;
    nextScreen = onEnd;
    visible = true;
    // Wait for DOM update then play
    requestAnimationFrame(() => {
      videoEl?.play().catch(() => {
        // Autoplay blocked — skip video
        handleEnd();
      });
    });
  }

  export function stop(): void {
    handleEnd();
  }

  function handleEnd(): void {
    if (videoEl) {
      videoEl.pause();
      videoEl.currentTime = 0;
    }
    visible = false;
    videoSrc = '';
    onVideoEnd?.(nextScreen);
    nextScreen = undefined;
  }

  function handleSkip(): void {
    handleEnd();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="video-overlay" onclick={handleSkip} role="button" tabindex="-1">
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={videoEl}
      src={videoSrc}
      onended={handleEnd}
      playsinline
      style="max-width: 100%; max-height: 100%; object-fit: contain;"
    ></video>
    <span class="skip-hint">Tap to skip</span>
  </div>
{/if}

<style>
  .video-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .skip-hint {
    position: absolute;
    bottom: 40px;
    right: 40px;
    color: rgba(255,255,255,0.4);
    font: 18px system-ui;
    pointer-events: none;
  }
</style>
