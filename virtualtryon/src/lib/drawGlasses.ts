/**
 * Draws two rounded-rectangle lenses + bridge + temple lines centered at
 * (cx, cy) with total width w, in the given color. Shared by the live
 * face-tracking loop and the demo-mode fallback loop so both render
 * identically.
 */
export function drawGlasses(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  color: string,
): void {
  const h = w * 0.4;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, w * 0.045);
  ctx.lineJoin = 'round';

  const lensW = w * 0.42;
  const lensH = h * 0.9;
  const gap = w * 0.08;

  for (const dir of [-1, 1]) {
    const lx = dir * (lensW / 2 + gap / 2);
    ctx.beginPath();
    ctx.roundRect(lx - lensW / 2, -lensH / 2, lensW, lensH, lensH * 0.28);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-gap / 2, 0);
  ctx.lineTo(gap / 2, 0);
  ctx.stroke();

  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * (lensW + gap / 2), 0);
    ctx.lineTo(dir * (lensW + gap / 2 + w * 0.12), -h * 0.08);
    ctx.stroke();
  }

  ctx.restore();
}
