import type { Placement } from '../data/products';
import { drawGlasses } from './drawGlasses';
import { drawBracelet, drawEarring, drawNecklace, drawRing } from './drawJewellery';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FacePlacement = Extract<Placement, 'eyes' | 'neck' | 'ears'>;
export type HandPlacement = Extract<Placement, 'ring-finger' | 'wrist'>;

/**
 * Draws the product overlay for a face-tracked item (eyewear, necklace,
 * earrings) given the eye-line anchor point and face dimensions in canvas
 * pixel space (already mirrored to match the flipped video).
 */
export function drawFacePlacement(
  ctx: CanvasRenderingContext2D,
  placement: FacePlacement,
  eyeCx: number,
  eyeCy: number,
  faceW: number,
  faceH: number,
  sizeScale: number,
  color: string,
): void {
  switch (placement) {
    case 'eyes':
      drawGlasses(ctx, eyeCx, eyeCy, faceW * 1.15 * sizeScale, color);
      break;
    case 'neck':
      drawNecklace(ctx, eyeCx, eyeCy + faceH * 1.05, faceW * 0.95 * sizeScale, color);
      break;
    case 'ears': {
      const earCy = eyeCy + faceH * 0.18;
      const earOffset = faceW * 0.56;
      const earSize = faceW * 0.34 * sizeScale;
      drawEarring(ctx, eyeCx - earOffset, earCy, earSize, color);
      drawEarring(ctx, eyeCx + earOffset, earCy, earSize, color);
      break;
    }
  }
}

/**
 * Draws the product overlay for a hand-tracked item (ring, bracelet) given
 * an anchor point and a hand-size reference (palm length), both in canvas
 * pixel space.
 */
export function drawHandPlacement(
  ctx: CanvasRenderingContext2D,
  placement: HandPlacement,
  cx: number,
  cy: number,
  handSize: number,
  sizeScale: number,
  color: string,
): void {
  if (placement === 'ring-finger') {
    drawRing(ctx, cx, cy, handSize * 0.34 * sizeScale, color);
  } else {
    drawBracelet(ctx, cx, cy, handSize * 0.62 * sizeScale, color);
  }
}
