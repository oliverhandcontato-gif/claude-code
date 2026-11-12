"""Voz da versão única (completo) a partir das vozes já montadas da parte 1 e da parte 2.

Não recorta fala nenhuma de novo: cada bloco é copiado inteiro da sua parte, com corte no meio da
pausa entre um bloco e outro (silêncio já conferido na montagem das partes). Usa a mesma seleção de
blocos de tools/completo.cjs: parte 1 até "Cada formato mostra…", depois a parte 2 sem o bloco 1.
    python3 -I tools/completo_voz.py
"""
import json, os, wave
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(HERE, "assets")
SR = 48000

def carregar(p):
    with wave.open(os.path.join(A, p, "voz.wav")) as wf:
        assert wf.getframerate() == SR and wf.getnchannels() == 1 and wf.getsampwidth() == 2
        x = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768
    return x, json.load(open(os.path.join(A, p, "trechos.json"), encoding="utf-8"))["trechos"], json.load(open(os.path.join(A, p, "palavras.json"), encoding="utf-8"))

comp = json.load(open(os.path.join(HERE, "completo.json"), encoding="utf-8"))["blocos"]
fontes = {p: carregar(p) for p in ("parte1", "parte2")}
p1 = json.load(open(os.path.join(HERE, "parte1.json"), encoding="utf-8"))["blocos"]
corte1 = next(i for i, b in enumerate(p1) if isinstance(b, str) and "Cada formato mostra" in b)
sel = [("parte1", i) for i in range(corte1 + 1)] + [("parte2", i) for i in range(len(fontes["parte2"][1])) if i != 1]
assert len(sel) == len(comp), (len(sel), len(comp))

def janela(p, i):
    x, tr, _ = fontes[p]
    t = tr[i]
    ini = 0.0 if i == 0 else (tr[i - 1]["fim"] + t["ini"]) / 2
    fim = len(x) / SR if i == len(tr) - 1 else (t["fim"] + tr[i + 1]["ini"]) / 2
    return ini, fim

parts, trechos, words, t = [], [], [], 0.0
xf = int(0.008 * SR)
for k, (p, i) in enumerate(sel):
    x, tr, wd = fontes[p]
    ini, fim = janela(p, i)
    if k == len(sel) - 1:
        fim = len(x) / SR
    seg = x[int(ini * SR): int(fim * SR)].copy()
    seg[:xf] *= np.linspace(0, 1, xf); seg[-xf:] *= np.linspace(1, 0, xf)
    d = t - ini
    texto = comp[k] if isinstance(comp[k], str) else comp[k]["texto"]
    assert texto == tr[i]["texto"], (k, texto[:40], tr[i]["texto"][:40])
    tt = {**tr[i], "i": k, "ini": round(tr[i]["ini"] + d, 3), "fim": round(tr[i]["fim"] + d, 3)}
    trechos.append(tt)
    words += [{**w, "s": round(w["s"] + d, 3), "e": round(w["e"] + d, 3), "trecho": k} for w in wd if w["trecho"] == i]
    parts.append(seg)
    t += len(seg) / SR
    print(f"{k:2d} {p} b{i:<2d} {tt['ini']:7.2f}-{tt['fim']:7.2f} {texto[:50]}")

y = np.concatenate(parts)
out = os.path.join(A, "completo")
os.makedirs(out, exist_ok=True)
with wave.open(os.path.join(out, "voz.wav"), "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump(words, open(os.path.join(out, "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"duracao": round(t, 3), "guia": False, "trechos": trechos}, open(os.path.join(out, "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"completo: {t:.1f} s, {len(words)} palavras, {sum(1 for x in trechos if x.get('cit'))} citações")
