"""Contact sheet of video times (seconds) at 2x internal scale, for review."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
import numpy as np
from PIL import Image, ImageDraw
import render as R
out = sys.argv[1]; times = [float(x) for x in sys.argv[2:]]
cols = 3; sc = 2
rows = (len(times) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 384 * sc, rows * 216 * sc))
d = ImageDraw.Draw(sheet)
for i, t in enumerate(times):
    fr = R.render_tick(int(round(t * 60)))
    im = Image.fromarray(fr).resize((384 * sc, 216 * sc), Image.NEAREST)
    x, y = (i % cols) * 384 * sc, (i // cols) * 216 * sc
    sheet.paste(im, (x, y)); d.text((x + 4, y + 4), f"{t:.2f}s", fill=(255, 255, 255))
sheet.save(out)
