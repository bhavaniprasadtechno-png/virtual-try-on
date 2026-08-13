import type { PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`;

let landmarkerPromise: Promise<PoseLandmarker | null> | null = null;
let readyLandmarker: PoseLandmarker | null = null;

/**
 * Lazily loads @mediapipe/tasks-vision's PoseLandmarker — only started for
 * necklace placement (see useTryOn.ts), since eyewear/earrings/hand
 * products get everything they need from FaceLandmarker/HandLandmarker
 * alone. Its shoulder landmarks (11/12) give a real shoulder-width
 * measurement and a torso-tilt reference, instead of the face-mesh-only
 * ear-span proxy necklaces used before. The wasm runtime is shared with
 * useFaceLandmarker.ts/useHandModel.ts (same @mediapipe/tasks-vision
 * package); only the .task model file is additive. Self-hosted under
 * /public, matching the other two landmarker hooks.
 */
export function loadPoseLandmarker(): Promise<boolean> {
  if (!landmarkerPromise) {
    landmarkerPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, PoseLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        readyLandmarker = landmarker;
        return landmarker;
      })
      .catch(() => null);
  }
  return landmarkerPromise.then((landmarker) => !!landmarker);
}

/** Synchronous access to the loaded PoseLandmarker instance, or null if not ready yet. */
export function getReadyPoseLandmarker(): PoseLandmarker | null {
  return readyLandmarker;
}
