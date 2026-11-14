// Environments drawn through the perspective camera.
// street (night, rain), arena (indoor game), rooftop (day sky), zone (abstract void),
// teiko (sunset gym, flashback), stage (dark spotlight void).
(function (A) {
  const U = A.U, K = A.K;
  const E = {};
  const W = () => A.CFG.width, H = () => A.CFG.height;

  // ---------- helpers ----------
  const fillPoly = (ctx, pts, style) => {
    if (pts.length < 3) return;
    ctx.fillStyle = style;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  const line3 = (ctx, cam, pts, w, style, cap = "butt", maxW) => {
    const segs = cam.lines(pts);
    ctx.strokeStyle = style;
    ctx.lineCap = cap;
    const mw = maxW || Math.max(3, w * 4);
    segs.forEach((seg) => {
      ctx.lineWidth = Math.min(mw, Math.max(0.6, w * Math.min(seg[0].s, seg[seg.length - 1].s)));
      ctx.beginPath();
      seg.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    });
  };
  E.line3 = line3;
  E.fillPoly = fillPoly;
  const circle3 = (c, r, n = 48, a0 = 0, a1 = U.TAU) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push([c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r]);
    }
    return pts;
  };
  const sky = (ctx, cam, top, mid, bot) => {
    const hz = cam.cy + cam.fpx * Math.tan(cam.pitch * U.D);
    const g = ctx.createLinearGradient(0, hz - H() * 1.1, 0, hz + 40);
    g.addColorStop(0, top); g.addColorStop(0.7, mid); g.addColorStop(1, bot);
    ctx.fillStyle = g;
    ctx.fillRect(-200, -200, W() + 400, H() + 400);
    return hz;
  };
  E.horizon = (cam) => cam.cy + cam.fpx * Math.tan(cam.pitch * U.D);

  // court markings on floor (y = 0.2)
  E.courtLines = (ctx, cam, color, w = 5, halfOnly = false) => {
    const y = 0.3, X = 750, Z = 1400;
    line3(ctx, cam, [[-X, y, -Z], [X, y, -Z], [X, y, Z], [-X, y, Z], [-X, y, -Z]], w, color);
    line3(ctx, cam, [[-X, y, 0], [X, y, 0]], w, color);
    line3(ctx, cam, circle3([0, y, 0], 180), w, color);
    for (const s of [-1, 1]) {
      const bz = s * Z;
      // paint (key)
      line3(ctx, cam, [[-245, y, bz], [-245, y, bz - s * 580], [245, y, bz - s * 580], [245, y, bz]], w, color);
      line3(ctx, cam, circle3([0, y, bz - s * 580], 180, 32, s > 0 ? Math.PI : 0, s > 0 ? U.TAU : Math.PI), w, color);
      // three point line
      const hz = bz - s * 157.5;
      const a0 = Math.asin(660 / 675);
      const arc = [];
      for (let i = 0; i <= 40; i++) {
        const a = -a0 + (2 * a0) * (i / 40);
        arc.push([Math.sin(a) * 675, y, hz - s * Math.cos(a) * 675]);
      }
      line3(ctx, cam, [[-660, y, bz]].concat([[-660, y, hz - s * Math.cos(a0) * 675]]), w, color);
      line3(ctx, cam, arc, w, color);
      line3(ctx, cam, [[660, y, hz - s * Math.cos(a0) * 675], [660, y, bz]], w, color);
    }
  };

  // Hoop: backboard + rim + net. side: -1 = hoop at z=-1400 end. netT: swish animation 0..1
  E.hoop = (ctx, cam, o = {}) => {
    const s = o.side || -1;
    const bz = s * 1400;
    const boardZ = bz - s * 120, rimZ = bz - s * 157.5;
    const lw = A.CFG.lineColor;
    // pole + arm
    const poleZ = bz + s * 60;
    const pole = cam.poly([[-12, 0, poleZ], [12, 0, poleZ], [12, 340, poleZ], [-12, 340, poleZ]]);
    fillPoly(ctx, pole, o.poleColor || "#2a2d38");
    const arm = cam.poly([[-10, 330, poleZ], [10, 330, poleZ], [10, 345, boardZ], [-10, 345, boardZ]]);
    fillPoly(ctx, arm, o.poleColor || "#2a2d38");
    // board
    const bd = cam.poly([[-90, 290, boardZ], [90, 290, boardZ], [90, 395, boardZ], [-90, 395, boardZ]]);
    fillPoly(ctx, bd, o.board || "rgba(225,235,245,0.78)");
    ctx.strokeStyle = lw; ctx.lineWidth = 2;
    if (bd.length > 2) { ctx.beginPath(); bd.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke(); }
    line3(ctx, cam, [[-29.5, 300, boardZ + s * -1], [29.5, 300, boardZ - s], [29.5, 345, boardZ - s], [-29.5, 345, boardZ - s], [-29.5, 300, boardZ - s]], 3, o.boxColor || "#c4342c");
    // net
    const netT = o.netT || 0;
    const sway = Math.sin(netT * Math.PI) * 9 * (1 - netT);
    ctx.lineWidth = 1.4;
    const net = (o.netColor || "rgba(245,245,245,0.9)");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * U.TAU;
      const top = [Math.cos(a) * 22.5, 305, rimZ + Math.sin(a) * 22.5];
      const mid = [Math.cos(a + 0.25) * 17, 285 + sway * 0.4, rimZ + Math.sin(a + 0.25) * 17];
      const bot = [Math.cos(a + 0.5) * 12, 262 + sway, rimZ + Math.sin(a + 0.5) * 12 + sway * 0.5];
      line3(ctx, cam, [top, mid, bot], 1.1, net);
    }
    for (const yy of [290, 274]) line3(ctx, cam, circle3([0, yy + (yy < 280 ? sway * 0.8 : sway * 0.3), rimZ], yy > 280 ? 17.5 : 13.5, 20), 1.1, net);
    // rim
    line3(ctx, cam, circle3([0, 305, rimZ], 22.5, 28), 2.2, o.rimColor || "#e1542a");
    return { rim: [0, 305, rimZ], board: boardZ };
  };

  // ---------- STREET COURT, NIGHT ----------
  E.street = (ctx, cam, t, o = {}) => {
    const hz = sky(ctx, cam, "#05070f", "#141a33", "#2a2440");
    // far city skyline (parallax by yaw)
    const shift = -cam.yaw * 9;
    const rnd = U.rng(77);
    for (let layer = 0; layer < 2; layer++) {
      const base = hz + 6 + layer * 4;
      ctx.fillStyle = layer ? "#0c0f1e" : "#151a30";
      let x = -400 + ((shift * (0.4 + layer * 0.3)) % 220);
      while (x < W() + 400) {
        const bw = 60 + rnd() * 120, bh = (layer ? 90 : 150) + rnd() * (layer ? 160 : 230);
        ctx.fillRect(x, base - bh, bw, bh + 4);
        if (layer === 1) {
          ctx.fillStyle = "rgba(255,206,120,0.55)";
          for (let wy = base - bh + 12; wy < base - 10; wy += 16)
            for (let wx = x + 8; wx < x + bw - 8; wx += 14)
              if (rnd() > 0.72) ctx.fillRect(wx, wy, 6, 8);
          ctx.fillStyle = "#0c0f1e";
        }
        x += bw + 6 + rnd() * 30;
      }
    }
    // haze at horizon
    const hg = ctx.createLinearGradient(0, hz - 140, 0, hz + 30);
    hg.addColorStop(0, "rgba(90,70,140,0)"); hg.addColorStop(1, "rgba(120,90,160,0.35)");
    ctx.fillStyle = hg; ctx.fillRect(0, hz - 140, W(), 170);
    // asphalt
    const ext = 4000;
    fillPoly(ctx, cam.poly([[-ext, 0, -ext], [ext, 0, -ext], [ext, 0, ext], [-ext, 0, ext]]), "#1f2333");
    fillPoly(ctx, cam.poly([[-800, 0.1, -1500], [800, 0.1, -1500], [800, 0.1, 1500], [-800, 0.1, 1500]]), "#283048");
    // painted key (faded colour)
    fillPoly(ctx, cam.poly([[-245, 0.2, -1400], [245, 0.2, -1400], [245, 0.2, -820], [-245, 0.2, -820]]), "#3a2a3e");
    E.courtLines(ctx, cam, "rgba(220,225,240,0.55)", 5);
    // cracks
    const cr = U.rng(5);
    for (let i = 0; i < 26; i++) {
      const x0 = (cr() - 0.5) * 1400, z0 = (cr() - 0.5) * 2600;
      const pts = [[x0, 0.4, z0]];
      for (let k = 0; k < 4; k++) pts.push([pts[k][0] + (cr() - 0.5) * 90, 0.4, pts[k][2] + (cr() - 0.5) * 90]);
      line3(ctx, cam, pts, 1.2, "rgba(10,10,20,0.6)");
    }
    // streetlight pool + wet reflection
    const lamp = o.lamp || [-520, 620, -900];
    const lp = cam.proj([lamp[0], 0, lamp[2]]);
    if (lp.d > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const r = 620 * lp.s;
      const g = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, r);
      const fl = o.flicker == null ? 1 : o.flicker;
      g.addColorStop(0, `rgba(255,190,110,${0.2 * fl})`); g.addColorStop(1, "rgba(255,170,90,0)");
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(lp.x, lp.y); ctx.scale(1, 0.32); ctx.translate(-lp.x, -lp.y);
      ctx.beginPath(); ctx.arc(lp.x, lp.y, r, 0, U.TAU); ctx.fill(); ctx.restore();
      ctx.restore();
    }
    // fence along the back and sides
    E.fence(ctx, cam, [[-900, -1600], [900, -1600]], 420);
    E.fence(ctx, cam, [[-900, -1600], [-900, 1600]], 420);
    E.fence(ctx, cam, [[900, -1600], [900, 1600]], 420);
    // streetlight pole + head
    E.streetLamp(ctx, cam, lamp, o.flicker == null ? 1 : o.flicker);
    if (o.hoop !== false) E.hoop(ctx, cam, { side: -1, netT: o.netT, board: "rgba(180,190,210,0.55)", poleColor: "#1a1d28", netColor: "rgba(200,200,210,0.75)" });
  };

  E.fence = (ctx, cam, seg, h) => {
    const [[x0, z0], [x1, z1]] = seg;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.ceil(len / 300);
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = U.lerp(x0, x1, t), z = U.lerp(z0, z1, t);
      line3(ctx, cam, [[x, 0, z], [x, h, z]], 6, "#2c3142", "butt", 30);
    }
    line3(ctx, cam, [[x0, h, z0], [x1, h, z1]], 5, "#2c3142");
    // diamond mesh
    const step = 45;
    const m = Math.ceil(len / step);
    ctx.globalAlpha = 0.5;
    for (let i = -Math.ceil(h / step); i <= m; i++) {
      const t0 = (i * step) / len, t1 = ((i * step) + h) / len;
      const a = [U.lerp(x0, x1, t0), 0, U.lerp(z0, z1, t0)], b = [U.lerp(x0, x1, t1), h, U.lerp(z0, z1, t1)];
      const a2 = [U.lerp(x0, x1, t1), 0, U.lerp(z0, z1, t1)], b2 = [U.lerp(x0, x1, t0), h, U.lerp(z0, z1, t0)];
      line3(ctx, cam, [a, b], 0.9, "#4a5168", "butt", 1.6);
      line3(ctx, cam, [a2, b2], 0.9, "#4a5168", "butt", 1.6);
    }
    ctx.globalAlpha = 1;
  };

  E.streetLamp = (ctx, cam, lamp, fl) => {
    line3(ctx, cam, [[lamp[0], 0, lamp[2]], [lamp[0], lamp[1], lamp[2]], [lamp[0] + 90, lamp[1] + 20, lamp[2]]], 12, "#151824");
    const hp = cam.proj([lamp[0] + 90, lamp[1] + 10, lamp[2]]);
    if (hp.d > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 420 * hp.s);
      g.addColorStop(0, `rgba(255,230,180,${0.9 * fl})`); g.addColorStop(0.08, `rgba(255,200,120,${0.6 * fl})`); g.addColorStop(1, "rgba(255,160,80,0)");
      ctx.fillStyle = g;
      ctx.fillRect(hp.x - 420 * hp.s, hp.y - 420 * hp.s, 840 * hp.s, 840 * hp.s);
      // light cone
      const fp = cam.proj([lamp[0] + 90, 0, lamp[2]]);
      const cg = ctx.createLinearGradient(hp.x, hp.y, fp.x, fp.y);
      cg.addColorStop(0, `rgba(255,210,150,${0.09 * fl})`); cg.addColorStop(1, "rgba(255,210,150,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(hp.x - 10 * hp.s, hp.y); ctx.lineTo(hp.x + 10 * hp.s, hp.y);
      ctx.lineTo(fp.x + 380 * fp.s, fp.y); ctx.lineTo(fp.x - 380 * fp.s, fp.y); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  // Rain streaks in screen space + splashes on the floor
  E.rain = (ctx, cam, t, amt = 1) => {
    ctx.save();
    ctx.strokeStyle = "rgba(180,200,255,0.35)";
    ctx.lineWidth = 1.3;
    const n = Math.floor(420 * amt);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const sp = 1600 + U.hash(i * 3.1) * 900;
      const x = (U.hash(i * 1.7) * (W() + 300) - 150 + t * 120) % (W() + 300) - 100;
      const y = ((U.hash(i * 2.3) * (H() + 400) + t * sp) % (H() + 400)) - 200;
      const l = 18 + U.hash(i * 5.1) * 30;
      ctx.moveTo(x, y); ctx.lineTo(x - l * 0.12, y + l);
    }
    ctx.stroke();
    // splashes
    ctx.strokeStyle = "rgba(190,210,255,0.35)";
    for (let i = 0; i < 70 * amt; i++) {
      const ph = (t * 2.2 + U.hash(i * 9.1)) % 1;
      const p = cam.proj([(U.hash(i * 4.4) - 0.5) * 1600, 0.5, (U.hash(i * 6.6) - 0.5) * 1800 - 300]);
      if (p.d < 20) continue;
      const r = (4 + ph * 18) * p.s;
      ctx.globalAlpha = (1 - ph) * 0.8;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, U.TAU); ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- INDOOR ARENA ----------
  const CROWD = (() => {
    const r = U.rng(1234);
    const list = [];
    const banks = [
      { x0: -1300, x1: 1300, z0: -1900, z1: -2600, axis: "x" },
      { x0: -1300, x1: 1300, z0: 1900, z1: 2600, axis: "x" },
      { x0: -1150, x1: -1850, z0: -1700, z1: 1700, axis: "z" },
      { x0: 1150, x1: 1850, z0: -1700, z1: 1700, axis: "z" },
    ];
    const cols = ["#d9c7b3", "#2b2f3d", "#7a2228", "#e8e2d8", "#3c4b78", "#a6a29a", "#1d1d24", "#5b6e9e", "#c84a3a"];
    banks.forEach((b, bi) => {
      for (let row = 0; row < 14; row++) {
        const tt = row / 14;
        const y = 120 + row * 52;
        const n = 70;
        for (let i = 0; i < n; i++) {
          const u = (i + r() * 0.6) / n;
          let x, z;
          if (b.axis === "x") { x = U.lerp(b.x0, b.x1, u); z = U.lerp(b.z0, b.z1, tt); }
          else { x = U.lerp(b.x0, b.x1, tt); z = U.lerp(b.z0, b.z1, u); }
          list.push({ p: [x, y + 40, z], c: cols[Math.floor(r() * cols.length)], ph: r() * 10, k: r() });
        }
      }
    });
    return list;
  })();

  E.arena = (ctx, cam, t, o = {}) => {
    // dark upper volume
    sky(ctx, cam, "#07080d", "#11131c", "#1b1e2a");
    // stands: big inclined planes
    const st = "#14161f";
    fillPoly(ctx, cam.poly([[-1400, 0, -1850], [1400, 0, -1850], [1400, 900, -2700], [-1400, 900, -2700]]), st);
    fillPoly(ctx, cam.poly([[-1400, 0, 1850], [1400, 0, 1850], [1400, 900, 2700], [-1400, 900, 2700]]), st);
    fillPoly(ctx, cam.poly([[-1100, 0, -1800], [-1100, 0, 1800], [-1900, 900, 1800], [-1900, 900, -1800]]), "#171a24");
    fillPoly(ctx, cam.poly([[1100, 0, -1800], [1100, 0, 1800], [1900, 900, 1800], [1900, 900, -1800]]), "#171a24");
    // crowd heads (cheap discs) with cheering motion
    const hype = o.hype == null ? 0.4 : o.hype;
    const flash = o.flashes || 0;
    for (let i = 0; i < CROWD.length; i++) {
      const c = CROWD[i];
      const bob = Math.max(0, Math.sin(t * (6 + c.k * 4) + c.ph)) * 10 * hype;
      const p = cam.proj([c.p[0], c.p[1] + bob, c.p[2]]);
      if (p.d < 60 || p.x < -50 || p.x > W() + 50 || p.y < -50 || p.y > H() + 50) continue;
      const r = 13 * p.s;
      ctx.fillStyle = c.c;
      ctx.fillRect(p.x - r, p.y - r * 0.2, r * 2, r * 2.6);
      ctx.fillStyle = "#3b2a22";
      ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.9, r * 0.75, 0, U.TAU); ctx.fill();
      if (flash && U.hash(i * 3.3 + Math.floor(t * 12)) > 1 - 0.006 * flash) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(p.x, p.y - r, 0, p.x, p.y - r, 60 * p.s + 20);
        g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(200,220,255,0)");
        ctx.fillStyle = g; ctx.fillRect(p.x - 80, p.y - 80 - r, 160, 160); ctx.restore();
      }
    }
    // court surroundings + floor
    fillPoly(ctx, cam.poly([[-1100, 0, -1800], [1100, 0, -1800], [1100, 0, 1800], [-1100, 0, 1800]]), "#5a2a26");
    fillPoly(ctx, cam.poly([[-750, 0.1, -1400], [750, 0.1, -1400], [750, 0.1, 1400], [-750, 0.1, 1400]]), "#c8945b");
    // planks
    for (let x = -740; x <= 740; x += 22) line3(ctx, cam, [[x, 0.15, -1400], [x, 0.15, 1400]], 0.6, "rgba(120,72,36,0.22)");
    // painted keys (Touou maroon)
    for (const s of [-1, 1]) fillPoly(ctx, cam.poly([[-245, 0.2, s * 1400], [245, 0.2, s * 1400], [245, 0.2, s * 820], [-245, 0.2, s * 820]]), "#7a2a2a");
    fillPoly(ctx, cam.poly(circle3([0, 0.2, 0], 180, 40)), "#7a2a2a");
    E.courtLines(ctx, cam, "rgba(250,248,240,0.92)", 5);
    // glossy reflection of ceiling lights
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const lx of [-500, 0, 500]) for (const lz of [-900, 0, 900]) {
      const p = cam.proj([lx, 0.5, lz]);
      if (p.d < 30) continue;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 380 * p.s);
      g.addColorStop(0, "rgba(255,240,215,0.28)"); g.addColorStop(1, "rgba(255,240,215,0)");
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, 0.45); ctx.beginPath(); ctx.arc(0, 0, 380 * p.s, 0, U.TAU); ctx.restore(); ctx.fill();
    }
    ctx.restore();
    // ceiling lights
    for (const lx of [-600, -200, 200, 600]) for (const lz of [-1000, -300, 400, 1100]) {
      const p = cam.proj([lx, 1500, lz]);
      if (p.d < 30) continue;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 260 * p.s + 6);
      g.addColorStop(0, "rgba(255,250,235,0.95)"); g.addColorStop(0.15, "rgba(255,240,210,0.4)"); g.addColorStop(1, "rgba(255,230,200,0)");
      ctx.fillStyle = g; ctx.fillRect(p.x - 300 * p.s - 6, p.y - 300 * p.s - 6, 600 * p.s + 12, 600 * p.s + 12);
      ctx.restore();
    }
    // hoops
    E.hoop(ctx, cam, { side: -1, netT: o.netT, poleColor: "#30323c" });
    E.hoop(ctx, cam, { side: 1, poleColor: "#30323c" });
    // scoreboard hanging over centre
    if (o.scoreboard !== false) E.scoreboard(ctx, cam, o.score || ["TOUOU", 50, "GUEST", 31], o.clock);
  };

  E.scoreboard = (ctx, cam, score, clock) => {
    const y0 = 820, y1 = 1100, x = 260, z = 0;
    const q = cam.poly([[-x, y0, z + 1], [x, y0, z + 1], [x, y1, z + 1], [-x, y1, z + 1]]);
    if (q.length < 4) return;
    fillPoly(ctx, q, "#0b0c12");
    ctx.strokeStyle = "#3a3d4c"; ctx.lineWidth = 3;
    ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
    // text mapped via affine (front face approx.)
    const a = cam.proj([-x, y1, z + 1]), b = cam.proj([x, y1, z + 1]), c = cam.proj([-x, y0, z + 1]);
    ctx.save();
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([(b.x - a.x) / 520, (b.y - a.y) / 520, (c.x - a.x) / 280, (c.y - a.y) / 280, a.x, a.y])));
    ctx.textAlign = "center";
    ctx.font = "bold 30px 'DejaVu Sans'";
    ctx.fillStyle = "#e8e4dc";
    ctx.fillText(score[0], 130, 50); ctx.fillText(score[2], 390, 50);
    ctx.font = "bold 110px 'DejaVu Sans Mono'";
    ctx.fillStyle = "#ffb43a";
    ctx.fillText(String(score[1]).padStart(2, " "), 130, 170); ctx.fillText(String(score[3]).padStart(2, " "), 390, 170);
    ctx.font = "bold 54px 'DejaVu Sans Mono'";
    ctx.fillStyle = "#ff4a3a";
    ctx.fillText(clock || "4:12", 260, 250);
    ctx.restore();
  };

  // ---------- ROOFTOP, DAY ----------
  const CLOUDS = (() => {
    const r = U.rng(99);
    const list = [];
    for (let i = 0; i < 9; i++) {
      const blobs = [];
      const n = 6 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) blobs.push({ x: (k - n / 2) * (0.16 + r() * 0.05), y: -r() * 0.22 - (k > 1 && k < n - 2 ? 0.12 : 0), r: 0.14 + r() * 0.12 });
      list.push({ az: -80 + r() * 160, el: 8 + r() * 40, size: 900 + r() * 1400, blobs, sp: 0.4 + r() * 0.6 });
    }
    return list;
  })();
  E.skyDay = (ctx, cam, t, o = {}) => {
    const hz = sky(ctx, cam, o.top || "#2f6fd8", o.mid || "#79b3f0", o.bot || "#d6ecff");
    // clouds on a dome
    CLOUDS.forEach((c, ci) => {
      const az = (c.az + t * c.sp * (o.cloudSpeed == null ? 1 : o.cloudSpeed)) * U.D, el = c.el * U.D;
      const dir = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
      const p = cam.proj(U.add(cam.pos, U.mul(dir, 20000)));
      if (p.d < 0) return;
      const S = c.size * p.s * 20 / 20;
      const paths = c.blobs.map((b) => K.ellipse(p.x + b.x * S, p.y + b.y * S, b.r * S, b.r * S * 0.85));
      // outline-less soft cel clouds
      ctx.fillStyle = "#b9cdee";
      paths.forEach((q) => ctx.fill(q));
      ctx.save();
      ctx.fillStyle = "#ffffff";
      paths.forEach((q) => ctx.fill(K.moved(q, -0.03 * S, -0.05 * S)));
      ctx.restore();
      ctx.fillStyle = "rgba(150,175,220,0.5)";
      ctx.fillRect(p.x - S * 0.9, p.y + S * 0.02, S * 1.8, S * 0.05);
    });
    return hz;
  };
  E.rooftop = (ctx, cam, t, o = {}) => {
    E.skyDay(ctx, cam, t, o);
    // distant city tops below horizon
    const hz = E.horizon(cam);
    const rr = U.rng(3);
    ctx.fillStyle = "#9db6d8";
    let x = -300 + (-cam.yaw * 6) % 200;
    while (x < W() + 300) { const bw = 60 + rr() * 140, bh = 20 + rr() * 90; ctx.fillRect(x, hz - bh, bw, bh + 300); x += bw + rr() * 20; }
    // roof floor
    fillPoly(ctx, cam.poly([[-1200, 0, -1200], [1200, 0, -1200], [1200, 0, 1200], [-1200, 0, 1200]]), "#b9bcc4");
    for (let gx = -1200; gx <= 1200; gx += 120) line3(ctx, cam, [[gx, 0.2, -1200], [gx, 0.2, 1200]], 1.2, "rgba(120,124,140,0.5)");
    for (let gz = -1200; gz <= 1200; gz += 120) line3(ctx, cam, [[-1200, 0.2, gz], [1200, 0.2, gz]], 1.2, "rgba(120,124,140,0.5)");
    // parapet + railing
    for (const s of [-1, 1]) {
      fillPoly(ctx, cam.poly([[-1200, 0, s * 1200], [1200, 0, s * 1200], [1200, 60, s * 1200], [-1200, 60, s * 1200]]), "#a5a9b4");
      fillPoly(ctx, cam.poly([[s * 1200, 0, -1200], [s * 1200, 0, 1200], [s * 1200, 60, 1200], [s * 1200, 60, -1200]]), "#9ea2ad");
    }
    for (let i = -1200; i <= 1200; i += 40) {
      line3(ctx, cam, [[i, 60, -1200], [i, 190, -1200]], 2.4, "#6c7486");
      line3(ctx, cam, [[-1200, 60, i], [-1200, 190, i]], 2.4, "#6c7486");
      line3(ctx, cam, [[1200, 60, i], [1200, 190, i]], 2.4, "#6c7486");
    }
    line3(ctx, cam, [[-1200, 190, 1200], [-1200, 190, -1200], [1200, 190, -1200], [1200, 190, 1200]], 5, "#596175");
    // stair house
    const sx = 700, sz = -700;
    fillPoly(ctx, cam.poly([[sx, 0, sz], [sx + 400, 0, sz], [sx + 400, 320, sz], [sx, 320, sz]]), "#cfd2d9");
    fillPoly(ctx, cam.poly([[sx, 0, sz], [sx, 0, sz - 400], [sx, 320, sz - 400], [sx, 320, sz]]), "#aeb2bc");
    fillPoly(ctx, cam.poly([[sx + 140, 0, sz + 0.5], [sx + 260, 0, sz + 0.5], [sx + 260, 220, sz + 0.5], [sx + 140, 220, sz + 0.5]]), "#5e6676");
    // water tank
    fillPoly(ctx, cam.poly([[sx + 40, 320, sz - 40], [sx + 360, 320, sz - 40], [sx + 360, 470, sz - 40], [sx + 40, 470, sz - 40]]), "#dfe2e8");
  };

  // ---------- ZONE VOID ----------
  E.zone = (ctx, cam, t, o = {}) => {
    const g = ctx.createRadialGradient(W() / 2, H() * 0.45, 0, W() / 2, H() * 0.45, W() * 0.75);
    g.addColorStop(0, o.core || "#14306e"); g.addColorStop(0.5, "#081232"); g.addColorStop(1, "#02040c");
    ctx.fillStyle = g; ctx.fillRect(-100, -100, W() + 200, H() + 200);
    // rays
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cx = W() / 2 + (o.rayX || 0), cy = H() * 0.42;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * U.TAU + t * 0.05 * (i % 2 ? 1 : -1);
      const w = 0.03 + U.hash(i) * 0.05;
      ctx.fillStyle = `rgba(80,140,255,${0.05 + 0.05 * U.hash(i * 7)})`;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - w) * 2600, cy + Math.sin(a - w) * 2600);
      ctx.lineTo(cx + Math.cos(a + w) * 2600, cy + Math.sin(a + w) * 2600);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // glowing court grid
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let x = -1500; x <= 1500; x += 150) line3(ctx, cam, [[x, 0, -2500], [x, 0, 2500]], 1.2, "rgba(60,110,255,0.25)");
    for (let z = -2500; z <= 2500; z += 150) line3(ctx, cam, [[-1500, 0, z], [1500, 0, z]], 1.2, "rgba(60,110,255,0.25)");
    E.courtLines(ctx, cam, "rgba(140,190,255,0.55)", 4);
    ctx.restore();
    E.motes(ctx, t, o.frozen ? 0 : 1, "rgba(150,200,255,0.8)", 90);
  };

  E.motes = (ctx, t, speed, color, n = 60) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = (U.hash(i * 1.3) * W() + Math.sin(t * 0.5 * speed + i) * 30) % W();
      const y = (U.hash(i * 2.9) * H() - t * 25 * speed * (0.5 + U.hash(i))) % H();
      const yy = y < 0 ? y + H() : y;
      const r = 1 + U.hash(i * 4.4) * 3;
      ctx.globalAlpha = 0.3 + 0.7 * U.hash(i * 8.8);
      ctx.beginPath(); ctx.arc(x, yy, r, 0, U.TAU); ctx.fill();
    }
    ctx.restore();
  };

  // ---------- TEIKO GYM AT SUNSET (flashback) ----------
  E.teiko = (ctx, cam, t, o = {}) => {
    sky(ctx, cam, "#3a2230", "#7a4232", "#b56a3a");
    // back wall with tall windows
    fillPoly(ctx, cam.poly([[-1600, 0, -1700], [1600, 0, -1700], [1600, 900, -1700], [-1600, 900, -1700]]), "#6b3a2c");
    for (let i = -5; i <= 5; i++) {
      const x = i * 260;
      fillPoly(ctx, cam.poly([[x - 90, 350, -1699], [x + 90, 350, -1699], [x + 90, 760, -1699], [x - 90, 760, -1699]]), "#ffcf8a");
      line3(ctx, cam, [[x, 350, -1698], [x, 760, -1698]], 6, "#6b3a2c");
      line3(ctx, cam, [[x - 90, 555, -1698], [x + 90, 555, -1698]], 6, "#6b3a2c");
    }
    fillPoly(ctx, cam.poly([[-1600, 0, -1700], [-1600, 0, 1700], [-1600, 900, 1700], [-1600, 900, -1700]]), "#5a3026");
    fillPoly(ctx, cam.poly([[1600, 0, -1700], [1600, 0, 1700], [1600, 900, 1700], [1600, 900, -1700]]), "#5a3026");
    fillPoly(ctx, cam.poly([[-1600, 0, -1700], [1600, 0, -1700], [1600, 0, 1700], [-1600, 0, 1700]]), "#c98a4e");
    for (let x = -1590; x <= 1590; x += 26) line3(ctx, cam, [[x, 0.15, -1700], [x, 0.15, 1700]], 0.6, "rgba(110,60,30,0.25)");
    E.courtLines(ctx, cam, "rgba(255,240,220,0.7)", 5);
    E.hoop(ctx, cam, { side: -1, poleColor: "#3a2420", board: "rgba(255,230,200,0.6)" });
    // god rays from windows
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = -5; i <= 5; i++) {
      const a = cam.proj([i * 260, 560, -1690]), b = cam.proj([i * 260 + 500, 0, -600]);
      if (a.d < 10 || b.d < 10) continue;
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, "rgba(255,200,130,0.22)"); g.addColorStop(1, "rgba(255,180,110,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(a.x - 90 * a.s, a.y); ctx.lineTo(a.x + 90 * a.s, a.y); ctx.lineTo(b.x + 260 * b.s, b.y); ctx.lineTo(b.x - 200 * b.s, b.y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    E.motes(ctx, t, 0.4, "rgba(255,220,170,0.7)", 70);
  };

  // ---------- STAGE (dark void with spotlights) ----------
  E.stage = (ctx, cam, t, o = {}) => {
    sky(ctx, cam, "#020206", "#07070f", "#0d0d18");
    fillPoly(ctx, cam.poly([[-3000, 0, -3000], [3000, 0, -3000], [3000, 0, 3000], [-3000, 0, 3000]]), o.floor || "#0b0b14");
    (o.spots || [[0, 0]]).forEach(([x, z], i) => {
      const top = cam.proj([x, 900, z]), bot = cam.proj([x, 0, z]);
      if (bot.d < 10) return;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const col = o.spotColor || "200,215,255";
      const g = ctx.createLinearGradient(top.x, top.y, bot.x, bot.y);
      g.addColorStop(0, `rgba(${col},0.02)`); g.addColorStop(1, `rgba(${col},0.18)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(top.x - 20 * top.s, top.y); ctx.lineTo(top.x + 20 * top.s, top.y); ctx.lineTo(bot.x + 140 * bot.s, bot.y); ctx.lineTo(bot.x - 140 * bot.s, bot.y); ctx.closePath(); ctx.fill();
      const pg = ctx.createRadialGradient(bot.x, bot.y, 0, bot.x, bot.y, 150 * bot.s);
      pg.addColorStop(0, `rgba(${col},0.35)`); pg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = pg;
      ctx.save(); ctx.translate(bot.x, bot.y); ctx.scale(1, 0.3); ctx.beginPath(); ctx.arc(0, 0, 150 * bot.s, 0, U.TAU); ctx.restore(); ctx.fill();
      ctx.restore();
    });
  };

  A.ENV = E;
})(window.A = window.A || {});
