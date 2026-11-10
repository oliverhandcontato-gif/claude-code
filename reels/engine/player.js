/* Reel engine — monta o projeto na página: carrega assets, expõe a API de render
 * (usada pelo render.cjs) e, fora do modo render, mostra um player com play/scrub e áudio.
 */
(function () {
  'use strict';
  const R = window.Reel;

  R.mount = async (project) => {
    R.project = project;
    const renderMode = new URLSearchParams(location.search).has('render');
    const app = document.getElementById('app') || document.body;
    // scene: onde o projeto desenha (2D). Com `post`, passa pelo shader WebGL.
    // Com `overlay`, uma camada 2D nítida é desenhada por cima do resultado.
    const scene = R.canvas(R.W, R.H);
    const ctx = scene.getContext('2d', { alpha: false });
    const post = project.post ? new R.Post(R.W, R.H) : null;
    const final = project.overlay ? R.canvas(R.W, R.H) : null;
    const fctx = final && final.getContext('2d', { alpha: false });
    const stage = final || (post && post.canvas) || scene;
    stage.id = 'stage';
    app.appendChild(stage);

    const fonts = [R.text.font(80), R.text.mono(40), ...(project.fonts || [])];
    await Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => {});
    if (project.signal) await R.sig.load(project.signal);
    const assets = {};
    await Promise.all(Object.entries(project.assets || {}).map(async ([k, src]) => (assets[k] = await R.loadImage(src))));
    R.fx.init();
    if (project.setup) project.setup(assets);

    R.totalFrames = Math.round(project.duration * R.FPS);
    R.renderFrame = (i) => {
      const t = i / R.FPS;
      R.resetCtx(ctx);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, R.W, R.H);
      project.render(ctx, t, assets);
      let out = scene;
      if (post) out = post.render(scene, t, project.post(t));
      if (final) {
        R.resetCtx(fctx);
        fctx.drawImage(out, 0, 0);
        project.overlay(fctx, t, assets);
      }
    };
    R.frameJPEG = (i, q = 0.92) => {
      R.renderFrame(i);
      return stage.toDataURL('image/jpeg', q).split(',')[1];
    };
    R.framePNG = (i) => {
      R.renderFrame(i);
      return stage.toDataURL('image/png').split(',')[1];
    };
    R.audioWAVBase64 = async () => R.audio.base64(R.audio.wav(await R.audio.render(project)));
    R.ready = true;
    if (!renderMode) ui(app, project);
  };

  function ui(app, project) {
    document.body.classList.add('preview');
    const bar = document.createElement('div');
    bar.className = 'controls';
    bar.innerHTML = '<button id="play">▶ play</button><input id="seek" type="range" min="0" step="1"><span id="time"></span>';
    app.appendChild(bar);
    const btn = bar.querySelector('#play'), seek = bar.querySelector('#seek'), time = bar.querySelector('#time');
    seek.max = R.totalFrames - 1;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 10))}`;
    let ac = null, buffer = null, src = null, startAt = 0, offset = 0, playing = false;

    const draw = (t) => {
      const i = Math.max(0, Math.min(R.totalFrames - 1, Math.floor(t * R.FPS)));
      R.renderFrame(i);
      seek.value = i;
      time.textContent = `${fmt(t)} / ${fmt(project.duration)}`;
    };
    const stop = () => {
      if (src) {
        src.onended = null;
        src.stop();
        src.disconnect();
        src = null;
      }
      playing = false;
      btn.textContent = '▶ play';
    };
    const play = async () => {
      if (!buffer) {
        btn.textContent = 'gerando áudio…';
        btn.disabled = true;
        ac = ac || new AudioContext();
        buffer = project.audioFile
          ? await ac.decodeAudioData(await (await fetch(project.audioFile)).arrayBuffer())
          : await R.audio.render(project);
        btn.disabled = false;
      }
      ac = ac || new AudioContext();
      await ac.resume();
      if (offset >= project.duration - 0.05) offset = 0;
      src = ac.createBufferSource();
      src.buffer = buffer;
      src.connect(ac.destination);
      startAt = ac.currentTime - offset;
      src.start(0, offset);
      playing = true;
      btn.textContent = '❚❚ pausar';
      loop();
    };
    const loop = () => {
      if (!playing) return;
      const t = ac.currentTime - startAt;
      if (t >= project.duration) {
        stop();
        offset = 0;
        draw(0);
        return;
      }
      draw(t);
      requestAnimationFrame(loop);
    };
    const toggle = () => {
      if (playing) {
        offset = ac.currentTime - startAt;
        stop();
      } else play();
    };
    btn.onclick = toggle;
    seek.oninput = () => {
      const t = seek.value / R.FPS, was = playing;
      if (playing) stop();
      offset = t;
      draw(t);
      if (was) play();
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
    });
    draw(project.poster ?? 0);
    offset = project.poster ?? 0;
  }
})();
