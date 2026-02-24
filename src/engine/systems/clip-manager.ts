import { CLIPS, type ClipCategory, type ClipDef } from '../../config/clips';

export class ClipManager {
  private playedThisSession = new Set<string>();
  private lastPlayedId = '';

  /** Get a random clip from a category. Never repeats consecutively. Prefers unseen clips. */
  pick(category: ClipCategory, evolutionStage?: string): ClipDef | null {
    let pool = CLIPS.filter(c => c.category === category);
    if (evolutionStage) {
      pool = pool.filter(c => c.evolutionStage === evolutionStage);
    }
    if (pool.length === 0) return null;

    const unseen = pool.filter(c => !this.playedThisSession.has(c.id));
    const candidates = unseen.length > 0 ? unseen : pool;
    const filtered = candidates.length > 1
      ? candidates.filter(c => c.id !== this.lastPlayedId)
      : candidates;

    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    this.playedThisSession.add(pick.id);
    this.lastPlayedId = pick.id;
    return pick;
  }

  getEvolutionClip(stage: string): ClipDef | null {
    return this.pick('evolution', stage);
  }

  reset(): void {
    this.playedThisSession.clear();
    this.lastPlayedId = '';
  }
}
