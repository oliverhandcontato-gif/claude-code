"""Tempos por palavra de uma narração (faster-whisper), alinhados ao texto do roteiro.

    python3 -I tools/palavras.py <voz.wav> [modelo=small]

Transcreve o arquivo inteiro e alinha as palavras do Whisper com as do roteiro.json
(grafia do roteiro, tempos do Whisper; palavras não reconhecidas são interpoladas).
Saídas: assets/palavras.json [{w, s, e, trecho}] e assets/trechos.json [{i, cena, texto, ini, fim}].
"""
import json, os, re, subprocess, sys, difflib, unicodedata
import numpy as np
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
rot = json.load(open(os.path.join(HERE, "roteiro.json"), encoding="utf-8"))["trechos"]
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
dur = len(audio) / 16000
m = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else "small", device="cpu", compute_type="int8")
full = " ".join(t["texto"] for t in rot)
segs, _ = m.transcribe(audio, language="pt", word_timestamps=True, initial_prompt=full[:800], condition_on_previous_text=False, beam_size=5, vad_filter=False)
hw = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    hw += [(w.word.strip(), w.start, w.end) for w in s.words]

UN = "zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove".split()
DZ = {2: "vinte", 3: "trinta", 4: "quarenta", 5: "cinquenta", 6: "sessenta", 7: "setenta", 8: "oitenta", 9: "noventa"}
def num_pt(n):
    if n < 20: return [UN[n]]
    return [DZ[n // 10]] + ([] if n % 10 == 0 else ["e", UN[n % 10]])
def norm(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
# números escritos em algarismos pelo Whisper viram palavras (tempo dividido entre elas)
exp = []
for w, s0, e0 in hw:
    n = norm(w)
    if n.isdigit() and int(n) < 100:
        parts = num_pt(int(n))
        for k, p in enumerate(parts):
            exp.append((p, s0 + (e0 - s0) * k / len(parts), s0 + (e0 - s0) * (k + 1) / len(parts)))
    else:
        exp.append((w, s0, e0))
hw = exp
ref = [(w, i) for i, t in enumerate(rot) for w in t["texto"].split()]
times = [None] * len(ref)
sm = difflib.SequenceMatcher(a=[norm(w) for w, _ in ref], b=[norm(x[0]) for x in hw], autojunk=False)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        times[blk.a + k] = (hw[blk.b + k][1], hw[blk.b + k][2])
bad, i = 0, 0
while i < len(ref):
    if times[i] is None:
        j = i
        while j < len(ref) and times[j] is None: j += 1
        t0 = times[i - 1][1] if i > 0 else 0.0
        t1 = times[j][0] if j < len(ref) else dur
        lens = [len(w) + 1 for w, _ in ref[i:j]]; tot = sum(lens); acc = 0
        for k in range(i, j):
            s = t0 + (t1 - t0) * acc / tot; acc += lens[k - i]
            times[k] = (s, t0 + (t1 - t0) * acc / tot)
        print("interpolado:", " ".join(w for w, _ in ref[i:j]))
        bad += j - i
        i = j
    else: i += 1
# ajusta os limites pelas pausas reais: palavra não começa nem termina dentro de um silêncio
det = subprocess.run(["ffmpeg", "-v", "info", "-i", src, "-af", "silencedetect=n=-40dB:d=0.2", "-f", "null", "-"], capture_output=True, text=True).stderr
ss = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", det)]
se = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", det)]
sil = list(zip(ss, se + [dur] * (len(ss) - len(se))))
fixed = []
for s0, e0 in times:
    for a, b in sil:
        if a - 0.02 <= s0 < b and b < e0: s0 = b
        elif a < e0 <= b + 0.02 and a > s0: e0 = a
        elif s0 < a and b < e0 and b - a > 0.3:  # pausa longa dentro da palavra: fica com o lado maior
            if a - s0 < e0 - b: s0 = b
            else: e0 = a
    fixed.append((s0, e0))
times = fixed
out = [{"w": w, "s": round(s, 3), "e": round(e, 3), "trecho": ti} for (w, ti), (s, e) in zip(ref, times)]
tre = []
for i, t in enumerate(rot):
    ws = [o for o in out if o["trecho"] == i]
    tre.append({"i": i, "cena": t["cena"], "texto": t["texto"], "ini": ws[0]["s"], "fim": ws[-1]["e"]})
    if t.get("beep"):  # bipe de censura logo depois do trecho (a palavra censurada não é dita)
        tre[-1]["beep"] = [round(ws[-1]["e"] + 0.06, 3), round(ws[-1]["e"] + 0.06 + t["beep"], 3)]
json.dump(out, open(os.path.join(HERE, "assets", "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump({"duracao": round(dur, 3), "trechos": tre}, open(os.path.join(HERE, "assets", "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(out)} palavras, {bad} interpoladas, {dur:.2f}s")
