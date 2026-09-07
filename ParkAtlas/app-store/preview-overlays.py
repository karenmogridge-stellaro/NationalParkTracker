#!/usr/bin/env python3
"""Renders transparent caption PNGs and the end card for the App Preview video.
Usage: preview-overlays.py <out-dir> <logo.png> <caption>...  (writes cap-0.png … and end.png)"""
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 886, 1920
FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
GREEN = (31, 77, 52)
DARK = (15, 36, 22)
# Screen window inside the frame (keeps the 1320x2868 aspect). Shared with build-app-preview.sh.
WIN = (63, 250, 822, 1900)

out, logo_path, *captions = sys.argv[1:]

def fit(draw, text, size, max_w):
    while size > 28:
        f = ImageFont.truetype(FONT, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(FONT, size)

def rounded(img, box, radius, fill):
    ImageDraw.Draw(img).rounded_rectangle(box, radius=radius, fill=fill)

# Frame: green everywhere except a transparent rounded window where the screen shows through.
frame = Image.new("RGBA", (W, H), GREEN + (255,))
hole = Image.new("L", (W, H), 255)
ImageDraw.Draw(hole).rounded_rectangle(WIN, radius=54, fill=0)
frame.putalpha(hole)
frame.save(f"{out}/frame.png")

for i, text in enumerate(captions):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = fit(d, text, 54, W - 100)
    tw = d.textlength(text, font=f)
    d.text(((W - tw) / 2, 125 - f.size / 2), text, font=f, fill=(255, 255, 255, 255))
    img.save(f"{out}/cap-{i}.png")

# End card
end = Image.new("RGBA", (W, H), GREEN + (255,))
d = ImageDraw.Draw(end)
logo = Image.open(logo_path).convert("RGBA")
logo = logo.resize((260, int(260 * logo.height / logo.width)))
tile = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
rounded(tile, (0, 0, 300, 300), 68, (255, 255, 255, 255))
tile.alpha_composite(logo, ((300 - logo.width) // 2, (300 - logo.height) // 2))
end.alpha_composite(tile, ((W - 300) // 2, H // 2 - 420))

def center(text, size, y, color):
    f = ImageFont.truetype(FONT, size)
    tw = d.textlength(text, font=f)
    d.text(((W - tw) / 2, y), text, font=f, fill=color)

center("ParkAtlas", 100, H // 2 - 60, (255, 255, 255, 255))
center("Track. Plan. Explore.", 48, H // 2 + 80, (217, 232, 220, 255))
center("All 63 national parks, one ring to fill.", 34, H // 2 + 160, (168, 213, 181, 255))
center("parkatlas.io", 38, H // 2 + 280, (255, 255, 255, 255))
end.save(f"{out}/end.png")
print(f"wrote {len(captions)} captions + end card to {out}")
