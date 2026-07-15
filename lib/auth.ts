import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { getMongoClient, hasMongo, DB_NAME } from './db';

// Google SSO only (per spec). Without Mongo the adapter is skipped and
// sessions fall back to JWT cookies, so the app still runs locally —
// favourites then only live in localStorage.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(hasMongo()
    ? { adapter: MongoDBAdapter(getMongoClient, { databaseName: DB_NAME }) }
    : {}),
  session: { strategy: 'jwt' },
  trustHost: true,
  // Without Google creds sign-in is impossible, so a placeholder secret is
  // harmless and keeps /api/auth/* from erroring in an unconfigured app.
  // With creds present, a missing AUTH_SECRET still fails loudly.
  // `||` (not `??`): docker-compose passes unset variables as empty strings.
  secret: process.env.AUTH_SECRET || (process.env.AUTH_GOOGLE_ID ? undefined : 'unconfigured-dev-placeholder'),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
});
