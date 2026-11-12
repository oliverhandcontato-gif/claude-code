"""Monta a faixa de voz de uma parte: falas do Tio Arle + citações com o áudio original da obra.

    python3 -I tools/voz.py <parte> <pasta-dos-videos> --modelo voz.onnx          # voz-guia (Piper)
    python3 -I tools/voz.py <parte> <pasta-dos-videos> --gravacao minha-voz.wav   # locução do Tio Arle
    python3 -I tools/voz.py <parte> <pasta-dos-videos> --gravacao minha-voz.wav --edl edl-<parte>.json

Com --gravacao, a gravação (uma tomada só, com as falas na ordem do roteiro, sem as citações) é
transcrita, cada bloco é recortado pelas palavras alinhadas e as citações entram entre eles.
Saídas em assets/<parte>/: voz.wav (48 kHz mono), palavras.json [{w,s,e,trecho}] e
trechos.json {duracao, guia, trechos:[{i, texto, ini, fim, cit?}]}.
"""
import io, json, os, re, subprocess, sys, unicodedata, difflib, wave
import numpy as np

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTE, REFS = sys.argv[1], sys.argv[2]
arg = lambda k: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else None
GRAV, MODELO, EDL = arg("--gravacao"), arg("--modelo"), arg("--edl")
if EDL:
    # Locução gravada + lista de cortes (edl-<parte>.json): tomadas escolhidas, cortes no silêncio real,
    # citações recortadas no ponto mais silencioso perto das marcas, e conferência final.
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(HERE)), "..", "scripts"))
    sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "..", "scripts")))
    import locucao as L
    cfg0 = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
    out0 = os.path.join(HERE, "assets", PARTE)
    os.makedirs(out0, exist_ok=True)
    def cit(b):
        a = L.citacao_no_silencio(os.path.join(REFS, cfg0["referencias"][b["cit"]]), b["in"], b["out"])
        return a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 10 ** (-19 / 20)
    edl = json.load(open(EDL, encoding="utf-8"))["blocos"]
    words = os.path.join(out0, "gravacao.words.json")
    if not os.path.exists(words):
        json.dump(L.transcribe(L.load(GRAV)), open(words, "w", encoding="utf-8"), ensure_ascii=False)
    L.montar_edl(GRAV, words, edl, out0, citacao=cit)
    sys.exit(0)
SR = 48000
cfg = json.load(open(os.path.join(HERE, "config.json"), encoding="utf-8"))
blocos = json.load(open(os.path.join(HERE, PARTE + ".json"), encoding="utf-8"))["blocos"]
OUT = os.path.join(HERE, "assets", PARTE)
os.makedirs(OUT, exist_ok=True)

