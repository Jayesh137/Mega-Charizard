# Video Clip Sourcing Guide

All 24 anime clips needed for Mega Charizard Academy v4, organized by category.
Each clip is a short (2-10 second) excerpt from the Pokémon anime featuring Ash and Charizard.

## Quick Start

1. Source raw clips (see descriptions below)
2. Name them to match the IDs below (e.g., `evo-charmander-charmeleon.mp4`)
3. Put raw clips in a folder (e.g., `raw-clips/`)
4. Run the processing script:
   ```bash
   ./scripts/process-video-clips.sh raw-clips/
   ```
5. Processed clips will appear in `public/video/`

## Clip Specifications

| Property | Value |
|----------|-------|
| Format | MP4 (H.264) |
| Max width | 720p |
| Audio | None (stripped) |
| Max size | 2MB per clip |
| Container | faststart for web streaming |

## Evolution Clips (3 clips)

These play at evolution thresholds (33%, 66%, 100% of the evolution meter).

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `evo-charmander-charmeleon` | 6s | Charmander glows and evolves into Charmeleon | EP043 "The March of the Exeggutor Squad" |
| `evo-charmeleon-charizard` | 6s | Charmeleon evolves into Charizard mid-battle | EP046 "Attack of the Prehistoric Pokémon" |
| `evo-mega-charizard-x` | 10s | Charizard Mega Evolves into Mega Charizard X with blue flames | XY&Z anime, Mega Evolution specials |

**What to capture:** The white evolution glow, the silhouette transformation, the reveal of the new form.

## Intro Clips (3 clips)

Shown at session start, rotated each time.

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `intro-i-choose-you` | 4s | Ash throws a Pokéball with determination | Any iconic Pokéball throw scene |
| `intro-charmander-meet` | 4s | Charmander's first appearance/meeting Ash | EP011 "Charmander – The Stray Pokémon" |
| `intro-team-ready` | 4s | Ash and team ready for adventure | Opening sequence or rally moment |

## Celebration Clips (8 clips)

Play on correct answers. Picked randomly (smart rotation, no repeats).

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `cel-flamethrower` | 3s | Charizard uses Flamethrower (big fire blast) | Any battle scene with Flamethrower |
| `cel-blast-burn` | 3s | Mega Charizard X uses Blast Burn | XY&Z Mega Evolution specials |
| `cel-ash-fistpump` | 2s | Ash does his signature fist pump | Post-victory celebration scenes |
| `cel-victory-roar` | 2s | Charizard roars triumphantly | Battle victory moments |
| `cel-dragon-claw` | 3s | MCX uses Dragon Claw (blue energy claws) | XY&Z battle scenes |
| `cel-seismic-toss` | 4s | Charizard grabs opponent, flies up, throws down | Classic Seismic Toss animation |
| `cel-blue-aura` | 3s | MCX ignites blue flame aura | Mega Evolution activation scenes |
| `cel-high-five` | 3s | Ash and Charizard high-five or fist-bump | Any trainer-Pokémon bonding moment |

## Calm/Transition Clips (5 clips)

Play during calm reset between games. Slower, peaceful moments.

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `calm-flying-sunset` | 7s | Charizard flying across a sunset sky | Aerial scenes, movie moments |
| `calm-riding` | 7s | Ash riding Charizard through clouds | EP134 or movie flight scenes |
| `calm-campfire` | 7s | Charmander's tail flame by a campfire | EP011 or campfire scenes |
| `calm-sleeping` | 6s | Charizard sleeping peacefully | Charicific Valley episodes |
| `calm-stargazing` | 7s | Ash and Charizard looking at stars | Quiet evening scenes |

## Encouragement Clips (3 clips)

Play on wrong answers — gentle, supportive.

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `enc-determined` | 2s | Ash's determined face close-up | Pre-battle determination scenes |
| `enc-shake-off` | 3s | Charizard shakes off a hit, stands back up | Mid-battle recovery moments |
| `enc-encouraging` | 2s | Ash encouraging Charizard warmly | Trainer-Pokémon trust scenes |

## Finale Clips (2 clips)

Play at session end when all games are complete.

| ID | Duration | Description | Source Episodes |
|----|----------|-------------|-----------------|
| `fin-blast-burn` | 8s | MCX unleashes ultimate Blast Burn attack | Climactic battle scenes |
| `fin-victory-lap` | 8s | Victory celebration montage | Post-championship celebrations |

## Tips for Sourcing

### Where to Find Clips
- Search YouTube for specific episode names + "evolution scene" / "battle scene"
- Pokémon anime compilations (e.g., "all Charizard battles")
- Mega Evolution special episodes (I-IV) for MCX content

### Tools for Downloading
- **yt-dlp**: `yt-dlp -f "best[height<=720]" <url>`
- **Screen recording**: OBS Studio for capturing specific moments

### Trimming Tips
- Use the processing script — it handles trim, resize, and encoding
- If you need precise trims, use ffmpeg directly:
  ```bash
  ffmpeg -ss 1:23.5 -i source.mp4 -t 6 -c copy raw-clips/evo-charmander-charmeleon.mp4
  ```
- The `-ss` flag is the start time, `-t` is the duration

### Alternative: AI-Generated Clips
If anime clips aren't available, consider:
- **Stable Diffusion Video**: Generate short anime-style clips
- **Runway Gen-3**: AI video generation with style transfer
- **Static images with Ken Burns**: Use still frames with pan/zoom effects via ffmpeg:
  ```bash
  ffmpeg -loop 1 -i image.jpg -c:v libx264 -t 4 \
    -vf "scale=720:-2,zoompan=z='min(zoom+0.002,1.3)':d=100:s=720x480" \
    output.mp4
  ```
