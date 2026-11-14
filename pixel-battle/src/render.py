"""Renders the battle at the internal resolution (384x216), scales by an integer factor with
nearest-neighbour, and pipes raw frames to ffmpeg. Deterministic: frame = f(tick).

usage: python src/render.py [--scale 5] [--out out/pikachu_vs_charizard.mp4] [--png DIR]
       [--from TICK --to TICK] [--sheet times...]
"""
import argparse
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import fx
import scene as S
import sprites
from font import text, width
from stage import Stage, W, H, GROUND_Y, WORLD_W
import charizard as CZ
from raster import hexc

STAGE = Stage()
PA, ZA = sprites.load_all(os.path.join(os.path.dirname(__file__), "..", "out", "sheets"))
SHADOW = np.array(hexc("#7a4a3a"), np.uint8)


ARENA_K = 0.78  # horizontal compression of the choreography space onto the visible arena


def X(x):
    return 160 + (x - 160) * ARENA_K


def cam_x(t):
    """Smoothed integer camera (deterministic low-pass over the target path)."""
    acc, wsum = 0.0, 0.0
    for k in range(30):
        tt = max(0.0, t - k * 0.02)
        _, _, px, _ = S.track_at(S.PIKA, tt)
        _, _, zx, _ = S.track_at(S.ZARD, tt)
        w = math.exp(-k * 0.12)
        acc += (X(S.camera_center(tt, px, zx)) + 14) * w
        wsum += w
    c = acc / wsum
    return int(max(0, min(WORLD_W - W, round(c - W / 2))))


def pika_cheek(state, lt, x, y):
    if state is None:
        return None
    e = PA.entry(state, int(lt * 60))
    p = e["params"]
    if e["mode"] == "stand":
        return x + 3 + p.get("lean", 0), y - 16 + p.get("bob", 0)
    if e["mode"] == "quad":
        return x + 10 + p.get("stretch", 0) * 0.6, y - 10
    if e["mode"] == "front":
        return x + 7, y - 17
    return x, y - 9


def zard_mouth(state, lt, x, y):
    e = ZA.entry(state, int(lt * 60))
    mx, my = CZ.mouth(e["params"], -1)
    return x + mx, y + my


def ellipse_shadow(fr, cx, cy, rx, ry, dither=None):
    yy, xx = np.mgrid[0:H, 0:W]
    m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    if dither is not None:
        m &= ((xx + yy) % 2) == dither
    fr[m] = (fr[m].astype(np.int32) * 0.62).astype(np.uint8)


def blit_actor(fr, anim, state, lt, x, y, camx, extra=None):
    img = anim.at(state, int(lt * 60))
    cw, ch, pvx, pvy = anim.cell
    sx, sy = x - camx - pvx, GROUND_Y + y - pvy
    if extra:
        extra(img, sx, sy)
    fx.blit(fr, img, sx, sy)
    return img, sx, sy


