export function renderCanvas(canvas, state) {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = state.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawPaperGrain(context, canvas);

  for (const element of state.elements) {
    context.save();
    context.translate(element.x, element.y);
    context.rotate(((element.rotation || 0) * Math.PI) / 180);
    context.scale(element.scale || 1, element.scale || 1);
    context.fillStyle = element.color;
    context.strokeStyle = element.color;
    context.lineWidth = 8;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowColor = "rgba(15, 23, 42, 0.16)";
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;
    drawElement(context, element);
    context.restore();
  }
}

function drawElement(context, element) {
  const width = element.width;
  const height = element.height;

  if (element.shape === "circle") {
    context.beginPath();
    context.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
    context.fill();
  }

  if (element.shape === "rectangle") {
    roundedRect(context, -width / 2, -height / 2, width, height, 16);
    context.fill();
  }

  if (element.shape === "triangle") {
    context.beginPath();
    context.moveTo(0, -height / 2);
    context.lineTo(width / 2, height / 2);
    context.lineTo(-width / 2, height / 2);
    context.closePath();
    context.fill();
  }

  if (element.shape === "line") {
    context.beginPath();
    context.moveTo(-width / 2, 0);
    context.lineTo(width / 2, 0);
    context.stroke();
  }

  if (element.shape === "wave") {
    drawWave(context, width, height);
  }

  if (element.shape === "star") {
    drawStar(context, 0, 0, Math.min(width, height) / 2, Math.min(width, height) / 4);
    context.fill();
  }

  if (element.shape === "sun") {
    drawSun(context, width, height, element.color);
  }

  if (element.shape === "mountain") {
    drawMountain(context, width, height, element.color);
  }

  if (element.shape === "tree") {
    drawTree(context, width, height, element.color);
  }

  if (element.shape === "text") {
    drawText(context, element);
  }
}

function drawPaperGrain(context, canvas) {
  context.save();
  context.strokeStyle = "rgba(15, 23, 42, 0.045)";
  context.lineWidth = 1;
  for (let x = 80; x < canvas.width; x += 80) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 80; y < canvas.height; y += 80) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();
}

function drawSun(context, width, height, color) {
  const radius = Math.min(width, height) * 0.28;
  context.save();
  context.shadowBlur = 0;
  context.strokeStyle = color;
  context.lineWidth = 10;
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    context.beginPath();
    context.moveTo(Math.cos(angle) * radius * 1.35, Math.sin(angle) * radius * 1.35);
    context.lineTo(Math.cos(angle) * radius * 2.05, Math.sin(angle) * radius * 2.05);
    context.stroke();
  }
  context.restore();

  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
}

function drawMountain(context, width, height, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-width / 2, height / 2);
  context.lineTo(-width * 0.12, -height / 2);
  context.lineTo(width * 0.16, height * 0.06);
  context.lineTo(width * 0.36, -height * 0.26);
  context.lineTo(width / 2, height / 2);
  context.closePath();
  context.fill();

  context.save();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(248, 250, 252, 0.9)";
  context.beginPath();
  context.moveTo(-width * 0.12, -height / 2);
  context.lineTo(-width * 0.23, -height * 0.22);
  context.lineTo(-width * 0.04, -height * 0.3);
  context.lineTo(width * 0.06, -height * 0.12);
  context.closePath();
  context.fill();
  context.restore();
}

function drawTree(context, width, height, color) {
  context.save();
  context.shadowBlur = 0;
  context.fillStyle = "#7c4a24";
  roundedRect(context, -width * 0.12, -height * 0.02, width * 0.24, height * 0.48, 12);
  context.fill();
  context.restore();

  context.fillStyle = color;
  context.beginPath();
  context.arc(0, -height * 0.22, width * 0.32, 0, Math.PI * 2);
  context.arc(-width * 0.22, -height * 0.05, width * 0.25, 0, Math.PI * 2);
  context.arc(width * 0.22, -height * 0.04, width * 0.25, 0, Math.PI * 2);
  context.fill();
}

function drawText(context, element) {
  context.save();
  context.shadowBlur = 0;
  context.fillStyle = element.color;
  context.font = "700 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(element.text || "文字", 0, 0, element.width * 1.8);
  context.restore();
}

function drawWave(context, width, height) {
  context.save();
  context.shadowBlur = 0;
  context.beginPath();
  const amplitude = height * 0.26;
  const startX = -width / 2;
  const endX = width / 2;
  const steps = 48;
  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const x = startX + progress * width;
    const y = Math.sin(progress * Math.PI * 4) * amplitude;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();
  context.restore();
}

function drawStar(context, centerX, centerY, outerRadius, innerRadius) {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI / 5 * index - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}
