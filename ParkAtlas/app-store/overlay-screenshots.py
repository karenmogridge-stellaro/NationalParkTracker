#!/usr/bin/env python3
"""Adds a brand-colored headline band above each App Store screenshot.

Usage: overlay-screenshots.py [src_dir] [out_dir]
Defaults: app-store/upload-assets-2.0 -> app-store/upload-assets-2.0-overlay
Output keeps the source dimensions (1320x2868) so it stays upload-valid.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "app-store" / "upload-assets-2.0"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "app-store" / "upload-assets-2.0-overlay"

BRAND = "#1b4332"
HEADLINE = "#ffffff"
SUB = "#d4f5dd"
BAND_H = 560  # px of the 2868 canvas given to text; device shot is scaled into the rest

# filename -> (headline, subtitle)
COPY = {
    "01-home-progress.png": ("All 63 national parks.\nOne ring.", "Watch it fill as you go."),
    "02-park-detail.png": ("Every park.\nEvery trail.", "Tap a trail to log it in one step."),
    "03-explore-map.png": ("Your map.\nYour wishlist.", "See what's done and what's next."),
    "04-nearby-parks.png": ("Parks near you,\nright now.", "National and state — one tap to save."),
    "05-rank-up.png": ("Earn your rank.", "Trailhead to Summit, with confetti."),
    "06-onboarding.png": ("Free.\nNo account required.", "Sign in when you're ready to sync."),
}

FONT_CANDIDATES_BOLD = [
    "/System/Library/Fonts/SFCompactDisplay.ttf",
    "/System/Library/Fonts/SFCompact.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]
FONT_CANDIDATES_REG = [
    "/System/Library/Fonts/SFCompactText.ttf",
    "/System/Library/Fonts/SFCompact.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]


def load_font(candidates: list[str], size: int, bold: bool) -> ImageFont.FreeTypeFont:
    for path in candidates:
        if Path(path).exists():
            try:
                f = ImageFont.truetype(path, size)
                # Variable SF fonts expose named instances; pick a heavy one for headlines.
                if bold:
                    try:
                        names = [n.decode() if isinstance(n, bytes) else n for n in f.get_variation_names()]
                        for want in ("Heavy", "Bold", "Semibold"):
                            if want in names:
                                f.set_variation_by_name(want)
                                break
                    except Exception:
                        pass
                return f
            except Exception:
                continue
    return ImageFont.load_default()


def render(src: Path, dst: Path, headline: str, sub: str) -> None:
    shot = Image.open(src).convert("RGB")
    W, H = shot.size
    canvas = Image.new("RGB", (W, H), BRAND)

    # Scale the device shot to fit under the band, centered, with rounded top corners.
    avail_h = H - BAND_H
    scale = avail_h / H
    new_w, new_h = int(W * scale), avail_h
    small = shot.resize((new_w, new_h), Image.LANCZOS)
    radius = 56
    mask = Image.new("L", small.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, new_w, new_h + radius], radius=radius, fill=255)
    x = (W - new_w) // 2
    canvas.paste(small, (x, BAND_H), mask)

    draw = ImageDraw.Draw(canvas)
    head_font = load_font(FONT_CANDIDATES_BOLD, 118, bold=True)
    sub_font = load_font(FONT_CANDIDATES_REG, 50, bold=False)

    # Vertically center the text block within the band.
    lines = headline.split("\n")
    line_h = 128
    head_h = line_h * len(lines)
    block_h = head_h + 28 + 60
    y = (BAND_H - block_h) // 2 + 10
    for line in lines:
        w = draw.textlength(line, font=head_font)
        draw.text(((W - w) / 2, y), line, font=head_font, fill=HEADLINE)
        y += line_h
    y += 28
    w = draw.textlength(sub, font=sub_font)
    draw.text(((W - w) / 2, y), sub, font=sub_font, fill=SUB)

    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "PNG", optimize=True)
    print(f"wrote {dst.name}  {W}x{H}")


def main() -> None:
    if not SRC.is_dir():
        sys.exit(f"source folder not found: {SRC}")
    for name, (headline, sub) in COPY.items():
        src = SRC / name
        if not src.exists():
            print(f"skip {name} (missing)")
            continue
        render(src, OUT / name, headline, sub)


if __name__ == "__main__":
    main()
