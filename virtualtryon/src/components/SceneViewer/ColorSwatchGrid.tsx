import type { ProductColor } from '../../data/products';
import './ColorSwatchGrid.css';

interface ColorSwatchGridProps {
  colors: ProductColor[];
  colorIndex: number;
  onSelect: (index: number) => void;
}

/** Grid of labeled swatches used in the Customize panel (sidebar / bottom sheet). */
export function ColorSwatchGrid({ colors, colorIndex, onSelect }: ColorSwatchGridProps) {
  return (
    <div className="swatch-grid" role="radiogroup" aria-label="Color">
      {colors.map((color, i) => (
        <button
          key={color.name}
          type="button"
          role="radio"
          aria-checked={i === colorIndex}
          className={`swatch-grid__item${i === colorIndex ? ' swatch-grid__item--active' : ''}`}
          onClick={() => onSelect(i)}
        >
          <span className="swatch-grid__swatch" style={{ background: color.swatch }} />
          <span className="swatch-grid__label">{color.name}</span>
        </button>
      ))}
    </div>
  );
}
