import express, { type Request, type RequestHandler, type Response } from 'express';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { timingSafeEqual } from 'node:crypto';
import { getCatalogSource, MongoConfigurationError, MongoUnavailableError, connectMongo } from '../db/mongo.js';
import { Product, FASHION_CATEGORIES, PRODUCT_CURRENCIES, type ProductDocument, type ProductVariant } from '../db/models/Product.js';
import { Store } from '../db/models/Store.js';
import { User } from '../db/models/User.js';
import {
  CatalogError,
  errorResponse,
  getFeaturedPublicProducts,
  getNewArrivalPublicProducts,
  getPublicCategories,
  getPublicProduct,
  getPublicStore,
  listNearbyStores,
  listNearbyPublicProducts,
  listPublicProducts,
  listPublicStores,
  publicStore,
  type PublicProductQuery,
} from './catalog.js';
import {
  AuthConfigurationError,
  AuthRequestError,
  createSession,
  generateOtp,
  hashOtp,
  otpSimulationEnabled,
  requireMongoUser,
  safeAuthUser,
} from './session.js';

const { Types } = mongoose;

const router = express.Router();

const FORBIDDEN_CLIENT_FIELDS = new Set([
  'ownerId',
  'sellerId',
  'verified',
  'isVerified',
  'verifiedAt',
  'locationVerified',
  'verifiedBadges',
  'badges',
  'otpHash',
  'otpExpiresAt',
  'otpAttempts',
  'password',
  'passwordHash',
]);

type ProductInput = Record<string, unknown>;

function sendError(response: Response, error: unknown): void {
  if (error instanceof AuthRequestError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof AuthConfigurationError) {
    response.status(503).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof MongoConfigurationError) {
    response.status(error.code === 'INVALID_CATALOG_SOURCE' ? 500 : 503).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error instanceof MongoUnavailableError) {
    response.status(503).json({
      error: { code: 'MONGODB_UNAVAILABLE', message: 'MongoDB is unavailable. Check the MongoDB deployment and MONGODB_URI.' },
    });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.' } });
    return;
  }
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: { code: 'INVALID_ID', message: 'A supplied id is invalid.' } });
    return;
  }
  const normalized = errorResponse(error);
  response.status(normalized.status).json(normalized.body);
}

function handle(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch((error) => {
      if (response.headersSent) {
        next(error);
        return;
      }
      sendError(response, error);
    });
  };
}

function mongoOnly(handler: RequestHandler): RequestHandler {
  return handle(async (request, response, next) => {
    if (getCatalogSource() !== 'mongo') {
      next();
      return;
    }
    await handler(request, response, next);
  });
}

function objectBody(request: Request): Record<string, unknown> {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    throw new CatalogError(400, 'INVALID_BODY', 'Request body must be a JSON object.');
  }
  return request.body as Record<string, unknown>;
}

function rejectForbiddenFields(body: Record<string, unknown>): void {
  const forbidden = Object.keys(body).find((key) => FORBIDDEN_CLIENT_FIELDS.has(key));
  if (forbidden) {
    throw new CatalogError(400, 'FORBIDDEN_FIELD', `${forbidden} is managed by the server.`);
  }
}

function stringValue(value: unknown, field: string, max = 500): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new CatalogError(400, 'INVALID_FIELD', `${field} must be a string of at most ${max} characters.`);
  }
  return value.trim();
}

function finiteNonNegative(value: unknown, field: string, max: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new CatalogError(400, 'INVALID_NUMBER', `${field} must be a finite non-negative number.`);
  }
  return number;
}

function integerNonNegative(value: unknown, field: string, max: number): number {
  const number = finiteNonNegative(value, field, max);
  if (!Number.isInteger(number)) {
    throw new CatalogError(400, 'INVALID_NUMBER', `${field} must be a non-negative integer.`);
  }
  return number;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new CatalogError(400, 'INVALID_FIELD', `${field} must be a boolean.`);
}

function validPhone(value: unknown): string {
  if (typeof value !== 'string') throw new CatalogError(400, 'INVALID_PHONE', 'phone is required.');
  const phone = value.trim().replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    throw new CatalogError(400, 'INVALID_PHONE', 'phone must contain 7 to 15 digits.');
  }
  return phone;
}

