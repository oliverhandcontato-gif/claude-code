"""Choreography: Pikachu vs Charizard. All times are story seconds; the renderer maps video
ticks (60 Hz) to story time, inserting hit-stop freezes. Positions are world pixels
(x along the arena, y = 0 on the ground, negative = up) and are rounded to integers."""
import math

FPS = 60
# hit-stop freezes: (story time, frozen ticks)
FREEZES = [(21.9, 5), (23.6, 7), (30.0, 12)]
STORY_END = 40.5
INTENSITY = 1.0  # scales shake / flash strength

P_HOME, Z_HOME = 160, 470


def ease_in(u): return u * u
def ease_out(u): return 1 - (1 - u) * (1 - u)
def ease_io(u): return u * u * (3 - 2 * u)
def clamp(u, a=0.0, b=1.0): return max(a, min(b, u))
def lerp(a, b, u): return a + (b - a) * u
def U(t, t0, t1): return clamp((t - t0) / (t1 - t0))


def story_time(tick):
    """Video tick -> (story time, frozen flag, ticks into freeze)."""
    t = tick / FPS
    shift = 0.0
    for ts, n in FREEZES:
        d = n / FPS
        if t - shift < ts:
            break
        if t - shift < ts + d:
            return ts, True, int(round((t - shift - ts) * FPS))
        shift += d
    return t - shift, False, 0


def total_ticks():
    return int(round(STORY_END * FPS)) + sum(n for _, n in FREEZES)


# ---------------- Pikachu track: (t0, t1, state, pos(t)->(x,y)) ----------------
def jump_arc(t, t0, t1, x0, x1, h, y0=0, y1=0):
    u = U(t, t0, t1)
    return lerp(x0, x1, u), lerp(y0, y1, u) - 4 * h * u * (1 - u)


def pika_x_volt(t):
    u = U(t, 27.0, 29.9)
    return 150 + 245 * u ** 2.1


PIKA = [
    (0.0, 6.6, None, lambda t: (-200, 0)),
    (6.6, 7.7, "run", lambda t: (lerp(30, 150, U(t, 6.6, 7.7)), 0)),
    (7.7, 8.05, "skid", lambda t: (150 + 10 * ease_out(U(t, 7.7, 8.05)), 0)),
    (8.05, 9.4, "ready", lambda t: (160, 0)),
    (9.4, 9.55, "crouch", lambda t: (160, 0)),
    (9.55, 10.35, "jump", lambda t: jump_arc(t, 9.55, 10.35, 160, 118, 46)),
    (10.35, 11.2, "land", lambda t: (118, 0)),
    (11.2, 11.8, "charge", lambda t: (118, 0)),
    (11.8, 12.8, "zap", lambda t: (118, 0)),
    (12.8, 14.0, "ready", lambda t: (118, 0)),
    (14.0, 15.6, "run", lambda t: (lerp(118, 262, U(t, 14.0, 15.6)), 0)),
    (15.6, 15.95, "skid", lambda t: (262 + 8 * ease_out(U(t, 15.6, 15.95)), 0)),
    (15.95, 16.8, "ready", lambda t: (270, 0)),
    (16.8, 18.9, "throw", lambda t: (270, 0)),
    (18.9, 19.2, "ready", lambda t: (270, 0)),
    (19.2, 19.6, "charge", lambda t: (270, 0)),
    (19.6, 21.9, "zap", lambda t: (270 - 6 * max(0, math.sin((t - 19.6) * 2.2)) - 0, 0)),
    (21.9, 22.5, "skid", lambda t: (270 - 34 * ease_out(U(t, 21.9, 22.5)), 0)),
    (22.5, 23.6, "ready", lambda t: (236, 0)),
    (23.6, 24.45, "hurt", lambda t: jump_arc(t, 23.6, 24.45, 236, 150, 26)),
    (24.45, 25.4, "hurt", lambda t: (150, 0)),
    (25.4, 27.0, "getup", lambda t: (150, 0)),
    (27.0, 27.6, "run", lambda t: (pika_x_volt(t), 0)),
    (27.6, 29.9, "volt", lambda t: (pika_x_volt(t), 0)),
    (29.9, 30.0, "voltLeap", lambda t: (lerp(pika_x_volt(29.9), 404, U(t, 29.9, 30.0)), -10 * math.sin(math.pi * U(t, 29.9, 30.0)) - 4)),
    (30.0, 30.7, "jump", lambda t: jump_arc(t, 30.0, 30.7, 404, 352, 34, -4, 0)),
    (30.7, 33.6, "land", lambda t: (352, 0)),
    (33.6, 99, "victory", lambda t: (352, 0)),
]
# Pikachu: which frames get the 'land' state with a hold reset: tumble reuse etc.
# Charizard track
def zard_fly_in(t):
    u = U(t, 3.0, 5.0)
    return lerp(640, 470, ease_out(u)), lerp(-150, -26, ease_io(u))


