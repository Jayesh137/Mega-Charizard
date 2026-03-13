// src/state/tracker.svelte.ts
// Tracks per-child, per-concept performance for adaptive difficulty,
// response times, ZPD estimation, and within-session spaced repetition.
// Owen and Kian have SEPARATE rolling windows and concept records.
// Routing is automatic based on session.currentTurn.
// Research: Vygotsky ZPD — keep children in their zone of proximal development.
// Research: Response time + accuracy together indicate learning vs guessing.

import { session } from './session.svelte';
import { settings } from './settings.svelte';

interface ConceptRecord {
  concept: string;       // e.g., 'red', '3', 'circle', 'C'
  domain: string;        // 'color' | 'number' | 'shape' | 'letter'
  attempts: number;
  correct: number;
  misses: number;
  lastSeen: number;      // prompt index when last seen
  needsRepeat: boolean;  // flagged for spaced repetition
  responseTimes: number[]; // last 5 response times in ms
}

interface ChildTracker {
  rollingWindow: boolean[];               // last N answers (true=correct)
  concepts: Map<string, ConceptRecord>;
  promptCounter: number;
  consecutiveMisses: number;
  consecutiveCorrect: number;
  maxStreak: number;
  responseTimes: number[];                // all response times this session (ms)
  promptStartTime: number;               // when current prompt was shown (ms)
  totalCorrect: number;
  totalAttempts: number;
  domainAttempts: Map<string, { correct: number; total: number }>;
}

function createChildTracker(): ChildTracker {
  return {
    rollingWindow: [],
    concepts: new Map(),
    promptCounter: 0,
    consecutiveMisses: 0,
    consecutiveCorrect: 0,
    maxStreak: 0,
    responseTimes: [],
    promptStartTime: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    domainAttempts: new Map(),
  };
}

/** ZPD zone classification based on accuracy and response time */
export type ZPDZone = 'too-easy' | 'zpd' | 'too-hard';

/** Domain-level performance summary */
export interface DomainSummary {
  domain: string;
  accuracy: number;         // 0-100
  avgResponseMs: number;
  totalAttempts: number;
  conceptsAttempted: number;
  conceptsMastered: number; // ≥80% accuracy with 3+ attempts
  zpd: ZPDZone;
}

