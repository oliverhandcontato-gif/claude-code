"""Animation states: key poses with per-frame durations (in 60 Hz ticks), built into
spritesheets with fixed cells and pivots.

Each state = list of (mode/params, duration_ticks) + loop flag. Poses between keys are
separate drawn frames (re-rasterized from interpolated parameters), never transformed bitmaps.
Exposed knobs: SPEED (global pose-rate multiplier) and per-state durations below.
"""
import json
import os
import numpy as np
from PIL import Image
import pikachu as PK
import charizard as CZ

SPEED = 1.0  # >1 = faster pose rate (shorter holds)


def _lerp(a, b, t):
    out = dict(a)
    for k, v in b.items():
        if isinstance(v, (int, float)) and isinstance(a.get(k, 0.0), (int, float)):
            out[k] = a.get(k, 0.0) + (v - a.get(k, 0.0)) * t
        else:
            out[k] = v if t >= 0.5 else a.get(k, v)
    return out


# ---------------- Pikachu ----------------
P_IDLE = {"earF": -0.05, "earB": -0.25}
PIKA_STATES = {
    "idle": ([("stand", P_IDLE, 12), ("stand", {**P_IDLE, "bob": 1, "tail": 0.06, "earF": -0.12}, 9),
              ("stand", {**P_IDLE, "tail": 0.1}, 12), ("stand", {**P_IDLE, "bob": 1, "tail": 0.04, "earB": -0.35}, 9)], True),
    "ready": ([("stand", {"expr": "determined", "lean": 1, "armF": 1.3, "armB": 1.0}, 10),
               ("stand", {"expr": "determined", "lean": 1, "bob": 1, "armF": 1.4, "armB": 1.1, "tail": 0.08}, 8)], True),
    "crouch": ([("stand", {"expr": "determined", "bob": 2, "squash": 1.4, "lean": 1, "earF": -0.3, "earB": -0.5}, 6)], False),
    "jump": ([("stand", {"expr": "determined", "bob": -2, "squash": -0.8, "lean": 1, "earF": -0.5, "earB": -0.7, "liftF": 2, "liftB": 3, "armF": 2.4, "armB": 2.2}, 6),
              ("stand", {"expr": "determined", "bob": -1, "squash": -0.3, "lean": 2, "earF": -0.2, "earB": -0.4, "liftF": 3, "liftB": 3, "armF": 1.6}, 99)], False),
    "land": ([("stand", {"expr": "determined", "bob": 2, "squash": 1.6, "lean": 1, "earF": 0.15, "earB": 0.0}, 4),
              ("stand", {"expr": "determined", "bob": 1, "squash": 0.6, "lean": 1, "earF": -0.1}, 5),
              ("stand", {"expr": "determined", "lean": 1, "armF": 1.3}, 99)], False),
    "run": ([("quad", {"phase": i / 6, "expr": "determined"}, 4) for i in range(6)], True),
    "dash": ([("quad", {"phase": i / 4, "stretch": 2.5, "earsBack": 1.4, "expr": "determined"}, 2) for i in range(4)], True),
    "skid": ([("quad", {"phase": 0.5, "stretch": -1.0, "earsBack": 0.6, "expr": "determined"}, 5),
              ("stand", {"expr": "determined", "bob": 2, "squash": 1.2, "lean": -1, "earF": 0.2}, 5)], False),
    "charge": ([("stand", {"expr": "determined", "lean": -1, "bob": 1, "squash": 0.6, "armF": 2.6, "armB": 2.4, "earF": -0.3, "earB": -0.5, "tilt": -0.12}, 5),
                ("stand", {"expr": "determined", "lean": -1, "bob": 2, "squash": 0.9, "armF": 2.7, "armB": 2.5, "earF": -0.35, "earB": -0.55, "tilt": -0.15, "tail": 0.12}, 5)], True),
    "zap": ([("stand", {"expr": "shout", "lean": 2, "bob": -1, "squash": -0.4, "armF": 0.3, "armB": 0.2, "earF": 0.05, "earB": -0.1, "tilt": 0.12}, 3),
             ("stand", {"expr": "shout", "lean": 2, "bob": 0, "squash": -0.2, "armF": 0.4, "armB": 0.3, "earF": 0.1, "earB": -0.05, "tilt": 0.1, "tail": 0.08}, 3)], True),
    "throw": ([("stand", {"expr": "determined", "lean": -2, "armF": 3.0, "armB": 2.6, "bob": 1, "tilt": -0.2}, 8),
               ("stand", {"expr": "open", "lean": 3, "armF": -0.3, "armB": 0.6, "tilt": 0.15}, 4),
               ("stand", {"expr": "determined", "lean": 2, "armF": 0.5, "armB": 0.8, "tilt": 0.05}, 99)], False),
    "hurt": ([("stand", {"expr": "hurt", "lean": -3, "tilt": -0.35, "earF": -0.6, "earB": -0.8, "armF": 2.0, "armB": 2.2, "bob": -1}, 5)]
             + [("ball", {"angle": -a}, 3) for a in (0.0, 1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4)]
             + [("stand", {"expr": "hurt", "bob": 3, "squash": 2.0, "lean": -2, "earF": -0.9, "earB": -1.0, "tilt": -0.2}, 99)], False),
    "getup": ([("stand", {"expr": "hurt", "bob": 3, "squash": 2.0, "lean": -2, "earF": -0.9, "earB": -1.0, "tilt": -0.2}, 14),
               ("stand", {"expr": "determined", "bob": 2, "squash": 1.2, "lean": 0, "earF": -0.4, "earB": -0.6}, 10),
               ("stand", {"expr": "determined", "bob": 0, "lean": 1, "earF": 0.05, "earB": -0.2, "armF": 1.3}, 99)], False),
    "volt": ([("quad", {"phase": i / 4, "stretch": 2.0, "earsBack": 1.35, "expr": "determined"}, 3) for i in range(4)], True),
    "voltLeap": ([("quad", {"phase": 0.62, "stretch": 3.5, "earsBack": 1.5, "expr": "shout"}, 99)], False),
    "victory": ([("front", {"armR": -2.7, "armL": 0.5, "bob": 0}, 9), ("front", {"armR": -2.9, "armL": 0.4, "bob": -1, "tail": 0.1}, 7),
                 ("front", {"armR": -2.7, "armL": 0.5, "bob": 0, "earL": -0.1}, 9), ("front", {"armR": -2.5, "armL": 0.6, "bob": 1, "earR": 0.1}, 7)], True),
}

