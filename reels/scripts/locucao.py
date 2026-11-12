"""Edição cuidadosa de locução: escolhe as tomadas, corta só no silêncio real e confere o resultado.

Uso como módulo (tools/voz.py dos projetos) ou direto:

    python3 -I scripts/locucao.py <gravacao> <roteiro.json> <saida_dir> [--pausa 0.3] [--pausa-bloco 0.45]

roteiro.json: {"trechos": [{"texto": ..., "pausa": s}, ...]}  ou  {"blocos": ["texto", {"cit": ...}, ...]}
(citações {cit} são ignoradas aqui: só as falas gravadas entram).

Regras:
- Cada fala é dividida em frases; para cada frase procura todas as tomadas na gravação e fica com a ÚLTIMA
  tomada completa antes da frase seguinte (repetições para corrigir são descartadas).
- Os cortes nunca usam só o tempo de palavra do Whisper: o início recua e o fim avança até um trecho de
  silêncio real (energia abaixo do piso de ruído + 8 dB por pelo menos 80–120 ms), com 10 ms de fade.
- No fim, o áudio montado é transcrito de novo e comparado palavra por palavra com o roteiro.
Saídas: voz.wav (48 kHz mono, -16 LUFS), palavras.json [{w,s,e,trecho}], trechos.json e conferencia.txt.
"""
import difflib, json, os, re, subprocess, sys, unicodedata, wave
import numpy as np

SR = 48000
HOP = 0.01  # 10 ms


def load(path):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def save(path, a):
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
        wf.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())


def envelope(a):
    n = int(HOP * SR)
    frames = len(a) // n
    x = a[: frames * n].reshape(frames, n)
    return 20 * np.log10(np.sqrt((x ** 2).mean(axis=1)) + 1e-9)


class Silencio:
    """Mapa de silêncio da gravação (piso de ruído medido no próprio arquivo)."""

    def __init__(self, a):
        self.db = envelope(a)
        floor = np.percentile(self.db, 8)
        self.thr = min(floor + 8, -42)
        self.quiet = self.db < self.thr
        self.dur = len(a) / SR

    def _f(self, t):
        return int(np.clip(round(t / HOP), 0, len(self.db) - 1))

    def fim(self, t, limite, run=0.12):
        """Primeiro instante >= t em que há `run` s seguidos de silêncio (sem passar de `limite`)."""
        i, end, need = self._f(t), self._f(limite), int(run / HOP)
        k = 0
        while i < end:
            k = k + 1 if self.quiet[i] else 0
            if k >= need:
                return (i - need + 1) * HOP + 0.05
            i += 1
        # sem silêncio claro: ponto de menor energia na janela
        j0, j1 = self._f(t), max(self._f(t) + 1, end)
        return (j0 + int(np.argmin(self.db[j0:j1]))) * HOP

    def inicio(self, t, limite, run=0.08):
        """Último instante <= t precedido de `run` s de silêncio (sem voltar antes de `limite`)."""
        i, beg, need = self._f(t), self._f(limite), int(run / HOP)
        k = 0
        while i > beg:
            k = k + 1 if self.quiet[i] else 0
            if k >= need:
                return max(0, (i + need - 1) * HOP - 0.04)
            i -= 1
        j0, j1 = beg, max(beg + 1, self._f(t))
        return (j0 + int(np.argmin(self.db[j0:j1]))) * HOP

    def ponto_silencio(self, t0, t1):
        """Centro do maior trecho de silêncio entre t0 e t1 (ou o ponto de menor energia)."""
        i0, i1 = self._f(t0), max(self._f(t0) + 1, self._f(t1))
        best, cur, bs = (0, None), 0, None
        for i in range(i0, i1):
            if self.quiet[i]:
                if cur == 0:
                    bs = i
                cur += 1
                if cur > best[0]:
                    best = (cur, (bs, i))
            else:
                cur = 0
        if best[1]:
            return (best[1][0] + best[1][1]) / 2 * HOP, True
        return (i0 + int(np.argmin(self.db[i0:i1]))) * HOP, False


