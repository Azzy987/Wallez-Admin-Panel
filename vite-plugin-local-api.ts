import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

type CategoryDraftEntry = {
  name: string;
  thumbnail: string;
  sortOrder: number;
};

const CATEGORIES_FILE = path.resolve(__dirname, 'src/data/wallez-categories.json');

function parseSortOrder(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

function normalizeCategoryDraftEntry(raw: unknown, index = 0): CategoryDraftEntry | null {
  if (typeof raw === 'string') {
    const name = raw.trim();
    return name ? { name, thumbnail: '', sortOrder: index } : null;
  }
  if (raw && typeof raw === 'object' && 'name' in raw) {
    const record = raw as { name?: unknown; thumbnail?: unknown; sortOrder?: unknown };
    const name = String(record.name ?? '').trim();
    if (!name) return null;
    return {
      name,
      thumbnail: String(record.thumbnail ?? '').trim(),
      sortOrder: parseSortOrder(record.sortOrder, index),
    };
  }
  return null;
}

function normalizeCategoryDraftEntries(raw: unknown): CategoryDraftEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => normalizeCategoryDraftEntry(entry, index))
    .filter((entry): entry is CategoryDraftEntry => entry !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readCategoriesFile(): Record<string, unknown> {
  if (!fs.existsSync(CATEGORIES_FILE)) {
    return { categories: [], updatedAt: null };
  }
  const parsed = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
  return {
    ...parsed,
    categories: normalizeCategoryDraftEntries(parsed.categories),
  };
}

function writeCategoriesFile(categories: CategoryDraftEntry[]): Record<string, unknown> {
  const payload = {
    categories: normalizeCategoryDraftEntries(categories),
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(CATEGORIES_FILE), { recursive: true });
  fs.writeFileSync(CATEGORIES_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  return payload;
}

async function handleCategoriesApi(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, readCategoriesFile());
  }

  if (req.method === 'PUT') {
    try {
      const body = await readJsonBody(req);
      const categories = normalizeCategoryDraftEntries(body.categories);
      const saved = writeCategoriesFile(categories);
      return sendJson(res, 200, saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save categories';
      return sendJson(res, 500, { error: message });
    }
  }

  return sendJson(res, 405, { error: 'Method not allowed' });
}

export function localApiPlugin(): Plugin {
  return {
    name: 'wallez-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0];

        if (pathname === '/api/categories') {
          return handleCategoriesApi(req, res);
        }

        if (pathname !== '/api/s3-presign-upload') {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
          'Access-Control-Allow-Headers',
          'authorization, x-client-info, apikey, content-type'
        );
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        if (req.method !== 'POST') {
          return sendJson(res, 405, { error: 'Method not allowed' });
        }

        try {
          const env = loadEnv(server.config.mode, server.config.root, '');
          Object.assign(process.env, env);

          const body = await readJsonBody(req);
          const { handleS3PresignUpload } = await import('./api/lib/s3PresignHandler');
          const result = await handleS3PresignUpload(body);
          sendJson(res, result.status, result.body);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Local API /api/s3-presign-upload error:', error);
          sendJson(res, 500, { error: 'Unexpected error', message });
        }
      });
    },
  };
};
