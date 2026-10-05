// One text atlas per viewport, two batched draws per frame. Canvas remains the
// fallback: software WebGL and oversized textures must not make entry slower.
export function createGlyphGPU(source, rows, width, height, ratio, font, onLost) {
  const canvas = source.cloneNode(false);
  canvas.removeAttribute('data-home-glyph-canvas');
  canvas.setAttribute('data-home-glyph-gpu', '');
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, antialias: false,
      depth: false, stencil: false, preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: true
    });
  } catch { return null; }
  if (!gl) return null;
  let program;
  let texture;
  let buffer;
  const shaders = [];
  let disposed = false;
  function dispose() {
    disposed = true;
    canvas.remove();
    source.style.visibility = '';
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) {
      dispose();
      return null;
    }
    const padding = 2;
    const stripHeight = Math.ceil(22 * ratio) + padding * 2;
    const atlasWidth = Math.ceil(Math.max(...rows.map(row => row.width)) * ratio) + padding * 2;
    const atlasHeight = rows.length * stripHeight;
    const limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    // Keep separate theme coverage to preserve color-dependent antialiasing.
    // Pack both into one texture, bounded at 24 MiB; never reduce resolution.
    if (atlasWidth > limit || atlasHeight > limit || atlasWidth * atlasHeight * 2 > 24 * 1024 * 1024) {
      dispose();
      return null;
    }
    const atlas = document.createElement('canvas');
    atlas.width = atlasWidth;
    atlas.height = atlasHeight;
    const ctx = atlas.getContext('2d');
    if (!ctx) throw new Error('No text surface');
    ctx.scale(ratio, ratio);
    ctx.font = font;
    ctx.textBaseline = 'top';
    function compile(type, code) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('No shader');
      shaders.push(shader);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER, `
      precision highp float;
      attribute vec2 position; attribute vec2 uv;
      uniform vec2 size; varying vec2 texcoord;
      void main() { gl_Position = vec4(position / size * vec2(2., -2.) + vec2(-1., 1.), 0., 1.); texcoord = uv; }
    `);
    const fragment = compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform sampler2D atlas; uniform vec3 color; uniform float glow; uniform float dark;
      uniform vec2 pointer; uniform vec2 size; uniform float ratio;
      uniform vec2 glowAlpha; varying vec2 texcoord;
      void main() {
        float a;
        if (glow > .5) {
          vec2 point = vec2(gl_FragCoord.x / ratio, size.y - gl_FragCoord.y / ratio);
          float d = length(point - pointer) / (.34 * max(size.x, size.y));
          a = d < .48 ? mix(glowAlpha.x, glowAlpha.y, d / .48) : mix(glowAlpha.y, 0., clamp((d - .48) / .52, 0., 1.));
        } else { vec4 coverage = texture2D(atlas, texcoord); a = mix(coverage.r, coverage.a, dark); }
        gl_FragColor = vec4(color * a, a);
      }
    `);
    program = gl.createProgram();
    if (!program) throw new Error('No program');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture) throw new Error('No GPU storage');
    const coverage = new Uint8Array(atlasWidth * atlasHeight * 2);
    for (let theme = 0; theme < 2; theme++) {
      ctx.clearRect(0, 0, atlasWidth / ratio, atlasHeight / ratio);
      const color = theme ? '244,244,245' : '24,32,48';
      rows.forEach((row, index) => {
        ctx.fillStyle = `rgba(${color},${row.alpha})`;
        ctx.fillText(row.content, padding / ratio, (index * stripHeight + padding) / ratio);
      });
      const pixels = ctx.getImageData(0, 0, atlasWidth, atlasHeight).data;
      for (let index = 0; index < atlasWidth * atlasHeight; index++) coverage[index * 2 + theme] = pixels[index * 4 + 3];
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE_ALPHA, atlasWidth, atlasHeight, 0, gl.LUMINANCE_ALPHA, gl.UNSIGNED_BYTE, coverage);
    // Release the CPU bitmap after upload; only the bounded GPU texture persists.
    atlas.width = atlas.height = 1;
    if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) throw new Error('Texture allocation failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [name, count, offset] of [['position', 2, 0], ['uv', 2, 8]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, count, gl.FLOAT, false, 16, offset);
    }
    const uniforms = Object.fromEntries(['size', 'color', 'glow', 'pointer', 'ratio', 'glowAlpha', 'dark'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform2f(uniforms.size, width, height);
    gl.uniform1f(uniforms.ratio, ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    const vertices = new Float32Array((rows.length + 1) * 6 * 4);
    function quad(index, x, y, w, h, u0, v0, u1, v1) {
      vertices.set([
        x, y, u0, v0, x + w, y, u1, v0, x, y + h, u0, v1,
        x, y + h, u0, v1, x + w, y, u1, v0, x + w, y + h, u1, v1
      ], index * 24);
    }
    rows.forEach((row, index) => {
      const top = index * stripHeight;
      quad(index, row.x - padding / ratio, row.y - padding / ratio,
        atlasWidth / ratio, stripHeight / ratio, 0, top / atlasHeight, 1, (top + stripHeight) / atlasHeight);
    });
    let pointerX = NaN;
    let pointerY = NaN;
    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
    canvas.addEventListener('webglcontextlost', () => {
      if (disposed) return;
      source.style.visibility = '';
      canvas.remove();
      onLost();
    }, { once: true });
    source.after(canvas);
    source.style.visibility = 'hidden';
    return {
      dispose,
      draw(pointer, dark) {
        for (let index = 0; index < rows.length; index++) {
          const offset = index * 24;
          const left = rows[index].x - padding / ratio;
          const right = left + atlasWidth / ratio;
          vertices[offset] = vertices[offset + 8] = vertices[offset + 12] = left;
          vertices[offset + 4] = vertices[offset + 16] = vertices[offset + 20] = right;
        }
        if (pointer.x !== pointerX || pointer.y !== pointerY) {
          pointerX = pointer.x;
          pointerY = pointer.y;
          const radius = .34 * Math.max(width, height);
          const left = Math.max(0, pointer.x - radius);
          const top = Math.max(0, pointer.y - radius);
          const right = Math.min(width, pointer.x + radius);
          const bottom = Math.min(height, pointer.y + radius);
          quad(rows.length, left, top, Math.max(0, right - left), Math.max(0, bottom - top), 0, 0, 1, 1);
        }
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.uniform1f(uniforms.glow, 0);
        gl.uniform1f(uniforms.dark, dark ? 1 : 0);
        gl.uniform3f(uniforms.color, (dark ? 244 : 24) / 255, (dark ? 244 : 32) / 255, (dark ? 245 : 48) / 255);

        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, rows.length * 6);
        gl.uniform1f(uniforms.glow, 1);
        gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
        gl.uniform2f(uniforms.glowAlpha, dark ? .09 : .045, dark ? .03 : .015);
        gl.uniform3f(uniforms.color, (dark ? 161 : 37) / 255, (dark ? 161 : 99) / 255, (dark ? 170 : 235) / 255);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.drawArrays(gl.TRIANGLES, rows.length * 6, 6);
      }
    };
  } catch {
    dispose();
    return null;
  }
}
