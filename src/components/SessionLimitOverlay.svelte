<!-- src/components/SessionLimitOverlay.svelte -->
<!-- Shows cooldown ("Come back at 3:00 PM") or daily limit ("See you tomorrow") -->
<!-- Activated by session-blocked event from hub, dismissed by uncle override. -->
<script lang="ts">
  let visible = $state(false);
  let mode = $state<'cooldown' | 'daily-limit'>('cooldown');
  let waitUntilStr = $state('');

  export function show(reason: string, waitUntil?: number): void {
    if (reason === 'daily-limit') {
      mode = 'daily-limit';
    } else {
      mode = 'cooldown';
      if (waitUntil) {
        const d = new Date(waitUntil);
        waitUntilStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    }
    visible = true;
  }

  export function hide(): void {
    visible = false;
  }
</script>

{#if visible}
<div class="session-limit-overlay">
  <div class="limit-content">
    {#if mode === 'daily-limit'}
      <!-- Daily limit reached -->
      <div class="moon-scene">
        <div class="moon"></div>
        <div class="star s1"></div>
        <div class="star s2"></div>
        <div class="star s3"></div>
        <div class="star s4"></div>
        <div class="star s5"></div>
      </div>

      <div class="sleeping-sprite night">
        <div class="body"></div>
        <div class="eye left"></div>
        <div class="eye right"></div>
        <div class="flame dim"></div>
      </div>

      <h1 class="limit-title">See you tomorrow!</h1>
      <p class="limit-message">Charizard gave it everything today!</p>
      <p class="limit-sub">Come back tomorrow for more training</p>

    {:else}
      <!-- Cooldown between sessions -->
      <div class="sleeping-sprite">
        <div class="body"></div>
        <div class="eye left"></div>
        <div class="eye right"></div>
        <div class="flame dim"></div>
      </div>

      <h1 class="limit-title">Charizard is resting!</h1>
      <p class="limit-message">Come back at <span class="time-highlight">{waitUntilStr}</span></p>
      <p class="limit-sub">Great trainers let their Pokemon rest</p>

      <div class="clock-icon">
        <div class="clock-face">
          <div class="clock-hand hour"></div>
          <div class="clock-hand minute"></div>
        </div>
      </div>
    {/if}
  </div>
</div>
{/if}

<style>
  .session-limit-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: linear-gradient(180deg, #050310 0%, #0a0620 40%, #120838 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.8s ease-out;
    pointer-events: all;
  }

  .limit-content {
    text-align: center;
    position: relative;
  }

  /* Sleeping sprite (reused from timeout) */
  .sleeping-sprite {
    position: relative;
    width: 200px;
    height: 180px;
    margin: 0 auto 30px;
  }

  .sleeping-sprite.night {
    margin-top: 80px;
  }

  .body {
    width: 160px;
    height: 120px;
    background: radial-gradient(ellipse at 50% 40%, #2a2045, #1B1B2F);
    border-radius: 50% 50% 40% 40%;
    margin: 40px auto 0;
    border: 3px solid #37B1E2;
    box-shadow: 0 0 20px rgba(55, 177, 226, 0.15);
    animation: breathe 4s ease-in-out infinite;
  }

  .eye {
    position: absolute;
    width: 20px;
    height: 4px;
    background: #37B1E2;
    border-radius: 2px;
    top: 70px;
  }

  .eye.left { left: 55px; }
  .eye.right { right: 55px; }

  .flame {
    position: absolute;
    width: 16px;
    height: 24px;
    background: radial-gradient(ellipse at center bottom, #37B1E2, #1A5C8A);
    border-radius: 50% 50% 30% 30%;
    right: 10px;
    top: 70px;
    animation: flicker 2s ease-in-out infinite;
  }

  .flame.dim {
    opacity: 0.2;
    transform: scale(0.5);
  }

  .limit-title {
    color: #91CCEC;
    font-size: 48px;
    font-weight: 700;
    font-family: Fredoka, Nunito, sans-serif;
    margin: 0 0 16px;
  }

  .limit-message {
    color: #ccccdd;
    font-size: 28px;
    font-family: Fredoka, Nunito, sans-serif;
    margin: 0 0 10px;
  }

  .time-highlight {
    color: #FFD700;
    font-weight: 700;
  }

  .limit-sub {
    color: #666688;
    font-size: 20px;
    font-family: Fredoka, Nunito, sans-serif;
    margin: 0;
  }

  /* Moon + stars scene for daily limit */
  .moon-scene {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 300px;
    height: 120px;
  }

  .moon {
    position: absolute;
    width: 80px;
    height: 80px;
    background: radial-gradient(circle at 35% 35%, #fffff0, #e8e0c0);
    border-radius: 50%;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 40px rgba(255, 255, 220, 0.3);
  }

  .star {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #ffffff;
    border-radius: 50%;
    animation: twinkle 2s ease-in-out infinite;
  }

  .s1 { top: 10px; left: 30px; animation-delay: 0s; }
  .s2 { top: 25px; right: 40px; animation-delay: 0.5s; width: 3px; height: 3px; }
  .s3 { top: 5px; right: 80px; animation-delay: 1s; }
  .s4 { top: 50px; left: 15px; animation-delay: 1.5s; width: 3px; height: 3px; }
  .s5 { top: 40px; right: 20px; animation-delay: 0.8s; }

  /* Clock icon for cooldown */
  .clock-icon {
    margin: 30px auto 0;
    width: 60px;
    height: 60px;
  }

  .clock-face {
    width: 60px;
    height: 60px;
    border: 3px solid #91CCEC;
    border-radius: 50%;
    position: relative;
  }

  .clock-hand {
    position: absolute;
    background: #91CCEC;
    transform-origin: bottom center;
    left: 50%;
    bottom: 50%;
    border-radius: 2px;
  }

  .clock-hand.hour {
    width: 3px;
    height: 16px;
    margin-left: -1.5px;
    transform: rotate(60deg);
  }

  .clock-hand.minute {
    width: 2px;
    height: 22px;
    margin-left: -1px;
    transform: rotate(200deg);
    animation: tick 8s linear infinite;
  }

  @keyframes breathe {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.05); }
  }

  @keyframes flicker {
    0%, 100% { transform: scaleY(1) scaleX(1); }
    25% { transform: scaleY(1.1) scaleX(0.9); }
    50% { transform: scaleY(0.9) scaleX(1.1); }
    75% { transform: scaleY(1.05) scaleX(0.95); }
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @keyframes tick {
    from { transform: rotate(200deg); }
    to { transform: rotate(560deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
