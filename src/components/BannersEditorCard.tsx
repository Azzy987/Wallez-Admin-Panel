import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  deletePlatformBanner,
  getPlatformBanners,
  PlatformBanner,
  updatePlatformBanner,
} from '@/lib/firebase';
import {
  BANNERS_ANDROID_COLLECTION,
  BANNERS_IOS_COLLECTION,
  BannerPlatform,
} from '@/lib/wallezCategories';
import { toast } from 'sonner';
import { ImageIcon, Layers, Loader2, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BannersEditorCardProps {
  hideTitle?: boolean;
}

type DraftEdits = Record<string, { sortOrder: number; bannerName: string }>;

const PlatformBannerList: React.FC<{
  platform: BannerPlatform;
  collectionName: string;
}> = ({ platform, collectionName }) => {
  const [banners, setBanners] = useState<PlatformBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftEdits>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getPlatformBanners(collectionName);
      setBanners(docs);
      setDrafts(
        Object.fromEntries(
          docs.map((b) => [
            b.id,
            { sortOrder: b.sortOrder, bannerName: b.bannerName },
          ])
        )
      );
    } catch {
      toast.error(`Failed to load ${platform} banners`);
    } finally {
      setLoading(false);
    }
  }, [collectionName, platform]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (banner: PlatformBanner) => {
    const name = banner.bannerName || banner.id;
    if (!window.confirm(`Remove "${name}" from ${platform.toUpperCase()} carousel?`)) return;

    setDeletingId(banner.id);
    try {
      await deletePlatformBanner(collectionName, banner.id);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      toast.success('Banner removed');
    } catch {
      toast.error('Failed to remove banner');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async (banner: PlatformBanner) => {
    const draft = drafts[banner.id];
    if (!draft) return;

    const sortOrder = Math.max(0, Math.floor(Number(draft.sortOrder) || 0));
    const bannerName = draft.bannerName.trim() || banner.bannerName;

    setSavingId(banner.id);
    try {
      await updatePlatformBanner(collectionName, banner.id, { sortOrder, bannerName });
      toast.success('Banner updated');
      await load();
    } catch {
      toast.error('Failed to save banner');
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (id: string, patch: Partial<DraftEdits[string]>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const isDirty = (banner: PlatformBanner) => {
    const draft = drafts[banner.id];
    if (!draft) return false;
    return (
      draft.sortOrder !== banner.sortOrder ||
      draft.bannerName.trim() !== banner.bannerName
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 py-10 px-6 text-center">
        <Layers className="h-9 w-9 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">No {platform.toUpperCase()} carousel banners yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Upload a wallpaper and enable &quot;Add as Banner&quot; (iOS) to feature it on the home hero.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {banners.map((banner) => {
          const draft = drafts[banner.id] ?? {
            sortOrder: banner.sortOrder,
            bannerName: banner.bannerName,
          };
          return (
            <div
              key={banner.id}
              className="rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col sm:flex-row"
            >
              <div className="relative sm:w-48 aspect-[16/10] sm:aspect-auto bg-muted shrink-0">
                {banner.bannerUrl ? (
                  <img
                    src={banner.bannerUrl}
                    alt={banner.bannerName || 'Banner'}
                    className="w-full h-full object-cover min-h-[100px]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 text-[10px] bg-black/50 text-white border-0"
                >
                  Order {banner.sortOrder}
                </Badge>
              </div>

              <div className="flex-1 p-4 space-y-3 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Banner name</Label>
                    <Input
                      value={draft.bannerName}
                      onChange={(e) => updateDraft(banner.id, { bannerName: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sort order</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft.sortOrder}
                      onChange={(e) =>
                        updateDraft(banner.id, {
                          sortOrder: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="h-9"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {collectionName}/{banner.id}
                  <span className="block truncate text-muted-foreground/80">
                    Wallez/{banner.wallpaperId || banner.id}
                  </span>
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!isDirty(banner) || savingId === banner.id}
                    onClick={() => handleSave(banner)}
                  >
                    {savingId === banner.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={deletingId === banner.id}
                    onClick={() => handleDelete(banner)}
                  >
                    {deletingId === banner.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Path: <code>{collectionName}/{'{auto-id}'}</code> · Lower sort order appears first in the app
      </p>
    </div>
  );
};

const BannersEditorCard: React.FC<BannersEditorCardProps> = ({ hideTitle = false }) => {
  const [platform, setPlatform] = useState<BannerPlatform>('ios');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      {!hideTitle ? (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-[#2EE6C5]" />
            Home carousel banners
          </CardTitle>
        </CardHeader>
      ) : null}

      <CardContent className={cn(!hideTitle && 'pt-0', 'space-y-4')}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground max-w-xl">
            Flat Firestore docs with auto IDs and <strong>sortOrder</strong>. Add iOS banners via{' '}
            <Link to="/add-wallpaper" className="text-[#2EE6C5] hover:underline">
              Upload
            </Link>{' '}
            → Add as Banner.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <Tabs value={platform} onValueChange={(v) => setPlatform(v as BannerPlatform)}>
          <TabsList>
            <TabsTrigger value="ios">BannersiOS</TabsTrigger>
            <TabsTrigger value="android">BannersAndroid</TabsTrigger>
          </TabsList>

          <TabsContent value="ios" className="mt-4">
            <PlatformBannerList
              key={`ios-${refreshKey}`}
              platform="ios"
              collectionName={BANNERS_IOS_COLLECTION}
            />
          </TabsContent>

          <TabsContent value="android" className="mt-4">
            <PlatformBannerList
              key={`android-${refreshKey}`}
              platform="android"
              collectionName={BANNERS_ANDROID_COLLECTION}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BannersEditorCard;
