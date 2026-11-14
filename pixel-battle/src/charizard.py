"""Charizard frames, drawn on the pixel grid from pose parameters (authored facing right).

Pose keys: bob, lean, neck, tilt, jaw (0..1), wing (-1 up .. 1 down), wingSpread, armF, armB,
tail, flame (int flicker frame), expr ('normal','angry','hurt','ko','roar'), fly (0..1 legs tucked),
rot (whole-body tilt for falls/dives, radians).
"""
import math
from raster import Canvas, render, stamp
from palettes import ZARD, ZARD_DET

CELL = (136, 120, 68, 112)


def _rot(x, y, a):
    c, s = math.cos(a), math.sin(a)
    return x * c - y * s, x * s + y * c


class Geo:
    """Pose space -> cell space transform (facing + whole body tilt about the hips)."""

    def __init__(self, f, rot, ox=0, oy=0, pivot=(0, -30)):
        self.f, self.rot, self.ox, self.oy, self.pv = f, rot, ox, oy, pivot

    def p(self, x, y):
        x, y = _rot(x - self.pv[0], y - self.pv[1], self.rot)
        return (x + self.pv[0] + self.ox) * self.f, y + self.pv[1] + self.oy

    def a(self, ang):
        return (ang + self.rot) * self.f


def frame(p, f=1):
    g = lambda k, d=0.0: p.get(k, d)
    cv = Canvas(*CELL)
    G = Geo(f, g("rot"), g("ox"), g("oy"))
    E = lambda x, y, rx, ry, r=0.0: cv.ellipse(*G.p(x, y), rx, ry, G.a(r))
    C = lambda pts, rad: cv.chain([G.p(*q) for q in pts], rad)
    PL = lambda pts: cv.poly([G.p(*q) for q in pts])
    bob, lean, fly = g("bob"), g("lean"), g("fly")

    # ---- tail (behind everything) ----
    ts = g("tail")
    tail_pts = [(-8, -26 + bob)]
    for i, (dx, dy) in enumerate(((-11, 6), (-11, -2), (-7, -9), (-3, -9))):
        x, y = tail_pts[-1]
        rx, ry = _rot(dx, dy, ts * (i + 1) * 0.25)
        tail_pts.append((x + rx, y + ry))
    cv.add(0, "tail", C(tail_pts, [7.5, 6, 4.6, 3.6, 3.0]), "orange", shade=3, hi=1, dither=True)
    tip = tail_pts[-1]

    # ---- far wing (behind body) and near wing ----
    def wing(z, root, flap, spread, tint):
        """Bat wing: arm and forearm sweep up-back, fingers radiate down toward the back.
        Rebuilt per pose (flap rotates the bone chain about the root before rasterizing)."""
        rx, ry = root
        D = math.radians
        rotw = D(48) * flap
        def P(ang, ln, base):
            a = D(ang) + rotw
            return (base[0] + math.cos(a) * ln * spread, base[1] + math.sin(a) * ln * spread)
        j1 = P(-128, 17, root)
        j2 = P(-160 + 10 * flap, 15, j1)
        tips = [P(a, ln, j2) for a, ln in ((98, 27), (66, 25), (34, 19))]
        memb = [root, j1, j2] + tips + [(rx + 2, ry + 9)]
        m = PL(memb)
        cv.add(z, "wing_m", m, "teal" if tint else "orange", shade=2, dither=True, group="wing%d" % z)
        bone = C([root, j1, j2], [3.0, 2.4, 1.8])
        for t in tips:
            bone |= C([j2, t], [1.3, 0.6])
        cv.add(z + 0.01, "wing_b", bone, "orange", shade=1, group="wing%d" % z)

    wf, sp = g("wing"), g("wingSpread", 1.0)
    wing(-1, (1 + lean, -51 + bob), wf * 0.85 - 0.15, sp * 0.9, True)

    # ---- legs ----
    leg_b = (-5 + lean * 0.2, -16 + bob * 0.4)
    leg_f = (5 + lean * 0.2, -15 + bob * 0.4)
    for z, (lx, ly), side in ((1, leg_b, -1), (4, leg_f, 1)):
        thigh = E(lx, ly - fly * 6, 8.0, 9.5, 0.2)
        fx = lx + 3 + fly * 4 * side
        fy = -2 - fly * 8
        shin = C([(lx + 1, ly + 3 - fly * 6), (fx, fy)], [5.5, 3.6])
        foot = E(fx + 3, fy + 0.8 - fly * 0, 6.5, 2.6, fly * 0.6)
        cv.add(z, "leg", thigh | shin | foot, "orange", shade=2, hi=1, group="leg%d" % z)
        claws = PL([(fx + 8, fy), (fx + 11, fy + 2), (fx + 7, fy + 2)]) | PL([(fx + 4, fy + 1), (fx + 7, fy + 3), (fx + 3, fy + 3)])
        cv.add(z + 0.02, "claw", claws, "ivory", shade=1)

    # ---- torso + belly ----
    tx, ty = 0 + lean, -36 + bob
    torso = E(tx, ty, 13.5, 19, 0.12 + lean * 0.02)
    cv.add(2, "torso", torso, "orange", shade=4, hi=1, dither=True, group="body")
    belly = torso & E(tx + 5.5, ty + 3, 9, 16, 0.12)
    cv.add(2.5, "belly", belly, "cream", shade=3, dither=True)

    # ---- neck + head ----
    neck_a = g("neck")  # + forward/down, - up/back
    n0 = (tx + 6, ty - 13)
    nx, ny = _rot(0, -12, 0.45 + neck_a)
    n1 = (n0[0] + nx, n0[1] + ny)
    cv.add(3, "neck", C([n0, n1], [6.5, 5.2]), "orange", shade=3, hi=1, group="body")
    cv.add(3.1, "neckbelly", C([(n0[0] + 3, n0[1] + 2), (n1[0] + 2.5, n1[1] + 2)], [3.6, 2.8]) & C([n0, n1], [6.5, 5.2]), "cream", shade=2)
    tilt = g("tilt") + neck_a * 0.6
    hx, hy = n1[0] + 3, n1[1] - 4
    jaw = g("jaw")
    sn = _rot(8.5, 0.5, tilt)
    head = E(hx, hy, 8.2, 6.8, tilt) | E(hx + sn[0], hy + sn[1], 6.2, 3.6, tilt)
    cv.add(8, "head", head, "orange", shade=3, hi=1, dither=True)
    # lower jaw hinged under the head
    jh = _rot(2, 3.5, tilt)
    ja = tilt + jaw * 0.75
    jc = _rot(7, 1.2, ja)
    jaw_m = E(hx + jh[0] + jc[0], hy + jh[1] + jc[1], 6.2, 2.4, ja)
    cv.add(7.9, "jaw", jaw_m, "cream", shade=1)
    if jaw > 0.12:
        mouth = PL([(hx + jh[0], hy + jh[1]), (hx + jh[0] + _rot(13, 0, tilt)[0], hy + jh[1] + _rot(13, 0, tilt)[1] + 0.5),
                    (hx + jh[0] + _rot(12, 0, ja)[0], hy + jh[1] + _rot(12, 0, ja)[1] + 1.5)])
        cv.add(8.05, "mouth", mouth, "flame" if g("fire") else "maw", flat=True, noline=True)
    # horns
    for k, (bx, by, ln, w) in enumerate(((-3, -5, 9, 2.6), (-5, -2, 7, 2.2))):
        b = _rot(bx, by, tilt)
        t = _rot(bx - ln, by - ln * 0.55, tilt)
        cv.add(7.5 - k * 0.1, "horn", C([(hx + b[0], hy + b[1]), (hx + t[0], hy + t[1])], [w, 0.5]), "orange", shade=1)

    # ---- arms ----
    for z, sh, ang, ln in ((1.5, (tx + 6, ty - 8), g("armB", 0.4), 0.9), (6, (tx + 9, ty - 7), g("armF", 0.5), 1.0)):
        e = (sh[0] + math.sin(ang) * 8 * ln, sh[1] + math.cos(ang) * 8 * ln)
        h = (e[0] + math.sin(ang + 1.3) * 6 * ln, e[1] + math.cos(ang + 1.3) * 6 * ln)
        cv.add(z, "arm", C([sh, e, h], [3.6, 3.0, 2.4]), "orange", shade=2, group="arm%d" % z)
        cl = C([h, (h[0] + math.sin(ang + 1.7) * 4, h[1] + math.cos(ang + 1.7) * 4)], [1.2, 0.4])
        cv.add(z + 0.01, "claw", cl, "ivory", shade=0, flat=True)

    wing(5, (-2 + lean, -49 + bob), wf, sp, False)

    col = render(cv, ZARD)

    # ---- tail flame (no outline, hand-tuned flicker) ----
    fl = int(g("flame", 0))
    fx, fy = G.p(*tip)
    shapes = [((0, 0), (6.5, 9)), ((0.5, 1.5), (4.6, 6.5)), ((0.5, 3), (2.6, 3.8))]
    cols = [ZARD_DET["R"], ZARD_DET["O"], ZARD_DET["Y"]]
    jitter = [(0, 0), (1, -1), (-1, 0), (0, 1)][fl % 4]
    big = 1.0 + 0.15 * ((fl * 7) % 3) / 2 + g("flameBoost") * 0.6
    for (dx, dy), (rx, ry) in [(s[0], s[1]) for s in shapes]:
        pass
    for i, ((dx, dy), (rx, ry)) in enumerate(shapes):
        m = cv.ellipse(fx + dx * f + jitter[0] * (i == 0), fy - ry * big * 0.6 + dy + jitter[1], rx * big, ry * big)
        m &= cv.Y < fy + 3
        col[m, :3] = cols[i]
        col[m, 3] = 255
    # flickering tongues
    for k in range(3):
        if (fl + k) % 3 == 0:
            tx2 = int(round(fx + (k - 1) * 3)) + cv.px
            ty2 = int(round(fy - 9 * big - (k == 1) * 3)) + cv.py
            for j in range(3):
                if 0 <= ty2 + j < cv.h and 0 <= tx2 < cv.w:
                    col[ty2 + j, tx2, :3] = cols[0] if j == 0 else cols[1]
                    col[ty2 + j, tx2, 3] = 255

    # ---- eye ----
    ex, ey = G.p(hx + _rot(2.5, -2, tilt)[0], hy + _rot(2.5, -2, tilt)[1])
    expr = g("expr", "normal")
    pats = {
        "normal": ["DDD.", "WWK.", ".KK."],
        "angry": ["DDDD", ".WK.", ".KK."],
        "roar": ["DDDD", ".WWK", "..K."],
        "hurt": ["D..D", ".DD.", "D..D"],
        "ko": ["D.D.", ".D..", "D.D."],
    }
    pat = pats.get(expr, pats["normal"])
    if f < 0:
        pat = [r[::-1] for r in pat]
        ex -= len(pat[0]) - 1
    stamp(col, ex - 1, ey - 1, pat, ZARD_DET, cv)
    # nostril
    nx2, ny2 = G.p(hx + _rot(13, -1.5, tilt)[0], hy + _rot(13, -1.5, tilt)[1])
    stamp(col, nx2, ny2, ["D"], ZARD_DET, cv)
    return col


def mouth(p, f=-1):
    """Pivot-relative mouth point for a pose (same maths as frame())."""
    g = lambda k, d=0.0: p.get(k, d)
    G = Geo(f, g("rot"), g("ox"), g("oy"))
    tx, ty = g("lean"), -36 + g("bob")
    n0 = (tx + 6, ty - 13)
    nx, ny = _rot(0, -12, 0.45 + g("neck"))
    n1 = (n0[0] + nx, n0[1] + ny)
    tilt = g("tilt") + g("neck") * 0.6
    hx, hy = n1[0] + 3, n1[1] - 4
    m = _rot(14.5, 2.5, tilt)
    return G.p(hx + m[0], hy + m[1])
