"""Chiptune soundtrack + SFX synthesized from the same story timeline (deterministic).
Writes out/battle_audio.wav (44.1 kHz stereo). Story times are mapped to video time with the
same hit-stop freezes as the picture."""
import math
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import scene as S

SR = 44100
rng = np.random.default_rng(1234)


def vt(story_t):
    """Story time -> video time (adds frozen hit-stop durations that happen before it)."""
    add = 0.0
    for ts, n in S.FREEZES:
        if story_t > ts:
            add += n / S.FPS
    return story_t + add


def env(n, a=0.005, r=0.1):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))
    return e


def square(f, n, duty=0.5):
    t = np.arange(n) / SR
    ph = (t * f) % 1
    return np.where(ph < duty, 1.0, -1.0)


def noise(n):
    return rng.uniform(-1, 1, n)


def lowpass(x, k):
    """One-pole low-pass (k in 0..1, smaller = darker)."""
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += k * (x[i] - acc)
        y[i] = acc
    return y


def crush(x, steps=16):
    return np.round(x * steps) / steps


class Mix:
    def __init__(self, dur):
        self.buf = np.zeros(int(dur * SR) + SR)

    def add(self, t, x, gain=1.0):
        i = int(t * SR)
        if i >= len(self.buf):
            return
        x = x[: len(self.buf) - i]
        self.buf[i:i + len(x)] += x * gain


def sfx_zap(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    buzz = square(220 + 40 * np.sin(t * 60), n, 0.3) * 0.35
    crackle = noise(n) * (rng.uniform(0, 1, n) > 0.92) * 1.2
    return crush((buzz + crackle) * np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05), 12)


def sfx_fire(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = lowpass(noise(n), 0.08) * 2.5 + lowpass(noise(n), 0.4) * 0.3
    return x * np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.15)


def sfx_boom(size=1.0):
    n = int(0.9 * size * SR)
    t = np.arange(n) / SR
    thump = np.sin(2 * math.pi * (70 - 40 * t) * t) * np.exp(-t / (0.18 * size))
    x = lowpass(noise(n), 0.15) * np.exp(-t / (0.25 * size)) * 1.6
    return crush(thump * 1.2 + x, 14)


def sfx_hit():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    return crush(square(180 * np.exp(-t * 8), n) * np.exp(-t / 0.06) * 0.8 + noise(n) * np.exp(-t / 0.03), 10)


def sfx_roar(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 140 - 50 * (t / dur) + 8 * np.sin(t * 40)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    x = saw * 0.6 + lowpass(noise(n), 0.2) * 0.8
    return crush(x * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.3), 12)


