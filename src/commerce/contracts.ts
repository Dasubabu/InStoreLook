/** Shared traditional-commerce API contract. Prices in carts/orders are integer
 * minor units (paise). Catalog prices retain INR major units for existing UI. */
export interface ProductMedia {
  url: string;
  alt: string;
  view?: string;
  source?: string;
}
export interface ShopVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  priceMinor: number;
}
export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  gender: string;
  price: number;
  mrp?: number;
  currency: 'INR';
  stock: number;
  status: 'In Stock' | 'Out of Stock';
  imageUrl?: string;
  images: string[];
  media?: ProductMedia[];
  description: string;
  color: string;
  fabricType?: string;
  materialComposition?: string;
  compositionVerified?: boolean;
  fit?: string;
  pattern?: string;
  careInstructions?: string;
  sizeChart?: { label: string; chestCm?: number; waistCm?: number; lengthCm?: number }[];
  sizeChartNote?: string;
  returnPolicy?: string;
  deliveryNote?: string;
  occasion?: string;
  tags?: string[];
  rating?: number | null;
  ratingCount?: number;
  variants: ShopVariant[];
  sizes?: { id: string; productId: string; sizeLabel: string; stockQuantity: number }[];
  inventorySource: 'sample' | 'live';
  inventoryVerified: boolean;
  createdAt?: number;
}
export interface ShopQuery {
  search?: string; category?: string; brand?: string; gender?: string;
  size?: string; color?: string; fabric?: string; fit?: string; pattern?: string;
  minPrice?: number | string; maxPrice?: number | string;
  minDiscount?: number | string; minRating?: number | string;
  status?: string; sort?: string; occasion?: string;
  page?: number | string; limit?: number | string;
}
export interface ShopPage {
  data: ShopProduct[]; page: number; limit: number; total: number; totalPages: number;
  catalogSource: 'sample' | 'live';
}
export interface CartItem {
  id: string; productId: string; variantId: string; name: string; brand: string;
  imageUrl?: string; size: string; color: string; quantity: number;
  unitPriceMinor: number; lineTotalMinor: number; availableStock: number;
}
export interface Cart {
  items: CartItem[]; subtotalMinor: number; shippingMinor: number; totalMinor: number;
  currency: 'INR'; updatedAt: string;
}
export interface CheckoutAddress {
  name: string; email: string; phone: string; line1: string; line2?: string;
  city: string; state: string; postalCode: string; country: 'IN';
}
export type PaymentMode = 'demo' | 'stripe';
export interface ShopOrder {
  id: string; status: 'placed' | 'awaiting_payment' | 'paid' | 'cancelled';
  paymentMode: PaymentMode; items: CartItem[]; subtotalMinor: number;
  shippingMinor: number; totalMinor: number; currency: 'INR';
  address: CheckoutAddress; createdAt: string;
}
export interface ShopSession {
  csrfToken: string; mode: 'sample' | 'live'; paymentModes: PaymentMode[]; admin: boolean;
}
export interface ShopInfo {
  mode: 'sample' | 'live'; currency: 'INR'; sample: boolean;
  paymentModes: PaymentMode[]; cartAvailable: boolean; checkoutAvailable: boolean;
}
export interface CheckoutResult { order: ShopOrder; checkoutUrl?: string }
export interface ShopFacets {
  brands: string[]; categories: string[]; genders: string[]; sizes: string[];
  colors: string[]; fabrics: string[]; fits: string[]; patterns: string[];
}
export interface ApiError { error: { code: string; message: string } }