function validCategory(value: unknown): string {
  const category = stringValue(value, 'category', 80);
  if (!category || !(FASHION_CATEGORIES as readonly string[]).includes(category)) {
    throw new CatalogError(400, 'INVALID_CATEGORY', `category must be one of the supported fashion categories.`);
  }
  return category;
}

function validCurrency(value: unknown): 'USD' | 'INR' {
  const currency = value == null || value === '' ? 'USD' : String(value).trim();
  if (!(PRODUCT_CURRENCIES as readonly string[]).includes(currency)) {
    throw new CatalogError(400, 'INVALID_CURRENCY', 'currency must be USD or INR.');
  }
  return currency as 'USD' | 'INR';
}

function validHttpsImages(value: unknown): string[] {
  if (value == null) return [];
  const images = Array.isArray(value) ? value : [value];
  if (images.length > 10) throw new CatalogError(400, 'TOO_MANY_IMAGES', 'A product may contain at most 10 images.');
  const result = images.map((image, index) => {
    if (typeof image !== 'string' || !/^https:\/\/[^\s]+$/i.test(image) || image.length > 2_000) {
      throw new CatalogError(400, 'INVALID_IMAGE_URL', `images[${index}] must be an HTTPS URL.`);
    }
    return image;
  });
  return result;
}

function validTags(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) {
    throw new CatalogError(400, 'INVALID_TAGS', 'tags must contain at most 50 strings.');
  }
  return value.map((tag, index) => {
    if (typeof tag !== 'string' || tag.trim().length === 0 || tag.trim().length > 80) {
      throw new CatalogError(400, 'INVALID_TAGS', `tags[${index}] is invalid.`);
    }
    return tag.trim();
  });
}

function validAttributes(value: unknown): Record<string, string> {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new CatalogError(400, 'INVALID_ATTRIBUTES', 'attributes must be an object of strings.');
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 30) throw new CatalogError(400, 'INVALID_ATTRIBUTES', 'attributes may contain at most 30 fields.');
  const result: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, item] of entries) {
    if (
      !/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key) ||
      FORBIDDEN_CLIENT_FIELDS.has(key) ||
      /^(constructor|prototype)$/i.test(key)
    ) {
      throw new CatalogError(400, 'INVALID_ATTRIBUTES', `attributes.${key} is not allowed.`);
    }
    if (typeof item !== 'string' || item.length > 120) {
      throw new CatalogError(400, 'INVALID_ATTRIBUTES', `attributes.${key} must be a string of at most 120 characters.`);
    }
    result[key] = item.trim();
  }
  return result;
}

function validAiMetadata(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new CatalogError(400, 'INVALID_AI_METADATA', 'aiMetadata must be an object.');
  }
  const metadata = value as Record<string, unknown>;
  if (JSON.stringify(metadata).length > 20_000) {
    throw new CatalogError(400, 'INVALID_AI_METADATA', 'aiMetadata is too large.');
  }
  return metadata;
}

function variantsFromInput(body: ProductInput): ProductVariant[] {
  const source = body.variants ?? body.sizes;
  if (source != null) {
    if (!Array.isArray(source) || source.length > 100) {
      throw new CatalogError(400, 'INVALID_VARIANTS', 'variants must contain at most 100 entries.');
    }
    return source.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new CatalogError(400, 'INVALID_VARIANTS', `variants[${index}] is invalid.`);
      }
      const row = item as Record<string, unknown>;
      const size = stringValue(row.size ?? row.sizeLabel, `variants[${index}].size`, 40);
      const color = stringValue(row.color, `variants[${index}].color`, 60);
      const quantityValue = row.quantity ?? row.stockQuantity ?? row.stock ?? 0;
      const quantity = integerNonNegative(quantityValue, `variants[${index}].quantity`, 1_000_000);
      return { ...(size ? { size } : {}), ...(color ? { color } : {}), quantity };
    });
  }

  if (body.stock != null) {
    return [{ size: 'One Size', quantity: integerNonNegative(body.stock, 'stock', 100_000_000) }];
  }
  return [];
}

