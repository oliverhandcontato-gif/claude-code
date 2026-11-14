"""Pixel effects drawn on the same 1px grid as the sprites (no anti-aliasing, integer positions).
Each effect is a function of (position, age/anim-step, seed) so it is fully deterministic.
Effects animate on their own step (usually every 2-3 ticks) like hand-drawn FX."""
import math
import numpy as np
from raster import hexc

W, H = 384, 216
C = {k: np.array(hexc(v), np.uint8) for k, v in {
    "white": "#ffffff", "y0": "#fff8b0", "y1": "#f8e040", "y2": "#f0b018", "y3": "#b87808",
    "f0": "#fff4c0", "f1": "#f8d040", "f2": "#f88018", "f3": "#e03818", "f4": "#901c10", "f5": "#4a1a18",
    "s1": "#8a7a7e", "s2": "#6a5a62", "s3": "#4a3e48", "dust": "#d8a878", "dust2": "#a87a58",
    "c0": "#e8ffff", "c1": "#80e0f0", "c2": "#3090c0", "black": "#100810", "line": "#1e1018"}.items()}


def rnd(seed):
    x = math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - math.floor(x)


def put(fr, x, y, c):
    x, y = int(x), int(y)
    if 0 <= x < W and 0 <= y < H:
        fr[y, x] = c


def disc(fr, cx, cy, r, c, dither=None):
    cx, cy = int(round(cx)), int(round(cy))
    ri = int(math.ceil(r))
    y0, y1 = max(0, cy - ri), min(H, cy + ri + 1)
    x0, x1 = max(0, cx - ri), min(W, cx + ri + 1)
    if y0 >= y1 or x0 >= x1:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1]
    m = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r + 0.3
    if dither is not None:
        m &= ((xx + yy) % 2) == dither
    fr[y0:y1, x0:x1][m] = c


def line(fr, x0, y0, x1, y1, c, every=1):
    x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx + dy
    i = 0
    pts = []
    while True:
        if i % every == 0:
            put(fr, x0, y0, c)
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy
        i += 1
    return pts


def jag_path(x0, y0, x1, y1, seed, step=9, amp=5):
    L = math.hypot(x1 - x0, y1 - y0) or 1
    n = max(2, int(L / step))
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    pts = [(x0, y0)]
    for i in range(1, n):
        t = i / n
        o = (rnd(seed * 31 + i) - 0.5) * 2 * amp
        pts.append((x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o))
    pts.append((x1, y1))
    return pts


def bolt(fr, x0, y0, x1, y1, seed, thick=1, amp=6, branches=2):
    """Lightning: white 1px core, yellow body, orange dithered outer glow, small forks."""
    pts = jag_path(x0, y0, x1, y1, seed, 9, amp)
    core = []
    for a, b in zip(pts, pts[1:]):
        core += line(fr, *a, *b, C["white"])
    S = set(core)
    glow1, glow2 = set(), set()
    for (x, y) in core:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (-1, -1), (1, -1), (-1, 1)) if thick > 1 else ()):
            if (x + dx, y + dy) not in S:
                glow1.add((x + dx, y + dy))
    for (x, y) in glow1:
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2), (1, 1), (-1, -1)):
            q = (x + dx, y + dy)
            if q not in S and q not in glow1 and (q[0] + q[1]) % 2 == 0:
                glow2.add(q)
    for q in glow2:
        put(fr, *q, C["y2"])
    for q in glow1:
        put(fr, *q, C["y1"])
    for q in core:
        put(fr, *q, C["white"])
    for b in range(branches):
        i = 1 + int(rnd(seed * 7 + b) * (len(pts) - 2))
        bx, by = pts[i]
        ang = math.atan2(y1 - y0, x1 - x0) + (rnd(seed + b * 3) - 0.5) * 2.2
        ln = 6 + rnd(seed * 3 + b) * 10
        sub = jag_path(bx, by, bx + math.cos(ang) * ln, by + math.sin(ang) * ln, seed * 5 + b, 4, 2)
        for a, c in zip(sub, sub[1:]):
            line(fr, *a, *c, C["y1"])


def sparks(fr, x, y, seed, r=8, n=3):
    for k in range(n):
        a = rnd(seed * 11 + k) * 6.283
        l = r * (0.5 + rnd(seed * 3 + k) * 0.6)
        pts = jag_path(x, y, x + math.cos(a) * l, y + math.sin(a) * l, seed * 13 + k, 3, 1.5)
        for p, q in zip(pts, pts[1:]):
            line(fr, *p, *q, C["y1"] if k % 2 else C["white"])


