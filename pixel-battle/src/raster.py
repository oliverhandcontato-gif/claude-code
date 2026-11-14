"""Pixel rasterizer for procedurally *drawn* sprite frames.

Every frame is rebuilt from its pose on the pixel grid (no rotating/stretching of finished
bitmaps): parts are rasterized without anti-aliasing, cel-shaded by a pixel-shift light test,
optionally dithered on the shadow border, outlined (selective outline), then cleaned
(pixel-perfect outline corners, orphan pixel removal).
"""
import numpy as np
from PIL import Image, ImageDraw

LIGHT = (-1, -1)  # direction toward the key light on the pixel grid (top-left)


class Canvas:
    """A sprite cell. Coordinates are relative to the pivot (feet), +y down."""

    def __init__(self, w, h, px, py):
        self.w, self.h, self.px, self.py = w, h, px, py
        self.parts = []  # (z, name, mask, mat, opts)
        yy, xx = np.mgrid[0:h, 0:w]
        self.X = xx + 0.5 - px
        self.Y = yy + 0.5 - py

    # ---- primitives (return masks) ----
    def ellipse(self, cx, cy, rx, ry, rot=0.0):
        c, s = np.cos(rot), np.sin(rot)
        dx, dy = self.X - cx, self.Y - cy
        u = (dx * c + dy * s) / max(rx, 0.3)
        v = (-dx * s + dy * c) / max(ry, 0.3)
        return u * u + v * v <= 1.0

    def poly(self, pts):
        im = Image.new("1", (self.w, self.h), 0)
        ImageDraw.Draw(im).polygon([(x + self.px - 0.5, y + self.py - 0.5) for x, y in pts], fill=1, outline=1)
        return np.array(im, dtype=bool)

    def capsule(self, ax, ay, bx, by, ra, rb=None):
        rb = ra if rb is None else rb
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy or 1e-6
        t = np.clip(((self.X - ax) * dx + (self.Y - ay) * dy) / L2, 0, 1)
        px, py = ax + t * dx, ay + t * dy
        r = ra + (rb - ra) * t
        return (self.X - px) ** 2 + (self.Y - py) ** 2 <= r * r

    def chain(self, pts, radii):
        m = np.zeros((self.h, self.w), bool)
        for i in range(len(pts) - 1):
            m |= self.capsule(*pts[i], *pts[i + 1], radii[i], radii[i + 1])
        return m

    def add(self, z, name, mask, mat, **opts):
        self.parts.append((z, name, mask, mat, opts))
        return mask


def shift(m, dx, dy):
    """Shift a mask by integer pixels (outside -> False)."""
    out = np.zeros_like(m)
    h, w = m.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = m[ys0:ys1, xs0:xs1]
    return out


def mirror_parts(cv):
    """Mirror geometry horizontally around the pivot (before shading, so light stays top-left)."""
    new = []
    for z, n, m, mat, o in cv.parts:
        mm = m[:, ::-1]
        # pivot column must map onto itself: shift if the cell is not symmetric around px
        off = (cv.w - cv.px) - cv.px
        if off:
            mm = shift(mm, -off, 0)
        new.append((z, n, mm, mat, o))
    cv.parts = new


