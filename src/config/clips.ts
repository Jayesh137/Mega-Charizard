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
  // ---------------------------------------------------------------------------
  // Evolution clips (one per transition)
  // ---------------------------------------------------------------------------
  { id: 'evo-charmander-charmeleon', src: './video/evo-charmander-charmeleon.mp4', category: 'evolution', duration: 6, description: 'Charmander evolves into Charmeleon', evolutionStage: 'charmeleon' },
  { id: 'evo-charmeleon-charizard', src: './video/evo-charmeleon-charizard.mp4', category: 'evolution', duration: 6, description: 'Charmeleon evolves into Charizard', evolutionStage: 'charizard' },
  { id: 'evo-mega-evolution', src: './video/evo-mega-charizard-x.mp4', category: 'evolution', duration: 10, description: 'Charizard Mega Evolves into Mega Charizard X', evolutionStage: 'megax' },

  // ---------------------------------------------------------------------------
  // Intro clips (session start, rotated)
  // ---------------------------------------------------------------------------
  { id: 'intro-i-choose-you', src: './video/intro-i-choose-you.mp4', category: 'intro', duration: 4, description: 'Ash throws Pokeball' },
  { id: 'intro-charmander-meet', src: './video/intro-charmander-meet.mp4', category: 'intro', duration: 4, description: 'Charmander first appearance' },
  { id: 'intro-team-ready', src: './video/intro-team-ready.mp4', category: 'intro', duration: 4, description: 'Ash and team ready to go' },
  { id: 'intro-mega-keystone', src: './video/intro-mega-keystone.mp4', category: 'intro', duration: 5, description: 'Alain activates Mega Keystone with Charizard' },
  { id: 'intro-charizard-return', src: './video/intro-charizard-return.mp4', category: 'intro', duration: 4, description: 'Ash calls Charizard back from Charicific Valley' },

  // ---------------------------------------------------------------------------
  // Celebration clips — vast Charizard battle library
  // ---------------------------------------------------------------------------
  // Core attacks
  { id: 'cel-flamethrower', src: './video/cel-flamethrower.mp4', category: 'celebration', duration: 3, description: 'Charizard Flamethrower' },
  { id: 'cel-blast-burn', src: './video/cel-blast-burn.mp4', category: 'celebration', duration: 3, description: 'MCX Blast Burn' },
  { id: 'cel-dragon-claw', src: './video/cel-dragon-claw.mp4', category: 'celebration', duration: 3, description: 'MCX Dragon Claw' },
  { id: 'cel-seismic-toss', src: './video/cel-seismic-toss.mp4', category: 'celebration', duration: 4, description: 'Charizard Seismic Toss' },
  { id: 'cel-blue-aura', src: './video/cel-blue-aura.mp4', category: 'celebration', duration: 3, description: 'MCX blue flame aura ignite' },
  { id: 'cel-fire-spin', src: './video/cel-fire-spin.mp4', category: 'celebration', duration: 3, description: 'Charizard Fire Spin traps opponent' },
  { id: 'cel-dragon-rage', src: './video/cel-dragon-rage.mp4', category: 'celebration', duration: 3, description: 'Charizard Dragon Rage attack' },
  { id: 'cel-overheat', src: './video/cel-overheat.mp4', category: 'celebration', duration: 4, description: 'Charizard Overheat — massive fire pillar' },
  { id: 'cel-thunder-punch', src: './video/cel-thunder-punch.mp4', category: 'celebration', duration: 3, description: 'MCX Thunder Punch' },
  { id: 'cel-wing-attack', src: './video/cel-wing-attack.mp4', category: 'celebration', duration: 3, description: 'Charizard Wing Attack' },
  { id: 'cel-steel-wing', src: './video/cel-steel-wing.mp4', category: 'celebration', duration: 3, description: 'Charizard Steel Wing — shining metallic wings' },
  { id: 'cel-dragon-tail', src: './video/cel-dragon-tail.mp4', category: 'celebration', duration: 3, description: 'MCX Dragon Tail — glowing tail strike' },
  { id: 'cel-flare-blitz', src: './video/cel-flare-blitz.mp4', category: 'celebration', duration: 4, description: 'Charizard Flare Blitz — wreathed in flames' },
  { id: 'cel-air-slash', src: './video/cel-air-slash.mp4', category: 'celebration', duration: 3, description: 'Charizard Air Slash — blade of wind' },

  // Character reactions
  { id: 'cel-ash-fistpump', src: './video/cel-ash-fistpump.mp4', category: 'celebration', duration: 2, description: 'Ash fist pump celebration' },
  { id: 'cel-victory-roar', src: './video/cel-victory-roar.mp4', category: 'celebration', duration: 2, description: 'Charizard victory roar' },
  { id: 'cel-high-five', src: './video/cel-high-five.mp4', category: 'celebration', duration: 3, description: 'Ash and Charizard high five' },
  { id: 'cel-ash-hat-turn', src: './video/cel-ash-hat-turn.mp4', category: 'celebration', duration: 2, description: 'Ash turns his hat backwards — battle mode' },
  { id: 'cel-charizard-proud', src: './video/cel-charizard-proud.mp4', category: 'celebration', duration: 3, description: 'Charizard lands and roars proudly after a win' },
  { id: 'cel-alain-smile', src: './video/cel-alain-smile.mp4', category: 'celebration', duration: 2, description: 'Alain smiles at MCX after a strong attack' },

  // Iconic battles
  { id: 'cel-vs-articuno', src: './video/cel-vs-articuno.mp4', category: 'celebration', duration: 5, description: 'Charizard defeats Articuno at Battle Frontier' },
  { id: 'cel-vs-blastoise', src: './video/cel-vs-blastoise.mp4', category: 'celebration', duration: 5, description: 'Charizard beats Blastoise despite type disadvantage' },
  { id: 'cel-vs-entei', src: './video/cel-vs-entei.mp4', category: 'celebration', duration: 5, description: 'Charizard clashes with Entei in movie 3' },
  { id: 'cel-vs-blaziken', src: './video/cel-vs-blaziken.mp4', category: 'celebration', duration: 5, description: 'Charizard vs Blaziken — fire vs fire' },
  { id: 'cel-vs-dragonite', src: './video/cel-vs-dragonite.mp4', category: 'celebration', duration: 5, description: 'Charizard battles Dragonite at the Dragon Valley' },
  { id: 'cel-vs-magmar', src: './video/cel-vs-magmar.mp4', category: 'celebration', duration: 4, description: 'Charmeleon battles Magmar at the volcano' },
  { id: 'cel-vs-electivire', src: './video/cel-vs-electivire.mp4', category: 'celebration', duration: 5, description: 'MCX Charizard vs Electivire — fire overwhelms electric' },
  { id: 'cel-vs-metagross', src: './video/cel-vs-metagross.mp4', category: 'celebration', duration: 5, description: 'MCX Dragon Claw shatters Metagross Meteor Mash' },
  { id: 'cel-vs-mega-venusaur', src: './video/cel-vs-mega-venusaur.mp4', category: 'celebration', duration: 5, description: 'MCX Blast Burn defeats Mega Venusaur' },
  { id: 'cel-vs-mega-charizard-y', src: './video/cel-vs-mega-charizard-y.mp4', category: 'celebration', duration: 6, description: 'MCX battles Mega Charizard Y — blue vs orange' },
  { id: 'cel-vs-greninja', src: './video/cel-vs-greninja.mp4', category: 'celebration', duration: 6, description: 'MCX Charizard vs Ash-Greninja — Kalos League Finals' },
  { id: 'cel-vs-aegislash', src: './video/cel-vs-aegislash.mp4', category: 'celebration', duration: 4, description: 'MCX shatters Aegislash King Shield' },

  // Power-ups and transformations
  { id: 'cel-mega-evolution', src: './video/cel-mega-evolution.mp4', category: 'celebration', duration: 5, description: 'Alain Mega Evolves Charizard into MCX' },
  { id: 'cel-gigantamax', src: './video/cel-gigantamax.mp4', category: 'celebration', duration: 5, description: 'Leon Gigantamax Charizard power-up' },
  { id: 'cel-gmax-wildfire', src: './video/cel-gmax-wildfire.mp4', category: 'celebration', duration: 5, description: 'G-Max Wildfire — stadium-engulfing flames' },
  { id: 'cel-z-move-inferno', src: './video/cel-z-move-inferno.mp4', category: 'celebration', duration: 6, description: 'Charizard Z-Move Inferno Overdrive' },
  { id: 'cel-tera-charizard', src: './video/cel-tera-charizard.mp4', category: 'celebration', duration: 4, description: 'Terastal Charizard — crystal flame aura' },

  // Training and power moments
  { id: 'cel-training-montage', src: './video/cel-training-montage.mp4', category: 'celebration', duration: 4, description: 'Charizard training montage at Charicific Valley' },
  { id: 'cel-charicific-valley', src: './video/cel-charicific-valley.mp4', category: 'celebration', duration: 4, description: 'Charizard trains with wild Charizards at the Valley' },
  { id: 'cel-blue-flame-first', src: './video/cel-blue-flame-first.mp4', category: 'celebration', duration: 4, description: 'MCX fires blue Flamethrower for the first time' },

  // ---------------------------------------------------------------------------
  // Calm/transition clips
  // ---------------------------------------------------------------------------
  { id: 'calm-flying-sunset', src: './video/calm-flying-sunset.mp4', category: 'calm', duration: 7, description: 'Charizard flying at sunset' },
  { id: 'calm-riding', src: './video/calm-riding.mp4', category: 'calm', duration: 7, description: 'Ash riding Charizard through clouds' },
  { id: 'calm-campfire', src: './video/calm-campfire.mp4', category: 'calm', duration: 7, description: 'Charmander by campfire' },
  { id: 'calm-sleeping', src: './video/calm-sleeping.mp4', category: 'calm', duration: 6, description: 'Charizard sleeping peacefully' },
  { id: 'calm-stargazing', src: './video/calm-stargazing.mp4', category: 'calm', duration: 7, description: 'Ash and Charizard stargazing' },
  { id: 'calm-charmander-rain', src: './video/calm-charmander-rain.mp4', category: 'calm', duration: 7, description: 'Ash rescues Charmander from the rain' },
  { id: 'calm-charicific-rest', src: './video/calm-charicific-rest.mp4', category: 'calm', duration: 7, description: 'Charizard resting in Charicific Valley' },
  { id: 'calm-flying-ocean', src: './video/calm-flying-ocean.mp4', category: 'calm', duration: 7, description: 'Charizard soaring over ocean waves at dawn' },
  { id: 'calm-tail-flame', src: './video/calm-tail-flame.mp4', category: 'calm', duration: 6, description: 'Close-up of Charmander tail flame glowing gently' },
  { id: 'calm-ash-petting', src: './video/calm-ash-petting.mp4', category: 'calm', duration: 6, description: 'Ash petting Charizard — nuzzle moment' },
  { id: 'calm-pikachu-nap', src: './video/calm-pikachu-nap.mp4', category: 'calm', duration: 6, description: 'Pikachu napping on Charizard back' },
  { id: 'calm-moonlit-flight', src: './video/calm-moonlit-flight.mp4', category: 'calm', duration: 7, description: 'Charizard flying under moonlight' },

  // ---------------------------------------------------------------------------
  // Encouragement clips (wrong answer, gentle)
  // ---------------------------------------------------------------------------
  { id: 'enc-determined', src: './video/enc-determined.mp4', category: 'encouragement', duration: 2, description: 'Ash determined face' },
  { id: 'enc-shake-off', src: './video/enc-shake-off.mp4', category: 'encouragement', duration: 3, description: 'Charizard shakes it off' },
  { id: 'enc-encouraging', src: './video/enc-encouraging.mp4', category: 'encouragement', duration: 2, description: 'Ash warm encouragement' },
  { id: 'enc-charizard-loyalty', src: './video/enc-charizard-loyalty.mp4', category: 'encouragement', duration: 4, description: 'Charizard swoops in to save Ash' },
  { id: 'enc-reunion', src: './video/enc-reunion.mp4', category: 'encouragement', duration: 4, description: 'Ash and Charizard reunion hug' },
  { id: 'enc-gets-up', src: './video/enc-gets-up.mp4', category: 'encouragement', duration: 3, description: 'Charizard gets back up after a hard hit' },
  { id: 'enc-never-give-up', src: './video/enc-never-give-up.mp4', category: 'encouragement', duration: 3, description: 'Ash says never give up' },
  { id: 'enc-pikachu-cheer', src: './video/enc-pikachu-cheer.mp4', category: 'encouragement', duration: 3, description: 'Pikachu cheering from the sidelines' },

  // ---------------------------------------------------------------------------
  // Finale clips
  // ---------------------------------------------------------------------------
  { id: 'fin-blast-burn', src: './video/fin-blast-burn.mp4', category: 'finale', duration: 8, description: 'MCX ultimate Blast Burn' },
  { id: 'fin-victory-lap', src: './video/fin-victory-lap.mp4', category: 'finale', duration: 8, description: 'Victory celebration montage' },
  { id: 'fin-world-champion', src: './video/fin-world-champion.mp4', category: 'finale', duration: 8, description: 'Ash becomes World Champion' },
  { id: 'fin-team-group', src: './video/fin-team-group.mp4', category: 'finale', duration: 8, description: 'Ash and full team group celebration' },
  { id: 'fin-fireworks-stadium', src: './video/fin-fireworks-stadium.mp4', category: 'finale', duration: 8, description: 'Stadium fireworks after championship win' },

  // ---------------------------------------------------------------------------
  // Fun/bonus clips (variety, comic relief)
  // ---------------------------------------------------------------------------
  { id: 'fun-pikachu-thunderbolt', src: './video/fun-pikachu-thunderbolt.mp4', category: 'fun', duration: 3, description: 'Pikachu Thunderbolt attack' },
  { id: 'fun-team-rocket-blastoff', src: './video/fun-team-rocket-blastoff.mp4', category: 'fun', duration: 4, description: 'Team Rocket blasting off again' },
  { id: 'fun-pikachu-ketchup', src: './video/fun-pikachu-ketchup.mp4', category: 'fun', duration: 4, description: 'Pikachu hugging ketchup bottle' },
  { id: 'fun-squirtle-squad', src: './video/fun-squirtle-squad.mp4', category: 'fun', duration: 4, description: 'Squirtle Squad with sunglasses' },
  { id: 'fun-pokemon-fireworks', src: './video/fun-pokemon-fireworks.mp4', category: 'fun', duration: 5, description: 'Pokemon celebration fireworks' },
  { id: 'fun-charmander-hot-dog', src: './video/fun-charmander-hot-dog.mp4', category: 'fun', duration: 3, description: 'Charmander lights campfire for hot dogs' },
  { id: 'fun-charizard-disobey', src: './video/fun-charizard-disobey.mp4', category: 'fun', duration: 4, description: 'Classic Charizard ignores Ash and naps' },
  { id: 'fun-jigglypuff-marker', src: './video/fun-jigglypuff-marker.mp4', category: 'fun', duration: 4, description: 'Jigglypuff draws on everyone with marker' },
  { id: 'fun-psyduck-confusion', src: './video/fun-psyduck-confusion.mp4', category: 'fun', duration: 3, description: 'Psyduck confused headache' },
  { id: 'fun-meowth-balloon', src: './video/fun-meowth-balloon.mp4', category: 'fun', duration: 4, description: 'Meowth in Team Rocket hot air balloon' },
  { id: 'fun-bulbasaur-garden', src: './video/fun-bulbasaur-garden.mp4', category: 'fun', duration: 5, description: 'Bulbasaur tending the garden with Vine Whip' },
  { id: 'fun-togepi-metronome', src: './video/fun-togepi-metronome.mp4', category: 'fun', duration: 4, description: 'Togepi uses Metronome — surprise result' },
  { id: 'fun-ash-badge-win', src: './video/fun-ash-badge-win.mp4', category: 'fun', duration: 4, description: 'Ash celebrates winning a gym badge' },
];
