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
LIGHT_RING = (221, 227, 223)
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
    return re.findall(r"name:\s*'([^']+)'.*?state:\s*'([A-Z]{2})'", block)


def group_by_state(parks: list[tuple[str, str]]) -> list[tuple[str, list[str]]]:
    groups: dict[str, list[str]] = {}
    for name, code in parks:
        groups.setdefault(STATE_NAMES.get(code, code), []).append(name)
    return sorted((state, sorted(names)) for state, names in groups.items())


def draw_ring(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, width: int, pct: float, track, fill) -> None:
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=track, width=width)
    if pct > 0:
        d.arc([cx - r, cy - r, cx + r, cy + r], start=-90, end=-90 + 360 * pct, fill=fill, width=width)


RANKS = [("Trailhead", 0), ("Day Hiker", 1), ("Ranger", 5), ("Pathfinder", 15), ("Trailblazer", 30), ("Summit", 63)]


def build_checklist(parks: list[tuple[str, str]]) -> None:
    # US Letter at 200 dpi.
    W, H = 1700, 2200
    M = 90  # page margin
    page = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(page)

    # ── Header (white so the green logo reads) ─────────────────────────────
    logo = Image.open(LOGO).convert("RGBA").resize((150, 150), Image.LANCZOS)
    page.paste(logo, (M, 60), logo)
    d.text((M + 175, 62), "The 63 U.S. National Parks", font=font(72, True), fill=INK)
    d.text((M + 178, 150), "Your checklist — grouped by state. Track them all in the ParkAtlas app.", font=font(30), fill=MUTED)

    # Progress ring + score box, top right
    cx, cy, r = W - M - 95, 135, 78
    draw_ring(d, cx, cy, r, 14, 0.0, LIGHT_RING, BRAND)
    d.text((cx, cy - 8), "___", font=font(44, True), fill=INK, anchor="mm")
    d.text((cx, cy + 40), "of 63", font=font(22), fill=MUTED, anchor="mm")

    d.line([(M, 240), (W - M, 240)], fill=BRAND, width=4)

    # ── Body: states A→Z, parks A→Z within each, flowing down 3 columns ──
    groups = group_by_state(parks)
    col_w = (W - 2 * M - 2 * 40) // 3
    col_x = [M + i * (col_w + 40) for i in range(3)]
    y_top, y_bottom = 275, H - 340
    header_h, row_h, gap_after_group = 42, 40, 14

    state_f = font(24, True)
    park_f = font(27, True)

    # Pre-measure so groups never split across a column break.
    def group_height(names: list[str]) -> int:
        return header_h + row_h * len(names) + gap_after_group

    col, y = 0, y_top
    for state, names in groups:
        gh = group_height(names)
        if y + gh > y_bottom and col < 2:
            col, y = col + 1, y_top
        x = col_x[col]

        # State header pill
        d.rounded_rectangle([x, y, x + col_w, y + header_h - 8], radius=10, fill=BRAND)
        d.text((x + 16, y + 5), state.upper(), font=state_f, fill="white")
        d.text((x + col_w - 16, y + 7), f"{len(names)}", font=font(22, True), fill=MINT, anchor="ra")
        y += header_h

        for name in names:
            d.rounded_rectangle([x + 8, y + 3, x + 8 + 28, y + 31], radius=6, outline=BRAND, width=3)
            # SF Compact lacks the Hawaiian okina glyph; a straight apostrophe reads fine in print.
            d.text((x + 54, y + 1), name.replace("\u02bb", "'"), font=park_f, fill=INK)
            y += row_h
        y += gap_after_group

    # ── Footer: rank ladder + brand ────────────────────────────────────────
    fy = H - 310
    d.rounded_rectangle([M, fy, W - M, H - 95], radius=28, fill=LIGHT)
    d.text((M + 36, fy + 26), "EARN YOUR RANK", font=font(22, True), fill=BRAND)
    d.text((M + 36, fy + 58), "Every park you log moves you up the ladder in the app.", font=font(24), fill=MUTED)

    # Ladder: six nodes across the card
    lx0, lx1, ly = M + 70, W - M - 70, fy + 132
    d.line([(lx0, ly), (lx1, ly)], fill=LIGHT_RING, width=8)
    for i, (title, n) in enumerate(RANKS):
        x = lx0 + (lx1 - lx0) * i // (len(RANKS) - 1)
        d.ellipse([x - 18, ly - 18, x + 18, ly + 18], fill=BRAND if i == 0 else "white", outline=BRAND, width=5)
        d.text((x, ly + 34), title, font=font(24, True), fill=INK, anchor="ma")
        d.text((x, ly + 64), f"{n} park{'s' if n != 1 else ''}", font=font(20), fill=MUTED, anchor="ma")

    d.text((W // 2, H - 52), "parkatlas.io  ·  @parkatlas.io  ·  Available on iOS", font=font(26, True), fill=BRAND, anchor="mm")

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
    d.text((80, 545), "Track your journey · Available on iOS · parkatlas.io", font=font(30), fill=MINT)

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
