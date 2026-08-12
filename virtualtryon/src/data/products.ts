export type Category = 'eyewear' | 'jewellery';

/** Which detector drives the live try-on overlay for this product. */
export type TrackingTarget = 'face' | 'hand';

/** Where on the tracked target the overlay is anchored. */
export type Placement = 'eyes' | 'neck' | 'ears' | 'ring-finger' | 'wrist';

export interface ProductColor {
  name: string;
  hex: string;
  swatch: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Jewellery sub-type shown as the eyebrow label; undefined for eyewear. */
  type: string;
  material: string;
  priceLabel: string;
  trackingTarget: TrackingTarget;
  placement: Placement;
  colors: ProductColor[];
}

export const PRODUCTS: Product[] = [
  {
    id: 'chamberlain',
    name: 'Chamberlain',
    category: 'eyewear',
    type: 'Eyeglasses',
    material: 'Plastic',
    priceLabel: 'INR 1799.00',
    trackingTarget: 'face',
    placement: 'eyes',
    colors: [
      { name: 'Brown Mix', hex: '#7a4a1f', swatch: 'linear-gradient(135deg,#c98a3f,#3a2412)' },
      { name: 'Forest Green', hex: '#1f5c3d', swatch: 'linear-gradient(135deg,#2e8f5f,#0c2418)' },
      { name: 'Navy Blue', hex: '#17335c', swatch: 'linear-gradient(135deg,#2a4f8f,#0a1730)' },
      { name: 'Magenta', hex: '#a92d7a', swatch: 'linear-gradient(135deg,#e05bb0,#3a0f28)' },
    ],
  },
  {
    id: 'aurora-necklace',
    name: 'Aurora',
    category: 'jewellery',
    type: 'Necklace',
    material: 'Sterling Silver',
    priceLabel: 'INR 3499.00',
    trackingTarget: 'face',
    placement: 'neck',
    colors: [
      { name: 'Gold', hex: '#c9a227', swatch: 'linear-gradient(135deg,#f2d478,#8a6a12)' },
      { name: 'Rose Gold', hex: '#b76e79', swatch: 'linear-gradient(135deg,#e8a5ad,#7a3a41)' },
      { name: 'Silver', hex: '#b8bdc4', swatch: 'linear-gradient(135deg,#eef1f4,#7c828b)' },
      { name: 'Onyx', hex: '#2b2b2f', swatch: 'linear-gradient(135deg,#55555c,#0c0c0e)' },
    ],
  },
  {
    id: 'stardust-earrings',
    name: 'Stardust',
    category: 'jewellery',
    type: 'Earrings',
    material: '14K Gold Plate',
    priceLabel: 'INR 1899.00',
    trackingTarget: 'face',
    placement: 'ears',
    colors: [
      { name: 'Gold', hex: '#c9a227', swatch: 'linear-gradient(135deg,#f2d478,#8a6a12)' },
      { name: 'Rose Gold', hex: '#b76e79', swatch: 'linear-gradient(135deg,#e8a5ad,#7a3a41)' },
      { name: 'Silver', hex: '#b8bdc4', swatch: 'linear-gradient(135deg,#eef1f4,#7c828b)' },
      { name: 'Magenta', hex: '#a92d7a', swatch: 'linear-gradient(135deg,#e05bb0,#3a0f28)' },
    ],
  },
  {
    id: 'solstice-ring',
    name: 'Solstice',
    category: 'jewellery',
    type: 'Ring',
    material: '18K Gold Vermeil',
    priceLabel: 'INR 2299.00',
    trackingTarget: 'hand',
    placement: 'ring-finger',
    colors: [
      { name: 'Gold', hex: '#c9a227', swatch: 'linear-gradient(135deg,#f2d478,#8a6a12)' },
      { name: 'Rose Gold', hex: '#b76e79', swatch: 'linear-gradient(135deg,#e8a5ad,#7a3a41)' },
      { name: 'Silver', hex: '#b8bdc4', swatch: 'linear-gradient(135deg,#eef1f4,#7c828b)' },
      { name: 'Onyx', hex: '#2b2b2f', swatch: 'linear-gradient(135deg,#55555c,#0c0c0e)' },
    ],
  },
  {
    id: 'halo-bracelet',
    name: 'Halo',
    category: 'jewellery',
    type: 'Bracelet',
    material: 'Sterling Silver',
    priceLabel: 'INR 2799.00',
    trackingTarget: 'hand',
    placement: 'wrist',
    colors: [
      { name: 'Gold', hex: '#c9a227', swatch: 'linear-gradient(135deg,#f2d478,#8a6a12)' },
      { name: 'Rose Gold', hex: '#b76e79', swatch: 'linear-gradient(135deg,#e8a5ad,#7a3a41)' },
      { name: 'Silver', hex: '#b8bdc4', swatch: 'linear-gradient(135deg,#eef1f4,#7c828b)' },
      { name: 'Magenta', hex: '#a92d7a', swatch: 'linear-gradient(135deg,#e05bb0,#3a0f28)' },
    ],
  },
];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'eyewear', label: 'Eyewear' },
  { id: 'jewellery', label: 'Jewellery' },
];

export type SizeLabel = 'Small' | 'Medium' | 'Large';

export const SIZES: SizeLabel[] = ['Small', 'Medium', 'Large'];

/** Scale multiplier applied to the drawn/rendered overlay width per size. */
export const SIZE_SCALE: Record<SizeLabel, number> = {
  Small: 0.85,
  Medium: 1,
  Large: 1.15,
};

export const DEFAULT_SIZE_INDEX = 0;

export function productsByCategory(category: Category): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}
