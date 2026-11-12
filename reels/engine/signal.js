/* Reel engine — curvas de áudio (geradas por scripts/analyze-audio.cjs) para animar no ritmo.
 *   R.sig.level(t), R.sig.bass(t), R.sig.onset(t) -> 0..1
 *   R.sig.peak(t, window) -> maior onset na janela [t-window, t] com decaimento (bom para "kicks")
 */
(function () {
  'use strict';
  const R = window.Reel;
  let data = null;

  const at = (arr, t) => {
    if (!data || !arr) return 0;
    const x = t * data.fps, i = Math.floor(x), f = x - i;
    const a = arr[Math.max(0, Math.min(arr.length - 1, i))], b = arr[Math.max(0, Math.min(arr.length - 1, i + 1))];
    return a + (b - a) * f;
  };

  R.sig = {
    async load(url) {
      data = await (await fetch(url)).json();
      return data;
    },
    level: (t) => at(data && data.level, t),
    bass: (t) => at(data && data.bass, t),
    onset: (t) => at(data && data.onset, t),
    peak(t, win = 0.25, thr = 0.45) {
      if (!data) return 0;
      let best = 0;
      for (let k = 0; k <= win * data.fps; k++) {
        const tt = t - k / data.fps, v = at(data.onset, tt);
        if (v > thr) best = Math.max(best, v * Math.exp(-(t - tt) * 10));
      }
      return best;
    },
  };
})();
