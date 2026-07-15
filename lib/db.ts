// Cached MongoDB client. Import lazily from API routes only — the client is
// created on first use so the app still boots when MONGODB_URI is unset.

import { MongoClient } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function hasMongo(): boolean {
  return !!process.env.MONGODB_URI;
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

export const DB_NAME = process.env.MONGODB_DB || 'lixionary-super-tools';
