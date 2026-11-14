// Editable parameters for the whole sequence.
// Change values here; every frame is re-derived from them deterministically.
(function (A) {
  A.CFG = {
    width: 1920,
    height: 1080,
    fps: 24,
    duration: 223.32, // seconds, matches assets/pantera.mp3
    // Default "drawing rate": 2 = animate on twos (12 drawings/s), 3 = on threes.
    defaultStep: 2,
    lineColor: "#17121a",
    lineWidth: 2.6, // base contour width at 1080p for a full-body framing (scales with zoom)
    light: [-0.55, -0.75], // screen-space direction toward the key light (x,y), used by cel shading
    grain: 0.035, // film grain opacity
    letterbox: 0, // 0..1 cinemascope bars amount
    showLyrics: false, // set true to burn subtitles from audio/timing (off by default)
  };

  // Palettes taken from the supplied references (Touou black/maroon kit, Teiko white/navy kit).
  A.PAL = {
    skin: { base: "#a5754f", shade: "#74492f", deep: "#4f2f1f", hi: "#c99470", blush: "#9a5e45" },
    hair: { base: "#26357a", shade: "#141c45", deep: "#0b1030", hi: "#4a63b8", spec: "#7d94dd" },
    eye: { white: "#eef0f4", iris: "#2f4f9e", irisDark: "#18285a", irisHi: "#7fa2e8", lid: "#17121a" },
    mouth: { inside: "#4a1f22", tongue: "#a24a4a", teeth: "#f2efe9" },
    touou: {
      base: "#1d1d24", shade: "#0f0f14", hi: "#3b3b48",
      trim: "#7a2228", trim2: "#4d1418", text: "#7d2329", text2: "#ece9e4",
    },
    teiko: {
      base: "#f1f2f6", shade: "#c3c8d8", hi: "#ffffff",
      trim: "#26346e", trim2: "#5a6ab0", text: "#1f2b62", text2: "#1f2b62",
    },
    rival: {
      base: "#e9e7e2", shade: "#b4b0aa", hi: "#ffffff",
      trim: "#2c5aa0", trim2: "#88a6d6", text: "#2c5aa0", text2: "#2c5aa0",
    },
    shoe: { base: "#ecebef", shade: "#a8a9b4", sole: "#2a2a30", accent: "#7a2228" },
    ball: { base: "#d9672b", shade: "#9c3f17", hi: "#f39a5a", seam: "#2a1610" },
    chain: { base: "#cfd3dc", shade: "#7c8291", hi: "#ffffff" },
    zone: { core: "#e8f4ff", glow: "#4f8dff", deep: "#1b3da8" },
  };
})(window.A = window.A || {});
