// src/engine/systems/session-limiter.ts
import { settings } from '../../state/settings.svelte';

const TIMEOUT_DURATION = 3 * 60;     // 3 minutes in seconds
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours in ms
const MAX_SESSIONS_PER_DAY = 4;
const DAILY_RESET_HOUR = 6;          // 6:00 AM

export class SessionLimiter {
  private _timedOut = false;
  private _timeoutRemaining = 0;

  get timedOut(): boolean { return this._timedOut; }
  get timeoutRemaining(): number { return this._timeoutRemaining; }
  get timeoutRemainingFormatted(): string {
    const m = Math.floor(this._timeoutRemaining / 60);
    const s = Math.floor(this._timeoutRemaining % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  checkDailyReset(): void {
    const today = new Date();
    const resetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (today.getHours() >= DAILY_RESET_HOUR && settings.dailyResetDate !== resetDate) {
      settings.sessionsToday = 0;
      settings.dailyResetDate = resetDate;
    }
  }

  canStartSession(): { allowed: boolean; reason?: string; waitUntil?: number } {
    this.checkDailyReset();
    if (settings.sessionsToday >= MAX_SESSIONS_PER_DAY) {
      return { allowed: false, reason: 'daily-limit' };
    }
    const elapsed = Date.now() - settings.lastSessionEnd;
    if (settings.lastSessionEnd > 0 && elapsed < COOLDOWN_MS) {
      return { allowed: false, reason: 'cooldown', waitUntil: settings.lastSessionEnd + COOLDOWN_MS };
    }
    return { allowed: true };
  }

  recordSessionEnd(): void {
    settings.sessionsToday++;
    settings.lastSessionEnd = Date.now();
  }

  startTimeout(): void {
    this._timedOut = true;
    this._timeoutRemaining = TIMEOUT_DURATION;
  }

  endTimeout(): void {
    this._timedOut = false;
    this._timeoutRemaining = 0;
  }

  toggleTimeout(): void {
    if (this._timedOut) this.endTimeout();
    else this.startTimeout();
  }

  update(dt: number): boolean {
    if (!this._timedOut) return false;
    this._timeoutRemaining -= dt;
    if (this._timeoutRemaining <= 0) {
      this._timedOut = false;
      this._timeoutRemaining = 0;
      return true;
    }
    return false;
  }

  override(): void {
    this.endTimeout();
    settings.sessionsToday = 0;
    settings.lastSessionEnd = 0;
  }
}
