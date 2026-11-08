"""Generate the original rescue emblem for web and desktop packaging."""
from pathlib import Path
from struct import pack
from zlib import compress, crc32

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, payload):
    return pack(">I", len(payload)) + kind + payload + pack(">I", crc32(kind + payload))


def png(size):
    def pixel(x, y):
        x, y = (x + .5) / size, (y + .5) / size
        radius = abs(x - .5) + abs(y - .5)
        if .35 <= radius <= .39:
            return (153, 235, 188)
        if (.465 < x < .535 and .3 < y < .58) or (x - .5) ** 2 + (y - .62) ** 2 < .08 ** 2:
            return (255, 193, 123)
        return (16, 34, 40)

    rows = b"".join(b"\x00" + bytes(c for x in range(size) for c in pixel(x, y)) for y in range(size))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", pack(">2I5B", size, size, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", compress(rows)) + chunk(b"IEND", b""))


for size in (192, 512):
    (ROOT / "public" / f"icon-{size}.png").write_bytes(png(size))

icons = ROOT / "src-tauri" / "icons"
icons.mkdir(parents=True, exist_ok=True)
data = png(256)
(icons / "icon.ico").write_bytes(pack("<3H4B2H2I", 0, 1, 1, 0, 0, 0, 0, 1, 24, len(data), 22) + data)
