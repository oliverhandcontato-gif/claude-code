import json, sys, wave, numpy as np
from faster_whisper import WhisperModel
PROMPT = ("Toda mesa de Ordem Paranormal tem esses cinco agentes, e um deles é você. Número um: o Ocultista. Aprendeu um ritual e agora resolve tudo com ele. "
 "Porta trancada? Ritual. Interrogatório? Ritual. Sanidade? Que sanidade? Número dois: o Combatente. Sozinho. Sem lanterna. Relaxa, eu aguento. Não aguentou. "
 "Número três: o Especialista. Número quatro: o Escritor. Número cinco: o Curioso, o mais perigoso de todos. Eu toco no objeto amaldiçoado. Marca o seu grupo. Segue a Toca dos Cookies.")
m = WhisperModel("small", device="cpu", compute_type="int8")
wf = wave.open(sys.argv[1]); a = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
segs, _ = m.transcribe(a, language="pt", word_timestamps=True, initial_prompt=PROMPT, condition_on_previous_text=False, vad_filter=False)
out = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    out += [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in s.words]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
