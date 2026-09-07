#!/usr/bin/env python3
"""Instagram carousel (3 slides, 1080x1350) built from the site's 'Why I built this' section.
Usage: python3 content/build-about-post.py  → content/instagram/about-1.png … about-3.png + about-caption.txt
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "instagram"
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1080, 1350
GREEN = (27, 67, 50)
MINT = (212, 245, 221)
WHITE = (255, 255, 255)
SERIF = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SERIF_REG = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
SANS_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
LOGO = ROOT / "assets" / "images" / "parkatlas-logo.png"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(d: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def cover(path: Path) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    return ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, 0.35))


def gradient(top_alpha: int, bottom_alpha: int, start_frac: float = 0.35) -> Image.Image:
    g = Image.new("L", (1, H))
    for y in range(H):
        t = max(0.0, (y / H - start_frac) / (1 - start_frac))
        g.putpixel((0, y), int(top_alpha + (bottom_alpha - top_alpha) * t))
    layer = Image.new("RGBA", (W, H), GREEN + (0,))
    layer.putalpha(g.resize((W, H)))
    return layer


def brand_footer(img: Image.Image, light: bool = True) -> None:
    d = ImageDraw.Draw(img)
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.resize((56, int(56 * logo.height / logo.width)))
    tile = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, 72, 72), radius=18, fill=WHITE + (255,))
    tile.alpha_composite(logo, ((72 - logo.width) // 2, (72 - logo.height) // 2))
    img.alpha_composite(tile, (72, H - 72 - 72))
    f = font(SANS, 30)
    d.text((160, H - 72 - 62), "ParkAtlas", font=f, fill=WHITE if light else GREEN)
    f2 = font(SANS_REG, 26)
    d.text((160, H - 72 - 24), "parkatlas.io · @parkatlas.io", font=f2, fill=MINT if light else (66, 73, 62))


# ── Slide 1: Telluride photo + hook ───────────────────────────────────────────
s1 = cover(ROOT / "web" / "karen-telluride.jpg").convert("RGBA")
s1.alpha_composite(gradient(0, 235, 0.3))
d = ImageDraw.Draw(s1)
f_eyebrow = font(SANS, 26)
d.text((72, 840), "WHY I BUILT PARKATLAS", font=f_eyebrow, fill=MINT)
f_h = font(SERIF, 84)
y = 890
for ln in ["Not the number.", "The getting out."]:
    d.text((72, y), ln, font=f_h, fill=WHITE)
    y += 96
f_sub = font(SANS_REG, 34)
d.text((72, y + 18), "Hi, I'm Ren. Swipe for the story →", font=f_sub, fill=MINT)
brand_footer(s1)
s1.convert("RGB").save(OUT / "about-1.png", quality=95)

# ── Slide 2: the story on green ───────────────────────────────────────────────
s2 = Image.new("RGBA", (W, H), GREEN + (255,))
d = ImageDraw.Draw(s2)
d.text((72, 96), "HI, I'M REN.", font=font(SANS, 28), fill=MINT)
paras = [
    "I made ParkAtlas for myself first — a simple way to keep track of the parks I've been to, and a nudge to get outside more often than I otherwise would.",
    "After losing my husband of twenty years to cancer, I stopped believing that what matters most is time behind a desk. What matters is the trail, the people you walk it with, and actually remembering the days you spent out there.",
    "So that's what this app is for. Not the number — the getting out.",
]
f_body = font(SERIF_REG, 44)
y = 180
for p in paras:
    for ln in wrap(d, p, f_body, W - 144):
        d.text((72, y), ln, font=f_body, fill=WHITE)
        y += 60
    y += 40
d.text((72, y + 10), "I want to surround myself with people who feel", font=font(SERIF, 42), fill=MINT)
d.text((72, y + 68), "the same way. Hope to see you on the trails.", font=font(SERIF, 42), fill=MINT)
brand_footer(s2)
s2.convert("RGB").save(OUT / "about-2.png", quality=95)

# ── Slide 3: Arches photo + CTA ───────────────────────────────────────────────
s3 = cover(ROOT / "web" / "karen-arches.jpg").convert("RGBA")
s3.alpha_composite(gradient(0, 240, 0.4))
d = ImageDraw.Draw(s3)
d.text((72, 900), "PARKATLAS · NOW ON iOS", font=font(SANS, 26), fill=MINT)
f_h3 = font(SERIF, 72)
d.text((72, 946), "Get outside.", font=f_h3, fill=WHITE)
d.text((72, 1030), "Remember every park.", font=f_h3, fill=WHITE)
d.text((72, 1130), "Link in bio → parkatlas.io", font=font(SANS_REG, 34), fill=MINT)
brand_footer(s3)
s3.convert("RGB").save(OUT / "about-3.png", quality=95)

caption = """Hi, I'm Ren. I built ParkAtlas, and I want to tell you why.

I made it for myself first — a simple way to keep track of the parks I've been to, and a nudge to get outside more often than I otherwise would.

After losing my husband of twenty years to cancer, I stopped believing that what matters most is time behind a desk. What matters is the trail, the people you walk it with, and actually remembering the days you spent out there.

So that's what this app is for. Not the number — the getting out.

I want to surround myself with people who feel the same way. If that's you, come say hi. Tell me the park that changed something for you. 🌲

Hope to see you on the trails.
— Ren

📍 Telluride, CO and Arches National Park, UT
🔗 parkatlas.io (link in bio)

#nationalparks #getoutside #hiking #optoutside #findyourpark #nationalparkgeek #hikingadventures #outdoorwomen #griefjourney #liveoutdoors #parkatlas #utahhiking #coloradohiking #trailtherapy
"""
(OUT / "about-caption.txt").write_text(caption)
print("wrote", sorted(p.name for p in OUT.iterdir()))
