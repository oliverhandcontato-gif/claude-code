"""Monta assets/voz.wav a partir da locução enviada (assets/original/locucao.wav), abrindo silêncios
nos pontos certos (sempre dentro de pausas da gravação, nunca no meio de palavra).

    python3 -I tools/montar_locucao.py

Depois rode tools/palavras.py assets/voz.wav e scripts/analyze-audio.cjs.
"""
import os, wave
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "assets", "original", "locucao.wav")
LEAD, TAIL = 0.35, 2.4
# (instante de corte na gravação original em s, silêncio extra em s)
GAPS = [
    (5.36, 0.55),   # A ... B   (suspense entre as opções)
    (5.88, 0.60),   # B ... e C
    (10.10, 4.65),  # "Quem você escolhe?" -> timer de 5 s
    (23.20, 4.10),  # "o pai dela." -> gritos + risadas
    (27.26, 2.40),  # "atirar na pobre" -> bipe de censura + estampido + preto
    (29.85, 0.30),  # "ela não chorou." -> CTA
]
w = wave.open(SRC)
sr = w.getframerate()
a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
z = lambda s: np.zeros(int(round(s * sr)), np.float32)
parts, prev = [z(LEAD)], 0
for t, g in GAPS:
    i = int(round(t * sr))
    seg = a[prev:i].copy()
    # micro fade nas emendas (5 ms) para não estalar
    n = int(0.005 * sr)
    seg[-n:] *= np.linspace(1, 0, n)
    if prev:
        seg[:n] *= np.linspace(0, 1, n)
    parts += [seg, z(g)]
    prev = i
seg = a[prev:].copy()
seg[: int(0.005 * sr)] *= np.linspace(0, 1, int(0.005 * sr))
parts += [seg, z(TAIL)]
out = np.concatenate(parts)
tmp = os.path.join(HERE, "assets", "_voz.wav")
with wave.open(tmp, "wb") as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
os.replace(tmp, os.path.join(HERE, "assets", "voz.wav"))
print(f"voz.wav: {len(out) / sr:.2f}s")
