#!/bin/bash
# Mega Charizard Academy — Video Clip Downloader
#
# This script downloads Pokemon anime clips for the game.
# Requirements: yt-dlp, ffmpeg
#
# USAGE:
#   1. Find each YouTube video using the search terms provided
#   2. Replace URL_HERE with the actual URL
#   3. Adjust timestamps (START-END) to capture the best moment
#   4. Uncomment the download_clip line
#   5. Run: bash scripts/download-clips.sh
#
# INSTALL DEPENDENCIES:
#   pip install yt-dlp            (or: brew install yt-dlp)
#   sudo apt install ffmpeg       (Linux)
#   brew install ffmpeg            (Mac)
#   choco install ffmpeg           (Windows/WSL)
#
# TIPS:
#   - Keep clips SHORT (2-10 seconds). Kids lose interest fast.
#   - 720p is plenty — files stay small, loads fast.
#   - Use --download-sections timestamps like "0:30-0:37" (mm:ss).
#   - The script skips clips that already exist in public/video/.
#   - Clips are re-encoded to 720p H.264, audio stripped, web-optimized.

set -euo pipefail

# ── Dependency check ─────────────────────────────────────────────

check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: $1 is not installed."
    echo ""
    case "$1" in
      yt-dlp)
        echo "Install yt-dlp:"
        echo "  pip install yt-dlp"
        echo "  brew install yt-dlp         (Mac)"
        echo "  sudo apt install yt-dlp     (Linux, may need PPA)"
        echo "  winget install yt-dlp       (Windows)"
        ;;
      ffmpeg)
        echo "Install ffmpeg:"
        echo "  sudo apt install ffmpeg     (Linux)"
        echo "  brew install ffmpeg         (Mac)"
        echo "  choco install ffmpeg        (Windows)"
        echo "  winget install ffmpeg       (Windows)"
        ;;
    esac
    exit 1
  fi
}

check_dep yt-dlp
check_dep ffmpeg

echo "Dependencies OK: yt-dlp $(yt-dlp --version 2>/dev/null || echo '?'), ffmpeg found."

# ── Output directory ─────────────────────────────────────────────

OUTDIR="public/video"
TEMP_DIR="/tmp/mcx-clip-tmp"
mkdir -p "$OUTDIR" "$TEMP_DIR"

# ── Download + encode helper ─────────────────────────────────────
#
# Downloads a clip segment, strips audio, re-encodes to 720p H.264,
# and outputs a web-optimized MP4.

download_clip() {
  local name="$1"
  local url="$2"
  local start="$3"
  local end="$4"

  if [ -f "$OUTDIR/$name" ] && [ -s "$OUTDIR/$name" ]; then
    echo "  SKIP: $name (already exists)"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  echo ""
  echo "  Downloading: $name"
  echo "    Source: $url"
  echo "    Range: $start -> $end"

  local tmpfile="$TEMP_DIR/${name%.mp4}_raw.mp4"

  # Download the segment
  if yt-dlp "$url" \
    --download-sections "*${start}-${end}" \
    -f "best[height<=720]/best" \
    --force-keyframes-at-cuts \
    --no-playlist \
    --quiet --no-warnings \
    -o "$tmpfile" 2>/dev/null; then

    # Re-encode: strip audio, 720p max, H.264, web-optimized
    if ffmpeg -y -i "$tmpfile" \
      -an \
      -c:v libx264 \
      -crf 28 \
      -preset medium \
      -vf "scale='min(720,iw)':-2" \
      -movflags +faststart \
      -pix_fmt yuv420p \
      "$OUTDIR/$name" \
      2>/dev/null; then

      local size
      size=$(stat -c%s "$OUTDIR/$name" 2>/dev/null || stat -f%z "$OUTDIR/$name" 2>/dev/null || echo 0)
      echo "    Done: $name ($(( size / 1024 ))KB)"
      DOWNLOADED=$((DOWNLOADED + 1))
    else
      echo "    FAIL: $name (ffmpeg encode failed)"
      FAILED=$((FAILED + 1))
    fi

    rm -f "$tmpfile"
  else
    echo "    FAIL: $name (download failed — check URL and timestamps)"
    FAILED=$((FAILED + 1))
  fi
}

# ── Counters ─────────────────────────────────────────────────────

TOTAL=0
DOWNLOADED=0
SKIPPED=0
FAILED=0
COMMENTED=0

count_clip() {
  TOTAL=$((TOTAL + 1))
}

