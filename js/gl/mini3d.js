/* ==========================================================================
   MINI3D — pehelysúlyú WebGL réteg a két 3D szekcióhoz.
   Miért nem three.js: a three.module.js 1,3 MB-ot töltött le az unpkg CDN-ről
   MINDEN oldalbetöltéskor, csak azért, hogy két dísz-modellt kirajzoljunk.
   Ez a fájl ~8 kB, helyben van (offline és file:// alól is megy), és nem
   szivárog IP-t harmadik félhez.

   Csak azt tudja, amire itt szükség van: egy GLB-ből POSITION + NORMAL +
   uint16 index, egy irányfény, ambiens, lime peremfény és lineáris köd.
   ========================================================================== */
(function () {
  "use strict";
  window.EP = window.EP || {};

  /* --- mat4 (csak a szükséges műveletek) ------------------------------- */
  const M = {
    ident: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),

    perspective(out, fovyDeg, aspect, near, far) {
      const f = 1 / Math.tan((fovyDeg * Math.PI) / 360);
      const nf = 1 / (near - far);
      out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
      out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
      return out;
    },

    /* out = a * b  (oszlopfolytonos, mint a GL-ben) */
    mul(out, a, b) {
      for (let c = 0; c < 4; c++) {
        const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
        out[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      return out;
    },

    /* Egy lépésben: eltolás × Y-forgatás × X-forgatás × Z-forgatás × egyenletes méret.
       Így nem kell mátrixokat láncolni képkockánként — kevesebb szemét, kevesebb munka. */
    compose(out, tx, ty, tz, rx, ry, rz, s) {
      const cx = Math.cos(rx), sx = Math.sin(rx);
      const cy = Math.cos(ry), sy = Math.sin(ry);
      const cz = Math.cos(rz), sz = Math.sin(rz);
      // R = Ry * Rx * Rz
      const m00 = cy * cz + sy * sx * sz;
      const m01 = cx * sz;
      const m02 = -sy * cz + cy * sx * sz;
      const m10 = -cy * sz + sy * sx * cz;
      const m11 = cx * cz;
      const m12 = sy * sz + cy * sx * cz;
      const m20 = sy * cx;
      const m21 = -sx;
      const m22 = cy * cx;
      out[0] = m00 * s; out[1] = m01 * s; out[2] = m02 * s; out[3] = 0;
      out[4] = m10 * s; out[5] = m11 * s; out[6] = m12 * s; out[7] = 0;
      out[8] = m20 * s; out[9] = m21 * s; out[10] = m22 * s; out[11] = 0;
      out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
      return out;
    },
  };

  /* --- GLB olvasó ------------------------------------------------------ */
  /* Csak azt a részhalmazt kezeli, amit a Blender exportja ad: egyetlen
     bináris chunk, lapos node-lista, mesh-enként egy primitív, float32
     POSITION/NORMAL, uint16 index. Bármi más → hiba, és marad a fallback. */
  async function loadGLB(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("GLB " + res.status);
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("nem GLB");

    let off = 12;
    let json = null;
    let bin = null;
    while (off < buf.byteLength) {
      const len = dv.getUint32(off, true);
      const type = dv.getUint32(off + 4, true);
      const start = off + 8;
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len)));
      else if (type === 0x004e4942) bin = { buf, start };
      off = start + len + ((4 - (len % 4)) % 4);
    }
    if (!json || !bin) throw new Error("hiányos GLB");

    const view = (i) => {
      const bv = json.bufferViews[i];
      return { off: bin.start + (bv.byteOffset || 0), len: bv.byteLength };
    };
    const read = (accIdx) => {
      const acc = json.accessors[accIdx];
      const v = view(acc.bufferView);
      const o = v.off + (acc.byteOffset || 0);
      const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
      const n = acc.count * comps;
      if (acc.componentType === 5126) return new Float32Array(bin.buf.slice(o, o + n * 4));
      if (acc.componentType === 5123) return new Uint16Array(bin.buf.slice(o, o + n * 2));
      if (acc.componentType === 5125) return new Uint32Array(bin.buf.slice(o, o + n * 4));
      throw new Error("nem támogatott componentType " + acc.componentType);
    };

    return (json.nodes || []).map((node) => {
      const mesh = json.meshes[node.mesh];
      const p = mesh.primitives[0];
      return {
        name: node.name || mesh.name,
        pos: read(p.attributes.POSITION),
        nrm: read(p.attributes.NORMAL),
        idx: read(p.indices),
      };
    });
  }

  /* --- shaderek -------------------------------------------------------- */
  const VS = `
attribute vec3 aPos;
attribute vec3 aNrm;
uniform mat4 uProj;
uniform mat4 uModel;
uniform float uCamZ;
varying vec3 vN;
varying float vDepth;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vN = normalize(mat3(uModel) * aNrm);
  vec4 vp = vec4(wp.xyz, 1.0);
  vp.z -= uCamZ;
  vDepth = -vp.z;
  gl_Position = uProj * vp;
}`;

  /* Kulcsfény + ellenoldali derítés + Blinn-Phong csúcsfény + peremfény + köd.
     A derítés adja a formát az árnyékos oldalon (enélkül lapos, "gumi" hatás),
     a csúcsfény a lakkozott felületet. A köd az alfába is beszámít, mert a
     canvas átlátszó a sötét lap fölött: a távoli elemek beleolvadnak a
     háttérbe, nem élesen levágódnak. */
  const FS = `
precision mediump float;
varying vec3 vN;
varying float vDepth;
uniform vec3 uBase;
uniform vec3 uKeyDir;
uniform vec3 uKeyCol;
uniform vec3 uRimCol;
uniform float uAmb;
uniform float uSpec;
uniform float uFogNear;
uniform float uFogFar;
uniform float uAlpha;
void main(){
  vec3 n = normalize(vN);
  vec3 view = vec3(0.0, 0.0, 1.0);

  float key = max(dot(n, uKeyDir), 0.0);
  key = key * key * (3.0 - 2.0 * key);            // lágy térdgörbe

  vec3 fillDir = normalize(vec3(-uKeyDir.x, -0.25, 0.6));
  float fill = max(dot(n, fillDir), 0.0) * 0.35;

  vec3 col = uBase * (uAmb + uKeyCol * key * 0.95 + fill);

  vec3 h = normalize(uKeyDir + view);
  float spec = pow(max(dot(n, h), 0.0), 28.0) * uSpec;
  col += vec3(1.0, 1.0, 0.92) * spec;

  float rim = pow(1.0 - abs(dot(n, view)), 3.5);
  col += uRimCol * rim * 0.38;

  float fog = clamp((uFogFar - vDepth) / (uFogFar - uFogNear), 0.0, 1.0);
  float a = uAlpha * fog;
  gl_FragColor = vec4(col * a, a);
}`;

  const PVS = `
attribute vec3 aPos;
uniform mat4 uProj;
uniform float uCamZ;
uniform float uSpin;
uniform float uLift;
uniform float uSize;
varying float vFade;
void main(){
  float c = cos(uSpin), s = sin(uSpin);
  vec3 p = vec3(aPos.x * c + aPos.z * s, aPos.y + uLift, -aPos.x * s + aPos.z * c);
  p.z -= uCamZ;
  vFade = clamp((22.0 + p.z) / 20.0, 0.0, 1.0);
  gl_Position = uProj * vec4(p, 1.0);
  gl_PointSize = uSize / max(1.0, -p.z) * 40.0;
}`;

  const PFS = `
precision mediump float;
varying float vFade;
uniform vec3 uCol;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float m = smoothstep(0.5, 0.1, length(d));
  float a = m * vFade * 0.55;
  gl_FragColor = vec4(uCol * a, a);
}`;

  function compile(gl, vsSrc, fsSrc) {
    const mk = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  function uniforms(gl, prog, names) {
    const u = {};
    names.forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    return u;
  }

  /* --- Renderer -------------------------------------------------------- */
  function createRenderer(canvas, opts) {
    opts = opts || {};
    const gl =
      canvas.getContext("webgl", {
        alpha: true,
        antialias: opts.antialias !== false,
        depth: true,
        premultipliedAlpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: true,
      }) || canvas.getContext("webgl", { alpha: true, antialias: false, depth: true, premultipliedAlpha: true });
    if (!gl) return null;

    const prog = compile(gl, VS, FS);
    const loc = {
      pos: gl.getAttribLocation(prog, "aPos"),
      nrm: gl.getAttribLocation(prog, "aNrm"),
    };
    const u = uniforms(gl, prog, [
      "uProj", "uModel", "uCamZ", "uBase", "uKeyDir", "uKeyCol", "uRimCol",
      "uAmb", "uSpec", "uFogNear", "uFogFar", "uAlpha",
    ]);

    const proj = M.ident();
    const model = M.ident();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    let W = 1, H = 1, dpr = 1, fov = 40, camZ = 12;

    /* --- geometria feltöltése -------------------------------------------- */
    function upload(part) {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, part.pos, gl.STATIC_DRAW);
      const nbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
      gl.bufferData(gl.ARRAY_BUFFER, part.nrm, gl.STATIC_DRAW);
      const ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, part.idx, gl.STATIC_DRAW);

      /* befoglaló doboz — a modellek normalizálásához kell */
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < part.pos.length; i += 3) {
        const x = part.pos[i], y = part.pos[i + 1], z = part.pos[i + 2];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
      }
      return {
        name: part.name,
        vbo, nbo, ibo,
        count: part.idx.length,
        type: part.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
        size: Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1,
      };
    }

    function resize(w, h, ratioCap) {
      dpr = Math.min(window.devicePixelRatio || 1, ratioCap || 1.5);
      W = Math.max(1, Math.round(w));
      H = Math.max(1, Math.round(h));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      M.perspective(proj, fov, W / H, 0.1, 80);
    }

    function begin() {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniformMatrix4fv(u.uProj, false, proj);
      gl.uniform1f(u.uCamZ, camZ);
      gl.enableVertexAttribArray(loc.pos);
      gl.enableVertexAttribArray(loc.nrm);
    }

    function light(o) {
      const d = o.keyDir || [0.45, 0.72, 0.53];
      const len = Math.hypot(d[0], d[1], d[2]) || 1;
      gl.uniform3f(u.uKeyDir, d[0] / len, d[1] / len, d[2] / len);
      gl.uniform3fv(u.uKeyCol, o.keyCol || [1, 1, 0.96]);
      gl.uniform3fv(u.uRimCol, o.rimCol || [0.76, 1, 0.45]);
      gl.uniform1f(u.uAmb, o.ambient == null ? 0.18 : o.ambient);
      gl.uniform1f(u.uSpec, o.spec == null ? 0.45 : o.spec);
      gl.uniform1f(u.uFogNear, o.fogNear == null ? 14 : o.fogNear);
      gl.uniform1f(u.uFogFar, o.fogFar == null ? 40 : o.fogFar);
    }

    /* xf: {x,y,z,rx,ry,rz,s} — egyenletes méretezés, hogy a normálok maradjanak jók */
    function draw(geo, xf, color, alpha) {
      M.compose(model, xf.x || 0, xf.y || 0, xf.z || 0, xf.rx || 0, xf.ry || 0, xf.rz || 0, xf.s == null ? 1 : xf.s);
      gl.uniformMatrix4fv(u.uModel, false, model);
      gl.uniform3fv(u.uBase, color || [0.55, 1, 0.2]);
      gl.uniform1f(u.uAlpha, alpha == null ? 1 : alpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.vbo);
      gl.vertexAttribPointer(loc.pos, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, geo.nbo);
      gl.vertexAttribPointer(loc.nrm, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geo.ibo);
      gl.drawElements(gl.TRIANGLES, geo.count, geo.type, 0);
    }

    /* --- por-részecskék (opcionális, saját apró program) ---------------- */
    let dust = null;
    function makeDust(count, spread) {
      const pts = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pts[i * 3] = (Math.random() - 0.5) * spread[0];
        pts[i * 3 + 1] = (Math.random() - 0.5) * spread[1];
        pts[i * 3 + 2] = (Math.random() - 0.5) * spread[2];
      }
      const p = compile(gl, PVS, PFS);
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
      dust = {
        prog: p,
        buf: b,
        count,
        loc: gl.getAttribLocation(p, "aPos"),
        u: uniforms(gl, p, ["uProj", "uCamZ", "uSpin", "uLift", "uSize", "uCol"]),
      };
      return dust;
    }
    function drawDust(spin, lift, size, col) {
      if (!dust) return;
      gl.useProgram(dust.prog);
      gl.depthMask(false);
      gl.uniformMatrix4fv(dust.u.uProj, false, proj);
      gl.uniform1f(dust.u.uCamZ, camZ);
      gl.uniform1f(dust.u.uSpin, spin);
      gl.uniform1f(dust.u.uLift, lift);
      gl.uniform1f(dust.u.uSize, size);
      gl.uniform3fv(dust.u.uCol, col);
      gl.enableVertexAttribArray(dust.loc);
      gl.bindBuffer(gl.ARRAY_BUFFER, dust.buf);
      gl.vertexAttribPointer(dust.loc, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, dust.count);
      gl.depthMask(true);
    }

    return {
      gl,
      upload,
      resize,
      begin,
      light,
      draw,
      makeDust,
      drawDust,
      set fov(v) { fov = v; M.perspective(proj, fov, W / H, 0.1, 80); },
      set cameraZ(v) { camZ = v; },
      get cameraZ() { return camZ; },
      get width() { return W; },
      get height() { return H; },
    };
  }

  window.EP.Mini3D = { createRenderer, loadGLB, mat4: M };
})();
