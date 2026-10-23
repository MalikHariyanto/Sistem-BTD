"""Build the standalone, offline HTML preview and its small download package.

Run from any directory: python3 scripts/package-navigation-preview.py
Only Python's standard library is required.
"""

import base64
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "docs" / "navigation-preview"
source = (ROOT / "index.html").read_text()


def embedded(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


for font in (ROOT / "assets").glob("*.woff2"):
    source = source.replace(
        f"url('assets/{font.name}')", f"url('{embedded(font, 'font/woff2')}')"
    )

images = {
    flower: embedded(ROOT / "assets" / f"botanical-{flower}.webp", "image/webp")
    for flower in ("rose", "tulip", "anemone")
}
source = source.replace(
    "const icons=",
    "const embeddedImages=" + json.dumps(images, separators=(",", ":"))
    + ";\n    const icons=",
    1,
)
source = source.replace(
    'src="assets/botanical-${w.art}.webp"', 'src="${embeddedImages[w.art]}"'
)
source = source.replace(
    'src="assets/romantic-roses.webp"',
    'src="' + embedded(ROOT / "assets" / "romantic-roses.webp", "image/webp") + '"',
)
(ROOT / "preview-siap-buka.html").write_text(source)

instructions = """PREVIEW NAVIGASI CERITA ULANG TAHUN

Buka preview-siap-buka.html di browser. Tidak perlu instalasi atau internet.
Pilih A, B, atau C di atas preview, lalu coba tombol-tombolnya.
Rekomendasi: A, Penanda cerita.

Ini hanya preview. Website utama, foto, dan musik tidak diubah.
Detail dan gambar perbandingan:
https://github.com/MalikHariyanto/Sistem-BTD/tree/preview/navigation-options/docs/navigation-preview
"""

with zipfile.ZipFile(
    ROOT / "preview-navigasi.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=9
) as package:
    package.writestr("MULAI-DI-SINI.txt", instructions)
    package.write(ROOT / "preview-siap-buka.html", "preview-siap-buka.html")
    for name in ("Cormorant-Garamond-LICENSE.txt", "DM-Sans-LICENSE.txt"):
        package.write(ROOT / "assets" / name, "lisensi/" + name)

print("Standalone HTML and ZIP ready.")
