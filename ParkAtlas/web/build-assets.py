#!/usr/bin/env python3
"""Generates web/parkatlas-63-checklist.pdf and web/og.png from data/parksData.ts.

Usage: python3 web/build-assets.py
Requires Pillow (already used by app-store/overlay-screenshots.py).
"""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
PARKS_TS = ROOT / "data" / "parksData.ts"
LOGO = ROOT / "assets" / "images" / "parkatlas-logo.png"

BRAND = (27, 67, 50)
INK = (28, 28, 24)
MUTED = (66, 73, 62)
LIGHT = (245, 247, 246)
MINT = (212, 245, 221)

STATE_NAMES = {
    "AK": "Alaska", "AR": "Arkansas", "AS": "American Samoa", "AZ": "Arizona", "CA": "California",
    "CO": "Colorado", "FL": "Florida", "HI": "Hawaii", "ID": "Idaho", "IN": "Indiana", "KY": "Kentucky",
    "ME": "Maine", "MI": "Michigan", "MN": "Minnesota", "MO": "Missouri", "MT": "Montana", "NC": "North Carolina",
    "ND": "North Dakota", "NM": "New Mexico", "NV": "Nevada", "OH": "Ohio", "OR": "Oregon", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VA": "Virginia", "VI": "U.S. Virgin Islands",
    "WA": "Washington", "WV": "West Virginia", "WY": "Wyoming",
}


def font(size: int, heavy: bool = False) -> ImageFont.FreeTypeFont:
    for p in ("/System/Library/Fonts/SFCompactDisplay.ttf", "/System/Library/Fonts/SFCompact.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if heavy else "/System/Library/Fonts/Supplemental/Arial.ttf"):
        if Path(p).exists():
            f = ImageFont.truetype(p, size)
            if heavy:
                try:
                    names = [n.decode() if isinstance(n, bytes) else n for n in f.get_variation_names()]
                    for want in ("Heavy", "Bold", "Semibold"):
                        if want in names:
                            f.set_variation_by_name(want)
                            break
                except Exception:
                    pass
            return f
    return ImageFont.load_default()


def load_parks() -> list[tuple[str, str]]:
    src = PARKS_TS.read_text()
    block = src.split("export const PARKS", 1)[1].split("];", 1)[0]
    rows = re.findall(r"name:\s*'([^']+)'.*?state:\s*'([A-Z]{2})'", block)
    return sorted(rows, key=lambda r: (STATE_NAMES.get(r[1], r[1]), r[0]))


def build_checklist(parks: list[tuple[str, str]]) -> None:
    # US Letter at 200 dpi.
    W, H = 1700, 2200
    page = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(page)

    # Header band
    d.rectangle([0, 0, W, 260], fill=BRAND)
    logo = Image.open(LOGO).convert("RGBA").resize((150, 150), Image.LANCZOS)
    page.paste(logo, (90, 55), logo)
    d.text((270, 70), "The 63 U.S. National Parks", font=font(74, True), fill="white")
    d.text((270, 160), "Your checklist. Track them all in the ParkAtlas app.", font=font(34), fill=MINT)

    # Two columns of checkboxes
    col_x = [90, 900]
    y0 = 320
    row_h = 56
    per_col = (len(parks) + 1) // 2
    name_f = font(30, True)
    state_f = font(24)
    for i, (name, code) in enumerate(parks):
        col = 0 if i < per_col else 1
        y = y0 + (i - col * per_col) * row_h
        x = col_x[col]
        d.rounded_rectangle([x, y, x + 34, y + 34], radius=7, outline=BRAND, width=3)
        d.text((x + 54, y - 2), name, font=name_f, fill=INK)
        w = d.textlength(name, font=name_f)
        d.text((x + 54 + w + 14, y + 4), STATE_NAMES.get(code, code), font=state_f, fill=MUTED)

    # Footer
    d.rectangle([0, H - 150, W, H], fill=LIGHT)
    d.text((90, H - 110), "parkatlas.io  ·  @parkatlas.app  ·  Free on iOS", font=font(30, True), fill=BRAND)
    d.text((90, H - 62), f"{len(parks)} parks. One ring. Where will you go next?", font=font(26), fill=MUTED)

    out = WEB / "parkatlas-63-checklist.pdf"
    page.save(out, "PDF", resolution=200.0)
    print(f"wrote {out.name}")


def build_og() -> None:
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BRAND)
    d = ImageDraw.Draw(img)
    logo = Image.open(LOGO).convert("RGBA").resize((140, 140), Image.LANCZOS)
    img.paste(logo, (80, 80), logo)
    d.text((80, 250), "All 63", font=font(96, True), fill="white")
    d.text((80, 355), "national parks.", font=font(72, True), fill="white")
    d.text((80, 445), "One ring.", font=font(72, True), fill=MINT)
    d.text((80, 545), "Track your journey · Free on iOS · parkatlas.io", font=font(30), fill=MINT)

    # Ring motif on the right
    cx, cy, r = 1000, 315, 150
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(60, 110, 85), width=26)
    d.arc([cx - r, cy - r, cx + r, cy + r], start=-90, end=-90 + 360 * (14 / 63), fill="white", width=26)
    d.text((cx, cy - 10), "14", font=font(96, True), fill="white", anchor="mm")
    d.text((cx, cy + 62), "of 63", font=font(30), fill=MINT, anchor="mm")

    out = WEB / "og.png"
    img.save(out, "PNG", optimize=True)
    print(f"wrote {out.name}")


if __name__ == "__main__":
    parks = load_parks()
    assert len(parks) == 63, f"expected 63 parks, parsed {len(parks)}"
    build_checklist(parks)
    build_og()