def ff_pcm(args):
    return np.frombuffer(subprocess.run(["ffmpeg", "-nostdin", "-v", "error", *args, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout, dtype=np.float32).copy()

def loud(a, target=-18.0):
    """Normaliza o volume (RMS aproximado) para juntar voz e citações sem saltos."""
    rms = np.sqrt(np.mean(a ** 2) + 1e-9)
    return a * (10 ** (target / 20) / rms)

norm = lambda s: re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
UN = "zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove".split()

def expand(hw):
    out = []
    for w, s, e in hw:
        n = norm(w)
        if n.isdigit() and n == "2001":
            parts = ["2001"]
        elif n.isdigit() and int(n) < 20:
            parts = [UN[int(n)]]
        else:
            parts = [w]
        for k, p in enumerate(parts):
            out.append((p, s + (e - s) * k / len(parts), s + (e - s) * (k + 1) / len(parts)))
    return out

def align(ref, hw, t0, t1):
    """Tempos do Whisper com a grafia do roteiro; lacunas interpoladas pelo tamanho das palavras."""
    times = [None] * len(ref)
    sm = difflib.SequenceMatcher(a=[norm(x) for x in ref], b=[norm(x[0]) for x in hw], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (hw[blk.b + k][1], hw[blk.b + k][2])
    i = 0
    while i < len(ref):
        if times[i] is None:
            j = i
            while j < len(ref) and times[j] is None:
                j += 1
            a = times[i - 1][1] if i > 0 else t0
            b = times[j][0] if j < len(ref) else t1
            lens = [len(x) + 1 for x in ref[i:j]]
            tot, acc = sum(lens), 0
            for k in range(i, j):
                s = a + (b - a) * acc / tot
                acc += lens[k - i]
                times[k] = (s, a + (b - a) * acc / tot)
            i = j
        else:
            i += 1
    return times

from faster_whisper import WhisperModel
wm = WhisperModel("small", device="cpu", compute_type="int8")

def transcribe(a, prompt=""):
    a16 = a[:: SR // 16000] if SR % 16000 == 0 else a
    segs, _ = wm.transcribe(a16.astype(np.float32), language="pt", word_timestamps=True, initial_prompt=prompt[:800] or None, condition_on_previous_text=False, beam_size=5)
    return expand([(w.word.strip(), w.start, w.end) for s in segs for w in s.words])

# ---------- 1. áudio de cada fala ----------
falas = [b for b in blocos if isinstance(b, str)]
seg_fala = []
if GRAV:
    g = ff_pcm(["-i", GRAV])
    ref = [(w, k) for k, t in enumerate(falas) for w in t.split()]
    hw = transcribe(g, " ".join(falas))
    times = align([w for w, _ in ref], hw, 0, len(g) / SR)
    for k in range(len(falas)):
        ts = [times[i] for i, (_, kk) in enumerate(ref) if kk == k]
        a, b = max(0, ts[0][0] - 0.08), min(len(g) / SR, ts[-1][1] + 0.18)
        seg_fala.append(g[int(a * SR): int(b * SR)])
else:
    from piper import PiperVoice, SynthesisConfig
    voice = PiperVoice.load(MODELO)
    syn = SynthesisConfig(length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8)
    for t in falas:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            voice.synthesize_wav(t, wf, syn_config=syn)
        buf.seek(0)
        with wave.open(buf) as wf:
            sr0 = wf.getframerate()
            x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        x = np.interp(np.arange(0, len(x), sr0 / SR), np.arange(len(x)), x).astype(np.float32)
        idx = np.where(np.abs(x) > 0.01)[0]
        seg_fala.append(x[max(0, idx[0] - 960): idx[-1] + 2400])

# ---------- 2. montagem com as citações ----------
parts, trechos, words, t, k = [np.zeros(int(0.3 * SR), np.float32)], [], [], 0.3, 0
for i, b in enumerate(blocos):
    if isinstance(b, dict):
        src = os.path.join(REFS, cfg["referencias"][b["cit"]])
        a = ff_pcm(["-ss", str(b["in"]), "-t", str(b["out"] - b["in"]), "-i", src])
        fade = int(0.03 * SR)
        a[:fade] *= np.linspace(0, 1, fade)
        a[-fade:] *= np.linspace(1, 0, fade)
        a = loud(a, -19)
        gap_a = 0.15 if i else 0.0
        parts.append(np.zeros(int(gap_a * SR), np.float32))
        t += gap_a
        trechos.append({"i": i, "texto": b["texto"], "ini": round(t, 3), "fim": round(t + len(a) / SR, 3), "cit": b["cit"]})
        parts.append(a)
        t += len(a) / SR + 0.2
        parts.append(np.zeros(int(0.2 * SR), np.float32))
        continue
    a = loud(seg_fala[k], -18)
    hw = transcribe(a, b)
    ref = b.split()
    tm = align(ref, hw, 0, len(a) / SR)
    for w, (s, e) in zip(ref, tm):
        words.append({"w": w, "s": round(t + s, 3), "e": round(t + e, 3), "trecho": i})
    trechos.append({"i": i, "texto": b, "ini": round(t + tm[0][0], 3), "fim": round(t + tm[-1][1], 3)})
    parts.append(a)
    t += len(a) / SR
    nxt = blocos[i + 1] if i + 1 < len(blocos) else None
    gap = 0.35 if isinstance(nxt, str) else 0.0
    parts.append(np.zeros(int(gap * SR), np.float32))
    t += gap
    k += 1
    print(f"{i:2d} {trechos[-1]['ini']:6.2f}-{trechos[-1]['fim']:6.2f} {b[:60]}")
parts.append(np.zeros(int(0.4 * SR), np.float32))
t += 0.4
y = np.concatenate(parts)
y = y / max(1e-6, np.abs(y).max()) * 0.89
tmp = os.path.join(OUT, "_voz.wav")
with wave.open(tmp, "wb") as wf:
    wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", "-i", tmp, "-af", "highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:makeup=2,alimiter=limit=0.89", "-ar", str(SR), os.path.join(OUT, "voz.wav")], check=True)
os.remove(tmp)
json.dump(words, open(os.path.join(OUT, "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"duracao": round(t, 3), "guia": not GRAV, "trechos": trechos}, open(os.path.join(OUT, "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{PARTE}: {t:.1f} s, {len(words)} palavras, {sum(1 for x in trechos if x.get('cit'))} citações ({'locução gravada' if GRAV else 'voz-guia'})")
