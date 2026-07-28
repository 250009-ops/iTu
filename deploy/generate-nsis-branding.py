#!/usr/bin/env python3
"""Generate NSIS installer branding assets from the iTestU brand icon."""

from __future__ import annotations

import io
import struct
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "desktop" / "src-tauri" / "icons"
NAVY = (15, 23, 42, 255)  # slate-900 / marketing navy


def load_source() -> Image.Image:
    app_icon = ROOT / "desktop" / "app-icon.png"
    if app_icon.exists():
        src = Image.open(app_icon).convert("RGBA")
        print(f"using {app_icon} {src.size}")
        return src
    icon_png = ICONS / "icon.png"
    src = Image.open(icon_png).convert("RGBA")
    print(f"using {icon_png} {src.size}")
    return src


def fit_logo(logo: Image.Image, box_w: int, box_h: int, pad: int = 8) -> Image.Image:
    max_w = max(1, box_w - pad * 2)
    max_h = max(1, box_h - pad * 2)
    scale = min(max_w / logo.width, max_h / logo.height)
    nw = max(1, int(logo.width * scale))
    nh = max(1, int(logo.height * scale))
    return logo.resize((nw, nh), Image.Resampling.LANCZOS)


def write_ico(path: Path, src: Image.Image, sizes: list[int]) -> None:
    """Write a multi-size PNG-compressed ICO (Vista+), readable by NSIS."""
    images: list[Image.Image] = []
    for size in sizes:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        logo = fit_logo(src, size, size, pad=0)
        canvas.paste(logo, (0, 0), logo)
        images.append(canvas)

    entries: list[tuple[int, int, int, int]] = []
    blobs: list[bytes] = []
    offset = 6 + 16 * len(images)
    for im in images:
        bio = io.BytesIO()
        im.save(bio, format="PNG")
        data = bio.getvalue()
        w, h = im.size
        entries.append((0 if w >= 256 else w, 0 if h >= 256 else h, len(data), offset))
        blobs.append(data)
        offset += len(data)

    with path.open("wb") as f:
        f.write(struct.pack("<HHH", 0, 1, len(images)))
        for w, h, size, off in entries:
            f.write(struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, size, off))
        for blob in blobs:
            f.write(blob)

    print(f"wrote {path} ({path.stat().st_size} bytes, {len(images)} sizes)")


def write_header(path: Path, src: Image.Image) -> None:
    # NSIS MUI header: 150x57, logo on the right of a white strip
    canvas = Image.new("RGBA", (150, 57), (255, 255, 255, 255))
    logo = fit_logo(src, 150, 57, pad=4)
    x = 150 - logo.width - 6
    y = (57 - logo.height) // 2
    canvas.paste(logo, (x, y), logo)
    canvas.convert("RGB").save(path, format="BMP")
    print(f"wrote {path} 150x57")


def write_sidebar(path: Path, src: Image.Image) -> None:
    # Navy panel so the red brand mark stays visible (icon is red).
    canvas = Image.new("RGBA", (164, 314), NAVY)
    logo = fit_logo(src, 164, 180, pad=22)
    x = (164 - logo.width) // 2
    y = (314 - logo.height) // 2 - 10
    canvas.paste(logo, (x, y), logo)
    canvas.convert("RGB").save(path, format="BMP")
    print(f"wrote {path} 164x314")


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    src = load_source()
    write_ico(ICONS / "nsis-installer.ico", src, [16, 24, 32, 48, 64, 128, 256])
    write_header(ICONS / "nsis-header.bmp", src)
    write_sidebar(ICONS / "nsis-sidebar.bmp", src)


if __name__ == "__main__":
    main()
