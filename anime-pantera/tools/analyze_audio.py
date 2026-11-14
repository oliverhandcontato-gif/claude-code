"""Audio analysis for the animation timeline.

Produces, inside ../audio/:
  vocals.wav      separated vocal stem (Demucs htdemucs)
  words.json      word-level transcript (faster-whisper) of the vocal stem
  beats.json      tempo, beat times and downbeat estimate (librosa)
  mouth.json      per-frame mouth openness (0..1) and roundness (0..1) at FPS

Run:  python tools/analyze_audio.py [--fps 24] [--skip-separation] [--skip-asr]
Everything here is deterministic for a given input file and model version.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio")
SRC = os.path.join(ROOT, "assets", "pantera.mp3")


def separate():
    out = os.path.join(AUDIO, "sep")
    subprocess.run([sys.executable, "-m", "demucs", "-n", "htdemucs", "--two-stems", "vocals",
                    "-o", out, SRC], check=True)
    stem_dir = os.path.join(out, "htdemucs", os.path.splitext(os.path.basename(SRC))[0])
    for name in ("vocals", "no_vocals"):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(stem_dir, name + ".wav"),
                        "-ac", "1", "-ar", "22050", os.path.join(AUDIO, name + ".wav")], check=True)


def transcribe():
    from faster_whisper import WhisperModel
    model = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=4)
    prompt = ("Pode vir que eu tô pronto. O único que me derrota sou eu. Geração Milagrosa. "
              "Pantera na quadra. Só eu que te derroto, só eu que te devoro. Entrei na zona.")
    import librosa
    y16, _ = librosa.load(os.path.join(AUDIO, "vocals.wav"), sr=16000, mono=True)
    segs, _ = model.transcribe(y16, language="pt", word_timestamps=True,
                               initial_prompt=prompt, vad_filter=True, beam_size=5)
    out = []
    for s in segs:
        out.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)}
                              for w in (s.words or [])]})
        print(f"{s.start:7.2f} {s.end:7.2f}  {s.text.strip()}", flush=True)
    with open(os.path.join(AUDIO, "words.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


def beats():
    import librosa
    y, sr = librosa.load(SRC, sr=22050, mono=True)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    times = librosa.frames_to_time(frames, sr=sr)
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    strength = [float(onset[min(f, len(onset) - 1)]) for f in frames]
    # downbeat phase: the beat phase (0..3) with the strongest summed onset
    phase = int(np.argmax([sum(strength[i::4]) for i in range(4)]))
    with open(os.path.join(AUDIO, "beats.json"), "w") as f:
        json.dump({"tempo": float(np.atleast_1d(tempo)[0]), "beats": [round(float(t), 3) for t in times],
                   "strength": [round(s, 3) for s in strength], "downbeatPhase": phase}, f)
    print("tempo", tempo, "beats", len(times))


def mouth(fps):
    import librosa
    y, sr = librosa.load(os.path.join(AUDIO, "vocals.wav"), sr=22050, mono=True)
    hop = int(round(sr / fps))
    rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]
    cent = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=2048, hop_length=hop)[0]
    ref = np.percentile(rms[rms > 1e-4], 95) if np.any(rms > 1e-4) else 1.0
    gate = np.percentile(rms, 35)
    open_ = np.clip((rms - gate) / max(ref - gate, 1e-6), 0, 1) ** 0.7
    # low spectral centroid while voiced ~ rounded vowels (o/u); high ~ e/i/s
    c = np.clip((cent - 900) / 2200, 0, 1)
    round_ = (1 - c) * (open_ > 0.15)
    n = len(open_)
    with open(os.path.join(AUDIO, "mouth.json"), "w") as f:
        json.dump({"fps": fps, "open": [round(float(v), 3) for v in open_],
                   "round": [round(float(v), 3) for v in round_[:n]]}, f)
    print("mouth frames", n)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--skip-separation", action="store_true")
    ap.add_argument("--skip-asr", action="store_true")
    a = ap.parse_args()
    os.makedirs(AUDIO, exist_ok=True)
    if not a.skip_separation:
        separate()
        beats()
        mouth(a.fps)
    if not a.skip_asr:
        transcribe()
