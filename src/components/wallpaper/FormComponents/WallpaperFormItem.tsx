
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import WallpaperBasicInfo from './WallpaperBasicInfo';
import CategorySelector from './CategorySelector';
import DeviceSelector from './DeviceSelector';
import { Category, Device } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

interface WallpaperForm {
  imageUrl: string;
  wallpaperName: string;
  source: string;
  exclusive: boolean;
  addAsBanner: boolean;
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
}

interface WallpaperFormItemProps {
  form: WallpaperForm;
  index: number;
  categories: Category[];
  devices: { [key: string]: Device | null };
  showRemoveButton: boolean;
  onRemove: () => void;
  onFieldChange: (field: keyof WallpaperForm, value: any) => void;
  onCategoryChange: (categoryType: 'main' | 'brand', categoryName: string) => void;
  onRemoveCategory: (category: string) => void;
  onAddCategoryClick: () => void;
  onDeviceSeriesChange: (brand: string, deviceSeries: string, checked: boolean) => void;
  onIosVersionChange: (version: string) => void;
  getSelectedMainCategory: () => string;
  getSelectedBrandCategory: () => string;
  showCategories?: boolean;
  onAddMultipleWallpapers?: (urls: string[]) => void;
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
  devices,
  showRemoveButton,
  onRemove,
  onFieldChange,
  onCategoryChange,
  onRemoveCategory,
  onAddCategoryClick,
  onDeviceSeriesChange,
  onIosVersionChange,
  getSelectedMainCategory,
  getSelectedBrandCategory,
  showCategories = true,
  onAddMultipleWallpapers,
  onClearUploads,
  totalWallpapers,
  selectedCategory,
  selectedSubcategory,
  onThumbnailLoad,
  onThumbnailError
}) => {
  const isMobile = useIsMobile();
  // Check if a depth effect category is selected
  const hasDepthEffectCategory = form.selectedCategories.includes('Depth Effect');
  
  // If depth effect category is selected, update the form's depthEffect field
  React.useEffect(() => {
    if (hasDepthEffectCategory !== !!form.depthEffect) {
      onFieldChange('depthEffect', hasDepthEffectCategory);
    }
  }, [hasDepthEffectCategory, form.depthEffect, onFieldChange]);
  
  // Show launch year when a device series is selected
  const showLaunchYear = form.selectedDeviceSeries.length > 0;
  
  // Handle subcategory change
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
            showLaunchYear={showLaunchYear}
            onChange={(field, value) => onFieldChange(field as keyof WallpaperForm, value)}
            onAddMultipleWallpapers={onAddMultipleWallpapers}
            onClearUploads={onClearUploads}
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            totalWallpapers={totalWallpapers}
            onThumbnailLoad={onThumbnailLoad}
            onThumbnailError={onThumbnailError}
          />
          
          {/* Only show categories and device selectors for the first wallpaper */}
          {index === 0 && (
            <div className="space-y-6">
              <CategorySelector
                categories={categories}
                selectedCategories={form.selectedCategories}
                onCategoryChange={onCategoryChange}
                onRemoveCategory={onRemoveCategory}
                onAddCategoryClick={onAddCategoryClick}
                getSelectedMainCategory={getSelectedMainCategory}
                getSelectedBrandCategory={getSelectedBrandCategory}
                onSubCategoryChange={handleSubCategoryChange}
                selectedSubCategory={form.subCategory}
              />
              
              {form.selectedCategories
                .filter(cat => categories.find(c => c.categoryName === cat && c.categoryType === 'brand'))
                .map(brandCategory => (
                  <DeviceSelector
                    key={`${brandCategory}-devices`}
                    brandCategory={brandCategory}
                    devices={devices}
                    selectedDeviceSeries={form.selectedDeviceSeries}
                    selectedIosVersion={form.selectedIosVersion}
                    appleSelectionType={form.appleSelectionType}
                    onDeviceSeriesChange={onDeviceSeriesChange}
                    onIosVersionChange={onIosVersionChange}
                    onAppleSelectionTypeChange={
                      brandCategory === 'Apple' 
                        ? (type: 'devices' | 'iosVersions') => onFieldChange('appleSelectionType', type)
                        : undefined
                    }
                    formId={`${index}`}
                  />
                ))}
            </div>
          )}
          
          {/* Message for additional wallpapers explaining they inherit categories from Wallpaper 1 */}
          {index > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium mb-2">Using settings from Wallpaper 1</p>
              <p>Categories and device selections will be automatically applied from Wallpaper 1.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WallpaperFormItem;
