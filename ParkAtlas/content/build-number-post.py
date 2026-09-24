#!/usr/bin/env python3
"""Instagram carousel: "How many National Parks have you actually visited?" — 5 slides, 1080×1350.
Minimal product look: DM Sans, ParkAtlas green, cream, real app screenshots in rounded phone frames.
  python3 content/build-number-post.py   → content/instagram/number-1..5.png + number-caption.txt
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/instagram"
RAW = OUT / "raw"
FONTS = ROOT / "content/fonts"
LOGO = ROOT / "assets/images/parkatlas-logo.png"

W, H = 1080, 1350
GREEN = (27, 67, 50)
GREEN_DEEP = (15, 46, 33)
CREAM = (247, 246, 241)
INK = (28, 28, 24)
MUTED = (96, 104, 92)
MINT = (212, 245, 221)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / f"DMSans-{name}.ttf"), size)


def wrap(d: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_lines(d, lines, x, y, f, fill, gap=1.12):
    lh = int(f.size * gap)
    for ln in lines:
        d.text((x, y), ln, font=f, fill=fill)
        y += lh
    return y


def brand(img: Image.Image, x: int, y: int, light: bool, label: str = "ParkAtlas") -> None:
    logo = Image.open(LOGO).convert("RGBA").resize((64, 64), Image.LANCZOS)
    if light:
        # White tile so the dark-green mark reads on green backgrounds.
        tile = Image.new("RGBA", (64, 64), (255, 255, 255, 255))
        mask = Image.new("L", (64, 64), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, 63, 63), 16, fill=255)
        tile.putalpha(mask)
        img.alpha_composite(tile, (x, y))
        img.alpha_composite(logo.resize((48, 48), Image.LANCZOS), (x + 8, y + 8))
    else:
        img.alpha_composite(logo, (x, y))
    d = ImageDraw.Draw(img)
    d.text((x + 80, y + 14), label, font=font("Bold", 30), fill=(255, 255, 255) if light else GREEN)


def phone(shot: Path, width: int, crop_top_frac: float = 0.0, crop_h_frac: float = 1.0) -> Image.Image:
    """Screenshot in a rounded frame with a soft shadow; optionally shows only a vertical slice."""
    im = Image.open(shot).convert("RGB")
    sw, sh = im.size
    top = int(sh * crop_top_frac)
    im = im.crop((0, top, sw, min(sh, top + int(sh * crop_h_frac))))
    scale = width / im.width
    im = im.resize((width, int(im.height * scale)), Image.LANCZOS)
    r = int(width * 0.09)
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    framed = Image.new("RGBA", im.size, (0, 0, 0, 0))
    framed.paste(im, (0, 0), mask)
    # Thin bezel line for definition on cream.
    ImageDraw.Draw(framed).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, outline=(0, 0, 0, 40), width=3)
    pad = 90
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((pad, pad + 30, pad + im.width, pad + im.height + 30), r, fill=(15, 46, 33, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(framed, (pad, pad))
    return canvas


def base(bg) -> Image.Image:
    return Image.new("RGBA", (W, H), bg + (255,))


def footer(img: Image.Image, light: bool, top: bool = False) -> None:
    d = ImageDraw.Draw(img)
    f = font("Medium", 26)
    txt = "parkatlas.io"
    y = 92 if top else H - 96
    d.text((W - 72 - d.textlength(txt, font=f), y), txt, font=f, fill=(255, 255, 255, 200) if light else MUTED)


def chevron(d: ImageDraw.ImageDraw, x: int, y: int, size: int, fill, direction: str = "right") -> None:
    """DM Sans has no arrow glyphs; draw one."""
    s = size
    if direction == "right":
        d.line([(x, y), (x + s, y + s // 2), (x, y + s)], fill=fill, width=4, joint="curve")
    else:
        d.line([(x, y), (x + s // 2, y + s), (x + s, y)], fill=fill, width=4, joint="curve")


# ── Slide 1: cover ───────────────────────────────────────────────────────────
def slide_cover() -> Image.Image:
    img = base(CREAM)
    d = ImageDraw.Draw(img)
    brand(img, 72, 72, light=False)
    f = font("Bold", 104)
    lines = ["How many", "National Parks", "have you", "actually visited?"]
    y = 330
    for i, ln in enumerate(lines):
        d.text((72, y), ln, font=f, fill=GREEN if i in (1, 3) else INK)
        y += int(f.size * 1.08)
    # Quiet progress ring as a visual hook.
    cx, cy, rr = W - 200, H - 250, 96
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(220, 222, 214), width=16)
    d.arc((cx - rr, cy - rr, cx + rr, cy + rr), start=-90, end=-90 + 360 * 0.14, fill=GREEN, width=16)
    q = font("Bold", 60)
    d.text((cx - d.textlength("?", font=q) / 2, cy - 38), "?", font=q, fill=GREEN)
    d.text((cx - d.textlength("of 63", font=font("Medium", 24)) / 2, cy + 30), "of 63", font=font("Medium", 24), fill=MUTED)
    d.text((72, H - 96), "Swipe", font=font("Medium", 26), fill=MUTED)
    chevron(d, 72 + int(d.textlength("Swipe ", font=font("Medium", 26))) + 6, H - 90, 18, MUTED)
    return img


# ── Slides 2–4: headline + phone ─────────────────────────────────────────────
def slide_phone(headline: str, sub: str, shot: str, crop_top=0.0, crop_h=1.0, phone_w=760, phone_y=470) -> Image.Image:
    img = base(CREAM)
    d = ImageDraw.Draw(img)
    brand(img, 72, 72, light=False)
    y = draw_lines(d, wrap(d, headline, font("Bold", 68), W - 144), 72, 200, font("Bold", 68), INK)
    draw_lines(d, wrap(d, sub, font("Regular", 32), W - 144), 72, y + 14, font("Regular", 32), MUTED, gap=1.3)
    ph = phone(RAW / shot, phone_w, crop_top, crop_h)
    img.alpha_composite(ph, ((W - ph.width) // 2, phone_y))
    # Fade the phone into the bottom edge so cropped screens feel intentional.
    fade = Image.new("L", (W, 260), 0)
    for i in range(260):
        ImageDraw.Draw(fade).line((0, i, W, i), fill=int(255 * (i / 260) ** 1.6))
    layer = Image.new("RGBA", (W, 260), CREAM + (0,))
    layer.putalpha(fade)
    img.alpha_composite(layer, (0, H - 260))
    footer(img, light=False, top=True)
    return img


# ── Slide 5: CTA ─────────────────────────────────────────────────────────────
def slide_cta() -> Image.Image:
    img = base(GREEN)
    d = ImageDraw.Draw(img)
    brand(img, 72, 72, light=True)
    f = font("Bold", 96)
    y = 400
    for ln in ["Start building", "your ParkAtlas."]:
        d.text((72, y), ln, font=f, fill=(255, 255, 255))
        y += int(f.size * 1.08)
    y += 40
    for ln in wrap(d, "Track the parks you've visited, save the ones you want to see, and keep every adventure in one place.", font("Regular", 34), W - 144):
        d.text((72, y), ln, font=font("Regular", 34), fill=(255, 255, 255, 215))
        y += 46
    # Apple's official badge — carousel images aren't tappable, so avoid anything that looks like a custom button.
    badge = Image.open(FONTS / "app-store-badge.png").convert("RGBA")
    bw = 420
    badge = badge.resize((bw, int(badge.height * bw / badge.width)), Image.LANCZOS)
    py = H - 340
    img.alpha_composite(badge, (72, py))
    d.text((72 + bw + 28, py + badge.height // 2 - 20), "Free · iPhone", font=font("Medium", 30), fill=MINT)
    d.text((72, py + badge.height + 24), "parkatlas.io", font=font("Medium", 30), fill=MINT)
    hint = "Drop your number in the comments"
    d.text((72, H - 96), hint, font=font("Medium", 26), fill=(255, 255, 255, 200))
    chevron(d, 72 + int(d.textlength(hint + "  ", font=font("Medium", 26))), H - 92, 16, (255, 255, 255, 200), direction="down")
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    slides = [
        slide_cover(),
        slide_phone("Every park you've been to, in one place.", "Your count, your rank, and the trips behind them.", "home.png", 0.0, 0.62),
        slide_phone("Find the next one — and save it.", "Every national and state park. Tap to add it to your list.", "checklist.png", 0.30, 0.62),
        slide_phone("Watch your map fill in.", "Visited parks, wishlist parks, and everything nearby.", "explore.png", 0.30, 0.62),
        slide_cta(),
    ]
    for i, s in enumerate(slides, 1):
        s.convert("RGB").save(OUT / f"number-{i}.png", quality=95)
    (OUT / "number-caption.txt").write_text(
        "Quick: how many National Parks have you actually been to? 👀\n\n"
        "I realized I could name a bunch I'd visited… but I didn't really have one place that showed me all of them—or all the places I still wanted to go.\n\n"
        "That's a big part of why I built ParkAtlas.\n\n"
        "🏔 Discover National + State Parks\n"
        "📍 Track the parks you've visited\n"
        "❤️ Save the ones you want to explore\n"
        "🥾 Keep your adventures in one place\n\n"
        "Your adventures add up. ParkAtlas gives you a place to keep them.\n\n"
        "So—what's your number? Drop it below. 👇\n\n"
        "Explore at ParkAtlas.io\n\n"
        "#ParkAtlas #NationalParks #StateParks #NationalParkGeek #NationalParkLife #HikingAdventures #ExploreMore #OutdoorAdventure\n"
    )
    print(f"wrote {len(slides)} slides → {OUT}/number-*.png")


if __name__ == "__main__":
    main()
