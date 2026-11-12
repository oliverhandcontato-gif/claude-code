/* NÃO FAÇA A MENINA CHORAR (Tio Arle) — arte desenhada por código.
 * Porão de concreto, lâmpada pendurada balançando (luz recortada num véu escuro), cadeiras com
 * cativos amarrados (saco na cabeça, placa A/B/C), silhueta da menina com o ursinho (só sombra),
 * timer, confete, rostos do além, sorriso no escuro e o olho chorando sangue do CTA.
 * Violência só implícita: a menina nunca aparece ferida; o sangue fica só no olho do logo.
 */
(function () {
  'use strict';
  const R = window.Reel;
  const { W, H } = R;
  const Art = (window.Art = {});
  const TAU = Math.PI * 2;

  const P = (Art.P = {
    void: '#040305', wall: '#1b1916', floor: '#0e0c0b', wood: '#4a3322', woodHi: '#6e4c31', rope: '#b48a52',
    sack: '#8c6b40', card: '#c9a66b', ink: '#141010', blood: '#b3081f', bloodHi: '#ff2a3c', bone: '#efe4cf',
    warm: '255,196,120', red: '255,40,50', gold: '#f2c14e', skin: '#b98b66',
  });

  let bgRoom, bgDoor, veil, tmp;
  Art.init = () => {
    bgRoom = R.canvas(W, H);
    bgDoor = R.canvas(W, H);
    veil = R.canvas(W, H);
    tmp = R.canvas(W, H);
    paintRoom(bgRoom.getContext('2d'), false);
    paintRoom(bgDoor.getContext('2d'), true);
  };

  /** concreto manchado + chão + canos (pintado uma vez) */
  function paintRoom(g, door) {
    const rnd = R.rng(door ? 77 : 31);
    g.fillStyle = P.wall;
    g.fillRect(0, 0, W, H);
    // blocos de concreto
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 3;
    for (let y = 0; y < 1200; y += 120) {
      const off = (y / 120) % 2 ? 0 : 110;
      for (let x = -off; x < W; x += 220) g.strokeRect(x, y, 220, 120);
    }
    // manchas e umidade
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = rnd() * 1250, r = 10 + rnd() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const d = rnd() < 0.7;
      gr.addColorStop(0, d ? `rgba(0,0,0,${0.08 + rnd() * 0.15})` : `rgba(90,80,60,${0.05 + rnd() * 0.08})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // escorridos
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * 400, l = 200 + rnd() * 600;
      const gr = g.createLinearGradient(0, y, 0, y + l);
      gr.addColorStop(0, 'rgba(0,0,0,0.25)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x, y, 3 + rnd() * 10, l);
    }
    // cano no alto
    g.fillStyle = '#26221d';
    g.fillRect(0, 150, W, 34);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(0, 154, W, 6);
    for (let x = 80; x < W; x += 260) {
      g.fillStyle = '#1a1714';
      g.fillRect(x, 140, 22, 54);
    }
    if (door) {
      // batente da porta (o vão é pintado ao vivo, com a luz de trás)
      g.fillStyle = '#2a211a';
      g.fillRect(320, 520, 440, 740);
      g.fillStyle = '#000';
      g.fillRect(350, 550, 380, 710);
    }
    // chão
    const fy = 1240;
    const fl = g.createLinearGradient(0, fy, 0, H);
    fl.addColorStop(0, '#1a1714');
    fl.addColorStop(1, '#070606');
    g.fillStyle = fl;
    g.fillRect(0, fy, W, H - fy);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 2;
    for (let k = -8; k <= 8; k++) {
      g.beginPath();
      g.moveTo(540 + k * 70, fy);
      g.lineTo(540 + k * 260, H);
      g.stroke();
    }
    for (let i = 0; i < 120; i++) {
      const x = rnd() * W, y = fy + rnd() * (H - fy), r = 20 + rnd() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${0.1 + rnd() * 0.2})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, fy - 6, W, 10);
  }
  Art.room = (ctx, door = false) => ctx.drawImage(door ? bgDoor : bgRoom, 0, 0);

  /** luz atrás da porta + vão da porta */
  Art.doorway = (ctx, t, o = {}) => {
    const { color = '170,20,30', amt = 1 } = o;
    ctx.save();
    const g = ctx.createLinearGradient(0, 550, 0, 1260);
    g.addColorStop(0, `rgba(${color},${0.35 * amt})`);
    g.addColorStop(1, `rgba(${color},${0.9 * amt})`);
    ctx.fillStyle = g;
    ctx.fillRect(350, 550, 380, 710);
    // facho de luz que sai da porta pelo chão
    ctx.globalCompositeOperation = 'lighter';
    const fl = ctx.createLinearGradient(0, 1250, 0, 1750);
    fl.addColorStop(0, `rgba(${color},${0.45 * amt})`);
    fl.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = fl;
    ctx.beginPath();
    ctx.moveTo(350, 1260);
    ctx.lineTo(730, 1260);
    ctx.lineTo(1000, 1800);
    ctx.lineTo(80, 1800);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // ---------------- lâmpada ----------------
  /** posição da lâmpada (pêndulo) */
  Art.bulbPos = (t, amp = 0.26, len = 300) => {
    const th = amp * Math.sin(t * 1.75) + 0.03 * Math.sin(t * 4.1);
    return { x: 540 + Math.sin(th) * len, y: -30 + Math.cos(th) * len, th };
  };
  Art.lamp = (ctx, b, on = 1) => {
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(540, -30);
    ctx.lineTo(b.x, b.y - 30);
    ctx.stroke();
    ctx.translate(b.x, b.y);
    ctx.rotate(-b.th);
    // cúpula de metal
    ctx.fillStyle = '#1d1d1f';
    ctx.beginPath();
    ctx.moveTo(-18, -40);
    ctx.lineTo(18, -40);
    ctx.lineTo(70, 6);
    ctx.lineTo(-70, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-14, -38, 6, 40);
    // lâmpada
    if (on > 0.02) {
      const g = ctx.createRadialGradient(0, 18, 2, 0, 18, 120);
      g.addColorStop(0, `rgba(255,240,200,${on})`);
      g.addColorStop(0.25, `rgba(${P.warm},${0.6 * on})`);
      g.addColorStop(1, `rgba(${P.warm},0)`);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(-120, -100, 240, 240);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = on > 0.02 ? `rgba(255,${200 + 50 * on},${150 + 80 * on},1)` : '#333';
    ctx.beginPath();
    ctx.ellipse(0, 20, 22, 26, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };
  /** véu escuro com o cone de luz da lâmpada recortado (+ luzes extras) */
  Art.darkness = (ctx, b, on, o = {}) => {
    const { dark = 0.93, spots = [], warmth = 0.22, floorY = 1150 } = o;
    const g = veil.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(0,0,0,${dark})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r, a, sy = 1) => {
      if (a <= 0.01) return;
      g.save();
      g.translate(x, y);
      g.scale(1, sy);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    };
    // poça de luz: projeta a lâmpada para o chão seguindo o ângulo
    const fx = b.x + Math.sin(b.th) * 700;
    cut(b.x, b.y + 40, 330, on);
    cut((b.x + fx) / 2, (b.y + floorY) / 2 + 60, 560, on * 0.95, 1.25);
    cut(fx, floorY, 420, on * 0.8, 0.6);
    for (const s of spots) cut(s.x, s.y, s.r, s.a, s.sy || 1);
    ctx.drawImage(veil, 0, 0);
    // calor da lâmpada
    if (on > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const wg = ctx.createRadialGradient(b.x, b.y + 300, 50, b.x, b.y + 300, 900);
      wg.addColorStop(0, `rgba(${P.warm},${warmth * on * 2})`);
      wg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  };
  Art.glow = (ctx, x, y, r, color = P.warm, a = 0.5) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };
  /** cintilação da lâmpada: 1 = acesa; quedas rápidas e apagões curtos */
  Art.flicker = (t, amt = 0.2, seed = 3) => {
    const f = R.frameOf(t);
    let v = 1 - amt * 0.5 * (1 + R.noise1(t * 9, seed)) * 0.5;
    if (R.hash(Math.floor(f / 2), seed) < amt * 0.25) v *= 0.15;
    return R.clamp(v);
  };

  // ---------------- cativo na cadeira ----------------
  const chair = (ctx) => {
    ctx.fillStyle = P.wood;
    ctx.strokeStyle = '#1e140c';
    ctx.lineWidth = 4;
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * 112 - 13, -360, 26, 360);
      ctx.strokeRect(sx * 112 - 13, -360, 26, 360);
    }
    ctx.fillRect(-125, -370, 250, 34);
    ctx.fillRect(-125, -250, 250, 22);
    ctx.fillStyle = P.woodHi;
    ctx.fillRect(-125, -370, 250, 8);
  };
  const chairFront = (ctx) => {
    ctx.fillStyle = P.wood;
    ctx.strokeStyle = '#1e140c';
    ctx.lineWidth = 4;
    ctx.fillRect(-130, -12, 260, 30);
    ctx.strokeRect(-130, -12, 260, 30);
    ctx.fillStyle = P.woodHi;
    ctx.fillRect(-130, -12, 260, 7);
    ctx.fillStyle = P.wood;
    for (const sx of [-1, 1]) {
      ctx.fillRect(sx * 118 - 11, 18, 22, 240);
      ctx.strokeRect(sx * 118 - 11, 18, 22, 240);
    }
  };
  const ropeBand = (ctx, x0, x1, y, h = 22) => {
    ctx.fillStyle = P.rope;
    ctx.strokeStyle = '#4b3418';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x0, y - h / 2, x1 - x0, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,40,15,0.8)';
    ctx.lineWidth = 3;
    for (let x = x0 + 6; x < x1 - 4; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2 - 2);
      ctx.lineTo(x + 9, y - h / 2 + 2);
      ctx.stroke();
    }
  };
  const SHIRT = { avo: '#3d4a5a', irmao: '#5a2f2f', pai: '#2f4a3a' };
  /**
   * Pessoa amarrada na cadeira. (x, y) = centro do assento.
   * o: { kind: 'avo'|'irmao'|'pai', letter, sack (0..1 tirado), flip (0..1 placa virando p/ o nome),
   *      label, wiggle, fear, x (marca X 0..1), t }
   */
  Art.captive = (ctx, x, y, s, o) => {
    const { kind, letter, sack = 0, flip = 0, label = '', t = 0, x: cross = 0, fear = 0.5, seed = 1 } = o;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const wig = (o.wiggle ?? 1) * (0.02 * R.noise1(t * 3, seed) + (fear > 0.8 ? 0.03 * Math.sin(t * 40) : 0));
    chair(ctx);
    ctx.rotate(wig);
    // pernas
    ctx.fillStyle = '#23262b';
    ctx.fillRect(-72, -30, 58, 270);
    ctx.fillRect(14, -30, 58, 270);
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.ellipse(-48, 245, 46, 20, 0, 0, TAU);
    ctx.ellipse(48, 245, 46, 20, 0, 0, TAU);
    ctx.fill();
    ropeBand(ctx, -84, 84, 160, 24);
    // tronco
    ctx.fillStyle = SHIRT[kind] || '#333';
    ctx.beginPath();
    ctx.moveTo(-95, -300);
    ctx.quadraticCurveTo(-118, -290, -112, -200);
    ctx.lineTo(-88, -10);
    ctx.lineTo(88, -10);
    ctx.lineTo(112, -200);
    ctx.quadraticCurveTo(118, -290, 95, -300);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-4, -290, 8, 280);
    if (kind === 'pai') {
      ctx.fillStyle = '#7a1420';
      ctx.beginPath();
      ctx.moveTo(-14, -296);
      ctx.lineTo(14, -296);
      ctx.lineTo(20, -150);
      ctx.lineTo(0, -125);
      ctx.lineTo(-20, -150);
      ctx.closePath();
      ctx.fill();
    }
    if (kind === 'irmao') {
      // capuz do moletom
      ctx.fillStyle = '#4a2626';
      ctx.beginPath();
      ctx.ellipse(0, -300, 92, 30, 0, 0, TAU);
      ctx.fill();
    }
    ropeBand(ctx, -122, 122, -235);
    ropeBand(ctx, -116, 116, -150);
    ropeBand(ctx, -104, 104, -70);
    // pescoço + cabeça
    ctx.fillStyle = P.skin;
    ctx.fillRect(-26, -335, 52, 45);
    head(ctx, kind, t, fear, seed);
    // saco de pano (sai para cima)
    if (sack < 1) {
      const p = R.ease.inOutCubic(R.clamp(sack));
      ctx.save();
      ctx.globalAlpha = 1 - R.clamp((p - 0.6) / 0.4);
      ctx.translate(30 * p, -420 * p - 395);
      ctx.rotate(0.6 * p);
      ctx.fillStyle = P.sack;
      ctx.beginPath();
      ctx.moveTo(-70, 70);
      ctx.quadraticCurveTo(-100, -40, -60, -95);
      ctx.quadraticCurveTo(0, -125, 62, -92);
      ctx.quadraticCurveTo(104, -30, 72, 70);
      ctx.quadraticCurveTo(0, 82 - 30 * p, -70, 70);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,10,0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(0, -112);
      ctx.quadraticCurveTo(14, -10, 0, 70);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(30,20,8,0.35)';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.moveTo(-60 + k * 20, -60 + R.hash(k, seed) * 30);
        ctx.quadraticCurveTo(-50 + k * 20, 0, -64 + k * 20, 50);
        ctx.stroke();
      }
      ropeBand(ctx, -66, 66, 62, 16);
      ctx.restore();
    }
    // placa pendurada no pescoço
    ctx.save();
    ctx.translate(0, -175);
    ctx.rotate(0.05 * R.noise1(t * 1.5, seed + 4));
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-60, -60);
    ctx.lineTo(-30, -150);
    ctx.moveTo(60, -60);
    ctx.lineTo(30, -150);
    ctx.stroke();
    const fl = Math.cos(Math.PI * R.clamp(flip));
    ctx.scale(Math.max(0.04, Math.abs(fl)), 1);
    const named = flip > 0.5;
    ctx.fillStyle = named ? '#e9dcc0' : P.card;
    ctx.strokeStyle = '#5a4120';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-92, -66, 184, 132, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = named ? P.blood : P.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = named ? `900 ${label.length > 3 ? 50 : 62}px "Inter", "Arial Black", sans-serif` : '110px "Shrikhand", serif';
    ctx.fillText(named ? label : letter, 0, named ? 2 : 10);
    ctx.restore();
    ctx.restore();
    // X vermelho por cima (fora da rotação)
    if (cross > 0) {
      ctx.save();
      ctx.translate(x, y - 210 * s);
      ctx.scale(s, s);
      ctx.strokeStyle = P.bloodHi;
      ctx.shadowColor = P.bloodHi;
      ctx.shadowBlur = 30;
      ctx.lineCap = 'round';
      ctx.lineWidth = 34;
      const p1 = R.clamp(cross * 2), p2 = R.clamp(cross * 2 - 1);
      ctx.beginPath();
      ctx.moveTo(-170, -230);
      ctx.lineTo(-170 + 340 * p1, -230 + 460 * p1);
      if (p2 > 0) {
        ctx.moveTo(170, -230);
        ctx.lineTo(170 - 340 * p2, -230 + 460 * p2);
      }
      ctx.stroke();
      ctx.restore();
    }
  };
  function head(ctx, kind, t, fear, seed) {
    ctx.save();
    ctx.translate(0, -395);
    // orelhas
    ctx.fillStyle = '#a77a57';
    ctx.beginPath();
    ctx.ellipse(-64, 8, 14, 22, 0, 0, TAU);
    ctx.ellipse(64, 8, 14, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, 62, 76, 0, 0, TAU);
    ctx.fill();
    // sombra lateral
    ctx.fillStyle = 'rgba(40,20,10,0.25)';
    ctx.beginPath();
    ctx.ellipse(22, 6, 40, 70, 0, 0, TAU);
    ctx.fill();
    // cabelo
    if (kind === 'avo') {
      ctx.fillStyle = '#e8e6e0';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sx * 56, -18, 18, 34, sx * 0.3, 0, TAU);
        ctx.fill();
      }
    } else if (kind === 'pai') {
      ctx.fillStyle = '#1b130e';
      ctx.beginPath();
      ctx.ellipse(0, -46, 66, 40, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-66, -48, 14, 34);
      ctx.fillRect(52, -48, 14, 34);
    } else {
      // boné
      ctx.fillStyle = '#b3202b';
      ctx.beginPath();
      ctx.ellipse(0, -40, 68, 46, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#8c1720';
      ctx.beginPath();
      ctx.ellipse(-30, -38, 70, 12, -0.15, 0, TAU);
      ctx.fill();
    }
    // olhos arregalados (o branco brilha no escuro)
    const lk = R.noise1(t * 2.3, seed + 7) * 6;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#f4efe6';
      ctx.beginPath();
      ctx.ellipse(sx * 24, -6, 13, 11 + 4 * fear, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(sx * 24 + lk, -6, 5, 0, TAU);
      ctx.fill();
      // sobrancelha erguida
      ctx.strokeStyle = kind === 'avo' ? '#ddd' : '#1b130e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx * 10, -26 - 6 * fear);
      ctx.lineTo(sx * 38, -24 - 2 * fear);
      ctx.stroke();
    }
    if (kind === 'avo') {
      ctx.strokeStyle = '#d8c070';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-24, -6, 20, 0, TAU);
      ctx.moveTo(44, -6);
      ctx.arc(24, -6, 20, 0, TAU);
      ctx.moveTo(-4, -6);
      ctx.lineTo(4, -6);
      ctx.stroke();
    }
    // bigode
    if (kind !== 'irmao') {
      ctx.fillStyle = kind === 'avo' ? '#e8e6e0' : '#1b130e';
      ctx.beginPath();
      ctx.ellipse(-14, 26, 20, 9, 0.2, 0, TAU);
      ctx.ellipse(14, 26, 20, 9, -0.2, 0, TAU);
      ctx.fill();
    }
    // mordaça
    ctx.fillStyle = '#d8d2c4';
    ctx.beginPath();
    ctx.roundRect(-66, 30, 132, 26, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(-66, 48, 132, 8);
    ctx.restore();
  }

  // ---------------- a menina (só silhueta) ----------------
  /** Silhueta de costas/contraluz: maria-chiquinha, vestido e ursinho na mão. (x, y) = pés. */
  Art.girl = (ctx, x, y, h, t, o = {}) => {
    const { rim = '255,60,70', rimA = 0.8, bear = true, sway = 1 } = o;
    const k = h / 520;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.rotate(0.015 * Math.sin(t * 1.3) * sway);
    ctx.shadowColor = `rgba(${rim},${rimA})`;
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#050304';
    ctx.beginPath();
    // pernas
    ctx.rect(-36, -120, 22, 110);
    ctx.rect(14, -120, 22, 110);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * 26, -8, 22, 10, 0, 0, TAU);
      ctx.fill();
    }
    // vestido
    ctx.beginPath();
    ctx.moveTo(-44, -380);
    ctx.quadraticCurveTo(-60, -330, -70, -270);
    ctx.lineTo(-118, -118);
    ctx.quadraticCurveTo(0, -96, 118, -118);
    ctx.lineTo(70, -270);
    ctx.quadraticCurveTo(60, -330, 44, -380);
    ctx.closePath();
    ctx.fill();
    // braços
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#050304';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(-50, -360);
    ctx.quadraticCurveTo(-80, -300, -86, -220);
    ctx.moveTo(50, -360);
    ctx.quadraticCurveTo(84, -300, 92, -228);
    ctx.stroke();
    // pescoço e cabeça
    ctx.beginPath();
    ctx.rect(-14, -410, 28, 40);
    ctx.moveTo(56, -455);
    ctx.arc(0, -455, 56, 0, TAU);
    // maria-chiquinha
    for (const sx of [-1, 1]) {
      ctx.moveTo(sx * 72 + 30 * Math.cos(sx * 0.5), -440 + 30 * Math.sin(sx * 0.5));
      ctx.ellipse(sx * 72, -440, 30, 46, -sx * 0.5, 0, TAU);
    }
    ctx.fill();
    // laços
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 48, -478);
      ctx.lineTo(sx * 70, -510);
      ctx.lineTo(sx * 78, -478);
      ctx.lineTo(sx * 70, -456);
      ctx.closePath();
      ctx.fill();
    }
    if (bear) {
      // ursinho pendurado pela mão direita
      ctx.save();
      ctx.translate(98, -214);
      ctx.rotate(0.12 * Math.sin(t * 1.9));
      for (const [ex, ey, rx, ry] of [[0, 18, 26, 26], [-20, 0, 10, 10], [20, 0, 10, 10], [0, 72, 30, 36], [-26, 104, 12, 14], [26, 104, 12, 14]]) {
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  };

  /** Ursinho de pelúcia caído (iluminado), sem nenhum ferimento. */
  Art.teddy = (ctx, x, y, s, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const fur = '#7a5232', dark = '#55361f', muz = '#c9a27a';
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, 40, 60, 70, 0, 0, TAU);
    ctx.fill();
    for (const [ax, ay] of [[-62, 10], [62, 10], [-38, 104], [38, 104]]) {
      ctx.beginPath();
      ctx.ellipse(ax, ay, 24, 30, ax * 0.01, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, -52, 52, 0, TAU);
    ctx.arc(-40, -92, 20, 0, TAU);
    ctx.arc(40, -92, 20, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(-40, -92, 10, 0, TAU);
    ctx.arc(40, -92, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = muz;
    ctx.beginPath();
    ctx.ellipse(0, -36, 24, 18, 0, 0, TAU);
    ctx.ellipse(0, 46, 34, 40, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-18, -62, 7, 0, TAU);
    ctx.arc(18, -62, 7, 0, TAU);
    ctx.ellipse(0, -42, 9, 6, 0, 0, TAU);
    ctx.fill();
    // costura
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 90);
    ctx.stroke();
    ctx.restore();
  };

  // ---------------- interface ----------------
  Art.timer = (ctx, x, y, r, p, n, t) => {
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + 0.08 * Math.exp(-((t % 0.96) / 0.12));
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(10,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 18, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = P.bloodHi;
    ctx.shadowColor = P.bloodHi;
    ctx.shadowBlur = 30;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p));
    ctx.stroke();
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#fff';
    ctx.font = `${r * 1.55}px "VT323", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, r * 0.06);
    ctx.restore();
  };

  /** Texto grande com contorno grosso (estilo TikTok). */
  Art.title = (ctx, s, x, y, size, o = {}) => {
    const { fill = '#fff', stroke = '#000', font = 'sans', alpha = 1, rot = 0, glow = 0, glowColor = fill, scale = 1, lw = 0.16 } = o;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = R.clamp(alpha);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.font = font === 'sans' ? `900 ${size}px "Inter", "Arial Black", sans-serif` : font === 'party' ? `${size}px "Shrikhand", serif` : font === 'mono' ? `${size}px "VT323", monospace` : font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, 0, 0);
    if (glow) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glow;
    }
    ctx.fillStyle = fill;
    ctx.fillText(s, 0, 0);
    ctx.restore();
  };

  /** Carimbo inclinado com borda. */
  Art.stamp = (ctx, s, x, y, size, p, o = {}) => {
    const { color = P.bloodHi, rot = -0.12 } = o;
    if (p <= 0) return;
    const sc = 1 + 1.6 * Math.pow(1 - R.clamp(p / 0.35), 3);
    ctx.save();
    ctx.globalAlpha = R.clamp(p / 0.15);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.font = `900 ${size}px "Inter", "Arial Black", sans-serif`;
    const w = ctx.measureText(s).width + size * 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.12;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -size * 0.8, w, size * 1.6, size * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, 0, size * 0.05);
    ctx.restore();
  };

  /** Lágrima azul (ícone de "ela choraria"). */
  Art.tear = (ctx, x, y, s, color = '#5ab8ff') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.bezierCurveTo(10, -20, 34, 0, 34, 24);
    ctx.arc(0, 24, 34, 0, Math.PI);
    ctx.bezierCurveTo(-34, 0, -10, -20, 0, -50);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-12, 18, 7, 12, 0.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /** Confete determinístico caindo a partir de t0. */
  Art.confetti = (ctx, t, t0, n = 140, freeze = null) => {
    const tt = freeze != null ? Math.min(t, freeze) : t;
    const lt = tt - t0;
    if (lt < 0) return;
    const cols = ['#f2c14e', '#ff4f7a', '#4fd1ff', '#7dff6a', '#b06bff', '#ffffff'];
    ctx.save();
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const vx = (-side) * (300 + R.hash(i, 1) * 700), vy = -900 - R.hash(i, 2) * 900;
      const x0 = side > 0 ? 1000 : 80, y0 = 1350;
      const drag = 1 - Math.exp(-lt * 2.2);
      const x = x0 + (vx / 2.2) * drag + Math.sin(lt * 3 + i) * 30;
      const y = y0 + (vy / 2.2) * drag + 260 * lt * lt * 0.9 + 140 * lt;
      if (y > H + 40) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lt * (4 + R.hash(i, 3) * 8) + i);
      ctx.scale(1, Math.cos(lt * 9 + i));
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-11, -6, 22, 12);
      ctx.restore();
    }
    ctx.restore();
  };

  /** Rosto do além: máscara branca esticada, olhos e boca vazados, gritando. */
  Art.ghost = (ctx, x, y, s, t, seed, a = 0.6) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.3 * R.noise1(t * 2, seed));
    ctx.scale(s * (1 + 0.1 * Math.sin(t * 13 + seed)), s * (1.3 + 0.25 * Math.sin(t * 7 + seed)));
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    g.addColorStop(0, 'rgba(235,240,255,0.9)');
    g.addColorStop(1, 'rgba(160,170,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 120, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-28, -30, 15, 24, 0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(28, -30, 15, 24, -0.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 50, 22, 44 + 10 * Math.sin(t * 20 + seed), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /** Sorriso no escuro (dentes) — a risada. */
  Art.grin = (ctx, x, y, w, t, open = 1) => {
    ctx.save();
    ctx.translate(x, y);
    const h = w * 0.22 * open;
    ctx.shadowColor = 'rgba(255,30,40,0.8)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#1a0003';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.4);
    ctx.quadraticCurveTo(0, h * 1.6, w / 2, -h * 0.4);
    ctx.quadraticCurveTo(0, h * 0.4, -w / 2, -h * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f2ead6';
    const n = 14;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, xx = -w / 2 + u * w;
      const top = -h * 0.4 + (h * 0.8) * (1 - Math.pow(2 * u - 1, 2)) * 0.5;
      const bot = -h * 0.4 + (h * 2) * (1 - Math.pow(2 * u - 1, 2)) * 0.5;
      const tw = w / n * 0.42;
      ctx.beginPath();
      ctx.moveTo(xx - tw, top);
      ctx.lineTo(xx + tw, top);
      ctx.lineTo(xx, top + (bot - top) * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(xx - tw, bot);
      ctx.lineTo(xx + tw, bot);
      ctx.lineTo(xx, bot - (bot - top) * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // olhos em fenda acima
    ctx.fillStyle = '#ff2030';
    ctx.shadowColor = '#ff2030';
    ctx.shadowBlur = 30;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * w * 0.28, -w * 0.42, w * 0.11, w * 0.03 * (0.4 + 0.6 * open), sx * 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------------- CTA: olho chorando sangue ----------------
  /**
   * Olho no estilo do logo (esclera creme, íris vinho). open 0..1, blood 0..1 (lágrimas escorrendo),
   * look [-1..1].
   */
  Art.bloodEye = (ctx, x, y, r, t, o = {}) => {
    const { open = 1, look = [0, 0], blood = 0, veins = 1 } = o;
    ctx.save();
    ctx.translate(x, y);
    const h = r * 0.6 * R.clamp(open);
    const almond = () => {
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r * 0.5, -h * 1.35, r * 0.5, -h * 1.35, r, 0);
      ctx.bezierCurveTo(r * 0.5, h * 1.25, -r * 0.5, h * 1.25, -r, 0);
      ctx.closePath();
    };
    // lágrimas de sangue: saem da pálpebra de baixo e escorrem
    const drips = [[-0.42, 0.0, 1], [0.38, 0.25, 0.8], [-0.05, 0.5, 0.6]];
    if (blood > 0) {
      for (const [u, d, wk] of drips) {
        const p = R.clamp((blood - d) / (1 - d));
        if (p <= 0) continue;
        const sx = u * r, sy = h * 0.95 * (1 - u * u) + 4;
        const len = Math.max(2, R.ease.outCubic(p) * r * 1.9 + 8 * Math.sin(t * 2 + u * 9) * R.clamp(p * 4));
        const wd = r * 0.07 * wk;
        const g = ctx.createLinearGradient(0, sy, 0, sy + len);
        g.addColorStop(0, '#5a0008');
        g.addColorStop(0.5, P.blood);
        g.addColorStop(1, P.bloodHi);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - wd, sy - 6);
        ctx.quadraticCurveTo(sx - wd * 0.6 + 6 * Math.sin(u * 20), sy + len * 0.5, sx - wd * 0.8, sy + len);
        ctx.arc(sx, sy + len, wd * 0.95, Math.PI, 0, true);
        ctx.quadraticCurveTo(sx + wd * 0.6, sy + len * 0.5, sx + wd, sy - 6);
        ctx.closePath();
        ctx.fill();
        // gota que se solta
        const cyc = (t * 0.9 + u * 3) % 1.4;
        if (p > 0.8 && cyc < 1) {
          const dy = sy + len + wd * 1.2 + cyc * cyc * 520;
          ctx.beginPath();
          ctx.ellipse(sx, dy, wd * 0.7, wd * 1.1, 0, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,200,200,0.5)';
        ctx.beginPath();
        ctx.ellipse(sx - wd * 0.35, sy + len * 0.6, wd * 0.18, len * 0.2, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (open > 0.02) {
      almond();
      const sg = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      sg.addColorStop(0, P.bone);
      sg.addColorStop(1, '#c9a8a0');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.save();
      almond();
      ctx.clip();
      // veias
      ctx.strokeStyle = `rgba(190,10,30,${0.55 * veins})`;
      ctx.lineWidth = r * 0.012;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + 0.2, rr = R.rng(k + 5);
        ctx.beginPath();
        let px = Math.cos(a) * r, py = Math.sin(a) * r * 0.6;
        ctx.moveTo(px, py);
        for (let j = 0; j < 4; j++) {
          px *= 0.8;
          py *= 0.8;
          ctx.lineTo(px + (rr() - 0.5) * r * 0.12, py + (rr() - 0.5) * r * 0.1);
        }
        ctx.stroke();
      }
      const ix = look[0] * r * 0.32, iy = look[1] * h * 0.3, ir = r * 0.4;
      const g = ctx.createRadialGradient(ix, iy, ir * 0.1, ix, iy, ir);
      g.addColorStop(0, '#ff3b4a');
      g.addColorStop(0.55, '#9a0619');
      g.addColorStop(1, '#2a0006');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ix, iy, ir, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,180,160,0.3)';
      ctx.lineWidth = r * 0.01;
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * TAU;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * ir * 0.35, iy + Math.sin(a) * ir * 0.35);
        ctx.lineTo(ix + Math.cos(a) * ir * 0.95, iy + Math.sin(a) * ir * 0.95);
        ctx.stroke();
      }
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(ix, iy, ir * 0.36, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(ix - ir * 0.32, iy - ir * 0.34, ir * 0.12, 0, TAU);
      ctx.fill();
      // sombra da pálpebra
      const sh = ctx.createLinearGradient(0, -h, 0, -h * 0.2);
      sh.addColorStop(0, 'rgba(40,0,5,0.6)');
      sh.addColorStop(1, 'rgba(40,0,5,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(-r, -h * 1.4, r * 2, h * 1.2);
      // sangue acumulando na borda de baixo
      if (blood > 0) {
        ctx.fillStyle = `rgba(179,8,31,${0.8 * R.clamp(blood * 3)})`;
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.bezierCurveTo(-r * 0.5, h * 1.25, r * 0.5, h * 1.25, r, 0);
        ctx.bezierCurveTo(r * 0.5, h * 1.05, -r * 0.5, h * 1.05, -r, 0);
        ctx.fill();
      }
      ctx.restore();
    }
    // contorno e cílios no creme do logo
    ctx.strokeStyle = '#f1e3cf';
    ctx.lineWidth = r * 0.06;
    ctx.shadowColor = 'rgba(255,40,50,0.6)';
    ctx.shadowBlur = 30;
    almond();
    ctx.stroke();
    ctx.lineWidth = r * 0.035;
    ctx.lineCap = 'round';
    for (let k = 1; k < 8; k++) {
      const u = k / 8, px = -r + u * 2 * r, py = -h * 1.0 * (1 - Math.pow(2 * u - 1, 2));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px * 1.12, py - r * 0.2 - h * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Fatias deslocadas de uma imagem (para a transição do logo). */
  Art.sliced = (ctx, img, x, y, w, h, amt, seed) => {
    const n = 14, rnd = R.rng(seed);
    for (let i = 0; i < n; i++) {
      const sy = (i / n) * img.height, sh = img.height / n;
      const dx = (rnd() - 0.5) * 2 * amt * 160;
      ctx.drawImage(img, 0, sy, img.width, sh, x + dx, y + (i / n) * h, w, h / n + 1);
    }
  };
  Art.tmp = () => tmp;
})();
