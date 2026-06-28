
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import WallpaperBasicInfo from './WallpaperBasicInfo';
import CategorySelector from './CategorySelector';
import { Category } from '@/lib/firebase';
import { BannerPlatform } from '@/lib/wallezCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { UploadedWallpaperPayload } from '@/lib/imageMetadata';

interface WallpaperForm {
  imageUrl: string;
  wallpaperName: string;
  source: string;
  exclusive: boolean;
  addAsBanner: boolean;
  bannerPlatforms: BannerPlatform[];
  bannerApps: string[];
  selectedBrandApp: string;
  customBrandApp: string;
  subcollectionName: string;
  bannerType?: 'wallpaper' | 'app_promo';
  appPromoName?: string;
  appPromoUrl?: string;
  depthEffect?: boolean;
  selectedCategories: string[];
  selectedDeviceSeries: string[];
  selectedIosVersion?: string;
  appleSelectionType?: 'devices' | 'iosVersions';
  launchYear?: string;
  category?: string;
  subCategory?: string;
  series?: string;
  sameAsCategory?: boolean;
  sameSource?: boolean;
  sameWallpaperName?: boolean;
  sameWallpaperNameBelow?: boolean;
  sameLaunchYear?: boolean;
  dimensions?: string;
  fileSize?: string;
  tags?: string[];
  colors?: string[];
}

interface WallpaperFormItemProps {
  form: WallpaperForm;
  index: number;
  categories: Category[];
  showRemoveButton: boolean;
  onRemove: () => void;
  onFieldChange: (field: keyof WallpaperForm, value: any) => void;
  onCategoryChange: (categoryName: string) => void;
  onRemoveCategory: (category: string) => void;
  onDeviceSeriesChange: (brand: string, deviceSeries: string, checked: boolean) => void;
  onIosVersionChange: (version: string) => void;
  getSelectedMainCategory: () => string;
  getSelectedBrandCategory: () => string;
  showCategories?: boolean;
  onAddMultipleWallpapers?: (payloads: UploadedWallpaperPayload[]) => void;
  dimensions?: string;
  fileSize?: string;
  tags?: string[];
  colors?: string[];
  onClearUploads?: (clearFn: () => void) => void;
  totalWallpapers?: number;
  selectedCategory?: string;
  selectedSubcategory?: string;
  onThumbnailLoad?: () => void;
  onThumbnailError?: () => void;
}

const WallpaperFormItem: React.FC<WallpaperFormItemProps> = ({
  form,
  index,
  categories,
  showRemoveButton,
  onRemove,
  onFieldChange,
  onCategoryChange,
  onRemoveCategory,
  getSelectedMainCategory,
  getSelectedBrandCategory,
  onAddMultipleWallpapers,
  onClearUploads,
  totalWallpapers,
  selectedCategory,
  selectedSubcategory,
  onThumbnailLoad,
  onThumbnailError,
  dimensions,
  fileSize,
  tags,
  colors,
}) => {
  const isMobile = useIsMobile();
  const hasDepthEffectCategory = form.selectedCategories.includes('Depth Effect');
  
  React.useEffect(() => {
    if (hasDepthEffectCategory !== !!form.depthEffect) {
      onFieldChange('depthEffect', hasDepthEffectCategory);
    }
  }, [hasDepthEffectCategory, form.depthEffect, onFieldChange]);
  
  const handleSubCategoryChange = (subCategory: string) => {
    onFieldChange('subCategory', subCategory);
  };
  
  return (
    <Card className="animate-fade-in dark:bg-card dark:text-card-foreground" style={{ animationDelay: `${index * 100}ms` }}>
      <CardHeader className="relative bg-slate-50 dark:bg-slate-800 rounded-t-lg border-b dark:border-slate-700">
        {showRemoveButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 bg-white dark:bg-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-slate-600 hover:text-red-600"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-primary rounded-full"></span>
          Wallpaper {index + 1}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'md:grid-cols-2 gap-6'}`}>
          <WallpaperBasicInfo
            index={index}
            imageUrl={form.imageUrl}
            wallpaperName={form.wallpaperName}
            source={form.source}
            exclusive={form.exclusive}
            addAsBanner={form.addAsBanner}
            bannerPlatforms={form.bannerPlatforms}
            bannerApps={form.bannerApps}
            selectedBrandApp={form.selectedBrandApp}
            customBrandApp={form.customBrandApp}
            subcollectionName={form.subcollectionName}
            bannerType={form.bannerType}
            appPromoName={form.appPromoName}
            appPromoUrl={form.appPromoUrl}
            depthEffect={form.depthEffect || hasDepthEffectCategory}
            sameAsCategory={form.sameAsCategory}
            sameSource={form.sameSource}
            sameWallpaperName={form.sameWallpaperName}
            sameWallpaperNameBelow={form.sameWallpaperNameBelow}
            sameLaunchYear={form.sameLaunchYear}
            launchYear={form.launchYear}
            showLaunchYear={false}
            onChange={(field, value) => onFieldChange(field as keyof WallpaperForm, value)}
            onAddMultipleWallpapers={onAddMultipleWallpapers}
            onClearUploads={onClearUploads}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            totalWallpapers={totalWallpapers}
            onThumbnailLoad={onThumbnailLoad}
            onThumbnailError={onThumbnailError}
            dimensions={dimensions}
            fileSize={fileSize}
            tags={tags}
            colors={colors}
          />
          
          {index === 0 && (
            <div className="space-y-6">
              <CategorySelector
                categories={categories}
                selectedCategories={form.selectedCategories}
                onCategoryChange={onCategoryChange}
                onRemoveCategory={onRemoveCategory}
                getSelectedMainCategory={getSelectedMainCategory}
                getSelectedBrandCategory={getSelectedBrandCategory}
                onSubCategoryChange={handleSubCategoryChange}
                selectedSubCategory={form.subCategory}
              />

              <div className="rounded-md border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 space-y-3">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Where uploads go</p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc pl-4">
                  <li><strong>Home tab</strong> — saved to the <code className="text-xs">Wallez</code> collection. Trending &amp; Popular filters sort by views and downloads automatically.</li>
                  <li><strong>Home carousel banner</strong> — enable &quot;Add as Banner&quot;, pick iOS and/or Android; manage under Categories.</li>
                </ul>
              </div>
            </div>
          )}
          
          {index > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium mb-2">Using settings from Wallpaper 1</p>
              <p>Style category and Wallez settings are inherited from the first wallpaper.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WallpaperFormItem;
