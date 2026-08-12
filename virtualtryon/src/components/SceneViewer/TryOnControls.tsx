import { SIZES, type ProductColor } from '../../data/products';
import './TryOnControls.css';

interface TryOnControlsProps {
  colors: ProductColor[];
  colorIndex: number;
  sizeIndex: number;
  onSelectColor: (index: number) => void;
  onSelectSize: (index: number) => void;
  onClose: () => void;
  /** Present only when a custom uploaded model is active — lets orientation be dialed in while watching it live instead of bouncing back to Preview. */
  onRotateModel?: (deltaRadians: number) => void;
  onFlipModel?: () => void;
}

/**
 * Floating capsule bar anchored bottom-center in Try-On mode. Single row of
 * color circles + size pills + close button on wide viewports; the color
 * and size groups stack into two rows below the responsive breakpoint (the
 * close control moves to the top bar there instead — see ExitTryOnButton).
 */
export function TryOnControls({
  colors,
  colorIndex,
  sizeIndex,
  onSelectColor,
  onSelectSize,
  onClose,
  onRotateModel,
  onFlipModel,
}: TryOnControlsProps) {
  return (
    <div className="tryon-controls">
      <div className="tryon-controls__row">
        <span className="tryon-controls__group-label">Color</span>
        {colors.map((color, i) => (
          <button
            key={color.name}
            type="button"
            className={`tryon-controls__swatch${i === colorIndex ? ' tryon-controls__swatch--active' : ''}`}
            style={{ background: color.swatch }}
            title={color.name}
            aria-label={color.name}
            onClick={() => onSelectColor(i)}
          />
        ))}
      </div>

      <div className="tryon-controls__divider" aria-hidden="true" />

      <div className="tryon-controls__row">
        <span className="tryon-controls__group-label">Size</span>
        {SIZES.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`tryon-controls__size${i === sizeIndex ? ' tryon-controls__size--active' : ''}`}
            onClick={() => onSelectSize(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {onRotateModel && onFlipModel && (
        <>
          <div className="tryon-controls__divider" aria-hidden="true" />
          <div className="tryon-controls__row">
            <span className="tryon-controls__group-label">Fit</span>
            <button
              type="button"
              className="btn btn-icon tryon-controls__orient"
              aria-label="Rotate model left 90 degrees"
              onClick={() => onRotateModel(-Math.PI / 2)}
            >
              <RotateLeftIcon />
            </button>
            <button
              type="button"
              className="btn btn-icon tryon-controls__orient"
              aria-label="Rotate model right 90 degrees"
              onClick={() => onRotateModel(Math.PI / 2)}
            >
              <RotateRightIcon />
            </button>
            <button
              type="button"
              className="btn btn-icon tryon-controls__orient"
              aria-label="Flip model upside down"
              onClick={onFlipModel}
            >
              <FlipIcon />
            </button>
          </div>
        </>
      )}

      <div className="tryon-controls__divider tryon-controls__divider--desktop-only" aria-hidden="true" />

      <button
        type="button"
        className="btn btn-icon tryon-controls__close"
        aria-label="Close try-on"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128z" />
    </svg>
  );
}

function RotateLeftIcon() {
  return (
    <span className="tryon-controls__orient-icon" aria-hidden="true">
      ↺
    </span>
  );
}

function RotateRightIcon() {
  return (
    <span className="tryon-controls__orient-icon" aria-hidden="true">
      ↻
    </span>
  );
}

function FlipIcon() {
  return (
    <span className="tryon-controls__orient-icon" aria-hidden="true">
      ⇅
    </span>
  );
}
