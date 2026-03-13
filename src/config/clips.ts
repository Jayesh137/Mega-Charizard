export type ClipCategory = 'intro' | 'evolution' | 'celebration' | 'calm' | 'encouragement' | 'finale' | 'fun';

export interface ClipDef {
  id: string;
  src: string;
  category: ClipCategory;
  duration: number;       // seconds
  description: string;
  evolutionStage?: string; // for evolution clips: which transition
}

export const CLIPS: ClipDef[] = [
  // Evolution clips (one per transition)
  { id: 'evo-charmander-charmeleon', src: './video/evo-charmander-charmeleon.mp4', category: 'evolution', duration: 6, description: 'Charmander evolves into Charmeleon', evolutionStage: 'charmeleon' },
  { id: 'evo-charmeleon-charizard', src: './video/evo-charmeleon-charizard.mp4', category: 'evolution', duration: 6, description: 'Charmeleon evolves into Charizard', evolutionStage: 'charizard' },
  { id: 'evo-mega-evolution', src: './video/evo-mega-charizard-x.mp4', category: 'evolution', duration: 10, description: 'Charizard Mega Evolves into Mega Charizard X', evolutionStage: 'megax' },

  // Intro clips (session start, rotated)
  { id: 'intro-i-choose-you', src: './video/intro-i-choose-you.mp4', category: 'intro', duration: 4, description: 'Ash throws Pokeball' },
  { id: 'intro-charmander-meet', src: './video/intro-charmander-meet.mp4', category: 'intro', duration: 4, description: 'Charmander first appearance' },
  { id: 'intro-team-ready', src: './video/intro-team-ready.mp4', category: 'intro', duration: 4, description: 'Ash and team ready to go' },

  // Celebration clips (correct answers, random)
  { id: 'cel-flamethrower', src: './video/cel-flamethrower.mp4', category: 'celebration', duration: 3, description: 'Charizard Flamethrower' },
  { id: 'cel-blast-burn', src: './video/cel-blast-burn.mp4', category: 'celebration', duration: 3, description: 'MCX Blast Burn' },
  { id: 'cel-ash-fistpump', src: './video/cel-ash-fistpump.mp4', category: 'celebration', duration: 2, description: 'Ash fist pump celebration' },
  { id: 'cel-victory-roar', src: './video/cel-victory-roar.mp4', category: 'celebration', duration: 2, description: 'Charizard victory roar' },
  { id: 'cel-dragon-claw', src: './video/cel-dragon-claw.mp4', category: 'celebration', duration: 3, description: 'MCX Dragon Claw' },
  { id: 'cel-seismic-toss', src: './video/cel-seismic-toss.mp4', category: 'celebration', duration: 4, description: 'Charizard Seismic Toss' },
  { id: 'cel-blue-aura', src: './video/cel-blue-aura.mp4', category: 'celebration', duration: 3, description: 'MCX blue flame aura ignite' },
  { id: 'cel-high-five', src: './video/cel-high-five.mp4', category: 'celebration', duration: 3, description: 'Ash and Charizard high five' },
  { id: 'cel-vs-articuno', src: './video/cel-vs-articuno.mp4', category: 'celebration', duration: 5, description: 'Charizard defeats Articuno at Battle Frontier' },
  { id: 'cel-vs-blastoise', src: './video/cel-vs-blastoise.mp4', category: 'celebration', duration: 5, description: 'Charizard beats Blastoise despite type disadvantage' },
  { id: 'cel-mega-evolution', src: './video/cel-mega-evolution.mp4', category: 'celebration', duration: 5, description: 'Alain Mega Evolves Charizard into MCX' },
  { id: 'cel-gigantamax', src: './video/cel-gigantamax.mp4', category: 'celebration', duration: 5, description: 'Leon Gigantamax Charizard power-up' },

  // Calm/transition clips
  { id: 'calm-flying-sunset', src: './video/calm-flying-sunset.mp4', category: 'calm', duration: 7, description: 'Charizard flying at sunset' },
  { id: 'calm-riding', src: './video/calm-riding.mp4', category: 'calm', duration: 7, description: 'Ash riding Charizard through clouds' },
  { id: 'calm-campfire', src: './video/calm-campfire.mp4', category: 'calm', duration: 7, description: 'Charmander by campfire' },
  { id: 'calm-sleeping', src: './video/calm-sleeping.mp4', category: 'calm', duration: 6, description: 'Charizard sleeping peacefully' },
  { id: 'calm-stargazing', src: './video/calm-stargazing.mp4', category: 'calm', duration: 7, description: 'Ash and Charizard stargazing' },
  { id: 'calm-charmander-rain', src: './video/calm-charmander-rain.mp4', category: 'calm', duration: 7, description: 'Ash rescues Charmander from the rain' },

  // Encouragement clips (wrong answer, gentle)
  { id: 'enc-determined', src: './video/enc-determined.mp4', category: 'encouragement', duration: 2, description: 'Ash determined face' },
  { id: 'enc-shake-off', src: './video/enc-shake-off.mp4', category: 'encouragement', duration: 3, description: 'Charizard shakes it off' },
  { id: 'enc-encouraging', src: './video/enc-encouraging.mp4', category: 'encouragement', duration: 2, description: 'Ash warm encouragement' },
  { id: 'enc-charizard-loyalty', src: './video/enc-charizard-loyalty.mp4', category: 'encouragement', duration: 4, description: 'Charizard swoops in to save Ash' },
  { id: 'enc-reunion', src: './video/enc-reunion.mp4', category: 'encouragement', duration: 4, description: 'Ash and Charizard reunion hug' },

  // Finale clips
  { id: 'fin-blast-burn', src: './video/fin-blast-burn.mp4', category: 'finale', duration: 8, description: 'MCX ultimate Blast Burn' },
  { id: 'fin-victory-lap', src: './video/fin-victory-lap.mp4', category: 'finale', duration: 8, description: 'Victory celebration montage' },
  { id: 'fin-world-champion', src: './video/fin-world-champion.mp4', category: 'finale', duration: 8, description: 'Ash becomes World Champion' },

  // Fun/Pikachu clips (bonus variety)
  { id: 'fun-pikachu-thunderbolt', src: './video/fun-pikachu-thunderbolt.mp4', category: 'fun', duration: 3, description: 'Pikachu Thunderbolt attack' },
  { id: 'fun-team-rocket-blastoff', src: './video/fun-team-rocket-blastoff.mp4', category: 'fun', duration: 4, description: 'Team Rocket blasting off again' },
  { id: 'fun-pikachu-ketchup', src: './video/fun-pikachu-ketchup.mp4', category: 'fun', duration: 4, description: 'Pikachu hugging ketchup bottle' },
  { id: 'fun-squirtle-squad', src: './video/fun-squirtle-squad.mp4', category: 'fun', duration: 4, description: 'Squirtle Squad with sunglasses' },
  { id: 'fun-pokemon-fireworks', src: './video/fun-pokemon-fireworks.mp4', category: 'fun', duration: 5, description: 'Pokemon celebration fireworks' },
];
