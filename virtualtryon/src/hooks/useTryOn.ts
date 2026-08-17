import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Placement, TrackingTarget } from '../data/products';
import {
  drawFacePlacement,
  drawHandPlacement,
  getFacePlacementFrames,
  getHandPlacementFrame,
  type BodyAnchors,
  type FaceAnchors,
  type FacePlacement,
  type HandAnchors,
  type HandPlacement,
  type Point,
} from '../lib/overlay';
import { loadModelViewer, type ModelViewerHandle } from '../lib/modelViewer';
import { getReadyFaceLandmarker, loadFaceLandmarker } from './useFaceLandmarker';
import { getReadyHandLandmarker, loadHandModel } from './useHandModel';
import { getReadyPoseLandmarker, loadPoseLandmarker } from './usePoseLandmarker';
import { OneEuroFilter, Point2DFilter } from '../lib/oneEuroFilter';
import { matrixToEuler } from '../lib/headPose';
import { Spring1D } from '../lib/spring';

interface CustomModelOverlay {
  url: string;
  tintHex: string | null;
  /** User-set correction (radians) for the model's unknown authored orientation. */
  rotationOffsetY: number;
  /** Same idea for pitch — corrects an upload that renders upside-down. */
  rotationOffsetX: number;
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
  /** True once real tracking has gone CONFIDENCE_TIMEOUT_MS without a successful detection — never true in demo mode. */
  lowConfidence: boolean;
}

/** How long without a successful detection before surfacing a low-confidence hint instead of silently holding the last position forever. */
const CONFIDENCE_TIMEOUT_MS = 1200;

/** Yaw magnitude (radians) beyond which the far-side earring is dropped instead of rendering through the head — ~35°. Only applied to the 3D model overlay (see runFaceRenderLoop). */
const FAR_EAR_YAW_CUTOFF = 0.61;

/**
 * MediaPipe FaceLandmarker's canonical 478-point face mesh indices for the
 * handful of points placement needs. Verified against the model's actual
 * output (see the landmark map in MediaPipe's face mesh documentation) —
 * stable across faces since they're topological mesh indices, not detected
 * per-frame.
 */
// eyeOuterA/B (and irisA/B, earA/B below) are deliberately assigned so that,
// after toCanvasPoint's mirroring, "A" lands on the visual left and "B" on
// the visual right — matching defaultFaceAnchors' synthetic layout below.
// MediaPipe's raw (unmirrored) landmark 33 is the subject's right eye
// (visual left of a normal photo) and 263 is the subject's left eye
// (visual right); mirroring flips that, so 263 must feed "A" and 33 must
// feed "B" for the two conventions to agree. Getting this backwards doesn't
// break anchor position (symmetric midpoint/distance math), only the
// roll — `angleBetween(A, B)` comes out exactly pi radians off, invisible
// in this project's demo-mode-only testing (no real camera in this
// sandbox) but very visible on real-camera roll for eyewear/necklace/
// earrings. Verified against real MediaPipe output on a static photo.
const FACE_LM = {
  eyeOuterA: 263,
  eyeOuterB: 33,
  irisA: 473,
  irisB: 468,
  earA: 454,
  earB: 234,
  chin: 152,
  forehead: 10,
  /** Bridge of the nose, between the eyebrows — verified against real detector output on a static test photo (x centered between the eyes, y just above the eye-corner line). */
  nasion: 168,
} as const;

