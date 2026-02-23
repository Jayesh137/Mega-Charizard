// src/config/constants.ts

// Canvas
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;
export const MAX_DPR = 2;

// TV Safe Area (5% margin for overscan)
export const SAFE_AREA = {
  left: 0.05,
  right: 0.95,
  top: 0.05,
  bottom: 0.95,
} as const;

// Performance
export const TARGET_FPS = 60;
export const MAX_PARTICLES = 300;
export const FPS_THRESHOLD_MEDIUM = 55; // Below this: reduce particles 50%
export const FPS_THRESHOLD_LOW = 40;    // Below this: reduce particles 75%
export const MAX_FRAME_DT = 0.05;       // Cap delta-time at 50ms

// Timing (seconds)
export const BANNER_SLIDE_IN = 0.4;
export const BANNER_HOLD = 1.5;
export const BANNER_SLIDE_OUT = 0.3;
export const TRANSITION_DURATION = 0.8;
export const FREEZE_FRAME_DURATION = 0.1;
export const CALM_RESET_DURATION = { calm: 10, normal: 7, hype: 5 } as const;
export const CALM_RESET_EXTEND_INCREMENT = 3;
export const PROMPT_TIMEOUT = 999;     // Games wait for player — no auto-timeout
export const FAILSAFE_HINT_1 = 1;     // After 1 miss: gentle bounce
export const FAILSAFE_HINT_2 = 2;     // After 2 misses: glow + bounce
export const FAILSAFE_AUTO = 3;       // After 3 misses: auto-complete

// Element Sizes (in 1920x1080 design space)
export const HUB_ORB_DIAMETER = 240;
export const HUB_ORB_SPACING = 120;
export const TARGET_SIZE = 200;
export const STAR_DOT_DIAMETER = 65;
export const STAR_GLOW_RADIUS = 30;
export const CHARIZARD_HUB_SCALE = 0.72; // 72% of screen height

// Session
export const ACTIVITIES_PER_SESSION = 6;
export const PROMPTS_PER_ROUND = { flameColors: 5, fireballCount: 5, evolutionTower: 5, skyWriter: 4 } as const;

// Font sizes (px at 1080p)
export const FONT = {
  title: 96,
  bannerName: 72,
  bannerRole: 40,
  numberPrompt: 180,
  subtitle: 52,
  settingsText: 28,
} as const;
