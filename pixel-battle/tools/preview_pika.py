import sys; sys.path.insert(0, 'src')
import numpy as np
from PIL import Image
import pikachu as P
frames = [
  ("stand", {}), ("stand", {"bob": 1, "squash": 1, "expr": "determined"}), ("stand", {"lean": 2, "armF": 2.2, "armB": 2.0, "expr": "open", "earF": -0.4}),
  ("stand", {"expr": "hurt", "lean": -2, "tilt": -0.3}), ("quad", {"phase": 0}), ("quad", {"phase": 0.25}), ("quad", {"phase": 0.5}),
  ("quad", {"phase": 0.75}), ("ball", {"angle": 0}), ("ball", {"angle": 1.6}), ("front", {}), ("front", {"armR": -2.6, "bob": -1}),
  ("stand", {}, -1), ("quad", {"phase": 0.3}, -1),
]
cells = []
for fr in frames:
    f = fr[2] if len(fr) > 2 else 1
    cells.append(P.frame(fr[0], fr[1], f))
w, h = P.CELL[0], P.CELL[1]
cols = 7
rows = (len(cells) + cols - 1) // cols
sheet = np.zeros((rows * h, cols * w, 4), np.uint8)
sheet[..., :3] = (120, 170, 120); sheet[..., 3] = 255
for i, c in enumerate(cells):
    y, x = (i // cols) * h, (i % cols) * w
    a = c[..., 3:4] / 255.0
    sheet[y:y+h, x:x+w, :3] = (c[..., :3] * a + sheet[y:y+h, x:x+w, :3] * (1 - a)).astype(np.uint8)
Image.fromarray(sheet).resize((sheet.shape[1] * 4, sheet.shape[0] * 4), Image.NEAREST).save(sys.argv[1])