def fade(a, ms=10):
    n = min(len(a) // 2, int(ms / 1000 * SR))
    if n > 0:
        a[:n] *= np.linspace(0, 1, n)
        a[-n:] *= np.linspace(1, 0, n)
    return a


_UN = "zero um dois tres quatro cinco seis sete oito nove dez onze doze treze quatorze quinze dezesseis dezessete dezoito dezenove".split()


def norm(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())


_model = None


def transcribe(a, prompt=None, vad=False):
    global _model
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel("small", device="cpu", compute_type="int8")
    a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
    segs, _ = _model.transcribe(a16, language="pt", word_timestamps=True, beam_size=5, initial_prompt=prompt, condition_on_previous_text=False, vad_filter=vad)
    out = []
    for s in segs:
        for w in s.words:
            t = w.word.strip()
            n = norm(t)
            if n.isdigit() and len(n) < 3 and int(n) < 20:
                t = _UN[int(n)]
            out.append((t, w.start, w.end))
    return out


def frases(texto):
    """Divide uma fala em frases (unidades de tomada)."""
    partes = re.split(r"(?<=[.?!])\s+|(?<=\.\.\.)\s+|(?<=…)\s+", texto.strip())
    return [p for p in partes if p.strip()]


def _sim(a, b):
    return difflib.SequenceMatcher(a=a, b=b, autojunk=False).ratio()


def escolher_tomadas(unidades, hw):
    """Para cada frase, a última tomada boa antes da frase seguinte. Retorna [(i0, i1)] em índices de hw."""
    toks = [norm(w[0]) for w in hw]
    alvo = [[norm(x) for x in u.split() if norm(x)] for u in unidades]
    cands = []
    for u in alvo:
        L, cs = len(u), []
        for i in range(len(toks)):
            if not toks[i]:
                continue
            for L2 in {max(1, L - 2), max(1, L - 1), L, L + 1, L + 2}:
                if i + L2 > len(toks):
                    continue
                r = _sim(u, toks[i : i + L2])
                if r >= 0.62:
                    cs.append((i, i + L2, r))
        # mantém, para cada início, o melhor comprimento
        best = {}
        for i, j, r in cs:
            if i not in best or r > best[i][2]:
                best[i] = (i, j, r)
        # elimina inícios vizinhos que são a mesma tomada (fica com o de maior semelhança)
        ord_ = sorted(best.values())
        dedup = []
        for c in ord_:
            if dedup and c[0] < dedup[-1][1] and c[2] <= dedup[-1][2]:
                continue
            if dedup and c[0] < dedup[-1][1]:
                dedup[-1] = c
                continue
            dedup.append(c)
        cands.append(dedup)
    escolha, prev_end = [], 0
    for k, cs in enumerate(cands):
        cs = [c for c in cs if c[0] >= prev_end]
        if not cs:
            raise RuntimeError(f"frase não encontrada na gravação: {unidades[k]!r}")
        prox = [c for c in (cands[k + 1] if k + 1 < len(cands) else []) if c[0] >= cs[0][1]]
        lim = prox[0][0] if prox else 10 ** 9
        # a última tomada razoável que começa antes da próxima frase
        ok = [c for c in cs if c[0] < lim and c[2] >= max(0.62, max(x[2] for x in cs) - 0.15)]
        c = ok[-1] if ok else cs[0]
        escolha.append((c[0], c[1], c[2]))
        prev_end = c[1]
    return escolha


def alinhar(ref, hw, t0, t1):
    """Tempos do Whisper com a grafia do roteiro; lacunas interpoladas."""
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


def recortar_falas(gravacao, falas, log=print):
    """Para cada fala (texto), devolve a lista de recortes (uma por frase), cortados no silêncio."""
    a = load(gravacao)
    sil = Silencio(a)
    hw = transcribe(a, " ".join(falas)[:800])
    unidades, dono = [], []
    for k, f in enumerate(falas):
        for fr in frases(f):
            unidades.append(fr)
            dono.append(k)
    esc = escolher_tomadas(unidades, hw)
    cortes = [[] for _ in falas]
    for n, ((i0, i1, r), fr) in enumerate(zip(esc, unidades)):
        ws, we = hw[i0][1], hw[i1 - 1][2]
        prev_end = hw[i0 - 1][2] if i0 > 0 else 0.0
        next_start = hw[i1][1] if i1 < len(hw) else sil.dur
        s = sil.inicio(ws, max(prev_end, ws - 0.5))
        e = sil.fim(we, min(next_start - 0.02, we + 0.9) if next_start - we > 0.06 else we + 0.25)
        s, e = max(0, min(s, ws - 0.02)), min(sil.dur, max(e, we + 0.08))
        cortes[dono[n]].append(fade(a[int(s * SR) : int(e * SR)].copy()))
        log(f"  frase {n + 1:2d} [{s:7.2f}-{e:7.2f}] sim={r:.2f}  {fr[:70]}")
    return cortes


def conferir(a, falas, saida=None):
    """Transcreve o áudio montado e compara com o roteiro. Retorna (n_ref, faltando, sobrando, texto)."""
    hw = transcribe(a, None, vad=True)  # sem texto de referência: evita o Whisper "completar" o que não foi dito
    ref = [norm(w) for f in falas for w in f.split() if norm(w)]
    got = [norm(w[0]) for w in hw if norm(w[0])]
    sm = difflib.SequenceMatcher(a=ref, b=got, autojunk=False)
    falt, sobra, linhas = 0, 0, []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        if op in ("delete", "replace"):
            falt += i2 - i1
        if op in ("insert", "replace"):
            sobra += j2 - j1
        linhas.append(f"{op:8s} roteiro: {' '.join(ref[i1:i2])!r:40s} ouvido: {' '.join(got[j1:j2])!r}")
    txt = f"palavras do roteiro: {len(ref)} | diferenças: faltando/trocadas {falt}, a mais {sobra}\n" + "\n".join(linhas)
    if saida:
        open(saida, "w", encoding="utf-8").write(txt + "\n")
    return len(ref), falt, sobra, txt


def montar(gravacao, itens, saida_dir, pausa=0.3, pausa_bloco=0.45, citacao=None, log=print, pausas=None):
    """itens: lista de falas (str) ou citações (dict); citacao(dict) -> np.array do trecho original."""
    os.makedirs(saida_dir, exist_ok=True)
    falas = [x for x in itens if isinstance(x, str)]
    cortes = recortar_falas(gravacao, falas, log)
    parts, t, k = [np.zeros(int(0.3 * SR), np.float32)], 0.3, 0
    trechos, palavras = [], []
    for i, it in enumerate(itens):
        if isinstance(it, dict):
            c = citacao(it)
            g = 0.15 if i else 0.0
            parts.append(np.zeros(int(g * SR), np.float32)); t += g
            trechos.append({"i": i, "texto": it["texto"], "ini": round(t, 3), "fim": round(t + len(c) / SR, 3), "cit": it.get("cit", True)})
            parts.append(c); t += len(c) / SR
            parts.append(np.zeros(int(0.2 * SR), np.float32)); t += 0.2
            continue
        segs = cortes[k]; k += 1
        rms = np.sqrt(np.mean(np.concatenate(segs) ** 2) + 1e-9)
        bloco = []
        for n, sgm in enumerate(segs):
            bloco.append(sgm / rms * 10 ** (-18 / 20))
            if n < len(segs) - 1:
                bloco.append(np.zeros(int(pausa * SR), np.float32))
        b = np.concatenate(bloco)
        # tempos de palavra dentro do bloco montado
        hw = transcribe(b, it)
        ref = it.split()
        tm = alinhar(ref, hw, 0, len(b) / SR)
        for w, (s, e) in zip(ref, tm):
            palavras.append({"w": w, "s": round(t + s, 3), "e": round(t + e, 3), "trecho": i})
        trechos.append({"i": i, "texto": it, "ini": round(t + tm[0][0], 3), "fim": round(t + tm[-1][1], 3)})
        parts.append(b); t += len(b) / SR
        pz = pausas[i] if pausas else it_pausa(itens, i, pausa_bloco)
        parts.append(np.zeros(int(pz * SR), np.float32)); t += pz
    parts.append(np.zeros(int(0.5 * SR), np.float32)); t += 0.5
    y = np.concatenate(parts)
    tmp = os.path.join(saida_dir, "_voz.wav")
    save(tmp, y / max(1e-6, np.abs(y).max()) * 0.89)
    out = os.path.join(saida_dir, "voz.wav")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", "-i", tmp, "-af",
                    "highpass=f=75,afftdn=nf=-30,equalizer=f=200:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2,"
                    "acompressor=threshold=-21dB:ratio=3:attack=6:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=9",
                    "-ar", str(SR), "-ac", "1", out], check=True)
    os.remove(tmp)
    json.dump(palavras, open(os.path.join(saida_dir, "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"duracao": round(t, 3), "guia": False, "trechos": trechos}, open(os.path.join(saida_dir, "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n, falt, sobra, txt = conferir(load(out), falas, os.path.join(saida_dir, "conferencia.txt"))
    log(f"montado: {t:.1f} s | conferência: {n} palavras, {falt} faltando/trocadas, {sobra} a mais")
    return t


def it_pausa(itens, i, padrao):
    it = itens[i]
    nxt = itens[i + 1] if i + 1 < len(itens) else None
    if isinstance(nxt, dict):
        return 0.0
    return padrao


if __name__ == "__main__":
    grav, rot, out = sys.argv[1:4]
    arg = lambda k, d: float(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
    j = json.load(open(rot, encoding="utf-8"))
    itens = [x["texto"] for x in j["trechos"]] if "trechos" in j else j["blocos"]
    pz = [x.get("pausa", 0.45) for x in j["trechos"]] if "trechos" in j else None
    montar(grav, itens, out, pausa=arg("--pausa", 0.3), pausa_bloco=arg("--pausa-bloco", 0.45), pausas=pz)


# ---------------- edição por lista de cortes (EDL) ----------------
def _onset(sil, t0, t1):
    """Primeiro quadro com voz em [t0, t1] (ou t0 se não houver)."""
    i0, i1 = sil._f(t0), sil._f(t1)
    for i in range(i0, max(i0 + 1, i1)):
        if not sil.quiet[i]:
            return i * HOP
    return t0


def _offset(sil, t0, t1):
    """Último quadro com voz em [t0, t1]."""
    i0, i1 = sil._f(t0), sil._f(t1)
    for i in range(max(i0, i1) - 1, i0 - 1, -1):
        if not sil.quiet[i]:
            return (i + 1) * HOP
    return t1


def encurtar_silencios(seg, maximo=0.75, deixa=0.45):
    """Pausas internas maiores que `maximo` viram `deixa` (corte no meio do silêncio, com fade)."""
    s = Silencio(seg)
    run, out, last = 0, [], 0
    for i, q in enumerate(list(s.quiet) + [False]):
        if q:
            run += 1
            continue
        if run * HOP > maximo:
            a, b = (i - run) * HOP, i * HOP
            cut0, cut1 = a + deixa / 2, b - deixa / 2
            out.append(fade(seg[int(last * SR): int(cut0 * SR)].copy(), 8))
            last = cut1
        run = 0
    out.append(seg[int(last * SR):].copy())
    return np.concatenate(out) if len(out) > 1 else seg


def recortar_faixa(a, sil, hw, i0, i1, corte_ini=None, corte_fim=None):
    """Recorta as palavras hw[i0..i1] (inclusive) sem cortar sílaba: início e fim no silêncio real.
    corte_ini/corte_fim: ponto de corte já decidido (quando a faixa vizinha também foi mantida)."""
    ws, we = hw[i0][1], hw[i1][2]
    prev_end = hw[i0 - 1][2] if i0 > 0 else 0.0
    next_start = hw[i1 + 1][1] if i1 + 1 < len(hw) else sil.dur
    busca = max(prev_end + 0.02, ws - 0.35)
    if corte_ini is None and i0 > 0:
        # a palavra anterior foi descartada (tomada repetida): só começa depois de um silêncio real
        i, fim_busca, k = sil._f(prev_end), sil._f(ws + 0.8), 0
        while i < fim_busca:
            k = k + 1 if sil.quiet[i] else 0
            if k >= int(0.12 / HOP):
                busca = max(busca, (i - k + 1) * HOP)
                break
            i += 1
    on = _onset(sil, busca, ws + 1.2)
    off = _offset(sil, max(on + 0.05, we - 0.6), min(next_start - 0.02, we + 0.9) if next_start > we + 0.05 else we + 0.25)
    s = max(prev_end + 0.01, on - 0.07)
    e = min(next_start - 0.01 if next_start > off + 0.03 else off + 0.08, off + 0.09)
    if corte_ini is not None:
        s = corte_ini
    if corte_fim is not None:
        e = corte_fim
    seg = fade(a[int(s * SR): int(e * SR)].copy(), 10)
    return encurtar_silencios(seg), s, e


def recortar_tempo(a, sil, t0, t1):
    """Recorta [t0, t1] (s) começando na voz depois de um silêncio e terminando no silêncio depois da voz."""
    on = _onset(sil, t0, t0 + 1.5)
    off = _offset(sil, max(on + 0.05, t1 - 0.8), t1)
    s, e = max(0, on - 0.07), min(sil.dur, off + 0.09, t1 + 0.05)
    return encurtar_silencios(fade(a[int(s * SR): int(e * SR)].copy(), 10)), s, e


def montar_edl(gravacao, palavras_json, blocos, saida_dir, pausas=None, citacao=None, log=print):
    """blocos: [{"texto": str, "faixas": [[i0, i1] | {"t": [t0, t1]}, ...], "fonte"?: [gravacao, palavras]} | {"cit": ...}].
    faixas em índices de palavras da transcrição (ou em segundos com {"t": ...}). "fonte" troca a gravação do bloco."""
    fontes = {}
    def fonte(b):
        g, pj = b.get("fonte", [gravacao, palavras_json])
        if g not in fontes:
            a_ = load(g)
            fontes[g] = (a_, Silencio(a_), [tuple(x) for x in json.load(open(pj, encoding="utf-8"))])
        return fontes[g]
    a, sil, hw = fonte({})
    # faixas mantidas que se encostam na gravação: um único ponto de corte no silêncio entre elas
    todas = sorted(f for b in blocos if "faixas" in b and "fonte" not in b for f in b["faixas"] if isinstance(f, list))
    cortes_vizinhos = {}
    for (a0, a1), (b0, b1) in zip(todas, todas[1:]):
        if b0 == a1 + 1:
            c, _ = sil.ponto_silencio(hw[a1][2] - 0.08, hw[b0][1] + 0.08)
            cortes_vizinhos[("fim", a1)] = c
            cortes_vizinhos[("ini", b0)] = c
    itens, segs = [], []
    for b in blocos:
        if "cit" in b:
            itens.append(b)
            continue
        partes = []
        a, sil, hw = fonte(b)
        viz = cortes_vizinhos if "fonte" not in b else {}
        for n, f in enumerate(b["faixas"]):
            if isinstance(f, dict):
                seg, s, e = recortar_tempo(a, sil, *f["t"])
                log(f"  [{s:7.2f}-{e:7.2f}] (por tempo) {b['texto'][:80]}")
            else:
                i0, i1 = f
                seg, s, e = recortar_faixa(a, sil, hw, i0, i1, viz.get(("ini", i0)), viz.get(("fim", i1)))
                log(f"  [{s:7.2f}-{e:7.2f}] {' '.join(w[0] for w in hw[i0:i1 + 1])[:90]}")
            partes.append(seg)
        itens.append(b["texto"])
        segs.append(partes)
    return montar_segmentos(itens, segs, saida_dir, pausas=pausas, citacao=citacao, log=log)


def montar_segmentos(itens, segs, saida_dir, pausas=None, pausa=0.25, pausa_bloco=0.45, citacao=None, log=print):
    """Monta a faixa final a partir de recortes já prontos (uma lista por fala) e das citações."""
    os.makedirs(saida_dir, exist_ok=True)
    parts, t, k = [np.zeros(int(0.3 * SR), np.float32)], 0.3, 0
    trechos, palavras = [], []
    falas = [x for x in itens if isinstance(x, str)]
    for i, it in enumerate(itens):
        if isinstance(it, dict):
            c = citacao(it)
            g = 0.15 if i else 0.0
            parts.append(np.zeros(int(g * SR), np.float32)); t += g
            trechos.append({"i": i, "texto": it["texto"], "ini": round(t, 3), "fim": round(t + len(c) / SR, 3), "cit": it.get("cit", True)})
            parts.append(c); t += len(c) / SR
            parts.append(np.zeros(int(0.2 * SR), np.float32)); t += 0.2
            continue
        pedaços = segs[k]; k += 1
        rms = np.sqrt(np.mean(np.concatenate(pedaços) ** 2) + 1e-9)
        bloco = []
        for n, sg in enumerate(pedaços):
            bloco.append(sg / rms * 10 ** (-18 / 20))
            if n < len(pedaços) - 1:
                bloco.append(np.zeros(int(pausa * SR), np.float32))
        b = np.concatenate(bloco)
        hw = transcribe(b, it)
        ref = it.split()
        tm = alinhar(ref, hw, 0, len(b) / SR)
        for w, (s, e) in zip(ref, tm):
            palavras.append({"w": w, "s": round(t + s, 3), "e": round(t + e, 3), "trecho": i})
        trechos.append({"i": i, "texto": it, "ini": round(t + tm[0][0], 3), "fim": round(t + tm[-1][1], 3)})
        parts.append(b); t += len(b) / SR
        pz = pausas[i] if pausas else it_pausa(itens, i, pausa_bloco)
        parts.append(np.zeros(int(pz * SR), np.float32)); t += pz
    parts.append(np.zeros(int(0.5 * SR), np.float32)); t += 0.5
    y = np.concatenate(parts)
    tmp = os.path.join(saida_dir, "_voz.wav")
    save(tmp, y / max(1e-6, np.abs(y).max()) * 0.89)
    out = os.path.join(saida_dir, "voz.wav")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-v", "error", "-i", tmp, "-af",
                    "highpass=f=75,afftdn=nf=-30,equalizer=f=200:t=q:w=1:g=1.5,equalizer=f=3200:t=q:w=1.2:g=2,"
                    "acompressor=threshold=-21dB:ratio=3:attack=6:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=9",
                    "-ar", str(SR), "-ac", "1", out], check=True)
    os.remove(tmp)
    json.dump(palavras, open(os.path.join(saida_dir, "palavras.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump({"duracao": round(t, 3), "guia": False, "trechos": trechos}, open(os.path.join(saida_dir, "trechos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n, falt, sobra, txt = conferir(load(out), falas, os.path.join(saida_dir, "conferencia.txt"))
    log(f"montado: {t:.1f} s | conferência: {n} palavras, {falt} faltando/trocadas, {sobra} a mais")
    return t


def citacao_no_silencio(arquivo, t_in, t_out, folga=0.25):
    """Recorta um trecho de áudio de referência com início e fim no ponto mais silencioso perto das marcas."""
    a = load(arquivo)
    sil = Silencio(a)
    s, _ = sil.ponto_silencio(max(0, t_in - folga), t_in + 0.05)
    e, _ = sil.ponto_silencio(t_out - 0.05, min(sil.dur, t_out + folga))
    return fade(a[int(s * SR): int(e * SR)].copy(), 15)
