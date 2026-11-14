"""Pikachu frames, drawn on the pixel grid from pose parameters.

Modes: 'stand' (biped 3/4), 'quad' (four-legged run / Volt Tackle), 'ball' (tumble),
'front' (victory, frontal view drawn separately rather than rotating the side sprite).
Facing right is the authored direction; `face=-1` builds the mirrored geometry before shading.
"""
import math
import numpy as np
from raster import Canvas, render, stamp
from palettes import PIKA, PIKA_DET

CELL = (64, 52, 32, 47)  # w, h, pivot x, pivot y


def _rot(x, y, a):
    c, s = math.cos(a), math.sin(a)
    return x * c - y * s, x * s + y * c


def ear(cv, bx, by, ang, length, width, z, f, tip_frac=0.38):
    """Leaf-shaped ear from base (bx,by), angle from vertical (+ = forward)."""
    pts = []
    prof = [(0, width * 0.5), (0.35, width * 0.62), (0.7, width * 0.42), (1.0, 0.0)]
    left, right = [], []
    for t, w in prof:
        lx, ly = _rot(-w, -t * length, ang * f)
        rx, ry = _rot(w, -t * length, ang * f)
        left.append((bx + lx, by + ly)); right.append((bx + rx, by + ry))
    shape = left + right[::-1]
    m = cv.poly(shape)
    # black tip: everything beyond (1 - tip_frac) of the length
    tx, ty = _rot(0, -length * (1 - tip_frac), ang * f)
    nx, ny = _rot(0, -1, ang * f)
    proj = (cv.X - (bx + tx)) * nx + (cv.Y - (by + ty)) * ny
    tip = m & (proj > 0)
    cv.add(z, "ear", m & ~tip, "yellow", shade=1, group="ear%d" % z)
    cv.add(z + 0.01, "eartip", tip, "tip", shade=1, group="ear%d" % z)


def tail(cv, ax, ay, sway, z, f, flat=0.0):
    """Lightning-bolt tail as a zig-zag ribbon with a brown base."""
    path = [(0, 0), (-4, -4), (-2, -7), (-8, -12), (-6, -15), (-13, -22)]
    widths = [1.6, 2.0, 2.0, 2.6, 2.8, 4.6]
    pts = []
    for (x, y) in path:
        x, y = _rot(x, y * (1 - flat), sway)
        pts.append((ax + x * f, ay + y))
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[max(0, i - 1)]; b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1
        nx, ny = -dy / l, dx / l
        w = widths[i]
        left.append((x + nx * w, y + ny * w)); right.append((x - nx * w, y - ny * w))
    m = cv.poly(left + right[::-1])
    base = m & cv.ellipse(ax, ay, 4.2, 4.2)
    cv.add(z, "tail", m & ~base, "yellow", shade=1, group="tail")
    cv.add(z + 0.01, "tailbase", base, "brown", shade=1, group="tail")


def face(col, cv, hx, hy, f, expr, far=True):
    """Eyes, cheeks, nose and mouth stamped as hand-authored pixel clusters."""
    D = PIKA_DET
    def S(x, y, pat):
        if f < 0:
            pat = [r[::-1] for r in pat]
            x = -x - len(pat[0]) + 1
        stamp(col, hx * f + x if f > 0 else hx * f + x, hy + y, pat, D, cv)
    # positions are authored for facing right, relative to head centre
    if expr in ("normal", "determined", "open", "shout"):
        S(0, -2, ["WK", "KK", "KK"])
        if far:
            S(6, -2, ["K", "K"])
        if expr == "determined":
            S(-1, -3, ["KK."])  # lowered brow line on the eye
            if far:
                S(5, -3, ["KK"])
    elif expr == "closed":  # happy ^ ^
        S(-1, -2, [".K.", "K.K"])
        if far:
            S(5, -2, [".K", "K."])
    elif expr == "hurt":  # > <
        S(-1, -2, ["K..", ".KK", "K.."])
        if far:
            S(6, -2, ["K", "K"])
    # cheeks
    S(-1, 1, ["RRR", "rRr"])
    if far:
        S(6, 1, ["RR", "rR"])
    # nose
    S(7, -1, ["N"])
    # mouth
    if expr in ("open", "shout"):
        S(3, 1, ["KKK", "KPK", ".K."] if expr == "open" else ["KKKK", "KMPK", "KMMK", ".KK."])
    elif expr == "hurt":
        S(3, 2, ["KKK"])
    else:
        S(3, 2, ["K.K", ".K."])


