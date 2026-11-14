"""Ambient sound design synthesized to the shot timeline (fire crackle, wind whirls, landing thumps,
a soft sparkle on the cap tip). Deterministic; writes out/saci_audio.wav."""
import math, sys, wave
import numpy as np
SR = 44100
DUR = 20.6
rng = np.random.default_rng(7)
buf = np.zeros(int((DUR + 1) * SR))
def add(t, x, g=1.0):
    i = int(t * SR); x = x[:len(buf) - i]; buf[i:i + len(x)] += x * g
def lp(x, k):
    y = np.empty_like(x); a = 0.0
    for i in range(len(x)):
        a += k * (x[i] - a); y[i] = a
    return y
def env_lin(n, a, r):
    t = np.arange(n) / SR; d = n / SR
    return np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
def crackle(dur, dens=0.004):
    n = int(dur * SR)
    imp = (rng.uniform(0, 1, n) < dens) * rng.uniform(-1, 1, n)
    k = np.exp(-np.arange(200) / 25.0)
    return np.convolve(imp, k)[:n] + lp(rng.uniform(-1, 1, n), 0.03) * 0.6
def wind(dur, f0=0.04, f1=0.12):
    n = int(dur * SR); x = rng.uniform(-1, 1, n)
    y = np.empty(n); a = 0.0
    for i in range(n):
        k = f0 + (f1 - f0) * (0.5 + 0.5 * math.sin(i / SR * 9))
        a += k * (x[i] - a); y[i] = a
    return y * 3
def thump(g=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR
    return np.sin(2 * math.pi * (90 - 60 * t) * t) * np.exp(-t / 0.06) * g
def chime():
    n = int(0.9 * SR); t = np.arange(n) / SR
    return sum(np.sin(2 * math.pi * f * t) * np.exp(-t / 0.3) for f in (1568, 2093, 2637)) * 0.15
def siren(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 700 + 180 * np.sin(2 * math.pi * 0.5 * t)
    return np.sin(2 * math.pi * np.cumsum(f) / SR) * 0.05 * env_lin(n, 1.0, 1.5)
# fire bed: loud until the whirlwind takes it (≈12.5–14.2 s)
fb = crackle(14.4) * 0.5
fb *= np.concatenate([np.ones(int(12.5 * SR)), np.linspace(1, 0, len(fb) - int(12.5 * SR))])
add(0, fb)
add(0, siren(11.0), 1.0)
# whirlwind arrives and unwinds (4.2–6.2), lands
w = wind(2.2) * env_lin(int(2.2 * SR), 0.6, 0.5); add(4.2, w, 0.6)
add(5.95, thump(), 0.9)
# hops up the facade
for k in range(4):
    add(8.0 + k * 0.62 + 0.12, wind(0.3) * env_lin(int(0.3 * SR), 0.05, 0.2), 0.3)
    add(8.0 + k * 0.62 + 0.55, thump(0.6), 0.7)
# the big whirlwind (11.0–15.4) rising pitch
w2 = wind(4.4, 0.05, 0.2) * env_lin(int(4.4 * SR), 0.6, 0.8); add(11.0, w2, 0.9)
# landing at the window, cap tip sparkle, exit whirl
add(15.4 + 0.55, thump(0.7), 0.8)
add(15.4 + 2.6, chime(), 1.0)
add(15.4 + 3.6, wind(1.0) * env_lin(int(1.0 * SR), 0.1, 0.6), 0.5)
x = buf / max(1e-6, np.abs(buf).max()) * 0.85
x[int((DUR - 0.8) * SR):] *= np.linspace(1, 0, len(x) - int((DUR - 0.8) * SR))
pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(np.stack([pcm, pcm], 1).tobytes())
