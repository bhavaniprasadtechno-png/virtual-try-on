export type CustomTrackingTarget = 'face' | 'hand';
export type CustomFacePlacement = 'eyes' | 'neck' | 'ears';
export type CustomHandPlacement = 'ring-finger' | 'wrist';
export type CustomPlacement = CustomFacePlacement | CustomHandPlacement;

/** A user-uploaded glTF/GLB model shown in Preview and tracked in Try-On, in place of a catalog product. */
export interface CustomModel {
  id: string;
  name: string;
  /** Object URL for the uploaded file; revoked when replaced or removed. */
  url: string;
  trackingTarget: CustomTrackingTarget;
  placement: CustomPlacement;
  /** Index into MODEL_TINTS. */
  tintIndex: number;
  /**
   * Manual correction (radians) for the model's authored "front" axis, since
   * that can't be reliably auto-detected from geometry alone — an upload
   * that faces sideways or backwards needs the user to straighten it once.
   * Applied in both Preview and Try-On.
   */
  rotationOffsetY: number;
  /** Same idea for pitch — corrects an upload that renders upside-down. */
  rotationOffsetX: number;
}

export interface ModelTint {
  name: string;
  /** Hex tint applied to every material on the model; null keeps the model's original colors/textures. */
  hex: string | null;
  swatch: string;
}

export const MODEL_TINTS: ModelTint[] = [
  { name: 'Original', hex: null, swatch: 'conic-gradient(from 90deg,#c9cbd9,#e4e6f0,#9d9fae,#c9cbd9)' },
  { name: 'Gold', hex: '#c9a227', swatch: 'linear-gradient(135deg,#f2d478,#8a6a12)' },
  { name: 'Rose Gold', hex: '#b76e79', swatch: 'linear-gradient(135deg,#e8a5ad,#7a3a41)' },
  { name: 'Silver', hex: '#b8bdc4', swatch: 'linear-gradient(135deg,#eef1f4,#7c828b)' },
  { name: 'Onyx', hex: '#2b2b2f', swatch: 'linear-gradient(135deg,#55555c,#0c0c0e)' },
  { name: 'Navy Blue', hex: '#17335c', swatch: 'linear-gradient(135deg,#2a4f8f,#0a1730)' },
  { name: 'Magenta', hex: '#a92d7a', swatch: 'linear-gradient(135deg,#e05bb0,#3a0f28)' },
];

export const FACE_PLACEMENTS: { id: CustomFacePlacement; label: string }[] = [
  { id: 'eyes', label: 'Eyes (glasses)' },
  { id: 'neck', label: 'Neck (necklace)' },
  { id: 'ears', label: 'Ears (earrings)' },
];

export const HAND_PLACEMENTS: { id: CustomHandPlacement; label: string }[] = [
  { id: 'ring-finger', label: 'Ring finger' },
  { id: 'wrist', label: 'Wrist' },
];

export const DEFAULT_PLACEMENT_FOR_TARGET: Record<CustomTrackingTarget, CustomPlacement> = {
  face: 'eyes',
  hand: 'ring-finger',
};

export const ACCEPTED_MODEL_EXTENSIONS = ['.glb', '.gltf'];
export const MAX_MODEL_FILE_BYTES = 30 * 1024 * 1024;
