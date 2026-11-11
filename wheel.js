/**
 * 3D Glassmorphism Spin Wheel Engine
 * Features:
 * - 100% mathematically uniform random chance per active name using crypto.getRandomValues
 * - HiDPI Retina canvas rendering
 * - Multi-layered 3D metallic beveled rim, chrome studs/pegs, and convex lighting
 * - Spring-loaded physical flapper pointer with real collision bounce & synchronized audio ticks
 * - Custom physics easing curve with suspense slowdown
 */

class SpinWheel {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.options = Object.assign({
      spinDuration: 5500, // ms
      minRotations: 6,
      maxRotations: 9,
      onSpinStart: () => {},
      onSpinEnd: () => {},
      onTick: () => {}
    }, options);

    this.items = []; // Array of { id, text, active }
    this.rotation = 0; // Current angle in radians
    this.isSpinning = false;
    this.spinStartTime = 0;
    this.startRotation = 0;
    this.targetRotation = 0;
    this.duration = this.options.spinDuration;

    // Physical flapper pointer spring physics
    this.pointerAngle = 0; // Current deflection angle
    this.pointerVelocity = 0;
    this.lastPegIndex = -1;

    // Vibrant luxury color palette (optimized for contrast & 3D lighting)
    this.palette = [
      { start: '#6366F1', end: '#4338CA', text: '#FFFFFF' }, // Indigo
      { start: '#EC4899', end: '#BE185D', text: '#FFFFFF' }, // Pink
      { start: '#06B6D4', end: '#0E7490', text: '#FFFFFF' }, // Cyan
      { start: '#F59E0B', end: '#B45309', text: '#FFFFFF' }, // Amber
      { start: '#10B981', end: '#047857', text: '#FFFFFF' }, // Emerald
      { start: '#8B5CF6', end: '#6D28D9', text: '#FFFFFF' }, // Purple
      { start: '#EF4444', end: '#B91C1C', text: '#FFFFFF' }, // Red
      { start: '#3B82F6', end: '#1D4ED8', text: '#FFFFFF' }, // Blue
      { start: '#14B8A6', end: '#0F766E', text: '#FFFFFF' }, // Teal
      { start: '#F97316', end: '#C2410C', text: '#FFFFFF' }, // Orange
      { start: '#A855F7', end: '#7E22CE', text: '#FFFFFF' }, // Violet
      { start: '#84CC16', end: '#4D7C0F', text: '#FFFFFF' }  // Lime
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.draw();

    // Loop for continuous rendering during animation or idle physics
    this.animateLoop = this.animateLoop.bind(this);
    requestAnimationFrame(this.animateLoop);
  }

  setDuration(durationMs) {
    this.options.spinDuration = durationMs;
  }

  setItems(items) {
    this.items = items;
    this.lastPegIndex = -1;
    this.draw();
  }

  getActiveItems() {
    return this.items.filter(item => item.active !== false);
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height || rect.width);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.size = size;
    this.canvas.width = Math.floor(size * this.dpr);
    this.canvas.height = Math.floor(size * this.dpr);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = (size / 2) - 18; // Margin for pointer & 3D shadow

