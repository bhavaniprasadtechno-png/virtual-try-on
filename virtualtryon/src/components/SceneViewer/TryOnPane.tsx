import type { Placement, TrackingTarget } from '../../data/products';
import { useTryOn } from '../../hooks/useTryOn';
import './TryOnPane.css';

interface TryOnPaneProps {
  trackingTarget: TrackingTarget;
  placement: Placement;
  colorHex: string;
  sizeScale: number;
  customModel: { url: string; tintHex: string | null; rotationOffsetY: number } | null;
  onClose: () => void;
}

export function TryOnPane({ trackingTarget, placement, colorHex, sizeScale, customModel, onClose }: TryOnPaneProps) {
  const { videoRef, canvasRef, modelCanvasRef, demoMode, trackingReady, modelError } = useTryOn({
    active: true,
    trackingTarget,
    placement,
    colorHex,
    sizeScale,
    customModel,
  });

  const isHand = trackingTarget === 'hand';

  return (
    <>
      <button
        type="button"
        className="btn btn-icon tryon-pane__exit"
        aria-label="Close try-on"
        onClick={onClose}
      >
        <CloseIcon />
      </button>

      <div className="tryon-pane__frame">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="tryon-pane__video"
          style={{ display: demoMode ? 'none' : 'block' }}
        />

        {demoMode && (
          <div className="tryon-pane__demo">
            {isHand ? <HandSilhouetteIcon /> : <UserSilhouetteIcon />}
            <span className="tryon-pane__demo-label">Demo camera feed</span>
          </div>
        )}

        <canvas ref={canvasRef} className="tryon-pane__canvas" />
        <canvas ref={modelCanvasRef} className="tryon-pane__canvas" />
      </div>

      {trackingReady && (
        <div className="tryon-pane__tracking-pill">
          <span className="tryon-pane__tracking-dot" />
          Tracking {isHand ? 'hand' : 'face'}
        </div>
      )}

      {modelError && (
        <div className="tryon-pane__model-error">Couldn&apos;t load your 3D model — showing catalog view instead.</div>
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128z" />
    </svg>
  );
}

function UserSilhouetteIcon() {
  return (
    <svg
      className="tryon-pane__demo-icon"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24zm0 40a36 36 0 1 1-36 36 36 36 0 0 1 36-36zm0 152a79.6 79.6 0 0 1-52.94-20.13 64.07 64.07 0 0 1 105.88 0A79.6 79.6 0 0 1 128 216z" />
    </svg>
  );
}

function HandSilhouetteIcon() {
  return (
    <svg
      className="tryon-pane__demo-icon"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M232 108v44a76 76 0 0 1-76 76h-32a76 76 0 0 1-64.4-35.6l-30.3-48.5a20 20 0 0 1 30.4-25.9L84 145V52a20 20 0 0 1 40 0v56a20 20 0 0 1 0 .4V44a20 20 0 0 1 40 0v64.6-.2A20 20 0 0 1 204 108v0a20 20 0 0 1 28 0z" />
    </svg>
  );
}
