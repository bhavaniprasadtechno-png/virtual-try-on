/** Necklace: a shallow chain curve across the collarbone line with a pendant hanging at center. */
export function drawNecklace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  color: string,
): void {
  const drop = w * 0.22;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, w * 0.02);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-w / 2, -drop * 0.3);
  ctx.quadraticCurveTo(0, drop, w / 2, -drop * 0.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, drop * 0.92, w * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, drop * 0.92, w * 0.09, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/** A single earring: stud + short drop + teardrop gem. Call once per ear. */
export function drawEarring(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.06);

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, size * 0.12);
  ctx.lineTo(0, size * 0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, size * 0.75, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Ring: a stroked band around the finger joint with a small gem highlight. */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.16);

  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.5, size * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -size * 0.34, size * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Bracelet: a wider, flatter band around the wrist with a clasp accent. */
export function drawBracelet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.14);

  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.55, size * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(size * 0.5, 0, size * 0.07, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
