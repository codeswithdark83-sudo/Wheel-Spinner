/**
 * 3D Physics Confetti Cannon
 * Multi-shape glittering ribbons, stars, and flakes with true 3D tilt & rotation
 */

class ConfettiCannon {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animating = false;

    this.colors = [
      '#FF3366', '#33CCFF', '#FFCC00', '#33FF99',
      '#9933FF', '#FF6600', '#00FFCC', '#FF0099',
      '#FFD700', '#FFFFFF'
    ];

    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 180) {
    this.resize();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 16;
      const type = Math.random() > 0.4 ? 'ribbon' : (Math.random() > 0.5 ? 'circle' : 'star');

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
        vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.4) - (Math.random() * 5 + 3),
        size: 7 + Math.random() * 9,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        type: type,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 14,
        tilt: Math.random() * 10,
        tiltSpeed: 0.1 + Math.random() * 0.15,
        tiltAngle: 0,
        alpha: 1,
        decay: 0.005 + Math.random() * 0.007,
        gravity: 0.28,
        drag: 0.982
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }
  }

  animate() {
    if (!this.particles.length) {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.rotation += p.rotationSpeed;
      p.tiltAngle += p.tiltSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height + 40) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.strokeStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);

      // 3D perspective squish based on tilt
      const xSquish = Math.cos(p.tiltAngle);

      if (p.type === 'ribbon') {
        this.ctx.beginPath();
        this.ctx.fillRect(-p.size * xSquish, -p.size * 0.45, p.size * 2 * Math.abs(xSquish), p.size * 0.9);
      } else if (p.type === 'circle') {
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, Math.max(1, p.size * 0.7 * Math.abs(xSquish)), p.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Star
        this.ctx.beginPath();
        const spikes = 5;
        const outer = p.size;
        const inner = p.size * 0.5;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        this.ctx.moveTo(0, -outer);
        for (let s = 0; s < spikes; s++) {
          let sx = Math.cos(rot) * outer * xSquish;
          let sy = Math.sin(rot) * outer;
          this.ctx.lineTo(sx, sy);
          rot += step;

          sx = Math.cos(rot) * inner * xSquish;
          sy = Math.sin(rot) * inner;
          this.ctx.lineTo(sx, sy);
          rot += step;
        }
        this.ctx.lineTo(0, -outer);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    requestAnimationFrame(this.animate);
  }
}

window.ConfettiCannon = ConfettiCannon;
