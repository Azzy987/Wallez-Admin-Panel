/** File size: KB when ≤1024 KB, otherwise MB (megabytes). */
export function formatUploadSize(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb <= 1024) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width}x${height}`;
}

export interface ImageAnalysisContext {
  mainCategory?: string;
  subCategory?: string;
  wallpaperName?: string;
  filename?: string;
  dimensions?: string;
}

export interface ImageAnalysisResult {
  width: number;
  height: number;
  dimensions: string;
  fileSizeBytes: number;
  fileSize: string;
  tags: string[];
  colors: string[];
}

const MAX_TAGS = 8;
const MAX_COLORS = 6;
/** Minimum RGB distance² between swatches so similar shades collapse to one. */
const MIN_COLOR_DISTANCE_SQ = 5500;

const TAG_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'jpg', 'jpeg', 'png', 'webp', 'gif',
  'image', 'img', 'pic', 'picture', 'wallpaper', 'background', 'vertical',
  'portrait', 'landscape', 'mobile', 'phone', 'official', 'none', 'wallpapers',
  'hd', 'ultra', '4k', '8k', '1080', '1440', '2160', '3840', 'macro', 'bug',
  'zi', 'wv', 'uw', 'wide', 'fit', 'thumb', 'thumbnail', 'copy', 'final',
]);

const RESOLUTION_TAGS = new Set(['4k', '8k', 'ultra', 'hd']);

/** One primary keyword per flat style category (never the full category name). */
const STYLE_CATEGORY_TAG_MAP: Record<string, string> = {
  Anime: 'anime',
  Gaming: 'gaming',
  'Movies & TV': 'movies',
  Superheroes: 'superhero',
  'Sci-Fi & Fantasy': 'fantasy',
  Cute: 'cute',
  Minimal: 'minimal',
  Motivate: 'motivate',
  Y2K: 'y2k',
  'Liquid Glass': 'glass',
  'Pastel Aesthetic': 'pastel',
  'Cozy Vibes': 'cozy',
  'Wild World': 'nature',
  'Space & Cosmos': 'space',
  'AMOLED & Dark': 'amoled',
  'Depth Effect': 'depth',
};

function rgbToFirestoreColor(r: number, g: number, b: number): string {
  const rr = Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
  const gg = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
  const bb = Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0');
  return `0xFF${rr}${gg}${bb}`.toUpperCase();
}

/** Canonical Firestore color: `0xFFRRGGBB` (uppercase). Used for arrayContains search in the app. */
export function normalizeFirestoreColor(input: string): string | null {
  if (!input?.trim()) return null;
  let hex = input.trim();
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  } else {
    hex = hex.replace('#', '');
  }
  if (hex.length === 8) {
    hex = hex.slice(2);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `0xFF${hex.toUpperCase()}`;
}

export function normalizeFirestoreColors(colors: string[]): string[] {
  const normalized: string[] = [];
  for (const color of colors) {
    const value = normalizeFirestoreColor(color);
    if (value && !normalized.includes(value)) {
      normalized.push(value);
    }
    if (normalized.length >= MAX_COLORS) break;
  }
  return normalized;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function rgbSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function isDistinctRgb(candidate: [number, number, number], picked: [number, number, number][], minDistSq: number): boolean {
  return !picked.some((p) => colorDistance(p, candidate) < minDistSq);
}

function isDistinctFirestoreHex(hex: string, picked: string[]): boolean {
  const canonical = normalizeFirestoreColor(hex);
  if (!canonical) return false;
  return !picked.some((existing) => normalizeFirestoreColor(existing) === canonical);
}

function pushDistinctColor(
  picked: [number, number, number][],
  firestoreHexes: string[],
  rgb: [number, number, number],
  minDistSq: number
): boolean {
  if (!isDistinctRgb(rgb, picked, minDistSq)) return false;
  const hex = rgbToFirestoreColor(rgb[0], rgb[1], rgb[2]);
  if (!isDistinctFirestoreHex(hex, firestoreHexes)) return false;
  picked.push(rgb);
  firestoreHexes.push(hex);
  return true;
}

function extractRegionalColors(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): [number, number, number][] {
  const cols = 3;
  const rows = 2;
  const cellW = Math.max(1, Math.floor(width / cols));
  const cellH = Math.max(1, Math.floor(height / rows));
  const regional: [number, number, number][] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = col * cellW;
      const y0 = row * cellH;
      const x1 = col === cols - 1 ? width : x0 + cellW;
      const y1 = row === rows - 1 ? height : y0 + cellH;

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4;
          const a = pixels[i + 3];
          if (a < 128) continue;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          if (rgbSaturation(r, g, b) < 0.08) continue;
          rSum += r;
          gSum += g;
          bSum += b;
          count += 1;
        }
      }

      if (count > 0) {
        regional.push([rSum / count, gSum / count, bSum / count]);
      }
    }
  }

  return regional;
}

/** Pick up to 6 visually distinct colors (unique 0xFFRRGGBB values). */
function extractDominantColors(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  maxColors = MAX_COLORS
): string[] {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 8) {
    const a = pixels[i + 3];
    if (a < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const step = 20;
    const key = `${Math.round(r / step) * step}-${Math.round(g / step) * step}-${Math.round(b / step) * step}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const sorted = [...buckets.values()]
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
      saturation: rgbSaturation(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count),
    }))
    .sort((a, b) => b.count - a.count);

  const vibrant = sorted.filter((entry) => entry.saturation >= 0.1);
  const globalCandidates = (vibrant.length >= 3 ? vibrant : sorted).map(
    (entry) => [entry.r, entry.g, entry.b] as [number, number, number]
  );
  const regionalCandidates = extractRegionalColors(pixels, width, height);

  const picked: [number, number, number][] = [];
  const firestoreHexes: string[] = [];

  const tryAdd = (rgb: [number, number, number], minDistSq: number) =>
    pushDistinctColor(picked, firestoreHexes, rgb, minDistSq);

  for (const rgb of globalCandidates) {
    if (picked.length >= maxColors) break;
    tryAdd(rgb, MIN_COLOR_DISTANCE_SQ);
  }

  for (const rgb of regionalCandidates) {
    if (picked.length >= maxColors) break;
    tryAdd(rgb, MIN_COLOR_DISTANCE_SQ);
  }

  if (picked.length < maxColors) {
    for (const rgb of globalCandidates) {
      if (picked.length >= maxColors) break;
      tryAdd(rgb, 2800);
    }
  }

  if (picked.length < maxColors) {
    for (const rgb of regionalCandidates) {
      if (picked.length >= maxColors) break;
      tryAdd(rgb, 2800);
    }
  }

  return normalizeFirestoreColors(firestoreHexes).slice(0, maxColors);
}

