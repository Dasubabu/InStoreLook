import mongoose, { type HydratedDocument, type Model } from 'mongoose';

const { Schema, model, models } = mongoose;

export const USER_ROLES = ['customer', 'seller'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserDocument {
  phone: string;
  name?: string;
  email?: string;
  role: UserRole;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  otpRequestedAt?: Date;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      minlength: 7,
      maxlength: 32,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'customer',
      index: true,
    },
    otpHash: {
      type: String,
      maxlength: 128,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
      select: false,
    },
    otpRequestedAt: {
      type: Date,
      select: false,
    },
    lastVerifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

export type UserModel = Model<UserDocument>;
export type UserRecord = HydratedDocument<UserDocument>;

export const User: UserModel = (models.User as UserModel | undefined) || model<UserDocument>('User', userSchema);
