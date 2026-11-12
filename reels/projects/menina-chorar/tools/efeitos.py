"""Gritos do além e risadas macabras feitos a partir da voz sintética (Piper) + ffmpeg.

    python3 tools/efeitos.py <modelo.onnx>

Saídas: assets/gritos.wav e assets/risada.wav (48 kHz, estéreo). Entram na trilha de efeitos
(scene.js), então continuam no vídeo mesmo depois que a narração for dublada.
"""
import io, os, subprocess, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
voice = PiperVoice.load(sys.argv[1])
SR = voice.config.sample_rate
A = os.path.join(HERE, "assets")

def synth(text, scale=1.0, noise=0.8, path=None):
    cfg = SynthesisConfig(length_scale=scale, noise_scale=noise, noise_w_scale=0.9)
    with wave.open(path, "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)

def ff(inputs, fc, out):
    args = ["ffmpeg", "-y", "-v", "error"]
    for i in inputs: args += ["-i", i]
    subprocess.run(args + ["-filter_complex", fc, "-ar", "48000", "-ac", "2", out], check=True)

tmp = [os.path.join(A, f"_t{i}.wav") for i in range(4)]
# GRITOS: três vozes de "Aaaah! Nãããão!" em tons diferentes (uma bem aguda, uma grave, uma ao contrário),
# distorcidas, com flanger, eco longo e reverb invertido no começo.
synth("Aaaaaaaaaaaaaaaaaah! Nããããããããããão!", 2.2, 0.9, tmp[0])
synth("Aaaaaaaaaaaaaaaaaaaaaaaaaaah!", 2.6, 1.0, tmp[1])
def pitch(k): return f"asetrate={SR}*{k},aresample=48000"
fc = (f"[0:a]{pitch(1.75)},atempo=0.8,highpass=f=300,acrusher=bits=6:mix=0.35,flanger=delay=4:depth=6:speed=0.7,volume=1.4[a];"
      f"[1:a]{pitch(1.3)},atempo=0.9,adelay=180|180,highpass=f=200,vibrato=f=7:d=0.6,volume=1.0[b];"
      f"[0:a]{pitch(0.62)},areverse,adelay=60|60,lowpass=f=1800,volume=0.9[c];"
      f"[1:a]{pitch(2.1)},atempo=0.7,adelay=420|420,tremolo=f=11:d=0.7,volume=0.8[d];"
      "[a][b][c][d]amix=inputs=4:normalize=0,"
      "asoftclip=type=atan:threshold=0.4,aecho=0.8:0.6:90|170|260:0.45|0.3|0.2,"
      "afade=t=in:d=0.05,afade=t=out:st=2.1:d=0.7,atrim=0:2.8,alimiter=limit=0.9")
ff(tmp[:2], fc, os.path.join(A, "gritos.wav"))
# RISADAS: "rá rá rá" grave e lento + uma camada aguda de bruxa + eco de sala enorme
synth("Rá, rá, rá, rá, rá, rá, rá, rá!", 1.25, 0.8, tmp[2])
synth("Hi, hi, hi, hi, hi, hi, hi, hi, hi!", 1.0, 0.9, tmp[3])
fc = (f"[0:a]{pitch(0.68)},atempo=1.1,lowpass=f=3000,acrusher=bits=8:mix=0.2,volume=1.5[a];"
      f"[1:a]{pitch(1.6)},atempo=0.85,adelay=500|500,highpass=f=400,flanger=delay=3:depth=4:speed=1.2,volume=0.7[b];"
      f"[0:a]{pitch(0.5)},adelay=250|250,lowpass=f=900,volume=1.0[c];"
      "[a][b][c]amix=inputs=3:normalize=0,asoftclip=type=tanh:threshold=0.6,"
      "aecho=0.8:0.7:120|240|380:0.5|0.35|0.22,afade=t=out:st=2.6:d=0.6,atrim=0:3.2,alimiter=limit=0.9")
ff(tmp[2:], fc, os.path.join(A, "risada.wav"))
for t in tmp: os.remove(t)
for f in ("gritos.wav", "risada.wav"):
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(A, f)], capture_output=True, text=True).stdout.strip()
    print(f, d, "s")
