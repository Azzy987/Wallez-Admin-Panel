import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AppPromo,
  addAppPromo,
  getAppPromos,
  deleteAppPromo,
  getExistingBannerSubcollections,
  getBannersByBrandAndSubcollection,
  attachAppPromoToBanner,
  deleteBannerDoc,
} from '@/lib/firebase';
import { AVAILABLE_BRAND_APPS } from '@/components/BannerAppSelector';
import { toast } from 'sonner';
import { Layers, Trash2, Loader2, Plus, Link2, ImageIcon, RefreshCw } from 'lucide-react';


async function uploadImageToS3(file: File): Promise<string> {
  const res = await fetch('/api/s3-presign-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: 'app-promos', filename: file.name, contentType: file.type }),
  });
  if (!res.ok) throw new Error('Failed to get presigned URL');
  const { uploadUrl, publicUrl, fileExists } = await res.json();
  if (fileExists) return publicUrl;
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!put.ok) throw new Error('S3 upload failed');
  return publicUrl;
}

// ─── App Promos Tab ───────────────────────────────────────────────────────────
const AppPromosTab: React.FC = () => {
  const [promos, setPromos] = useState<AppPromo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      setPromos(await getAppPromos());
    } catch {
      toast.error('Failed to load app promos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleAdd = async () => {
    if (!appName.trim()) { toast.error('App name is required'); return; }
    if (!appUrl.trim()) { toast.error('App URL is required'); return; }
    if (!imageFile) { toast.error('Please select a background image'); return; }
    setSaving(true);
    try {
      const imageUrl = await uploadImageToS3(imageFile);
      await addAppPromo({ appName: appName.trim(), appUrl: appUrl.trim(), imageUrl });
      toast.success('App promo created');
      setAppName(''); setAppUrl(''); setImageFile(null); setImagePreview('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create app promo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAppPromo(id);
      toast.success('App promo deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Add New App Promo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>App Name</Label>
              <Input
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="e.g. Samsung Wallpapers"
              />
            </div>
            <div className="space-y-1">
              <Label>App URL</Label>
              <Input
                value={appUrl}
                onChange={e => setAppUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Background Image</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="max-h-40 mx-auto rounded object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-4">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Click to select image</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <Button onClick={handleAdd} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Create App Promo'}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Saved App Promos ({promos.length})</h3>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : promos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No app promos yet. Create one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map(promo => (
            <Card key={promo.id}>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="font-medium">{promo.appName}</p>
                  <p className="text-xs text-muted-foreground truncate">{promo.appUrl}</p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">ID: {promo.id.slice(0, 8)}…</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(promo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Attach to App Tab ────────────────────────────────────────────────────────
const AttachToAppTab: React.FC = () => {
  const [promos, setPromos] = useState<AppPromo[]>([]);
  const [brandApp, setBrandApp] = useState('');
  const [subcollections, setSubcollections] = useState<string[]>([]);
  const [subcollection, setSubcollection] = useState('');
  const [bannerDocs, setBannerDocs] = useState<Array<{ id: string; [k: string]: any }>>([]);
  const [selectedPromo, setSelectedPromo] = useState('');
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    getAppPromos().then(setPromos).catch(() => toast.error('Failed to load promos'));
  }, []);

  const handleBrandChange = async (brand: string) => {
    setBrandApp(brand);
    setSubcollection('');
    setSubcollections([]);
    setBannerDocs([]);
    if (!brand) return;
    setLoadingSubs(true);
    try {
      const subs = await getExistingBannerSubcollections(brand);
      setSubcollections(subs);
    } catch {
      toast.error('Failed to load subcollections');
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleSubcollectionChange = async (sub: string) => {
    setSubcollection(sub);
    setBannerDocs([]);
    if (!brandApp || !sub) return;
    setLoadingDocs(true);
    try {
      setBannerDocs(await getBannersByBrandAndSubcollection(brandApp, sub));
    } catch {
      toast.error('Failed to load banner docs');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleAttach = async () => {
    if (!brandApp) { toast.error('Select a brand app'); return; }
    if (!subcollection) { toast.error('Select a subcollection'); return; }
    if (!selectedPromo) { toast.error('Select an app promo'); return; }

    const promo = promos.find(p => p.id === selectedPromo);
    if (!promo) return;

    setAttaching(true);
    try {
      await attachAppPromoToBanner(brandApp, subcollection, promo.id, {
        bannerName: promo.appName,
        bannerUrl: promo.imageUrl,
        appUrl: promo.appUrl,
        bannerType: 'app_promo',
      });
      toast.success(`"${promo.appName}" attached to ${brandApp} / ${subcollection}`);
      setBannerDocs(await getBannersByBrandAndSubcollection(brandApp, subcollection));
      setSelectedPromo('');
    } catch {
      toast.error('Failed to attach promo');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async (docId: string) => {
    try {
      await deleteBannerDoc(brandApp, subcollection, docId);
      toast.success('Banner removed');
      setBannerDocs(prev => prev.filter(d => d.id !== docId));
    } catch {
      toast.error('Failed to remove banner');
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1 — Brand */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Select Brand App</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={brandApp} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose brand app" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_BRAND_APPS.filter(a => a.id !== 'custom').map(app => (
                <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2 — Subcollection */}
      {brandApp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Select Subcollection</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSubs ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading subcollections…
              </div>
            ) : subcollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subcollections found for {brandApp}.</p>
            ) : (
              <Select value={subcollection} onValueChange={handleSubcollectionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose subcollection" />
                </SelectTrigger>
                <SelectContent>
                  {subcollections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Pick promo & attach */}
      {brandApp && subcollection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3 — Attach an App Promo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {promos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No app promos available. Create one in the App Promos tab first.</p>
            ) : (
              <>
                <Select value={selectedPromo} onValueChange={setSelectedPromo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose app promo" />
                  </SelectTrigger>
                  <SelectContent>
                    {promos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.appName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPromo && (() => {
                  const p = promos.find(x => x.id === selectedPromo);
                  return p ? (
                    <div className="flex gap-3 items-center p-3 border rounded-lg bg-muted/30">
                      {p.imageUrl && <img src={p.imageUrl} alt={p.appName} className="h-14 w-14 object-cover rounded" />}
                      <div>
                        <p className="font-medium text-sm">{p.appName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">{p.appUrl}</p>
                      </div>
                    </div>
                  ) : null;
                })()}

                <Button onClick={handleAttach} disabled={attaching || !selectedPromo} className="w-full">
                  {attaching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  {attaching ? 'Attaching…' : `Attach to ${brandApp} / ${subcollection}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current banners in selected subcollection */}
      {brandApp && subcollection && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">
            Banners in {brandApp} / {subcollection} ({bannerDocs.length})
          </h3>

          {loadingDocs ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : bannerDocs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6 text-muted-foreground text-sm">
                No banners in this subcollection yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bannerDocs.map(d => (
                <Card key={d.id}>
                  <CardContent className="pt-4 space-y-2">
                    {d.imageUrl && (
                      <img src={d.imageUrl} alt={d.bannerName} className="w-full h-24 object-cover rounded" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.bannerName || d.id}</p>
                        {d.bannerUrl && <p className="text-xs text-muted-foreground truncate">{d.bannerUrl}</p>}
                        <Badge variant="outline" className="text-xs mt-1">{d.bannerType || 'wallpaper'}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 shrink-0"
                        onClick={() => handleDetach(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const BannerManagement: React.FC = () => {
  return (
    <Layout>
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-8 w-8 text-primary" />
          Banner Management
        </h1>
        <p className="text-muted-foreground text-sm">
          Create app promos and attach them to brand app banner collections
        </p>
      </div>

      <Tabs defaultValue="promos">
        <TabsList className="mb-6">
          <TabsTrigger value="promos">App Promos</TabsTrigger>
          <TabsTrigger value="attach">Attach to App</TabsTrigger>
        </TabsList>

        <TabsContent value="promos">
          <AppPromosTab />
        </TabsContent>

        <TabsContent value="attach">
          <AttachToAppTab />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default BannerManagement;
