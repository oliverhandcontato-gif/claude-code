// Assembles a full character from the rig: depth-sorted layers of limbs, kit, head and props.
// Character spec: { pal, kit:'touou'|'teiko'|'rival', number, kanji, word, chain, wristband, socks }
(function (A) {
  const U = A.U, K = A.K, R = A.R, B = A.B, H = A.H;
  const C = {};

  // ---------- print textures (cached offscreen canvases) ----------
  const texCache = {};
  function printTex(kitName, kitPal, spec) {
    const key = kitName + spec.number + spec.kanji + spec.word;
    if (texCache[key]) return texCache[key];
    const c = document.createElement("canvas");
    c.width = 512; c.height = 640;
    const x = c.getContext("2d");
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    // kanji
    if (spec.kanji) {
      x.font = "bold 150px 'WenQuanYi Zen Hei', sans-serif";
      x.lineJoin = "round";
      x.lineWidth = 9; x.strokeStyle = kitPal.text;
      x.strokeText(spec.kanji, 256, 190);
      x.fillStyle = kitPal.text; x.fillText(spec.kanji, 256, 190);
    }
    if (spec.word) {
      x.font = "bold 56px 'DejaVu Sans', sans-serif";
      x.fillStyle = kitPal.text2;
      x.save(); x.translate(256, 268); x.scale(1.05, 1);
      // letter spacing
      const w = spec.word.split("");
      const sp = 44;
      w.forEach((ch, i) => x.fillText(ch, (i - (w.length - 1) / 2) * sp, 0));
      x.restore();
    }
    if (spec.number != null) {
      x.font = "bold 250px 'DejaVu Sans', sans-serif";
      x.lineWidth = 6; x.strokeStyle = kitPal.text;
      x.fillStyle = kitPal.text;
      x.save(); x.translate(256, 520); x.scale(0.82, 1.08);
      x.strokeText(String(spec.number), 0, 0); x.fillText(String(spec.number), 0, 0);
      x.restore();
    }
    texCache[key] = c;
    return c;
  }
  function backTex(kitPal, spec) {
    const key = "back" + spec.number + kitPal.text;
    if (texCache[key]) return texCache[key];
    const c = document.createElement("canvas");
    c.width = 512; c.height = 640;
    const x = c.getContext("2d");
    x.textAlign = "center";
    x.font = "bold 300px 'DejaVu Sans', sans-serif";
    x.fillStyle = kitPal.text; x.lineWidth = 6; x.strokeStyle = kitPal.text;
    x.save(); x.translate(256, 470); x.scale(0.82, 1.1);
    x.strokeText(String(spec.number), 0, 0); x.fillText(String(spec.number), 0, 0);
    x.restore();
    texCache[key] = c;
    return c;
  }

  // Wrap a texture onto the jersey surface using vertical strips (curved print).
  function wrapPrint(ctx, J, view, tex, front, clip) {
    const fr = (y) => (y < 0 ? ["spine", y + 22] : ["chest", y]);
    // texture covers u in [-0.95, 0.95] rad, torso height y in [-12 (spine) .. 17 (chest)] mapped
    const yTop = 16, yBot = -16; // in chest-relative cm (negative continues into spine)
    const strips = 14;
    ctx.save();
    ctx.clip(clip);
    for (let i = 0; i < strips; i++) {
      const u0 = U.lerp(-0.95, 0.95, i / strips), u1 = U.lerp(-0.95, 0.95, (i + 1) / strips);
      const pt = (u, y) => {
        const [f, yy] = fr(y);
        const r = B.secAt(B.JERSEY, f, yy);
        const uu = front ? u : Math.PI + u;
        return B.surf(J, view, f, yy, uu, r[0], r[1], r[2], 0.15);
      };
      const a = pt(u0, yTop), b = pt(u1, yTop), c = pt(u0, yBot);
      // facing check of strip
      const mid = (u0 + u1) / 2;
      const F = J.chest;
      const n = view.dir(U.mv(F.m, [Math.sin(front ? mid : Math.PI + mid), 0, Math.cos(front ? mid : Math.PI + mid)])).z;
      if (n < 0.05) continue;
      const sx0 = (i / strips) * tex.width, sw = tex.width / strips;
      // affine: tex (sx0..sx0+sw, 0..h) -> quad a,b,c
      const m = new DOMMatrix([(b.x - a.x) / sw, (b.y - a.y) / sw, (c.x - a.x) / tex.height, (c.y - a.y) / tex.height, a.x, a.y]);
      ctx.save();
      ctx.setTransform(ctx.getTransform().multiply(m));
      ctx.drawImage(tex, sx0, 0, Math.min(sw + 2, tex.width - sx0), tex.height, 0, 0, Math.min(sw + 2, tex.width - sx0), tex.height);
      ctx.restore();
    }
    ctx.restore();
  }

  // Surface polyline on the jersey for trims. pts: [[frame,y,u], ...]
  function surfLine(J, view, list, push = 0.25) {
    return list.map(([f, y, u]) => {
      const r = B.secAt(B.JERSEY, f, y);
      return B.surf(J, view, f, y, u, r[0], r[1], r[2], push);
    });
  }

  // ---------- main ----------
  // returns array of layers {z, draw(ctx)}
  C.layers = (spec, pose, prev, viewP, face, opts = {}) => {
    const view = R.makeView(viewP);
    const P = R.full(pose);
    const J = R.fk(P);
    const Jp = prev ? R.fk(R.full(prev)) : null;
    const pal = spec.pal;
    const kit = pal.kit;
    const lw = (opts.lw || A.CFG.lineWidth) * Math.max(0.55, Math.min(2.4, viewP.scale / 2.6));
    const proj = (p) => view.proj(p);
    const jp = (n) => proj(J[n].p);
    const L = [];

    // secondary motion: head velocity in head-local cm, inverted (lag)
    let hairLag = null, hemLag = [0, 0, 0];
    if (Jp) {
      const v = U.sub(J.head.p, Jp.head.p);
      const m = J.head.m; // transpose = inverse for rotation
      const lv = [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
      hairLag = U.mul(lv, -0.32);
      const cap = 3.2, ll = U.len(hairLag);
      if (ll > cap) hairLag = U.mul(hairLag, cap / ll);
      const vh = U.sub(J.hips.p, Jp.hips.p);
      hemLag = [U.clamp(-vh[0] * 0.25, -3, 3), U.clamp(-vh[1] * 0.25, -3, 3), U.clamp(-vh[2] * 0.25, -3, 3)];
    }
    if (opts.wind) hairLag = U.add(hairLag || [0, 0, 0], opts.wind);

    const chestZ = jp("chest").z;
    const skinO = { fill: pal.skin.base, shade: pal.skin.shade, lw, light: opts.light, rim: opts.rim, rimW: opts.rimW || 0, rimDir: opts.rimDir };
    const sd = (cm, pnt) => cm * pnt.s;

    // ---- legs ----
    for (const side of [1, -1]) {
      const s = side > 0 ? "L" : "R";
      const hip = jp("leg" + s), knee = jp("knee" + s), ank = jp("foot" + s);
      const z = Math.min((hip.z + knee.z + ank.z) / 3, chestZ - 0.5);
      L.push({
        z, draw: (ctx) => {
          const fwdShin = view.dir(U.col(J["knee" + s].m, 2));
          const fwdThigh = view.dir(U.col(J["leg" + s].m, 2));
          // shoe first when foot is behind the shin
          const footFwd = view.dir(U.col(J["foot" + s].m, 2)).z;
          if (footFwd < 0) B.drawShoe(ctx, J, view, side, pal.shoe, lw);
          const shinP = B.limbPath(knee, ank, (B.PROF || PROFS).shin, fwdShin);
          K.shape(ctx, shinP, Object.assign({}, skinO, { shadeDepth: sd(3.2, knee) }));
          // socks
          if (spec.socks !== false) {
            ctx.save(); ctx.clip(shinP);
            const a = U.lerp2(knee, ank, 0.8), b = ank;
            const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
            const w = 8 * ank.s;
            const sp = new Path2D();
            sp.moveTo(a.x - dy / l * w, a.y + dx / l * w); sp.lineTo(a.x + dy / l * w, a.y - dx / l * w);
            sp.lineTo(b.x + dy / l * w + dx / l * w, b.y - dx / l * w + dy / l * w); sp.lineTo(b.x - dy / l * w + dx / l * w, b.y + dx / l * w + dy / l * w);
            sp.closePath();
            ctx.fillStyle = "#e9e9ee"; ctx.fill(sp);
            ctx.strokeStyle = A.CFG.lineColor; ctx.lineWidth = lw * 0.8;
            ctx.beginPath(); ctx.moveTo(a.x - dy / l * w, a.y + dx / l * w); ctx.lineTo(a.x + dy / l * w, a.y - dx / l * w); ctx.stroke();
            ctx.restore();
          }
          // calf / shin muscle line
          const cm = [U.lerp2(knee, ank, 0.12), U.lerp2(knee, ank, 0.35)];
          const n = { x: -(ank.y - knee.y), y: ank.x - knee.x }; const nl = Math.hypot(n.x, n.y) || 1;
          const off = (fwdShin.x * n.x + fwdShin.y * n.y) > 0 ? -1 : 1;
          K.stroke(ctx, cm.map((p) => ({ x: p.x + n.x / nl * off * 2.2 * knee.s, y: p.y + n.y / nl * off * 2.2 * knee.s })), lw * 0.8, U.alpha(pal.skin.deep, 0.7));
          const thighP = B.limbPath(hip, knee, PROFS.thigh, fwdThigh);
          K.shape(ctx, thighP, Object.assign({}, skinO, { shadeDepth: sd(4.2, hip) }));
          // knee cap hint
          K.stroke(ctx, [{ x: knee.x - 2.4 * knee.s, y: knee.y - 1 * knee.s }, { x: knee.x, y: knee.y + 0.8 * knee.s }, { x: knee.x + 2.2 * knee.s, y: knee.y - 0.6 * knee.s }], lw * 0.7, U.alpha(pal.skin.deep, 0.6));
          if (footFwd >= 0) B.drawShoe(ctx, J, view, side, pal.shoe, lw);
        },
      });
    }

    // ---- arms ----
    const headZ = jp("head").z;
    for (const side of [1, -1]) {
      const s = side > 0 ? "L" : "R";
      const sh = jp("arm" + s), el = jp("elbow" + s), hd = jp("hand" + s);
      const mid = (sh.z + el.z + hd.z) / 3;
      let z;
      if (mid < chestZ - 7) z = mid - 20;
      else if (hd.z > headZ + 6 && el.z > chestZ + 4) z = headZ + 1 + (hd.z - headZ) * 0.01;
      else z = chestZ + 1 + side * 0.01 + (mid - chestZ) * 0.001;
      L.push({
        z, draw: (ctx) => {
          const fu = view.dir(U.col(J["arm" + s].m, 2)), ff = view.dir(U.col(J["elbow" + s].m, 2));
          const hand = J["hand" + s];
          const shape = (P.handShape && P.handShape[s]) || "relaxed";
          // hand behind forearm?
          const palmZ = view.dir(U.col(hand.m, 1)).z;
          const handFirst = palmZ > 0.25;
          if (handFirst) B.drawHand(ctx, J, view, side, shape, pal.skin, lw);
          const fa = B.limbPath(el, hd, PROFS.foreArm, ff);
          const shIn = proj(U.add(J["arm" + s].p, U.mv(J["sh" + s].m, [-2.0 * side, 0.6, 0])));
          const ua = B.limbPath(shIn, el, PROFS.upperArm, fu);
          // forearm drawn above the upper arm when it points toward the camera
          const faFront = (hd.z - el.z) > 6;
          const drawUA = () => {
            K.shape(ctx, ua, Object.assign({}, skinO, { shadeDepth: sd(3.4, sh) }));
            // deltoid / bicep separation
            const n = { x: -(el.y - sh.y), y: el.x - sh.x }; const nl = Math.hypot(n.x, n.y) || 1;
            const o = (fu.x * n.x + fu.y * n.y) > 0 ? 1 : -1;
            const a = U.lerp2(sh, el, 0.18), b = U.lerp2(sh, el, 0.42);
            K.stroke(ctx, [{ x: a.x + n.x / nl * o * 4.6 * sh.s, y: a.y + n.y / nl * o * 4.6 * sh.s }, { x: b.x + n.x / nl * o * 2.6 * sh.s, y: b.y + n.y / nl * o * 2.6 * sh.s }], lw * 0.75, U.alpha(pal.skin.deep, 0.65));
          };
          const drawFA = () => {
            K.shape(ctx, fa, Object.assign({}, skinO, { shadeDepth: sd(2.6, el) }));
            if (spec.wristband) {
              ctx.save(); ctx.clip(fa);
              const a = Object.assign(U.lerp2(el, hd, 0.74), { s: U.lerp(el.s, hd.s, 0.74) }), b = Object.assign(U.lerp2(el, hd, 0.95), { s: hd.s });
              const wb = B.limbPath(a, b, [[0, 3.6, 3.6], [1, 3.3, 3.3]], ff);
              ctx.restore();
              K.shape(ctx, wb, { fill: spec.wristband, shade: U.mixc(spec.wristband, "#000000", 0.45), shadeDepth: sd(1.6, el), lw: lw * 0.9 });
            }
          };
          if (faFront) { drawUA(); drawFA(); } else { drawFA(); drawUA(); }
          // elbow crease
          K.stroke(ctx, [U.lerp2(sh, el, 0.93), el, U.lerp2(el, hd, 0.08)].map((p, i) => ({ x: p.x + (i - 1) * 0.3 * el.s, y: p.y })), lw * 0.55, U.alpha(pal.skin.deep, 0.45));
          if (!handFirst) B.drawHand(ctx, J, view, side, shape, pal.skin, lw);
        },
      });
    }

    // ---- torso, shorts, jersey ----
    L.push({
      z: chestZ, draw: (ctx) => {
        // skin torso (shoulders & arm-pits visible around the tank top)
        const tor = B.tubeOutline(J, view, B.TORSO, "hips", "chest");
        K.shape(ctx, tor.path, Object.assign({}, skinO, { shadeDepth: sd(5, jp("chest")) }));
        // trapezius line
        const trL = jp("armL"), trR = jp("armR"), nk = jp("neck");
        // shorts
        const sO = { fill: kit.base, shade: kit.shade, shadeDepth: sd(4.5, jp("hips")), lw, light: opts.light, rim: opts.rim, rimW: opts.rimW || 0, rimDir: opts.rimDir };
        const shortsBlock = B.tubeOutline(J, view, [["hips", -13, 17.0, 11.8, 0], ["hips", -5, 17.8, 12.2, 0], ["spine", 1, 16.4, 11.6, 0.3]], "hips", "spine");
        const tubes = [1, -1].map((side) => {
          const s = side > 0 ? "L" : "R";
          const hip = jp("leg" + s);
          const kn = proj(U.add(J["leg" + s].p, U.mv(J["leg" + s].m, [0, -45 * 0.7, 0])));
          const fwd = view.dir(U.col(J["leg" + s].m, 2));
          return { path: B.limbPath(hip, kn, [[0, 9.8, 9.8], [0.6, 9.0, 8.8], [1, 9.2, 9.0]], fwd), hip, kn, side };
        });
        tubes.forEach((t) => K.outline(ctx, t.path, sO));
        K.outline(ctx, shortsBlock.path, sO);
        tubes.forEach((t) => K.paint(ctx, t.path, sO));
        K.paint(ctx, shortsBlock.path, sO);
        // shorts trim + folds
        tubes.forEach((t) => {
          const dx = t.kn.x - t.hip.x, dy = t.kn.y - t.hip.y, l = Math.hypot(dx, dy) || 1;
          const nx = -dy / l, ny = dx / l;
          const w = 10.6 * t.kn.s;
          ctx.save(); ctx.clip(t.path);
          for (const off of [2.2, 3.6]) {
            const c = { x: t.kn.x - dx / l * off * t.kn.s, y: t.kn.y - dy / l * off * t.kn.s };
            K.stroke(ctx, [{ x: c.x - nx * w, y: c.y - ny * w }, { x: c.x, y: c.y + dy / l * 0.6 * t.kn.s }, { x: c.x + nx * w, y: c.y + ny * w }], 1.1 * t.kn.s, kit.trim);
          }
          // side stripe on the outside of the leg
          const outer = view.dir(U.mv(J.hips.m, [t.side, 0, 0]));
          const sgn = Math.sign(nx * outer.x + ny * outer.y) || 1;
          if (Math.abs(outer.z) < 0.85) {
            const a = { x: t.hip.x + nx * sgn * 9.2 * t.hip.s, y: t.hip.y + ny * sgn * 9.2 * t.hip.s - 6 * t.hip.s };
            const b = { x: t.kn.x + nx * sgn * 9.6 * t.kn.s, y: t.kn.y + ny * sgn * 9.6 * t.kn.s };
            K.stroke(ctx, [a, b], 2.4 * t.kn.s, kit.trim);
          }
          // fold lines from crotch
          K.stroke(ctx, [U.lerp2(t.hip, t.kn, 0.25), U.lerp2(t.hip, t.kn, 0.7)].map((p) => ({ x: p.x - nx * 4 * t.kn.s, y: p.y - ny * 4 * t.kn.s })), lw * 0.7, U.alpha("#000000", 0.6));
          ctx.restore();
        });

        // jersey body
        const jsecs = B.JERSEY.map((s, i) => (i === 0 ? [s[0], s[1] + hemLag[1] * 0.5, s[2] + Math.abs(hemLag[0]) * 0.3, s[3], s[4] + hemLag[2] * 0.4] : s));
        const jer = B.tubeOutline(J, view, jsecs, "hips", "chest");
        const jO = { fill: kit.base, shade: kit.shade, shadeDepth: sd(5.2, jp("chest")), lw, light: opts.light, rim: opts.rim, rimW: opts.rimW || 0, rimDir: opts.rimDir };
        K.shape(ctx, jer.path, jO);
        const front = B.facing(J, view, "chest") > -0.05;
        // neckline (front V) or back collar
        const nlPts = front
          ? [["chest", 20.6, 0.66], ["chest", 15, 0.33], ["chest", 9.5, 0], ["chest", 15, -0.33], ["chest", 20.6, -0.66]]
          : [["chest", 20.6, Math.PI - 0.66], ["chest", 19, Math.PI], ["chest", 20.6, Math.PI + 0.66]];
        const nl = surfLine(J, view, nlPts, 0.3);
        ctx.save();
        ctx.clip(jer.path);
        if (front) {
          const top = proj(U.add(J.neck.p, U.mv(J.neck.m, [0, 6, 0])));
          const vp = K.smoothPath([nl[0], nl[1], nl[2], nl[3], nl[4], { x: top.x + (nl[4].x - top.x) * 0.3, y: top.y }, { x: top.x + (nl[0].x - top.x) * 0.3, y: top.y }], true, 0.15);
          ctx.fillStyle = pal.skin.shade; ctx.fill(vp);
          ctx.save(); ctx.clip(vp);
          ctx.fillStyle = pal.skin.base;
          ctx.fill(K.moved(vp, A.CFG.light[0] * 5 * jp("chest").s, A.CFG.light[1] * 5 * jp("chest").s));
          // collarbones
          const cb = surfLine(J, view, [["chest", 18.4, 0.42], ["chest", 17.6, 0.12]], 0.4);
          const cb2 = surfLine(J, view, [["chest", 18.4, -0.42], ["chest", 17.6, -0.12]], 0.4);
          K.stroke(ctx, cb, lw * 0.75, U.alpha(pal.skin.deep, 0.8));
          K.stroke(ctx, cb2, lw * 0.75, U.alpha(pal.skin.deep, 0.8));
          ctx.restore();
          ctx.strokeStyle = A.CFG.lineColor; ctx.lineWidth = lw; ctx.stroke(vp);
        }
        // trims: double band along neckline
        K.stroke(ctx, nl, 2.8 * jp("chest").s, kit.trim);
        K.stroke(ctx, surfLine(J, view, nlPts.map(([f, y, u]) => [f, y - 1.6, u * 1.08]), 0.3), 1.4 * jp("chest").s, kit.trim2);
        // armhole trims
        for (const sgn of [1, -1]) {
          const ah = [["chest", 20.6, 0.66 * sgn], ["chest", 16, 0.95 * sgn], ["chest", 9, 1.28 * sgn], ["chest", 4, 1.5 * sgn]];
          const ah2 = [["chest", 20.6, 0.9 * sgn], ["chest", 16, 1.12 * sgn], ["chest", 9, 1.45 * sgn], ["chest", 4, 1.62 * sgn]];
          const ahB = ah.map(([f, y, u]) => [f, y, Math.PI - u]);
          [ah, front ? null : ahB].forEach((list) => {
            if (!list) return;
            K.stroke(ctx, surfLine(J, view, list, 0.35), 2.6 * jp("chest").s, kit.trim);
          });
          K.stroke(ctx, surfLine(J, view, ah2, 0.35), 1.3 * jp("chest").s, kit.trim2);
        }
        // hem trim
        const hem = [];
        for (let u = -1.6; u <= 1.6; u += 0.2) hem.push(["hips", -11 + hemLag[1] * 0.5, front ? u : Math.PI + u]);
        K.stroke(ctx, surfLine(J, view, hem, 0.35), 1.7 * jp("hips").s, kit.trim);
        // print
        if (front) wrapPrint(ctx, J, view, printTex(spec.kit, kit, spec), true, jer.path);
        else wrapPrint(ctx, J, view, backTex(kit, spec), false, jer.path);
        // fabric folds: from armpits toward the belly, and waist creases
        const twist = (P.chest[1] || 0) + (P.spine[1] || 0);
        const bendSide = (P.spine[2] || 0) + (P.chest[2] || 0);
        const fold1 = surfLine(J, view, [["chest", 6, 1.15], ["spine", 16, 0.6], ["spine", 8, 0.35]], 0.4);
        const fold2 = surfLine(J, view, [["chest", 6, -1.15], ["spine", 16, -0.6], ["spine", 8, -0.35]], 0.4);
        K.stroke(ctx, fold1, lw * (0.9 + Math.max(0, twist) * 0.02), U.alpha("#000000", 0.55));
        K.stroke(ctx, fold2, lw * (0.9 + Math.max(0, -twist) * 0.02), U.alpha("#000000", 0.55));
        if (Math.abs(bendSide) > 5 || (P.spine[0] || 0) > 10) {
          const sg = bendSide > 0 ? -1 : 1;
          for (let k = 0; k < 3; k++) {
            K.stroke(ctx, surfLine(J, view, [["spine", 6 + k * 3, 0.9 * sg], ["spine", 4 + k * 3, 1.3 * sg]], 0.4), lw * 0.8, U.alpha("#000000", 0.5));
          }
        }
        // chain
        if (spec.chain) {
          const chain = [];
          for (let i = 0; i <= 22; i++) {
            const t = i / 22;
            const u = U.lerp(0.62, -0.62, t);
            const y = 20.8 - Math.sin(Math.PI * t) * 9 + hemLag[1] * 0.2;
            chain.push(["chest", y, u + hemLag[0] * 0.02]);
          }
          const cp = surfLine(J, view, chain, 0.7);
          ctx.restore(); ctx.save();
          cp.forEach((p, i) => {
            const r = 0.55 * p.s;
            ctx.fillStyle = A.CFG.lineColor;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.35, r * 1.1, i * 0.9, 0, U.TAU); ctx.fill();
            ctx.fillStyle = i % 2 ? spec.chain.base : spec.chain.hi;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.75, i * 0.9, 0, U.TAU); ctx.fill();
          });
        }
        ctx.restore();
      },
    });

    // ---- neck + head ----
    L.push({
      z: Math.max(headZ, chestZ + 0.6), draw: (ctx) => {
        const nb = jp("neck"), hb = proj(U.add(J.head.p, U.mv(J.head.m, [0, 4, -0.5])));
        const fwd = view.dir(U.col(J.neck.m, 2));
        const np = B.limbPath(nb, hb, PROFS.neck, fwd);
        K.shape(ctx, np, Object.assign({}, skinO, { shadeDepth: sd(4.5, nb) }));
        // jaw shadow on neck
        ctx.save(); ctx.clip(np);
        ctx.fillStyle = pal.skin.shade;
        const jw = proj(U.add(J.head.p, U.mv(J.head.m, [0, -6, 6])));
        ctx.beginPath(); ctx.ellipse(jw.x, jw.y, 7 * jw.s, 5.5 * jw.s, 0, 0, U.TAU); ctx.fill();
        ctx.restore();
        // sternocleidomastoid lines + hatching
        for (const sg of [1, -1]) {
          const a = proj(U.add(J.head.p, U.mv(J.head.m, [5.2 * sg, 2.5, 0.5])));
          const b = proj(U.add(J.neck.p, U.mv(J.neck.m, [1.4 * sg, -1, 5.2])));
          if (view.dir(U.mv(J.neck.m, [sg * 0.6, 0, 0.8])).z > 0) {
            K.stroke(ctx, [a, U.lerp2(a, b, 0.5), b], lw * 0.7, U.alpha(pal.skin.deep, 0.7));
            for (let k = 1; k < 5; k++) {
              const p = U.lerp2(a, b, k / 5.5);
              K.stroke(ctx, [{ x: p.x - 1.2 * nb.s * sg, y: p.y - 0.4 * nb.s }, { x: p.x + 0.6 * nb.s * sg, y: p.y + 0.6 * nb.s }], lw * 0.45, U.alpha(pal.skin.deep, 0.55));
            }
          }
        }
        H.draw(ctx, { p: J.head.p, m: J.head.m.map((v) => v * (spec.headScale || 1.1)) }, view, Object.assign({ lid: 1 }, face || {}), pal, { lw, hairLag, light: opts.light });
      },
    });

    L.J = J;
    L.view = view;
    return L;
  };

  const PROFS = {
    upperArm: [[0, 5.5, 5.5], [0.16, 5.7, 5.9], [0.42, 5.2, 5.5], [0.75, 4.3, 4.6], [1, 3.9, 3.9]],
    foreArm: [[0, 4.0, 4.0], [0.22, 4.6, 4.3], [0.55, 3.8, 3.6], [0.85, 2.9, 2.8], [1, 2.7, 2.7]],
    thigh: [[0, 8.2, 8.2], [0.25, 7.9, 7.6], [0.6, 6.6, 6.3], [0.88, 5.2, 5.0], [1, 4.8, 4.8]],
    shin: [[0, 5.0, 5.0], [0.2, 4.8, 6.3], [0.45, 4.4, 5.6], [0.75, 3.6, 3.8], [1, 3.0, 3.0]],
    neck: [[0, 5.2, 5.2], [0.5, 4.5, 4.7], [1, 4.4, 4.6]],
  };
  B.PROF = PROFS;

  C.draw = (ctx, spec, pose, prev, view, face, opts, props = []) => {
    const layers = C.layers(spec, pose, prev, view, face, opts);
    const all = layers.concat(props);
    all.sort((a, b) => a.z - b.z);
    all.forEach((l) => l.draw(ctx));
    return layers;
  };

  // Character specs
  C.aomine = (kitName = "touou", extra = {}) => {
    const kit = A.PAL[kitName];
    return Object.assign({
      kit: kitName,
      pal: { skin: A.PAL.skin, hair: A.PAL.hair, eye: A.PAL.eye, mouth: A.PAL.mouth, kit, shoe: A.PAL.shoe },
      number: kitName === "teiko" ? 6 : 5,
      kanji: kitName === "teiko" ? "帝光" : kitName === "touou" ? "桐皇" : "",
      word: kitName === "touou" ? "GAKUEN" : kitName === "teiko" ? "" : "",
      chain: null, wristband: null, socks: true,
    }, extra);
  };

  A.C = C;
})(window.A = window.A || {});
