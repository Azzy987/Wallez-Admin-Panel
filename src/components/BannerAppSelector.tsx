import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getExistingBannerSubcollections, getDefaultSubcollectionSuggestions } from '@/lib/firebase';

interface BannerAppSelectorProps {
  selectedBrandApp: string;
  customBrandApp: string;
  subcollectionName: string;
  bannerType?: 'wallpaper' | 'app_promo';
  appPromoName?: string;
  appPromoUrl?: string;
  onBrandAppChange: (brandApp: string) => void;
  onCustomBrandAppChange: (customApp: string) => void;
  onSubcollectionNameChange: (name: string) => void;
  onBannerTypeChange?: (type: 'wallpaper' | 'app_promo') => void;
  onAppPromoNameChange?: (name: string) => void;
  onAppPromoUrlChange?: (url: string) => void;
  className?: string;
}

// Available brand apps for banner selection
export const AVAILABLE_BRAND_APPS = [
  { id: 'WallezWallpapers', name: 'Wallez (iOS)', description: 'Wallez glass wallpapers iOS app banners' },
  { id: 'SamsungWallpapers', name: 'Samsung Wallpapers', description: 'Samsung wallpaper app banners' },
  { id: 'OnePlusWallpapers', name: 'OnePlus Wallpapers', description: 'OnePlus wallpaper app banners' },
  { id: 'XiaomiWallpapers', name: 'Xiaomi Wallpapers', description: 'Xiaomi wallpaper app banners' },
  { id: 'iPhoneWallpapers', name: 'iPhone Wallpapers', description: 'Apple/iPhone wallpaper app banners' },
  { id: 'custom', name: 'Custom App', description: 'Custom brand or app-specific banners' }
];


