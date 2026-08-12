type FaceApiModule = typeof import('face-api.js');

/**
 * TinyFaceDetector weights are self-hosted under /public/models (not fetched
 * from a public CDN at runtime).
 */
const MODEL_URL = `${import.meta.env.BASE_URL}models`;

let modulePromise: Promise<FaceApiModule> | null = null;
let loadedModule: FaceApiModule | null = null;
let modelsLoadedPromise: Promise<boolean> | null = null;

function getFaceApiModule(): Promise<FaceApiModule> {
  if (!modulePromise) {
    // face-api.js pulls in a full TensorFlow.js build (~700KB) — split it
    // into its own chunk so the initial page load stays light and it's
    // only fetched the first time Try-On mode actually starts.
    modulePromise = import('face-api.js').then((mod) => {
      loadedModule = mod;
      return mod;
    });
  }
  return modulePromise;
}

/**
 * Loads the face-api.js bundle and its weights the first time Try-On mode
 * is entered; repeated sessions reuse the cached result.
 */
export function loadFaceModels(): Promise<boolean> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = getFaceApiModule()
      .then((faceapi) => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL))
      .then(() => true)
      .catch(() => false);
  }
  return modelsLoadedPromise;
}

/** Synchronous access to the face-api.js module once loaded and ready to detect, else null. */
export function getReadyFaceApi(): FaceApiModule | null {
  return loadedModule?.nets.tinyFaceDetector.params ? loadedModule : null;
}
