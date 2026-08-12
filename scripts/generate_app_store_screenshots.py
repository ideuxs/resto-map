#!/usr/bin/env python3
"""Generate the five RestoHub App Store marketing screenshots.

The layouts intentionally use real application captures. Pillow is only used for
the campaign framing: typography, colour blocking, patterns and device shells.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CANVAS_SIZE = (1290, 2796)

FONT_EXTRA_BOLD = ROOT / "node_modules" / "@expo-google-fonts" / "inter" / "800ExtraBold" / "Inter_800ExtraBold.ttf"
FONT_BOLD = ROOT / "node_modules" / "@expo-google-fonts" / "inter" / "700Bold" / "Inter_700Bold.ttf"
FONT_SEMI_BOLD = ROOT / "node_modules" / "@expo-google-fonts" / "inter" / "600SemiBold" / "Inter_600SemiBold.ttf"

DEFAULT_SOURCE_DIR = ROOT / "assets" / "app-store" / "source"
DEFAULT_OUTPUT_DIR = ROOT / "assets" / "app-store" / "iphone-6.9"

INK = "#17121E"
WHITE = "#FFFFFF"
LAVENDER = "#F5EFF7"
LAVENDER_STRONG = "#E9DDF0"
INDIGO = "#292C90"
PINK = "#FF007F"
FRIEND_PURPLE = "#8B3F7C"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def draw_brand(draw: ImageDraw.ImageDraw, *, dark: bool) -> None:
    x, y, w, h = 72, 72, 292, 78
    shadow = 10
    draw.rounded_rectangle((x + shadow, y + shadow, x + w + shadow, y + h + shadow), radius=25, fill=PINK)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=25, fill=WHITE, outline=INK, width=5)
    draw.ellipse((x + 22, y + 24, x + 48, y + 50), fill=PINK, outline=INK, width=3)
    draw.text((x + 65, y + 19), "RESTOHUB", font=font(FONT_EXTRA_BOLD, 31), fill=INK)


def draw_number(draw: ImageDraw.ImageDraw, number: int, *, light: bool) -> None:
    x, y, s = 1110, 76, 106
    fill = WHITE if light else INK
    text_fill = INK if light else WHITE
    draw.rounded_rectangle((x + 10, y + 10, x + s + 10, y + s + 10), radius=30, fill=PINK)
    draw.rounded_rectangle((x, y, x + s, y + s), radius=30, fill=fill, outline=INK, width=5)
    label = f"{number:02d}"
    bbox = draw.textbbox((0, 0), label, font=font(FONT_EXTRA_BOLD, 39))
    tx = x + (s - (bbox[2] - bbox[0])) / 2
    ty = y + (s - (bbox[3] - bbox[1])) / 2 - 4
    draw.text((tx, ty), label, font=font(FONT_EXTRA_BOLD, 39), fill=text_fill)


def draw_background_pattern(draw: ImageDraw.ImageDraw, *, ink: str, accent: str, variant: int) -> None:
    """Large, low-detail motifs that survive App Store thumbnail scaling."""
    if variant % 2:
        draw.ellipse((-240, 2070, 420, 2730), outline=accent, width=26)
        draw.ellipse((-145, 2165, 325, 2635), outline=accent, width=14)
        for offset in range(5):
            y = 470 + offset * 72
            draw.line((930, y, 1350, y - 220), fill=accent, width=18)
    else:
        draw.rounded_rectangle((-180, 2130, 360, 2710), radius=86, outline=accent, width=24)
        draw.rounded_rectangle((-70, 2240, 250, 2600), radius=62, outline=accent, width=13)
        for angle in range(0, 360, 45):
            cx, cy = 1115, 515
            length = 150
            x2 = cx + math.cos(math.radians(angle)) * length
            y2 = cy + math.sin(math.radians(angle)) * length
            draw.line((cx, cy, x2, y2), fill=accent, width=16)
        draw.ellipse((1077, 477, 1153, 553), fill=accent, outline=ink, width=5)


def load_screen(path: Path, crop: tuple[int, int, int, int] | None = None) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing source capture: {path}")
    image = Image.open(path).convert("RGB")
    if crop:
        image = image.crop(crop)
    return image


def draw_device(canvas: Image.Image, screen: Image.Image, *, y: int = 780) -> None:
    draw = ImageDraw.Draw(canvas)
    outer_x, outer_w, outer_h = 102, 1086, 2342
    inner_x, inner_y = outer_x + 31, y + 35
    inner_w, inner_h = outer_w - 62, outer_h - 70

    draw.rounded_rectangle(
        (outer_x + 28, y + 34, outer_x + outer_w + 28, y + outer_h + 34),
        radius=112,
        fill=INK,
    )
    draw.rounded_rectangle(
        (outer_x, y, outer_x + outer_w, y + outer_h),
        radius=112,
        fill=INK,
        outline=INK,
        width=6,
    )

    fitted = ImageOps.fit(screen, (inner_w, inner_h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.0))
    mask = rounded_mask((inner_w, inner_h), 82)
    canvas.paste(fitted, (inner_x, inner_y), mask)
    draw.rounded_rectangle(
        (inner_x, inner_y, inner_x + inner_w, inner_y + inner_h),
        radius=82,
        outline=INK,
        width=7,
    )


def draw_title(draw: ImageDraw.ImageDraw, text: str, *, colour: str) -> None:
    draw.multiline_text(
        (72, 225),
        text,
        font=font(FONT_EXTRA_BOLD, 103),
        fill=colour,
        spacing=3,
    )


def build_frame(
    *,
    index: int,
    filename: str,
    title: str,
    background: str,
    title_colour: str,
    pattern_colour: str,
    screen: Image.Image,
    output_dir: Path,
) -> Path:
    canvas = Image.new("RGB", CANVAS_SIZE, background)
    draw = ImageDraw.Draw(canvas)
    draw_background_pattern(draw, ink=INK, accent=pattern_colour, variant=index)
    draw_brand(draw, dark=title_colour == WHITE)
    draw_number(draw, index, light=background != LAVENDER and background != LAVENDER_STRONG)
    draw_title(draw, title, colour=title_colour)
    draw_device(canvas, screen)

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    canvas.save(output_path, format="PNG", optimize=True)
    return output_path


def build_contact_sheet(paths: list[Path], output_dir: Path) -> Path:
    thumb_w = 258
    thumb_h = int(CANVAS_SIZE[1] * thumb_w / CANVAS_SIZE[0])
    gap = 24
    sheet = Image.new("RGB", (thumb_w * len(paths) + gap * (len(paths) - 1), thumb_h), WHITE)
    x = 0
    for path in paths:
        image = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(image, (x, 0))
        x += thumb_w + gap
    output_path = output_dir / "contact-sheet.png"
    sheet.save(output_path, format="PNG", optimize=True)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    source_dir = args.source_dir.resolve()
    output_dir = args.output_dir.resolve()
    source_restos = source_dir / "01-restos.png"
    source_map = source_dir / "02-map.png"
    source_list_detail = source_dir / "03-list-detail.png"
    source_restaurant_detail = source_dir / "04-restaurant-detail.png"
    source_shared_lists = source_dir / "05-shared-list.png"
    restaurant_detail = load_screen(source_restaurant_detail)

    specs = [
        {
            "index": 1,
            "filename": "01-tous-tes-restos.png",
            "title": "Tous tes restos,\nau même endroit",
            "background": LAVENDER,
            "title_colour": INK,
            "pattern_colour": PINK,
            "screen": load_screen(source_restos),
            "output_dir": output_dir,
        },
        {
            "index": 2,
            "filename": "02-carte-des-pepites.png",
            "title": "Repère tes pépites\nsur la carte",
            "background": INDIGO,
            "title_colour": WHITE,
            "pattern_colour": PINK,
            "screen": load_screen(source_map),
            "output_dir": output_dir,
        },
        {
            "index": 3,
            "filename": "03-listes-bien-rangees.png",
            "title": "Tes envies,\nbien rangées",
            "background": PINK,
            "title_colour": WHITE,
            "pattern_colour": LAVENDER_STRONG,
            "screen": load_screen(source_list_detail),
            "output_dir": output_dir,
        },
        {
            "index": 4,
            "filename": "04-visites-en-memoire.png",
            "title": "Chaque visite\nreste en mémoire",
            "background": LAVENDER_STRONG,
            "title_colour": INK,
            "pattern_colour": INDIGO,
            "screen": restaurant_detail,
            "output_dir": output_dir,
        },
        {
            "index": 5,
            "filename": "05-listes-a-partager.png",
            "title": "Les bonnes adresses\nse partagent",
            "background": INK,
            "title_colour": WHITE,
            "pattern_colour": FRIEND_PURPLE,
            "screen": load_screen(source_shared_lists),
            "output_dir": output_dir,
        },
    ]

    outputs = [build_frame(**spec) for spec in specs]
    contact_sheet = build_contact_sheet(outputs, output_dir)
    print("Generated:")
    for output in [*outputs, contact_sheet]:
        print(output)


if __name__ == "__main__":
    main()
