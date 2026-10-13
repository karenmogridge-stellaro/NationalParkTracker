#!/usr/bin/env python3
"""Reel: "Log a park in 3 taps" — composes content/clips/taplog-raw.mp4 (recorded via
record-content.sh with route "/(tabs)/home?demo=25&q=grand te") into a 1080x1920 Reel
with time-based captions and the standard end card.

Usage: python3 content/build-taplog-reel.py  → content/clips/final/taplog.mp4
"""
from __future__ import annotations

import importlib.util
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("build_clips", HERE / "build-clips.py")
bc = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(bc)

RAW_CLIP = HERE / "clips" / "taplog-raw.mp4"
OUT = bc.FINAL / "taplog.mp4"
TRIM = 1.0  # skip the dev-client "Refreshing" banner
TOTAL = 10.0
END_SECS = 2.2

# (start, end, caption) in trimmed-clip seconds
CAPTIONS = [
    (0.0, 1.4, "Log a national park in 3 taps. Even with no signal."),
    (1.4, 4.2, "Type a few letters. Tap the park."),
    (4.2, 5.2, "Tap once more."),
    (5.2, TOTAL, "Done. It syncs when you're back online."),
]

CAPTION_TEXT = """At the trailhead. No signal. Three taps.

That's the whole flow now: + → type a few letters → tap the park → "Log now." Today's date goes on it, confetti if it's a new park, and it syncs the moment you're back in service. Add the trail, photos, and notes later from the feed — or don't.

Shipped because one of you told me five fields at a trailhead with no service was too many. You were right.

What park are you logging next? 👇

🔗 parkatlas.io (link in bio) — free on iOS

#nationalparks #findyourpark #hiking #hikingapp #optoutside #getoutside #63parks #parkchasers #trailhead #parkatlas
"""


def main() -> None:
    bc.FINAL.mkdir(parents=True, exist_ok=True)
    bc.RAW.mkdir(parents=True, exist_ok=True)
    inputs = ["-ss", str(TRIM), "-t", str(TOTAL), "-i", str(RAW_CLIP)]
    filt = [
        f"[0:v]fps=30,setpts=PTS-STARTPTS,scale={bc.WIN_W}:{bc.WIN_H}[s];"
        f"color=c=0x1f4d34:s={bc.W}x{bc.H}:d={TOTAL}:r=30[bg];"
        f"[bg][s]overlay={bc.WIN_X}:{bc.WIN_Y}:shortest=1[v0]"
    ]
    cur = "v0"
    for i, (a, b, text) in enumerate(CAPTIONS):
        fp = bc.frame_png(text, bc.RAW / f"_frame-taplog-{i}.png")
        inputs += ["-loop", "1", "-t", str(TOTAL), "-i", str(fp)]
        nxt = f"v{i + 1}"
        filt.append(f"[{cur}][{i + 1}:v]overlay=0:0:shortest=1:enable='between(t,{a},{b})'[{nxt}]")
        cur = nxt
    filt.append(f"[{cur}]fade=t=in:st=0:d=0.2,fade=t=out:st={TOTAL - 0.3}:d=0.3,format=yuv420p[main]")
    ep = bc.end_png(bc.RAW / "_end.png")
    n_end = len(CAPTIONS) + 1
    inputs += ["-loop", "1", "-t", str(END_SECS), "-i", str(ep)]
    filt.append(f"[{n_end}:v]fps=30,fade=t=in:st=0:d=0.3,format=yuv420p[ve]")
    filt.append("[main][ve]concat=n=2:v=1:a=0[out]")

    tmp = OUT.with_suffix(".tmp.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]",
         "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-b:v", "8M", "-movflags", "+faststart", str(tmp)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(tmp), "-f", "lavfi", "-i",
         "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", str(OUT)],
        check=True,
    )
    tmp.unlink(missing_ok=True)
    (bc.FINAL / "taplog-caption.txt").write_text(CAPTION_TEXT)
    print("wrote", OUT.relative_to(bc.ROOT))


if __name__ == "__main__":
    main()
