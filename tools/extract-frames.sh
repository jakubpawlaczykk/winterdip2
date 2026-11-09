#!/usr/bin/env bash
# Zamienia film z Kling na sekwencję klatek WebP dla hero sterowanego scrollem.
# Użycie: bash tools/extract-frames.sh sciezka/do/filmu.mp4 [fps]
# Wymaga ffmpeg + ffprobe.
set -euo pipefail
IN="${1:?Podaj ścieżkę do filmu}"
FPS="${2:-24}"
OUT="assets/hero"
rm -rf "$OUT/desktop" "$OUT/mobile"
mkdir -p "$OUT/desktop" "$OUT/mobile"

# desktop: 1600px szerokości
ffmpeg -v error -i "$IN" -an -vf "fps=$FPS,scale=1600:-2:flags=lanczos" -c:v libwebp -quality 66 -compression_level 6 "$OUT/desktop/%04d.webp"
# mobile: wycinek środka 9:16, 600px szerokości
ffmpeg -v error -i "$IN" -an -vf "fps=$FPS,crop=ih*9/16:ih,scale=600:-2:flags=lanczos" -c:v libwebp -quality 64 -compression_level 6 "$OUT/mobile/%04d.webp"

D=$(ls "$OUT/desktop" | wc -l | tr -d ' ')
M=$(ls "$OUT/mobile" | wc -l | tr -d ' ')
cat > "$OUT/frames.json" <<EOF
{ "dir": "desktop", "count": $D, "ext": "webp",
  "mobile": { "dir": "mobile", "count": $M, "ext": "webp" } }
EOF
echo "Gotowe: $D klatek desktop, $M mobile -> $OUT"
du -sh "$OUT/desktop" "$OUT/mobile"
