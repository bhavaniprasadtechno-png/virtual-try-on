import type { FaceLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/face_landmarker.task`;

let landmarkerPromise: Promise<FaceLandmarker | null> | null = null;
let readyLandmarker: FaceLandmarker | null = null;

/**
 * Lazily loads @mediapipe/tasks-vision and the FaceLandmarker model the
 * first time a face-tracked product (eyewear/necklace/earrings) enters
 * Try-On mode. Its 478-point face mesh (including iris landmarks) drives
 * exact eye/ear/chin anchors and head-tilt (roll) compensation, rather than
 * the coarse face bounding box a plain face detector would give. The wasm
 * runtime and the .task model are both self-hosted under /public (not
 * fetched from a public CDN at runtime), matching useHandModel.ts.
 */
export function loadFaceLandmarker(): Promise<boolean> {
  if (!landmarkerPromise) {
    landmarkerPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, FaceLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        readyLandmarker = landmarker;
        return landmarker;
      })
      .catch(() => null);
  }
  return landmarkerPromise.then((landmarker) => !!landmarker);
}

/** Synchronous access to the loaded FaceLandmarker instance, or null if not ready yet. */
export function getReadyFaceLandmarker(): FaceLandmarker | null {
  return readyLandmarker;
}