# ---------------- Charizard ----------------
Z_IDLE = {"expr": "angry", "neck": -0.05}
ZARD_STATES = {
    "idle": ([("z", {**Z_IDLE, "wing": -0.1, "flame": 0}, 10), ("z", {**Z_IDLE, "wing": 0.05, "bob": 1, "flame": 1}, 8),
              ("z", {**Z_IDLE, "wing": 0.15, "bob": 1, "flame": 2}, 10), ("z", {**Z_IDLE, "wing": 0.0, "flame": 3}, 8)], True),
    "fly": ([("z", {"expr": "angry", "wing": w, "fly": 1, "bob": b, "flame": i, "tail": 0.25}, d)
             for i, (w, b, d) in enumerate(((-1.0, 2, 5), (-0.4, 0, 4), (0.5, -2, 4), (1.0, -3, 5), (0.4, -1, 4), (-0.4, 1, 4)))], True),
    "land": ([("z", {"expr": "angry", "wing": -0.9, "fly": 0.3, "bob": 4, "lean": -1, "flame": 1}, 5),
              ("z", {"expr": "angry", "wing": -0.6, "bob": 2, "flame": 2}, 6), ("z", {**Z_IDLE, "wing": -0.1, "flame": 3}, 99)], False),
    "roar": ([("z", {"expr": "angry", "neck": 0.3, "bob": 2, "wing": 0.3, "flame": 0}, 8),
              ("z", {"expr": "roar", "neck": -0.55, "jaw": 1.0, "wing": -0.9, "wingSpread": 1.15, "flame": 1, "flameBoost": 0.6}, 4),
              ("z", {"expr": "roar", "neck": -0.6, "jaw": 1.0, "wing": -1.0, "wingSpread": 1.15, "bob": -1, "flame": 2, "flameBoost": 0.7}, 4)], False),
    "roarHold": ([("z", {"expr": "roar", "neck": -0.55, "jaw": 1.0, "wing": -0.9, "wingSpread": 1.15, "flame": i, "flameBoost": 0.7, "bob": i % 2}, 3) for i in range(4)], True),
    "breathPrep": ([("z", {"expr": "angry", "neck": -0.5, "jaw": 0.25, "lean": -2, "wing": -0.5, "flame": 1}, 8),
                    ("z", {"expr": "angry", "neck": -0.6, "jaw": 0.35, "lean": -3, "wing": -0.7, "flame": 2, "bob": 1}, 99)], False),
    "breath": ([("z", {"expr": "angry", "neck": 0.45, "jaw": 0.9, "lean": 3, "wing": 0.3, "fire": 1, "flame": i, "flameBoost": 0.5, "bob": i % 2}, 3) for i in range(4)], True),
    "flyBreath": ([("z", {"expr": "angry", "neck": 0.7, "jaw": 0.9, "lean": 2, "wing": w, "fly": 1, "fire": 1, "flame": i, "tail": 0.3}, 4)
                   for i, w in enumerate((-0.8, 0.2, 0.9, 0.1))], True),
    "clawUp": ([("z", {"expr": "angry", "neck": -0.2, "armF": 3.4, "armB": 2.6, "lean": -2, "wing": -0.6, "flame": 1}, 99)], False),
    "clawSwipe": ([("z", {"expr": "angry", "neck": 0.4, "armF": 0.2, "armB": 0.6, "lean": 4, "wing": 0.5, "flame": 2}, 3),
                   ("z", {"expr": "angry", "neck": 0.3, "armF": -0.2, "armB": 0.4, "lean": 3, "wing": 0.6, "flame": 3}, 99)], False),
    "dive": ([("z", {"expr": "angry", "rot": 0.55, "wing": 1.0, "wingSpread": 0.8, "fly": 1, "armF": 2.6, "neck": 0.4, "flame": i, "tail": 0.4}, 3) for i in range(4)], True),
    "hurt": ([("z", {"expr": "hurt", "lean": -4, "neck": -0.5, "tilt": -0.3, "wing": -0.8, "bob": -1, "flame": 1, "armF": 1.8}, 4),
              ("z", {"expr": "hurt", "lean": -3, "neck": -0.4, "tilt": -0.25, "wing": -0.6, "flame": 2, "armF": 1.5}, 6),
              ("z", {"expr": "angry", "lean": -1, "neck": -0.1, "wing": -0.2, "flame": 3}, 99)], False),
    "ko": ([("z", {"expr": "hurt", "lean": -5, "neck": -0.7, "tilt": -0.4, "wing": -1.0, "flame": 1, "armF": 2.2}, 10),
            ("z", {"expr": "hurt", "rot": -0.35, "neck": -0.6, "wing": -0.8, "flame": 2, "armF": 2.4, "fly": 0.3}, 8),
            ("z", {"expr": "ko", "rot": -0.85, "neck": -0.4, "wing": 0.0, "flame": 3, "fly": 0.6, "flameBoost": -0.3}, 6),
            ("z", {"expr": "ko", "rot": -1.35, "neck": -0.2, "wing": 0.8, "flame": 0, "fly": 0.9, "flameBoost": -0.4, "oy": -5}, 5),
            ("z", {"expr": "ko", "rot": -1.45, "neck": -0.1, "wing": 1.0, "flame": 1, "fly": 1.0, "flameBoost": -0.5, "oy": -7}, 99)], False),
    "koLie": ([("z", {"expr": "ko", "rot": -1.45, "neck": -0.1, "wing": 1.0, "flame": i, "fly": 1.0, "flameBoost": -0.5, "oy": -7}, 9) for i in range(4)], True),
}