def fire_stream(fr, x0, y0, x1, y1, step, prog=1.0, seed=0, width=1.0):
    """Flamethrower: overlapping hot blobs along the path, growing and cooling with distance."""
    L = math.hypot(x1 - x0, y1 - y0) or 1
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    n = int(L / 3)
    reach = prog * L
    layers = (("f4", 1.6), ("f3", 1.0), ("f2", 0.55), ("f1", 0.25))
    for li, (col, sc) in enumerate(layers):
        for i in range(n):
            d = i * 3 + ((step * 5) % 3)
            if d > reach:
                break
            t = d / L
            r = (1.5 + t * 9) * width
            jx = (rnd(seed + i * 1.7 + step * 0.37) - 0.5) * r * 0.9
            jy = (rnd(seed + i * 2.3 + step * 0.71) - 0.5) * r * 0.9
            cx, cy = x0 + ux * d - uy * jx, y0 + uy * d + ux * jy
            rr = r * sc if li < 3 else r * sc * (1 - t * 0.6)
            if rr >= 0.6:
                disc(fr, cx, cy, rr, C[col])
    # white-hot core at the mouth
    disc(fr, x0, y0, 2.2 * width, C["f0"])
    # leading smoke/embers
    for k in range(6):
        d = reach - 4 + rnd(seed + k + step) * 8
        if d < 0:
            continue
        put(fr, x0 + ux * d + (rnd(k * 3 + step) - 0.5) * 18, y0 + uy * d + (rnd(k * 5 + step) - 0.5) * 18, C["f1"])


def fireball(fr, x, y, r, step, vx=-1, vy=1):
    L = math.hypot(vx, vy) or 1
    ux, uy = vx / L, vy / L
    for k in range(5):
        d = (k + 1) * r * 0.55
        rr = r * (0.9 - k * 0.15)
        disc(fr, x - ux * d + (rnd(step + k) - 0.5) * 2, y - uy * d + (rnd(step * 3 + k) - 0.5) * 2, rr, C["f3" if k > 1 else "f2"])
    disc(fr, x, y, r + 1, C["f4"])
    disc(fr, x, y, r, C["f2"])
    disc(fr, x - 1, y - 1, r * 0.6, C["f1"])
    disc(fr, x - 1, y - 1, r * 0.3, C["f0"])


def explosion(fr, x, y, age, size=1.0, seed=0):
    """age in ticks; drawn as discrete steps (every 3 ticks)."""
    s = age // 3
    if s <= 1:
        disc(fr, x, y, (6 + s * 6) * size, C["white"])
        disc(fr, x, y, (4 + s * 4) * size, C["f0"])
        return
    if s > 14:
        return
    R = (10 + s * 3.2) * size
    # smoke puffs
    for k in range(9):
        a = k / 9 * 6.283 + seed
        d = R * (0.55 + rnd(seed + k) * 0.3)
        pr = (4 + s * 0.7) * size * (1.2 - s / 18)
        if pr <= 0.5:
            continue
        cx, cy = x + math.cos(a) * d, y + math.sin(a) * d * 0.7 - s * 1.2
        disc(fr, cx, cy, pr + 1, C["s3"])
        disc(fr, cx - 1, cy - 1, pr, C["s2"] if s > 6 else C["f3"])
        if s < 7:
            disc(fr, cx - 1, cy - 1, pr * 0.5, C["f1"])
    if s < 6:
        disc(fr, x, y, R * 0.45 * (1 - s / 7), C["f2"])
        disc(fr, x, y, R * 0.25 * (1 - s / 7), C["f0"])
    # debris
    for k in range(10):
        a = rnd(seed * 5 + k) * 6.283
        d = s * (3 + rnd(k + seed) * 3) * size
        put(fr, x + math.cos(a) * d, y + math.sin(a) * d + s * s * 0.15, C["f4"] if k % 2 else C["dust2"])


def dust(fr, x, y, age, dirx=1, seed=0, size=1.0):
    s = age // 3
    if s > 9:
        return
    for k in range(4):
        d = (3 + s * 2.2) * (0.6 + k * 0.25)
        r = (3.5 - s * 0.32) * size * (1 + k * 0.15)
        if r < 0.7:
            continue
        cx = x + dirx * d * (1 if k % 2 else -0.6)
        cy = y - 2 - s * 0.6 - k * 0.8
        disc(fr, cx, cy, r + 1, C["dust2"])
        disc(fr, cx - 1, cy - 1, r, C["dust"])


