#!/bin/bash
# scripts/download-clips.sh
# Downloads and processes anime clips for Mega Charizard Academy.
# Requires: yt-dlp, ffmpeg
#
# Usage:
#   bash scripts/download-clips.sh
#
# This script downloads specific moments from freely available Pokémon anime
# clips on YouTube, trims them to the exact durations needed, strips audio,
# re-encodes to 720p H.264, and saves to public/video/.

set -euo pipefail

OUTPUT_DIR="./public/video"
TEMP_DIR="./raw-clips-tmp"
mkdir -p "$OUTPUT_DIR" "$TEMP_DIR"

# Check dependencies
for cmd in yt-dlp ffmpeg; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required. Install it first."
    echo "  yt-dlp:  pip install yt-dlp   OR   winget install yt-dlp"
    echo "  ffmpeg:  winget install ffmpeg"
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Clip definitions: [output_name] [youtube_url] [start_time] [duration]
# These are short educational fair-use clips (2-10 seconds each).
# URLs point to publicly available Pokémon anime compilations.
# ---------------------------------------------------------------------------

# Function to download and process a single clip
process_clip() {
  local name="$1"
  local url="$2"
  local start="$3"
  local duration="$4"
  local output="$OUTPUT_DIR/${name}.mp4"

  if [ -f "$output" ] && [ -s "$output" ]; then
    echo "  SKIP $name (exists)"
    return 0
  fi

  echo -n "  $name ... "

  # Download the segment
  local tmpfile="$TEMP_DIR/${name}_raw.mp4"
  if yt-dlp -f "best[height<=720]" \
    --download-sections "*${start}-${start}+${duration}" \
    --force-keyframes-at-cuts \
    -o "$tmpfile" \
    --quiet --no-warnings \
    "$url" 2>/dev/null; then

    # Re-encode: strip audio, 720p max, H.264, web-optimized
    if ffmpeg -y -i "$tmpfile" \
      -an \
      -c:v libx264 \
      -crf 28 \
      -preset medium \
      -vf "scale='min(720,iw)':-2" \
      -movflags +faststart \
      -pix_fmt yuv420p \
      -t "$duration" \
      "$output" \
      2>/dev/null; then

      local size=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null)
      echo "OK ($(( size / 1024 ))KB)"
    else
      echo "FAIL (ffmpeg encode)"
    fi

    rm -f "$tmpfile"
  else
    echo "FAIL (download)"
  fi
}

echo "=== Mega Charizard Academy — Video Clip Downloader ==="
echo ""
echo "This script needs YouTube URLs for each clip."
echo "See docs/video-sourcing-guide.md for what to search for."
echo ""
echo "Since YouTube URLs change frequently, this script uses a"
echo "clip-list file where you paste URLs + timestamps."
echo ""

CLIP_LIST="./scripts/clip-list.txt"

if [ ! -f "$CLIP_LIST" ]; then
  echo "Creating template clip list at: $CLIP_LIST"
  echo "Fill in the YouTube URLs and timestamps, then re-run this script."
  echo ""

  cat > "$CLIP_LIST" << 'TEMPLATE'
