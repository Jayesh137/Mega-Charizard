// src/state/tracker.svelte.ts
// Tracks per-child, per-concept performance for adaptive difficulty
// and within-session spaced repetition.
// Owen and Kian have SEPARATE rolling windows and concept records.
// Routing is automatic based on session.currentTurn.

import { session } from './session.svelte';

interface ConceptRecord {
  concept: string;       // e.g., 'red', '3', 'circle', 'C'
  domain: string;        // 'color' | 'number' | 'shape' | 'letter'
  attempts: number;
  misses: number;
  lastSeen: number;      // prompt index when last seen
  needsRepeat: boolean;  // flagged for spaced repetition
}

interface ChildTracker {
  rollingWindow: boolean[];               // last N answers (true=correct)
  concepts: Map<string, ConceptRecord>;
  promptCounter: number;
  consecutiveMisses: number;              // current streak of wrong answers (resets on correct)
  consecutiveCorrect: number;             // current streak of correct answers (resets on wrong)
  maxStreak: number;                      // best correct streak this session
}

function createChildTracker(): ChildTracker {
  return {
    rollingWindow: [],
    concepts: new Map(),
    promptCounter: 0,
    consecutiveMisses: 0,
    consecutiveCorrect: 0,
    maxStreak: 0,
  };
}

function createTracker() {
  let owen = $state<ChildTracker>(createChildTracker());
  let kian = $state<ChildTracker>(createChildTracker());

  /** Get the active child's tracker based on session.currentTurn ('team' defaults to 'owen') */
  function active(): ChildTracker {
    return session.currentTurn === 'kian' ? kian : owen;
  }

  function recordAnswer(concept: string, domain: string, correct: boolean): void {
    const child = active();

    // Rolling window (last 5)
    child.rollingWindow = [...child.rollingWindow.slice(-4), correct];

    // Consecutive streak tracking
    if (correct) {
      child.consecutiveMisses = 0;
      child.consecutiveCorrect++;
      if (child.consecutiveCorrect > child.maxStreak) {
        child.maxStreak = child.consecutiveCorrect;
      }
    } else {
      child.consecutiveCorrect = 0;
      child.consecutiveMisses++;
    }

    // Per-concept tracking
    const key = `${domain}:${concept}`;
    const existing = child.concepts.get(key) ?? {
      concept, domain, attempts: 0, misses: 0, lastSeen: 0, needsRepeat: false,
    };
    existing.attempts++;
    if (!correct) {
      existing.misses++;
      existing.needsRepeat = true;
    }
    existing.lastSeen = child.promptCounter;
    child.concepts.set(key, existing);
    child.concepts = new Map(child.concepts); // trigger reactivity
    child.promptCounter++;

    // Reassign to trigger $state reactivity on the child object
    if (session.currentTurn === 'kian') {
      kian = { ...kian };
    } else {
      owen = { ...owen };
    }
  }

  /** Get difficulty adjustment: -2/-1 (easier), 0 (maintain), +1 (harder) */
  function getDifficultyAdjustment(): number {
    const child = active();

    // Emergency ease-up: 3+ consecutive misses = definitely too hard
    if (child.consecutiveMisses >= 3) return -2;

    // Struggling: 2 consecutive misses
    if (child.consecutiveMisses >= 2) return -1;

    // Original rolling window logic
    if (child.rollingWindow.length < 3) return 0;
    const recent = child.rollingWindow.slice(-5);
    const correctCount = recent.filter(Boolean).length;
    if (correctCount >= 4) return 1;   // doing great -> harder
    if (correctCount <= 1) return -1;  // struggling -> easier
    return 0;
  }

  /** Get concepts that need spaced repetition (missed + not seen for 2+ prompts) */
  function getRepeatConcepts(domain: string): string[] {
    const child = active();
    const repeats: string[] = [];
    for (const [, record] of child.concepts) {
      if (record.domain === domain && record.needsRepeat && child.promptCounter - record.lastSeen >= 2) {
        repeats.push(record.concept);
      }
    }
    return repeats;
  }

  /** Mark a concept as repeated (clear needsRepeat flag) */
  function markRepeated(concept: string, domain: string): void {
    const child = active();
    const key = `${domain}:${concept}`;
    const record = child.concepts.get(key);
    if (record) {
      record.needsRepeat = false;
      record.lastSeen = child.promptCounter;
      child.concepts.set(key, record);
      child.concepts = new Map(child.concepts);

      if (session.currentTurn === 'kian') {
        kian = { ...kian };
      } else {
        owen = { ...owen };
      }
    }
  }

  function reset(): void {
    owen = createChildTracker();
    kian = createChildTracker();
  }

  return {
    recordAnswer,
    getDifficultyAdjustment,
    getRepeatConcepts,
    markRepeated,
    reset,
    get recentCorrectRate() {
      const child = active();
      if (child.rollingWindow.length === 0) return 1;
      return child.rollingWindow.filter(Boolean).length / child.rollingWindow.length;
    },
    get consecutiveMisses() { return active().consecutiveMisses; },
    get consecutiveCorrect() { return active().consecutiveCorrect; },
    get maxStreak() { return active().maxStreak; },
    get isOnStreak() { return active().consecutiveCorrect >= 3; },
    get isStruggling() { return active().consecutiveMisses >= 2; },
  };
}

export const tracker = createTracker();