function productPayload(body: ProductInput, existing?: ProductDocument): Record<string, unknown> {
  rejectForbiddenFields(body);
  const payload: Record<string, unknown> = {};
  const category = body.category == null && existing ? existing.category : validCategory(body.category);
  if (category) payload.category = category;

  const name = body.name == null && existing ? existing.name : stringValue(body.name, 'name', 160);
  if (!name) throw new CatalogError(400, 'INVALID_NAME', 'name is required.');
  payload.name = name;

  const textFields = ['subcategory', 'brand', 'color', 'secondaryColor', 'pattern', 'gender', 'occasion', 'style', 'description', 'sku'] as const;
  for (const field of textFields) {
    if (body[field] !== undefined) payload[field] = stringValue(body[field], field, field === 'description' ? 5_000 : 160);
  }

  if (body.price !== undefined || !existing) {
    payload.price = finiteNonNegative(body.price, 'price', 10_000_000);
  }
  if (body.compareAtPrice !== undefined || body.mrp !== undefined) {
    payload.compareAtPrice = finiteNonNegative(body.compareAtPrice ?? body.mrp, 'compareAtPrice', 10_000_000);
  }
  if (body.currency !== undefined || !existing) payload.currency = validCurrency(body.currency);

  if (body.images !== undefined || body.imageUrl !== undefined) {
    const imageInput = body.images !== undefined ? body.images : body.imageUrl;
    payload.images = validHttpsImages(imageInput);
  }
  if (body.variants !== undefined || body.sizes !== undefined || body.stock !== undefined || !existing) {
    payload.variants = variantsFromInput(body);
  }
  if (body.tags !== undefined) payload.tags = validTags(body.tags);
  if (body.attributes !== undefined) payload.attributes = validAttributes(body.attributes);
  if (body.aiMetadata !== undefined || body.aiData !== undefined) {
    payload.aiMetadata = validAiMetadata(body.aiMetadata ?? body.aiData);
  }
  if (body.isArchived !== undefined) {
    if (typeof body.isArchived !== 'boolean') throw new CatalogError(400, 'INVALID_FIELD', 'isArchived must be a boolean.');
    payload.isArchived = body.isArchived;
  }
  return payload;
}

async function ownedStore(userId: string, requestedStoreId?: unknown) {
  if (requestedStoreId != null) {
    if (typeof requestedStoreId !== 'string' || !Types.ObjectId.isValid(requestedStoreId)) {
      throw new CatalogError(400, 'INVALID_STORE_ID', 'storeId must be a valid store id.');
    }
    const store = await Store.findOne({ _id: requestedStoreId, ownerId: userId });
    if (!store) throw new AuthRequestError('FORBIDDEN', 'The selected store is not owned by this seller.', 403);
    return store;
  }
  const store = await Store.findOne({ ownerId: userId }).sort({ createdAt: 1 });
  if (!store) {
    throw new CatalogError(400, 'STORE_REQUIRED', 'Create a store profile before adding inventory.');
  }
  return store;
}

