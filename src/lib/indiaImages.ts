/** Reference imagery from the brands' public India storefronts.
 * These are editorial demo references, not licensed campaign assets or an
 * assertion of partnership/stock. Replace with approved seller media for launch.
 * Sources: https://www.wforwoman.com/collections/kurtas
 * https://levi.in/collections/men-shirts
 * https://in.puma.com/in/en/pd/smashic-unisex-sneakers/394371
 */
export const INDIA_IMAGES = {
  ethnic: 'https://www.wforwoman.com/cdn/shop/files/W11970-222620_1_f21d12d2-8c9d-4d5d-8e31-2cc587f75cf6.jpg?v=1769506716&width=900',
  purpleKurta: 'https://www.wforwoman.com/cdn/shop/files/W13179-126074_1.jpg?v=1758023935&width=900',
  navyKurta: 'https://www.wforwoman.com/cdn/shop/files/W11970-222877_1_bfa0f9dc-2ac2-4f0b-98ff-274ff96fbc51.jpg?v=1769506857&width=900',
  saree: 'https://www.wforwoman.com/cdn/shop/files/22AUW18583-119023.webp?v=1771326726&width=900',
  dress: 'https://www.wforwoman.com/cdn/shop/files/W12185-124715.webp?v=1771326632&width=900',
  bottoms: 'https://www.wforwoman.com/cdn/shop/files/25CRE60381-701497_1.jpg?v=1742561987&width=900',
  men: 'https://levi.in/cdn/shop/files/329070688_Lifestyle.jpg?v=1790748951&width=900',
  denimShirt: 'https://levi.in/cdn/shop/files/176210392.jpg?v=1791267791&width=900',
  whiteShirt: 'https://levi.in/cdn/shop/files/329080455.jpg?v=1791352902&width=900',
  sneakers: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/394371/01/sv01/fnd/IND/fmt/png/Smashic-Comfort-Casual-Sneakers',
  sneakerDetail: 'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_600,h_600/global/394371/01/mod01/fnd/IND/fmt/png/Smashic-Comfort-Casual-Sneakers',
} as const;

/** Neutral fallback, never an unrelated product masquerading as this item. */
export const RETAIL_IMAGE_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#f4eee9"/><rect x="210" y="270" width="180" height="180" rx="20" fill="none" stroke="#bba99d" stroke-width="4"/><path d="m225 425 65-75 40 45 35-35 20 30" fill="none" stroke="#bba99d" stroke-width="4"/><circle cx="340" cy="315" r="15" fill="#bba99d"/><text x="300" y="510" text-anchor="middle" fill="#695c54" font-family="sans-serif" font-size="20">Image unavailable</text><text x="300" y="545" text-anchor="middle" fill="#8c7d72" font-family="sans-serif" font-size="14">InStoreLook</text></svg>')}`;