count_commented() {
  TOTAL=$((TOTAL + 1))
  COMMENTED=$((COMMENTED + 1))
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Mega Charizard Academy — Video Clip Downloader"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ═════════════════════════════════════════════════════════════════
#  EVOLUTION CLIPS (3)
#  Played automatically when the evolution meter hits thresholds.
#  Keep these 5-10 seconds — they're special moments.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== EVOLUTION CLIPS ==="

# Search: "Charmander evolves Charmeleon anime"
# Best source: Pokemon Indigo League EP046 "Attack of the Prehistoric Pokemon"
# Also try: "Ash and Charizard Learn to Work Together" compilation — has evolution flashbacks
# download_clip "evo-charmander-charmeleon.mp4" "URL_HERE" "0:30" "0:37"
count_commented

# Search: "Charmeleon evolves Charizard anime"
# Best source: Pokemon Indigo League EP046 "Attack of the Prehistoric Pokemon"
# Also try: same compilation as above, different timestamp
# download_clip "evo-charmeleon-charizard.mp4" "URL_HERE" "0:30" "0:37"
count_commented

# Search: "Pokemon Origins Mega Charizard X transformation"
# Best source: Pokemon Origins EP04 — Red vs Mewtwo Mega Evolution
# Also try: "Mega Charizard Battle MCX vs MCY Kalos League"
# download_clip "evo-mega-charizard-x.mp4" "URL_HERE" "0:00" "0:10"
count_commented

# ═════════════════════════════════════════════════════════════════
#  CELEBRATION / BATTLE CLIPS (12)
#  Played on correct answers. Keep 2-5 seconds — punchy and exciting.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== CELEBRATION CLIPS ==="

# Search: "Charizard Seismic Toss Magmar Volcanic Panic"
# Best source: Indigo League EP059 "Volcanic Panic" — iconic spinning Seismic Toss
# download_clip "cel-seismic-toss.mp4" "URL_HERE" "0:15" "0:19"
count_commented

# Search: "Charizard Flamethrower anime"
# Best source: Charizard vs Magmar — big Flamethrower blast
# download_clip "cel-flamethrower.mp4" "URL_HERE" "0:05" "0:08"
count_commented

# Search: "Charizard Blast Burn anime attack"
# Best source: Ash-Greninja vs MCX — Blast Burn finishing move
# download_clip "cel-blast-burn.mp4" "URL_HERE" "0:10" "0:13"
count_commented

# Search: "Charizard victory roar Flamethrower sky"
# Best source: Post-battle victory roar (Charizard vs Poliwrath, etc.)
# download_clip "cel-victory-roar.mp4" "URL_HERE" "0:02" "0:04"
count_commented

# Search: "Charizard Dragon Claw attack anime"
# Best source: Mega Charizard X Dragon Claw in XY anime / Kalos League
# download_clip "cel-dragon-claw.mp4" "URL_HERE" "0:08" "0:11"
count_commented

# Search: "Mega Charizard X blue flames anime"
# Best source: Alain's MCX powering up with blue flame aura
# download_clip "cel-blue-aura.mp4" "URL_HERE" "0:03" "0:06"
count_commented

# Search: "Ash Ketchum fist pump victory anime"
# Best source: Classic Ash celebration pose after winning a battle
# download_clip "cel-ash-fistpump.mp4" "URL_HERE" "0:01" "0:03"
count_commented

# Search: "Ash Pikachu high five celebration"
# Best source: Ash and Pikachu celebrating a gym victory
# Also try: Dragonite vs Charizard BW — Ash-Charizard reunion bonding
# download_clip "cel-high-five.mp4" "URL_HERE" "0:02" "0:05"
count_commented

# Search: "Charizard defeats Articuno Battle Frontier"
# Best source: AG EP189 — Charizard vs Articuno at Battle Factory
# A legendary win — great for rewarding streaks
# download_clip "cel-vs-articuno.mp4" "URL_HERE" "0:10" "0:15"
count_commented

# Search: "Charizard vs Blastoise Can't Beat the Heat"
# Best source: Johto League EP271 "Can't Beat the Heat" — type disadvantage win!
# download_clip "cel-vs-blastoise.mp4" "URL_HERE" "0:08" "0:13"
count_commented

# Search: "Alain Mega Charizard X transformation"
# Best source: XY anime — Alain activating Mega Evolution for Charizard
# download_clip "cel-mega-evolution.mp4" "URL_HERE" "0:05" "0:10"
count_commented

# Search: "Leon Gigantamax Charizard anime"
# Best source: Pokemon Journeys — Leon's Gigantamax Charizard power-up
# download_clip "cel-gigantamax.mp4" "URL_HERE" "0:04" "0:09"
count_commented

# ═════════════════════════════════════════════════════════════════
#  CALM / RELAXATION CLIPS (6)
#  Played during calm-reset screen. Longer is fine: 5-8 seconds.
#  These should feel peaceful, warm, and cozy.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== CALM CLIPS ==="

# Search: "Pokemon campfire night anime calm"
# Best source: Ash and friends sitting around a campfire at night
# Also try: "Charmander joins Ash" — campfire/rain scene
# download_clip "calm-campfire.mp4" "URL_HERE" "0:02" "0:09"
count_commented

# Search: "Charizard flying sunset anime"
# Best source: Charizard soaring through sunset / golden sky
# Also try: "Ash and Charizard" compilation — flying scenes in latter portion
# download_clip "calm-flying-sunset.mp4" "URL_HERE" "0:05" "0:12"
count_commented

# Search: "Charizard sleeping anime peaceful"
# Best source: Charizard napping in the Charicific Valley
# Also try: Ash caring for frozen Charizard (resting scene)
# download_clip "calm-sleeping.mp4" "URL_HERE" "0:03" "0:09"
count_commented

# Search: "Ash Pokemon stargazing night anime"
# Best source: Ash lying in grass looking at stars with Pokemon
# download_clip "calm-stargazing.mp4" "URL_HERE" "0:10" "0:17"
count_commented

# Search: "Ash riding Charizard flying anime"
# Best source: Ash on Charizard's back flying through clouds
# download_clip "calm-riding.mp4" "URL_HERE" "0:04" "0:11"
count_commented

# Search: "Charmander rain rescue anime EP011"
# Best source: Indigo League EP011 — Ash covering Charmander from rain
# Pick the RESCUE moment (Ash shielding Charmander), not the sad part
# download_clip "calm-charmander-rain.mp4" "URL_HERE" "0:15" "0:22"
count_commented

# ═════════════════════════════════════════════════════════════════
#  ENCOURAGEMENT CLIPS (5)
#  Played on wrong answers. Keep gentle and motivating: 2-4 seconds.
#  Should feel like "it's okay, try again!" — NOT "you failed."
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== ENCOURAGEMENT CLIPS ==="

# Search: "Ash determined face anime never give up"
# Best source: Close-up of Ash looking determined mid-battle
# download_clip "enc-determined.mp4" "URL_HERE" "0:01" "0:03"
count_commented

# Search: "Ash encouraging Pokemon anime believe"
# Best source: Ash calling encouragement to his Pokemon during battle
# download_clip "enc-encouraging.mp4" "URL_HERE" "0:02" "0:04"
count_commented

# Search: "Charizard shakes off attack anime"
# Best source: Charizard getting hit then standing back up
# Also try: "Charizard vs Articuno" — shakes off ice, gets back up
# download_clip "enc-shake-off.mp4" "URL_HERE" "0:03" "0:06"
count_commented

# Search: "Charizard saves Ash anime loyalty"
# Best source: Charizard swooping in to save Ash (Movie or series)
# Great "I've got your back" energy
# download_clip "enc-charizard-loyalty.mp4" "URL_HERE" "0:05" "0:09"
count_commented

# Search: "Ash Charizard reunion hug BW116"
# Best source: BW EP116 — Ash reunites with Charizard, emotional moment
# Warm and encouraging — "we're a team"
# download_clip "enc-reunion.mp4" "URL_HERE" "0:08" "0:12"
count_commented

# ═════════════════════════════════════════════════════════════════
#  INTRO CLIPS (3)
#  Played at session start. Should feel like "let's go!" — 3-5 sec.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== INTRO CLIPS ==="

# Search: "Ash I choose you Charizard anime"
# Best source: Ash throwing Pokeball and Charizard appearing
# download_clip "intro-i-choose-you.mp4" "URL_HERE" "0:02" "0:06"
count_commented

# Search: "Ash meets Charmander first time anime"
# Best source: Indigo League EP011 — Ash first sees Charmander
# download_clip "intro-charmander-meet.mp4" "URL_HERE" "0:05" "0:09"
count_commented

# Search: "Ash Pikachu Charizard team ready anime"
# Best source: Ash with his team lined up, ready for battle
# download_clip "intro-team-ready.mp4" "URL_HERE" "0:03" "0:07"
count_commented

# ═════════════════════════════════════════════════════════════════
#  FINALE CLIPS (3)
#  Played at session end. Can be longer: 6-10 seconds.
#  These should feel EPIC and rewarding.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== FINALE CLIPS ==="

# Search: "Charizard ultimate attack anime"
# Best source: MCX or Charizard delivering a massive finishing move
# Also try: "Ash-Greninja vs MCX" — ultimate Blast Burn climax
# download_clip "fin-blast-burn.mp4" "URL_HERE" "0:05" "0:13"
count_commented

# Search: "Ash wins Pokemon League celebration"
# Best source: Ash winning Alola League / Manalo Conference
# Also try: "Ash and Charizard" compilation — victory/bond payoff at end
# download_clip "fin-victory-lap.mp4" "URL_HERE" "0:10" "0:18"
count_commented

# Search: "Ash becomes World Champion celebration"
# Best source: Pokemon Journeys EP132 — Ash defeats Leon
# The ultimate victory moment — perfect for finale
# download_clip "fin-world-champion.mp4" "URL_HERE" "0:15" "0:23"
count_commented

# ═════════════════════════════════════════════════════════════════
#  FUN / PIKACHU CLIPS (5)
#  Bonus clips for variety. Used as celebration alternatives.
#  Should be funny, cute, or exciting — 2-5 seconds.
# ═════════════════════════════════════════════════════════════════

echo ""
echo "=== FUN CLIPS ==="

# Search: "Pikachu Thunderbolt attack anime"
# Best source: Pikachu firing a big Thunderbolt in battle
# download_clip "fun-pikachu-thunderbolt.mp4" "URL_HERE" "0:03" "0:06"
count_commented

# Search: "Team Rocket blasting off again anime"
# Best source: Classic Team Rocket launch into the sky with star twinkle
# Kids LOVE this one — guaranteed laughs
# download_clip "fun-team-rocket-blastoff.mp4" "URL_HERE" "0:02" "0:06"
count_commented

# Search: "Pikachu ketchup bottle anime"
# Best source: Pikachu hugging/loving a ketchup bottle (iconic!)
# download_clip "fun-pikachu-ketchup.mp4" "URL_HERE" "0:04" "0:08"
count_commented

# Search: "Squirtle Squad sunglasses anime"
# Best source: Squirtle Squad leader posing with sunglasses
# download_clip "fun-squirtle-squad.mp4" "URL_HERE" "0:01" "0:05"
count_commented

# Search: "All Pokemon celebration fireworks anime"
# Best source: Pokemon festival or celebration scene with fireworks
# download_clip "fun-pokemon-fireworks.mp4" "URL_HERE" "0:05" "0:10"
count_commented

# ═════════════════════════════════════════════════════════════════
#  SUMMARY
# ═════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Download complete!"
echo "  Total clips defined:   $TOTAL"
echo "  Downloaded this run:   $DOWNLOADED"
echo "  Already existed:       $SKIPPED"
echo "  Failed:                $FAILED"
echo "  Still commented out:   $COMMENTED"
echo "  Output dir:            $OUTDIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Completeness check
echo ""
echo "Checking for all expected clips..."
EXPECTED=(
  evo-charmander-charmeleon evo-charmeleon-charizard evo-mega-charizard-x
  intro-i-choose-you intro-charmander-meet intro-team-ready
  cel-flamethrower cel-blast-burn cel-ash-fistpump cel-victory-roar
  cel-dragon-claw cel-seismic-toss cel-blue-aura cel-high-five
  cel-vs-articuno cel-vs-blastoise cel-mega-evolution cel-gigantamax
  calm-flying-sunset calm-riding calm-campfire calm-sleeping calm-stargazing
  calm-charmander-rain
  enc-determined enc-shake-off enc-encouraging enc-charizard-loyalty enc-reunion
  fin-blast-burn fin-victory-lap fin-world-champion
  fun-pikachu-thunderbolt fun-team-rocket-blastoff fun-pikachu-ketchup
  fun-squirtle-squad fun-pokemon-fireworks
)

MISSING=0
PRESENT=0
for name in "${EXPECTED[@]}"; do
  if [ -f "$OUTDIR/${name}.mp4" ] && [ -s "$OUTDIR/${name}.mp4" ]; then
    PRESENT=$((PRESENT + 1))
  else
    echo "  MISSING: ${name}.mp4"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "  All ${#EXPECTED[@]} clips present!"
else
  echo "  $PRESENT/${#EXPECTED[@]} clips present, $MISSING still needed."
  echo ""
  echo "  To download missing clips:"
  echo "  1. Search YouTube using the terms in this script"
  echo "  2. Replace URL_HERE with the video URL"
  echo "  3. Uncomment the download_clip line"
  echo "  4. Re-run: bash scripts/download-clips.sh"
fi

echo ""
echo "Existing clips:"
ls -lhS "$OUTDIR"/*.mp4 2>/dev/null || echo "  (no .mp4 files yet)"

# Cleanup
rm -rf "$TEMP_DIR"
