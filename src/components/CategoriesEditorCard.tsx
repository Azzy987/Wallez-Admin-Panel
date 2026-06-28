import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  PlusCircle,
  X,
  Grid3X3,
  Info,
  Save,
  CloudUpload,
  CheckCircle2,
  Clock,
  ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Category, getCategories, initializeWallezCategories } from '@/lib/firebase';
import {
  CategoryDraftEntry,
  categoryDraftNames,
  loadCategoryDraft,
  mergeCategoryDraftWithFirestore,
  nextCategorySortOrder,
  saveCategoryDraft,
  sortCategoriesByOrder,
} from '@/lib/categoryDraft';
import { isStyleCategory, WALLEZ_BRAND_NAME } from '@/lib/wallezCategories';
import { cn } from '@/lib/utils';

const CATEGORY_THUMBNAIL_DIR = 'wallez/categories';

const CATEGORY_THUMBNAIL_SIZES = [
  {
    label: 'Standard (360x640)',
    value: '360x640',
    width: 360,
    height: 640,
  },
  {
    label: '+30% (468x832)',
    value: '468x832',
    width: 468,
    height: 832,
  },
  {
    label: '+50% (540x960)',
    value: '540x960',
    width: 540,
    height: 960,
  },
  {
    label: 'Large (720x1280)',
    value: '720x1280',
    width: 720,
    height: 1280,
  },
  {
    label: 'Custom',
    value: 'custom',
    width: 0,
    height: 0,
  },
];

interface CategoriesEditorCardProps {
  onCategoriesChanged?: () => void;
  /** Hide the card title when the page already has a heading (e.g. /categories). */
  hideTitle?: boolean;
}

const emptyEntry = (): CategoryDraftEntry => ({ name: '', thumbnail: '', sortOrder: 0 });

const entriesEqual = (a: CategoryDraftEntry[], b: CategoryDraftEntry[]) =>
  JSON.stringify(a) === JSON.stringify(b);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'category';