function averageLuminance(pixels: Uint8ClampedArray): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += 32) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    count += 1;
  }
  return count ? total / count : 128;
}

const FANDOM_FILENAME_TAGS = [
  'goku', 'vegeta', 'gohan', 'naruto', 'sasuke', 'kakashi', 'luffy', 'zoro', 'sanji',
  'tanjiro', 'nezuko', 'gojo', 'sukuna', 'eren', 'mikasa', 'levi', 'batman', 'superman',
  'spiderman', 'ironman', 'thor', 'hulk', 'marvel', 'dc', 'pokemon', 'pikachu', 'zelda',
  'link', 'mario', 'sonic', 'kratos', 'doom', 'valorant', 'fortnite', 'genshin',
  'dragon', 'ball', 'onepiece', 'demon', 'slayer', 'jujutsu', 'attack', 'titan',
];

function slugTag(value?: string): string | null {
  if (!value || value.toLowerCase() === 'none') return null;
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (cleaned.length < 2 || cleaned.length > 24) return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (/^\d{3,4}x\d{3,4}$/.test(cleaned)) return null;
  if (TAG_STOPWORDS.has(cleaned)) return null;
  return cleaned;
}

function isBlockedTag(tag: string): boolean {
  if (/^\d/.test(tag) || (tag.includes('x') && /\d+x\d+/.test(tag))) return true;
  return false;
}

function addTag(tags: string[], tag?: string | null) {
  const cleaned = slugTag(tag ?? undefined);
  if (!cleaned || tags.includes(cleaned) || isBlockedTag(cleaned)) return;
  tags.push(cleaned);
}

function dedupeSimilarTags(tags: string[]): string[] {
  const result: string[] = [];
  const has = (t: string) => result.includes(t);

  for (const tag of tags) {
    if (isBlockedTag(tag) && !RESOLUTION_TAGS.has(tag)) continue;

    if (RESOLUTION_TAGS.has(tag)) {
      if (has('4k') || has('8k')) continue;
      if (tag === 'ultra' || tag === 'hd') continue;
    }

    if (tag === 'dark' && has('amoled')) continue;
    if (tag === 'amoled' && has('dark')) {
      const idx = result.indexOf('dark');
      if (idx >= 0) result.splice(idx, 1);
    }

    if (tag === 'anime' && has('fandom')) {
      const idx = result.indexOf('fandom');
      if (idx >= 0) result.splice(idx, 1);
    }

    if (!has(tag)) result.push(tag);
  }

  return result;
}

function cleanFilenameForTags(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/\d{3,4}x\d{3,4}/gi, ' ')
    .replace(/\b\d{1,4}[kKpP]\b/g, ' ')
    .replace(/[_-]?(wallpaper|bg|background|hd|ultra|4k|8k|wv|uw|wide|vertical|portrait|landscape|fit-in|thumb)\b/gi, ' ')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function rgbToColorNameTag(r: number, g: number, b: number): string | null {
  const sat = rgbSaturation(r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (sat < 0.12) {
    if (max < 45) return 'black';
    if (min > 210) return 'white';
    return null;
  }

  let hue = 0;
  if (max === r) hue = ((g - b) / (max - min)) * 60;
  else if (max === g) hue = (2 + (b - r) / (max - min)) * 60;
  else hue = (4 + (r - g) / (max - min)) * 60;
  if (hue < 0) hue += 360;

  if (hue < 20 || hue >= 340) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 70) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 260) return 'blue';
  if (hue < 310) return 'purple';
  return 'pink';
}

