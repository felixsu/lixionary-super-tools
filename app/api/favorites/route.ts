import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMongoClient, hasMongo, DB_NAME } from '@/lib/db';
import { isToolId, MAX_FAVORITES } from '@/lib/tools';

// Favourite tool ids live on the Auth.js user document ("favorites" field).
// The backend stores only the user and these ids (per spec).

async function usersCollection() {
  const client = await getMongoClient();
  return client.db(DB_NAME).collection('users');
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (!hasMongo()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const users = await usersCollection();
  const user = await users.findOne({ email: session.user.email });
  const favorites = Array.isArray(user?.favorites) ? user.favorites.filter(isToolId) : [];
  return NextResponse.json({ favorites });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  if (!hasMongo()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const raw = (body as { favorites?: unknown })?.favorites;
  if (!Array.isArray(raw) || !raw.every(id => typeof id === 'string' && isToolId(id))) {
    return NextResponse.json({ error: 'favorites must be an array of known tool ids' }, { status: 400 });
  }
  const favorites = [...new Set(raw)].slice(0, MAX_FAVORITES);
  const users = await usersCollection();
  await users.updateOne({ email: session.user.email }, { $set: { favorites } });
  return NextResponse.json({ favorites });
}
