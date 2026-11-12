/* TIO ARLE APRESENTA ECHO VALLEY — especial vertical (1080×1920, 30 fps).
 * Direção: documento "Tio_Arle_Echo_Valley_Roteiro_e_Direcao" (v1). Editorial, sem glitch a cada corte,
 * sem flashes; trechos curtos da obra com etiqueta de origem; marcas d'água preservadas.
 * Parte por ?parte=parte1|parte2 (padrão parte1). Tudo configurável em config.json / parteN.json.
 * Sem locução gravada, os tempos vêm de tools/tempos-provisorios.cjs e o vídeo é marcado PRÉVIA SEM LOCUÇÃO.
 */
(async function () {
  'use strict';
  const R = window.Reel, E = R.ease;
  const { W, H } = R;
  const Q = new URLSearchParams(location.search);
  const PARTE = Q.get('parte') || 'parte1';
  const CFG = await (await fetch('config.json')).json();
  const TL = await (await fetch(`${PARTE}.json`)).json();
  const WORDS = await (await fetch(`assets/${PARTE}/palavras.json`)).json();
  const TRJ = await (await fetch(`assets/${PARTE}/trechos.json`)).json();
  const TR = TRJ.trechos, PROVISORIO = !!TRJ.provisorio, GUIA = !!TRJ.guia;
  const CACHE = `../../out/cache/echo-valley-especial/${PARTE}/`;
  const MAN = await (await fetch(CACHE + 'manifest.json')).json();
  const DUR = Math.ceil((TRJ.duracao + 0.6) * 10) / 10;
  const C = CFG.cores, FONT = CFG.fonte;
  let VOICE_FILE = null;
  try {
    const r = await fetch(`assets/${PARTE}/voz.wav`, { method: 'HEAD' });
    if (r.ok) VOICE_FILE = `assets/${PARTE}/voz.wav`;
  } catch (e) {}

  // ---------------- tempos ----------------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
  const wordsOf = (i) => WORDS.filter((w) => w.trecho === i);
  const wt = (b, w, n = 0) => wordsOf(b).filter((x) => norm(x.w).startsWith(norm(w)))[n].s;
  const P = TL.planos;
  const TS = P.map((p, i) => (i === 0 ? 0 : Math.max(0, p.w ? wt(p.b, p.w, p.n || 0) - 0.05 : TR[p.b].ini - 0.2)));
  const shotAt = (t) => {
    let k = 0;
    for (let i = 0; i < TS.length; i++) if (t >= TS[i]) k = i;
    return k;
  };
  const shotEnd = (k) => TS[k + 1] ?? DUR;

  // ---------------- quadros ----------------
  const cache = new Map();
  const frame = (k, item, idx) => {
    const it = MAN.planos[k].items[item];
    const i = Math.max(0, Math.min(it.count - 1, idx));
    const key = `${k}:${item}:${i}`;
    if (!cache.has(key)) {
      cache.set(key, R.loadImage(`${CACHE}${it.dir}/${String(i + 1).padStart(4, '0')}.jpg`));
      if (cache.size > 90) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  };
  const isCit = (k) => !!TR[P[k].b].cit;
  const srcIdx = (k, t) => {
    const p = P[k], t0 = isCit(k) && !p.w ? TR[p.b].ini : TS[k], lt = Math.max(0, t - t0 - (p.congela || 0));
    return Math.floor(lt * (p.sp || 1) * 30);
  };
  let cur = null;

  // ---------------- desenho ----------------
  const blurC = R.canvas(270, 480);
  function blurred(ctx, img, dark = 0.55) {
    const g = blurC.getContext('2d');
    g.filter = 'blur(6px)';
    R.drawCover(g, img, { w: 270, h: 480, zoom: 1.15 });
    g.filter = 'none';
    ctx.drawImage(blurC, 0, 0, W, H);
    ctx.fillStyle = `rgba(10,10,12,${dark})`;
    ctx.fillRect(0, 0, W, H);
  }
  const ENF = new Set((TL.enfase || CFG.enfase || []).map((w) => norm(w)));
  const ENF_T = WORDS.filter((w) => ENF.has(norm(w.w))).map((w) => w.s);
  const punch = (t, c, amt, back = 0.22) => (t < c ? 0 : amt * Math.exp(-(t - c) / back) * R.clamp((t - c) / 0.04));
  const zoomOf = (k, t) => {
    const lt = t - TS[k], step = Math.floor(lt / 2.2);
    let z = 1 + 0.04 * R.clamp(lt / 4) + (step % 2 ? 0.1 : 0) * E.outCubic(R.clamp((lt - step * 2.2) / 0.12));
    for (const c of ENF_T) z += punch(t, c, 0.07);
    return z + punch(t, TS[k], 0.06, 0.15);
  };
  function cheio(ctx, k, t, img) {
    const m = R.drawCover(ctx, img, { zoom: zoomOf(k, t) });
    const p = P[k];
    if (p.marca && t - TS[k] < (p.congela || 0) + 1.6) {
      const [u0, v0, u1, v1] = p.marca, [x0, y0] = m.map(u0, v0), [x1, y1] = m.map(u1, v1);
      const a = R.clamp((t - TS[k]) / 0.25);
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${0.45 * a})`;
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.fill('evenodd');
      ctx.strokeStyle = `rgba(236,230,214,${a})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.restore();
    }
  }
  function carimbo(ctx, k, t) {
    const p = P[k];
    if (!p.carimbo) return;
    const a = E.outCubic(R.clamp((t - TS[k] - 0.3) / 0.3));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(540, 1200);
    ctx.rotate(-0.06);
    ctx.font = `700 54px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(p.carimbo).width;
    ctx.strokeStyle = C.vermelho;
    ctx.lineWidth = 7;
    ctx.strokeRect(-w / 2 - 28, -48, w + 56, 96);
    ctx.fillStyle = 'rgba(20,10,10,0.6)';
    ctx.fillRect(-w / 2 - 28, -48, w + 56, 96);
    ctx.fillStyle = C.papel;
    ctx.fillText(p.carimbo, 0, 3);
    ctx.restore();
  }
  function painel(ctx, k, t, img) {
    blurred(ctx, img, 0.6);
    const s = Math.min(1.42, 1500 / img.height), w = img.width * s, h = img.height * s, z = zoomOf(k, t);
    ctx.save();
    ctx.translate(540, 870);
    ctx.scale(z, z);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 40;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function dividido(ctx, k, t, a, b) {
    const lt = t - TS[k];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H / 2 - 4);
    ctx.clip();
    R.drawCover(ctx, a, { zoom: 1.0, fy: 0.0, h: H / 2 - 4, w: W });
    ctx.restore();
    ctx.save();
    ctx.translate(0, H / 2 + 4);
    ctx.beginPath();
    ctx.rect(0, 0, W, H / 2);
    ctx.clip();
    R.drawCover(ctx, b, { zoom: 1.0, fy: 0.0, h: H / 2, w: W });
    ctx.restore();
    // revela o nome da obra
    const p = E.outCubic(R.prog(lt, 1.6, 2.4));
    if (p > 0) {
      ctx.fillStyle = `rgba(14,14,16,${0.88 * p})`;
      ctx.fillRect(0, H / 2 - 190, W, 380);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.font = `700 120px ${FONT}`;
      ctx.letterSpacing = '14px';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.papel;
      ctx.fillText(TL.nomeObra || 'ECHO VALLEY', 540, H / 2 - 30);
      ctx.letterSpacing = '0px';
      ctx.font = `400 46px ${FONT}`;
      ctx.fillStyle = C.cinza;
      if (P[k].sub) ctx.fillText(P[k].sub, 540, H / 2 + 90);
      ctx.restore();
    }
  }
  let icon = null;
  function cartao(ctx, k, t, img) {
    blurred(ctx, img, 0.72);
    const p = P[k], lt = t - TS[k], a = E.outCubic(R.clamp(lt / 0.4));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (p.cartao === 'assinatura') {
      if (icon) ctx.drawImage(icon, 540 - 150, 560, 300, 225);
      ctx.font = `700 110px ${FONT}`;
      ctx.letterSpacing = '10px';
      ctx.fillStyle = C.papel;
      ctx.fillText(CFG.assinatura, 540, 900);
      ctx.letterSpacing = '0px';
      ctx.font = `400 48px ${FONT}`;
      ctx.fillStyle = C.cinza;
      ctx.fillText('COMENTÁRIO DE FÃ', 540, 990);
    } else if (p.cartao === 'perguntas') {
      p.perguntas.forEach(([w, label], i) => {
        const t0 = wt(p.b, w) - 0.1, q = E.outCubic(R.clamp((t - t0) / 0.35));
        if (q <= 0) return;
        ctx.globalAlpha = a * q;
        ctx.font = `700 92px ${FONT}`;
        ctx.fillStyle = i === 2 ? C.vermelho : C.papel;
        ctx.fillText(label + (i < 2 ? '?' : '?'), 540, 640 + i * 190 + (1 - q) * 30);
      });
    } else if (p.cartao === 'final') {
      ctx.font = `400 42px ${FONT}`;
      ctx.fillStyle = C.cinza;
      ctx.fillText('OFICIAL', 540, 600);
      ctx.font = `700 92px ${FONT}`;
      ctx.fillStyle = C.papel;
      ctx.fillText(CFG.arroba_oficial, 540, 690);
      ctx.fillStyle = C.vermelho;
      ctx.fillRect(340, 760, 400, 6);
      ctx.font = `400 42px ${FONT}`;
      ctx.fillStyle = C.cinza;
      ctx.fillText('COMENTÁRIOS E TEORIAS', 540, 860);
      if (icon) ctx.drawImage(icon, 540 - 110, 900, 220, 165);
      ctx.font = `700 80px ${FONT}`;
      ctx.fillStyle = C.papel;
      ctx.fillText(CFG.assinatura, 540, 1130);
      ctx.font = `400 46px ${FONT}`;
      ctx.fillStyle = C.cinza;
      ctx.fillText(CFG.arroba_canal || '', 540, 1200);
    } else {
      ctx.font = `400 46px ${FONT}`;
      ctx.fillStyle = C.cinza;
      ctx.fillText('PÁGINA OFICIAL DA OBRA', 540, 760);
      ctx.font = `700 96px ${FONT}`;
      ctx.fillStyle = C.papel;
      ctx.fillText(CFG.arroba_oficial, 540, 870);
      ctx.fillStyle = C.vermelho;
      ctx.fillRect(340, 940, 400, 6);
      ctx.font = `400 42px ${FONT}`;
      ctx.fillStyle = C.papel;
      ctx.fillText('o Anfitrião também é', 540, 1020);
      ctx.fillText('um personagem de Echo Valley', 540, 1075);
    }
    ctx.restore();
  }
  async function trioImgs(k, t) {
    const idx = srcIdx(k, t);
    return Promise.all(P[k].trio.map((_, i) => frame(k, i, idx)));
  }
  function trio(ctx, k, t, imgs) {
    ctx.fillStyle = C.carvao;
    ctx.fillRect(0, 0, W, H);
    const p = P[k], words = p.palavras || ['apresentações', 'relatos', 'transmissões'];
    p.trio.forEach(([ref, , label], i) => {
      const t0 = i === 0 ? TS[k] : wordsOf(p.b).some((w) => norm(w.w).startsWith(norm(words[i]))) ? wt(p.b, words[i]) - 0.1 : TS[k] + i * 0.8;
      const a = E.outCubic(R.clamp((t - t0) / 0.35));
      if (a <= 0) return;
      const y0 = p.destaque ? 500 : 330, y = y0 + i * 300, h = 270;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate((1 - a) * 80, 0);
      ctx.beginPath();
      ctx.rect(90, y, 900, h);
      ctx.clip();
      R.drawCover(ctx, imgs[i], { w: 900, h, zoom: 1.0, fy: p.trio[i][3] ?? [0.3, 0.12, 0.66][i] });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(236,230,214,0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(90 + (1 - a) * 80, y, 900, h);
      ctx.fillStyle = 'rgba(14,14,16,0.82)';
      ctx.font = `700 40px ${FONT}`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(90 + (1 - a) * 80, y + h - 70, tw + 50, 70);
      ctx.fillStyle = C.papel;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 115 + (1 - a) * 80, y + h - 34);
      ctx.restore();
    });
  }

  // ---------------- camadas de texto ----------------
  const ETQ = {
    OBRA: ['TRECHO DA OBRA • ECHO VALLEY', C.obra, '#141416'],
    FICCAO: ['RELATO DA FICÇÃO', C.vermelho, C.papel],
    TIO: ['COMENTÁRIO DO TIO ARLE', C.papel, '#141416'],
    PROJETO: ['SOBRE O PROJETO', '#3a6b8a', C.papel],
  };
  function etiqueta(ctx, k) {
    const e = ETQ[P[k].etiqueta];
    if (!e) return;
    ctx.save();
    ctx.font = `700 30px ${FONT}`;
    const w = ctx.measureText(e[0]).width;
    ctx.fillStyle = e[1];
    ctx.fillRect(90, 240, w + 36, 52);
    ctx.fillStyle = e[2];
    ctx.textBaseline = 'middle';
    ctx.fillText(e[0], 108, 267);
    ctx.restore();
  }
  // gancho: vale do corte em que é definido até o próximo corte com outro gancho (máx. 4,5 s)
  function destaque(ctx, t, k) {
    let j = -1;
    for (let i = k; i >= 0 && i >= k - 1; i--) if (P[i].destaque) {
      j = i;
      break;
    }
    if (j < 0) return;
    const lt = t - TS[j];
    if (lt > 4.5) return;
    const s = P[j].destaque, a = Math.min(R.clamp(lt / 0.15), R.clamp((4.5 - lt) / 0.3)), sp = 0.7 + 0.3 * R.spring(lt, 2.2, 7);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(540, CFG.destaque.y + 90);
    ctx.rotate(-0.025);
    ctx.scale(sp, sp);
    ctx.translate(-540, -(CFG.destaque.y + 90));
    ctx.font = `700 ${CFG.destaque.tamanho}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = s.length > 18 && s.includes(' ') ? splitTwo(ctx, s, 860) : [s];
    lines.forEach((ln, i) => {
      const y = CFG.destaque.y + 90 + i * (CFG.destaque.tamanho * 1.12);
      const w = ctx.measureText(ln).width;
      ctx.fillStyle = 'rgba(14,14,16,0.78)';
      ctx.fillRect(540 - w / 2 - 24, y - CFG.destaque.tamanho * 0.62, w + 48, CFG.destaque.tamanho * 1.18);
      ctx.fillStyle = C.papel;
      ctx.fillText(ln, 540, y + 3);
    });
    ctx.restore();
  }
  function splitTwo(ctx, s, maxW) {
    const ws = s.split(' ');
    if (ctx.measureText(s).width <= maxW) return [s];
    let best = [s], bd = 1e9;
    for (let i = 1; i < ws.length; i++) {
      const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' '), d = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
      if (d < bd) [bd, best] = [d, [a, b]];
    }
    return best;
  }

  // legenda da fala do Tio Arle: blocos de 4–8 palavras, máx. 2 linhas
  const CAP = [];
  TR.forEach((tr) => {
    const ws = wordsOf(tr.i);
    let cur = [];
    ws.forEach((w, i) => {
      cur.push(w);
      const end = /[.?!:]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 4) || cur.length >= 8;
      if (end || i === ws.length - 1) {
        CAP.push(cur);
        cur = [];
      }
    });
  });
  const CAPT = CAP.map((c, i) => ({ c, t0: c[0].s - 0.05, t1: Math.min(c[c.length - 1].e + 0.5, CAP[i + 1] ? CAP[i + 1][0].s - 0.08 : 1e9) }));
  function legenda(ctx, t) {
    const L = CAPT.find((x) => t >= x.t0 && t < x.t1);
    if (!L) return;
    const sz = CFG.legenda.tamanho;
    ctx.save();
    ctx.font = `700 ${sz}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = splitTwo(ctx, L.c.map((w) => w.w).join(' '), CFG.legenda.larguraMax);
    let wi = 0, act = -1;
    L.c.forEach((w, i) => {
      if (t >= w.s - 0.03) act = i;
    });
    ctx.textAlign = 'left';
    const sp = ctx.measureText(' ').width;
    lines.forEach((ln, i) => {
      const y = CFG.legenda.y + (i - (lines.length - 1) / 2) * sz * 1.22;
      let x = 540 - ctx.measureText(ln).width / 2;
      for (const txt of ln.split(' ')) {
        const on = wi === act && t < L.c[act].e + 0.25, ww = ctx.measureText(txt).width;
        wi++;
        ctx.lineJoin = 'round';
        ctx.lineWidth = sz * 0.2;
        ctx.strokeStyle = 'rgba(10,10,12,0.92)';
        ctx.strokeText(txt, x, y);
        ctx.fillStyle = on ? '#ff5a52' : '#ffffff';
        ctx.fillText(txt, x, y);
        x += ww + sp;
      }
    });
    ctx.restore();
  }
  function fim(ctx, t) {
    const last = P.length - 1, p = P[last];
    if (!p.fim) return;
    const t0 = DUR - 3.2;
    if (t < t0) return;
    const a = E.outCubic(R.clamp((t - t0) / 0.6));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(14,14,16,0.85)';
    ctx.fillRect(90, 1180, 900, 100);
    ctx.font = `700 50px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.papel;
    ctx.fillText(p.fim, 540, 1232);
    ctx.restore();
  }
  function previa(ctx) {
    if (!PROVISORIO && !GUIA) return;
    ctx.save();
    ctx.font = `700 28px ${FONT}`;
    ctx.fillStyle = 'rgba(200,30,40,0.95)';
    ctx.fillText(GUIA ? 'LOCUÇÃO PROVISÓRIA • VOZ-GUIA' : 'PRÉVIA SEM LOCUÇÃO • TEMPOS PROVISÓRIOS', 92, 325);
    ctx.restore();
  }

  // ---------------- som (material próprio, por código) ----------------
  const bump = (t, c, d) => Math.max(0, 1 - Math.abs(t - c) / d);
  function audio(S, A) {
    // sem trilha (pedido): só efeitos pontuais por baixo da voz
    const avisoK = P.findIndex((p) => p.marca), aviso = avisoK >= 0 ? TS[avisoK] : DUR / 2;
    A.wind(S, aviso, aviso + 4, { gain: 0.1, center: 500 });
    P.forEach((p, i) => {
      if (i && p.trans === 'glitch') {
        A.whoosh(S, TS[i] - 0.15, { dur: 0.22, gain: 0.25, from: 800, to: 5000, verb: 0.1 });
        A.blip(S, TS[i], { gain: 0.12, seed: i });
      }
      if (p.destaque && i) A.boom(S, TS[i] + 0.02, { gain: 0.18, freq: 60, decay: 0.5, verb: 0.15 });
      if (p.carimbo) A.click(S, TS[i] + 0.3, { gain: 0.4, seed: i });
    });
    const doc = P.findIndex((p) => p.w === 'documentos');
    if (doc > 0) A.whoosh(S, TS[doc], { dur: 0.35, gain: 0.12, from: 1500, to: 4000, verb: 0.1 });
    const trio = P.findIndex((p) => p.tipo === 'trio');
    if (trio > 0) A.static(S, TS[trio] + 1.6, 0.4, { gain: 0.1 });
  }

  // ---------------- pós ----------------
  function post(t) {
    const p = { uGrain: 0.04, uVignette: 0.3, uContrast: 1.04, uSat: 1.0, uAberr: 0 };
    for (let i = 1; i < P.length; i++) if (P[i].trans === 'glitch') {
      const d = bump(t, TS[i], 0.12);
      p.uGlitch = (p.uGlitch || 0) + d * 0.45;
      p.uAberr += d * 6;
    }
    p.uSeed = R.frameOf(t) % 97;
    return p;
  }

  R.mount({
    duration: DUR,
    poster: TS[1] + 0.5,
    ...(VOICE_FILE ? { audioFile: VOICE_FILE, audioEnd: TRJ.duracao, sfxGain: 0.35 } : {}),
    assets: { icon: 'assets/tio-arle-icone.png' },
    fonts: [`700 40px ${FONT}`],
    setup(a) {
      icon = a.icon;
    },
    async prepare(t) {
      const k = shotAt(t), p = P[k], idx = srcIdx(k, t);
      if (p.tipo === 'dividido') cur = { k, imgs: await Promise.all([frame(k, 0, idx), frame(k, 1, idx)]) };
      else if (p.tipo === 'trio') cur = { k, imgs: await trioImgs(k, t) };
      else cur = { k, imgs: [await frame(k, 0, idx)] };
      if (k + 1 < P.length) frame(k + 1, 0, 0);
    },
    render(ctx, t) {
      const { k, imgs } = cur, p = P[k];
      ctx.fillStyle = C.carvao;
      ctx.fillRect(0, 0, W, H);
      if (p.tipo === 'painel') painel(ctx, k, t, imgs[0]);
      else if (p.tipo === 'dividido') dividido(ctx, k, t, imgs[0], imgs[1]);
      else if (p.tipo === 'cartao') cartao(ctx, k, t, imgs[0]);
      else if (p.tipo === 'trio') trio(ctx, k, t, imgs);
      else cheio(ctx, k, t, imgs[0]);
      // final: diminui a exposição aos poucos
      if (k === P.length - 1) {
        ctx.fillStyle = `rgba(0,0,0,${0.55 * R.prog(t, TS[k], DUR)})`;
        ctx.fillRect(0, 0, W, H);
      }
      // corte suave (0,15 s) só entre blocos
      for (let i = 1; i < P.length; i++) if (P[i].b !== P[i - 1].b) {
        const a = bump(t, TS[i], 0.15) * 0.5;
        if (a > 0) {
          ctx.fillStyle = `rgba(14,14,16,${a})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    },
    post,
    overlay(ctx, t) {
      const k = shotAt(t);
      etiqueta(ctx, k);
      carimbo(ctx, k, t);
      destaque(ctx, t, k);
      fim(ctx, t);
      legenda(ctx, t);
      previa(ctx);
    },
    audio,
  });
})();
