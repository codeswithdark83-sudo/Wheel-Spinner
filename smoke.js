/**
 * High-Performance Volumetric Smoky Effects
 * WebGL-based Domain-Warped Fractional Brownian Motion (fBm) Smoke Shader
 * with interactive cursor deflection and 2D canvas fallback.
 */

class SmokeBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
    this.time = 0;
    this.themes = {
      violet: {
        bg: [0.03, 0.02, 0.07],
        color1: [0.38, 0.18, 0.72], // deep violet
        color2: [0.12, 0.45, 0.85], // electric cyan-blue
        color3: [0.85, 0.22, 0.65], // magenta wisps
        speed: 0.45,
        density: 1.1
      },
      emerald: {
        bg: [0.01, 0.05, 0.04],
        color1: [0.08, 0.55, 0.42], // emerald
        color2: [0.05, 0.75, 0.65], // mint
        color3: [0.35, 0.85, 0.35], // neon green
        speed: 0.4,
        density: 1.05
      },
      ember: {
        bg: [0.06, 0.02, 0.01],
        color1: [0.85, 0.25, 0.05], // flame orange
        color2: [0.65, 0.08, 0.25], // crimson
        color3: [0.95, 0.65, 0.15], // golden smoke
        speed: 0.5,
        density: 1.2
      },
      midnight: {
        bg: [0.02, 0.03, 0.05],
        color1: [0.15, 0.25, 0.45], // slate blue
        color2: [0.25, 0.35, 0.65], // steel navy
        color3: [0.55, 0.65, 0.85], // silver mist
        speed: 0.35,
        density: 0.95
      }
    };

    this.currentThemeName = 'violet';
    this.currentTheme = this.themes[this.currentThemeName];

    this.initWebGL();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentThemeName = themeName;
      this.currentTheme = this.themes[themeName];
    }
  }

  initWebGL() {
    this.gl = this.canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    if (!this.gl) {
      this.init2DFallback();
      return;
    }

    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_bg;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform float u_density;

      // Fast hash
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }

      // 2D Perlin noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                       dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }

      // Fractional Brownian Motion (fBm)
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 4; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

        // Gentle interactive mouse displacement
        vec2 m = (u_mouse * 2.0 - 1.0);
        float mouseDist = length(p - m);
        p += (p - m) * 0.15 * exp(-mouseDist * 2.5);

        float t = u_time * 0.2;

        // Domain warping for realistic organic smoke vortices
        vec2 q = vec2(
          fbm(p + vec2(0.0, -t * 0.4)),
          fbm(p + vec2(5.2, 1.3) + vec2(t * 0.2, 0.0))
        );

        vec2 r = vec2(
          fbm(p + 4.0 * q + vec2(1.7, 9.2) + vec2(0.0, t * 0.3)),
          fbm(p + 4.0 * q + vec2(8.3, 2.8) - vec2(t * 0.25, 0.0))
        );

        float f = fbm(p + 3.5 * r + vec2(0.0, t * 0.5));

        // Map noise to smooth volumetric smoke density
        float density = smoothstep(-0.4, 0.85, f) * u_density;
        float core = clamp(length(q), 0.0, 1.0);
        float wisp = clamp(length(r), 0.0, 1.0);

        // Color blending across layers
        vec3 col = u_bg;
        col = mix(col, u_color1, density * 0.75);
        col = mix(col, u_color2, core * density * 0.9);
        col = mix(col, u_color3, pow(wisp, 2.0) * density * 0.6);

        // Add subtle vignette and depth ambient
        float vignette = 1.0 - length(uv - 0.5) * 0.7;
        col *= vignette;

        // Subtle glowing smoke highlights
        col += vec3(0.08) * pow(density, 3.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile failed', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
      this.init2DFallback();
      return;
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.warn('Program link failed', gl.getProgramInfoLog(this.program));
      this.init2DFallback();
      return;
    }

    // Geometry quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    this.posAttrib = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(this.posAttrib);
    gl.vertexAttribPointer(this.posAttrib, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      time: gl.getUniformLocation(this.program, 'u_time'),
      mouse: gl.getUniformLocation(this.program, 'u_mouse'),
      bg: gl.getUniformLocation(this.program, 'u_bg'),
      color1: gl.getUniformLocation(this.program, 'u_color1'),
      color2: gl.getUniformLocation(this.program, 'u_color2'),
      color3: gl.getUniformLocation(this.program, 'u_color3'),
      density: gl.getUniformLocation(this.program, 'u_density')
    };

    this.resize();
  }

  init2DFallback() {
    this.is2D = true;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 120 + Math.random() * 220,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.4,
        alpha: 0.08 + Math.random() * 0.14,
        hue: Math.random() * 60 + 240
      });
    }
    this.resize();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize(), { passive: true });
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX / window.innerWidth;
      this.mouse.targetY = 1.0 - (e.clientY / window.innerHeight);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = e.touches[0].clientX / window.innerWidth;
        this.mouse.targetY = 1.0 - (e.touches[0].clientY / window.innerHeight);
      }
    }, { passive: true });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // Render smoke at half resolution for ultra-high framerate and soft volumetric diffusion
    const w = Math.floor(window.innerWidth * dpr * 0.5);
    const h = Math.floor(window.innerHeight * dpr * 0.5);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
    }

    if (this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  }

  animate(now) {
    this.time = now * 0.001;

    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

    if (this.gl) {
      const gl = this.gl;
      gl.useProgram(this.program);

      gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.time, this.time * this.currentTheme.speed);
      gl.uniform2f(this.uniforms.mouse, this.mouse.x, this.mouse.y);
      gl.uniform3fv(this.uniforms.bg, this.currentTheme.bg);
      gl.uniform3fv(this.uniforms.color1, this.currentTheme.color1);
      gl.uniform3fv(this.uniforms.color2, this.currentTheme.color2);
      gl.uniform3fv(this.uniforms.color3, this.currentTheme.color3);
      gl.uniform1f(this.uniforms.density, this.currentTheme.density);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else if (this.is2D && this.ctx) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, h);

      for (let p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -p.radius) p.y = h + p.radius;
        if (p.x < -p.radius) p.x = w + p.radius;
        if (p.x > w + p.radius) p.x = -p.radius;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 55%, ${p.alpha})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(this.animate);
  }
}

window.SmokeBackground = SmokeBackground;