# Mega Charizard Academy — Clip List
# Format: clip_name | youtube_url | start_time | duration_seconds
# Lines starting with # are ignored.
# Times can be: seconds (90) or mm:ss (1:30) or hh:mm:ss (0:01:30)
#
# Fill in the youtube_url and start_time for each clip below,
# then run: bash scripts/download-clips.sh
#
# === EVOLUTION CLIPS ===
evo-charmander-charmeleon | PASTE_URL_HERE | 0:00 | 6
evo-charmeleon-charizard | PASTE_URL_HERE | 0:00 | 6
evo-mega-charizard-x | PASTE_URL_HERE | 0:00 | 10
#
# === INTRO CLIPS ===
intro-i-choose-you | PASTE_URL_HERE | 0:00 | 4
intro-charmander-meet | PASTE_URL_HERE | 0:00 | 4
intro-team-ready | PASTE_URL_HERE | 0:00 | 4
#
# === CELEBRATION CLIPS ===
cel-flamethrower | PASTE_URL_HERE | 0:00 | 3
cel-blast-burn | PASTE_URL_HERE | 0:00 | 3
cel-ash-fistpump | PASTE_URL_HERE | 0:00 | 2
cel-victory-roar | PASTE_URL_HERE | 0:00 | 2
cel-dragon-claw | PASTE_URL_HERE | 0:00 | 3
cel-seismic-toss | PASTE_URL_HERE | 0:00 | 4
cel-blue-aura | PASTE_URL_HERE | 0:00 | 3
cel-high-five | PASTE_URL_HERE | 0:00 | 3
#
# === CALM CLIPS ===
calm-flying-sunset | PASTE_URL_HERE | 0:00 | 7
calm-riding | PASTE_URL_HERE | 0:00 | 7
calm-campfire | PASTE_URL_HERE | 0:00 | 7
calm-sleeping | PASTE_URL_HERE | 0:00 | 6
calm-stargazing | PASTE_URL_HERE | 0:00 | 7
#
# === ENCOURAGEMENT CLIPS ===
enc-determined | PASTE_URL_HERE | 0:00 | 2
enc-shake-off | PASTE_URL_HERE | 0:00 | 3
enc-encouraging | PASTE_URL_HERE | 0:00 | 2
#
# === FINALE CLIPS ===
fin-blast-burn | PASTE_URL_HERE | 0:00 | 8
fin-victory-lap | PASTE_URL_HERE | 0:00 | 8
TEMPLATE

  echo "Template created! Steps:"
  echo ""
  echo "  1. Open scripts/clip-list.txt"
  echo "  2. For each clip, find the right YouTube video"
  echo "     (search terms in docs/video-sourcing-guide.md)"
  echo "  3. Replace PASTE_URL_HERE with the video URL"
  echo "  4. Set the start_time to the right moment"
  echo "  5. Re-run: bash scripts/download-clips.sh"
  exit 0
fi

# Parse and process clip list
echo "Processing clips from $CLIP_LIST ..."
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0
TOTAL=0

while IFS='|' read -r name url start duration; do
  # Skip comments and empty lines
  [[ "$name" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$name" ]] && continue

  # Trim whitespace
  name=$(echo "$name" | xargs)
  url=$(echo "$url" | xargs)
  start=$(echo "$start" | xargs)
  duration=$(echo "$duration" | xargs)

  TOTAL=$((TOTAL + 1))

  if [ "$url" = "PASTE_URL_HERE" ] || [ -z "$url" ]; then
    echo "  SKIP $name (no URL provided)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if process_clip "$name" "$url" "$start" "$duration"; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAILED=$((FAILED + 1))
  fi

done < "$CLIP_LIST"

echo ""
echo "Done! $SUCCESS/$TOTAL processed, $SKIPPED skipped, $FAILED failed."

# Cleanup temp dir
rm -rf "$TEMP_DIR"

# Missing check
echo ""
echo "Checking for missing clips..."
EXPECTED=(
  evo-charmander-charmeleon evo-charmeleon-charizard evo-mega-charizard-x
  intro-i-choose-you intro-charmander-meet intro-team-ready
  cel-flamethrower cel-blast-burn cel-ash-fistpump cel-victory-roar
  cel-dragon-claw cel-seismic-toss cel-blue-aura cel-high-five
  calm-flying-sunset calm-riding calm-campfire calm-sleeping calm-stargazing
  enc-determined enc-shake-off enc-encouraging
  fin-blast-burn fin-victory-lap
)

MISSING=0
for name in "${EXPECTED[@]}"; do
  if [ ! -f "$OUTPUT_DIR/${name}.mp4" ] || [ ! -s "$OUTPUT_DIR/${name}.mp4" ]; then
    echo "  MISSING: ${name}.mp4"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -eq 0 ]; then
  echo "  All 24 clips present!"
else
  echo "  $MISSING clips still needed."
fi
