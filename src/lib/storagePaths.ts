/** S3 root folder for Wallez uploads (same bucket + CloudFront as other apps). */
export const S3_WALLEZ_ROOT = 'wallez';

/** App promo / banner images stay in their own top-level folder. */
export const S3_APP_PROMOS_ROOT = 'app-promos';

/** Convert display names to safe S3 path segments. */
export const formatS3PathSegment = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[&]/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Known style category aliases → folder slug under wallez/ */
const CATEGORY_SLUGS: Record<string, string> = {
  'Pastel Aesthetic': 'pastel-aesthetic',
  'Cozy Vibes': 'cozy-vibes',
  'Wild World': 'wild-world',
  'Space & Cosmos': 'space-cosmos',
  'Liquid Glass': 'liquid-glass',
  'AMOLED & Dark': 'amoled-dark',
  'Depth Effect': 'depth-effect',
  'Sci-Fi & Fantasy': 'sci-fi-fantasy',
  'Movies & TV': 'movies-tv',
};

/**
 * Build S3 directory for a Wallez wallpaper upload.
 * Example: wallez/glass/blue  or  wallez/minimal
 */
export function getWallezUploadDirectory(
  mainCategory?: string,
  subcategory?: string
): string {
  if (!mainCategory?.trim()) {
    return S3_WALLEZ_ROOT;
  }

  const slug =
    CATEGORY_SLUGS[mainCategory] ?? formatS3PathSegment(mainCategory);
  const base = `${S3_WALLEZ_ROOT}/${slug}`;

  if (subcategory && subcategory !== 'None') {
    return `${base}/${formatS3PathSegment(subcategory)}`;
  }

  return base;
}
