
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Download, ArrowUpDown } from 'lucide-react';
import EditWallpaperDialog from './EditWallpaperDialog';
import { toast } from 'sonner';
import { deleteWallpaper } from '@/lib/firebase';
import { AspectRatio } from "@/components/ui/aspect-ratio";

export interface Wallpaper {
  id: string;
  data: {
    [key: string]: unknown;
    imageUrl: string;
    wallpaperName: string;
    thumbnailUrl?: string;
    thumbnail?: string;
    series?: string;
    views?: number;
    downloads?: number;
    category?: string;
    selectedCategories?: string[];
    timestamp?: unknown;
  };
}

interface WallpaperGridProps {
  wallpapers: Wallpaper[];
  collection: string;
  onWallpaperUpdated?: (updatedWallpapers: Wallpaper[]) => void;
  onWallpaperDeleted?: () => void;
  gridColumns?: number;
  useThumbnails?: boolean;
}

const WallpaperGrid: React.FC<WallpaperGridProps> = ({
  wallpapers,
  collection,
  onWallpaperUpdated,
  onWallpaperDeleted,
  gridColumns = 3,
  useThumbnails = false
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const groupedWallpapers = React.useMemo(() => {
    if (collection !== 'Samsung') return null;
    
    const grouped: Record<string, Wallpaper[]> = {};
    wallpapers.forEach(wallpaper => {
      const series = wallpaper.data.series || 'Unknown';
      if (!grouped[series]) {
        grouped[series] = [];
      }
      grouped[series].push(wallpaper);
    });
    return grouped;
  }, [wallpapers, collection]);

  const handleEdit = (wallpaper: Wallpaper) => {
    setSelectedWallpaper(wallpaper);
    setEditDialogOpen(true);
  };

  const handleDelete = async (wallpaper: Wallpaper) => {
    const isEditWallpaperSection = window.location.pathname.includes('edit-wallpaper');
    
    const hasCategories = Boolean(
      wallpaper.data.category || 
      (wallpaper.data.selectedCategories && 
       wallpaper.data.selectedCategories.length > 0)
    );
    
    if (!isEditWallpaperSection && hasCategories) {
      toast.error("Cannot delete a wallpaper with categories");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this wallpaper? This action cannot be undone.")) {
      setDeleting(wallpaper.id);
      try {
        await deleteWallpaper(collection, wallpaper.id);
        toast.success("Wallpaper deleted successfully");
        if (onWallpaperDeleted) {
          onWallpaperDeleted();
        }
      } catch (error) {
        console.error("Error deleting wallpaper:", error);
        toast.error("Failed to delete wallpaper");
      } finally {
        setDeleting(null);
      }
    }
  };

  const handleWallpaperUpdated = (updatedWallpaper?: Wallpaper['data']) => {
    if (onWallpaperUpdated) {
      const updatedWallpapers = wallpapers.map(wp => 
        wp.id === selectedWallpaper?.id 
          ? { ...selectedWallpaper, data: updatedWallpaper || selectedWallpaper.data }
          : wp
      );
      onWallpaperUpdated(updatedWallpapers);
    }
    toast.success("Wallpaper updated successfully");
  };

  const toThumbnailUrl = (url?: string) => {
    if (!url) return undefined;

    try {
      if (url.includes('d1wqpnbk3wcub7.cloudfront.net')) {
        if (url.includes('/fit-in/')) {
          return url.replace(/\/fit-in\/(?:\{w\}x\{h\}|\d+x\d+)\//, '/fit-in/240x426/');
        }

        const baseUrl = 'https://d1wqpnbk3wcub7.cloudfront.net';
        const pathIndex = url.indexOf('cloudfront.net/') + 'cloudfront.net/'.length;
        const imagePath = url.substring(pathIndex);
        return `${baseUrl}/fit-in/240x426/${imagePath}`;
      }

      return url;
    } catch (error) {
      console.error('Error generating thumbnail URL:', error);
      return url;
    }
  };

  const getThumbnailUrl = (wallpaper: Wallpaper) => {
    if (useThumbnails) {
      const storedThumbnail = toThumbnailUrl(wallpaper.data.thumbnailUrl || wallpaper.data.thumbnail);
      if (storedThumbnail) return storedThumbnail;

      const generatedThumbnail = toThumbnailUrl(wallpaper.data.imageUrl);
      if (generatedThumbnail && generatedThumbnail !== wallpaper.data.imageUrl) {
        return generatedThumbnail;
      }

      const imageUrl = wallpaper.data.imageUrl;
      const lastDotIndex = imageUrl.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return `${imageUrl.substring(0, lastDotIndex)}l${imageUrl.substring(lastDotIndex)}`;
      }
      return imageUrl;
    }
    
    return wallpaper.data.imageUrl;
  };

  const renderWallpaperGrid = (wallpaperList: Wallpaper[]) => {
    const gridClassByColumns: Record<number, string> = {
      3: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4',
      4: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4',
      5: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3',
      6: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3',
    };
    const gridClass = gridClassByColumns[gridColumns] ?? gridClassByColumns[3];
    const isEditWallpaperSection = window.location.pathname.includes('edit-wallpaper');
    
    return (
      <div className={gridClass}>
        {wallpaperList.map((wallpaper) => {
          const hasCategories = Boolean(
            wallpaper.data.category || 
            (wallpaper.data.selectedCategories && 
             wallpaper.data.selectedCategories.length > 0)
          );
          
          return (
            <Card key={wallpaper.id} className="overflow-hidden group">
              <div className="relative">
                <AspectRatio ratio={9/16} className="bg-gray-100">
                  <img
                    src={getThumbnailUrl(wallpaper)}
                    alt={wallpaper.data.wallpaperName || "Wallpaper"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = wallpaper.data.imageUrl;
                    }}
                  />
                  
                  {wallpaper.data.views !== undefined && (
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {wallpaper.data.views}
                    </div>
                  )}
                  
                  {wallpaper.data.downloads !== undefined && (
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      <Download className="h-3 w-3 mr-1" />
                      {wallpaper.data.downloads}
                    </div>
                  )}
                  
                  {collection === 'Samsung' && wallpaper.data.series && (
                    <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded-sm text-center">
                      {wallpaper.data.series}
                    </div>
                  )}
                </AspectRatio>
              </div>
              <CardContent className="p-3 space-y-2">
                <h3 className="font-medium text-sm truncate">
                  {wallpaper.data.wallpaperName || "Untitled Wallpaper"}
                </h3>
                <div className="flex space-x-2 justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(wallpaper)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {(!hasCategories || isEditWallpaperSection) ? (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deleting === wallpaper.id}
                      onClick={() => handleDelete(wallpaper)}
                      title="Delete"
                    >
                      {deleting === wallpaper.id ? (
                        "..."
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <div className="px-2 py-1 text-xs text-amber-600 bg-amber-50 rounded border border-amber-200 flex items-center">
                      Has Categories
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {collection === 'Samsung' && groupedWallpapers ? (
        <div className="space-y-8">
          {Object.entries(groupedWallpapers).map(([series, seriesWallpapers]) => (
            <div key={series} className="space-y-2">
              <h2 className="text-lg font-semibold">{series}</h2>
              {renderWallpaperGrid(seriesWallpapers)}
            </div>
          ))}
        </div>
      ) : (
        renderWallpaperGrid(wallpapers)
      )}

      {selectedWallpaper && (
        <EditWallpaperDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          wallpaper={selectedWallpaper.data}
          collection={collection}
          documentId={selectedWallpaper.id}
          onWallpaperUpdated={handleWallpaperUpdated}
          onWallpaperDeleted={() => {
            if (onWallpaperDeleted) {
              onWallpaperDeleted();
            }
          }}
        />
      )}
    </>
  );
};

export default WallpaperGrid;
