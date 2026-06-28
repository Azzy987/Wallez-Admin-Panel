import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import FitInSizeSelector from '@/components/paywall/FitInSizeSelector';
import {
  addPaywallWallpaper,
  deletePaywallWallpaper,
  getPaywallWallpapers,
  updatePaywallWallpaper,
  type PaywallWallpaper,
} from '@/lib/firebase';
import {
  DEFAULT_FIT_IN_SIZE,
  type FitInSizeState,
  PAYWALL_S3_DIR,
  dimensionsToAspectRatio,
  getPaywallPreviewUrl,
  fitInStateFromUrl,
  parseFitInDimensions,
  resolveFitInDimensions,
  toPaywallWallpaperUrl,
  uploadPaywallImageToS3,
} from '@/lib/paywallWallpaper';
import { toast } from 'sonner';
import {
  ImageIcon,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type UploadEntry = { file: File; preview: string };

const PaywallBanners: React.FC = () => {
  const isMobile = useIsMobile();
  const [items, setItems] = useState<PaywallWallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<UploadEntry[]>([]);
  const [uploadFitIn, setUploadFitIn] = useState<FitInSizeState>({ ...DEFAULT_FIT_IN_SIZE });
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  const [editing, setEditing] = useState<PaywallWallpaper | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState('');
  const [editFitIn, setEditFitIn] = useState<FitInSizeState>({ ...DEFAULT_FIT_IN_SIZE });
  const editFileRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<PaywallWallpaper | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getPaywallWallpapers());
    } catch {
      toast.error('Failed to load paywall banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (editPreview) URL.revokeObjectURL(editPreview);
    };
  }, [editPreview]);

  const clearUploadPreviews = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setUploadFiles([]);
    if (uploadFileRef.current) uploadFileRef.current.value = '';
  };

  const handleUploadFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      toast.error('Please select image files');
      return;
    }
    if (images.length < files.length) {
      toast.warning('Non-image files were skipped');
    }
    const entries = images.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrlsRef.current.push(preview);
      return { file, preview };
    });
    setUploadFiles((prev) => [...prev, ...entries]);
    if (uploadFileRef.current) uploadFileRef.current.value = '';
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const handleBatchAdd = async () => {
    if (uploadFiles.length === 0) {
      toast.error('Please select at least one image');
      return;
    }
    const dimensions = resolveFitInDimensions(uploadFitIn);
    if (!dimensions) {
      toast.error('Please enter a valid fit-in size');
      return;
    }

    setSaving(true);
    setUploadProgress({ done: 0, total: uploadFiles.length });
    let successCount = 0;

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const { file } = uploadFiles[i];
        const wallpaperUrl = await uploadPaywallImageToS3(file, dimensions, `-${i}`);
        await addPaywallWallpaper(wallpaperUrl);
        successCount++;
        setUploadProgress({ done: i + 1, total: uploadFiles.length });
      }
      toast.success(
        `Uploaded ${successCount} paywall banner${successCount === 1 ? '' : 's'} (${dimensions})`
      );
      clearUploadPreviews();
      await load();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : `Upload stopped after ${successCount} of ${uploadFiles.length}`
      );
      if (successCount > 0) await load();
    } finally {
      setSaving(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  };

  const openEdit = (item: PaywallWallpaper) => {
    setEditing(item);
    setEditUrl(item.wallpaperUrl);
    setEditFitIn(fitInStateFromUrl(item.wallpaperUrl));
    setEditFile(null);
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditPreview('');
    if (editFileRef.current) editFileRef.current.value = '';
  };

  const closeEdit = () => {
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditing(null);
    setEditUrl('');
    setEditFile(null);
    setEditPreview('');
    setEditFitIn({ ...DEFAULT_FIT_IN_SIZE });
    if (editFileRef.current) editFileRef.current.value = '';
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setEditFile(file);
    if (editPreview) URL.revokeObjectURL(editPreview);
    setEditPreview(URL.createObjectURL(file));
  };

  const editDimensions = resolveFitInDimensions(editFitIn);
  const editDisplayPreview =
    editPreview ||
    (editUrl && editDimensions ? toPaywallWallpaperUrl(editUrl, editDimensions) : '');

  const handleSaveEdit = async () => {
    if (!editing) return;
    const dimensions = resolveFitInDimensions(editFitIn);
    if (!dimensions) {
      toast.error('Please enter a valid fit-in size');
      return;
    }

    setSaving(true);
    try {
      let wallpaperUrl = editUrl.trim();
      if (editFile) {
        wallpaperUrl = await uploadPaywallImageToS3(editFile, dimensions);
      } else if (wallpaperUrl) {
        wallpaperUrl = toPaywallWallpaperUrl(wallpaperUrl, dimensions);
      }
      if (!wallpaperUrl) {
        toast.error('wallpaperUrl is required');
        return;
      }
      await updatePaywallWallpaper(editing.id, wallpaperUrl);
      toast.success('Paywall banner updated');
      closeEdit();
      await load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePaywallWallpaper(deleteTarget.id);
      toast.success('Paywall banner deleted');
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error('Failed to delete paywall banner');
    }
  };

  const uploadDimensions = resolveFitInDimensions(uploadFitIn);

  return (
    <Layout>
      <div className="flex flex-col space-y-2 mb-8">
        <h1
          className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold flex items-center gap-2 animate-fade-in`}
        >
          <Lock className="h-8 w-8 text-primary" />
          Paywall Banners
        </h1>
        <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
          Upload to PaywallWallpapers with configurable CloudFront fit-in sizes.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Upload paywall banners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Files upload to <code className="text-xs bg-muted px-1 rounded">{PAYWALL_S3_DIR}/</code>.
            Select multiple images at once; all use the chosen fit-in size.
          </p>

          <FitInSizeSelector
            idPrefix="upload-fitin"
            value={uploadFitIn}
            onChange={setUploadFitIn}
          />

          <input
            ref={uploadFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUploadFilesChange}
          />
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => !saving && uploadFileRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-2">
              <ImageIcon className="h-10 w-10" />
              <span>Click to choose one or more images</span>
              <span className="text-xs">Hold Shift/Cmd to select multiple files</span>
            </div>
          </div>

          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {uploadFiles.length} file{uploadFiles.length === 1 ? '' : 's'} selected
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearUploadPreviews}>
                  Clear all
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {uploadFiles.map((entry, index) => (
                  <div key={`${entry.file.name}-${index}`} className="relative group rounded border bg-muted/30 p-1">
                    <button
                      type="button"
                      className="absolute top-1 right-1 z-10 rounded-full bg-background/90 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeUploadFile(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <img
                      src={entry.preview}
                      alt={entry.file.name}
                      className="h-20 w-full object-contain rounded"
                    />
                    <p className="text-[10px] truncate px-1 mt-1" title={entry.file.name}>
                      {entry.file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saving && uploadProgress.total > 0 && (
            <div className="space-y-1">
              <Progress value={(uploadProgress.done / uploadProgress.total) * 100} />
              <p className="text-xs text-muted-foreground text-center">
                {uploadProgress.done} / {uploadProgress.total} uploaded
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={handleBatchAdd}
            disabled={saving || uploadFiles.length === 0 || !uploadDimensions}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload &amp; save {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Saved paywall banners ({items.length})</h2>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No paywall banners yet. Upload one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const dims = parseFitInDimensions(item.wallpaperUrl) || '396x704';
            return (
              <Card key={item.id} className="overflow-hidden">
                <div
                  className="max-h-[320px] bg-muted/40 flex items-center justify-center overflow-hidden"
                  style={{ aspectRatio: dimensionsToAspectRatio(dims) }}
                >
                  <img
                    src={getPaywallPreviewUrl(item.wallpaperUrl)}
                    alt={`Paywall ${item.id}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <CardContent className="p-3 space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    fit-in {dims}
                  </Badge>
                  <p className="text-xs text-muted-foreground truncate" title={item.wallpaperUrl}>
                    {item.wallpaperUrl}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit paywall banner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FitInSizeSelector
              idPrefix="edit-fitin"
              value={editFitIn}
              onChange={setEditFitIn}
            />
            {editDisplayPreview && (
              <div className="rounded-lg border bg-muted/30 p-2">
                <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                <img
                  src={editDisplayPreview}
                  alt="Edit preview"
                  className="max-h-56 w-full mx-auto rounded object-contain"
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-wallpaper-url">wallpaperUrl</Label>
              <Input
                id="edit-wallpaper-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="mt-1 text-xs"
                placeholder="CloudFront URL"
              />
            </div>
            <div>
              <Label>Replace image</Label>
              <input
                ref={editFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleEditFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-full"
                onClick={() => editFileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose new image
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={saving || !editDimensions}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete paywall banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the document from PaywallWallpapers. The S3 file is not deleted
              automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default PaywallBanners;
