let stopCelebration;

// Short-lived local effect: no CDN, no background work after the celebration.
export function celebrateFontSwitch() {
  stopCelebration?.();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'font-confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  if (!context) { canvas.remove(); return; }
  const width = innerWidth;
  const height = innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);
  const duration = 4.4;
  const colors = ['#d9a441', '#ee7895', '#73bca6', '#7aace6', '#bc8bd6', '#f2cb70'];
  const particles = Array.from({ length: width < 769 ? 180 : 340 }, (_, index) => {
    const depth = 0.65 + Math.random() * 0.35;
    return {
      x: Math.random() * width, y: -20 - Math.random() * height * 0.24,
      vx: (Math.random() - 0.5) * 50,
      vy: height * (0.24 + Math.random() * 0.14),
      rotation: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 5,
      size: (width < 769 ? 12 : 16) + Math.random() * 10,
      sway: 18 + Math.random() * 35, depth,
      color: colors[index % colors.length],
      delay: Math.random() * 0.9
    };
  });
  let frame = 0;
  let start;
  function stop() {
    cancelAnimationFrame(frame);
    canvas.remove();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', stop);
    if (stopCelebration === stop) stopCelebration = undefined;
  }
  function onVisibility() { if (document.hidden) stop(); }
  stopCelebration = stop;
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', stop, { once: true });
  function draw(time) {
    start ??= time;
    const elapsed = (time - start) / 1000;
    if (elapsed > duration) { stop(); return; }
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      const age = elapsed - particle.delay;
      if (age < 0) continue;
      const x = particle.x + particle.vx * age + Math.sin(age * 2 + particle.rotation) * particle.sway;
      const y = particle.y + particle.vy * age + height * 0.045 * age * age;
      context.save();
      context.globalAlpha = particle.depth * Math.min(1, Math.max(0, (duration - elapsed) / 0.65));
      context.translate(x, y);
      context.rotate(particle.rotation + particle.spin * age);
      context.scale(1, 0.45 + Math.abs(Math.cos(age * 5 + particle.rotation)) * 0.55);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.65);
      context.restore();
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
}
