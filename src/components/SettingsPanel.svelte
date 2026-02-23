<!-- src/components/SettingsPanel.svelte -->
<script lang="ts">
  import { settings } from '../state/settings.svelte';
  import type { Intensity } from '../state/types';

  let open = $state(false);

  interface Props {
    onreplayopening?: () => void;
  }

  let { onreplayopening }: Props = $props();

  export function toggle() {
    open = !open;
  }

  export function show() {
    open = true;
  }

  export function hide() {
    open = false;
  }

  function handleBackdropClick() {
    open = false;
  }

  function handlePanelKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'g') {
      e.stopPropagation();
      open = false;
    }
  }

  function handleIntensityChange(value: Intensity) {
    settings.intensity = value;
  }

  function handleReplayOpening() {
    open = false;
    onreplayopening?.();
  }
</script>

<!-- Gear icon button (always visible) -->
<button
  class="gear-button"
  onclick={() => { open = true; }}
  aria-label="Open settings"
>
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
  </svg>
</button>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="settings-backdrop" onclick={handleBackdropClick} onkeydown={handlePanelKeydown}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="settings-panel" onclick={(e) => e.stopPropagation()} onkeydown={handlePanelKeydown}>
      <div class="panel-header">
        <h2 class="panel-title">Settings</h2>
        <button class="close-btn" onclick={() => { open = false; }} aria-label="Close settings">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="panel-content">
        <!-- Trainer Names -->
        <div class="setting-group">
          <label class="setting-label" for="little-trainer">Little Trainer Name</label>
          <input
            id="little-trainer"
            class="setting-input"
            type="text"
            value={settings.littleTrainerName}
            oninput={(e) => { settings.littleTrainerName = (e.target as HTMLInputElement).value; }}
          />
        </div>

        <div class="setting-group">
          <label class="setting-label" for="big-trainer">Big Trainer Name</label>
          <input
            id="big-trainer"
            class="setting-input"
            type="text"
            value={settings.bigTrainerName}
            oninput={(e) => { settings.bigTrainerName = (e.target as HTMLInputElement).value; }}
          />
        </div>

        <!-- Celebration Intensity -->
        <div class="setting-group">
          <span class="setting-label">Celebration Intensity</span>
          <div class="radio-group">
            {#each ['calm', 'normal', 'hype'] as level}
              <label class="radio-option" class:active={settings.intensity === level}>
                <input
                  type="radio"
                  name="intensity"
                  value={level}
                  checked={settings.intensity === level}
                  onchange={() => handleIntensityChange(level as Intensity)}
                />
                <span class="radio-label">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Silent Mode -->
        <div class="setting-group toggle-row">
          <span class="setting-label">Silent Mode</span>
          <button
            class="toggle-btn"
            class:on={settings.silentMode}
            onclick={() => { settings.silentMode = !settings.silentMode; }}
            aria-label="Toggle silent mode"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

        <!-- Show Subtitles -->
        <div class="setting-group toggle-row">
          <span class="setting-label">Show Subtitles</span>
          <button
            class="toggle-btn"
            class:on={settings.showSubtitles}
            onclick={() => { settings.showSubtitles = !settings.showSubtitles; }}
            aria-label="Toggle subtitles"
          >
            <span class="toggle-thumb"></span>
          </button>
        </div>

        <!-- Replay Opening -->
        <div class="setting-group">
          <button class="action-btn" onclick={handleReplayOpening}>
            Replay Opening
          </button>
        </div>
      </div>

      <div class="panel-footer">
        Press <kbd>G</kbd> or <kbd>Esc</kbd> to close
      </div>
    </div>
  </div>
{/if}

<style>
  .gear-button {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 150;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.35);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .gear-button:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }

  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: flex-end;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .settings-panel {
    width: 380px;
    max-width: 90vw;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    overflow-y: auto;
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .panel-title {
    font-size: 28px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.8);
  }

  .panel-content {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting-group.toggle-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .setting-label {
    font-size: 28px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }

  .setting-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.06);
    color: white;
    font-size: 28px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .setting-input:focus {
    border-color: rgba(55, 177, 226, 0.6);
  }

  .radio-group {
    display: flex;
    gap: 8px;
  }

  .radio-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .radio-option:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .radio-option.active {
    border-color: rgba(55, 177, 226, 0.5);
    background: rgba(55, 177, 226, 0.15);
  }

  .radio-option input {
    display: none;
  }

  .radio-label {
    font-size: 28px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }

  .toggle-btn {
    position: relative;
    width: 52px;
    height: 28px;
    border-radius: 14px;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .toggle-btn.on {
    background: rgba(55, 177, 226, 0.6);
  }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .toggle-btn.on .toggle-thumb {
    transform: translateX(24px);
  }

  .action-btn {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
    font-size: 28px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .panel-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 24px;
    color: rgba(255, 255, 255, 0.35);
    text-align: center;
  }

  kbd {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.08);
    font-family: inherit;
    font-size: 22px;
    color: rgba(255, 255, 255, 0.5);
  }
</style>