function sellerProduct(product: ProductDocument & { _id?: unknown }): Record<string, unknown> {
  const variants = (product.variants || []).map((variant, index) => ({
    id: String((variant as { _id?: unknown })._id || `${String(product._id)}-variant-${index + 1}`),
    productId: String(product._id),
    sizeLabel: variant.size || variant.color || 'One Size',
    size: variant.size || null,
    color: variant.color || null,
    stockQuantity: variant.quantity,
  }));
  return {
    id: String(product._id),
    sellerId: String(product.sellerId),
    storeId: String(product.storeId),
    name: product.name,
    category: product.category,
    subcategory: product.subcategory || null,
    brand: product.brand || null,
    color: product.color || null,
    secondaryColor: product.secondaryColor || null,
    pattern: product.pattern || null,
    gender: product.gender || null,
    occasion: product.occasion || null,
    style: product.style || null,
    price: product.price,
    mrp: product.compareAtPrice ?? null,
    compareAtPrice: product.compareAtPrice ?? null,
    currency: product.currency,
    stock: product.totalStock,
    totalStock: product.totalStock,
    status: product.status,
    imageUrl: product.images?.[0] || null,
    images: product.images || [],
    description: product.description || null,
    sku: product.sku || null,
    tags: product.tags || [],
    attributes: product.attributes instanceof Map ? Object.fromEntries(product.attributes.entries()) : product.attributes || {},
    aiMetadata: product.aiMetadata || null,
    sizes: variants,
    variants,
    isArchived: product.isArchived,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function profileResponse(user: Record<string, unknown>, store: { _id?: unknown } | null): Record<string, unknown> {
  const response = safeAuthUser(user as { phone: string; name?: string; role: 'customer' | 'seller'; email?: string; _id?: unknown });
  if (!store) return response;
  const safeStore = publicStore(store as never);
  return {
    ...response,
    ...safeStore,
  };
}

async function handleRequestOtp(request: Request, response: Response): Promise<void> {
  await connectMongo();
  const body = objectBody(request);
  const phone = validPhone(body.phone);
  const requestedRole = body.role == null ? 'customer' : body.role;
  if (requestedRole !== 'customer' && requestedRole !== 'seller') {
    throw new CatalogError(400, 'INVALID_ROLE', 'role must be customer or seller.');
  }
  if (requestedRole === 'seller' && !otpSimulationEnabled()) {
    throw new AuthRequestError('ROLE_ASSIGNMENT_NOT_ALLOWED', 'Seller accounts must be provisioned before OTP login.', 403);
  }

  let user = await User.findOne({ phone }).select('+otpHash +otpExpiresAt +otpAttempts +otpRequestedAt').exec();
  if (user?.otpRequestedAt && Date.now() - user.otpRequestedAt.getTime() < 30_000) {
    throw new AuthRequestError('OTP_RATE_LIMITED', 'Please wait before requesting another OTP.', 429);
  }
  if (!user) user = new User({ phone, role: requestedRole });

  const otp = generateOtp();
  user.set({
    otpHash: hashOtp(phone, otp),
    otpExpiresAt: new Date(Date.now() + 5 * 60_000),
    otpAttempts: 0,
    otpRequestedAt: new Date(),
  });
  await user.save();

  if (!otpSimulationEnabled()) {
    throw new AuthRequestError(
      'OTP_DELIVERY_NOT_CONFIGURED',
      'OTP delivery is not configured. Enable DEV_AUTH_SIMULATION for the local simulation.',
      503,
    );
  }

  response.json({ ok: true, mode: 'simulation', expiresInSeconds: 300, devOtp: otp });
}

async function handleVerifyOtp(request: Request, response: Response): Promise<void> {
  await connectMongo();
  const body = objectBody(request);
  const phone = validPhone(body.phone);
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  if (!/^\d{6}$/.test(otp)) throw new CatalogError(400, 'INVALID_OTP', 'otp must be a 6 digit code.');
  const user = await User.findOne({ phone }).select('+email +otpHash +otpExpiresAt +otpAttempts +otpRequestedAt').exec();
  if (!user || !user.otpHash || !user.otpExpiresAt) {
    throw new AuthRequestError('OTP_INVALID', 'The OTP is invalid or expired.');
  }
  const isNewUser = !user.lastVerifiedAt;
  if (user.otpAttempts >= 5) {
    throw new AuthRequestError('OTP_LOCKED', 'Too many invalid OTP attempts. Request a new OTP.', 429);
  }
  if (user.otpExpiresAt.getTime() < Date.now()) {
    user.set({ otpHash: undefined, otpExpiresAt: undefined, otpAttempts: 0 });
    await user.save();
    throw new AuthRequestError('OTP_EXPIRED', 'The OTP is invalid or expired.');
  }

  const expected = Buffer.from(user.otpHash, 'hex');
  const received = Buffer.from(hashOtp(phone, otp), 'hex');
  const valid = expected.length === received.length && timingSafeEqual(expected, received);
  if (!valid) {
    user.otpAttempts += 1;
    await user.save();
    throw new AuthRequestError('OTP_INVALID', 'The OTP is invalid or expired.');
  }

  const name = stringValue(body.name, 'name', 120);
  user.set({
    ...(name ? { name } : {}),
    otpHash: undefined,
    otpExpiresAt: undefined,
    otpAttempts: 0,
    otpRequestedAt: undefined,
    lastVerifiedAt: new Date(),
  });
  await user.save();
  response.json({ user: safeAuthUser(user.toObject()), token: createSession(String(user._id), user.role), isNewUser });
}

async function handleDevLogin(request: Request, response: Response): Promise<void> {
  if (!otpSimulationEnabled()) {
    throw new AuthRequestError('AUTH_USE_OTP', 'Use request-otp and verify-otp in production.', 400);
  }
  await connectMongo();
  const body = objectBody(request);
  const phone = validPhone(body.phone);
  const name = stringValue(body.name, 'name', 120);
  let user = await User.findOne({ phone }).select('+email').exec();
  const isNewUser = !user;
  if (!user) user = new User({ phone, role: 'seller', ...(name ? { name } : {}) });
  else if (name) user.name = name;
  await user.save();
  response.json({ user: safeAuthUser(user.toObject()), token: createSession(String(user._id), user.role), isNewUser });
}

const authRequestOtp = mongoOnly(handleRequestOtp);
const authVerifyOtp = mongoOnly(handleVerifyOtp);
const authLogin = mongoOnly(handleDevLogin);

router.post('/auth/request-otp', authRequestOtp);
router.post('/auth/verify-otp', authVerifyOtp);
router.post('/auth/login', authLogin);

router.get(
  '/profile',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request);
      const store = await Store.findOne({ ownerId: user._id }).lean();
      response.json(profileResponse(user as unknown as Record<string, unknown>, store));
    }),
  ),
);

