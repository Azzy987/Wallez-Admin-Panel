import categoriesFile from '@/data/wallez-categories.json';
import { categoryDraftNames, normalizeCategoryDraftEntries } from '@/lib/categoryDraft';

/**
 * Wallez Firestore category presets — flat style categories only.
 *
 * The canonical list lives in `src/data/wallez-categories.json` (git-tracked).
 * Edit and save from the Dashboard → Categories section in the admin panel.
 */
export const WALLEZ_BRAND_NAME = 'Wallez';

/** Flat banner collections — `{collection}/{auto-id}` with sortOrder field */
export const BANNERS_IOS_COLLECTION = 'BannersiOS';
export const BANNERS_ANDROID_COLLECTION = 'BannersAndroid';

export type BannerPlatform = 'ios' | 'android';

export const getBannerCollectionForPlatform = (platform: BannerPlatform): string =>
  platform === 'ios' ? BANNERS_IOS_COLLECTION : BANNERS_ANDROID_COLLECTION;

/** Brand doc maps to the Wallez Firestore collection; not shown in the app category grid. */
export const isBrandCategory = (categoryName: string): boolean =>
  categoryName === WALLEZ_BRAND_NAME;

/** Browsable style categories (Anime, Cute, Liquid Glass, etc.). */
export const isStyleCategory = (categoryName: string): boolean =>
  categoryName !== WALLEZ_BRAND_NAME;

/** Full entries from the saved project file. */
export const WALLEZ_CATEGORY_ENTRIES = normalizeCategoryDraftEntries(categoriesFile.categories);

/** Names only — used where a flat string list is needed. */
export const WALLEZ_FLAT_CATEGORIES: string[] = categoryDraftNames(WALLEZ_CATEGORY_ENTRIES);

export const WALLEZ_CATEGORY_SUMMARY = {
  mainCount: WALLEZ_FLAT_CATEGORIES.length,
  flatCategories: WALLEZ_FLAT_CATEGORIES,
};
