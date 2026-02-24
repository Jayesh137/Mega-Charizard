#!/bin/bash
# scripts/process-video-clips.sh
# Batch-process raw anime clips into game-ready format.
#
# Takes a folder of raw clips (any format/resolution) and outputs
# trimmed, resized, silent MP4 files ready for public/video/.
#
# Requirements: ffmpeg (https://ffmpeg.org)
#
# Usage:
#   ./scripts/process-video-clips.sh <input-dir> [output-dir]
#
# Input files should be named to match their clip IDs (from clips.ts):
#   e.g. evo-charmander-charmeleon.mp4, cel-flamethrower.mp4, etc.
#
# The script will:
#   1. Re-encode to H.264 with CRF 28 (good quality, small size)
#   2. Scale to 720p max width (preserve aspect ratio)
#   3. Strip audio (game has its own audio layer)
#   4. Target <2MB per clip
#   5. Output as .mp4 with web-optimized moov atom (faststart)

set -euo pipefail

INPUT_DIR="${1:?Usage: $0 <input-dir> [output-dir]}"
OUTPUT_DIR="${2:-./public/video}"

mkdir -p "$OUTPUT_DIR"

echo "Processing video clips..."
echo "  Input:  $INPUT_DIR"
echo "  Output: $OUTPUT_DIR"
echo ""

# Expected clip durations (from clips.ts) — used for validation
declare -A EXPECTED_DURATION
EXPECTED_DURATION[evo-charmander-charmeleon]=6
EXPECTED_DURATION[evo-charmeleon-charizard]=6
EXPECTED_DURATION[evo-mega-charizard-x]=10
EXPECTED_DURATION[intro-i-choose-you]=4
EXPECTED_DURATION[intro-charmander-meet]=4
EXPECTED_DURATION[intro-team-ready]=4
EXPECTED_DURATION[cel-flamethrower]=3
EXPECTED_DURATION[cel-blast-burn]=3
EXPECTED_DURATION[cel-ash-fistpump]=2
EXPECTED_DURATION[cel-victory-roar]=2
EXPECTED_DURATION[cel-dragon-claw]=3
EXPECTED_DURATION[cel-seismic-toss]=4
EXPECTED_DURATION[cel-blue-aura]=3
EXPECTED_DURATION[cel-high-five]=3
EXPECTED_DURATION[calm-flying-sunset]=7
EXPECTED_DURATION[calm-riding]=7
EXPECTED_DURATION[calm-campfire]=7
EXPECTED_DURATION[calm-sleeping]=6
EXPECTED_DURATION[calm-stargazing]=7
EXPECTED_DURATION[enc-determined]=2
EXPECTED_DURATION[enc-shake-off]=3
EXPECTED_DURATION[enc-encouraging]=2
EXPECTED_DURATION[fin-blast-burn]=8
EXPECTED_DURATION[fin-victory-lap]=8

SUCCESS=0
FAILED=0
SKIPPED=0

for input_file in "$INPUT_DIR"/*; do
  [ -f "$input_file" ] || continue

  basename=$(basename "$input_file")
  name="${basename%.*}"
  output_file="$OUTPUT_DIR/${name}.mp4"

  # Look up expected duration
  duration="${EXPECTED_DURATION[$name]:-}"
  trim_args=""
  if [ -n "$duration" ]; then
    trim_args="-t $duration"
  fi

  echo -n "  $name ... "

  if ffmpeg -y -i "$input_file" \
    -an \
    -c:v libx264 \
    -crf 28 \
    -preset medium \
    -vf "scale='min(720,iw)':-2" \
    -movflags +faststart \
    -pix_fmt yuv420p \
    $trim_args \
    "$output_file" \
    2>/dev/null; then

    # Check file size
    size=$(stat -c%s "$output_file" 2>/dev/null || stat -f%z "$output_file" 2>/dev/null)
    size_kb=$((size / 1024))
    size_mb=$((size / 1024 / 1024))

    if [ "$size_mb" -gt 2 ]; then
      echo "OK (${size_kb}KB) ⚠ >2MB — consider shorter trim or higher CRF"
    else
      echo "OK (${size_kb}KB)"
    fi
    SUCCESS=$((SUCCESS + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Done! $SUCCESS processed, $FAILED failed."

# List any missing clips
echo ""
echo "Checking for missing clips..."
MISSING=0
for name in "${!EXPECTED_DURATION[@]}"; do
  if [ ! -f "$OUTPUT_DIR/${name}.mp4" ] || [ ! -s "$OUTPUT_DIR/${name}.mp4" ]; then
    echo "  MISSING: ${name}.mp4"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -eq 0 ]; then
  echo "  All 24 clips present!"
else
  echo "  $MISSING clips missing — see video-sourcing-guide.md for where to find them."
fi