router.put(
  '/profile',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      const body = objectBody(request);
      const highRisk = ['ownerId', 'locationVerified', 'verified', 'badges'];
      const suppliedRisk = highRisk.find((field) => field in body);
      if (suppliedRisk) throw new CatalogError(400, 'FORBIDDEN_FIELD', `${suppliedRisk} is managed by the server.`);

      const name = stringValue(body.shopName ?? body.name, 'shopName', 160) || user.name || 'My Store';
      const category = stringValue(body.shopCategory ?? body.category, 'shopCategory', 100);
      const formatted = stringValue(body.formattedAddress ?? body.shopAddress, 'shopAddress', 500);
      const line1 = stringValue(body.shopAddress, 'shopAddress', 200);
      const latitude = body.latitude == null ? undefined : Number(body.latitude);
      const longitude = body.longitude == null ? undefined : Number(body.longitude);
      if ((latitude !== undefined || longitude !== undefined) &&
          (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180)) {
        throw new CatalogError(400, 'INVALID_LOCATION', 'latitude and longitude must be valid coordinates.');
      }

      const storeUpdate: Record<string, unknown> = {
        name,
        ...(category ? { category } : {}),
        address: {
          line1,
          formatted,
          city: stringValue(body.city, 'city', 100),
          district: stringValue(body.district, 'district', 100),
          state: stringValue(body.state, 'state', 100),
          postalCode: stringValue(body.postalCode, 'postalCode', 20),
          country: stringValue(body.country, 'country', 100) || 'US',
        },
        ...(latitude !== undefined && longitude !== undefined
          ? { location: { type: 'Point', coordinates: [longitude, latitude] } }
          : {}),
        ...(body.logo !== undefined ? { logo: stringValue(body.logo, 'logo', 500) } : {}),
        ...(body.banner !== undefined ? { banner: stringValue(body.banner, 'banner', 500) } : {}),
        ...(body.isStoreOpen !== undefined
          ? { isOpen: booleanValue(body.isStoreOpen, 'isStoreOpen') }
          : body.isOpen !== undefined
            ? { isOpen: booleanValue(body.isOpen, 'isOpen') }
            : {}),
      };

      const store = await Store.findOneAndUpdate(
        { ownerId: user._id },
        { $set: storeUpdate, $setOnInsert: { ownerId: user._id } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).lean();
      if (body.name !== undefined) {
        await User.updateOne(
          { _id: user._id },
          { $set: { name: stringValue(body.name, 'name', 120) || user.name } },
        ).exec();
        user.name = stringValue(body.name, 'name', 120) || user.name;
      }
      response.json(profileResponse(user as unknown as Record<string, unknown>, store));
    }),
  ),
);

