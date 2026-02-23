// src/engine/preloader.ts
import { assetManifest } from '../config/manifest';
import type { AudioManager } from './audio';
import type { EventEmitter } from './events';

export class Preloader {
  constructor(
    private audio: AudioManager,
    private events: EventEmitter,
  ) {}

  async loadCritical(): Promise<void> {
    const critical = assetManifest.filter((a) => a.priority === 'critical');
    let loaded = 0;
    for (const asset of critical) {
      await this.audio.loadBuffer(asset.path);
      loaded++;
      this.events.emit({
        type: 'loading-progress',
        percent: (loaded / assetManifest.length) * 100,
      });
    }
  }

  async loadDeferred(): Promise<void> {
    const deferred = assetManifest.filter((a) => a.priority === 'deferred');
    let loaded = assetManifest.filter((a) => a.priority === 'critical').length;
    for (const asset of deferred) {
      await this.audio.loadBuffer(asset.path);
      loaded++;
      this.events.emit({
        type: 'loading-progress',
        percent: (loaded / assetManifest.length) * 100,
      });
    }
  }
}
