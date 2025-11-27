// Particle Effects System

export class ParticleSystem {
  constructor(containerEl) {
    this.container = containerEl;
    this.particles = [];
  }
  
  createParticle(x, y, color, velocity) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 0 10px ${color};
    `;
    
    this.container.appendChild(particle);
    
    const vx = velocity.x || (Math.random() - 0.5) * 8;
    const vy = velocity.y || (Math.random() - 0.5) * 8;
    const life = 60; // frames
    
    this.particles.push({
      element: particle,
      x, y, vx, vy,
      life, maxLife: life,
      color
    });
  }
  
  burst(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 4;
      this.createParticle(x, y, color, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      });
    }
  }
  
  update() {
    this.particles = this.particles.filter(p => {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.vx *= 0.98; // friction
      
      const opacity = p.life / p.maxLife;
      const scale = 0.5 + (p.life / p.maxLife) * 0.5;
      
      p.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
      p.element.style.opacity = opacity;
      p.element.style.left = p.x + 'px';
      p.element.style.top = p.y + 'px';
      
      if (p.life <= 0) {
        p.element.remove();
        return false;
      }
      return true;
    });
    
    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.update());
    }
  }
  
  startAnimation() {
    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.update());
    }
  }
}
