import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Placement, TrackingTarget } from '../data/products';
import {
  drawFacePlacement,
  drawHandPlacement,
  getFacePlacementFrames,
  getHandPlacementFrame,
  type FacePlacement,
  type HandPlacement,
} from '../lib/overlay';
import { loadModelViewer, type ModelViewerHandle } from '../lib/modelViewer';
import { getReadyFaceApi, loadFaceModels } from './useFaceModels';
import { getReadyHandLandmarker, loadHandModel } from './useHandModel';

interface CustomModelOverlay {
  url: string;
  tintHex: string | null;
  /** User-set correction (radians) for the model's unknown authored orientation. */
  rotationOffsetY: number;
}

interface UseTryOnOptions {
  /** Whether Try-On mode is currently active; toggling this starts/stops the camera. */
  active: boolean;
  trackingTarget: TrackingTarget;
  placement: Placement;
  colorHex: string;
  sizeScale: number;
  /** When set, a user-uploaded 3D model is tracked instead of the 2D line-art overlay. */
  customModel?: CustomModelOverlay | null;
}

interface UseTryOnResult {
  videoRef: RefObject<HTMLVideoElement>;
  /** 2D line-art overlay canvas; used when no custom model is active. */
  canvasRef: RefObject<HTMLCanvasElement>;
  /** WebGL overlay canvas for a tracked custom 3D model; layered on top of canvasRef. */
  modelCanvasRef: RefObject<HTMLCanvasElement>;
  /** True once camera access failed/was denied and the fallback feed is showing. */
  demoMode: boolean;
  /** True once the tracking model has finished loading (or the demo fallback is live). */
  trackingReady: boolean;
  /** Set if a custom model was requested but failed to load. */
  modelError: boolean;
}

interface FaceAnchor {
  cx: number;
  cy: number;
  faceW: number;
  faceH: number;
}

interface HandAnchor {
  cx: number;
  cy: number;
  handSize: number;
}

/**
 * Owns the Try-On camera lifecycle for both face-tracked products (eyewear,
 * necklaces, earrings) and hand-tracked products (rings, bracelets),
 * falling back to a demo feed on denial/failure.
 *
 * Rendering and detection are decoupled: the canvas redraws every animation
 * frame using the last known anchor position, while face/hand detection
 * runs as a separate, self-throttling async loop that updates that anchor
 * whenever it finishes. On-device inference time varies a lot by hardware
 * (tens of ms on a fast GPU, several hundred on a slow/software-rendered
 * one) — coupling redraw to detection would make the overlay flicker
 * blank on slower devices instead of just updating position less often.
 *
 * When `customModel` is set, the same per-frame anchor drives a WebGL
 * overlay (see lib/modelViewer.ts) instead of the 2D line-art routines, so
 * an uploaded glTF/GLB model tracks the face/hand exactly like a catalog
 * product would.
 */
