"""Canyon arena at sunset: parallax layers drawn on the same pixel grid (internal 384x216).
Layers are generated once (deterministic) and scrolled by integer offsets."""
import math
import numpy as np
from raster import hexc

W, H = 384, 216
GROUND_Y = 178          # feet line on screen
WORLD_W = 760           # playfield width in world pixels

SKY = [hexc(c) for c in ("#2a1a4a", "#3e2260", "#5e2c70", "#8a3a6e", "#c0505a", "#e8784a", "#f8a850", "#fcd078")]


def _rng(seed):
    s = [seed & 0xFFFFFFFF or 1]
    def r():
        x = s[0]
        x ^= (x << 13) & 0xFFFFFFFF; x ^= x >> 17; x ^= (x << 5) & 0xFFFFFFFF
        s[0] = x & 0xFFFFFFFF
        return s[0] / 4294967296.0
    return r


def sky():
    """Banded gradient with 2px ordered-dither transitions between bands, plus pixel sun."""
    img = np.zeros((H, W, 3), np.uint8)
    top, bot = 0, 150
    n = len(SKY)
    bayer = np.array([[0, 2], [3, 1]]) / 4.0
    for y in range(H):
        t = min(1, max(0, (y - top) / (bot - top))) * (n - 1)
        i = int(t); f = t - i
        for x in range(W):
            c = SKY[min(n - 1, i + (1 if f > bayer[y % 2, x % 2] + 0.12 and f > 0.55 else 0))]
            img[y, x] = c
    # sun (pixel disc with bright core rows and horizontal cloud gaps)
    cx, cy, r = 250, 128, 22
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d <= r and 0 <= y < H:
                if y in (cy + 6, cy + 7, cy + 13, cy + 18):
                    continue
                img[y, x] = hexc("#fff0b0") if d < r - 3 else hexc("#ffd890")
    # thin clouds
    r_ = _rng(7)
    for k in range(9):
        y = int(30 + r_() * 90); x0 = int(r_() * W); ln = int(30 + r_() * 70)
        col = hexc("#f8a0a0") if y > 80 else hexc("#9a4a8a")
        for x in range(x0, x0 + ln):
            img[y, x % W] = col
            if (x - x0) % 3 and x - x0 > 4 and x0 + ln - x > 4:
                img[y - 1, x % W] = col
    return img