const BannerAppSelector: React.FC<BannerAppSelectorProps> = ({
  selectedBrandApp,
  customBrandApp,
  subcollectionName,
  bannerType = 'wallpaper',
  appPromoName = '',
  appPromoUrl = '',
  onBrandAppChange,
  onCustomBrandAppChange,
  onSubcollectionNameChange,
  onBannerTypeChange,
  onAppPromoNameChange,
  onAppPromoUrlChange,
  className = ""
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [existingSubcollections, setExistingSubcollections] = useState<string[]>([]);
  const [loadingSubcollections, setLoadingSubcollections] = useState(false);

  const suggestions = getDefaultSubcollectionSuggestions(selectedBrandApp);

  // Fetch existing subcollections when brand app changes
  useEffect(() => {
    const fetchExistingSubcollections = async () => {
      if (!selectedBrandApp || selectedBrandApp === 'custom') {
        setExistingSubcollections([]);
        return;
      }

      setLoadingSubcollections(true);
      try {
        const existing = await getExistingBannerSubcollections(selectedBrandApp);
        setExistingSubcollections(existing);
        console.log(`Found ${existing.length} existing subcollections for ${selectedBrandApp}:`, existing);
      } catch (error) {
        console.error('Error fetching existing subcollections:', error);
        setExistingSubcollections([]);
      } finally {
        setLoadingSubcollections(false);
      }
    };

    fetchExistingSubcollections();
  }, [selectedBrandApp]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-sm font-medium">Banner App Configuration</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Configure which brand app and subcollection will contain this banner
        </p>
      </div>

      {/* Banner Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Banner Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`bannerType-${selectedBrandApp}`}
              value="wallpaper"
              checked={bannerType === 'wallpaper'}
              onChange={() => onBannerTypeChange?.('wallpaper')}
              className="accent-blue-600"
            />
            <span className="text-sm">Wallpaper</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`bannerType-${selectedBrandApp}`}
              value="app_promo"
              checked={bannerType === 'app_promo'}
              onChange={() => onBannerTypeChange?.('app_promo')}
              className="accent-blue-600"
            />
            <span className="text-sm">App Promo</span>
          </label>
        </div>
        {bannerType === 'app_promo' && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Image will be stored in <code className="bg-blue-50 dark:bg-blue-900/30 px-1 rounded">app-promos/</code> folder on S3
          </p>
        )}
      </div>

      {/* App Promo fields — only shown for app_promo type */}
      {bannerType === 'app_promo' && (
        <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
            App promo banner — no wallpaper image needed
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium">App Name</Label>
            <Input
              value={appPromoName}
              onChange={(e) => onAppPromoNameChange?.(e.target.value)}
              placeholder="e.g. Samsung Wallpapers"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">App URL</Label>
            <Input
              value={appPromoUrl}
              onChange={(e) => onAppPromoUrlChange?.(e.target.value)}
              placeholder="https://play.google.com/store/apps/..."
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Stored as <code className="bg-muted px-1 rounded">bannerUrl</code> — users are taken here when they tap the banner
            </p>
          </div>
        </div>
      )}

      {/* Brand App Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Brand App</Label>
        <Select value={selectedBrandApp} onValueChange={onBrandAppChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select brand app for banner" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_BRAND_APPS.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{app.name}</span>
                  <span className="text-xs text-muted-foreground">{app.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Brand App Input */}
      {selectedBrandApp === 'custom' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Custom Brand App Name</Label>
          <Input
            value={customBrandApp}
            onChange={(e) => onCustomBrandAppChange(e.target.value)}
            placeholder="Enter custom brand app name (e.g., 'MyCustomWallpapers')"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            This will create: Banners/{customBrandApp || 'CustomApp'}/...
          </p>
        </div>
      )}

      {/* Subcollection Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Subcollection</Label>

        {/* Show existing subcollections if available */}
        {existingSubcollections.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Select existing subcollection:</Label>
            <Select
              value={existingSubcollections.includes(subcollectionName) ? subcollectionName : ""}
              onValueChange={(value) => {
                if (value === "create-new") {
                  setShowCreateNew(true);
                  onSubcollectionNameChange('');
                } else {
                  setShowCreateNew(false);
                  onSubcollectionNameChange(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose existing subcollection or create new" />
              </SelectTrigger>
              <SelectContent>
                {existingSubcollections.map((subcollection) => (
                  <SelectItem key={subcollection} value={subcollection}>
                    {subcollection}
                  </SelectItem>
                ))}
                <SelectItem value="create-new" className="text-blue-600 font-medium">
                  + Create New Subcollection
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Show create new section if no existing subcollections or user chose create new */}
        {(existingSubcollections.length === 0 || showCreateNew || !existingSubcollections.includes(subcollectionName)) && (
          <div className="space-y-2">
            {existingSubcollections.length > 0 && (
              <Label className="text-xs text-muted-foreground">Create new subcollection:</Label>
            )}

            <Input
              value={subcollectionName}
              onChange={(e) => onSubcollectionNameChange(e.target.value)}
              placeholder="Enter new subcollection name (e.g., 'OnePlus7Banners')"
              className="w-full"
            />

            {/* Show suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Suggestions:</Label>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    {showSuggestions ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showSuggestions && (
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          onSubcollectionNameChange(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loadingSubcollections && (
          <p className="text-xs text-muted-foreground">Loading existing subcollections...</p>
        )}

        <p className="text-xs text-muted-foreground">
          Final structure: Banners/
          {selectedBrandApp === 'custom' ? (customBrandApp || 'CustomApp') : selectedBrandApp}/
          {subcollectionName || 'SubcollectionName'}/banner-document
        </p>
      </div>

      {/* Current Configuration Summary */}
      {selectedBrandApp && subcollectionName && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">Will save to:</span>{' '}
            <code className="text-xs bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">
              Banners/{selectedBrandApp === 'custom' ? (customBrandApp || 'CustomApp') : selectedBrandApp}/{subcollectionName}/[id]
            </code>
          </p>
        </div>
      )}
    </div>
  );
};

export { AVAILABLE_BRAND_APPS as AVAILABLE_APPS };

export default BannerAppSelector;