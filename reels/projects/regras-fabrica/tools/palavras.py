"""Tempos por palavra da narração (faster-whisper), alinhados ao texto do roteiro.

    python3 tools/palavras.py [modelo=small]

Transcreve cada trecho (início/fim em assets/trechos.json) e usa os tempos do Whisper com a
grafia do roteiro. Quando o Whisper erra/junta palavras, o tempo é interpolado pelo tamanho.
Saída: assets/palavras.json  [{w, s, e, trecho}]
"""
import json, os, re, subprocess, sys, difflib, unicodedata
import numpy as np
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
info = json.load(open(os.path.join(HERE, "assets", "trechos.json"), encoding="utf-8"))
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "assets", "voz.wav"), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, dtype=np.float32)
m = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else "small", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
out, bad = [], 0
for tr in info["trechos"]:
    a0, a1 = max(0, tr["ini"] - 0.08), tr["fim"] + 0.12
    seg = audio[int(a0 * 16000): int(a1 * 16000)]
    segs, _ = m.transcribe(seg, language="pt", word_timestamps=True, initial_prompt=tr["texto"], condition_on_previous_text=False, beam_size=5)
    hw = [(w.word.strip(), a0 + w.start, a0 + w.end) for s in segs for w in s.words]
    ref = tr["texto"].split()
    times = [None] * len(ref)
    sm = difflib.SequenceMatcher(a=[norm(x) for x in ref], b=[norm(x[0]) for x in hw], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (hw[blk.b + k][1], hw[blk.b + k][2])
    # preenche lacunas interpolando pelo comprimento das palavras
    i = 0
    while i < len(ref):
        if times[i] is None:
            j = i
            while j < len(ref) and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else tr["ini"]
            t1 = times[j][0] if j < len(ref) else tr["fim"]
            lens = [len(x) + 1 for x in ref[i:j]]; tot = sum(lens); acc = 0
            for k in range(i, j):
                s = t0 + (t1 - t0) * acc / tot; acc += lens[k - i]
                times[k] = (s, t0 + (t1 - t0) * acc / tot)
            bad += j - i
            i = j
        else: i += 1
    for w, (s, e) in zip(ref, times):
        out.append({"w": w, "s": round(s, 3), "e": round(e, 3), "trecho": tr["i"]})
    print(f"{tr['ini']:6.2f} {tr['texto']}  <-  {' '.join(x[0] for x in hw)}")
json.dump(out, open(os.path.join(HERE, "assets", "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"{len(out)} palavras, {bad} interpoladas")
