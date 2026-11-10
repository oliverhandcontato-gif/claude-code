/* Reel engine — pós-produção em WebGL2.
 * Um "uber-shader" aplicado ao quadro inteiro, controlado por uniforms a cada frame:
 * motion blur direcional, aberração cromática, CRT, glitch de blocos, pixelização,
 * smear (pixel sorting falso), bloom, meio-tom de impressão, papel, grading, light leak,
 * película (tremida, poeira, riscos, flicker), scanlines, vinheta, grão e inversão.
 */
(function () {
  'use strict';
  const R = window.Reel;

  const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes, uBlur;
uniform vec3 uTint;
uniform float uTime, uSeed, uGlitch, uAberr, uCurve, uScan, uHalftone, uPrint, uFilm, uGrain,
  uVignette, uSat, uContrast, uBright, uTintAmt, uBloom, uLeak, uInvert, uPixelate, uSmear, uZoom;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 samp(vec2 uv){
  if (dot(uBlur, uBlur) > 0.25) {
    vec3 c = vec3(0.0);
    for (int i = 0; i < 14; i++) { float k = float(i) / 13.0 - 0.5; c += texture(uTex, uv + uBlur / uRes * k).rgb; }
    return c / 14.0;
  }
  return texture(uTex, uv).rgb;
}

void main(){
  vec2 uv = vUv;
  uv = (uv - 0.5) / uZoom + 0.5;
  if (uCurve > 0.0) { vec2 cc = uv - 0.5; float r2 = dot(cc * vec2(1.0, 1.78), cc * vec2(1.0, 1.78)); uv = 0.5 + cc * (1.0 + uCurve * r2); }
  if (uFilm > 0.0) uv += uFilm * vec2(noise(vec2(uTime * 3.0, 1.0)) - 0.5, noise(vec2(uTime * 2.7, 7.0)) - 0.5) * 0.005;
  float tf = floor(uTime * 24.0);
  if (uGlitch > 0.0) {
    vec2 blk = floor(uv * vec2(6.0, 28.0));
    if (hash(blk + tf + uSeed) < uGlitch * 0.35) uv.x += (hash(blk * 1.7 + tf) - 0.5) * 0.3 * uGlitch;
    float line = hash(vec2(floor(uv.y * uRes.y / 6.0), tf + uSeed));
    if (line < uGlitch * 0.18) uv.x += (line - 0.5) * 0.12;
  }
  if (uPixelate > 1.0) { vec2 px = vec2(uPixelate) / uRes; uv = (floor(uv / px) + 0.5) * px; }

  float ab = uAberr + uGlitch * 14.0;
  vec2 dir = ((uv - 0.5) * 1.6 + vec2(0.35, 0.0)) * ab / uRes;
  vec3 col = vec3(samp(uv + dir).r, samp(uv).g, samp(uv - dir).b);

  if (uSmear > 0.0) {
    for (int i = 1; i < 12; i++) {
      vec3 s = texture(uTex, uv + vec2(0.0, float(i) * uSmear * 0.01)).rgb;
      if (luma(s) > 0.55) col = max(col, s * (1.0 - float(i) / 12.0));
    }
  }
  if (uBloom > 0.0) {
    vec3 b = vec3(0.0);
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398;
      for (int j = 1; j < 4; j++) { vec3 s = texture(uTex, uv + vec2(cos(a), sin(a)) * float(j) * 9.0 / uRes).rgb; b += max(s - 0.62, 0.0); } }
    col += b / 24.0 * uBloom * 3.0;
  }
  if (uHalftone > 0.0) {
    mat2 rot = mat2(0.7071, -0.7071, 0.7071, 0.7071);
    vec2 cell = fract(rot * (uv * uRes) / 8.0) - 0.5;
    float r = sqrt(clamp(1.0 - luma(col), 0.0, 1.0)) * 0.72;
    float d = smoothstep(r, r - 0.14, length(cell));
    col = mix(col, mix(col * 1.06 + 0.04, col * 0.55, d), uHalftone);
  }
  if (uPrint > 0.0) {
    float paper = 0.9 + 0.1 * noise(uv * uRes / 2.5) * noise(uv * uRes / 40.0 + 3.0);
    col *= mix(1.0, paper, uPrint);
    col = mix(col, col * vec3(1.05, 1.0, 0.88) + vec3(0.035, 0.02, 0.0), uPrint * 0.7);
  }
  float l = luma(col);
  col = mix(vec3(l), col, uSat);
  col = (col - 0.5) * uContrast + 0.5 + uBright;
  col = mix(col, col * uTint, uTintAmt);
  if (uLeak > 0.0) {
    vec2 a = vec2(0.12 + 0.18 * sin(uTime * 0.7), 0.2 + 0.12 * cos(uTime * 0.5));
    col += vec3(1.0, 0.45, 0.12) * smoothstep(0.65, 0.0, length((vUv - a) * vec2(1.0, 0.56))) * uLeak * 0.55;
    vec2 b = vec2(0.92, 0.8 + 0.12 * sin(uTime * 0.4));
    col += vec3(1.0, 0.2, 0.4) * smoothstep(0.5, 0.0, length((vUv - b) * vec2(1.0, 0.56))) * uLeak * 0.35;
  }
  if (uFilm > 0.0) {
    col *= 1.0 - uFilm * 0.07 * hash(vec2(tf, 3.0));
    float sx = hash(vec2(tf, 11.0));
    if (hash(vec2(tf, 12.0)) < 0.55) col += uFilm * 0.22 * smoothstep(1.6, 0.0, abs(vUv.x - sx) * uRes.x) * step(hash(vec2(floor(vUv.y * 5.0), tf)), 0.75);
    vec2 g = floor(vUv * uRes / 5.0);
    float hh = hash(g + tf * 1.37);
    if (hh > 1.0 - uFilm * 0.0012) col = mix(col, vec3(hash(g) < 0.6 ? 0.06 : 0.95), 0.85);
  }
  if (uScan > 0.0) col *= 1.0 - uScan * 0.45 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5708));
  col *= mix(1.0, smoothstep(1.05, 0.3, length((vUv - 0.5) * vec2(1.0, 1.15))), uVignette);
  col += (hash(vUv * uRes + fract(uTime * 7.31) * 113.0) - 0.5) * uGrain;
  col = mix(col, 1.0 - col, uInvert);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const DEFAULTS = {
    uBlur: [0, 0], uTint: [1, 1, 1], uSeed: 0, uGlitch: 0, uAberr: 0, uCurve: 0, uScan: 0, uHalftone: 0, uPrint: 0,
    uFilm: 0, uGrain: 0, uVignette: 0, uSat: 1, uContrast: 1, uBright: 0, uTintAmt: 0, uBloom: 0, uLeak: 0,
    uInvert: 0, uPixelate: 0, uSmear: 0, uZoom: 1,
  };

  R.Post = class {
    constructor(w = R.W, h = R.H) {
      this.canvas = R.canvas(w, h);
      const gl = (this.gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false }));
      if (!gl) throw new Error('WebGL2 indisponível');
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = (this.prog = gl.createProgram());
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      this.loc = {};
      for (const k of ['uTex', 'uRes', 'uTime', ...Object.keys(DEFAULTS)]) this.loc[k] = gl.getUniformLocation(p, k);
      gl.uniform1i(this.loc.uTex, 0);
      gl.uniform2f(this.loc.uRes, w, h);
      gl.viewport(0, 0, w, h);
    }

    /** Processa `src` (canvas 2D) com os parâmetros dados e devolve o canvas WebGL. */
    render(src, t, params = {}) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform1f(this.loc.uTime, t);
      for (const [k, d] of Object.entries(DEFAULTS)) {
        const v = params[k] ?? d, l = this.loc[k];
        if (Array.isArray(v)) v.length === 2 ? gl.uniform2f(l, v[0], v[1]) : gl.uniform3f(l, v[0], v[1], v[2]);
        else gl.uniform1f(l, v);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    }
  };
})();