    this.draw();
  }

  /**
   * Perfectly uniform random selection using cryptographically secure RNG.
   * Every active name has an EXACT equal probability of 1/N.
   */
  spin() {
    if (this.isSpinning) return;
    const active = this.getActiveItems();
    if (active.length < 2) {
      return { error: 'Please add at least 2 active names to spin!' };
    }

    const N = active.length;
    const arc = (Math.PI * 2) / N;

    // Cryptographically secure random index selection: 100% equal chance
    let secureRand;
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      secureRand = arr[0] / (0xFFFFFFFF + 1);
    } else {
      secureRand = Math.random();
    }

    const winnerIndex = Math.floor(secureRand * N);
    const winnerItem = active[winnerIndex];

    // Jitter within slice arc (25% to 75% away from dividers) to avoid ambiguous borders
    const jitterFactor = 0.25 + (Math.random() * 0.5);
    const sliceAngleOffset = (winnerIndex + jitterFactor) * arc;

    // Pointer is positioned at top center: angle = 3*PI/2 (270 deg)
    // Pointer angle in wheel coordinates: (3*PI/2 - finalRotation) % (2*PI) = sliceAngleOffset
    // Therefore: finalRotation mod 2*PI = (3*PI/2 - sliceAngleOffset) mod 2*PI
    const pointerAngle = (3 * Math.PI) / 2;
    let targetMod = (pointerAngle - sliceAngleOffset) % (Math.PI * 2);
    if (targetMod < 0) targetMod += Math.PI * 2;

    // Random number of full revolutions for suspense
    const extraRotations = this.options.minRotations +
      Math.floor(Math.random() * (this.options.maxRotations - this.options.minRotations + 1));

    const currentMod = this.rotation % (Math.PI * 2);
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += Math.PI * 2;

    this.startRotation = this.rotation;
    this.targetRotation = this.rotation + (extraRotations * Math.PI * 2) + delta;
    this.duration = this.options.spinDuration;
    this.spinStartTime = performance.now();
    this.isSpinning = true;
    this.winner = winnerItem;
    this.winnerIndex = winnerIndex;
    this.lastPegIndex = -1;

    this.options.onSpinStart(this.winner);
    return { success: true, winner: this.winner };
  }

  // Quintic-Cubic ease-out with dramatic suspense crawler at the end
  easeOutCubic(t) {
    // Starts briskly, decelerates smoothly, and provides tantalizing crawl during last 20%
    const p = 1 - t;
    return 1 - (p * p * p * p * (1 + 0.3 * (1 - p)));
  }

  animateLoop(now) {
    if (this.isSpinning) {
      const elapsed = now - this.spinStartTime;
      const rawProgress = Math.min(elapsed / this.duration, 1.0);
      const easeProgress = this.easeOutCubic(rawProgress);

      const prevRotation = this.rotation;
      this.rotation = this.startRotation + (this.targetRotation - this.startRotation) * easeProgress;

      // Calculate instantaneous angular velocity
      const velocity = (this.rotation - prevRotation) * 60; // rad/sec approx

      // Check peg crossing under pointer
      this.checkPegCrossing(velocity);

      if (rawProgress >= 1.0) {
        this.rotation = this.targetRotation;
        this.isSpinning = false;
        this.pointerVelocity = -0.3; // Final settle bounce
        this.options.onSpinEnd(this.winner, this.winnerIndex);
      }
    }

    // Physical flapper spring physics update: Damped harmonic oscillator
    // m * x'' + c * x' + k * x = 0
    const springStiffness = 380;
    const damping = 18;
    const dt = 0.016; // 60fps frame step

    const springForce = -springStiffness * this.pointerAngle;
    const dampingForce = -damping * this.pointerVelocity;
    const acceleration = springForce + dampingForce;

    this.pointerVelocity += acceleration * dt;
    this.pointerAngle += this.pointerVelocity * dt;

    // Draw frame
    this.draw();

    requestAnimationFrame(this.animateLoop);
  }

  checkPegCrossing(velocity) {
    const active = this.getActiveItems();
    if (!active.length) return;
    const N = active.length;
    const arc = (Math.PI * 2) / N;

    // Pointer is at 3*PI/2 (top)
    const pointerPos = (3 * Math.PI) / 2;
    const normalizedAngle = (pointerPos - this.rotation) % (Math.PI * 2);
    const positiveAngle = normalizedAngle < 0 ? normalizedAngle + Math.PI * 2 : normalizedAngle;

    const currentPeg = Math.floor(positiveAngle / arc);

    if (this.lastPegIndex !== -1 && currentPeg !== this.lastPegIndex) {
      // Peg hits the flapper! Deflect flapper in direction of rotation
      const deflectionMagnitude = Math.min(0.42, 0.15 + velocity * 0.025);
      this.pointerAngle = -deflectionMagnitude;
      this.pointerVelocity = 2.5;

      // Sound trigger
      const pitchRatio = Math.max(0.7, Math.min(1.8, velocity * 0.12));
      this.options.onTick(pitchRatio);
    }
    this.lastPegIndex = currentPeg;
  }

  draw() {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    ctx.clearRect(0, 0, this.size, this.size);

    const active = this.getActiveItems();
    if (!active.length) {
      this.drawEmptyState(cx, cy, r);
      return;
    }

    const N = active.length;
    const arc = (Math.PI * 2) / N;

    // 1. Ambient 3D Drop Shadow underneath the wheel
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + 12, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;
    ctx.fill();
    ctx.restore();

    // 2. Outer 3D Metallic/Chrome Beveled Rim
    ctx.save();
    const rimGradient = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rimGradient.addColorStop(0.00, '#4b5563');
    rimGradient.addColorStop(0.20, '#d1d5db');
    rimGradient.addColorStop(0.40, '#1f2937');
    rimGradient.addColorStop(0.60, '#9ca3af');
    rimGradient.addColorStop(0.80, '#374151');
    rimGradient.addColorStop(1.00, '#e5e7eb');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Rim inner recess ring
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
    ctx.restore();

    // 3. Wheel Slices & Content
    const wheelRadius = r - 14;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    for (let i = 0; i < N; i++) {
      const item = active[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;
      const colorScheme = this.palette[i % this.palette.length];

      ctx.save();

      // Slice sector path
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, startAngle, endAngle);
      ctx.closePath();

      // Radial slice gradient for subtle 3D cylinder depth
      const midAngle = startAngle + (arc / 2);
      const gradX = Math.cos(midAngle) * wheelRadius * 0.7;
      const gradY = Math.sin(midAngle) * wheelRadius * 0.7;
      const sliceGrad = ctx.createRadialGradient(0, 0, wheelRadius * 0.15, gradX, gradY, wheelRadius);
      sliceGrad.addColorStop(0, colorScheme.start);
      sliceGrad.addColorStop(1, colorScheme.end);

      ctx.fillStyle = sliceGrad;
      ctx.fill();

      // Slice border line (subtle glass border)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.stroke();

      // 4. Slice Text (auto-scaled and truncated)
      ctx.save();
      ctx.rotate(midAngle);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Typography scaling based on item count
      const textDist = wheelRadius * 0.88;
      const maxTextWidth = wheelRadius * 0.62;
      let fontSize = Math.max(11, Math.min(20, Math.floor(260 / Math.sqrt(N))));
      if (N > 24) fontSize = 11;
      if (N > 40) fontSize = 9;

      ctx.font = `600 ${fontSize}px "Outfit", "Segoe UI", sans-serif`;
      ctx.fillStyle = colorScheme.text;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Truncate long text if needed
      let text = item.text;
      if (ctx.measureText(text).width > maxTextWidth) {
        while (text.length > 3 && ctx.measureText(text + '…').width > maxTextWidth) {
          text = text.slice(0, -1);
        }
        text += '…';
      }

      ctx.fillText(text, textDist, 0);
      ctx.restore();

      ctx.restore();
    }

    // 5. Chrome Studs/Pegs along outer edge at each slice boundary
    for (let i = 0; i < N; i++) {
      const pegAngle = i * arc;
      const pegDist = r - 7;
      const px = Math.cos(pegAngle) * pegDist;
      const py = Math.sin(pegAngle) * pegDist;

      // Peg drop shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py + 1, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fill();

      // Peg chrome dome
      const pegGrad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 4);
      pegGrad.addColorStop(0, '#ffffff');
      pegGrad.addColorStop(0.4, '#e5e7eb');
      pegGrad.addColorStop(0.8, '#4b5563');
      pegGrad.addColorStop(1, '#111827');

      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = pegGrad;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // Exit rotation

    // 6. 3D Convex Glass Dome Specular Overlay
    ctx.save();
    const domeGrad = ctx.createRadialGradient(
      cx - (wheelRadius * 0.3),
      cy - (wheelRadius * 0.35),
      wheelRadius * 0.05,
      cx, cy, wheelRadius
    );
    domeGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.26)');
    domeGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
    domeGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');
    domeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.45)');

    ctx.beginPath();
    ctx.arc(cx, cy, wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = domeGrad;
    ctx.fill();
    ctx.restore();

    // 7. Center 3D Hub & Jewel
    this.drawCenterHub(cx, cy);

    // 8. 3D Spring-Loaded Flapper Pointer at the top
    this.drawPointer(cx, cy, r);
  }

  drawCenterHub(cx, cy) {
    const ctx = this.ctx;
    const hubR = Math.max(34, this.radius * 0.22);

    ctx.save();

    // Hub Outer Drop Shadow
    ctx.beginPath();
    ctx.arc(cx, cy + 3, hubR + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fill();

    // Outer Metallic Chrome Ring
    const chromeGrad = ctx.createLinearGradient(cx - hubR, cy - hubR, cx + hubR, cy + hubR);
    chromeGrad.addColorStop(0, '#f3f4f6');
    chromeGrad.addColorStop(0.25, '#9ca3af');
    chromeGrad.addColorStop(0.5, '#ffffff');
    chromeGrad.addColorStop(0.75, '#4b5563');
    chromeGrad.addColorStop(1, '#d1d5db');

    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = chromeGrad;
    ctx.fill();

    // Inner Bevel Groove
    ctx.beginPath();
    ctx.arc(cx, cy, hubR - 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Central 3D Glowing Gemstone / Button Dome
    const innerR = hubR - 7;
    const gemGrad = ctx.createRadialGradient(cx - (innerR * 0.3), cy - (innerR * 0.35), 2, cx, cy, innerR);
    gemGrad.addColorStop(0, '#818cf8');
    gemGrad.addColorStop(0.4, '#4f46e5');
    gemGrad.addColorStop(0.85, '#312e81');
    gemGrad.addColorStop(1, '#0f172a');

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Specular Glint Reflection
    ctx.beginPath();
    ctx.ellipse(cx - (innerR * 0.25), cy - (innerR * 0.35), innerR * 0.45, innerR * 0.22, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // "SPIN" text in center hub
    ctx.font = `bold ${Math.floor(innerR * 0.52)}px "Outfit", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillText('SPIN', cx, cy + 1);

    ctx.restore();
  }

  drawPointer(cx, cy, r) {
    const ctx = this.ctx;
    // Pointer is positioned at the top rim, pointing downward
    const topY = cy - r + 14;

    ctx.save();
    ctx.translate(cx, topY);
    // Apply dynamic spring deflection from peg collision
    ctx.rotate(this.pointerAngle);

    // 3D Pointer Shadow
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(-14, -18);
    ctx.lineTo(14, -18);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fill();

    // Pointer Metallic Gold/Amber Gradient
    const ptrGrad = ctx.createLinearGradient(-14, -18, 14, 24);
    ptrGrad.addColorStop(0, '#fde68a');
    ptrGrad.addColorStop(0.35, '#f59e0b');
    ptrGrad.addColorStop(0.7, '#d97706');
    ptrGrad.addColorStop(1, '#b45309');

    ctx.beginPath();
    ctx.moveTo(0, 24);   // Tip pointing into the wheel
    ctx.lineTo(-14, -16); // Top-left wing
    ctx.quadraticCurveTo(0, -22, 14, -16); // Curved top edge
    ctx.closePath();
    ctx.fillStyle = ptrGrad;
    ctx.fill();

    // Pointer bevel center spine
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(0, -20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pointer Pivot Screw
    const pivotGrad = ctx.createRadialGradient(-1, -15, 0.5, 0, -14, 5);
    pivotGrad.addColorStop(0, '#ffffff');
    pivotGrad.addColorStop(0.5, '#9ca3af');
    pivotGrad.addColorStop(1, '#1f2937');

    ctx.beginPath();
    ctx.arc(0, -14, 5, 0, Math.PI * 2);
    ctx.fillStyle = pivotGrad;
    ctx.fill();

    ctx.restore();
  }

  drawEmptyState(cx, cy, r) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Ambient 3D Drop Shadow underneath the wheel
    ctx.beginPath();
    ctx.arc(cx, cy + 12, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;
    ctx.fill();

    // 2. Outer 3D Metallic/Chrome Beveled Rim
    const rimGradient = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rimGradient.addColorStop(0.00, '#4b5563');
    rimGradient.addColorStop(0.20, '#d1d5db');
    rimGradient.addColorStop(0.40, '#1f2937');
    rimGradient.addColorStop(0.60, '#9ca3af');
    rimGradient.addColorStop(0.80, '#374151');
    rimGradient.addColorStop(1.00, '#e5e7eb');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Rim inner recess ring
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Inner frosted dark glass disc
    const innerDiscGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, r - 14);
    innerDiscGrad.addColorStop(0, 'rgba(30, 41, 59, 0.7)');
    innerDiscGrad.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    ctx.beginPath();
    ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
    ctx.fillStyle = innerDiscGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3D Convex Glass Dome Specular Overlay
    const domeGrad = ctx.createRadialGradient(
      cx - ((r - 14) * 0.3),
      cy - ((r - 14) * 0.35),
      (r - 14) * 0.05,
      cx, cy, r - 14
    );
    domeGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.22)');
    domeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    domeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.4)');
    ctx.beginPath();
    ctx.arc(cx, cy, r - 14, 0, Math.PI * 2);
    ctx.fillStyle = domeGrad;
    ctx.fill();

    // Center 3D Hub
    this.drawCenterHub(cx, cy);

    // Prompt message above and below center hub
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 16px "Outfit", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillText('Wheel is Ready', cx, cy - 65);
    ctx.font = '400 13px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('Add names on the left to start', cx, cy + 68);

    // Pointer at top
    this.drawPointer(cx, cy, r);
    ctx.restore();
  }
}

window.SpinWheel = SpinWheel;