function createTracker() {
  let owen = $state<ChildTracker>(createChildTracker());
  let kian = $state<ChildTracker>(createChildTracker());

  /** Get the active child's tracker based on session.currentTurn ('team' defaults to 'owen') */
  function active(): ChildTracker {
    return session.currentTurn === 'kian' ? kian : owen;
  }

  /** Reassign to trigger $state reactivity */
  function triggerReactivity(): void {
    if (session.currentTurn === 'kian') {
      kian = { ...kian };
    } else {
      owen = { ...owen };
    }
  }

  /** Signal that a new prompt has been displayed (starts response timer) */
  function startPromptTimer(): void {
    active().promptStartTime = Date.now();
  }

  function recordAnswer(concept: string, domain: string, correct: boolean): void {
    const child = active();

    // Response time tracking
    const responseTime = child.promptStartTime > 0
      ? Date.now() - child.promptStartTime
      : 0;
    if (responseTime > 0 && responseTime < 30000) { // Ignore if > 30s (likely AFK)
      child.responseTimes.push(responseTime);
    }
    child.promptStartTime = 0;

    // Rolling window (last 5)
    child.rollingWindow = [...child.rollingWindow.slice(-4), correct];

    // Global counts
    child.totalAttempts++;
    if (correct) child.totalCorrect++;

    // Domain-level tracking
    const domainStats = child.domainAttempts.get(domain) ?? { correct: 0, total: 0 };
    domainStats.total++;
    if (correct) domainStats.correct++;
    child.domainAttempts.set(domain, domainStats);
    child.domainAttempts = new Map(child.domainAttempts);

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
      concept, domain, attempts: 0, correct: 0, misses: 0,
      lastSeen: 0, needsRepeat: false, responseTimes: [],
    };
    existing.attempts++;
    if (correct) {
      existing.correct++;
    } else {
      existing.misses++;
      existing.needsRepeat = true;
    }
    if (responseTime > 0 && responseTime < 30000) {
      existing.responseTimes = [...existing.responseTimes.slice(-4), responseTime];
    }
    existing.lastSeen = child.promptCounter;
    child.concepts.set(key, existing);
    child.concepts = new Map(child.concepts);
    child.promptCounter++;

    triggerReactivity();
  }

  /** Get difficulty adjustment: -2/-1 (easier), 0 (maintain), +1/+2 (harder) */
  function getDifficultyAdjustment(): number {
    const child = active();

    // Emergency ease-up: 3+ consecutive misses = definitely too hard
    if (child.consecutiveMisses >= 3) return -2;

    // Struggling: 2 consecutive misses
    if (child.consecutiveMisses >= 2) return -1;

    if (child.rollingWindow.length < 3) return 0;
    const recent = child.rollingWindow.slice(-5);
    const correctCount = recent.filter(Boolean).length;

    // Factor in response time: fast + accurate = truly mastered
    const recentTimes = child.responseTimes.slice(-5);
    const avgResponseMs = recentTimes.length > 0
      ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
      : 5000;

    // Very fast AND very accurate → push harder
    if (correctCount >= 5 && avgResponseMs < 2000) return 2;
    if (correctCount >= 4) return 1;
    if (correctCount <= 1) return -1;
    return 0;
  }

  /** Estimate ZPD zone for a domain */
  function getZPD(domain: string): ZPDZone {
    const child = active();
    const stats = child.domainAttempts.get(domain);
    if (!stats || stats.total < 3) return 'zpd'; // Not enough data, assume ZPD

    const accuracy = (stats.correct / stats.total) * 100;

    // Get avg response time for this domain
    let domainResponseTimes: number[] = [];
    for (const [, record] of child.concepts) {
      if (record.domain === domain && record.responseTimes.length > 0) {
        domainResponseTimes = [...domainResponseTimes, ...record.responseTimes];
      }
    }
    const avgMs = domainResponseTimes.length > 0
      ? domainResponseTimes.reduce((a, b) => a + b, 0) / domainResponseTimes.length
      : 5000;

    // Research: ZPD is ~60-85% accuracy with moderate response times
    // Too easy: high accuracy + fast responses (automaticity achieved)
    if (accuracy >= 90 && avgMs < 2500) return 'too-easy';
    // Too hard: low accuracy regardless of speed
    if (accuracy < 40) return 'too-hard';
    // ZPD: productive struggle zone
    return 'zpd';
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
      triggerReactivity();
    }
  }

  /** Get domain-level performance summaries for a specific child */
  function getDomainSummaries(child: 'owen' | 'kian'): DomainSummary[] {
    const ct = child === 'kian' ? kian : owen;
    const domains = new Map<string, {
      correct: number; total: number;
      responseTimes: number[];
      conceptsAttempted: Set<string>;
      conceptsMastered: Set<string>;
    }>();

    for (const [, record] of ct.concepts) {
      let d = domains.get(record.domain);
      if (!d) {
        d = { correct: 0, total: 0, responseTimes: [], conceptsAttempted: new Set(), conceptsMastered: new Set() };
        domains.set(record.domain, d);
      }
      d.correct += record.correct;
      d.total += record.attempts;
      d.responseTimes.push(...record.responseTimes);
      d.conceptsAttempted.add(record.concept);
      if (record.attempts >= 3 && (record.correct / record.attempts) >= 0.8) {
        d.conceptsMastered.add(record.concept);
      }
    }

    const summaries: DomainSummary[] = [];
    for (const [domain, d] of domains) {
      const accuracy = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
      const avgResponseMs = d.responseTimes.length > 0
        ? Math.round(d.responseTimes.reduce((a, b) => a + b, 0) / d.responseTimes.length)
        : 0;

      let zpd: ZPDZone = 'zpd';
      if (accuracy >= 90 && avgResponseMs > 0 && avgResponseMs < 2500) zpd = 'too-easy';
      else if (accuracy < 40 && d.total >= 3) zpd = 'too-hard';

      summaries.push({
        domain, accuracy, avgResponseMs,
        totalAttempts: d.total,
        conceptsAttempted: d.conceptsAttempted.size,
        conceptsMastered: d.conceptsMastered.size,
        zpd,
      });
    }
    return summaries;
  }

  /** Flush session data to persistent mastery in settings */
  function persistToSettings(): void {
    for (const child of ['owen', 'kian'] as const) {
      const ct = child === 'kian' ? kian : owen;
      for (const [, record] of ct.concepts) {
        if (record.attempts >= 2) {
          const accuracy = Math.round((record.correct / record.attempts) * 100);
          settings.updateMastery(child, record.concept, record.domain, accuracy);
        }
      }
    }
  }

  /** Get average response time (ms) for the active child */
  function getAvgResponseTime(): number {
    const child = active();
    if (child.responseTimes.length === 0) return 0;
    return Math.round(child.responseTimes.reduce((a, b) => a + b, 0) / child.responseTimes.length);
  }

  function reset(): void {
    owen = createChildTracker();
    kian = createChildTracker();
  }

  return {
    recordAnswer,
    startPromptTimer,
    getDifficultyAdjustment,
    getZPD,
    getRepeatConcepts,
    markRepeated,
    getDomainSummaries,
    persistToSettings,
    getAvgResponseTime,
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
    /** Get overall accuracy for a specific child (0-100) */
    getChildAccuracy(child: 'owen' | 'kian'): number {
      const ct = child === 'kian' ? kian : owen;
      if (ct.totalAttempts === 0) return 0;
      return Math.round((ct.totalCorrect / ct.totalAttempts) * 100);
    },
    /** Get max streak for a specific child */
    getChildMaxStreak(child: 'owen' | 'kian'): number {
      return (child === 'kian' ? kian : owen).maxStreak;
    },
  };
}

export const tracker = createTracker();
