
export interface User {
  id: number;
  mobile: string;
  role: 'buyer' | 'shopkeeper';
  shop_id?: number | null;
}

export interface Shop {
  id: number;
  owner_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  subscription_level?: string;
}

export interface Product {
  id: number;
  shop_id: number;
  name: string;
  description?: string;
  category?: string;
  price: number;
  stock_status: 'Available' | 'Limited' | 'Out of Stock';
  image_url?: string;
  last_updated?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: User;
}

export interface CreateShopResponse {
  message: string;
  shopId: number;
}

export interface FetchShopsResponse {
  shops: Shop[];
}

export interface FetchProductsResponse {
  products: Product[];
}

export interface ApiError {
  error?: string;
  message?: string;
}
