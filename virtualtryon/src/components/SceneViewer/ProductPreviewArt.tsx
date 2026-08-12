import type { Product } from '../../data/products';
import { FramePlaceholder } from './FramePlaceholder';

interface ProductPreviewArtProps {
  product: Product;
  colorHex: string;
  className?: string;
}

/**
 * Placeholder line-drawing standing in for the real product renderer /
 * photography pipeline, dispatched per product type. Tinted with the
 * selected color for a bit of live feedback in Preview mode.
 */
export function ProductPreviewArt({ product, colorHex, className }: ProductPreviewArtProps) {
  switch (product.type) {
    case 'Eyeglasses':
      return <FramePlaceholder className={className} />;
    case 'Necklace':
      return <NecklaceArt className={className} color={colorHex} />;
    case 'Earrings':
      return <EarringsArt className={className} color={colorHex} />;
    case 'Ring':
      return <RingArt className={className} color={colorHex} />;
    case 'Bracelet':
      return <BraceletArt className={className} color={colorHex} />;
    default:
      return null;
  }
}

interface ArtProps {
  className?: string;
  color: string;
}

function NecklaceArt({ className, color }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 400 260" role="img" aria-label="Necklace preview">
      <path
        d="M60 30 Q60 150 200 165 Q340 150 340 30"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="200" cy="185" r="16" fill="none" stroke={color} strokeWidth="6" />
      <circle cx="200" cy="215" r="12" fill={color} />
    </svg>
  );
}

function EarringsArt({ className, color }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 400 200" role="img" aria-label="Earrings preview">
      {[100, 300].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="40" r="14" fill={color} />
          <line x1={cx} y1="54" x2={cx} y2="130" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx={cx} cy="160" r="26" fill="none" stroke={color} strokeWidth="6" />
        </g>
      ))}
    </svg>
  );
}

function RingArt({ className, color }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 400 260" role="img" aria-label="Ring preview">
      <ellipse cx="200" cy="170" rx="110" ry="55" fill="none" stroke={color} strokeWidth="16" />
      <circle cx="200" cy="70" r="26" fill={color} />
      <path d="M175 70 L200 30 L225 70 Z" fill={color} />
    </svg>
  );
}

function BraceletArt({ className, color }: ArtProps) {
  return (
    <svg className={className} viewBox="0 0 400 220" role="img" aria-label="Bracelet preview">
      <ellipse cx="200" cy="110" rx="170" ry="70" fill="none" stroke={color} strokeWidth="18" />
      <circle cx="370" cy="110" r="14" fill={color} />
      <circle cx="30" cy="110" r="14" fill={color} />
    </svg>
  );
}