def stand(p, f=1):
    """p: bob, lean, tilt, earF, earB, armF, armB, tail, footF, footB, liftF, liftB, expr, squash"""
    cv = Canvas(*CELL)
    g = lambda k, d=0.0: p.get(k, d)
    bob, lean, sq = g("bob"), g("lean"), g("squash")
    # body
    bx, by = lean * 0.4, -7 + bob * 0.5
    body = cv.ellipse(bx * f, by, 6.6 + sq * 0.6, 7.2 - sq * 0.8) | cv.ellipse((bx + 0.5) * f, by + 3, 7.2 + sq, 4.4)
    cv.add(2, "body", body, "yellow", shade=2, hi=1, dither=False)
    # head
    hx, hy = 2 + lean, -18 + bob
    tilt = g("tilt")
    head = cv.ellipse(hx * f, hy, 8.4 + sq * 0.4, 6.8 - sq * 0.3, tilt * f)
    cv.add(5, "head", head, "yellow", shade=2, hi=1, dither=True)
    # ears (far ear behind head, near ear in front)
    ear(cv, (hx + 2.5) * f, hy - 4.5, g("earB", -0.25), 11.5, 4.2, 1, f)
    ear(cv, (hx - 1.5) * f, hy - 4.8, g("earF", -0.05), 12, 4.6, 6, f)
    # tail behind body
    tail(cv, (bx - 5.5) * f, by + 2, g("tail", 0.0), 0, f)
    # feet
    cv.add(3, "footB", cv.ellipse((g("footB", -2.5)) * f, -1.4 - g("liftB"), 3.0, 1.7), "yellow", shade=1)
    cv.add(4, "footF", cv.ellipse((g("footF", 3.0)) * f, -1.2 - g("liftF"), 3.3, 1.8), "yellow", shade=1)
    # arms
    for name, ang, z, sx in (("armB", g("armB", 0.6), 1.5, 4.5), ("armF", g("armF", 0.9), 7, 2.5)):
        sx_, sy_ = (bx + sx) * f, by - 3
        ex, ey = _rot(0, 5.5, -ang * f)
        cv.add(z, name, cv.capsule(sx_, sy_, sx_ + ex, sy_ + ey, 1.6, 1.4), "yellow", shade=1)
    col = render(cv, PIKA)
    # back stripes
    stamp(col, (bx - 5) * f if f > 0 else (bx - 5) * f - 2, by - 3, ["BB", ".BB"] if f > 0 else ["BB.", ".BB"][::1], PIKA_DET, cv)
    face(col, cv, hx, hy, f, g("expr", "normal"))
    return col


def quad(p, f=1):
    """Four-legged run. p: phase (0..1), stretch, expr, earsBack"""
    cv = Canvas(*CELL)
    ph = p.get("phase", 0.0) * 2 * math.pi
    st = p.get("stretch", 0.0)
    bob = -abs(math.sin(ph)) * 2.0
    bx, by = 0, -8 + bob
    body = cv.ellipse(bx * f, by, 9.5 + st, 5.2 - st * 0.3)
    cv.add(2, "body", body, "yellow", shade=2, hi=1)
    hx, hy = 10 + st * 0.6, -12 + bob * 0.7
    cv.add(5, "head", cv.ellipse(hx * f, hy, 7.6, 6.2, 0.15 * f), "yellow", shade=2, hi=1, dither=True)
    eb = p.get("earsBack", 1.15)
    ear(cv, (hx + 1.0) * f, hy - 4, -eb, 11.5, 4.0, 1, f)
    ear(cv, (hx - 2.5) * f, hy - 4.2, -eb - 0.12, 12, 4.4, 6, f)
    tail(cv, (bx - 9) * f, by - 1, -1.15 + math.sin(ph) * 0.12, 0, f, flat=0.25)
    # legs: front pair and back pair, opposite phases
    for i, (lx, ph0, z) in enumerate(((6, 0, 1.5), (7.5, math.pi * 0.25, 7), (-6, math.pi, 1.4), (-4.5, math.pi * 1.25, 6.5))):
        a = math.sin(ph + ph0)
        fx, fy = lx + a * p.get("stride", 6.5), -1.2 - max(0, -math.cos(ph + ph0)) * 3
        sx, sy = lx * 0.8, by + 2
        cv.add(z, "leg%d" % i, cv.capsule(sx * f, sy, fx * f, fy, 1.9, 1.5), "yellow", shade=1)
    col = render(cv, PIKA)
    stamp(col, (bx - 2) * f - (2 if f < 0 else 0), by - 5, ["B.B", "B.B"], PIKA_DET, cv)
    face(col, cv, hx - 1, hy, f, p.get("expr", "determined"))
    return col


