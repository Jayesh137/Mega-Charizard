import { session } from '../../state/session.svelte';
import type { EvolutionStage } from '../../state/types';

const THRESHOLDS: { stage: EvolutionStage; at: number }[] = [
  { stage: 'charmeleon', at: 33 },
  { stage: 'charizard', at: 66 },
  { stage: 'megax', at: 100 },
];

export class EvolutionManager {
  private lastStage: EvolutionStage = 'charmander';

  /** Add charge to evolution meter. Returns new stage if evolution triggered, null otherwise. */
  addCharge(amount: number): EvolutionStage | null {
    session.evolutionMeter = Math.min(
      session.evolutionMeter + amount,
      session.evolutionMeterMax,
    );
    const pct = (session.evolutionMeter / session.evolutionMeterMax) * 100;

    for (const t of THRESHOLDS) {
      if (pct >= t.at && this.lastStage !== t.stage && this.stageIndex(t.stage) > this.stageIndex(this.lastStage)) {
        this.lastStage = t.stage;
        session.evolutionStage = t.stage;
        return t.stage;
      }
    }
    return null;
  }

  /** Get sprite key for current evolution stage */
  get spriteKey(): string {
    switch (session.evolutionStage) {
      case 'charmander': return 'charmander';
      case 'charmeleon': return 'charmeleon';
      case 'charizard': return 'charizard';
      case 'megax': return 'charizard-megax';
    }
  }

  /** Get sprite scale — earlier stages are smaller */
  get spriteScale(): number {
    switch (session.evolutionStage) {
      case 'charmander': return 2;
      case 'charmeleon': return 2.5;
      case 'charizard': return 3;
      case 'megax': return 3;
    }
  }

  reset(): void {
    this.lastStage = 'charmander';
    session.evolutionStage = 'charmander';
    session.evolutionMeter = 0;
    session.gamesCompleted = 0;
  }

  private stageIndex(stage: EvolutionStage): number {
    const order: EvolutionStage[] = ['charmander', 'charmeleon', 'charizard', 'megax'];
    return order.indexOf(stage);
  }
}
