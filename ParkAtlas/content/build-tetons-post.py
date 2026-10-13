#!/usr/bin/env python3
"""Instagram carousel (10 slides, 1080x1350): Grand Teton trip, July 2025. Photo-first — minimal text.
Usage: python3 content/build-tetons-post.py  → content/instagram/tetons-01.png … tetons-10.png + tetons-caption.txt
Photos: content/instagram/raw/tetons/
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "content" / "instagram" / "raw" / "tetons"
OUT = ROOT / "content" / "instagram"
W, H = 1080, 1350
MINT = (212, 245, 221)
WHITE = (255, 255, 255)
SERIF = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
SANS_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
LOGO = ROOT / "assets" / "images" / "parkatlas-logo.png"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def load(name: str) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(RAW / name)).convert("RGB")


def shade(bottom_alpha: int, start_frac: float) -> Image.Image:
    """Soft black gradient so small text reads on any photo — no colored banner."""
    g = Image.new("L", (1, H))
    for y in range(H):
        t = max(0.0, (y / H - start_frac) / (1 - start_frac))
        g.putpixel((0, y), int(bottom_alpha * t))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.putalpha(g.resize((W, H)))
    return layer


def canvas(name: str, centering=(0.5, 0.5)) -> Image.Image:
    """Fill the 4:5 frame; `centering` picks which part of a wide shot survives the crop."""
    return ImageOps.fit(load(name), (W, H), Image.LANCZOS, centering=centering).convert("RGBA")


def shadow_text(d: ImageDraw.ImageDraw, xy, text, f, fill) -> None:
    x, y = xy
    d.text((x + 3, y + 3), text, font=f, fill=(0, 0, 0, 170))
    d.text((x, y), text, font=f, fill=fill)


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


def logo_mark(img: Image.Image) -> None:
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.resize((40, int(40 * logo.height / logo.width)))
    tile = Image.new("RGBA", (56, 56), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, 56, 56), radius=14, fill=WHITE + (255,))
    tile.alpha_composite(logo, ((56 - logo.width) // 2, (56 - logo.height) // 2))
    img.alpha_composite(tile, (W - 72 - 56, H - 72 - 56))


TOTAL = 8


def slide(name: str, n: int, *, header: str = "", caption: str = "", big: list[str] | None = None,
          centering=(0.5, 0.5), mark: bool = False) -> Image.Image:
    im = canvas(name, centering)
    if header or caption or big:
        im.alpha_composite(shade(190, 0.55))
    d = ImageDraw.Draw(im)
    y = H - 80
    if caption:
        f = font(SANS_REG, 44)
        for ln in reversed(wrap(d, caption, f, W - 144)):
            y -= 56
            shadow_text(d, (72, y), ln, f, WHITE)
    if big:
        f = font(SERIF, 88)
        y -= 12
        for ln in reversed(big):
            y -= 100
            shadow_text(d, (72, y), ln, f, WHITE)
    if header:
        y -= 56
        shadow_text(d, (72, y), header, font(SANS, 32), MINT)
    if mark:
        logo_mark(im)
    return im


slides = [
    slide("IMG_9736.JPG", 1, mark=True, centering=(0.44, 0.5),
          header="JULY 2025 · PARK 10 OF 63",
          big=["Grand Teton", "National Park"],
          caption="Breathtaking. Slightly terrifying. In a good way. Swipe →"),
    slide("IMG_9664.JPG", 2, centering=(0.42, 0.5), caption="The Cathedral Group from the sagebrush flats."),
    slide("IMG_9564.jpeg", 3, centering=(0.5, 0.4),
          caption="Mama bear and twin cubs. We did not ask for a family photo. We quietly gave them the trail, the hill, and anything else they wanted."),
    slide("IMG_9656.JPG", 4, centering=(0.5, 0.45), caption="\u201cHollywood,\u201d the local celebrity elk. Knows his angles."),
    slide("IMG_9700.JPG", 5, centering=(0.5, 0.35),
          header="PAINTBRUSH DIVIDE",
          big=["~20 miles.", "~4,500 ft up."]),
    slide("IMG_9729_Original.JPG", 6, centering=(0.5, 0.4),
          caption="The ice shelf we scooted across just below the divide. Poles planted. Did not look down."),
    slide("IMG_9765.JPG", 7, caption="Cascade Canyon. The long way home."),
    slide("IMG_0980.JPG", 8, mark=True, centering=(0.72, 0.5),
          header="MOUNT MORAN FROM CAMP AT SIGNAL MOUNTAIN",
          big=["Have you been to", "the Grand Tetons?"],
          caption="Track your parks \u2192 parkatlas.io (link in bio)"),
]

for i, s in enumerate(slides, 1):
    s.convert("RGB").save(OUT / f"tetons-{i:02d}.png", quality=95)

caption = """Grand Teton National Park \u2014 #10 of the 63 for me. July 2025.

Breathtaking, and in a few spots slightly terrifying. In a good way.

\U0001f43b A mama bear and her twin cubs on the trail ahead of us. We did not ask for a family photo. We quietly gave them the trail, the hill, and anything else they wanted.
\U0001f98c \u201cHollywood,\u201d the local celebrity elk, posing like he knows exactly how good he looks.
\U0001f3d4 Paintbrush Divide: ~20 miles, ~4,500 ft of climbing, one very long and very perfect day.
\U0001f9ca The ice shelf just below the divide that we scooted across \u2014 poles planted, not looking down. Slide 6. Yes, that\u2019s the trail.
\u26fa Camped at Signal Mountain on Jackson Lake. Mount Moran out the front door every morning. Can\u2019t recommend it enough.

Next summer I\u2019m hoping to do this whole trip again in a sweet camper van from @geotrekvans. Manifesting.

Have you been to the Grand Tetons? Tell me your favorite trail \U0001f447

\U0001f4cd Grand Teton National Park, WY
\U0001f517 parkatlas.io (link in bio) \u2014 track every park you\u2019ve visited

#grandteton #grandtetonnationalpark #paintbrushdivide #cascadecanyon #tetons #nationalparks #findyourpark #63nationalparks #hiking #hikingadventures #optoutside #getoutside #wyoming #jacksonhole #signalmountain #wildlife #elk #bears #vanlife #outdoorwomen #trailtherapy #nationalparkgeek #parkatlas
"""
(OUT / "tetons-caption.txt").write_text(caption)
print("wrote", sorted(p.name for p in OUT.glob("tetons-*")))