/** Converts a normalized (0-1) landmark to mirrored canvas pixel space, matching the mirrored video. */
function toCanvasPoint(landmark: { x: number; y: number }, canvas: HTMLCanvasElement) {
  return { x: (1 - landmark.x) * canvas.width, y: landmark.y * canvas.height };
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
 * Face tracking uses MediaPipe FaceLandmarker's 478-point mesh (eye
 * corners, iris centers, near-ear points, chin/forehead) rather than a
 * plain bounding box, so eyewear/necklaces/earrings anchor on the actual
 * feature instead of a heuristic offset, and roll with head tilt using the
 * eye-line angle for a realistic fit.
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
  const faceAnchorsRef = useRef<FaceAnchors | null>(null);
  const handAnchorsRef = useRef<HandAnchors | null>(null);
  const bodyAnchorsRef = useRef<{ shoulderA: Point; shoulderB: Point } | null>(null);
  const modelViewerRef = useRef<ModelViewerHandle | null>(null);
  const modelViewerSizeRef = useRef({ width: 0, height: 0 });

  const [demoMode, setDemoMode] = useState(false);
  const [trackingReady, setTrackingReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);

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
  const customModelRotationXRef = useRef(customModel?.rotationOffsetX ?? 0);

  useEffect(() => {
    customModelTintRef.current = customModel?.tintHex ?? null;
    modelViewerRef.current?.setTint(customModelTintRef.current);
  }, [customModel?.tintHex]);

  useEffect(() => {
    customModelRotationRef.current = customModel?.rotationOffsetY ?? 0;
  }, [customModel?.rotationOffsetY]);

  useEffect(() => {
    customModelRotationXRef.current = customModel?.rotationOffsetX ?? 0;
  }, [customModel?.rotationOffsetX]);

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
    faceAnchorsRef.current = null;
    handAnchorsRef.current = null;
    bodyAnchorsRef.current = null;
    setDemoMode(false);
    setTrackingReady(false);
    setLowConfidence(false);

    // One filter per tracked landmark, so jitter is smoothed per-point
    // rather than after the fact on the derived placement — recreated each
    // time real tracking (re)starts, matching faceAnchorsRef/handAnchorsRef
    // being reset just above.
    const faceFilters = {
      eyeA: new Point2DFilter(),
      eyeB: new Point2DFilter(),
      irisA: new Point2DFilter(),
      irisB: new Point2DFilter(),
      earA: new Point2DFilter(),
      earB: new Point2DFilter(),
      chin: new Point2DFilter(),
      forehead: new Point2DFilter(),
      nasion: new Point2DFilter(),
    };
    const handFilters = {
      wrist: new Point2DFilter(),
      middleMcp: new Point2DFilter(),
      ringAnchor: new Point2DFilter(),
    };
    const bodyFilters = {
      shoulderA: new Point2DFilter(),
      shoulderB: new Point2DFilter(),
    };
    const headPosePitchFilter = new OneEuroFilter();
    const headPoseYawFilter = new OneEuroFilter();
    // Spring-smoothed torso tilt for the necklace's "drape" — settles
    // toward the real shoulder-line angle instead of snapping to it, a
    // lite approximation of "the pendant catches up as the body moves"
    // (see lib/spring.ts; not a full physics simulation).
    const necklaceDrapeSpring = new Spring1D(0);
    let lastNecklaceSpringMs = performance.now();
    // Smoothed head pose driving the 3D model overlay's extra tilt (on top
    // of the user's static orientation correction) — stays at zero in demo
    // mode / before the first real detection, since no matrix exists yet.
    let headPose = { pitch: 0, yaw: 0 };

    // Baseline "last confident detection" time is now, not zero — otherwise
    // the low-confidence hint would flash on before tracking has even had a
    // chance to run once.
    let lastFaceDetectionMs = performance.now();
    let lastHandDetectionMs = performance.now();
    // Pose tracking only ever starts for necklace placement (see
    // runFaceRenderLoop) — eyewear/earring/hand sessions never pay its
    // model-load or per-frame inference cost.
    let poseDetecting = false;
    let poseLoadStarted = false;

    const detectFaceOnce = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = getReadyFaceLandmarker();
      if (!video || !canvas || !landmarker || !video.videoWidth) return;
      try {
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const lm = result.faceLandmarks[0];
        if (cancelled || !lm) return;
        lastFaceDetectionMs = now;
        faceAnchorsRef.current = {
          eyeA: faceFilters.eyeA.filter(toCanvasPoint(lm[FACE_LM.eyeOuterA], canvas), now),
          eyeB: faceFilters.eyeB.filter(toCanvasPoint(lm[FACE_LM.eyeOuterB], canvas), now),
          irisA: faceFilters.irisA.filter(toCanvasPoint(lm[FACE_LM.irisA], canvas), now),
          irisB: faceFilters.irisB.filter(toCanvasPoint(lm[FACE_LM.irisB], canvas), now),
          earA: faceFilters.earA.filter(toCanvasPoint(lm[FACE_LM.earA], canvas), now),
          earB: faceFilters.earB.filter(toCanvasPoint(lm[FACE_LM.earB], canvas), now),
          chin: faceFilters.chin.filter(toCanvasPoint(lm[FACE_LM.chin], canvas), now),
          forehead: faceFilters.forehead.filter(toCanvasPoint(lm[FACE_LM.forehead], canvas), now),
          nasion: faceFilters.nasion.filter(toCanvasPoint(lm[FACE_LM.nasion], canvas), now),
        };

        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        if (matrix) {
          const euler = matrixToEuler(matrix);
          headPose = {
            pitch: headPosePitchFilter.filter(euler.pitch, now),
            yaw: headPoseYawFilter.filter(euler.yaw, now),
          };
        }
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
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        if (cancelled || result.landmarks.length === 0) return;
        lastHandDetectionMs = now;
        const landmarks = result.landmarks[0];
        // video is mirrored (scaleX(-1)); landmarks are normalized (0-1) on the raw frame
        handAnchorsRef.current = {
          wrist: handFilters.wrist.filter(toCanvasPoint(landmarks[0], canvas), now),
          middleMcp: handFilters.middleMcp.filter(toCanvasPoint(landmarks[9], canvas), now),
          ringAnchor: handFilters.ringAnchor.filter(toCanvasPoint(landmarks[13], canvas), now),
        };
      } catch {
        // transient detection failure; keep the last known anchor
      }
    };

    // Only invoked for necklace placement (see runFaceRenderLoop) — gives
    // real shoulder positions instead of the face-mesh-only estimate every
    // other placement still uses. BlazePose landmarks 11/12 (left/right
    // shoulder) — verified against real detector output on a static photo,
    // and already land in the same "A = visual-left post-mirror" order
    // FaceAnchors' eye pair uses, no index swap needed (unlike the eyes).
    const detectPoseOnce = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = getReadyPoseLandmarker();
      if (!video || !canvas || !landmarker || !video.videoWidth) return;
      try {
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const lm = result.landmarks[0];
        if (cancelled || !lm) return;
        bodyAnchorsRef.current = {
          shoulderA: bodyFilters.shoulderA.filter(toCanvasPoint(lm[11], canvas), now),
          shoulderB: bodyFilters.shoulderB.filter(toCanvasPoint(lm[12], canvas), now),
        };
      } catch {
        // transient detection failure; keep the last known anchor
      }
    };

    const renderModelOverlay = (
      canvas: HTMLCanvasElement,
      frames: { x: number; y: number; size: number; rotation: number }[],
      // Only true for real-tracking eyewear/necklace respectively — see
      // runFaceRenderLoop. Every other call site (hand, demo modes, other
      // placements) leaves both false, which explicitly clears any occluder
      // left over from a previous frame/placement rather than letting it
      // linger.
      applyHeadOccluder = false,
      applyNeckOccluder = false,
    ) => {
      const handle = modelViewerRef.current;
      if (!handle) return;
      if (modelViewerSizeRef.current.width !== canvas.width || modelViewerSizeRef.current.height !== canvas.height) {
        handle.resize(canvas.width, canvas.height);
        modelViewerSizeRef.current = { width: canvas.width, height: canvas.height };
      }
      // User's static per-upload correction, plus (for real tracking only —
      // stays zero in demo mode) the live detected head pose, so the model
      // tilts as the head turns/nods rather than only rolling.
      const rotationY = customModelRotationRef.current + headPose.yaw;
      const rotationX = customModelRotationXRef.current + headPose.pitch;
      handle.setInstances(
        frames.map((f) => ({
          x: f.x,
          y: f.y,
          size: f.size,
          rotationZ: f.rotation,
          rotationY,
          rotationX,
        })),
      );
      const occluderTransform = frames[0] ? { ...frames[0], rotationY, rotationX } : null;
      handle.setHeadOccluder(applyHeadOccluder ? occluderTransform : null);
      handle.setNeckOccluder(applyNeckOccluder ? occluderTransform : null);
      handle.render();
    };

    const defaultFaceAnchors = (canvas: HTMLCanvasElement, eyeCyFactor = 0.42, faceWFactor = 0.32): FaceAnchors => {
      const eyeCx = canvas.width / 2;
      const eyeCy = canvas.height * eyeCyFactor;
      const faceW = canvas.width * faceWFactor;
      const faceH = faceW * 0.9;
      const eyeSpan = faceW * 0.5;
      const earOffset = faceW * 0.56;
      return {
        eyeA: { x: eyeCx - eyeSpan / 2, y: eyeCy },
        eyeB: { x: eyeCx + eyeSpan / 2, y: eyeCy },
        irisA: { x: eyeCx - eyeSpan / 2, y: eyeCy },
        irisB: { x: eyeCx + eyeSpan / 2, y: eyeCy },
        earA: { x: eyeCx - earOffset, y: eyeCy + faceH * 0.18 },
        earB: { x: eyeCx + earOffset, y: eyeCy + faceH * 0.18 },
        chin: { x: eyeCx, y: eyeCy + faceH * 0.55 },
        forehead: { x: eyeCx, y: eyeCy - faceH * 0.45 },
        // Just above the eye line, per the real-detector proportions verified for FACE_LM.nasion.
        nasion: { x: eyeCx, y: eyeCy - eyeSpan * 0.05 },
      };
    };

    const defaultHandAnchors = (canvas: HTMLCanvasElement): HandAnchors => {
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.55;
      const handSize = canvas.width * 0.3;
      return {
        wrist: { x: cx, y: cy },
        middleMcp: { x: cx, y: cy - handSize },
        ringAnchor: { x: cx + handSize * 0.15, y: cy - handSize * 0.7 },
      };
    };

    const runFaceRenderLoop = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      if (video.videoWidth) {
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        const anchors = faceAnchorsRef.current ?? defaultFaceAnchors(canvas);

        // Pose tracking is opt-in, necklace-only — lazily started the first
        // time this session actually needs it, so every other placement
        // never pays its model-load or per-frame cost.
        let bodyAnchors: BodyAnchors | null = null;
        if (placementRef.current === 'neck') {
          if (!poseLoadStarted) {
            poseLoadStarted = true;
            loadPoseLandmarker();
          }
          const raw = bodyAnchorsRef.current;
          if (raw) {
            const now = performance.now();
            const dt = (now - lastNecklaceSpringMs) / 1000;
            lastNecklaceSpringMs = now;
            const rawTorsoAngle = Math.atan2(raw.shoulderB.y - raw.shoulderA.y, raw.shoulderB.x - raw.shoulderA.x);
            bodyAnchors = {
              shoulderA: raw.shoulderA,
              shoulderB: raw.shoulderB,
              drapeRotation: necklaceDrapeSpring.update(rawTorsoAngle, dt),
            };
          }
          if (!poseDetecting) {
            poseDetecting = true;
            detectPoseOnce().finally(() => {
              poseDetecting = false;
            });
          }
        }

        if (modelViewerRef.current && modelCanvasRef.current) {
          const modelCanvas = modelCanvasRef.current;
          modelCanvas.width = canvas.width;
          modelCanvas.height = canvas.height;
          let frames = getFacePlacementFrames(placementRef.current as FacePlacement, anchors, sizeRef.current, bodyAnchors);
          // Far-side earring cutoff at extreme yaw — reuses the same
          // (best-effort, documented in lib/headPose.ts) signed yaw value
          // the model's own tilt already uses, so if that sign ever needs
          // flipping on a real device, this stays consistent with it
          // rather than being a second, independently-wrong guess.
          if (placementRef.current === 'ears' && frames.length === 2 && Math.abs(headPose.yaw) > FAR_EAR_YAW_CUTOFF) {
            frames = [headPose.yaw > 0 ? frames[1] : frames[0]];
          }
          renderModelOverlay(
            modelCanvas,
            frames,
            placementRef.current === 'eyes',
            placementRef.current === 'neck',
          );
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawFacePlacement(ctx, placementRef.current as FacePlacement, anchors, sizeRef.current, colorRef.current, bodyAnchors);
          }
        }

        if (!detecting) {
          detecting = true;
          detectFaceOnce().finally(() => {
            detecting = false;
          });
        }

        setLowConfidence(performance.now() - lastFaceDetectionMs > CONFIDENCE_TIMEOUT_MS);
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
        const anchors = handAnchorsRef.current ?? defaultHandAnchors(canvas);

        if (modelViewerRef.current && modelCanvasRef.current) {
          const modelCanvas = modelCanvasRef.current;
          modelCanvas.width = canvas.width;
          modelCanvas.height = canvas.height;
          const frame = getHandPlacementFrame(placementRef.current as HandPlacement, anchors, sizeRef.current);
          renderModelOverlay(modelCanvas, [frame]);
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawHandPlacement(ctx, placementRef.current as HandPlacement, anchors, sizeRef.current, colorRef.current);
          }
        }

        if (!detecting) {
          detecting = true;
          detectHandOnce().finally(() => {
            detecting = false;
          });
        }

        setLowConfidence(performance.now() - lastHandDetectionMs > CONFIDENCE_TIMEOUT_MS);
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
      const sway = { x: Math.sin(t * 0.6) * 6, y: Math.cos(t * 0.5) * 4 };
      // Small synthetic head-tilt sway so the demo shows the same roll
      // behavior real tracking has, applied around the eye-line midpoint.
      const tilt = Math.sin(t * 0.3) * 0.05;
      const base = defaultFaceAnchors(canvas, 0.2, 0.19);
      const pivot = { x: (base.eyeA.x + base.eyeB.x) / 2 + sway.x, y: (base.eyeA.y + base.eyeB.y) / 2 + sway.y };
      const swayAndTilt = (p: Point): Point => {
        const shifted = { x: p.x + sway.x, y: p.y + sway.y };
        const dx = shifted.x - pivot.x;
        const dy = shifted.y - pivot.y;
        return {
          x: pivot.x + dx * Math.cos(tilt) - dy * Math.sin(tilt),
          y: pivot.y + dx * Math.sin(tilt) + dy * Math.cos(tilt),
        };
      };
      const anchors: FaceAnchors = {
        eyeA: swayAndTilt(base.eyeA),
        eyeB: swayAndTilt(base.eyeB),
        irisA: swayAndTilt(base.irisA),
        irisB: swayAndTilt(base.irisB),
        earA: swayAndTilt(base.earA),
        earB: swayAndTilt(base.earB),
        chin: swayAndTilt(base.chin),
        forehead: swayAndTilt(base.forehead),
        nasion: swayAndTilt(base.nasion),
      };

      if (modelViewerRef.current && modelCanvasRef.current) {
        const modelCanvas = modelCanvasRef.current;
        modelCanvas.width = canvas.width;
        modelCanvas.height = canvas.height;
        const frames = getFacePlacementFrames(placementRef.current as FacePlacement, anchors, sizeRef.current);
        renderModelOverlay(modelCanvas, frames);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawFacePlacement(ctx, placementRef.current as FacePlacement, anchors, sizeRef.current, colorRef.current);
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
      const sway = { x: Math.sin(t * 0.5) * 8, y: Math.cos(t * 0.4) * 6 };
      const base = defaultHandAnchors(canvas);
      const anchors: HandAnchors = {
        wrist: { x: base.wrist.x + sway.x, y: base.wrist.y + sway.y },
        middleMcp: { x: base.middleMcp.x + sway.x, y: base.middleMcp.y + sway.y },
        ringAnchor: { x: base.ringAnchor.x + sway.x, y: base.ringAnchor.y + sway.y },
      };

      if (modelViewerRef.current && modelCanvasRef.current) {
        const modelCanvas = modelCanvasRef.current;
        modelCanvas.width = canvas.width;
        modelCanvas.height = canvas.height;
        const frame = getHandPlacementFrame(placementRef.current as HandPlacement, anchors, sizeRef.current);
        renderModelOverlay(modelCanvas, [frame]);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawHandPlacement(ctx, placementRef.current as HandPlacement, anchors, sizeRef.current, colorRef.current);
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
          loadFaceLandmarker().then((ok) => {
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

  return { videoRef, canvasRef, modelCanvasRef, demoMode, trackingReady, modelError, lowConfidence };
}
