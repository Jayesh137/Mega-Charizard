#!/bin/bash
# scripts/download-and-process-clips.sh
# Downloads full source videos, then trims and re-encodes clips.
# Requires: /tmp/yt-dlp, /tmp/ffmpeg (both pre-installed)

set -euo pipefail

YTDLP="/tmp/yt-dlp"
FFMPEG="/tmp/ffmpeg"
NODE="/mnt/c/Program Files/nodejs/node.exe"
OUTPUT_DIR="./public/video"
CACHE_DIR="/tmp/mcx-source-videos"
CLIP_LIST="./scripts/clip-list.txt"

mkdir -p "$OUTPUT_DIR" "$CACHE_DIR"

echo "=== Mega Charizard Academy — Video Clip Downloader ==="
echo ""

# Build unique URL list to avoid re-downloading
declare -A URL_MAP

# First pass: collect unique URLs
while IFS='|' read -r name url start duration; do
  [[ "$name" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$name" ]] && continue
  url=$(echo "$url" | xargs)
  [[ "$url" == "PASTE_URL_HERE" || -z "$url" ]] && continue

  # Extract video ID from URL
  vid_id=$(echo "$url" | grep -oP 'v=\K[^&]+' || echo "$url")
  URL_MAP["$vid_id"]="$url"
done < "$CLIP_LIST"

echo "Downloading ${#URL_MAP[@]} source videos..."
echo ""

# Download full source videos (cached)
for vid_id in "${!URL_MAP[@]}"; do
  url="${URL_MAP[$vid_id]}"
  cached="$CACHE_DIR/${vid_id}.mp4"

  if [ -f "$cached" ] && [ -s "$cached" ]; then
    echo "  CACHED $vid_id"
    continue
  fi

  echo -n "  Downloading $vid_id ... "
  if "$YTDLP" \
    --js-runtimes "node:$NODE" \
    -f "best[height<=720]/best" \
    -o "$cached" \
    --no-playlist --quiet --no-warnings \
    "$url" 2>/dev/null; then
    echo "OK"
  else
    echo "FAIL"
  fi
done

echo ""
echo "Trimming and encoding clips..."
echo ""

SUCCESS=0
FAILED=0
SKIPPED=0
TOTAL=0

# Second pass: trim clips from source videos
while IFS='|' read -r name url start duration; do
  [[ "$name" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$name" ]] && continue

  name=$(echo "$name" | xargs)
  url=$(echo "$url" | xargs)
  start=$(echo "$start" | xargs)
  duration=$(echo "$duration" | xargs)
  duration="${duration%s}"

  TOTAL=$((TOTAL + 1))
  output="$OUTPUT_DIR/${name}.mp4"

  # Skip if already exists and has real content (>10KB)
  if [ -f "$output" ] && [ "$(stat -c%s "$output" 2>/dev/null || echo 0)" -gt 10000 ]; then
    echo "  SKIP $name (already processed)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ "$url" = "PASTE_URL_HERE" ] || [ -z "$url" ]; then
    echo "  SKIP $name (no URL)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  vid_id=$(echo "$url" | grep -oP 'v=\K[^&]+' || echo "$url")
  source="$CACHE_DIR/${vid_id}.mp4"

  if [ ! -f "$source" ] || [ ! -s "$source" ]; then
    echo "  FAIL $name (source video not downloaded)"
    FAILED=$((FAILED + 1))
    continue
  fi

  echo -n "  $name (ss=$start t=$duration) ... "

  if "$FFMPEG" -y -ss "$start" -i "$source" \
    -t "$duration" \
    -an \
    -c:v libx264 \
    -crf 28 \
    -preset medium \
    -vf "scale='min(720,iw)':-2" \
    -movflags +faststart \
    -pix_fmt yuv420p \
    "$output" \
    2>/dev/null; then

    size=$(stat -c%s "$output" 2>/dev/null || echo 0)
    echo "OK ($(( size / 1024 ))KB)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "FAIL (ffmpeg)"
    FAILED=$((FAILED + 1))
  fi

done < "$CLIP_LIST"

echo ""
echo "Done! $SUCCESS trimmed, $SKIPPED skipped, $FAILED failed out of $TOTAL."

# Completeness check
echo ""
echo "Checking completeness..."
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
for n in "${EXPECTED[@]}"; do
  f="$OUTPUT_DIR/${n}.mp4"
  if [ ! -f "$f" ] || [ "$(stat -c%s "$f" 2>/dev/null || echo 0)" -lt 10000 ]; then
    echo "  MISSING: ${n}.mp4"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -eq 0 ]; then
  echo "  All 24 clips present and encoded!"
else
  echo "  $MISSING clips still missing or too small."
fi
