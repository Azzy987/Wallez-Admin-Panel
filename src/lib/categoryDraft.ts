import bundledCategories from '@/data/wallez-categories.json';

export type CategoryDraftEntry = {
  name: string;
  thumbnail: string;
  sortOrder: number;
};

export type CategoryDraftFile = {
  categories: CategoryDraftEntry[];
  updatedAt?: string;
};

const STORAGE_KEY = 'wallez-category-draft';

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

export function normalizeCategoryDraftEntry(
  raw: unknown,
  index = 0
): CategoryDraftEntry | null {
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

export function normalizeCategoryDraftEntries(raw: unknown): CategoryDraftEntry[] {
  if (!Array.isArray(raw)) return [];
  return sortCategoriesByOrder(
    raw
      .map((entry, index) => normalizeCategoryDraftEntry(entry, index))
      .filter((entry): entry is CategoryDraftEntry => entry !== null)
  );
}

export function sortCategoriesByOrder(entries: CategoryDraftEntry[]): CategoryDraftEntry[] {
  return [...entries].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );
}

export function nextCategorySortOrder(entries: CategoryDraftEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((e) => e.sortOrder)) + 1;
}

/** Prefer draft sortOrder; fall back to Firestore when missing. */
export function mergeCategoryDraftWithFirestore(
  entries: CategoryDraftEntry[],
  firestoreSortByName: Map<string, number>
): CategoryDraftEntry[] {
  return sortCategoriesByOrder(
    entries.map((entry, index) => ({
      ...entry,
      sortOrder:
        typeof entry.sortOrder === 'number' && Number.isFinite(entry.sortOrder)
          ? entry.sortOrder
          : (firestoreSortByName.get(entry.name) ?? index),
    }))
  );
}

export function categoryDraftNames(entries: CategoryDraftEntry[]): string[] {
  return entries.map((entry) => entry.name);
}

/** Load the saved category draft (API → localStorage → bundled JSON). */
export async function loadCategoryDraft(): Promise<CategoryDraftFile> {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = (await res.json()) as CategoryDraftFile;
      const normalized = {
        categories: normalizeCategoryDraftEntries(data.categories),
        updatedAt: data.updatedAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    }
  } catch {
    // Static hosting or dev server unavailable — fall through.
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CategoryDraftFile;
      return {
        categories: normalizeCategoryDraftEntries(parsed.categories),
        updatedAt: parsed.updatedAt,
      };
    } catch {
      // Ignore corrupt cache.
    }
  }

  return {
    categories: normalizeCategoryDraftEntries(bundledCategories.categories),
    updatedAt: bundledCategories.updatedAt,
  };
}

/** Persist draft to project JSON (dev API) and localStorage cache. */
export async function saveCategoryDraft(
  categories: CategoryDraftEntry[]
): Promise<CategoryDraftFile> {
  const payload: CategoryDraftFile = {
    categories: sortCategoriesByOrder(normalizeCategoryDraftEntries(categories)),
    updatedAt: new Date().toISOString(),
  };

  const res = await fetch('/api/categories', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to save categories to project file');
  }

  const saved = (await res.json()) as CategoryDraftFile;
  const normalized = {
    categories: normalizeCategoryDraftEntries(saved.categories),
    updatedAt: saved.updatedAt,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
