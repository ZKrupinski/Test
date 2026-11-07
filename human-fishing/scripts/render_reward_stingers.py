#!/usr/bin/env python3
"""Render ORIGINAL melodic prize chimes as OGG for Human Fishing.

No source audio or melody is copied from any game. The sequence uses
short crystalline struck-bell voices in an original pentatonic ascent,
a warm final chord, and a small natural-feeling reverb. Synthesized
OFFLINE as an audio asset; the runtime uses decoded audio buffers only.
No new dependency except ffmpeg/libvorbis on the GitHub runner.
"""
from array import array
from pathlib import Path
import math
import random
import shutil
import struct
import subprocess
import tempfile
import wave

SR = 32000
BASE = Path(__file__).resolve().parents[1]
OUT = BASE / "assets" / "foley"
OUT.mkdir(parents=True, exist_ok=True)
TAU = 2 * math.pi


def bell(mix, onset, hz, length, gain, warm=False):
    """A struck glass/metal bar with inharmonic partials and soft sustain."""
    start = round(onset * SR)
    end = min(len(mix), start + round(length * SR))
    if end <= start:
        return
    for i in range(start, end):
        t = (i - start) / SR
        attack = 1 - math.exp(-t * (160 if warm else 340))
        decay = math.exp(-t * (2.75 if warm else 4.0))
        phase = TAU * hz * t
        # Slight detuning creates a wide sparkling note, not a bare sine beep.
        fundamental = math.sin(phase) * .67 + math.sin(phase * 1.003) * .25
        harmonic = math.sin(2.015 * phase + .22) * .24 * math.exp(-t * 3.3)
        glass = math.sin(3.97 * phase + .9) * .125 * math.exp(-t * 7.2)
        glint = math.sin(5.42 * phase + .3) * .065 * math.exp(-t * 12)
        mix[i] += gain * attack * decay * (fundamental + harmonic + glass + glint)


def soft_shimmer(mix, onset, duration, gain, seed):
    """A restrained glistening finish; airy, not noisy or harsh."""
    rnd = random.Random(seed)
    for j in range(11):
        t0 = onset + j * .037 + rnd.uniform(0, .015)
        hz = rnd.choice([1174.66, 1318.51, 1567.98, 1760, 2093]) * rnd.uniform(.991, 1.011)
        bell(mix, t0, hz, min(duration, .17 + rnd.random() * .15),
             gain * rnd.uniform(.23, .42))


def render(filename, duration, melody, chord, shimmer_at=None):
    frames = round(SR * duration)
    dry = array("f", [0.0]) * frames
    for onset, hz, length, gain in melody:
        bell(dry, onset, hz, length, gain)
    for onset, hz, length, gain in chord:
        bell(dry, onset, hz, length, gain, warm=True)
    if shimmer_at is not None:
        soft_shimmer(dry, shimmer_at, duration - shimmer_at - .12, .082, seed=91)
    # Small concert-room reflections leave each ascending note distinguishable.
    combined = array("f", dry)
    for ms, gain in [(77, .14), (147, .11), (226, .072), (309, .038)]:
        distance = round(SR * ms / 1000)
        for i in range(distance, frames):
            combined[i] += dry[i-distance] * gain
    # Gentle soft ceiling keeps the initial treasure hit clear but not piercing.
    peak = max(abs(x) for x in combined)
    if peak < .0001:
        raise ValueError("Generated silence: " + filename)
    amplitude = .84 / peak
    fade_start = round((duration - .19) * SR)
    pcm = array("h")
    for i, sample in enumerate(combined):
        if i > fade_start:
            sample *= max(0, (frames - i) / (frames - fade_start))
        sample *= amplitude
        sample = math.tanh(sample * 1.16) / math.tanh(1.16)
        pcm.append(max(-32767, min(32767, round(sample * 32767))))
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg required to encode reproducible OGG samples")
    with tempfile.TemporaryDirectory() as temp:
        wav = Path(temp) / "reward.wav"
        with wave.open(str(wav), "wb") as sink:
            sink.setnchannels(1)
            sink.setsampwidth(2)
            sink.setframerate(SR)
            sink.writeframes(pcm.tobytes())
        target = OUT / filename
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error",
                        "-y", "-i", str(wav), "-c:a", "libvorbis",
                        "-qscale:a", "4", str(target)], check=True)
    assert target.stat().st_size > 2500 and target.read_bytes()[:4] == b"OggS"
    print(f"PASS: original stinger {filename}: {duration:.2f}s {target.stat().st_size} bytes")


# New, independent musical motif: D-F#-A-E-B rises, then a D-major-add6
# resolve. Not a transcription of any franchise's item-get fanfare.
render("chest_prize.ogg", 1.85,
       [(0.00, 587.33, .42, .19),
        (.135, 739.99, .42, .21),
        (.270, 880.00, .43, .23),
        (.405, 987.77, .45, .24),
        (.545, 1174.66, .56, .28)],
       [(.72, 587.33, .84, .16),
        (.72, 880.00, .84, .14),
        (.72, 1174.66, .89, .24),
        (.72, 1479.98, .67, .12)],
       shimmer_at=.75)
# A longer high-value first-discovery flourish with a fifth opening note.
render("chest_prize_new.ogg", 2.05,
       [(0.00, 523.25, .39, .18),
        (.12, 659.25, .39, .20),
        (.24, 783.99, .42, .23),
        (.36, 987.77, .43, .24),
        (.48, 1318.51, .55, .25),
        (.62, 1567.98, .60, .26)],
       [(.77, 523.25, .87, .16),
        (.77, 783.99, .89, .19),
        (.77, 1046.50, .92, .26),
        (.77, 1318.51, .82, .16)],
       shimmer_at=.84)
# Distinct, crisp fish-by-fish "pachinko" glint; never the solo motif.
render("fever_prize_tick.ogg", .44,
       [(.005, 1046.50, .23, .27),
        (.084, 1567.98, .25, .19)],
       [( .151, 2093.0, .22, .15)], shimmer_at=None)
render("fever_prize_finish.ogg", 1.25,
       [(0, 783.99, .40, .23),
        (.110, 1174.66, .40, .23)],
       [(.28, 783.99, .76, .19),
        (.28, 1174.66, .79, .26),
        (.28, 1567.98, .72, .19)],
       shimmer_at=.33)
