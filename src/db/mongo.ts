import mongoose from 'mongoose';

export type CatalogSource = 'demo' | 'mongo';

export class MongoConfigurationError extends Error {
  readonly code: 'MONGODB_NOT_CONFIGURED' | 'INVALID_CATALOG_SOURCE';

  constructor(code: 'MONGODB_NOT_CONFIGURED' | 'INVALID_CATALOG_SOURCE', message: string) {
    super(message);
    this.name = 'MongoConfigurationError';
    this.code = code;
  }
}

export class MongoUnavailableError extends Error {
  readonly code = 'MONGODB_UNAVAILABLE' as const;

  constructor(message = 'MongoDB is unavailable') {
    super(message);
    this.name = 'MongoUnavailableError';
  }
}

interface MongoCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
}

const globalForMongo = globalThis as typeof globalThis & {
  __instorelookMongo?: MongoCache;
};

const cache: MongoCache = globalForMongo.__instorelookMongo || {
  connection: null,
  promise: null,
  uri: null,
};

if (!globalForMongo.__instorelookMongo) {
  globalForMongo.__instorelookMongo = cache;
}

/**
 * Resolve the catalog mode at request/startup time. The default is deliberately
 * the existing demo adapter; an invalid value is a configuration error rather
 * than an implicit fallback to demo data.
 */
export function getCatalogSource(): CatalogSource {
  const source = (process.env.CATALOG_SOURCE || 'demo').trim().toLowerCase();
  if (source === '' || source === 'demo') return 'demo';
  if (source === 'mongo') return 'mongo';
  throw new MongoConfigurationError(
    'INVALID_CATALOG_SOURCE',
    'CATALOG_SOURCE must be either "demo" or "mongo".',
  );
}

export function getMongoUri(): string | undefined {
  const uri = process.env.MONGODB_URI?.trim();
  return uri || undefined;
}

export function requireMongoUri(): string {
  const uri = getMongoUri();
  if (!uri) {
    throw new MongoConfigurationError(
      'MONGODB_NOT_CONFIGURED',
      'Mongo catalog mode requires MONGODB_URI to be configured.',
    );
  }
  return uri;
}

/**
 * Open MongoDB lazily and reuse the connection/promise across serverless
 * invocations. This function is intentionally never called at module import.
 */
export async function connectMongo(): Promise<typeof mongoose> {
  const uri = requireMongoUri();

  // This primarily helps tests and local process restarts where env can change.
  // A production process normally has one stable URI for its whole lifetime.
  if (cache.uri && cache.uri !== uri) {
    cache.connection = null;
    cache.promise = null;
  }
  cache.uri = uri;

  if (cache.connection && cache.connection.connection.readyState === 0) {
    cache.connection = null;
    cache.promise = null;
  }

  if (cache.connection && cache.connection.connection.readyState === 1) {
    return cache.connection;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5_000,
        connectTimeoutMS: 5_000,
        maxPoolSize: 10,
        minPoolSize: 0,
        autoIndex: process.env.NODE_ENV !== 'production',
      })
      .then((connection) => {
        cache.connection = connection;
        return connection;
      })
      .catch((error) => {
        cache.connection = null;
        cache.promise = null;
        // Keep connection details, including any URI fragments supplied by a
        // driver error, out of API responses and logs.
        void error;
        throw new MongoUnavailableError();
      });
  }

  return cache.promise;
}