ZARD = [
    (0.0, 3.0, None, lambda t: (900, -200)),
    (3.0, 5.0, "fly", zard_fly_in),
    (5.0, 5.6, "land", lambda t: (470, lerp(-26, 0, ease_in(U(t, 5.0, 5.12))))),
    (5.6, 6.3, "roar", lambda t: (470, 0)),
    (6.3, 7.4, "roarHold", lambda t: (470, 0)),
    (7.4, 9.0, "idle", lambda t: (470, 0)),
    (9.0, 9.5, "breathPrep", lambda t: (470, 0)),
    (9.5, 10.7, "breath", lambda t: (470, 0)),
    (10.7, 11.9, "idle", lambda t: (470, 0)),
    (11.9, 12.9, "hurt", lambda t: (470 + 12 * ease_out(U(t, 11.9, 12.2)), 0)),
    (12.9, 13.3, "idle", lambda t: (482, 0)),
    (13.3, 14.2, "fly", lambda t: (lerp(482, 440, ease_io(U(t, 13.3, 14.2))), lerp(0, -88, ease_io(U(t, 13.3, 14.2))))),
    (14.2, 17.3, "fly", lambda t: (440 + 6 * math.sin(t * 2), -88 + 3 * math.sin(t * 4.5))),
    (17.3, 17.6, "clawUp", lambda t: (440 + 6 * math.sin(t * 2), -88)),
    (17.6, 18.0, "clawSwipe", lambda t: (440 + 6 * math.sin(t * 2), -88)),
    (18.0, 18.8, "fly", lambda t: (lerp(440 + 6 * math.sin(36), 452, U(t, 18.0, 18.8)), lerp(-88, -18, ease_io(U(t, 18.0, 18.8))))),
    (18.8, 19.2, "land", lambda t: (452, lerp(-18, 0, ease_in(U(t, 18.8, 18.92))))),
    (19.2, 19.6, "breathPrep", lambda t: (452, 0)),
    (19.6, 21.9, "breath", lambda t: (452 + 5 * max(0, math.sin((t - 19.6) * 2.2 + 3.1)), 0)),
    (21.9, 22.4, "hurt", lambda t: (452 + 22 * ease_out(U(t, 21.9, 22.4)), 0)),
    (22.4, 23.0, "fly", lambda t: (lerp(474, 440, U(t, 22.4, 23.0)), lerp(0, -96, ease_out(U(t, 22.4, 23.0))))),
    (23.0, 23.5, "dive", lambda t: (lerp(440, 268, ease_in(U(t, 23.0, 23.5))), lerp(-96, -10, ease_in(U(t, 23.0, 23.5))))),
    (23.5, 23.9, "clawSwipe", lambda t: (lerp(268, 300, U(t, 23.5, 23.9)), lerp(-10, -30, ease_out(U(t, 23.5, 23.9))))),
    (23.9, 24.5, "fly", lambda t: (lerp(300, 420, ease_io(U(t, 23.9, 24.5))), lerp(-30, -14, U(t, 23.9, 24.5)))),
    (24.5, 25.8, "land", lambda t: (420, lerp(-14, 0, ease_in(U(t, 24.5, 24.62))))),
    (25.8, 26.5, "roar", lambda t: (420, 0)),
    (26.5, 28.2, "roarHold", lambda t: (420, 0)),
    (28.2, 28.6, "breathPrep", lambda t: (420, 0)),
    (28.6, 29.85, "breath", lambda t: (420, 0)),
    (29.85, 30.0, "clawUp", lambda t: (420, 0)),
    (30.0, 30.7, "ko", lambda t: (420 + 52 * ease_out(U(t, 30.0, 30.7)), 0)),
    (30.7, 99, "koLie", lambda t: (472, 0)),
]


def track_at(track, t):
    for seg in track:
        if seg[0] <= t < seg[1]:
            x, y = seg[3](t)
            return seg[2], t - seg[0], int(round(x)), int(round(y))
    seg = track[-1]
    x, y = seg[3](t)
    return seg[2], t - seg[0], int(round(x)), int(round(y))


def camera_center(t, px, zx):
    """World x the camera centres on (eased between beats); returns int."""
    if t < 3.0:
        return int(round(lerp(192, 400, ease_io(U(t, 0.2, 3.0)))))
    if t < 6.6:
        return int(round(lerp(400, 360, ease_io(U(t, 3.0, 6.6)))))
    if 27.0 <= t < 30.0:
        return int(round(lerp(320, max(320, px + 70), ease_io(U(t, 27.0, 27.8)))))
    if t >= 30.0:
        return int(round(lerp(min(420, max(320, px + 70)), 410, ease_io(U(t, 30.3, 31.5)))))
    if 23.6 <= t < 25.4:
        return int(round(lerp(330, 290, ease_io(U(t, 23.6, 24.6)))))
    return int(round(lerp(min(px, 270) * 0.5 + zx * 0.5, (px + zx) / 2, 0.5)))
