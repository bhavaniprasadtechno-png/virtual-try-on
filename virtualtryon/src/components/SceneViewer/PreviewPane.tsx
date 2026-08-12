import type { Product } from '../../data/products';
import type { CustomModel } from '../../data/customModel';
import { MODEL_TINTS } from '../../data/customModel';
import { ProductPreviewArt } from './ProductPreviewArt';
import { Model3DPreview } from './Model3DPreview';
import './PreviewPane.css';

interface PreviewPaneProps {
  product: Product;
  colorHex: string;
  customModel: CustomModel | null;
  onSelectTryOn: () => void;
}

export function PreviewPane({ product, colorHex, customModel, onSelectTryOn }: PreviewPaneProps) {
  return (
    <>
      <div className="preview-pane__stage">
        {customModel ? (
          <Model3DPreview
            url={customModel.url}
            tintHex={MODEL_TINTS[customModel.tintIndex]?.hex ?? null}
            className="preview-pane__frame"
          />
        ) : (
          <ProductPreviewArt product={product} colorHex={colorHex} className="preview-pane__frame" />
        )}
      </div>

      <div className="preview-pane__tools">
        <button type="button" className="btn btn-icon preview-pane__tool" aria-label="Rotate">
          <RotateIcon />
        </button>
        <button type="button" className="btn btn-icon preview-pane__tool" aria-label="Fullscreen">
          <ExpandIcon />
        </button>
        <button
          type="button"
          className="btn btn-icon preview-pane__tool preview-pane__tool--camera"
          aria-label="Open virtual try-on"
          onClick={onSelectTryOn}
        >
          <CameraDeviceIcon />
        </button>
      </div>
    </>
  );
}

function RotateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M197.67 186.37a8 8 0 0 1 0 11.29C196.58 198.75 170.82 224 128 224a95.9 95.9 0 0 1-67.88-28.12L44 211.32A8 8 0 0 1 30.34 205.66l4-32.06a8 8 0 0 1 9.06-6.94l32.06 4A8 8 0 0 1 76.68 184L60.24 200.44A79.9 79.9 0 0 0 128 208c36.1 0 57.6-21.3 58.5-22.2a8 8 0 0 1 11.17.57zM216 128a8 8 0 0 0-8 8 79.9 79.9 0 0 0 7.76-16.44l16.44 16.44a8 8 0 0 0 13.66-5.66l-4-32.06a8 8 0 0 0-9.06-6.94l-32.06 4a8 8 0 0 0-2.43 15.31L211.98 127A96 96 0 0 0 128 32c-42.82 0-68.58 25.25-69.67 26.37a8 8 0 1 0 11.51 11.11C70.74 68.6 92.2 48 128 48a80 80 0 0 1 80 80 8 8 0 0 0 8 8z" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M160 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v48a8 8 0 0 1-16 0V59.31l-42.34 42.35a8 8 0 0 1-11.32-11.32L196.69 48H168a8 8 0 0 1-8-8zM40 96a8 8 0 0 0 8-8V59.31l42.34 42.35a8 8 0 0 0 11.32-11.32L59.31 48H88a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v48a8 8 0 0 0 8 8zm168 64a8 8 0 0 0-8 8v28.69l-42.34-42.35a8 8 0 0 0-11.32 11.32L188.69 208H160a8 8 0 0 0 0 16h48a8 8 0 0 0 8-8v-48a8 8 0 0 0-8-8zm-98.34 6.34L67.31 208H96a8 8 0 0 1 0 16H48a8 8 0 0 1-8-8v-48a8 8 0 0 1 16 0v28.69l42.34-42.35a8 8 0 0 1 11.32 11.32z" />
    </svg>
  );
}

function CameraDeviceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M176 24H80a24 24 0 0 0-24 24v160a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V48a24 24 0 0 0-24-24zm-40 176a12 12 0 1 1 12-12 12 12 0 0 1-12 12zm38-40a6 6 0 0 1-6 6H86a6 6 0 0 1-6-6V70a6 6 0 0 1 6-6h82a6 6 0 0 1 6 6z" />
    </svg>
  );
}
