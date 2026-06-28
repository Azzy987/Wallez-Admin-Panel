import { createSign } from 'crypto';

type FirestorePrimitive =
  | string
  | number
  | boolean
  | null
  | FirestorePrimitive[]
  | { [key: string]: FirestorePrimitive };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreArrayValue = {
  values?: FirestoreValue[];
};

type FirestoreMapValue = {
  fields?: Record<string, FirestoreValue>;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: FirestoreArrayValue;
  mapValue?: FirestoreMapValue;
};

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://firestore.googleapis.com/v1';

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
}

function getServiceAccountConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim() || 'wallez',
    clientEmail: getEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: getEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  };
}

async function getAccessToken(): Promise<string> {
  const { clientEmail, privateKey } = getServiceAccountConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: TOKEN_AUDIENCE,
    scope: FIRESTORE_SCOPE,
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload)
  )}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const res = await fetch(TOKEN_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to get Google access token: ${message}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function documentId(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1] || name;
}

function parseFirestoreValue(value: FirestoreValue): FirestorePrimitive {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map((entry) => parseFirestoreValue(entry));
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, nested]) => [key, parseFirestoreValue(nested)])
    );
  }
  return null;
}

function parseFirestoreDocument(doc: FirestoreDocument): {
  id: string;
  data: Record<string, FirestorePrimitive>;
} {
  const fields = doc.fields || {};
  return {
    id: documentId(doc.name),
    data: Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, parseFirestoreValue(value)])
    ),
  };
}

async function listCollectionDocuments(
  collectionName: string
): Promise<Array<{ id: string; data: Record<string, FirestorePrimitive> }>> {
  const token = await getAccessToken();
  const { projectId } = getServiceAccountConfig();
  let nextPageToken = '';
  const docs: Array<{ id: string; data: Record<string, FirestorePrimitive> }> = [];

  do {
    const search = new URLSearchParams({ pageSize: '500' });
    if (nextPageToken) search.set('pageToken', nextPageToken);

    const res = await fetch(
      `${API_BASE}/projects/${projectId}/databases/(default)/documents/${collectionName}?${search.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Failed to list ${collectionName}: ${message}`);
    }

    const payload = (await res.json()) as {
      documents?: FirestoreDocument[];
      nextPageToken?: string;
    };

    docs.push(...(payload.documents || []).map(parseFirestoreDocument));
    nextPageToken = payload.nextPageToken || '';
  } while (nextPageToken);

  return docs;
}

function compareWallpapers(
  a: { id: string; data: Record<string, FirestorePrimitive> },
  b: { id: string; data: Record<string, FirestorePrimitive> },
  sortField: string
): number {
  if (sortField === 'wallpaperName') {
    return String(a.data.wallpaperName || '').localeCompare(String(b.data.wallpaperName || ''));
  }

  if (sortField === 'timestamp') {
    const aValue = Date.parse(String(a.data.timestamp || '')) || 0;
    const bValue = Date.parse(String(b.data.timestamp || '')) || 0;
    return bValue - aValue || a.id.localeCompare(b.id);
  }

  const aValue = Number(a.data[sortField] || 0);
  const bValue = Number(b.data[sortField] || 0);
  return bValue - aValue || a.id.localeCompare(b.id);
}

async function getCategoriesPayload() {
  const docs = await listCollectionDocuments('Categories');
  return docs
    .map(({ id, data }) => ({
      categoryName: id,
      name: String(data.name || id),
      thumbnail: String(data.thumbnail || ''),
      sortOrder: Number(data.sortOrder || 0),
      wallpaperCount: Number(data.wallpaperCount || 0),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

async function getPlatformBannersPayload(collectionName: string) {
  const docs = await listCollectionDocuments(collectionName);
  return docs
    .map(({ id, data }) => ({
      id,
      bannerName: String(data.bannerName || ''),
      bannerUrl: String(data.bannerUrl || ''),
      wallpaperId: typeof data.wallpaperId === 'string' ? data.wallpaperId : undefined,
      bannerType: typeof data.bannerType === 'string' ? data.bannerType : undefined,
      sortOrder: Number(data.sortOrder || 0),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

async function getWallezWallpapersPayload({
  pageSize,
  sortField,
  category,
  cursor,
}: {
  pageSize: number;
  sortField: string;
  category?: string;
  cursor?: string;
}) {
  const docs = await listCollectionDocuments('Wallez');
  const filtered = docs
    .filter(({ data }) => !category || category === 'all' || data.category === category || data.primaryCategory === category)
    .sort((a, b) => compareWallpapers(a, b, sortField));

  const offset = Math.max(0, parseInt(cursor || '0', 10) || 0);
  const wallpapers = filtered.slice(offset, offset + pageSize);
  const nextOffset = offset + wallpapers.length;

  return {
    wallpapers,
    cursor: nextOffset < filtered.length ? String(nextOffset) : null,
    hasMore: nextOffset < filtered.length,
  };
}

async function getDashboardPayload() {
  const [categories, wallpapers] = await Promise.all([
    getCategoriesPayload(),
    listCollectionDocuments('Wallez'),
  ]);

  const styleCategories = categories.filter((cat) => cat.categoryName !== 'Wallez');
  let totalDownloads = 0;
  let totalViews = 0;
  let depthEffectCount = 0;
  let exclusiveCount = 0;

  for (const { data } of wallpapers) {
    totalDownloads += Number(data.downloads || 0);
    totalViews += Number(data.views || 0);
    if (data.depthEffect) depthEffectCount += 1;
    if (data.exclusive) exclusiveCount += 1;
  }

  return {
    homeWallpapers: wallpapers.length,
    totalDownloads,
    totalViews,
    styleCategories: styleCategories.length,
    categoriesWithContent: styleCategories.filter((c) => c.wallpaperCount > 0).length,
    depthEffectCount,
    exclusiveCount,
    categoryBreakdown: styleCategories
      .map((cat) => ({
        name: cat.name,
        count: cat.wallpaperCount,
        thumbnail: cat.thumbnail,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

async function getPaywallWallpapersPayload() {
  const docs = await listCollectionDocuments('PaywallWallpapers');
  return docs
    .filter(({ data }) => typeof data.wallpaperUrl === 'string' && data.wallpaperUrl)
    .map(({ id, data }) => ({
      id,
      wallpaperUrl: String(data.wallpaperUrl),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function handleFirestoreRead(query: Record<string, unknown>) {
  const action = String(query.action || '');

  if (action === 'categories') {
    return { status: 200, body: await getCategoriesPayload() };
  }

  if (action === 'platform-banners') {
    const collectionName = String(query.collection || '');
    if (!collectionName) {
      return { status: 400, body: { error: 'collection is required' } };
    }
    return { status: 200, body: await getPlatformBannersPayload(collectionName) };
  }

  if (action === 'wallpapers') {
    const brand = String(query.brand || '');
    if (brand !== 'Wallez') {
      return { status: 400, body: { error: 'Only Wallez brand is supported by this API' } };
    }
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize || '15'), 10) || 15));
    return {
      status: 200,
      body: await getWallezWallpapersPayload({
        pageSize,
        sortField: String(query.sortField || 'timestamp'),
        category: typeof query.category === 'string' ? query.category : undefined,
        cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
      }),
    };
  }

  if (action === 'dashboard') {
    return { status: 200, body: await getDashboardPayload() };
  }

  if (action === 'paywall-wallpapers') {
    return { status: 200, body: await getPaywallWallpapersPayload() };
  }

  return { status: 400, body: { error: 'Unsupported action' } };
}
