import type { Product } from '../../data/products';
import './ProductPicker.css';

interface ProductPickerProps {
  products: Product[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Horizontal picker for which item within the active category is being customized/tried on. */
export function ProductPicker({ products, selectedId, onSelect }: ProductPickerProps) {
  if (products.length <= 1) return null;

  return (
    <div className="product-picker" role="radiogroup" aria-label="Product">
      {products.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={p.id === selectedId}
          className={`product-picker__item${p.id === selectedId ? ' product-picker__item--active' : ''}`}
          onClick={() => onSelect(p.id)}
        >
          <span className="product-picker__swatch" style={{ background: p.colors[0].swatch }} />
          {p.type}
        </button>
      ))}
    </div>
  );
}
