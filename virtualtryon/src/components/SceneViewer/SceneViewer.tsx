import { useMemo, useState } from 'react';
import { DEFAULT_SIZE_INDEX, PRODUCTS, SIZES, SIZE_SCALE, productsByCategory, type Category } from '../../data/products';
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

  const products = useMemo(() => productsByCategory(category), [category]);
  const product = PRODUCTS.find((p) => p.id === productId) ?? products[0];

  const colorHex = product.colors[colorIndex]?.hex ?? product.colors[0].hex;
  const sizeScale = SIZE_SCALE[SIZES[sizeIndex]];

  const handleSelectCategory = (next: Category) => {
    setCategory(next);
    const first = productsByCategory(next)[0];
    setProductId(first.id);
    setColorIndex(0);
    setIsPreview(true);
  };

  const handleSelectProduct = (id: string) => {
    setProductId(id);
    setColorIndex(0);
  };

  return (
    <div className="scene-viewer">
      <div className="scene-viewer__stage">
        <ModeTabs
          isPreview={isPreview}
          onSelectPreview={() => setIsPreview(true)}
          onSelectTryOn={() => setIsPreview(false)}
        />

        {isPreview ? (
          <PreviewPane product={product} colorHex={colorHex} onSelectTryOn={() => setIsPreview(false)} />
        ) : (
          <>
            <TryOnPane
              product={product}
              colorHex={colorHex}
              sizeScale={sizeScale}
              onClose={() => setIsPreview(true)}
            />
            <TryOnControls
              colors={product.colors}
              colorIndex={colorIndex}
              sizeIndex={sizeIndex}
              onSelectColor={setColorIndex}
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
        />
      )}
    </div>
  );
}