router.get(
  '/products',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      const page = Math.max(1, Math.floor(Number(request.query.page) || 1));
      const limit = Math.min(100, Math.max(1, Math.floor(Number(request.query.limit) || 20)));
      const filter: Record<string, unknown> = { sellerId: user._id };
      if (typeof request.query.search === 'string' && request.query.search.trim()) {
        const search = request.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [{ name: new RegExp(search, 'i') }, { sku: new RegExp(search, 'i') }];
      }
      if (typeof request.query.category === 'string' && request.query.category !== 'All') filter.category = request.query.category;
      if (typeof request.query.status === 'string' && request.query.status !== 'All') filter.status = request.query.status;
      const [documents, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
        Product.countDocuments(filter),
      ]);
      response.json({
        data: documents.map((document) => sellerProduct(document)),
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
      });
    }),
  ),
);

router.post(
  '/products',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      const body = objectBody(request);
      const store = await ownedStore(String(user._id), body.storeId);
      const payload = productPayload(body);
      const product = new Product({
        ...payload,
        sellerId: user._id,
        storeId: store._id,
        badges: [],
      });
      await product.save();
      response.status(201).json(sellerProduct(product));
    }),
  ),
);

router.get(
  '/products/nearby',
  handle(async (request, response) => {
    const lat = Number(request.query.lat ?? request.query.latitude);
    const lng = Number(request.query.lng ?? request.query.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      response.json({ data: [] });
      return;
    }
    const products = await listNearbyPublicProducts(lat, lng, Number(request.query.radius) || 25_000);
    response.json({ data: products });
  }),
);

router.put(
  '/products/:id',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      if (!Types.ObjectId.isValid(request.params.id)) throw new CatalogError(400, 'INVALID_ID', 'A supplied id is invalid.');
      const product = await Product.findOne({ _id: request.params.id, sellerId: user._id });
      if (!product) throw new CatalogError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      const body = objectBody(request);
      if (body.storeId !== undefined) {
        const store = await ownedStore(String(user._id), body.storeId);
        if (String(store._id) !== String(product.storeId)) {
          throw new CatalogError(400, 'OWNERSHIP_IMMUTABLE', 'A product store cannot be changed after creation.');
        }
      }
      const payload = productPayload(body, product);
      product.set(payload);
      await product.save();
      response.json(sellerProduct(product));
    }),
  ),
);

router.delete(
  '/products/:id',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      if (!Types.ObjectId.isValid(request.params.id)) throw new CatalogError(400, 'INVALID_ID', 'A supplied id is invalid.');
      const deleted = await Product.findOneAndUpdate(
        { _id: request.params.id, sellerId: user._id },
        { $set: { isArchived: true } },
        { new: true },
      );
      if (!deleted) throw new CatalogError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      response.json({ success: true, id: request.params.id });
    }),
  ),
);

router.post(
  '/products/:id/duplicate',
  mongoOnly(
    handle(async (request, response) => {
      await connectMongo();
      const user = await requireMongoUser(request, 'seller');
      if (!Types.ObjectId.isValid(request.params.id)) throw new CatalogError(400, 'INVALID_ID', 'A supplied id is invalid.');
      const original = await Product.findOne({ _id: request.params.id, sellerId: user._id, isArchived: false });
      if (!original) throw new CatalogError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      const duplicate = new Product({
        sellerId: original.sellerId,
        storeId: original.storeId,
        name: `${original.name} (Copy)`.slice(0, 160),
        category: original.category,
        subcategory: original.subcategory,
        brand: original.brand,
        color: original.color,
        secondaryColor: original.secondaryColor,
        pattern: original.pattern,
        gender: original.gender,
        occasion: original.occasion,
        style: original.style,
        price: original.price,
        compareAtPrice: original.compareAtPrice,
        currency: original.currency,
        images: [...original.images],
        variants: original.variants.map((variant) => ({ size: variant.size, color: variant.color, quantity: variant.quantity })),
        description: original.description,
        sku: original.sku ? `${original.sku}-COPY`.slice(0, 80) : undefined,
        tags: [...original.tags],
        attributes: original.attributes,
        badges: [],
      });
      await duplicate.save();
      response.status(201).json(sellerProduct(duplicate));
    }),
  ),
);

