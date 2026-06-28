
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WallpaperGrid from '@/components/wallpaper/WallpaperGrid';
import {
  getCategories,
  getWallpapersPageForBrand,
  isStyleCategory,
  type WallpaperPageCursor,
} from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Wallpaper {
  id: string;
  data: {
    imageUrl: string;
    wallpaperName: string;
    thumbnail?: string;
    thumbnailUrl?: string;
    views?: number;
    downloads?: number;
    timestamp?: { seconds: number };
    primaryCategory?: string;
    category?: string;
    [key: string]: unknown;
  };
}

type SortField = 'timestamp' | 'views' | 'downloads' | 'wallpaperName';

const WALLPAPER_PAGE_SIZE = 15;

type CategoryOption = {
  value: string;
  label: string;
};

const EditWallpaper = () => {
  const [wallezWallpapers, setWallezWallpapers] = useState<Wallpaper[]>([]);
  const [loadingWallez, setLoadingWallez] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageCursor, setPageCursor] = useState<WallpaperPageCursor | null>(null);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([
    { value: 'all', label: 'All categories' },
  ]);

  const fetchCategories = async () => {
    try {
      const categories = await getCategories();
      setCategoryOptions([
        { value: 'all', label: 'All categories' },
        ...categories
          .filter((category) => isStyleCategory(category.categoryName))
          .map((category) => ({
            value: category.categoryName,
            label: category.name || category.categoryName,
          })),
      ]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchWallpapers = useCallback(
    async ({
      append = false,
      cursor = null,
    }: {
      append?: boolean;
      cursor?: WallpaperPageCursor | null;
    } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingWallez(true);
      }

      try {
        const page = await getWallpapersPageForBrand({
          brand: 'Wallez',
          pageSize: WALLPAPER_PAGE_SIZE,
          sortField,
          category: selectedCategory,
          cursor: append ? cursor : null,
        });

        setWallezWallpapers((current) =>
          append ? [...current, ...(page.wallpapers as Wallpaper[])] : (page.wallpapers as Wallpaper[])
        );
        setPageCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch (error) {
        console.error('Error fetching wallpapers:', error);
      } finally {
        setLoadingWallez(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, sortField]
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchWallpapers({ append: false });
  }, [fetchWallpapers]);

  const renderLoading = () => (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <Layout>
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Wallpapers</h1>
          <p className="text-muted-foreground mt-1">
            Manage the Wallez home library. Trending and Popular in the app are sorted automatically by views and downloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timestamp">Newest first</SelectItem>
              <SelectItem value="views">Most views (trending)</SelectItem>
              <SelectItem value="downloads">Most downloads (popular)</SelectItem>
              <SelectItem value="wallpaperName">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingWallez ? (
          renderLoading()
        ) : (
          <>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Card>
              <CardContent className="pt-6">
                {wallezWallpapers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No Wallez wallpapers yet. Upload some from Add Wallpaper.
                  </p>
                ) : (
                  <div className="space-y-6">
                    <WallpaperGrid
                      wallpapers={wallezWallpapers}
                      collection="Wallez"
                      onWallpaperDeleted={() => fetchWallpapers({ append: false })}
                      gridColumns={6}
                      useThumbnails
                    />

                    {hasMore && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => fetchWallpapers({ append: true, cursor: pageCursor })}
                          disabled={loadingMore}
                        >
                          {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Load more
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default EditWallpaper;