def slash(fr, x, y, age, dirx=-1):
    """Dragon Claw: three parallel arcs, bright then fading through teal."""
    s = age // 2
    if s > 6:
        return
    cols = [C["c0"], C["c0"], C["c1"], C["c1"], C["c2"], C["c2"], C["c2"]]
    for k in range(3):
        r = 18 + k * 5
        a0, a1 = -1.9, -1.9 + min(1, (s + 1) / 3) * 2.4
        pts = []
        for i in range(17):
            a = a0 + (a1 - a0) * i / 16
            pts.append((x + dirx * math.cos(a) * r * 0.7 - dirx * k * 3, y + math.sin(a) * r))
        for p, q in zip(pts, pts[1:]):
            line(fr, *p, *q, cols[s])
            if s < 3:
                line(fr, p[0], p[1] + 1, q[0], q[1] + 1, C["c1"])


def electro_ball(fr, x, y, r, step):
    disc(fr, x, y, r + 2, C["y3"], dither=step % 2)
    disc(fr, x, y, r + 1, C["y2"])
    disc(fr, x, y, r, C["y1"])
    disc(fr, x - 1, y - 1, r * 0.55, C["y0"])
    disc(fr, x - 1, y - 1, r * 0.25, C["white"])
    for k in range(3):
        a = rnd(step * 7 + k) * 6.283
        bolt_small = jag_path(x, y, x + math.cos(a) * (r + 5), y + math.sin(a) * (r + 5), step * 3 + k, 3, 1.5)
        for p, q in zip(bolt_small, bolt_small[1:]):
            line(fr, *p, *q, C["white"])


def speed_lines(fr, y0, y1, step, n=14, dirx=1, color="white", seed=0):
    for k in range(n):
        y = int(y0 + rnd(seed + k * 3 + step) * (y1 - y0))
        x = int(rnd(seed + k * 7 + step * 1.3) * W)
        ln = int(12 + rnd(k + step) * 40)
        for i in range(ln):
            if (i + y) % 2 == 0 or i < ln * 0.6:
                put(fr, x + i * dirx, y, C[color])


def silhouette_mask(spr):
    return spr[..., 3] > 0


def dilate(m, r=1):
    out = m.copy()
    for _ in range(r):
        o = out.copy()
        o[1:, :] |= out[:-1, :]; o[:-1, :] |= out[1:, :]; o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out


def blit(fr, spr, x, y, tint=None, dither=None, mask_only=None):
    """Paste RGBA sprite with top-left at integer (x, y). tint: solid colour silhouette.
    dither: 0/1 checker parity for pixel-art transparency."""
    h, w = spr.shape[:2]
    x, y = int(x), int(y)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x0 >= x1 or y0 >= y1:
        return
    s = spr[y0 - y:y1 - y, x0 - x:x1 - x]
    m = s[..., 3] > 0 if mask_only is None else mask_only[y0 - y:y1 - y, x0 - x:x1 - x]
    if dither is not None:
        yy, xx = np.mgrid[y0:y1, x0:x1]
        m = m & (((xx + yy) % 2) == dither)
    if tint is not None:
        fr[y0:y1, x0:x1][m] = tint
    else:
        fr[y0:y1, x0:x1][m] = s[..., :3][m]


def aura(fr, spr, x, y, step, strength=1.0):
    """Volt Tackle aura: dilated silhouette rings, flickering every step, plus crackles."""
    m = silhouette_mask(spr)
    r2 = dilate(m, 2 if strength > 0.5 else 1)
    r1 = dilate(m, 1)
    ring2 = r2 & ~r1
    ring1 = r1 & ~m
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    flick = ((xx + yy + step) % 3) != 0
    blit(fr, np.dstack([np.zeros_like(m, np.uint8)] * 3 + [(ring2 & flick).astype(np.uint8) * 255]), x, y, tint=C["y2"])
    blit(fr, np.dstack([np.zeros_like(m, np.uint8)] * 3 + [ring1.astype(np.uint8) * 255]), x, y, tint=C["y0"] if step % 2 else C["white"])


def impact_frame(fr, mode=0):
    """Two-tone impact frame: luminance threshold, optionally inverted."""
    lum = fr[..., 0] * 0.3 + fr[..., 1] * 0.59 + fr[..., 2] * 0.11
    bright = lum > 120
    if mode == 0:
        fr[bright] = C["black"]; fr[~bright] = C["white"]
    else:
        fr[bright] = C["white"]; fr[~bright] = C["black"]


def flash(fr, amount, col="white"):
    """Ordered-dither flash (keeps the pixel look instead of alpha blending)."""
    if amount <= 0:
        return
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
    th = np.tile(bayer, (H // 4 + 1, W // 4 + 1))[:H, :W]
    fr[th < amount] = C[col]


def fade(fr, amount):
    flash(fr, amount, "black")
