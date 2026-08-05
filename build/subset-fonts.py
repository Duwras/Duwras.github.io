"""
BETŰTÍPUS-SZŰKÍTŐ — a három családot letölti a Google Fonts-ról, a magyar
szöveghez szükséges jelekre vágja, és az assets/fonts/ mappába írja woff2-ben.
Az oldal ezután SAJÁT domainről tölti a betűket (296 kB -> ~58 kB, nincs
harmadik fél). A kimenet be van commitolva, ezt a szkriptet csak akkor kell
futtatni, ha új karakter kell (pl. más nyelv) vagy frissül a család.

    python -m venv .venv && .venv/Scripts/pip install fonttools brotli
    .venv/Scripts/python build/subset-fonts.py

Licenc: SIL OFL — a szűkített változat is szabadon használható, a licencszöveg
az assets/fonts/OFL-*.txt fájlokban van a betűk mellett (az OFL ezt kéri).
"""

import io, os, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.subset import Subsetter, Options

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fonts")
os.makedirs(OUT, exist_ok=True)

LATIN = (
    list(range(0x20, 0x7F))
    + [0xA0, 0xA9, 0xAB, 0xBB, 0xB0, 0xB7, 0xD7, 0xE9, 0xC9, 0xE1, 0xC1, 0xED, 0xCD,
       0xF3, 0xD3, 0xF6, 0xD6, 0xFA, 0xDA, 0xFC, 0xDC, 0xE4, 0xC4, 0xF4, 0xD4, 0xFB, 0xDB,
       0xE0, 0xC0, 0xE8, 0xC8, 0xF1, 0xD1, 0xE7, 0xC7, 0xDF, 0xB1, 0xBD, 0xBC]
    + [0x2010, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
       0x2022, 0x2026, 0x2030, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2212, 0x2192, 0x2190,
       0x2191, 0x2193, 0x00AD, 0x2009, 0x202F]
)
EXT = [0x150, 0x151, 0x170, 0x171]  # ő Ő ű Ű

FONTS = [
    ("inter", "latin", "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2", (400, 700)),
    ("inter", "ext", "https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2", (400, 700)),
    ("inter-tight", "latin", "https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsH8ag.woff2", (700, 800)),
    ("inter-tight", "ext", "https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsJ8ah8QA.woff2", (700, 800)),
    ("jetbrains-mono", "latin", "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTOlOV.woff2", (400, 400)),
    ("jetbrains-mono", "ext", "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxTNFOVgaY.woff2", (400, 400)),
]

for name, kind, url, wght in FONTS:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req).read()
    before = len(raw)
    font = TTFont(io.BytesIO(raw))

    if "fvar" in font:
        lo, hi = wght
        if lo == hi:
            font = instancer.instantiateVariableFont(font, {"wght": lo}, inplace=False, updateFontNames=False)
        else:
            font = instancer.instantiateVariableFont(font, {"wght": (lo, lo, hi)}, inplace=False, updateFontNames=False)

    opts = Options()
    opts.layout_features = ["kern", "liga", "clig", "ccmp", "locl", "mark", "mkmk", "rlig", "calt"]
    opts.name_IDs = ["*"]
    opts.name_legacy = False
    opts.notdef_outline = False
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]
    opts.flavor = "woff2"

    sub = Subsetter(options=opts)
    sub.populate(unicodes=(LATIN if kind == "latin" else EXT))
    sub.subset(font)
    font.flavor = "woff2"
    path = os.path.join(OUT, f"{name}-{kind}.woff2")
    font.save(path)
    after = os.path.getsize(path)
    print(f"{name}-{kind}.woff2  {before/1024:6.1f} KB -> {after/1024:6.1f} KB")
