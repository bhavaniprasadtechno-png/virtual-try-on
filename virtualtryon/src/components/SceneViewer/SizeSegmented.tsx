import { SIZES } from '../../data/products';
import './SizeSegmented.css';

interface SizeSegmentedProps {
  sizeIndex: number;
  onSelect: (index: number) => void;
}

/** Segmented Small/Medium/Large control used in the Customize panel. */
export function SizeSegmented({ sizeIndex, onSelect }: SizeSegmentedProps) {
  return (
    <div className="seg-control" role="radiogroup" aria-label="Size">
      {SIZES.map((label, i) => (
        <label
          key={label}
          className={`seg-control__opt${i === sizeIndex ? ' seg-control__opt--active' : ''}`}
        >
          <input
            type="radio"
            name="size"
            checked={i === sizeIndex}
            onChange={() => onSelect(i)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