export function useTryOn({
  active,
  trackingTarget,
  placement,
  colorHex,
  sizeScale,
  customModel,
}: UseTryOnOptions): UseTryOnResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const colorRef = useRef(colorHex);
  const sizeRef = useRef(sizeScale);
  const placementRef = useRef(placement);
  const faceAnchorRef = useRef<FaceAnchor | null>(null);
  const handAnchorRef = useRef<HandAnchor | null>(null);
  const modelViewerRef = useRef<ModelViewerHandle | null>(null);
  const modelViewerSizeRef = useRef({ width: 0, height: 0 });

  const [demoMode, setDemoMode] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);
  const [modelError, setModelError] = useState(false);

  useEffect(() => {
    colorRef.current = colorHex;
  }, [colorHex]);

  useEffect(() => {
    sizeRef.current = sizeScale;
  }, [sizeScale]);

  useEffect(() => {
    placementRef.current = placement;
  }, [placement]);

  const customModelUrl = customModel?.url ?? null;
  const customModelTintRef = useRef(customModel?.tintHex ?? null);
  const customModelRotationRef = useRef(customModel?.rotationOffsetY ?? 0);

  useEffect(() => {
    customModelTintRef.current = customModel?.tintHex ?? null;
    modelViewerRef.current?.setTint(customModelTintRef.current);
  }, [customModel?.tintHex]);

  useEffect(() => {
    customModelRotationRef.current = customModel?.rotationOffsetY ?? 0;
  }, [customModel?.rotationOffsetY]);

  // Load/dispose the WebGL overlay for the uploaded model as its URL changes.
  // Reads the tint from a ref (rather than depending on it directly) so a
  // tint change alone doesn't tear down and reload the whole GLTF.
  useEffect(() => {
    modelViewerRef.current?.dispose();
    modelViewerRef.current = null;
    modelViewerSizeRef.current = { width: 0, height: 0 };
    setModelError(false);

    if (!customModelUrl) return;
    const canvas = modelCanvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    loadModelViewer(canvas, customModelUrl)
      .then((handle) => {
        if (cancelled) {
          handle.dispose();
          return;
        }
        handle.setTint(customModelTintRef.current);
        modelViewerRef.current = handle;
      })
      .catch(() => {
        if (!cancelled) setModelError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [customModelUrl]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let detecting = false;
    faceAnchorRef.current = null;
    handAnchorRef.current = null;
    setDemoMode(false);
    setTrackingReady(false);

    const detectFaceOnce = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const faceapi = getReadyFaceApi();
      if (!video || !canvas || !faceapi || !video.videoWidth) return;
      try {
        const detection = await faceapi.detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }),
        );
        if (cancelled || !detection) return;
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;
        const { box } = detection;
        // video is mirrored (scaleX(-1)), so flip the detected box to match
        const mirroredX = video.videoWidth - (box.x + box.width);
        faceAnchorRef.current = {
          cx: (mirroredX + box.width / 2) * scaleX,
          cy: (box.y + box.height * 0.42) * scaleY,
          faceW: box.width * scaleX,
          faceH: box.height * scaleY,
        };
      } catch {
        // transient detection failure; keep the last known anchor
      }
    };

    const detectHandOnce = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = getReadyHandLandmarker();
      if (!video || !canvas || !landmarker || !video.videoWidth) return;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        if (cancelled || result.landmarks.length === 0) return;
        const landmarks = result.landmarks[0];
        const wrist = landmarks[0];
        const middleMcp = landmarks[9];
        // ring finger MCP for the ring anchor, wrist for the bracelet anchor
        const anchor = placementRef.current === 'wrist' ? wrist : landmarks[13];
        // video is mirrored (scaleX(-1)); landmarks are normalized (0-1) on the raw frame
        const dx = (middleMcp.x - wrist.x) * canvas.width;
        const dy = (middleMcp.y - wrist.y) * canvas.height;
        handAnchorRef.current = {
          cx: (1 - anchor.x) * canvas.width,
          cy: anchor.y * canvas.height,
          handSize: Math.hypot(dx, dy),
        };
      } catch {
        // transient detection failure; keep the last known anchor
      }
    };

    const renderModelOverlay = (canvas: HTMLCanvasElement, frames: { x: number; y: number; size: number }[]) => {
      const handle = modelViewerRef.current;
      if (!handle) return;
      if (modelViewerSizeRef.current.width !== canvas.width || modelViewerSizeRef.current.height !== canvas.height) {
        handle.resize(canvas.width, canvas.height);
        modelViewerSizeRef.current = { width: canvas.width, height: canvas.height };
      }
      handle.setInstances(frames.map((f) => ({ ...f, rotationY: customModelRotationRef.current })));
      handle.render();
    };

    const runFaceRenderLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (video.videoWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const anchor = faceAnchorRef.current;
        const eyeCx = anchor?.cx ?? canvas.width / 2;
        const eyeCy = anchor?.cy ?? canvas.height * 0.42;
        const faceW = anchor?.faceW ?? canvas.width * 0.32;
        const faceH = anchor?.faceH ?? faceW * 0.9;

        if (modelViewerRef.current && modelCanvasRef.current) {
          const modelCanvas = modelCanvasRef.current;
          modelCanvas.width = canvas.width;
          modelCanvas.height = canvas.height;
          const frames = getFacePlacementFrames(
            placementRef.current as FacePlacement,
            eyeCx,
            eyeCy,
            faceW,
            faceH,
            sizeRef.current,
          );
          renderModelOverlay(modelCanvas, frames);
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawFacePlacement(
              ctx,
              placementRef.current as FacePlacement,
              eyeCx,
              eyeCy,
              faceW,
              faceH,
              sizeRef.current,
              colorRef.current,
            );
          }
        }

        if (!detecting) {
          detecting = true;
          detectFaceOnce().finally(() => {
            detecting = false;
          });
        }
      }

      rafRef.current = requestAnimationFrame(runFaceRenderLoop);
    };

    const runHandRenderLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (video.videoWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const anchor = handAnchorRef.current;
        const cx = anchor?.cx ?? canvas.width / 2;
        const cy = anchor?.cy ?? canvas.height * 0.55;
        const handSize = anchor?.handSize ?? canvas.width * 0.3;

        if (modelViewerRef.current && modelCanvasRef.current) {
          const modelCanvas = modelCanvasRef.current;
          modelCanvas.width = canvas.width;
          modelCanvas.height = canvas.height;
          const frame = getHandPlacementFrame(placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current);
          renderModelOverlay(modelCanvas, [frame]);
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawHandPlacement(ctx, placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current, colorRef.current);
          }
        }

        if (!detecting) {
          detecting = true;
          detectHandOnce().finally(() => {
            detecting = false;
          });
        }
      }

      rafRef.current = requestAnimationFrame(runHandRenderLoop);
    };

    const runFaceDemoLoop = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      const t = performance.now() / 1000;
      const eyeCx = canvas.width / 2 + Math.sin(t * 0.6) * 6;
      const eyeCy = canvas.height * 0.2 + Math.cos(t * 0.5) * 4;
      const faceW = canvas.width * 0.19;
      const faceH = faceW * 0.9;

      if (modelViewerRef.current && modelCanvasRef.current) {
        const modelCanvas = modelCanvasRef.current;
        modelCanvas.width = canvas.width;
        modelCanvas.height = canvas.height;
        const frames = getFacePlacementFrames(
          placementRef.current as FacePlacement,
          eyeCx,
          eyeCy,
          faceW,
          faceH,
          sizeRef.current,
        );
        renderModelOverlay(modelCanvas, frames);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawFacePlacement(
            ctx,
            placementRef.current as FacePlacement,
            eyeCx,
            eyeCy,
            faceW,
            faceH,
            sizeRef.current,
            colorRef.current,
          );
        }
      }

      rafRef.current = requestAnimationFrame(runFaceDemoLoop);
    };

    const runHandDemoLoop = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      const t = performance.now() / 1000;
      const cx = canvas.width / 2 + Math.sin(t * 0.5) * 8;
      const cy = canvas.height * 0.58 + Math.cos(t * 0.4) * 6;
      const handSize = canvas.width * 0.3;

      if (modelViewerRef.current && modelCanvasRef.current) {
        const modelCanvas = modelCanvasRef.current;
        modelCanvas.width = canvas.width;
        modelCanvas.height = canvas.height;
        const frame = getHandPlacementFrame(placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current);
        renderModelOverlay(modelCanvas, [frame]);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawHandPlacement(ctx, placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current, colorRef.current);
        }
      }

      rafRef.current = requestAnimationFrame(runHandDemoLoop);
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API unavailable');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        if (trackingTarget === 'face') {
          loadFaceModels().then((ok) => {
            if (!cancelled) setTrackingReady(ok);
          });
          runFaceRenderLoop();
        } else {
          loadHandModel().then((ok) => {
            if (!cancelled) setTrackingReady(ok);
          });
          runHandRenderLoop();
        }
      } catch {
        // permission denied, no device, or blocked context — fall back to a
        // demo feed so the flow always advances to a next screen
        if (cancelled) return;
        setDemoMode(true);
        setTrackingReady(true);
        if (trackingTarget === 'face') runFaceDemoLoop();
        else runHandDemoLoop();
      }
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [active, trackingTarget]);

  useEffect(
    () => () => {
      modelViewerRef.current?.dispose();
      modelViewerRef.current = null;
    },
    [],
  );

  return { videoRef, canvasRef, modelCanvasRef, demoMode, trackingReady, modelError };
}
