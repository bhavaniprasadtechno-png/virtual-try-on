import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Product } from '../data/products';
import { drawFacePlacement, drawHandPlacement, type FacePlacement, type HandPlacement } from '../lib/overlay';
import { getReadyFaceApi, loadFaceModels } from './useFaceModels';
import { getReadyHandLandmarker, loadHandModel } from './useHandModel';

interface UseTryOnOptions {
  /** Whether Try-On mode is currently active; toggling this starts/stops the camera. */
  active: boolean;
  product: Product;
  colorHex: string;
  sizeScale: number;
}

interface UseTryOnResult {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  /** True once camera access failed/was denied and the fallback feed is showing. */
  demoMode: boolean;
  /** True once the tracking model has finished loading (or the demo fallback is live). */
  trackingReady: boolean;
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
 */
export function useTryOn({ active, product, colorHex, sizeScale }: UseTryOnOptions): UseTryOnResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const colorRef = useRef(colorHex);
  const sizeRef = useRef(sizeScale);
  const placementRef = useRef(product.placement);
  const faceAnchorRef = useRef<FaceAnchor | null>(null);
  const handAnchorRef = useRef<HandAnchor | null>(null);

  const [demoMode, setDemoMode] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);

  useEffect(() => {
    colorRef.current = colorHex;
  }, [colorHex]);

  useEffect(() => {
    sizeRef.current = sizeScale;
  }, [sizeScale]);

  useEffect(() => {
    placementRef.current = product.placement;
  }, [product.placement]);

  const trackingTarget = product.trackingTarget;

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

    const runFaceRenderLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (video.videoWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const anchor = faceAnchorRef.current;
          const eyeCx = anchor?.cx ?? canvas.width / 2;
          const eyeCy = anchor?.cy ?? canvas.height * 0.42;
          const faceW = anchor?.faceW ?? canvas.width * 0.32;
          const faceH = anchor?.faceH ?? faceW * 0.9;
          drawFacePlacement(ctx, placementRef.current as FacePlacement, eyeCx, eyeCy, faceW, faceH, sizeRef.current, colorRef.current);
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
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const anchor = handAnchorRef.current;
          const cx = anchor?.cx ?? canvas.width / 2;
          const cy = anchor?.cy ?? canvas.height * 0.55;
          const handSize = anchor?.handSize ?? canvas.width * 0.3;
          drawHandPlacement(ctx, placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current, colorRef.current);
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
      const ctx = canvas?.getContext('2d');
      if (!canvas || !parent || !ctx) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;
      const eyeCx = canvas.width / 2 + Math.sin(t * 0.6) * 6;
      const eyeCy = canvas.height * 0.2 + Math.cos(t * 0.5) * 4;
      const faceW = canvas.width * 0.19;
      const faceH = faceW * 0.9;
      drawFacePlacement(ctx, placementRef.current as FacePlacement, eyeCx, eyeCy, faceW, faceH, sizeRef.current, colorRef.current);

      rafRef.current = requestAnimationFrame(runFaceDemoLoop);
    };

    const runHandDemoLoop = () => {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !parent || !ctx) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const t = performance.now() / 1000;
      const cx = canvas.width / 2 + Math.sin(t * 0.5) * 8;
      const cy = canvas.height * 0.58 + Math.cos(t * 0.4) * 6;
      const handSize = canvas.width * 0.3;
      drawHandPlacement(ctx, placementRef.current as HandPlacement, cx, cy, handSize, sizeRef.current, colorRef.current);

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

  return { videoRef, canvasRef, demoMode, trackingReady };
}