const getCloudFrontFitInUrl = (url: string, dimensions: string) => {
  if (!url.includes('cloudfront.net/')) return url;

  const baseUrl = url.slice(0, url.indexOf('cloudfront.net/') + 'cloudfront.net'.length);
  const imagePath = url
    .slice(url.indexOf('cloudfront.net/') + 'cloudfront.net/'.length)
    .replace(/^fit-in\/(?:\{w\}x\{h\}|\d+x\d+)\//, '');

  return `${baseUrl}/fit-in/${dimensions}/${imagePath}`;
};

const getCategoryThumbnailUrl = (publicUrl: string, thumbnailTemplate: string | undefined, dimensions: string) => {
  if (thumbnailTemplate) {
    return thumbnailTemplate
      .replace('{w}', dimensions.split('x')[0])
      .replace('{h}', dimensions.split('x')[1])
      .replace(/\/fit-in\/\d+x\d+\//, `/fit-in/${dimensions}/`);
  }

  return getCloudFrontFitInUrl(publicUrl, dimensions);
};

async function uploadCategoryThumbnail(file: File, categoryName: string, dimensions: string): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const filename = `${slugify(categoryName)}-${dimensions}-${Date.now()}${ext ? `.${ext}` : ''}`;

  const res = await fetch('/api/s3-presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dir: CATEGORY_THUMBNAIL_DIR,
      filename,
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Upload failed with HTTP ${res.status}`);
  }

  const response = await res.json() as {
    uploadUrl?: string;
    publicUrl: string;
    thumbnailTemplate?: string;
    fileExists?: boolean;
  };

  if (!response.fileExists) {
    if (!response.uploadUrl) {
      throw new Error('Missing S3 upload URL');
    }

    const put = await fetch(response.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!put.ok) {
      throw new Error(`S3 upload failed with HTTP ${put.status}`);
    }
  }

  return getCategoryThumbnailUrl(response.publicUrl, response.thumbnailTemplate, dimensions);
}

function CategoryThumbnail({
  url,
  name,
  variant = 'tile',
}: {
  url?: string;
  name: string;
  variant?: 'tile' | 'inline';
}) {
  const [failed, setFailed] = useState(false);
  const src = url?.trim();

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const isTile = variant === 'tile';

  if (!src || failed) {
    return (
      <div
        className={cn(
          'rounded-xl bg-muted/80 border border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground',
          isTile ? 'w-full aspect-[9/16]' : 'h-10 w-10 shrink-0'
        )}
        title={name}
      >
        <ImageIcon className={isTile ? 'h-8 w-8 opacity-40' : 'h-4 w-4'} />
        {isTile ? (
          <span className="text-[10px] uppercase tracking-wider opacity-60">No thumbnail</span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={cn(
        'rounded-xl object-cover border bg-muted transition-transform duration-300',
        isTile ? 'w-full aspect-[9/16] group-hover:scale-[1.02]' : 'h-10 w-10 shrink-0'
      )}
      onError={() => setFailed(true)}
    />
  );
}

const CategoriesEditorCard: React.FC<CategoriesEditorCardProps> = ({
  onCategoriesChanged,
  hideTitle = false,
}) => {
  const [draftCategories, setDraftCategories] = useState<CategoryDraftEntry[]>([]);
  const [savedCategories, setSavedCategories] = useState<CategoryDraftEntry[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [firestoreByName, setFirestoreByName] = useState<Map<string, Category>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newEntry, setNewEntry] = useState<CategoryDraftEntry>(emptyEntry());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<CategoryDraftEntry>(emptyEntry());
  const [thumbnailSize, setThumbnailSize] = useState('360x640');
  const [customThumbnailWidth, setCustomThumbnailWidth] = useState(540);
  const [customThumbnailHeight, setCustomThumbnailHeight] = useState(960);
  const [uploadingThumbnailFor, setUploadingThumbnailFor] = useState<string | null>(null);

  const isDirty = useMemo(
    () => !entriesEqual(draftCategories, savedCategories),
    [draftCategories, savedCategories]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [draft, firestore] = await Promise.all([loadCategoryDraft(), getCategories()]);
      setSavedAt(draft.updatedAt ?? null);

      const map = new Map<string, Category>();
      const sortByName = new Map<string, number>();
      firestore
        .filter((cat) => isStyleCategory(cat.categoryName))
        .forEach((cat) => {
          map.set(cat.categoryName, cat);
          sortByName.set(cat.categoryName, cat.sortOrder);
        });
      setFirestoreByName(map);

      const merged = mergeCategoryDraftWithFirestore(draft.categories, sortByName);
      setDraftCategories(merged);
      setSavedCategories(merged);
      setNewEntry((prev) => ({ ...prev, sortOrder: nextCategorySortOrder(merged) }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const resolveThumbnail = (entry: CategoryDraftEntry) => {
    if (entry.thumbnail.trim()) return entry.thumbnail.trim();
    return firestoreByName.get(entry.name)?.thumbnail ?? '';
  };

  const resolveSortOrder = (entry: CategoryDraftEntry) => entry.sortOrder;

  const sortedDraftCategories = useMemo(
    () => sortCategoriesByOrder(draftCategories),
    [draftCategories]
  );

  const getSelectedThumbnailDimensions = () => {
    if (thumbnailSize !== 'custom') return thumbnailSize;

    const width = Math.max(1, Math.floor(Number(customThumbnailWidth) || 0));
    const height = Math.max(1, Math.floor(Number(customThumbnailHeight) || 0));
    return `${width}x${height}`;
  };

  const handleCategoryThumbnailUpload = async (
    file: File,
    target: 'new' | 'edit',
    categoryName: string
  ) => {
    const name = categoryName.trim();
    if (!name) {
      toast.error('Enter a category name before uploading');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    const dimensions = getSelectedThumbnailDimensions();
    const uploadKey = target === 'new' ? 'new' : name;
    setUploadingThumbnailFor(uploadKey);

    try {
      const thumbnailUrl = await uploadCategoryThumbnail(file, name, dimensions);
      if (target === 'new') {
        setNewEntry((prev) => ({ ...prev, thumbnail: thumbnailUrl }));
      } else {
        setEditEntry((prev) => ({ ...prev, thumbnail: thumbnailUrl }));
      }
      toast.success(`Thumbnail uploaded at ${dimensions}`);
    } catch (error) {
      console.error('Error uploading category thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload thumbnail');
    } finally {
      setUploadingThumbnailFor(null);
    }
  };

  const renderThumbnailUploadControls = (
    target: 'new' | 'edit',
    categoryName: string,
    inputId: string
  ) => {
    const uploadingKey = target === 'new' ? 'new' : categoryName.trim();
    const isUploading = uploadingThumbnailFor === uploadingKey;

    return (
      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`${inputId}-size`} className="text-xs">
              Thumbnail size
            </Label>
            <Select value={thumbnailSize} onValueChange={setThumbnailSize}>
              <SelectTrigger id={`${inputId}-size`} className="h-8 text-xs">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_THUMBNAIL_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={inputId} className="text-xs">
              Upload image
            </Label>
            <Input
              id={inputId}
              type="file"
              accept="image/*"
              className="h-8 text-xs file:mr-2 file:border-0 file:bg-transparent file:text-xs"
              disabled={isUploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  await handleCategoryThumbnailUpload(file, target, categoryName);
                }
                event.currentTarget.value = '';
              }}
            />
          </div>
        </div>

        {thumbnailSize === 'custom' ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${inputId}-custom-width`} className="text-xs">
                Width
              </Label>
              <Input
                id={`${inputId}-custom-width`}
                type="number"
                min={1}
                step={1}
                value={customThumbnailWidth}
                onChange={(event) =>
                  setCustomThumbnailWidth(Math.max(1, parseInt(event.target.value, 10) || 1))
                }
                className="h-8 text-xs tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${inputId}-custom-height`} className="text-xs">
                Height
              </Label>
              <Input
                id={`${inputId}-custom-height`}
                type="number"
                min={1}
                step={1}
                value={customThumbnailHeight}
                onChange={(event) =>
                  setCustomThumbnailHeight(Math.max(1, parseInt(event.target.value, 10) || 1))
                }
                className="h-8 text-xs tabular-nums"
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading to {CATEGORY_THUMBNAIL_DIR}…
            </>
          ) : (
            <>
              <ImageIcon className="h-3.5 w-3.5" />
              Saves the selected {getSelectedThumbnailDimensions()} CloudFront URL into thumbnail.
            </>
          )}
        </div>
      </div>
    );
  };

  const addCategory = () => {
    const name = newEntry.name.trim();
    const thumbnail = newEntry.thumbnail.trim();
    const sortOrder =
      Number.isFinite(newEntry.sortOrder) && newEntry.sortOrder >= 0
        ? Math.floor(newEntry.sortOrder)
        : nextCategorySortOrder(draftCategories);
    if (!name) {
      toast.error('Enter a category name');
      return;
    }
    if (name === WALLEZ_BRAND_NAME) {
      toast.error(`"${WALLEZ_BRAND_NAME}" is reserved for the upload collection`);
      return;
    }
    if (draftCategories.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already in list');
      return;
    }

    setDraftCategories((prev) =>
      sortCategoriesByOrder([...prev, { name, thumbnail, sortOrder }])
    );
    setNewEntry({ ...emptyEntry(), sortOrder: nextCategorySortOrder([...draftCategories, { name, thumbnail, sortOrder }]) });
  };

  const removeCategory = (name: string) => {
    setDraftCategories((prev) => prev.filter((entry) => entry.name !== name));
    if (editingName === name) {
      setEditingName(null);
      setEditEntry(emptyEntry());
    }
  };

  const startEdit = (entry: CategoryDraftEntry) => {
    setEditingName(entry.name);
    setEditEntry({ ...entry, sortOrder: entry.sortOrder });
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditEntry(emptyEntry());
  };

  const commitEdit = (originalName: string) => {
    const name = editEntry.name.trim();
    const thumbnail = editEntry.thumbnail.trim();
    const sortOrder = Math.max(0, Math.floor(Number(editEntry.sortOrder) || 0));
    if (!name) {
      toast.error('Category name cannot be empty');
      return;
    }
    if (name === WALLEZ_BRAND_NAME) {
      toast.error(`"${WALLEZ_BRAND_NAME}" is reserved`);
      return;
    }
    const duplicate = draftCategories.some(
      (entry) =>
        entry.name.toLowerCase() === name.toLowerCase() && entry.name !== originalName
    );
    if (duplicate) {
      toast.error('Category already in list');
      return;
    }

    setDraftCategories((prev) =>
      sortCategoriesByOrder(
        prev.map((entry) =>
          entry.name === originalName ? { name, thumbnail, sortOrder } : entry
        )
      )
    );
    cancelEdit();
  };

  const handleSave = async () => {
    if (draftCategories.length === 0) {
      toast.error('Add at least one category before saving');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveCategoryDraft(draftCategories);
      setSavedCategories(saved.categories);
      setSavedAt(saved.updatedAt ?? null);
      toast.success('Categories saved to project file (commit to git to keep permanently)');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (isDirty) {
      toast.error('Save your category list first, then sync to Firestore');
      return;
    }
    if (savedCategories.length === 0) {
      toast.error('No categories to sync');
      return;
    }

    setSyncing(true);
    try {
      const result = await initializeWallezCategories(savedCategories);
      await loadAll();
      onCategoriesChanged?.();

      const parts: string[] = [];
      if (result.created.length) parts.push(`created ${result.created.length}`);
      if (result.updated.length) parts.push(`updated ${result.updated.length} thumbnails/order`);
      if (result.skipped.length) parts.push(`skipped ${result.skipped.length} unchanged`);

      if (result.created.length === 0 && result.updated.length === 0) {
        toast.info('All categories already in Firestore — wallpaper counts preserved.');
      } else {
        toast.success(`Sync complete · ${parts.join(' · ')}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to sync categories to Firestore');
    } finally {
      setSyncing(false);
    }
  };

  const savedNames = categoryDraftNames(savedCategories);
  const pendingCount = savedNames.filter((name) => !firestoreByName.has(name)).length;

  return (
    <Card className="wallez-glass-panel rounded-2xl border-dashed border-[#2EE6C5]/20">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {!hideTitle ? (
              <CardTitle className="text-lg flex items-center gap-2">
                <Grid3X3 className="h-5 w-5 text-primary" />
                Categories
              </CardTitle>
            ) : null}
            <p className={cn('text-sm text-muted-foreground max-w-2xl', !hideTitle && 'mt-1.5')}>
              Tap a category to edit name, sort order, and thumbnail. Lower sort order appears first in the iOS app grid.{' '}
              <strong>Save</strong> then <strong>Sync to Firestore</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty || saving || loading}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDirty || syncing || loading || savedCategories.length === 0}
              onClick={handleSync}
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-1.5" />
              )}
              Sync to Firestore
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isDirty ? (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
              <Clock className="h-3 w-3" />
              Unsaved changes
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Saved locally
              {savedAt ? ` · ${new Date(savedAt).toLocaleString()}` : ''}
            </Badge>
          )}
          {pendingCount > 0 && !isDirty && (
            <Badge variant="outline" className="gap-1">
              {pendingCount} not yet in Firestore
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/40 p-3 flex gap-2 text-sm">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{WALLEZ_BRAND_NAME}</span> is the upload
            collection (not listed here). Thumbnails show on category cards in the iOS app.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-3 space-y-2 animate-pulse">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="aspect-[9/16] rounded-xl bg-muted/60" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedDraftCategories.map((entry) => {
                const firestore = firestoreByName.get(entry.name);
                const isEditing = editingName === entry.name;
                const previewUrl = resolveThumbnail(entry);
                const order = resolveSortOrder(entry);

                return (
                  <div
                    key={entry.name}
                    className={cn(
                      'group relative rounded-xl border bg-card/60 p-3 transition-all duration-200',
                      'hover:border-[#2EE6C5]/30 hover:shadow-md hover:-translate-y-0.5',
                      isEditing && 'sm:col-span-2 ring-2 ring-[#2EE6C5]/30 border-[#2EE6C5]/40'
                    )}
                  >
                    {!isEditing && (
                      <button
                        type="button"
                        aria-label={`Remove ${entry.name}`}
                        className="absolute top-2 right-2 z-10 h-6 w-6 rounded-md flex items-center justify-center bg-background/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeCategory(entry.name)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`edit-name-${entry.name}`} className="text-xs">
                              Name
                            </Label>
                            <Input
                              id={`edit-name-${entry.name}`}
                              value={editEntry.name}
                              onChange={(e) =>
                                setEditEntry((prev) => ({ ...prev, name: e.target.value }))
                              }
                              className="h-8 text-sm font-medium"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`edit-order-${entry.name}`} className="text-xs">
                              Sort order
                            </Label>
                            <Input
                              id={`edit-order-${entry.name}`}
                              type="number"
                              min={0}
                              step={1}
                              value={editEntry.sortOrder}
                              onChange={(e) =>
                                setEditEntry((prev) => ({
                                  ...prev,
                                  sortOrder: Math.max(0, parseInt(e.target.value, 10) || 0),
                                }))
                              }
                              className="h-8 text-sm tabular-nums"
                            />
                          </div>
                        </div>

                        <CategoryThumbnail
                          url={
                            editEntry.thumbnail ||
                            resolveThumbnail({
                              ...editEntry,
                              name: editEntry.name || entry.name,
                            })
                          }
                          name={editEntry.name || entry.name}
                        />

                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-thumb-${entry.name}`} className="text-xs">
                            Thumbnail URL
                          </Label>
                          <Input
                            id={`edit-thumb-${entry.name}`}
                            value={editEntry.thumbnail}
                            onChange={(e) =>
                              setEditEntry((prev) => ({ ...prev, thumbnail: e.target.value }))
                            }
                            placeholder="https://…"
                            className="h-8 text-xs"
                          />
                        </div>

                        {renderThumbnailUploadControls(
                          'edit',
                          editEntry.name || entry.name,
                          `edit-thumb-upload-${slugify(entry.name)}`
                        )}

                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => commitEdit(entry.name)}
                          >
                            Done
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-left w-full space-y-2"
                        onClick={() => startEdit(entry)}
                      >
                        <div className="flex items-center gap-2 pr-6">
                          <p className="font-semibold text-sm leading-tight truncate flex-1">
                            {entry.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] tabular-nums px-1.5 py-0 h-5 border-[#2EE6C5]/30 text-[#2EE6C5]"
                          >
                            #{order}
                          </Badge>
                        </div>

                        <CategoryThumbnail url={previewUrl} name={entry.name} />

                        <p className="text-[11px] text-muted-foreground">
                          {firestore ? (
                            <>
                              {firestore.wallpaperCount} wallpaper
                              {firestore.wallpaperCount === 1 ? '' : 's'} · synced
                            </>
                          ) : (
                            'Not in Firestore · tap to edit'
                          )}
                        </p>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t space-y-4">
              <p className="text-sm font-medium">Add category</p>
              <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] max-w-3xl items-start">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-category-name" className="text-xs">
                      Name
                    </Label>
                    <Input
                      id="new-category-name"
                      value={newEntry.name}
                      onChange={(e) => setNewEntry((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Vaporwave"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-category-thumb" className="text-xs">
                      Thumbnail URL (optional)
                    </Label>
                    <Input
                      id="new-category-thumb"
                      value={newEntry.thumbnail}
                      onChange={(e) =>
                        setNewEntry((prev) => ({ ...prev, thumbnail: e.target.value }))
                      }
                      placeholder="https://…"
                    />
                  </div>
                  {renderThumbnailUploadControls(
                    'new',
                    newEntry.name,
                    'new-category-thumb-upload'
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-category-order" className="text-xs">
                      Sort order
                    </Label>
                    <Input
                      id="new-category-order"
                      type="number"
                      min={0}
                      step={1}
                      value={newEntry.sortOrder}
                      onChange={(e) =>
                        setNewEntry((prev) => ({
                          ...prev,
                          sortOrder: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={addCategory} className="w-full sm:w-auto">
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Add
                  </Button>
                </div>

                <div className="sm:col-span-1 max-w-[180px]">
                  <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                  <CategoryThumbnail
                    url={newEntry.thumbnail}
                    name={newEntry.name || 'Preview'}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoriesEditorCard;