def render_tick(tick):
    t, frozen, fz = S.story_time(tick)
    fr = np.zeros((H, W, 3), np.uint8)
    ps, plt, px, py = S.track_at(S.PIKA, t)
    zs, zlt, zx, zy = S.track_at(S.ZARD, t)
    px, zx = int(round(X(px))), int(round(X(zx)))
    camx = cam_x(t)
    STAGE.draw(fr, camx)
    step2, step3 = int(t * 30), int(t * 20)  # FX drawing rates (on 2s / on 3s)
    # choreography space -> screen (compressed); actor-derived points use scr
    sc = lambda wx, wy: (int(round(X(wx))) - camx, int(GROUND_Y + wy))
    scr = lambda ax, ay: (int(round(ax)) - camx, int(round(GROUND_Y + ay)))

    # ---- shadows ----
    if zs:
        h = -zy
        ellipse_shadow(fr, zx - camx + 4, GROUND_Y, max(10, 30 - h * 0.12), max(2, 5 - h * 0.02), None if h < 20 else 0)
    if ps:
        h = -py
        ellipse_shadow(fr, px - camx, GROUND_Y, max(5, 11 - h * 0.08), 2, None if h < 8 else 1)

    # ---- effects behind actors ----
    # scorch / fireball impacts
    for (tb, gx) in ((14.75, 176), (15.4, 226), (16.05, 258)):
        if t >= tb:
            fx.explosion(fr, *sc(gx, -6), int((t - tb) * 60), 0.9, seed=gx)
    if 9.85 <= t < 12.5:
        fx.explosion(fr, *sc(168, -6), int((t - 9.85) * 60), 0.8, seed=3)

    # ---- Charizard ----
    if zs:
        blit_actor(fr, ZA, zs, zlt, zx, zy, camx,
                   extra=(lambda img, sx, sy: fx.blit(fr, img, sx, sy, tint=fx.C["white"])) if (11.9 <= t < 12.5 and step2 % 2 == 0) or (30.0 <= t < 30.4 and step2 % 2 == 0) else None)
        if (11.9 <= t < 12.5 and step2 % 2 == 0) or (30.0 <= t < 30.45 and step2 % 2 == 0):
            img = ZA.at(zs, int(zlt * 60))
            fx.blit(fr, img, zx - camx - ZA.cell[2], GROUND_Y + zy - ZA.cell[3], tint=fx.C["y0"], dither=step2 % 2)
    zbody = scr(zx - 6, zy - 40)

    # ---- Volt Tackle afterimages & aura (behind Pikachu) ----
    volt = ps in ("run", "volt", "voltLeap") and 27.3 <= t < 30.0
    vs = S.clamp((t - 27.3) / 1.6)
    if volt and t > 28.0:
        for k, d in enumerate((0.09, 0.18)):
            s2, l2, x2, y2 = S.track_at(S.PIKA, t - d)
            x2 = int(round(X(x2)))
            img = PA.at(s2, int(l2 * 60))
            fx.blit(fr, img, x2 - camx - PA.cell[2], GROUND_Y + y2 - PA.cell[3], tint=fx.C["y2" if k else "y1"], dither=(step2 + k) % 2)
        for k in range(5):
            gx = px - 8 - k * 9 - (step2 % 3) * 2
            fx.sparks(fr, *scr(gx, -1), step3 * 5 + k, r=5, n=1)

    # Volt Tackle bursting through the flamethrower (fire drawn behind Pikachu)
    if 28.6 <= t < 29.85:
        mx, my = zard_mouth(zs, zlt, zx, zy)
        u = S.clamp((t - 28.6) / 0.25)
        stop = px + 10
        fx.fire_stream(fr, *scr(mx, my), *scr(stop, -8), step2, prog=u, seed=5, width=0.75)
        if u >= 1:
            for k in range(6):
                a = (k / 6 - 0.5) * 2.4 + math.pi
                fx.put(fr, *scr(stop + math.cos(a) * (6 + step2 % 4 * 2) * -1, -10 + math.sin(a) * 14), fx.C["f1"])
            fx.sparks(fr, *scr(stop, -10), step3 * 3, r=10, n=3)
    # ---- Pikachu ----
    if ps:
        img = PA.at(ps, int(plt * 60))
        sx, sy = px - camx - PA.cell[2], GROUND_Y + py - PA.cell[3]
        if volt and vs > 0:
            fx.aura(fr, img, sx, sy, step2, vs)
        hurtflash = (23.6 <= t < 23.9 and step2 % 2 == 0)
        fx.blit(fr, img, sx, sy, tint=fx.C["white"] if hurtflash else None)
        if volt and vs > 0.3:
            m = img[..., 3] > 0
            yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
            glint = m & (((xx * 3 + yy + step2 * 2) % 9) == 0)
            fx.blit(fr, img, sx, sy, tint=fx.C["y0"], mask_only=glint)
    cheek = pika_cheek(ps, plt, px, py)

    # cheek sparks
    if ps in ("ready", "charge", "zap", "volt", "run") and cheek and t > 8.0:
        n = 1 if ps == "ready" else 2
        if ps == "run" and not volt:
            n = 0
        if n and (step3 % 2 == 0 or ps != "ready"):
            fx.sparks(fr, *scr(*cheek), step3 * 3 + 1, r=6, n=n)
    if ps == "getup" and t > 26.0:
        k = S.clamp((t - 26.0) / 1.0)
        fx.sparks(fr, *scr(*cheek), step3 * 7, r=6 + 6 * k, n=1 + int(3 * k))
        if t > 26.5 and step3 % 2 == 0:
            for j in range(2):
                a = (step3 * 1.7 + j * 3.1)
                fx.bolt(fr, *scr(px, -40 - 20 * j), *scr(px + math.cos(a) * 14, -6), step3 * 9 + j, amp=3, branches=0)

    # ---- attacks ----
    if zs in ("breath",) and (9.5 <= t < 10.7):
        u = S.clamp((t - 9.5) / 0.3)
        mx, my = zard_mouth(zs, zlt, zx, zy)
        fx.fire_stream(fr, *scr(mx, my), *sc(168, -8), step2, prog=u * (1 - S.clamp((t - 10.55) / 0.15)), seed=1)
    if 11.8 <= t < 12.65 and cheek:
        tgt = scr(zx - 6, zy - 38)
        if step3 % 4 != 3:
            fx.bolt(fr, *scr(*cheek), *tgt, step3, thick=2, amp=8)
        if t < 12.05:
            fx.bolt(fr, tgt[0] + 6, -5, tgt[0], tgt[1] - 6, step3 + 50, thick=2, amp=10, branches=3)
        fx.sparks(fr, *tgt, step3 * 11, r=14, n=4)
    # fireballs from the air
    for (tl, gx) in ((14.3, 176), (14.95, 226), (15.6, 258)):
        if tl <= t < tl + 0.45:
            u = (t - tl) / 0.45
            _, _, zx2, zy2 = S.track_at(S.ZARD, tl)
            mx, my = zard_mouth("fly", 0, X(zx2), zy2)
            x0, y0 = scr(mx, my)
            x1, y1 = sc(gx, -6)
            fx.fireball(fr, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 4, step2, x1 - x0, y1 - y0)
    # electro ball vs dragon claw
    if 16.95 <= t < 17.62:
        u = (t - 16.95) / 0.67
        x0, y0 = sc(270 + 6, -14)
        x1, y1 = sc(434, -126)
        fx.electro_ball(fr, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - 22 * math.sin(math.pi * u), 4 + u * 2, step2)
    if 17.55 <= t < 17.9:
        fx.slash(fr, *sc(440, -126), int((t - 17.55) * 60), dirx=-1)
    if t >= 17.62:
        fx.explosion(fr, *sc(434, -126), int((t - 17.62) * 60), 1.1, seed=7)
        if t < 17.9:
            fx.sparks(fr, *sc(434, -126), step3 * 5, r=20, n=5)
    # beam clash
    if 19.6 <= t < 21.9 and cheek:
        mclash = X(360 + 26 * math.sin((t - 19.6) * 2.6) - 6 * (t - 19.6))
        mx, my = zard_mouth(zs, zlt, zx, zy)
        cy = (my + cheek[1]) / 2
        u = S.clamp((t - 19.6) / 0.25)
        fx.fire_stream(fr, *scr(mx, my), *scr(lerp(mx, mclash, u), cy), step2, prog=1.0, seed=2, width=1.15)
        fx.bolt(fr, *scr(*cheek), *scr(lerp(cheek[0], mclash, u), cy), step3, thick=2, amp=7)
        if u >= 1:
            c = scr(mclash, cy)
            fx.disc(fr, *c, 9 + (step2 % 2) * 2, fx.C["f2"])
            fx.disc(fr, *c, 6 + (step2 % 3), fx.C["y0"])
            fx.disc(fr, *c, 3, fx.C["white"])
            fx.sparks(fr, *c, step3 * 13, r=22, n=6)
    if t >= 21.9:
        mc = 360 + 26 * math.sin(2.3 * 2.6) - 6 * 2.3
        for k, (dx, dy, d) in enumerate(((0, 0, 0), (-30, 6, 0.12), (34, 4, 0.2), (-10, -20, 0.3), (18, 12, 0.4))):
            if t >= 21.9 + d:
                fx.explosion(fr, *sc(mc + dx, -30 + dy), int((t - 21.9 - d) * 60), 2.0 - k * 0.25, seed=40 + k)
    # dive + slash on Pikachu
    if zs == "dive":
        fx.speed_lines(fr, 20, 170, step2, n=18, dirx=1, seed=9)
    if 23.5 <= t < 23.85:
        fx.slash(fr, *sc(240, -16), int((t - 23.5) * 60), dirx=-1)
    # Volt Tackle vs flamethrower
    if volt and t > 28.3:
        fx.speed_lines(fr, 120, 185, step2, n=16, dirx=-1, color="y0", seed=4)
    # Volt Tackle impact
    if 30.0 <= t:
        age = int((t - 30.0) * 60)
        c = sc(408, -34)
        if age < 70:
            fx.explosion(fr, *c, age, 2.6, seed=77)
        if age < 40:
            for k in range(6):
                a = k / 6 * 6.283 + step3 * 0.3
                fx.bolt(fr, *c, c[0] + math.cos(a) * (30 + age), c[1] + math.sin(a) * (24 + age * 0.6), step3 * 6 + k, amp=4, branches=1)
        if 30.0 <= t < 31.2 and zs:
            fx.sparks(fr, *zbody, step3 * 17, r=16, n=3)
    # victory sparkles
    if t >= 33.8:
        for k in range(5):
            ph = (t * 1.6 + k * 0.37) % 1
            if ph < 0.5:
                x0, y0 = scr(px - 22 + k * 11, -36 - (k % 2) * 10 - ph * 8)
                r = 1 + int(2 * math.sin(math.pi * ph * 2))
                for d in range(-r, r + 1):
                    fx.put(fr, x0 + d, y0, fx.C["y0"]); fx.put(fr, x0, y0 + d, fx.C["y0"])
                fx.put(fr, x0, y0, fx.C["white"])

    # ---- landing / skid dust ----
    for (td, wx, dirx, size) in ((5.02, 470, -1, 1.6), (7.7, 156, 1, 1.0), (10.35, 118, 1, 1.0), (15.6, 266, 1, 1.0), (18.8, 452, -1, 1.4),
                                  (21.9, 262, -1, 1.0), (24.45, 150, -1, 1.2), (24.5, 420, -1, 1.4), (30.45, 470, 1, 2.0), (30.7, 352, -1, 1.0)):
        if td <= t < td + 0.6:
            fx.dust(fr, *sc(wx, 0), int((t - td) * 60), dirx, seed=int(td * 10), size=size)
            fx.dust(fr, *sc(wx, 0), int((t - td) * 60), -dirx, seed=int(td * 10) + 1, size=size * 0.8)

    STAGE.draw_fore(fr, camx)

    # ---- titles ----
    if 0.4 <= t < 2.9:
        if t >= 0.5:
            text(fr, "PIKACHU", 40, 70, "#f8d038", 2)
        if t >= 1.15:
            if t < 1.25:
                fx.flash(fr, 0.6)
            text(fr, "VS", W // 2 - width("VS", 3) // 2, 92, "#ffffff", 3)
        if t >= 1.6:
            text(fr, "CHARIZARD", W - 40 - width("CHARIZARD", 2), 126, "#f08838", 2)
        if t > 2.5:
            fx.fade(fr, 0) if False else None
    if 27.15 <= t < 28.4:
        s = "INVESTIDA TROVÃO!"
        x = W // 2 - width(s, 2) // 2
        yb = 22 + int(max(0, 6 - (t - 27.15) * 60) * 3)
        text(fr, s, x, yb, "#fff8b0" if step2 % 4 else "#f8d038", 2)
    if t >= 34.2:
        s = "PIKACHU VENCEU!"
        drop = S.clamp((t - 34.2) / 0.35)
        bounce = int(abs(math.sin(drop * math.pi * 1.5)) * (1 - drop) * 20)
        y = int(-20 + drop * 60) - bounce
        text(fr, s, W // 2 - width(s, 2) // 2, y, "#f8d038", 2)

    # ---- screen effects ----
    shake = 0
    if 5.9 <= t < 7.2 or 26.0 <= t < 27.0:
        shake = 1
    if 19.8 <= t < 21.9:
        shake = 1 + int((t - 19.8) / 1.2)
    if 21.9 <= t < 22.5:
        shake = 3
    if 30.0 <= t < 30.8:
        shake = int(4 * (1 - (t - 30.0) / 0.8)) + 1
    if 23.6 <= t < 23.9:
        shake = 2
    shake = int(round(shake * S.INTENSITY))
    if shake:
        dx = int(round((fx.rnd(step2 * 3.1) - 0.5) * 2 * shake))
        dy = int(round((fx.rnd(step2 * 7.7) - 0.5) * 2 * shake))
        fr = np.roll(fr, (dy, dx), axis=(0, 1))
    # hit-stop impact frames
    if frozen:
        if abs(t - 30.0) < 1e-6:
            if fz < 2:
                fr[:] = fx.C["white"]
            elif fz < 5:
                fx.impact_frame(fr, 0)
            elif fz < 8:
                fx.impact_frame(fr, 1)
        elif abs(t - 21.9) < 1e-6:
            fx.impact_frame(fr, fz % 2)
        elif abs(t - 23.6) < 1e-6:
            if fz < 3:
                fx.impact_frame(fr, 1)
    if 11.85 <= t < 11.9:
        fx.flash(fr, 0.5 * S.INTENSITY)
    if 21.9 <= t < 22.05 and not frozen:
        fx.flash(fr, 0.75 * S.INTENSITY * (1 - (t - 21.9) / 0.15))
    if 30.0 <= t < 30.12 and not frozen:
        fx.flash(fr, 0.5 * (1 - (t - 30.0) / 0.12))
    if t < 0.4:
        fx.fade(fr, 1 - t / 0.4)
    if t > 38.6:
        fx.fade(fr, S.clamp((t - 38.6) / 1.6))
    return fr


def lerp(a, b, u):
    return a + (b - a) * u


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scale", type=int, default=5)
    ap.add_argument("--out", default="out/pikachu_vs_charizard.mp4")
    ap.add_argument("--png", default=None)
    ap.add_argument("--from", dest="t0", type=int, default=0)
    ap.add_argument("--to", dest="t1", type=int, default=None)
    ap.add_argument("--audio", default=None)
    a = ap.parse_args()
    n = S.total_ticks()
    t1 = n if a.t1 is None else a.t1
    if a.png:
        os.makedirs(a.png, exist_ok=True)
        for k in range(a.t0, t1):
            Image.fromarray(render_tick(k)).save(os.path.join(a.png, f"f{k:05d}.png"))
        return
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W * a.scale}x{H * a.scale}", "-r", "60", "-i", "-"]
    if a.audio:
        cmd += ["-i", a.audio, "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(a.t0, t1):
        fr = render_tick(k)
        big = np.repeat(np.repeat(fr, a.scale, axis=0), a.scale, axis=1)
        p.stdin.write(big.tobytes())
        if k % 300 == 0:
            print(f"tick {k}/{t1}", flush=True)
    p.stdin.close()
    p.wait()


if __name__ == "__main__":
    main()
