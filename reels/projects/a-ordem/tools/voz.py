"""Gera a narração com voz sintética (Piper, voz pt_BR "cadu") a partir de roteiro.json.

    python3 tools/voz.py <modelo.onnx> [--escala 1.05]

Cada trecho é sintetizado à parte e colado com as pausas do roteiro (e o bipe de censura),
depois a voz recebe o tratamento de terror no ffmpeg (tom mais grave, compressão, sala).
Saídas: assets/voz.wav (48 kHz) e assets/trechos.json (início/fim de cada trecho).
Modelo: https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_BR/cadu/medium
"""
import json, os, subprocess, sys, wave, io
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model = sys.argv[1]
escala = float(sys.argv[sys.argv.index("--escala") + 1]) if "--escala" in sys.argv else 1.05
rot = json.load(open(os.path.join(HERE, "roteiro.json"), encoding="utf-8"))["trechos"]
voice = PiperVoice.load(model)
SR = voice.config.sample_rate
cfg = SynthesisConfig(length_scale=escala, noise_scale=0.6, noise_w_scale=0.7)

def synth(text):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)
    buf.seek(0)
    with wave.open(buf) as wf:
        a = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    # apara silêncio das pontas (o roteiro controla as pausas)
    idx = np.where(np.abs(a) > 0.012)[0]
    a = a[max(0, idx[0] - int(0.02 * SR)) : idx[-1] + int(0.06 * SR)] if len(idx) else a
    return a

parts, info, t = [np.zeros(int(0.35 * SR), np.float32)], [], 0.35
for i, tr in enumerate(rot):
    a = synth(tr["texto"])
    info.append({"i": i, "cena": tr["cena"], "texto": tr["texto"], "ini": round(t, 3), "fim": round(t + len(a) / SR, 3)})
    parts.append(a)
    t += len(a) / SR
    if tr.get("beep"):
        info[-1]["beep"] = [round(t + 0.06, 3), round(t + 0.06 + tr["beep"], 3)]
        parts.append(np.zeros(int((tr["beep"] + 0.12) * SR), np.float32))  # o bipe é sintetizado na trilha
        t += tr["beep"] + 0.12
    gap = tr.get("pausa", 0.3)
    parts.append(np.zeros(int(gap * SR), np.float32))
    t += gap
raw = np.concatenate(parts)
tmp = os.path.join(HERE, "assets", "_voz_crua.wav")
with wave.open(tmp, "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(raw, -1, 1) * 32767).astype(np.int16).tobytes())
# Tratamento: 7% mais grave sem mudar o tempo, corte de graves/agudos, compressão e sala curta.
k = 0.93
af = (f"asetrate={SR}*{k},aresample=48000,atempo={1/k:.5f},highpass=f=75,lowpass=f=8500,"
      "equalizer=f=180:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2,"
      "acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=4,"
      "aecho=0.8:0.5:38|71:0.18|0.1,alimiter=limit=0.9")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-af", af, "-ac", "1", "-ar", "48000",
                os.path.join(HERE, "assets", "voz.wav")], check=True)
os.remove(tmp)
json.dump({"duracao": round(t, 3), "trechos": info}, open(os.path.join(HERE, "assets", "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"voz.wav: {t:.2f}s, {len(info)} trechos")
