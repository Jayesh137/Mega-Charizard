// src/config/theme.ts

export const FONT = "'Fredoka', 'Nunito', sans-serif";

export interface CharacterForm {
  name: string;
  colors: Record<string, string>;
  scale: number;
  eyeStyle: 'cute-round' | 'fierce-narrow' | 'determined' | 'glowing-red';
}

export interface Theme {
  name: string;
  title: string;
  characterName: string;
  forms: CharacterForm[];
  palette: {
    background: { dark: string; mid: string; accent: string; warmGlow: string };
    fire: { core: string; mid: string; outer: string; spark: string };
    ui: {
      bannerOrange: string;
      bannerBlue: string;
      bannerGold: string;
      correct: string;
      incorrect: string;
    };
    celebration: { gold: string; hotOrange: string; cyan: string };
  };
  audio: Record<string, string>;
}

export const theme: Theme = {
  name: 'mega-charizard-x',
  title: 'Mega Charizard Academy',
  characterName: 'Charizard',

  forms: [
    {
      name: 'Charmander',
      colors: { body: '#F08030', belly: '#FCF0DE', flame: '#F15F3E' },
      scale: 0.3,
      eyeStyle: 'cute-round',
    },
    {
      name: 'Charmeleon',
      colors: { body: '#D45137', belly: '#905C42', flame: '#FF6B35' },
      scale: 0.45,
      eyeStyle: 'fierce-narrow',
    },
    {
      name: 'Charizard',
      colors: { body: '#F08030', belly: '#FCC499', wings: '#58A8B8', flame: '#FF4500' },
      scale: 0.65,
      eyeStyle: 'determined',
    },
    {
      name: 'Mega Charizard X',
      colors: {
        body: '#1a1a2e',
        belly: '#91CCEC',
        flames: '#37B1E2',
        eyes: '#ff1a1a',
        hornTips: '#37B1E2',
        wingEdge: '#37B1E2',
      },
      scale: 1.0,
      eyeStyle: 'glowing-red',
    },
  ],

  palette: {
    background: {
      dark: '#0a0a1a',
      mid: '#1a1a3e',
      accent: '#2a1a4e',
      warmGlow: '#F08030',
    },
    fire: { core: '#FFFFFF', mid: '#37B1E2', outer: '#1a5fc4', spark: '#91CCEC' },
    ui: {
      bannerOrange: '#F08030',
      bannerBlue: '#1a3a6e',
      bannerGold: '#FFD700',
      correct: '#33cc33',
      incorrect: '#ff6666',
    },
    celebration: { gold: '#FFD700', hotOrange: '#FF6B35', cyan: '#91CCEC' },
  },

  audio: {
    roarSmall: '/audio/sfx/roar-small.wav',
    roarMedium: '/audio/sfx/roar-medium.wav',
    roarMega: '/audio/sfx/roar-mega.wav',
    fireBreath: '/audio/sfx/fire-breath.wav',
    fireballImpact: '/audio/sfx/fireball-impact.wav',
    flameCrackle: '/audio/sfx/flame-crackle.wav',
    correctChime: '/audio/sfx/correct-chime.wav',
    wrongBonk: '/audio/sfx/wrong-bonk.wav',
    whoosh: '/audio/sfx/whoosh.wav',
    teamFanfare: '/audio/sfx/team-fanfare.wav',
    orbSelect: '/audio/sfx/orb-select.wav',
  },
};
