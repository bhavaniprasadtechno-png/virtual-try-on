import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SIZE_INDEX, PRODUCTS, SIZES, SIZE_SCALE, productsByCategory, type Category } from '../../data/products';
import { MODEL_TINTS, type CustomModel, type CustomPlacement, type CustomTrackingTarget } from '../../data/customModel';
import { clearStoredModel, loadStoredModel, saveStoredModel, saveStoredModelMeta, type StoredModelMeta } from '../../lib/modelStorage';
import { ModeTabs } from './ModeTabs';
import { PreviewPane } from './PreviewPane';
import { TryOnPane } from './TryOnPane';
import { TryOnControls } from './TryOnControls';
import { CustomizePanel } from './CustomizePanel';
import './SceneViewer.css';

const toMeta = (model: CustomModel): StoredModelMeta => ({
  trackingTarget: model.trackingTarget,
  placement: model.placement,
  tintIndex: model.tintIndex,
  rotationOffsetY: model.rotationOffsetY,
});

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

  // Restore a previously uploaded model from IndexedDB on load — object
  // URLs don't survive a reload, so a fresh one is minted from the stored
  // file. Silently does nothing if there's no stored model or IndexedDB
  // isn't available (private browsing, quota, etc.).
  useEffect(() => {
    let cancelled = false;
    loadStoredModel()
      .then((stored) => {
        if (cancelled || !stored) return;
        setCustomModel({
          id: `custom-${Date.now()}`,
          name: stored.blob.name,
          url: URL.createObjectURL(stored.blob.file),
          ...stored.meta,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleUploadModel = (model: CustomModel, file: File) => {
    setCustomModel(model);
    saveStoredModel({ name: file.name, file }, toMeta(model)).catch(() => {});
  };

  const handleRemoveModel = () => {
    setCustomModel(null);
    clearStoredModel().catch(() => {});
  };

  // Functional updaters, not "read customModel, spread, setCustomModel" —
  // the Face/Hand toggle fires onChangeTarget and onChangePlacement back to
  // back in the same handler, and both would otherwise read the same stale
  // closure value, so the second call's spread would silently discard the
  // first call's change.
  const handleChangeModelTarget = (target: CustomTrackingTarget) =>
    setCustomModel((m) => (m ? { ...m, trackingTarget: target } : m));

  const handleChangeModelPlacement = (placement: CustomPlacement) =>
    setCustomModel((m) => (m ? { ...m, placement } : m));

  const handleChangeModelTint = (tintIndex: number) => setCustomModel((m) => (m ? { ...m, tintIndex } : m));

  const handleRotateModel = (deltaRadians: number) =>
    setCustomModel((m) => (m ? { ...m, rotationOffsetY: m.rotationOffsetY + deltaRadians } : m));

  // Persists target/placement/tint/rotation together, once React has
  // resolved to the final state — avoids the same stale-value hazard that
  // calling saveStoredModelMeta directly in each handler above would have.
  // Intentionally scoped to just the persisted fields, not the whole
  // customModel object — url/id/name changes don't need a metadata rewrite
  // (handleUploadModel already persists those together).
  useEffect(() => {
    if (!customModel) return;
    saveStoredModelMeta(toMeta(customModel)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customModel?.trackingTarget, customModel?.placement, customModel?.tintIndex, customModel?.rotationOffsetY]);

  const trackingTarget = customModel ? customModel.trackingTarget : product.trackingTarget;
  const placement = customModel ? customModel.placement : product.placement;
  const tryOnCustomModel = customModel
    ? {
        url: customModel.url,
        tintHex: MODEL_TINTS[customModel.tintIndex]?.hex ?? null,
        rotationOffsetY: customModel.rotationOffsetY,
      }
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
          onRotateModel={handleRotateModel}
        />
      )}
    </div>
  );
}
