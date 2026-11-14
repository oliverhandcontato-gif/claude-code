import sys; sys.path.insert(0, 'src')
import numpy as np
from PIL import Image
import charizard as Z
poses = [({}, 1), ({"wing": -1, "flame": 1}, 1), ({"wing": 1, "fly": 1, "flame": 2}, 1),
         ({"jaw": 1, "neck": -0.4, "expr": "roar", "wing": -0.6}, 1), ({"jaw": 0.8, "neck": 0.5, "lean": 3, "expr": "angry", "fire": 1}, 1),
         ({"expr": "hurt", "lean": -3, "neck": -0.3, "tilt": -0.3}, 1), ({}, -1), ({"rot": -1.4, "expr": "ko", "wing": 1, "oy": 0}, -1)]
cells = [Z.frame(p, f) for p, f in poses]
w, h = Z.CELL[0], Z.CELL[1]
cols = 4
rows = (len(cells) + cols - 1) // cols
sheet = np.zeros((rows * h, cols * w, 4), np.uint8); sheet[..., :3] = (120, 170, 120); sheet[..., 3] = 255
for i, c in enumerate(cells):
    y, x = (i // cols) * h, (i % cols) * w
    a = c[..., 3:4] / 255.0
    sheet[y:y+h, x:x+w, :3] = (c[..., :3] * a + sheet[y:y+h, x:x+w, :3] * (1 - a)).astype(np.uint8)
Image.fromarray(sheet).resize((sheet.shape[1] * 3, sheet.shape[0] * 3), Image.NEAREST).save(sys.argv[1])
