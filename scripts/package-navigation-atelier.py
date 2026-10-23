"""Build an offline HTML file and ZIP for the second navigation preview."""

import base64
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "docs" / "navigation-atelier"
source = (ROOT / "index.html").read_text()


def data_uri(filename, mime):
    return "data:" + mime + ";base64," + base64.b64encode(
        (ROOT / "assets" / filename).read_bytes()
    ).decode()


for font in (ROOT / "assets").glob("*.woff2"):
    source = source.replace(
        "url('assets/" + font.name + "')",
        "url('" + data_uri(font.name, "font/woff2") + "')",
    )

flowers = {
    name: data_uri(f"botanical-{name}.webp", "image/webp")
    for name in ("rose", "tulip", "anemone")
}
source = source.replace(
    "const $=",
    "const embeddedFlowers=" + json.dumps(flowers, separators=(",", ":"))
    + ";\n    const $=",
    1,
)
source = source.replace(
    'src="assets/botanical-${chapters[chapter].art}.webp"',
    'src="${embeddedFlowers[chapters[chapter].art]}"',
)
for filename in ("botanical-rose.webp", "botanical-tulip.webp",
                 "botanical-anemone.webp", "romantic-roses.webp"):
    source = source.replace('src="assets/' + filename + '"',
                            'src="' + data_uri(filename, "image/webp") + '"')

(ROOT / "preview-siap-buka.html").write_text(source)
instructions = """TIGA IDE BARU: PITA, LEMBAR, BENDA PENGANTAR

Buka preview-siap-buka.html di browser. Bisa offline, tanpa instalasi.
Pilih D, E, atau F di atas preview. Mulai dari bab puisi.
D: sentuh pita di kanan atas, atau tarik sedikit ke bawah.
E: sentuh sudut halaman yang terlipat di kanan bawah.
F: sentuh benda kecil di kanan bawah (lilin, amplop, dan lainnya).
Daftar isi tersedia dari ikon dua garis. Tombol kembali di kiri bawah.

Halaman web utama belum diubah. Ini contoh navigasi dan transisinya.
Foto hanya berupa tempat kosong; musik tidak disertakan dalam preview.
"""
with zipfile.ZipFile(ROOT / "preview-nav-romantis.zip", "w",
                     zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    archive.writestr("MULAI-DI-SINI.txt", instructions)
    archive.write(ROOT / "preview-siap-buka.html", "preview-siap-buka.html")
    for filename in ("Cormorant-Garamond-LICENSE.txt", "DM-Sans-LICENSE.txt"):
        archive.write(ROOT / "assets" / filename, "lisensi/" + filename)

print("Second preview HTML and ZIP built.")
