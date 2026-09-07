#!/usr/bin/env python3
"""Records and composes the short-form video library (TikTok / Reels / Shorts) at 1080x1920.

Requires Metro running and the dev build installed on the iPhone 17 Pro Max sim.
Usage:
  content/build-clips.py                 # everything
  content/build-clips.py rankup nearby   # only these series
  SKIP_RECORD=1 content/build-clips.py   # recompose from existing raw recordings

Output: content/clips/final/<series>-<name>.mp4  (raw sim recordings in content/clips/raw/)
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / "content"
RAW = HERE / "clips" / "raw"
FINAL = HERE / "clips" / "final"
UDID = os.environ.get("SIM_UDID", "698F52B6-3650-48ED-AC12-C5696A9E8CC7")
BUNDLE = "com.parkatlas.mobile"
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
LOGO = ROOT / "assets" / "images" / "parkatlas-logo.png"
W, H = 1080, 1920
GREEN = (31, 77, 52)
MINT = (168, 213, 181)
# Phone window inside the frame; keeps the 1320x2868 sim aspect. Caption band above, handle below.
WIN_W = 740
WIN_H = int(WIN_W * 2868 / 1320)  # 1607
WIN_X = (W - WIN_W) // 2
WIN_Y = 232
SKIP_RECORD = os.environ.get("SKIP_RECORD") == "1"

PARKS = [
    (m.group(1), m.group(2))
    for m in re.finditer(r"id:\s*'(\d+)',\s*name:\s*'([^']+)'", (ROOT / "data" / "parksData.ts").read_text())
]
PARK_NAME = dict(PARKS)


def sh(*args: str, check: bool = True, **kw) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=check, text=True, capture_output=True, **kw)


DOCS = Path(sh("xcrun", "simctl", "get_app_container", UDID, BUNDLE, "data").stdout.strip()) / "Documents"
DOCS.mkdir(parents=True, exist_ok=True)
SEED_BACKUP = RAW / "_visited_backup.json"


def suppress_nearby() -> None:
    (DOCS / "nearby_prompt_state.json").write_text(json.dumps({"shownAt": int(time.time() * 1000), "dismissedParkIds": []}))


def seed_visits(count: int) -> None:
    """Replace guest visits with the first `count` national parks (no photos → per-park images)."""
    visits = [
        {"visitId": f"{pid}_{1700000000000 + i}", "parkId": pid, "parkName": name, "trailName": "", "dateUnknown": True}
        for i, (pid, name) in enumerate(PARKS[:count])
    ]
    (DOCS / "visited_parks_guest_user.json").write_text(json.dumps(visits))


def record(name: str, route: str, secs: float, loc: str | None = None, celebrate: dict | None = None) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    out = RAW / f"{name}.mp4"
    if SKIP_RECORD and out.exists():
        return out
    if loc:
        sh("xcrun", "simctl", "location", UDID, "set", loc)
        (DOCS / "nearby_prompt_state.json").unlink(missing_ok=True)
    else:
        suppress_nearby()
    if celebrate:
        (DOCS / "screenshot_celebrate.json").write_text(json.dumps(celebrate))
    (DOCS / "screenshot_route.json").write_text(json.dumps({"route": route}))
    sh("xcrun", "simctl", "status_bar", UDID, "override", "--time", "9:41", "--wifiBars", "3", "--cellularBars", "4",
       "--batteryState", "charged", "--batteryLevel", "100")
    sh("xcrun", "simctl", "terminate", UDID, BUNDLE, check=False)
    sh("xcrun", "simctl", "launch", UDID, BUNDLE)
    time.sleep(3)
    rec = subprocess.Popen(["xcrun", "simctl", "io", UDID, "recordVideo", "--codec", "h264", "--force", str(out)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(secs)
    rec.send_signal(2)
    rec.wait()
    (DOCS / "screenshot_route.json").unlink(missing_ok=True)
    (DOCS / "screenshot_celebrate.json").unlink(missing_ok=True)
    print(f"  recorded {name}")
    return out


# ── Overlays ─────────────────────────────────────────────────────────────────
def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def wrap(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if draw.textlength(t, font=f) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def frame_png(caption: str, out: Path) -> Path:
    """Green frame with a transparent phone window, caption on top, handle at the bottom."""
    img = Image.new("RGBA", (W, H), GREEN + (255,))
    hole = Image.new("L", (W, H), 255)
    ImageDraw.Draw(hole).rounded_rectangle((WIN_X, WIN_Y, WIN_X + WIN_W, WIN_Y + WIN_H), radius=64, fill=0)
    img.putalpha(hole)
    d = ImageDraw.Draw(img)
    # Caption in the band above the phone; shrink until it fits in two lines.
    size = 60
    while True:
        f = font(size)
        lines = wrap(d, caption, f, W - 120)
        if len(lines) <= 2 or size <= 40:
            break
        size -= 4
    lh = int(size * 1.2)
    y = (WIN_Y - lh * len(lines)) // 2
    for ln in lines:
        tw = d.textlength(ln, font=f)
        d.text(((W - tw) / 2, y), ln, font=f, fill=(255, 255, 255, 255))
        y += lh
    # Footer handle below the phone
    ff = font(32)
    t = "parkatlas.io  ·  @parkatlas.io"
    tw = d.textlength(t, font=ff)
    fy = WIN_Y + WIN_H + (H - WIN_Y - WIN_H - 32) // 2
    d.text(((W - tw) / 2, fy), t, font=ff, fill=MINT + (255,))
    img.save(out)
    return out


def end_png(out: Path) -> Path:
    img = Image.new("RGBA", (W, H), GREEN + (255,))
    d = ImageDraw.Draw(img)
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.resize((300, int(300 * logo.height / logo.width)))
    tile = Image.new("RGBA", (360, 360), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, 360, 360), radius=84, fill=(255, 255, 255, 255))
    tile.alpha_composite(logo, ((360 - logo.width) // 2, (360 - logo.height) // 2))
    img.alpha_composite(tile, ((W - 360) // 2, H // 2 - 470))

    def center(text: str, size: int, y: int, color) -> None:
        f = font(size)
        tw = d.textlength(text, font=f)
        d.text(((W - tw) / 2, y), text, font=f, fill=color)

    center("ParkAtlas", 112, H // 2 - 40, (255, 255, 255, 255))
    center("Get outside. Remember every park.", 48, H // 2 + 100, (217, 232, 220, 255))
    center("Link in bio  ·  parkatlas.io", 42, H // 2 + 250, (255, 255, 255, 255))
    img.save(out)
    return out


# ── Compose ──────────────────────────────────────────────────────────────────
def compose(name: str, segments: list[tuple[Path, float, str]], end_secs: float = 2.0) -> Path:
    """segments = [(raw_mp4, duration, caption)] → one 1080x1920 clip with an end card."""
    FINAL.mkdir(parents=True, exist_ok=True)
    out = FINAL / f"{name}.mp4"
    inputs: list[str] = []
    filt: list[str] = []
    concat = ""
    n = len(segments)
    for i, (raw, dur, caption) in enumerate(segments):
        fp = frame_png(caption, RAW / f"_frame-{name}-{i}.png")
        inputs += ["-i", str(raw), "-loop", "1", "-t", str(dur), "-i", str(fp)]
        v, f = 2 * i, 2 * i + 1
        fade_out = max(dur - 0.25, 0)
        filt.append(
            f"[{v}:v]fps=30,tpad=stop_mode=clone:stop_duration=20,trim=0:{dur},setpts=PTS-STARTPTS,"
            f"scale={WIN_W}:{WIN_H}[s{i}];"
            f"color=c=0x1f4d34:s={W}x{H}:d={dur}:r=30[bg{i}];"
            f"[bg{i}][s{i}]overlay={WIN_X}:{WIN_Y}:shortest=1[w{i}];"
            f"[w{i}][{f}:v]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.2,fade=t=out:st={fade_out}:d=0.25,format=yuv420p[v{i}]"
        )
        concat += f"[v{i}]"
    ep = end_png(RAW / "_end.png")
    inputs += ["-loop", "1", "-t", str(end_secs), "-i", str(ep)]
    filt.append(f"[{2 * n}:v]fps=30,fade=t=in:st=0:d=0.3,format=yuv420p[ve]")
    concat += "[ve]"
    filt.append(f"{concat}concat=n={n + 1}:v=1:a=0[out]")
    tmp = out.with_suffix(".tmp.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]",
         "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30", "-b:v", "8M", "-movflags", "+faststart", str(tmp)],
        check=True,
    )
    # Silent stereo track so platforms don't reject the upload; swap in trending audio in-app.
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(tmp), "-f", "lavfi", "-i",
         "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "96k", str(out)],
        check=True,
    )
    tmp.unlink(missing_ok=True)
    print(f"  wrote {out.relative_to(ROOT)}")
    return out


# ── Series ───────────────────────────────────────────────────────────────────
RANKS = {
    "day-hiker": ("62", 1, "Day Hiker", "hiking", "First park logged. The map just got personal."),
    "ranger": ("63", 5, "Ranger", "shield-star", "Five parks in. You know the trails now."),
    "pathfinder": ("47", 15, "Pathfinder", "compass-rose", "Fifteen parks. You go where the map gets quiet."),
    "trailblazer": ("22", 30, "Trailblazer", "fire", "Thirty parks. Most people never get here."),
    "summit": ("24", 63, "Summit", "image-filter-hdr", "All 63. There is nothing left but to go again."),
}


def series_rankup() -> None:
    print("rankup")
    for key, (pid, n, title, icon, tagline) in RANKS.items():
        payload = {"parkId": pid, "parkName": PARK_NAME[pid], "uniqueParks": n, "totalParks": 63, "milestone": True,
                   "newRank": {"id": key, "title": title, "minParks": n, "icon": icon, "tagline": tagline}}
        raw = record(f"rankup-{key}", f"/park/{pid}", 8, celebrate=payload)
        ordinal = {1: "1st", 5: "5th", 15: "15th", 30: "30th", 63: "63rd"}[n]
        compose(f"rankup-{key}", [(raw, 7.0, f"POV: you just logged your {ordinal} national park")])


TOP_PARKS = ["62", "63", "61", "24", "22", "1", "3", "28", "47", "51", "35", "8", "25", "53", "54"]
PARK_HOOKS = {
    "62": "Yosemite in 10 seconds: trails, camping, fees",
    "63": "Zion: what to know before you go",
    "61": "Yellowstone, planned in 10 seconds",
    "24": "Grand Canyon: trails, camping, best season",
    "22": "Glacier: the road opens late — here's when",
    "1": "Acadia: the East Coast's best sunrise",
    "3": "Arches: go early or don't go",
    "28": "Great Smoky Mountains: it's free — here's the catch",
    "47": "Olympic: three parks in one",
    "51": "Rocky Mountain: timed entry explained",
    "35": "Joshua Tree: best in winter, seriously",
    "8": "Bryce Canyon: the hoodoos at sunrise",
    "25": "Grand Teton: the drive alone is worth it",
    "53": "Sequoia: stand under the biggest tree on Earth",
    "54": "Shenandoah: 105 miles of Skyline Drive",
}


def series_parks() -> None:
    print("parks")
    for pid in TOP_PARKS:
        slug = PARK_NAME[pid].lower().replace(" ", "-")
        raw = record(f"park-{slug}", f"/park/{pid}", 9)
        compose(f"park-{slug}", [(raw, 8.0, PARK_HOOKS.get(pid, f"{PARK_NAME[pid]}: what to know before you go"))])


def series_count() -> None:
    """One clip: the home ring at 5 → 15 → 30 → 63, then 'how many have you been to?'"""
    print("count")
    backup = (DOCS / "visited_parks_guest_user.json").read_text()
    SEED_BACKUP.parent.mkdir(parents=True, exist_ok=True)
    SEED_BACKUP.write_text(backup)
    segs = []
    try:
        for n, label in [(5, "5 parks: Ranger"), (15, "15 parks: Pathfinder"), (30, "30 parks: Trailblazer"), (63, "All 63: Summit")]:
            seed_visits(n)
            raw = record(f"count-{n}", "/(tabs)/home", 5)
            segs.append((raw, 3.2, label))
    finally:
        (DOCS / "visited_parks_guest_user.json").write_text(backup)
    segs.append((segs[-1][0], 2.6, "How many have you been to? Comment your number"))
    compose("count-how-many", segs)


METROS = {
    "seattle": ("Seattle", "47.61,-122.33"),
    "denver": ("Denver", "39.74,-104.99"),
    "salt-lake": ("Salt Lake City", "40.76,-111.89"),
    "asheville": ("Asheville", "35.60,-82.55"),
    "phoenix": ("Phoenix", "33.45,-112.07"),
    "las-vegas": ("Las Vegas", "36.17,-115.14"),
    "san-francisco": ("San Francisco", "37.77,-122.42"),
    "portland": ("Portland", "45.52,-122.68"),
    "los-angeles": ("Los Angeles", "34.05,-118.24"),
    "boston": ("Boston", "42.36,-71.06"),
}


def series_nearby() -> None:
    print("nearby")
    for key, (city, loc) in METROS.items():
        raw = record(f"nearby-{key}", "/(tabs)/home", 9, loc=loc)
        compose(f"nearby-{key}", [(raw, 8.0, f"Parks within a drive of {city} you haven't done yet")])
    sh("xcrun", "simctl", "location", UDID, "set", "37.75,-119.60")
    suppress_nearby()


SERIES = {"rankup": series_rankup, "parks": series_parks, "count": series_count, "nearby": series_nearby}

if __name__ == "__main__":
    RAW.mkdir(parents=True, exist_ok=True)
    # Old seed visits carry a stock Unsplash photo; drop it so feed cards show each park's own photo.
    p = DOCS / "visited_parks_guest_user.json"
    if p.exists():
        v = json.loads(p.read_text())
        for x in v:
            if "unsplash.com" in (x.get("photoUri") or ""):
                x.pop("photoUri", None)
        p.write_text(json.dumps(v))
    which = sys.argv[1:] or list(SERIES)
    for s in which:
        SERIES[s]()
    sh("xcrun", "simctl", "status_bar", UDID, "clear", check=False)
    print("\nDone →", FINAL.relative_to(ROOT))
