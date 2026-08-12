import { CATEGORIES, type Category } from '../../data/products';
import './CategoryTabs.css';

interface CategoryTabsProps {
  category: Category;
  onSelect: (category: Category) => void;
}

/** Eyewear / Jewellery switcher at the top of the Customize panel. */
export function CategoryTabs({ category, onSelect }: CategoryTabsProps) {
  return (
    <div className="category-tabs" role="tablist" aria-label="Product category">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === category}
          className={`category-tabs__tab${c.id === category ? ' category-tabs__tab--active' : ''}`}
          onClick={() => onSelect(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
