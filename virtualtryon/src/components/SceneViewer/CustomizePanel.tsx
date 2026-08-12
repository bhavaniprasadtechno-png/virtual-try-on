import { useState } from 'react';
import type { Category, Product } from '../../data/products';
import type { CustomModel, CustomPlacement, CustomTrackingTarget } from '../../data/customModel';
import { CategoryTabs } from './CategoryTabs';
import { ProductPicker } from './ProductPicker';
import { ColorSwatchGrid } from './ColorSwatchGrid';
import { SizeSegmented } from './SizeSegmented';
import { ModelUploadPanel } from './ModelUploadPanel';
import './CustomizePanel.css';

interface CustomizePanelProps {
  category: Category;
  onSelectCategory: (category: Category) => void;
  products: Product[];
  product: Product;
  onSelectProduct: (id: string) => void;
  colorIndex: number;
  sizeIndex: number;
  onSelectColor: (index: number) => void;
  onSelectSize: (index: number) => void;
  customModel: CustomModel | null;
  onUploadModel: (model: CustomModel) => void;
  onRemoveModel: () => void;
  onChangeModelTarget: (target: CustomTrackingTarget) => void;
  onChangeModelPlacement: (placement: CustomPlacement) => void;
  onChangeModelTint: (tintIndex: number) => void;
}

/**
 * Renders as a fixed-width right sidebar on wide viewports and collapses
 * into a bottom sheet with a drag handle below the breakpoint — one
 * responsive layout rather than separate desktop/mobile builds.
 */
export function CustomizePanel({
  category,
  onSelectCategory,
  products,
  product,
  onSelectProduct,
  colorIndex,
  sizeIndex,
  onSelectColor,
  onSelectSize,
  customModel,
  onUploadModel,
  onRemoveModel,
  onChangeModelTarget,
  onChangeModelPlacement,
  onChangeModelTint,
}: CustomizePanelProps) {
  const [frameOpen, setFrameOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(true);

  return (
    <aside className="customize-panel" aria-label="Customize product">
      <div className="customize-panel__handle" aria-hidden="true" />

      <div className="customize-panel__top">
        <CategoryTabs category={category} onSelect={onSelectCategory} />
        <ProductPicker products={products} selectedId={product.id} onSelect={onSelectProduct} />
      </div>

      <div className="customize-panel__eyebrow">
        {customModel ? customModel.name : product.name}{' '}
        <span className="customize-panel__eyebrow-type">
          &middot; {customModel ? 'Your upload' : product.type}
        </span>
      </div>

      <div className="customize-panel__body">
        {!customModel && (
          <section className="customize-panel__section">
            <button
              type="button"
              className="customize-panel__section-header"
              aria-expanded={frameOpen}
              onClick={() => setFrameOpen((v) => !v)}
            >
              Customize {product.type}
              <CaretIcon up={frameOpen} />
            </button>
            {frameOpen && (
              <div className="customize-panel__section-body">
                <button type="button" className="btn btn-primary customize-panel__material">
                  {product.material}
                </button>
                <div className="customize-panel__label">Colors</div>
                <hr className="hr customize-panel__hr" />
                <ColorSwatchGrid colors={product.colors} colorIndex={colorIndex} onSelect={onSelectColor} />
              </div>
            )}
          </section>
        )}

        <section className="customize-panel__section">
          <button
            type="button"
            className="customize-panel__section-header"
            aria-expanded={sizeOpen}
            onClick={() => setSizeOpen((v) => !v)}
          >
            Size
            <CaretIcon up={sizeOpen} />
          </button>
          {sizeOpen && (
            <div className="customize-panel__section-body customize-panel__size-row">
              <span className="customize-panel__size-label">{customModel ? customModel.name : product.type}</span>
              <SizeSegmented sizeIndex={sizeIndex} onSelect={onSelectSize} />
            </div>
          )}
        </section>

        <section className="customize-panel__section">
          <button
            type="button"
            className="customize-panel__section-header"
            aria-expanded={modelOpen}
            onClick={() => setModelOpen((v) => !v)}
          >
            Your 3D Model
            <CaretIcon up={modelOpen} />
          </button>
          {modelOpen && (
            <div className="customize-panel__section-body">
              <ModelUploadPanel
                customModel={customModel}
                onUpload={onUploadModel}
                onRemove={onRemoveModel}
                onChangeTarget={onChangeModelTarget}
                onChangePlacement={onChangeModelPlacement}
                onChangeTint={onChangeModelTint}
              />
            </div>
          )}
        </section>
      </div>

      <div className="customize-panel__footer">
        <div>
          <div className="customize-panel__total-label">Total</div>
          <div className="customize-panel__total-value">{product.priceLabel}</div>
        </div>
        <button type="button" className="btn btn-primary customize-panel__cta">
          Add to cart
        </button>
      </div>
    </aside>
  );
}

function CaretIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      style={{ transform: up ? 'rotate(0deg)' : 'rotate(180deg)' }}
    >
      <path d="M213.66 165.66a8 8 0 0 1-11.32 0L128 91.31l-74.34 74.35a8 8 0 0 1-11.32-11.32l80-80a8 8 0 0 1 11.32 0l80 80a8 8 0 0 1 0 11.32z" />
    </svg>
  );
}
