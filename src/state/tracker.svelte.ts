// src/state/tracker.svelte.ts
// Tracks per-child, per-concept performance for adaptive difficulty
// and within-session spaced repetition.

interface ConceptRecord {
  concept: string;       // e.g., 'red', '3', 'circle', 'C'
  domain: string;        // 'color' | 'number' | 'shape' | 'letter'
  attempts: number;
  misses: number;
  lastSeen: number;      // prompt index when last seen
  needsRepeat: boolean;  // flagged for spaced repetition
}

function createTracker() {
  let rollingWindow = $state<boolean[]>([]);  // last N answers (true=correct)
  let concepts = $state<Map<string, ConceptRecord>>(new Map());
  let promptCounter = $state(0);

  function recordAnswer(concept: string, domain: string, correct: boolean): void {
    // Rolling window (last 5)
    rollingWindow = [...rollingWindow.slice(-4), correct];

    // Per-concept tracking
    const key = `${domain}:${concept}`;
    const existing = concepts.get(key) ?? {
      concept, domain, attempts: 0, misses: 0, lastSeen: 0, needsRepeat: false,
    };
    existing.attempts++;
    if (!correct) {
      existing.misses++;
      existing.needsRepeat = true;
    }
    existing.lastSeen = promptCounter;
    concepts.set(key, existing);
    concepts = new Map(concepts); // trigger reactivity
    promptCounter++;
  }

  /** Get difficulty adjustment: -1 (easier), 0 (maintain), +1 (harder) */
  function getDifficultyAdjustment(): number {
    if (rollingWindow.length < 3) return 0;
    const recent = rollingWindow.slice(-5);
    const correctCount = recent.filter(Boolean).length;
    if (correctCount >= 4) return 1;   // doing great -> slightly harder
    if (correctCount <= 1) return -1;  // struggling -> slightly easier
    return 0;
  }

  /** Get concepts that need spaced repetition (missed + not seen for 2+ prompts) */
  function getRepeatConcepts(domain: string): string[] {
    const repeats: string[] = [];
    for (const [, record] of concepts) {
      if (record.domain === domain && record.needsRepeat && promptCounter - record.lastSeen >= 2) {
        repeats.push(record.concept);
      }
    }
    return repeats;
  }

  /** Mark a concept as repeated (clear needsRepeat flag) */
  function markRepeated(concept: string, domain: string): void {
    const key = `${domain}:${concept}`;
    const record = concepts.get(key);
    if (record) {
      record.needsRepeat = false;
      record.lastSeen = promptCounter;
      concepts.set(key, record);
      concepts = new Map(concepts);
    }
  }

  function reset(): void {
    rollingWindow = [];
    concepts = new Map();
    promptCounter = 0;
  }

  return {
    recordAnswer,
    getDifficultyAdjustment,
    getRepeatConcepts,
    markRepeated,
    reset,
    get recentCorrectRate() {
      if (rollingWindow.length === 0) return 1;
      return rollingWindow.filter(Boolean).length / rollingWindow.length;
    },
  };
}

export const tracker = createTracker();