router.get(
  '/stores',
  handle(async (request, response) => {
    const data = await listPublicStores();
    response.json({ data, updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/stores/nearby',
  handle(async (request, response) => {
    const lat = Number(request.query.lat ?? request.query.latitude);
    const lng = Number(request.query.lng ?? request.query.longitude);
    const data = await listNearbyStores(lat, lng, Number(request.query.radius) || 25_000);
    response.json({ data, updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/stores/:id',
  handle(async (request, response) => {
    const details = await getPublicStore(request.params.id);
    if (!details) throw new CatalogError(404, 'STORE_NOT_FOUND', 'Store not found.');
    response.json({ ...details, data: details, updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/catalog/products',
  handle(async (request, response) => {
    const result = await listPublicProducts(request.query as PublicProductQuery);
    response.json({ ...result, updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/catalog/products/:id',
  handle(async (request, response) => {
    const product = await getPublicProduct(request.params.id);
    if (!product) throw new CatalogError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    response.json({ data: product, updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/catalog/featured-products',
  handle(async (request, response) => {
    response.json({ data: await getFeaturedPublicProducts(Number(request.query.limit) || 10), updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/catalog/new-arrivals',
  handle(async (request, response) => {
    response.json({ data: await getNewArrivalPublicProducts(Number(request.query.limit) || 15), updatedAt: new Date().toISOString() });
  }),
);

router.get(
  '/catalog/categories',
  handle(async (_request, response) => {
    response.json({ data: await getPublicCategories(), updatedAt: new Date().toISOString() });
  }),
);

function deterministicTags(body: ProductInput): { tags: string[]; attributes: Record<string, string> } {
  const text = [body.name, body.description, body.category, body.brand, body.color, body.style]
    .filter((item): item is string => typeof item === 'string')
    .join(' ')
    .toLowerCase();
  const words = text.match(/[a-z0-9][a-z0-9-]{2,}/g) || [];
  const stopWords = new Set(['the', 'and', 'with', 'for', 'from', 'this', 'that', 'fashion', 'style']);
  const tags = Array.from(new Set(words.filter((word) => !stopWords.has(word)))).slice(0, 12);
  const category = typeof body.category === 'string' ? body.category : undefined;
  if (category && !tags.includes(category.toLowerCase())) tags.unshift(category.toLowerCase());
  return {
    tags,
    attributes: {
      ...(typeof body.color === 'string' ? { color: body.color.trim() } : {}),
      ...(typeof body.brand === 'string' ? { brand: body.brand.trim() } : {}),
      ...(category ? { category } : {}),
    },
  };
}

async function handleAiTag(request: Request, response: Response): Promise<void> {
  const body = objectBody(request);
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    response.json({ mode: 'mock', ...deterministicTags(body) });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Return JSON with a tags array (at most 12 short fashion tags) and an attributes object (at most 10 string fields) for this product. Do not infer image content. Product input: ${JSON.stringify({
                name: body.name,
                description: body.description,
                category: body.category,
                brand: body.brand,
                color: body.color,
                style: body.style,
              })}`,
            },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });
    const parsed = JSON.parse(result.text || '{}') as { tags?: unknown; attributes?: unknown };
    response.json({
      mode: 'gemini',
      tags: validTags(parsed.tags || []),
      attributes: validAttributes(parsed.attributes || {}),
    });
  } catch {
    throw new CatalogError(502, 'AI_PROVIDER_UNAVAILABLE', 'The configured AI provider could not tag this product.');
  }
}

router.post('/ai/tag', handle(handleAiTag));
router.post('/ai/tag-product', handle(handleAiTag));

export { router as mongoRouter };
export default router;
