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

/** A single anchor point + on-screen size (px) for one product instance. */
export interface PlacementFrame {
  x: number;
  y: number;
  size: number;
}

/**
 * Geometry shared by the 2D line-art overlay and the 3D model overlay:
 * where each placement anchors relative to the tracked face box, and how
 * big it renders. Earrings return two frames (one per ear); everything
 * else returns one.
 */
export function getFacePlacementFrames(
  placement: FacePlacement,
  eyeCx: number,
  eyeCy: number,
  faceW: number,
  faceH: number,
  sizeScale: number,
): PlacementFrame[] {
  switch (placement) {
    case 'eyes':
      return [{ x: eyeCx, y: eyeCy, size: faceW * 1.15 * sizeScale }];
    case 'neck':
      return [{ x: eyeCx, y: eyeCy + faceH * 1.05, size: faceW * 0.95 * sizeScale }];
    case 'ears': {
      const earCy = eyeCy + faceH * 0.18;
      const earOffset = faceW * 0.56;
      const earSize = faceW * 0.34 * sizeScale;
      return [
        { x: eyeCx - earOffset, y: earCy, size: earSize },
        { x: eyeCx + earOffset, y: earCy, size: earSize },
      ];
    }
  }
}

/** Same as {@link getFacePlacementFrames}, for the hand-tracked placements. */
export function getHandPlacementFrame(
  placement: HandPlacement,
  cx: number,
  cy: number,
  handSize: number,
  sizeScale: number,
): PlacementFrame {
  return placement === 'ring-finger'
    ? { x: cx, y: cy, size: handSize * 0.34 * sizeScale }
    : { x: cx, y: cy, size: handSize * 0.62 * sizeScale };
}

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
  const frames = getFacePlacementFrames(placement, eyeCx, eyeCy, faceW, faceH, sizeScale);
  switch (placement) {
    case 'eyes':
      drawGlasses(ctx, frames[0].x, frames[0].y, frames[0].size, color);
      break;
    case 'neck':
      drawNecklace(ctx, frames[0].x, frames[0].y, frames[0].size, color);
      break;
    case 'ears':
      frames.forEach((f) => drawEarring(ctx, f.x, f.y, f.size, color));
      break;
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
  const frame = getHandPlacementFrame(placement, cx, cy, handSize, sizeScale);
  if (placement === 'ring-finger') {
    drawRing(ctx, frame.x, frame.y, frame.size, color);
  } else {
    drawBracelet(ctx, frame.x, frame.y, frame.size, color);
  }
}
