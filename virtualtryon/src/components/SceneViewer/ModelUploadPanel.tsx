import { useRef, useState } from 'react';
import {
  ACCEPTED_MODEL_EXTENSIONS,
  DEFAULT_PLACEMENT_FOR_TARGET,
  FACE_PLACEMENTS,
  HAND_PLACEMENTS,
  MAX_MODEL_FILE_BYTES,
  MODEL_TINTS,
  type CustomModel,
  type CustomPlacement,
  type CustomTrackingTarget,
} from '../../data/customModel';
import './ModelUploadPanel.css';

interface ModelUploadPanelProps {
  customModel: CustomModel | null;
  onUpload: (model: CustomModel, file: File) => void;
  onRemove: () => void;
  onChangeTarget: (target: CustomTrackingTarget) => void;
  onChangePlacement: (placement: CustomPlacement) => void;
  onChangeTint: (tintIndex: number) => void;
  onRotate: (deltaRadians: number) => void;
}

/** Upload-your-own-model section of the Customize panel: file picker, tracking target/placement, and tint. */
export function ModelUploadPanel({
  customModel,
  onUpload,
  onRemove,
  onChangeTarget,
  onChangePlacement,
  onChangeTint,
  onRotate,
}: ModelUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setError('Please choose a .glb or .gltf file.');
      return;
    }
    if (file.size > MAX_MODEL_FILE_BYTES) {
      setError('That file is too large (30MB max).');
      return;
    }
    setError(null);
    onUpload(
      {
        id: `custom-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        trackingTarget: 'face',
        placement: 'eyes',
        tintIndex: 0,
        rotationOffsetY: 0,
      },
      file,
    );
  };

  const placements = customModel?.trackingTarget === 'hand' ? HAND_PLACEMENTS : FACE_PLACEMENTS;

  return (
    <section className="model-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
        className="model-upload__input"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {!customModel ? (
        <button
          type="button"
          className="btn btn-secondary model-upload__cta"
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon />
          Upload your own 3D model
        </button>
      ) : (
        <div className="model-upload__active">
          <div className="model-upload__filename" title={customModel.name}>
            <ModelIcon />
            <span className="model-upload__filename-text">{customModel.name}</span>
            <button
              type="button"
              className="model-upload__remove"
              aria-label="Remove uploaded model"
              onClick={onRemove}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="model-upload__field">
            <span className="model-upload__field-label">Tracked on</span>
            <div className="model-upload__segmented" role="radiogroup" aria-label="Tracking target">
              {(['face', 'hand'] as const).map((target) => (
                <button
                  key={target}
                  type="button"
                  role="radio"
                  aria-checked={customModel.trackingTarget === target}
                  className={`model-upload__segment${customModel.trackingTarget === target ? ' model-upload__segment--active' : ''}`}
                  onClick={() => {
                    onChangeTarget(target);
                    onChangePlacement(DEFAULT_PLACEMENT_FOR_TARGET[target]);
                  }}
                >
                  {target === 'face' ? 'Face' : 'Hand'}
                </button>
              ))}
            </div>
          </div>

          <label className="model-upload__field">
            <span className="model-upload__field-label">Placement</span>
            <select
              className="model-upload__select"
              value={customModel.placement}
              onChange={(e) => onChangePlacement(e.target.value as CustomPlacement)}
            >
              {placements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div className="model-upload__field">
            <span className="model-upload__field-label">Tint</span>
            <div className="model-upload__tints" role="radiogroup" aria-label="Tint">
              {MODEL_TINTS.map((tint, i) => (
                <button
                  key={tint.name}
                  type="button"
                  role="radio"
                  aria-checked={i === customModel.tintIndex}
                  title={tint.name}
                  aria-label={tint.name}
                  className={`model-upload__tint${i === customModel.tintIndex ? ' model-upload__tint--active' : ''}`}
                  style={{ background: tint.swatch }}
                  onClick={() => onChangeTint(i)}
                />
              ))}
            </div>
          </div>

          <div className="model-upload__field">
            <span className="model-upload__field-label">Facing wrong way?</span>
            <p className="model-upload__hint">
              An upload's orientation can't be auto-detected — rotate it until it faces forward.
            </p>
            <div className="model-upload__rotate-row">
              <button
                type="button"
                className="btn model-upload__rotate"
                aria-label="Rotate model left 90 degrees"
                onClick={() => onRotate(-Math.PI / 2)}
              >
                <RotateLeftIcon />
                90°
              </button>
              <button
                type="button"
                className="btn model-upload__rotate"
                aria-label="Rotate model right 90 degrees"
                onClick={() => onRotate(Math.PI / 2)}
              >
                <RotateRightIcon />
                90°
              </button>
            </div>
          </div>

          <button type="button" className="btn model-upload__replace" onClick={() => inputRef.current?.click()}>
            Replace model
          </button>
        </div>
      )}

      {error && <div className="model-upload__error">{error}</div>}
    </section>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224 152v56a16 16 0 0 1-16 16H48a16 16 0 0 1-16-16v-56a8 8 0 0 1 16 0v56h160v-56a8 8 0 0 1 16 0zM93.66 85.66 120 59.31V152a8 8 0 0 0 16 0V59.31l26.34 26.35a8 8 0 0 0 11.32-11.32l-40-40a8 8 0 0 0-11.32 0l-40 40a8 8 0 0 0 11.32 11.32z" />
    </svg>
  );
}

function ModelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M223.68 66.15 135.68 18a15.88 15.88 0 0 0-15.36 0l-88 48.17a16 16 0 0 0-8.32 14v95.64a16 16 0 0 0 8.32 14l88 48.17a15.88 15.88 0 0 0 15.36 0l88-48.17a16 16 0 0 0 8.32-14V80.18a16 16 0 0 0-8.32-14.03zM128 32l80.34 44-29.77 16.3-80.35-44zm-6 176.94-80-43.78V88.24l80 43.79zm6-97-80.34-44L74.66 51.65l80.35 44zm88 53.24-80 43.78v-76.9l32-17.51V152a8 8 0 0 0 16 0v-19.9l32-17.51z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128 50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128z" />
    </svg>
  );
}

function RotateLeftIcon() {
  return (
    <span className="model-upload__rotate-icon" aria-hidden="true">
      ↺
    </span>
  );
}

function RotateRightIcon() {
  return (
    <span className="model-upload__rotate-icon" aria-hidden="true">
      ↻
    </span>
  );
}