function extractColorNameTags(firestoreColors: string[]): string[] {
  const names: string[] = [];
  for (const hex of firestoreColors) {
    const css = normalizeFirestoreColor(hex);
    if (!css) continue;
    const rr = parseInt(css.slice(4, 6), 16);
    const gg = parseInt(css.slice(6, 8), 16);
    const bb = parseInt(css.slice(8, 10), 16);
    const name = rgbToColorNameTag(rr, gg, bb);
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function extractFilenameTags(filename: string, wallpaperName?: string): string[] {
  const raw = `${cleanFilenameForTags(filename)} ${cleanFilenameForTags(wallpaperName || '')}`.toLowerCase();
  const found: string[] = [];

  FANDOM_FILENAME_TAGS.forEach((keyword) => {
    if (raw.includes(keyword) && !found.includes(keyword)) {
      found.push(keyword);
    }
  });

  const words = raw
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && word.length <= 18 && !TAG_STOPWORDS.has(word) && !/^\d+$/.test(word));

  words
    .sort((a, b) => b.length - a.length)
    .forEach((word) => {
      if (!found.includes(word) && found.length < 6) found.push(word);
    });

  return found;
}

/** Up to 8 specific, non-redundant tags — no filler padding; fewer is OK if that's all that fit. */
export function generateAutoTags(
  context: ImageAnalysisContext,
  avgLuminance: number,
  dominantColors: string[] = []
): string[] {
  const tags: string[] = [];

  const filenameTags = extractFilenameTags(context.filename || '', context.wallpaperName);
  filenameTags.slice(0, 5).forEach((tag) => addTag(tags, tag));

  extractColorNameTags(dominantColors)
    .slice(0, 2)
    .forEach((tag) => addTag(tags, tag));

  if (context.mainCategory) {
    const categoryTag =
      STYLE_CATEGORY_TAG_MAP[context.mainCategory] || slugTag(context.mainCategory);
    addTag(tags, categoryTag);
  }

  if (context.dimensions) {
    const match = context.dimensions.match(/(\d{3,4})x(\d{3,4})/i);
    if (match && Math.max(parseInt(match[1], 10), parseInt(match[2], 10)) >= 3840) {
      addTag(tags, '4k');
    }
  }

  if (context.mainCategory === 'AMOLED & Dark' || avgLuminance < 50) {
    addTag(tags, 'amoled');
  } else if (avgLuminance < 85) {
    addTag(tags, 'dark');
  }

  if (context.mainCategory === 'Depth Effect') {
    addTag(tags, 'depth');
  }

  return dedupeSimilarTags(tags).slice(0, MAX_TAGS);
}

export function normalizeFirestoreTags(
  tags: string[],
  context: ImageAnalysisContext = {}
): string[] {
  const normalized: string[] = [];
  for (const tag of tags) {
    addTag(normalized, tag);
    if (normalized.length >= MAX_TAGS) break;
  }

  let refined = dedupeSimilarTags(normalized);

  if (refined.length === 0 && (context.filename || context.mainCategory)) {
    refined = generateAutoTags(context, 128);
  }

  return refined.slice(0, MAX_TAGS);
}

export async function analyzeImageFile(
  file: File,
  context: ImageAnalysisContext = {}
): Promise<ImageAnalysisResult> {
  const fileSizeBytes = file.size;
  const fileSize = formatUploadSize(fileSizeBytes);

  const bitmap = await createImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 256 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not analyze image');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(objectUrl);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const avgLum = averageLuminance(imageData.data);
    const colors = extractDominantColors(
      imageData.data,
      canvas.width,
      canvas.height,
      MAX_COLORS
    );
    const analysisContext = {
      ...context,
      filename: context.filename || file.name,
      dimensions: formatDimensions(width, height),
    };
    const tags = normalizeFirestoreTags(
      generateAutoTags(analysisContext, avgLum, colors),
      analysisContext
    );

    return {
      width,
      height,
      dimensions: formatDimensions(width, height),
      fileSizeBytes,
      fileSize,
      tags,
      colors,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for analysis'));
    img.src = src;
  });
}

/** Convert Firestore 0xFFRRGGBB to CSS #RRGGBB. */
export function firestoreColorToCss(hex: string): string {
  const canonical = normalizeFirestoreColor(hex);
  if (!canonical) return '#888888';
  return `#${canonical.slice(4)}`;
}

export interface UploadedWallpaperPayload {
  url: string;
  dimensions: string;
  fileSize: string;
  fileSizeBytes: number;
  tags: string[];
  colors: string[];
}
