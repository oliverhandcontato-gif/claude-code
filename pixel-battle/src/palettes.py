"""Controlled palettes (each material: base/shade/deep/hi + line & edge outline colours)."""
from raster import mat, hexc

PIKA = {
    "yellow": mat("#f8d038", "#e0a018", "#b07010", "#fff4a0", "#9a5a08", "#4a2a08"),
    "tip": mat("#383038", "#282028", "#181018", "#585058", "#100810", "#100810"),
    "brown": mat("#a8682a", "#804818", "#5a3010", "#c88848", "#4a2008", "#3a1808"),
}
PIKA_DET = {
    "K": hexc("#181018"), "W": hexc("#ffffff"), "R": hexc("#e83030"), "r": hexc("#b01c1c"),
    "M": hexc("#7a2a1a"), "N": hexc("#3a2010"), "B": hexc("#804818"), "P": hexc("#f07878"),
}

ZARD = {
    "orange": mat("#f08838", "#d06020", "#9a3c14", "#ffb070", "#7a2a08", "#3a1404"),
    "cream": mat("#f8e0a0", "#e0b870", "#b88a48", "#fff4d0", "#9a6428", "#3a1404"),
    "teal": mat("#3a9aa8", "#2a7280", "#1c4c58", "#64c4cc", "#12363e", "#0c2228"),
    "ivory": mat("#f4f0e4", "#c8c0b0", "#988c7c", "#ffffff", "#5a5048", "#2a2420"),
    "maw": mat("#7a1c18", "#5a1010", "#3a0808", "#a83028", "#3a0808", "#3a0808"),
    "flame": mat("#f88018", "#e83018", "#a81808", "#f8e040", "#a81808", "#a81808"),
}
ZARD_DET = {
    "K": hexc("#181018"), "W": hexc("#ffffff"), "T": hexc("#2a7280"), "M": hexc("#5a1a10"),
    "R": hexc("#c83020"), "Y": hexc("#f8e040"), "O": hexc("#f88018"), "D": hexc("#7a2a08"),
}
