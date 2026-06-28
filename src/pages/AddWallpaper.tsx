
import React from 'react';
import Layout from '@/components/Layout';
import AddWallpaperForm from '@/components/wallpaper/AddWallpaperForm';
import { ImagePlus, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

const AddWallpaper = () => {
  const isMobile = useIsMobile();
  
  return (
    <Layout>
      <div className="flex flex-col space-y-2 mb-4">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold flex items-center gap-2 animate-fade-in`}>
          <ImagePlus className="h-8 w-8 text-primary" />
          Add Wallez Wallpaper
        </h1>
        <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
          Upload glass wallpapers to the Wallez iOS app
        </p>
      </div>

      <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100 space-y-2">
              <p className="font-medium">Auto metadata on upload</p>
              <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
                File size (KB up to 1024, then <strong>MB</strong> e.g. 1.5 MB), dimensions (width×height e.g. 2160×3480),
                up to 6 color swatches, and tags (goku, amoled, dark, etc.) are detected automatically.
                <strong> searchTokens</strong> are generated on save from the name, categories, and tags — used for typing in the app search bar.
                <strong> colors</strong> and <strong>tags</strong> power the Search screen filter chips.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddWallpaperForm />
    </Layout>
  );
};

export default AddWallpaper;
