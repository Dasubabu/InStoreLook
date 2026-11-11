import mongoose, { type HydratedDocument, type Model, type Types as MongooseTypes } from 'mongoose';

const { Schema, model, models } = mongoose;

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export interface StoreHours {
  day: (typeof DAYS)[number];
  open?: string;
  close?: string;
  closed: boolean;
}

export interface StoreAddress {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

export interface StoreDocument {
  ownerId: MongooseTypes.ObjectId;
  name: string;
  category?: string;
  address: StoreAddress;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  badges: string[];
  hours: StoreHours[];
  isOpen: boolean;
  logo?: string;
  banner?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hoursSchema = new Schema<StoreHours>(
  {
    day: { type: String, enum: DAYS, required: true },
    open: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    close: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    closed: { type: Boolean, default: false },
  },
  { _id: false, strict: 'throw' },
);

const addressSchema = new Schema<StoreAddress>(
  {
    line1: { type: String, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, trim: true, maxlength: 100, default: 'US' },
    formatted: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false, strict: 'throw' },
);

const storeSchema = new Schema<StoreDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: addressSchema,
      default: {},
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: (value: unknown): boolean => {
            if (!Array.isArray(value) || value.length !== 2) return false;
            const [longitude, latitude] = value;
            return (
              typeof longitude === 'number' &&
              typeof latitude === 'number' &&
              Number.isFinite(longitude) &&
              Number.isFinite(latitude) &&
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },
          message: 'location.coordinates must be [longitude, latitude] with valid coordinates',
        },
      },
    },
    badges: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]): boolean => value.length <= 10 && value.every((item) => item.length <= 60),
        message: 'A store may have at most 10 badges of 60 characters each',
      },
    },
    hours: {
      type: [hoursSchema],
      default: [],
      validate: {
        validator: (value: StoreHours[]): boolean => value.length <= 7,
        message: 'A store may define hours for at most 7 days',
      },
    },
    isOpen: { type: Boolean, default: true },
    logo: { type: String, trim: true, maxlength: 500, match: /^https:\/\// },
    banner: { type: String, trim: true, maxlength: 500, match: /^https:\/\// },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

storeSchema.index({ location: '2dsphere' });
storeSchema.index({ name: 'text', category: 'text' });

export type StoreModel = Model<StoreDocument>;
export type StoreRecord = HydratedDocument<StoreDocument>;

export const Store: StoreModel = (models.Store as StoreModel | undefined) || model<StoreDocument>('Store', storeSchema);
