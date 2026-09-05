/**
 * Interactive Cyber Grid & Isometric Cube Canvas Animation for Main Menu
 */
export function createMenuCanvas(canvas) {
  if (!canvas) return { start: () => {}, stop: () => {} };

  const ctx = canvas.getContext("2d");
  let animationFrameId = null;
  let isRunning = false;
  let width = 0;
  let height = 0;

  // Particle dust motes
  const particles = [];
  const PARTICLE_COUNT = 45;

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * (width || 800),
        y: Math.random() * (height || 600),
        size: Math.random() * 2 + 0.8,
        speedY: -(Math.random() * 0.45 + 0.15),
        speedX: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.01
      });
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = canvas.width = Math.max(rect.width, 320);
    height = canvas.height = Math.max(rect.height, 240);
    if (particles.length === 0) initParticles();
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(canvas);
  resize();

  // 3D Isometric Cube definition (vertices and edges)
  const cubeVertices = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1]
  ];

  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0], // back face
    [4, 5], [5, 6], [6, 7], [7, 4], // front face
    [0, 4], [1, 5], [2, 6], [3, 7]  // connecting edges
  ];

  let cubeAngleX = 0.35;
  let cubeAngleY = 0.45;
  let cubeAngleZ = 0.15;
  let gridOffset = 0;

  function render(time) {
    if (!isRunning) return;

    ctx.clearRect(0, 0, width, height);

    // Deep atmospheric background gradient
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.45, 100,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.8
    );
    bgGrad.addColorStop(0, "#08131d");
    bgGrad.addColorStop(0.5, "#040910");
    bgGrad.addColorStop(1, "#020408");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Perspective Wireframe Cyber Grid
    const horizonY = height * 0.52;
    const fov = 300;
    gridOffset = (time * 0.035) % 40;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, width, height - horizonY);
    ctx.clip();

    // Perspective Lines converging to vanishing point
    const vanishingX = width * 0.5;
    const lineCount = 28;
    const spread = width * 2.2;

    for (let i = -lineCount / 2; i <= lineCount / 2; i++) {
      const bottomX = vanishingX + (i * (spread / lineCount));
      const grad = ctx.createLinearGradient(vanishingX, horizonY, bottomX, height);
      grad.addColorStop(0, "rgba(13, 242, 201, 0.0)");
      grad.addColorStop(0.3, "rgba(13, 242, 201, 0.12)");
      grad.addColorStop(1, "rgba(13, 242, 201, 0.35)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vanishingX, horizonY);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    // Horizontal grid lines moving towards viewer
    const horizontalLineCount = 18;
    for (let j = 1; j <= horizontalLineCount; j++) {
      const p = (j * 40 + gridOffset) / (horizontalLineCount * 40);
      const y = horizonY + Math.pow(p, 2.6) * (height - horizonY);
      const alpha = Math.min(1, Math.pow(p, 1.8)) * 0.38;

      ctx.strokeStyle = `rgba(13, 242, 201, ${alpha})`;
      ctx.lineWidth = 1 + p * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Glowing Horizon Line
    const horizonGrad = ctx.createLinearGradient(0, horizonY, width, horizonY);
    horizonGrad.addColorStop(0, "rgba(13, 242, 201, 0)");
    horizonGrad.addColorStop(0.5, "rgba(13, 242, 201, 0.6)");
    horizonGrad.addColorStop(1, "rgba(13, 242, 201, 0)");
    ctx.strokeStyle = horizonGrad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.stroke();

    ctx.restore();

    // 2. Floating Cyber Data Particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.alpha += Math.sin(time * p.pulseSpeed) * 0.01;

      if (p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.fillStyle = `rgba(13, 242, 201, ${Math.max(0.1, Math.min(0.8, p.alpha))})`;
      ctx.shadowColor = "#0df2c9";
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.shadowBlur = 0;

    // 3. Rotating 3D Isometric "Demicube" in background
    cubeAngleX += 0.006;
    cubeAngleY += 0.009;
    cubeAngleZ += 0.003;

    const cubeCenterX = width * 0.76;
    const cubeCenterY = height * 0.38;
    const cubeScale = Math.min(width, height) * 0.16;

    // Rotate & Project vertices
    const projected = [];
    const radX = cubeAngleX;
    const radY = cubeAngleY;
    const radZ = cubeAngleZ;

    for (let i = 0; i < cubeVertices.length; i++) {
      let [x, y, z] = cubeVertices[i];

      // Rotation around X
      let y1 = y * Math.cos(radX) - z * Math.sin(radX);
      let z1 = y * Math.sin(radX) + z * Math.cos(radX);

      // Rotation around Y
      let x2 = x * Math.cos(radY) + z1 * Math.sin(radY);
      let z2 = -x * Math.sin(radY) + z1 * Math.cos(radY);

      // Rotation around Z
      let x3 = x2 * Math.cos(radZ) - y1 * Math.sin(radZ);
      let y3 = x2 * Math.sin(radZ) + y1 * Math.cos(radZ);

      // Perspective projection
      const dist = 3.5;
      const projScale = fov / (fov + z2 * 80 + dist * 70);
      const px = cubeCenterX + x3 * cubeScale * projScale;
      const py = cubeCenterY + y3 * cubeScale * projScale;

      projected.push({ x: px, y: py, z: z2 });
    }

    // Draw Cube Edges with Neon Cyan Glow
    ctx.save();
    ctx.shadowColor = "#0df2c9";
    ctx.shadowBlur = 14;

    for (let i = 0; i < cubeEdges.length; i++) {
      const [startIndex, endIndex] = cubeEdges[i];
      const p1 = projected[startIndex];
      const p2 = projected[endIndex];
      const avgZ = (p1.z + p2.z) * 0.5;
      const depthAlpha = Math.max(0.2, (avgZ + 1.2) * 0.4);

      ctx.strokeStyle = `rgba(13, 242, 201, ${depthAlpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw Vertices
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    animationFrameId = requestAnimationFrame(render);
  }

  return {
    start() {
      if (isRunning) return;
      isRunning = true;
      resize();
      animationFrameId = requestAnimationFrame(render);
    },
    stop() {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },
    destroy() {
      this.stop();
      resizeObserver.disconnect();
    }
  };
}
