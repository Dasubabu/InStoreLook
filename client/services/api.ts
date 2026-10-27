
import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { saveShopsToLocal, getShopsFromLocal, saveProductsToLocal, getProductsFromLocal } from './localdb';
import {
  User,
  Shop,
  Product,
  LoginResponse,
  RegisterResponse,
  CreateShopResponse,
  FetchShopsResponse,
  FetchProductsResponse,
  ApiError
} from '../constants/types';

// Use 10.0.2.2 for Android Emulator, localhost for iOS/Web
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (mobile: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', { mobile, password });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    throw axiosError.response?.data || (error as Error).message;
  }
};

export const register = async (mobile: string, password: string, role: 'buyer' | 'shopkeeper'): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/auth/register', { mobile, password, role });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    throw axiosError.response?.data || (error as Error).message;
  }
};

export const fetchShops = async (search = ''): Promise<Shop[]> => {
  try {
    const response = await api.get<FetchShopsResponse>(`/shops?search=${search}`);
    // Cache data
    await saveShopsToLocal(response.data.shops);
    return response.data.shops;
  } catch (error) {
    console.error("Fetch shops error (using offline)", error);
    return await getShopsFromLocal(search);
  }
};

export const createShop = async (shopData: {
  owner_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
}): Promise<CreateShopResponse> => {
  try {
    const response = await api.post<CreateShopResponse>('/shops', shopData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiError>;
    throw axiosError.response?.data || (error as Error).message;
  }
};

export const fetchProducts = async (search = '', shopId?: number | null): Promise<Product[]> => {
  try {
    let url = `/products?search=${search}`;
    if (shopId != null) url += `&shop_id=${shopId}`;
    const response = await api.get<FetchProductsResponse>(url);
    // Cache data
    await saveProductsToLocal(response.data.products);
    return response.data.products;
  } catch (error) {
    console.error("Fetch products error (using offline)", error);
    return await getProductsFromLocal(search, shopId);
  }
};

export default api;
