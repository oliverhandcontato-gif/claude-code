#!/usr/bin/env bash
# Extracts review frames from the final MP4: start, middle, end and high-motion moments,
# plus frame-by-frame strips of the fastest actions (spacing check).
set -e
cd "$(dirname "$0")/.."
V=out/pantera.mp4; D=out/review; mkdir -p "$D"
for t in 0.5 6 8.5 12.6 34 66.5 73.98 76 84 111.6 168 190.5 196 212 222; do
  ffmpeg -v error -y -ss "$t" -i "$V" -frames:v 1 "$D/t_${t}.png"
done
strip() { ffmpeg -v error -y -ss "$1" -i "$V" -vf "select=lt(n\,12),scale=480:-1,tile=4x3" -frames:v 1 -update 1 "$D/strip_$2.png"; }
strip 73.4 dunk1; strip 68.0 drive1; strip 83.0 zone_dribble; strip 13.9 sit_up; strip 24.3 crossover; strip 195.0 dunk_final
ffmpeg -v error -y -i "$V" -vf "select=not(mod(n\,192)),scale=384:-1,tile=6x5" -frames:v 1 -update 1 "$D/overview.png"
echo review frames in $D
