import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SIZE_INDEX, PRODUCTS, SIZES, SIZE_SCALE, productsByCategory, type Category } from '../../data/products';
import { MODEL_TINTS, type CustomModel, type CustomPlacement, type CustomTrackingTarget } from '../../data/customModel';
import { ModeTabs } from './ModeTabs';
import { PreviewPane } from './PreviewPane';
import { TryOnPane } from './TryOnPane';
import { TryOnControls } from './TryOnControls';
import { CustomizePanel } from './CustomizePanel';
import './SceneViewer.css';

export function SceneViewer() {
  const [isPreview, setIsPreview] = useState(true);
  const [category, setCategory] = useState<Category>('eyewear');
  const [productId, setProductId] = useState(productsByCategory('eyewear')[0].id);
  const [colorIndex, setColorIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(DEFAULT_SIZE_INDEX);
  const [customModel, setCustomModel] = useState<CustomModel | null>(null);

  const products = useMemo(() => productsByCategory(category), [category]);
  const product = PRODUCTS.find((p) => p.id === productId) ?? products[0];

  const colorHex = product.colors[colorIndex]?.hex ?? product.colors[0].hex;
  const sizeScale = SIZE_SCALE[SIZES[sizeIndex]];

  // Revoke the uploaded model's object URL once it's replaced or removed, so
  // the browser can free the underlying file data.
  useEffect(() => {
    const url = customModel?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [customModel?.url]);

  const handleSelectCategory = (next: Category) => {
    setCategory(next);
    const first = productsByCategory(next)[0];
    setProductId(first.id);
    setColorIndex(0);
    setIsPreview(true);
    setCustomModel(null);
  };

  const handleSelectProduct = (id: string) => {
    setProductId(id);
    setColorIndex(0);
    setCustomModel(null);
  };

  const handleUploadModel = (model: CustomModel) => setCustomModel(model);
  const handleRemoveModel = () => setCustomModel(null);
  const handleChangeModelTarget = (target: CustomTrackingTarget) =>
    setCustomModel((m) => (m ? { ...m, trackingTarget: target } : m));
  const handleChangeModelPlacement = (placement: CustomPlacement) =>
    setCustomModel((m) => (m ? { ...m, placement } : m));
  const handleChangeModelTint = (tintIndex: number) => setCustomModel((m) => (m ? { ...m, tintIndex } : m));

  const trackingTarget = customModel ? customModel.trackingTarget : product.trackingTarget;
  const placement = customModel ? customModel.placement : product.placement;
  const tryOnCustomModel = customModel
    ? { url: customModel.url, tintHex: MODEL_TINTS[customModel.tintIndex]?.hex ?? null }
    : null;
  // Neutral fallback so the 2D line-art renderer has a color even if a custom
  // model fails to load and its tint is "Original" (no fixed color).
  const tryOnColorHex = customModel ? MODEL_TINTS[customModel.tintIndex]?.hex ?? '#9d9fae' : colorHex;
  // Reuses the existing TryOnControls swatch UI for tint selection when a
  // custom model is active; "Original" gets a placeholder hex since
  // TryOnControls only ever renders `.swatch` and `.name`, never `.hex`.
  const tintSwatches = useMemo(
    () => MODEL_TINTS.map((tint) => ({ name: tint.name, hex: tint.hex ?? '#9d9fae', swatch: tint.swatch })),
    [],
  );

  return (
    <div className="scene-viewer">
      <div className="scene-viewer__stage">
        <ModeTabs
          isPreview={isPreview}
          onSelectPreview={() => setIsPreview(true)}
          onSelectTryOn={() => setIsPreview(false)}
        />

        {isPreview ? (
          <PreviewPane
            product={product}
            colorHex={colorHex}
            customModel={customModel}
            onSelectTryOn={() => setIsPreview(false)}
          />
        ) : (
          <>
            <TryOnPane
              trackingTarget={trackingTarget}
              placement={placement}
              colorHex={tryOnColorHex}
              sizeScale={sizeScale}
              customModel={tryOnCustomModel}
              onClose={() => setIsPreview(true)}
            />
            <TryOnControls
              colors={customModel ? tintSwatches : product.colors}
              colorIndex={customModel ? customModel.tintIndex : colorIndex}
              sizeIndex={sizeIndex}
              onSelectColor={customModel ? handleChangeModelTint : setColorIndex}
              onSelectSize={setSizeIndex}
              onClose={() => setIsPreview(true)}
            />
          </>
        )}
      </div>

      {isPreview && (
        <CustomizePanel
          category={category}
          onSelectCategory={handleSelectCategory}
          products={products}
          product={product}
          onSelectProduct={handleSelectProduct}
          colorIndex={colorIndex}
          sizeIndex={sizeIndex}
          onSelectColor={setColorIndex}
          onSelectSize={setSizeIndex}
          customModel={customModel}
          onUploadModel={handleUploadModel}
          onRemoveModel={handleRemoveModel}
          onChangeModelTarget={handleChangeModelTarget}
          onChangeModelPlacement={handleChangeModelPlacement}
          onChangeModelTint={handleChangeModelTint}
        />
      )}
    </div>
  );
}
