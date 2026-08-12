import type { HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_URL = `${import.meta.env.BASE_URL}models/hand_landmarker.task`;

let landmarkerPromise: Promise<HandLandmarker | null> | null = null;
let readyLandmarker: HandLandmarker | null = null;

/**
 * Lazily loads @mediapipe/tasks-vision and the HandLandmarker model the
 * first time a hand-tracked product (ring/bracelet) enters Try-On mode.
 * The wasm runtime and the .task model are both self-hosted under
 * /public (not fetched from a public CDN at runtime).
 */
export function loadHandModel(): Promise<boolean> {
  if (!landmarkerPromise) {
    landmarkerPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, HandLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        readyLandmarker = landmarker;
        return landmarker;
      })
      .catch(() => null);
  }
  return landmarkerPromise.then((landmarker) => !!landmarker);
}

/** Synchronous access to the loaded HandLandmarker instance, or null if not ready yet. */
export function getReadyHandLandmarker(): HandLandmarker | null {
  return readyLandmarker;
}