def render(cv, pal, light=LIGHT, outline_col="outline"):
    """Compose parts into an RGBA array using palette dict pal[mat] = {base, shade, deep, hi, line}."""
    h, w = cv.h, cv.w
    parts = sorted(cv.parts, key=lambda p: p[0])
    col = np.zeros((h, w, 4), np.uint8)
    owner = -np.ones((h, w), int)
    zmap = np.full((h, w), -1e9)
    lx, ly = light
    for idx, (z, name, m, mat, o) in enumerate(parts):
        p = pal[mat]
        d = o.get("shade", 2)
        lit = m & shift(m, lx * d, ly * d)  # moving away from light stays inside -> lit
        tone = np.where(lit, 1, 0)
        if o.get("deep", 0):
            dd = o["deep"]
            deep = m & ~shift(m, lx * dd, ly * dd)
            tone = np.where(deep & ~lit, -1, tone)
        if o.get("hi", 0):
            hh = o["hi"]
            hi = m & ~shift(m, -lx * hh, -ly * hh)
            tone = np.where(hi & lit, 2, tone)
        if o.get("dither", False):
            band = m & lit & ~shift(m, lx * (d + 1), ly * (d + 1))
            yy, xx = np.mgrid[0:h, 0:w]
            checker = ((xx + yy) % 2) == 0
            tone = np.where(band & checker, 0, tone)
        if o.get("flat", False):
            tone = np.where(m, 1, tone)
        rgb = {-1: p["deep"], 0: p["shade"], 1: p["base"], 2: p.get("hi", p["base"])}
        for t, c in rgb.items():
            sel = m & (tone == t)
            col[sel, :3] = c
            col[sel, 3] = 255
        owner[m] = idx
        zmap[m] = z
    # ---- internal outlines: where a part meets a lower part (not merged groups) ----
    inner = np.zeros((h, w), bool)
    inner_col = np.zeros((h, w, 3), np.uint8)
    for idx, (z, name, m, mat, o) in enumerate(parts):
        if o.get("noline"):
            continue
        visible = owner == idx
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb_owner = shift_int(owner, dx, dy)
            nb_z = shift_float(zmap, dx, dy)
            edge = visible & (nb_owner >= 0) & (nb_owner != idx) & (nb_z < z)
            if o.get("group"):
                grp = o["group"]
                same = np.zeros_like(edge)
                for j, pj in enumerate(parts):
                    if pj[4].get("group") == grp:
                        same |= nb_owner == j
                edge &= ~same
            inner |= edge
            inner_col[edge] = pal[mat]["line"]
    col[inner, :3] = inner_col[inner]
    # ---- outer silhouette outline (sel-out: colored by the adjacent material) ----
    solid = col[:, :, 3] > 0
    outer = np.zeros((h, w), bool)
    outer_col = np.zeros((h, w, 3), np.uint8)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = shift(solid, dx, dy) & ~solid
        nb_owner = shift_int(owner, dx, dy)
        for idx, (z, name, m, mat, o) in enumerate(parts):
            sel = nb & (nb_owner == idx) & ~outer
            if o.get("noline"):
                continue
            outer_col[sel] = pal[mat]["line"] if (dx, dy) in ((-1, 0), (0, -1)) and o.get("soft_top") else pal[mat].get("edge", pal[mat]["line"])
            outer |= sel
    outer = pixel_perfect(outer)
    col[outer, :3] = outer_col[outer]
    col[outer, 3] = 255
    col = clean_orphans(col)
    return col


def shift_int(a, dx, dy):
    out = -np.ones_like(a)
    h, w = a.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def shift_float(a, dx, dy):
    out = np.full_like(a, -1e9)
    h, w = a.shape
    xs0, xs1 = max(0, -dx), min(w, w - dx)
    ys0, ys1 = max(0, -dy), min(h, h - dy)
    out[ys0 + dy:ys1 + dy, xs0 + dx:xs1 + dx] = a[ys0:ys1, xs0:xs1]
    return out


def pixel_perfect(m):
    """Remove L-shaped corner pixels from 1px outlines (keeps lines one pixel wide)."""
    m = m.copy()
    h, w = m.shape
    for _ in range(2):
        N = shift(m, 0, 1); S = shift(m, 0, -1); E = shift(m, -1, 0); W = shift(m, 1, 0)
        corner = m & ((N & E & ~S & ~W) | (N & W & ~S & ~E) | (S & E & ~N & ~W) | (S & W & ~N & ~E))
        # only remove when the diagonal also exists (the corner is redundant)
        NE = shift(m, -1, 1); NW = shift(m, 1, 1); SE = shift(m, -1, -1); SW = shift(m, 1, -1)
        red = corner & ~(NE | NW | SE | SW)
        # alternate removals to avoid gaps
        yy, xx = np.mgrid[0:h, 0:w]
        m &= ~(red & ((xx + yy) % 2 == 0))
    return m


def clean_orphans(col):
    """Replace isolated single pixels (all 4 neighbours share another colour) with that colour."""
    rgba = col.astype(np.int32)
    key = (rgba[:, :, 0] << 24) | (rgba[:, :, 1] << 16) | (rgba[:, :, 2] << 8) | rgba[:, :, 3]
    out = col.copy()
    N = shift_int(key, 0, 1); S = shift_int(key, 0, -1); E = shift_int(key, -1, 0); W = shift_int(key, 1, 0)
    iso = (N == S) & (S == E) & (E == W) & (N != key) & (N != -1) & (key != 0) & (N != 0)
    ys, xs = np.nonzero(iso)
    for y, x in zip(ys, xs):
        out[y, x] = out[y - 1, x]
    return out


def stamp(col, x, y, pattern, colors, cv):
    """Draw a small hand-authored pixel pattern (list of strings) at pivot-relative x,y."""
    ox, oy = int(round(x + cv.px)), int(round(y + cv.py))
    for j, row in enumerate(pattern):
        for i, ch in enumerate(row):
            if ch == "." or ch == " ":
                continue
            yy, xx = oy + j, ox + i
            if 0 <= yy < cv.h and 0 <= xx < cv.w:
                c = colors[ch]
                col[yy, xx, :3] = c
                col[yy, xx, 3] = 255


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mat(base, shade, deep, hi, line, edge=None):
    d = dict(base=hexc(base), shade=hexc(shade), deep=hexc(deep), hi=hexc(hi), line=hexc(line))
    d["edge"] = hexc(edge) if edge else d["line"]
    return d