def mountains(seed, base, amp, color, rim, width, rough=0.5):
    """Silhouette band (RGBA, tileable horizontally) with a lit rim on the sun-facing slopes."""
    r = _rng(seed)
    pts = []
    h = base
    hs = []
    for x in range(width):
        h += (r() - 0.5) * 4 * rough
        h += (base - h) * 0.03
        hs.append(h)
    # add peaks
    for k in range(width // 60):
        px = int(r() * width); pw = 20 + r() * 40; ph = amp * (0.5 + r() * 0.5)
        for x in range(width):
            d = min(abs(x - px), width - abs(x - px))
            if d < pw:
                hs[x] -= ph * (1 - d / pw)
    img = np.zeros((H, width, 4), np.uint8)
    for x in range(width):
        top = int(round(hs[x]))
        img[top:, x, :3] = color
        img[top:, x, 3] = 255
        # rim light where the slope faces the sun (left-high to right-low)
        if x > 0 and hs[x] > hs[x - 1] + 0.2:
            img[top, x, :3] = rim
    return img


def mesas(width):
    """Mid layer: flat-topped rock formations with banded strata and cel shading."""
    r = _rng(21)
    img = np.zeros((H, width, 4), np.uint8)
    base = hexc("#8a4a3a"); shade = hexc("#6a3434"); lit = hexc("#b8644a"); line = hexc("#3a1e2a"); strata = hexc("#7a3e36")
    x = 0
    while x < width:
        w = int(40 + r() * 70); top = int(96 + r() * 30)
        for i in range(w):
            xx = x + i
            if xx >= width:
                break
            taper = int(max(0, 4 - i)) + int(max(0, i - (w - 5)))
            t = top + taper
            img[t:, xx, :3] = base; img[t:, xx, 3] = 255
            if i < w * 0.3:
                img[t + 1:, xx, :3] = lit
            elif i > w * 0.7:
                img[t + 1:, xx, :3] = shade
            img[t, xx, :3] = line
            for sy in range(t + 8, H, 9):
                if (xx + sy) % 7:
                    img[sy, xx, :3] = strata if i < w * 0.7 else line
        img[top:, x, :3] = line
        x += w + int(r() * 30)
    return img


def ground(width):
    """Playfield: plateau top surface with pebbles and grass tufts; cliff face below."""
    r = _rng(33)
    img = np.zeros((H, width, 4), np.uint8)
    top = GROUND_Y - 6
    c_top = hexc("#c8885a"); c_mid = hexc("#a86a48"); c_dark = hexc("#7a4a3a"); c_line = hexc("#4a2a2a")
    c_cliff = hexc("#8a5040"); c_cliff2 = hexc("#6a3a34"); grass = hexc("#6a8a3a"); grass2 = hexc("#4a6a2a")
    for x in range(width):
        img[top:, x, 3] = 255
        img[top, x, :3] = c_line
        img[top + 1:top + 3, x, :3] = c_top
        img[top + 3:GROUND_Y + 14, x, :3] = c_mid
        img[GROUND_Y + 14, x, :3] = c_line
        img[GROUND_Y + 15:, x, :3] = c_cliff
        for y in range(GROUND_Y + 15, H):
            if (x * 3 + y * 7) % 23 == 0 or (y - GROUND_Y) % 11 == 0 and (x // 5) % 3:
                img[y, x, :3] = c_cliff2
    # dithered transition top-light to mid
    for x in range(width):
        if x % 2 == 0:
            img[top + 3, x, :3] = c_top
    # pebbles and cracks
    for k in range(width // 6):
        x = int(r() * width); y = int(top + 5 + r() * 20)
        if y < GROUND_Y + 13:
            img[y, x, :3] = c_dark
            if r() > 0.5 and x + 1 < width:
                img[y, x + 1, :3] = c_dark
                img[y - 1, x, :3] = c_top
    # grass tufts on the rim
    for k in range(width // 14):
        x = int(r() * (width - 4))
        for i, hgt in enumerate((2, 4, 3, 1)):
            for j in range(hgt):
                img[top - j, x + i, :3] = grass if j < hgt - 1 else grass2
                img[top - j, x + i, 3] = 255
    return img


def foreground(width):
    r = _rng(55)
    img = np.zeros((H, width, 4), np.uint8)
    rock = hexc("#4a2a34"); rock_l = hexc("#6a3a3e"); line = hexc("#1e1018")
    x = 0
    while x < width:
        w = int(14 + r() * 26); h = int(6 + r() * 12)
        if r() > 0.45:
            for i in range(w):
                hh = max(1, int(h * math.sin(math.pi * (i + 0.5) / w) ** 0.6))
                y0 = H - hh
                img[y0:, x + i if x + i < width else width - 1, :3] = rock
                img[y0:, min(width - 1, x + i), 3] = 255
                if i < w / 2:
                    img[y0 + 1:y0 + 3, min(width - 1, x + i), :3] = rock_l
                img[y0, min(width - 1, x + i), :3] = line
        x += w + int(r() * 60)
    return img


class Stage:
    def __init__(self):
        self.sky = sky()
        self.far = mountains(3, 112, 34, hexc("#4a2a5a"), hexc("#a0507a"), 600)
        self.mid = mesas(800)
        self.ground = ground(WORLD_W + W)
        self.fore = foreground(WORLD_W + 2 * W)

    def draw(self, frame, camx):
        """camx: integer world x of the screen's left edge. Each layer scrolls by an integer."""
        frame[:] = self.sky
        for layer, k in ((self.far, 0.15), (self.mid, 0.4)):
            off = int(math.floor(camx * k)) % layer.shape[1]
            idx = (np.arange(W) + off) % layer.shape[1]
            band = layer[:, idx]
            a = band[..., 3] > 0
            frame[a] = band[..., :3][a]
        g = self.ground[:, camx:camx + W] if camx >= 0 else np.pad(self.ground, ((0, 0), (-camx, 0), (0, 0)))[:, :W]
        a = g[..., 3] > 0
        frame[a] = g[..., :3][a]

    def draw_fore(self, frame, camx):
        off = int(math.floor(camx * 1.3)) + 40
        f = self.fore[:, max(0, off):max(0, off) + W]
        if f.shape[1] < W:
            return
        a = f[..., 3] > 0
        frame[a] = f[..., :3][a]