def sfx_whoosh(dur=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return lowpass(noise(n), 0.12) * np.sin(math.pi * t / dur) * 1.5


def sfx_step():
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    return noise(n) * np.exp(-t / 0.008) * 0.5


def sfx_charge(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 300 + 900 * (t / dur) ** 1.5
    return crush(square(1, 1) [0] * 0 + np.sign(np.sin(2 * math.pi * np.cumsum(f) / SR)) * 0.25 * (t / dur), 10)


def note(f, dur, duty=0.25, vol=0.2):
    n = int(dur * SR)
    return square(f, n, duty) * env(n, 0.003, dur * 0.6) * vol


def music(m, t0, t1, bpm=150):
    """Driving 8-bit loop: bass, pulse lead stabs, noise drums."""
    beat = 60 / bpm
    bass_pat = [55, 55, 82.4, 55, 65.4, 65.4, 73.4, 61.7]
    lead = [440, 0, 523, 494, 440, 0, 392, 0, 440, 0, 523, 587, 659, 587, 523, 494]
    i = 0
    t = t0
    while t < t1:
        b = bass_pat[i % 8]
        m.add(t, note(b * 2, beat * 0.9, 0.5, 0.11))
        if i % 2 == 0:
            n = int(0.12 * SR)
            tt = np.arange(n) / SR
            m.add(t, np.sin(2 * math.pi * (110 - 300 * tt) * tt) * np.exp(-tt / 0.05) * 0.35)  # kick
        else:
            n = int(0.08 * SR)
            tt = np.arange(n) / SR
            m.add(t, noise(n) * np.exp(-tt / 0.03) * 0.18)  # snare
        m.add(t + beat / 2, noise(int(0.03 * SR)) * 0.05)  # hat
        lf = lead[(i // 1) % 16]
        if lf and (i // 16) % 2 == 1:
            m.add(t, note(lf, beat * 0.45, 0.25, 0.06))
        t += beat
        i += 1


def build(out):
    dur = S.total_ticks() / S.FPS
    m = Mix(dur)
    music(m, vt(3.0), vt(29.9))
    # intro VS hits
    m.add(vt(0.5), sfx_hit(), 0.5); m.add(vt(1.15), sfx_boom(0.6), 0.6); m.add(vt(1.6), sfx_hit(), 0.5)
    # Charizard arrival
    for k in range(8):
        m.add(vt(3.0 + k * 0.42), sfx_whoosh(0.25), 0.25)
    m.add(vt(5.02), sfx_boom(0.8), 0.6)
    m.add(vt(5.75), sfx_roar(1.4), 0.55)
    # Pikachu run in
    for k in range(10):
        m.add(vt(6.6 + k * 0.1), sfx_step(), 0.6)
    m.add(vt(8.1), sfx_zap(0.25), 0.3)
    # flamethrower 1 + dodge
    m.add(vt(9.5), sfx_fire(1.2), 0.5); m.add(vt(9.55), sfx_whoosh(0.3), 0.4); m.add(vt(9.85), sfx_boom(0.7), 0.5)
    # thunderbolt
    m.add(vt(11.2), sfx_charge(0.6), 0.4); m.add(vt(11.8), sfx_zap(0.85), 0.5); m.add(vt(11.85), sfx_boom(1.0), 0.5); m.add(vt(11.9), sfx_hit(), 0.6)
    # take off + fireballs
    for k in range(6):
        m.add(vt(13.3 + k * 0.35), sfx_whoosh(0.22), 0.25)
    for (tl, tb) in ((14.3, 14.75), (14.95, 15.4), (15.6, 16.05)):
        m.add(vt(tl), sfx_whoosh(0.4), 0.35); m.add(vt(tb), sfx_boom(0.8), 0.6)
    for k in range(16):
        m.add(vt(14.0 + k * 0.1), sfx_step(), 0.5)
    # electro ball vs dragon claw
    m.add(vt(16.95), sfx_zap(0.6), 0.35); m.add(vt(17.55), sfx_whoosh(0.15), 0.6); m.add(vt(17.62), sfx_boom(1.0), 0.6)
    # beam clash
    m.add(vt(19.2), sfx_charge(0.4), 0.4)
    m.add(vt(19.6), sfx_fire(2.3), 0.45); m.add(vt(19.6), sfx_zap(2.3), 0.4)
    m.add(vt(21.9), sfx_boom(2.0), 0.9); m.add(vt(22.1), sfx_boom(1.4), 0.5)
    # dive + claw
    m.add(vt(23.0), sfx_whoosh(0.5), 0.6); m.add(vt(23.6), sfx_hit(), 0.9); m.add(vt(24.45), sfx_boom(0.5), 0.4)
    # get up + roar
    m.add(vt(25.85), sfx_roar(1.6), 0.5)
    m.add(vt(26.0), sfx_charge(1.0), 0.35)
    # VOLT TACKLE
    m.add(vt(27.0), sfx_charge(2.9), 0.45); m.add(vt(27.4), sfx_zap(2.6), 0.45)
    for k in range(24):
        m.add(vt(27.0 + 2.9 * (k / 24) ** 0.6), sfx_step(), 0.6)
    m.add(vt(28.6), sfx_fire(1.25), 0.45)
    m.add(vt(30.0), sfx_hit(), 1.0)
    m.add(vt(30.0) + 0.05, sfx_boom(2.4), 1.0)
    m.add(vt(30.45), sfx_boom(0.8), 0.5)
    # victory jingle
    t = vt(33.7)
    for k, (f, d) in enumerate(((523, 0.12), (659, 0.12), (784, 0.12), (1047, 0.36), (784, 0.12), (1047, 0.6))):
        m.add(t, note(f, d, 0.25, 0.16)); m.add(t, note(f / 2, d, 0.5, 0.08))
        t += d
    x = m.buf / max(1e-6, np.max(np.abs(m.buf))) * 0.9
    fade_out = np.ones_like(x)
    i0 = int(vt(38.6) * SR)
    fade_out[i0:] = np.linspace(1, 0, len(x) - i0)
    x *= fade_out
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    st = np.stack([pcm, pcm], 1)
    with wave.open(out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(st.tobytes())


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "out/battle_audio.wav")