def build(states, cell, drawer, face):
    """Rasterize every frame once; returns ({state: [{cell, dur}]}, [frames])."""
    frames, table = [], {}
    for name, (keys, loop) in states.items():
        out = []
        for mode, params, dur in keys:
            img = drawer(mode, params, face)
            frames.append(img)
            out.append({"cell": len(frames) - 1, "dur": max(1, int(round(dur / SPEED))), "mode": mode, "params": params})
        table[name] = {"frames": out, "loop": loop}
    return table, frames


def pika_draw(mode, params, face):
    return PK.frame(mode, params, face)


def zard_draw(mode, params, face):
    return CZ.frame(params, face)


def sheet(frames, cell, cols=8):
    w, h = cell[0], cell[1]
    rows = (len(frames) + cols - 1) // cols
    s = np.zeros((rows * h, cols * w, 4), np.uint8)
    for i, fr in enumerate(frames):
        y, x = (i // cols) * h, (i % cols) * w
        s[y:y + h, x:x + w] = fr
    return s


class Anim:
    """Runtime lookup: frame image for a state at a time (ticks since state start)."""

    def __init__(self, table, frames, cell):
        self.table, self.frames, self.cell = table, frames, cell

    def entry(self, state, ticks):
        st = self.table[state]
        fr = st["frames"]
        total = sum(f["dur"] for f in fr)
        t = ticks % total if st["loop"] else min(ticks, total - 1)
        for f in fr:
            if t < f["dur"]:
                return f
            t -= f["dur"]
        return fr[-1]

    def at(self, state, ticks):
        return self.frames[self.entry(state, ticks)["cell"]]

    def length(self, state):
        return sum(f["dur"] for f in self.table[state]["frames"])


def load_all(outdir=None):
    pt, pf = build(PIKA_STATES, PK.CELL, pika_draw, 1)
    zt, zf = build(ZARD_STATES, CZ.CELL, zard_draw, -1)
    if outdir:
        os.makedirs(outdir, exist_ok=True)
        for name, table, frames, cell in (("pikachu", pt, pf, PK.CELL), ("charizard", zt, zf, CZ.CELL)):
            Image.fromarray(sheet(frames, cell)).save(os.path.join(outdir, f"{name}_sheet.png"))
            clean = {k: {"loop": v["loop"], "frames": [{"cell": f["cell"], "dur": f["dur"]} for f in v["frames"]]} for k, v in table.items()}
            meta = {"cell_w": cell[0], "cell_h": cell[1], "pivot": [cell[2], cell[3]], "columns": 8,
                    "tick_rate_hz": 60, "states": clean}
            with open(os.path.join(outdir, f"{name}_sheet.json"), "w") as f:
                json.dump(meta, f, indent=1)
    return Anim(pt, pf, PK.CELL), Anim(zt, zf, CZ.CELL)
