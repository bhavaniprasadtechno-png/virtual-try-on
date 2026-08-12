import type { Placement } from '../data/products';
import { drawGlasses } from './drawGlasses';
import { drawBracelet, drawEarring, drawNecklace, drawRing } from './drawJewellery';

export type FacePlacement = Extract<Placement, 'eyes' | 'neck' | 'ears'>;
export type HandPlacement = Extract<Placement, 'ring-finger' | 'wrist'>;

export interface Point {
  x: number;
  y: number;
}

/** A single anchor point + on-screen size (px) + roll (radians) for one product instance. */
export interface PlacementFrame {
  x: number;
  y: number;
  size: number;
  rotation: number;
}

/**
 * Anchor points read off a 478-point MediaPipe face mesh, in canvas pixel
 * space (already mirrored to match the flipped video). `eyeA`/`eyeB` and
 * `earA`/`earB` are used symmetrically — which physical eye/ear each one
 * is doesn't matter, only that they're a consistent left/right pair.
 */
export interface FaceAnchors {
  eyeA: Point;
  eyeB: Point;
  /** Iris centers — the optical center eyewear should actually align to. */
  irisA: Point;
  irisB: Point;
  /** Near-ear (cheek/tragus) points; earrings anchor on these directly. */
  earA: Point;
  earB: Point;
  chin: Point;
  forehead: Point;
}

/** Wrist + hand-scale anchors read off MediaPipe hand landmarks, in canvas pixel space. */
export interface HandAnchors {
  wrist: Point;
  /** Middle finger MCP joint — with the wrist, gives hand scale and orientation. */
  middleMcp: Point;
  /** The specific joint a ring sits on (ring finger MCP). */
  ringAnchor: Point;
}

function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Offsets a point along the current "down" direction for a given roll, so the offset tracks head tilt the same way the rotated art does. */
function offsetAlong(p: Point, dist: number, rotation: number): Point {
  return {
    x: p.x - Math.sin(rotation) * dist,
    y: p.y + Math.cos(rotation) * dist,
  };
}

/**
 * Computes rotation-aware placement frames straight from face mesh
 * anchors: eyewear centers on the iris midpoint and is sized from the
 * eye-corner span, earrings anchor on the two detected ear points directly
 * (so they track a head turn instead of a fixed symmetric offset), and
 * every placement rolls with head tilt using the eye-line angle.
 */
export function getFacePlacementFrames(
  placement: FacePlacement,
  anchors: FaceAnchors,
  sizeScale: number,
): PlacementFrame[] {
  const rotation = angleBetween(anchors.eyeA, anchors.eyeB);
  const eyeSpan = distance(anchors.eyeA, anchors.eyeB);
  const earSpan = distance(anchors.earA, anchors.earB);

  switch (placement) {
    case 'eyes': {
      const center = midpoint(anchors.irisA, anchors.irisB);
      return [{ x: center.x, y: center.y, size: eyeSpan * 1.7 * sizeScale, rotation }];
    }
    case 'neck': {
      const faceHeight = distance(anchors.forehead, anchors.chin);
      const center = offsetAlong(anchors.chin, faceHeight * 0.55, rotation);
      return [{ x: center.x, y: center.y, size: earSpan * 0.95 * sizeScale, rotation }];
    }
    case 'ears': {
      const size = eyeSpan * 0.42 * sizeScale;
      const drop = eyeSpan * 0.22;
      const a = offsetAlong(anchors.earA, drop, rotation);
      const b = offsetAlong(anchors.earB, drop, rotation);
      return [
        { x: a.x, y: a.y, size, rotation },
        { x: b.x, y: b.y, size, rotation },
      ];
    }
  }
}

/**
 * Same idea for the hand-tracked placements: a ring anchors on the actual
 * ring-finger joint and a bracelet on the wrist, both sized from
 * wrist-to-middle-knuckle distance and rolled to the hand's current
 * orientation instead of always drawing upright.
 */
export function getHandPlacementFrame(
  placement: HandPlacement,
  anchors: HandAnchors,
  sizeScale: number,
): PlacementFrame {
  const handSize = distance(anchors.wrist, anchors.middleMcp);
  // The art's default band orientation assumes the finger/arm points
  // straight up the screen; rotate by however far the actual hand
  // direction differs from that.
  const rotation = angleBetween(anchors.wrist, anchors.middleMcp) + Math.PI / 2;

  if (placement === 'ring-finger') {
    return { x: anchors.ringAnchor.x, y: anchors.ringAnchor.y, size: handSize * 0.34 * sizeScale, rotation };
  }
  return { x: anchors.wrist.x, y: anchors.wrist.y, size: handSize * 0.62 * sizeScale, rotation };
}

/** Draws the product overlay for a face-tracked item (eyewear, necklace, earrings). */
export function drawFacePlacement(
  ctx: CanvasRenderingContext2D,
  placement: FacePlacement,
  anchors: FaceAnchors,
  sizeScale: number,
  color: string,
): void {
  const frames = getFacePlacementFrames(placement, anchors, sizeScale);
  switch (placement) {
    case 'eyes':
      drawGlasses(ctx, frames[0].x, frames[0].y, frames[0].size, color, frames[0].rotation);
      break;
    case 'neck':
      drawNecklace(ctx, frames[0].x, frames[0].y, frames[0].size, color, frames[0].rotation);
      break;
    case 'ears':
      frames.forEach((f) => drawEarring(ctx, f.x, f.y, f.size, color, f.rotation));
      break;
  }
}

/** Draws the product overlay for a hand-tracked item (ring, bracelet). */
export function drawHandPlacement(
  ctx: CanvasRenderingContext2D,
  placement: HandPlacement,
  anchors: HandAnchors,
  sizeScale: number,
  color: string,
): void {
  const frame = getHandPlacementFrame(placement, anchors, sizeScale);
  if (placement === 'ring-finger') {
    drawRing(ctx, frame.x, frame.y, frame.size, color, frame.rotation);
  } else {
    drawBracelet(ctx, frame.x, frame.y, frame.size, color, frame.rotation);
  }
}