def ball(p, f=1):
    """Tumbling curl, re-drawn for each rotation step (parts re-placed around the centre)."""
    cv = Canvas(*CELL)
    a = p.get("angle", 0.0)
    cx, cy = 0, -9
    R = lambda x, y: _rot(x, y, a)
    cv.add(2, "body", cv.ellipse(cx, cy, 8.2, 7.6), "yellow", shade=2, hi=1)
    hx, hy = R(3.5, -2.5)
    hx, hy = cx + hx * f, cy + hy
    cv.add(4, "head", cv.ellipse(hx, hy, 6.4, 5.6, a * f), "yellow", shade=2, hi=1)
    ex, ey = R(-1.5, -4.5)
    ear(cv, hx + ex * f, hy + ey, (a - 1.2), 10, 3.8, 5, f)
    tx, ty = R(-6.5, 3.5)
    tail(cv, cx + tx * f, cy + ty, a + 1.9, 0, f, flat=0.15)
    col = render(cv, PIKA)
    fx, fy = R(5.5, -1.5)
    if math.cos(a) > 0.2:
        face(col, cv, (hx + fx * 0.4 * f - 3 * f) * f, hy + fy * 0.4, f, "hurt", far=False)
    return col


def front(p, f=1):
    """Front view (victory): arms raised alternately, both cheeks visible."""
    cv = Canvas(*CELL)
    bob = p.get("bob", 0.0)
    cv.add(2, "body", cv.ellipse(0, -7 + bob * 0.5, 7, 7.2) | cv.ellipse(0, -4 + bob * 0.5, 7.8, 4.4), "yellow", shade=2, hi=1)
    hy = -18 + bob
    cv.add(5, "head", cv.ellipse(0, hy, 8.8, 7.0), "yellow", shade=2, hi=1, dither=True)
    ear(cv, -5, hy - 4, -0.38 + p.get("earL", 0), 12, 4.4, 4, 1)
    ear(cv, 5, hy - 4, 0.38 + p.get("earR", 0), 12, 4.4, 4.1, 1)
    tail(cv, -4, -9, -0.5 + p.get("tail", 0), 0, 1)
    cv.add(3, "footL", cv.ellipse(-3.5, -1.3, 3.0, 1.7), "yellow", shade=1)
    cv.add(3, "footR", cv.ellipse(3.5, -1.3, 3.0, 1.7), "yellow", shade=1)
    for sx, ang, z in ((-5, p.get("armL", 0.5), 6), (5, p.get("armR", -0.5), 6.1)):
        ex, ey = _rot(0, 6, ang)
        cv.add(z, "arm", cv.capsule(sx, -11 + bob, sx + ex, -11 + bob + ey, 1.6, 1.5), "yellow", shade=1)
    col = render(cv, PIKA)
    D = PIKA_DET
    e = p.get("expr", "closed")
    if e == "closed":
        stamp(col, -5, hy - 2, [".K.", "K.K"], D, cv); stamp(col, 3, hy - 2, [".K.", "K.K"], D, cv)
    else:
        stamp(col, -4, hy - 2, ["WK", "KK", "KK"], D, cv); stamp(col, 3, hy - 2, ["KW", "KK", "KK"], D, cv)
    stamp(col, -8, hy + 1, ["RRR", "rRr"], D, cv); stamp(col, 6, hy + 1, ["RRR", "rRr"], D, cv)
    stamp(col, 0, hy, ["N"], D, cv)
    stamp(col, -2, hy + 2, ["KKKK", "KMPK", ".KK."], D, cv)
    return col


BUILDERS = {"stand": stand, "quad": quad, "ball": ball, "front": front}


def frame(mode, p, f=1):
    return BUILDERS[mode](p, f)
