
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Check, Trash2, Plus, X, PlusCircle, Eye, Download } from 'lucide-react';
import { updateWallpaper, deleteWallpaper, getCategories, getDevices, Category, Device, isStyleCategory } from '@/lib/firebase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface WallpaperData {
  [key: string]: any;
  imageUrl: string;
  wallpaperName: string;
  thumbnailUrl?: string;
  views?: number;
  downloads?: number;
  timestamp?: any;
  category?: string;
  subCategory?: string;
}

interface EditWallpaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallpaper: WallpaperData;
  collection: string;
  documentId: string;
  onWallpaperUpdated: (updatedWallpaper?: WallpaperData) => void;
  onWallpaperDeleted: () => void;
}

const EditWallpaperDialog: React.FC<EditWallpaperDialogProps> = ({
  open,
  onOpenChange,
  wallpaper,
  collection,
  documentId,
  onWallpaperUpdated,
  onWallpaperDeleted
}) => {
  const [editedWallpaper, setEditedWallpaper] = useState<WallpaperData>({
    imageUrl: '',
    wallpaperName: '',
    views: 0,
    downloads: 0
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<{ [key: string]: Device | null }>({});
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [showAddField, setShowAddField] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState<string>("12");
  const [minute, setMinute] = useState<string>("00");
  const [second, setSecond] = useState<string>("00");
  const [amPm, setAmPm] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (open && wallpaper) {
      const initializedWallpaper = {
        ...wallpaper,
        views: wallpaper.views || 0,
        downloads: wallpaper.downloads || 0
      };
      
      setEditedWallpaper(initializedWallpaper);
      
      if (wallpaper.timestamp) {
        try {
          let dateObj;
          if (typeof wallpaper.timestamp.toDate === 'function') {
            dateObj = wallpaper.timestamp.toDate();
          } else if (wallpaper.timestamp.seconds) {
            dateObj = new Date(wallpaper.timestamp.seconds * 1000);
          } else {
            dateObj = new Date(wallpaper.timestamp);
          }
          
          if (!isNaN(dateObj.getTime())) {
            setDate(dateObj);
            
            const hours = dateObj.getHours();
            const isPM = hours >= 12;
            setAmPm(isPM ? "PM" : "AM");
            
            const hour12 = hours % 12 || 12;
            setHour(hour12.toString().padStart(2, '0'));
            setMinute(dateObj.getMinutes().toString().padStart(2, '0'));
            setSecond(dateObj.getSeconds().toString().padStart(2, '0'));
          }
        } catch (error) {
          console.error("Error parsing timestamp:", error);
        }
      }
      
      if (collection === 'TrendingWallpapers') {
        fetchCategories();
      }
      
      if (collection !== 'TrendingWallpapers' && collection !== 'Banners') {
        fetchDevices(collection);
      }
    }
  }, [open, wallpaper, collection]);

  const fetchCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchDevices = async (brand: string) => {
    try {
      const devicesData = await getDevices(brand);
      
      if (devicesData) {
        if ('devices' in devicesData) {
          setDevices(prev => ({ ...prev, [brand]: devicesData as Device }));
        } else {
          const formattedDeviceData: Device = {
            devices: Array.isArray(devicesData.devices) ? devicesData.devices : [],
            iosVersions: Array.isArray(devicesData.iosVersions) ? devicesData.iosVersions : []
          };
          setDevices(prev => ({ ...prev, [brand]: formattedDeviceData }));
        }
      }
    } catch (error) {
      console.error(`Error fetching devices for ${brand}:`, error);
      toast.error(`Failed to load devices for ${brand}`);
    }
  };

  const handleChange = (field: string, value: any) => {
    setEditedWallpaper(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddNewField = () => {
    if (!newFieldName.trim()) {
      toast.error('Field name is required');
      return;
    }
    
    setEditedWallpaper(prev => ({
      ...prev,
      [newFieldName]: newFieldValue
    }));
    
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddField(false);
    toast.success(`Field "${newFieldName}" added`);
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const updatedData: WallpaperData = {
        ...editedWallpaper,
        imageUrl: wallpaper.imageUrl,
        wallpaperName: editedWallpaper.wallpaperName || wallpaper.wallpaperName,
        views: parseInt(editedWallpaper.views?.toString() || '0', 10),
        downloads: parseInt(editedWallpaper.downloads?.toString() || '0', 10)
      };
      
      // If there's a category but no subcategory, set subcategory to None
      if (updatedData.category && !updatedData.subCategory) {
        updatedData.subCategory = "None";
      }
      
      if (date) {
        const dateObj = new Date(date);
        let hours = parseInt(hour);
        if (amPm === "PM" && hours < 12) hours += 12;
        if (amPm === "AM" && hours === 12) hours = 0;
        
        dateObj.setHours(hours);
        dateObj.setMinutes(parseInt(minute));
        dateObj.setSeconds(parseInt(second));
        
        updatedData.timestamp = {
          seconds: Math.floor(dateObj.getTime() / 1000),
          nanoseconds: 0
        };
      }
      
      if (updatedData.thumbnail) {
        delete updatedData.thumbnailUrl;
      }
      
      await updateWallpaper(collection, documentId, updatedData);
      toast.success('Wallpaper updated successfully');
      onWallpaperUpdated(updatedData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating wallpaper:', error);
      toast.error('Failed to update wallpaper');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this wallpaper? This action cannot be undone.')) {
      setDeleteLoading(true);
      
      try {
        await deleteWallpaper(collection, documentId);
        toast.success('Wallpaper deleted successfully');
        onWallpaperDeleted();
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting wallpaper:', error);
        toast.error('Failed to delete wallpaper');
      } finally {
        setDeleteLoading(false);
      }
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutesSeconds = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const mainCategories = categories.filter(cat => isStyleCategory(cat.categoryName));
  const displayImageUrl = wallpaper.thumbnailUrl || wallpaper.imageUrl;

  const shouldRenderField = (fieldName: string): boolean => {
    if (fieldName === 'depthEffect' && collection !== 'TrendingWallpapers') {
      return false;
    }
    return true;
  };

  const renderField = (key: string, value: any) => {
    if (['imageUrl', 'wallpaperName', 'views', 'downloads', 'timestamp', 'thumbnailUrl', 'thumbnail', 'category', 'subCategory'].includes(key)) {
      return null;
    }

    if (!shouldRenderField(key)) {
      return null;
    }

    switch (typeof value) {
      case 'boolean':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`field-${key}`} className="font-medium capitalize">{key}</Label>
            <RadioGroup
              defaultValue={value ? "true" : "false"}
              onValueChange={(val) => handleChange(key, val === "true")}
            >
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${key}-true`} />
                  <Label htmlFor={`${key}-true`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${key}-false`} />
                  <Label htmlFor={`${key}-false`}>No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        );

      case 'number':
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={`field-${key}`} className="font-medium capitalize">{key}</Label>
            <Input
              id={`field-${key}`}
              type="number"
              value={value}
              onChange={(e) => handleChange(key, parseInt(e.target.value, 10) || 0)}
            />
          </div>
        );

      default:
        if (key === 'series' && collection !== 'TrendingWallpapers' && devices[collection]?.devices) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor="series" className="font-medium capitalize">Device Series</Label>
              <Select
                value={value || ''}
                onValueChange={(value) => handleChange('series', value)}
              >
                <SelectTrigger id="series">
                  <SelectValue placeholder="Select Device Series" />
                </SelectTrigger>
                <SelectContent>
                  {devices[collection]?.devices.map(device => (
                    <SelectItem key={device} value={device}>
                      {device}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else if (key === 'iosVersion' && collection === 'Apple' && devices[collection]?.iosVersions) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor="iosVersion" className="font-medium capitalize">iOS Version</Label>
              <Select
                value={value || ''}
                onValueChange={(value) => handleChange('iosVersion', value)}
              >
                <SelectTrigger id="iosVersion">
                  <SelectValue placeholder="Select iOS Version" />
                </SelectTrigger>
                <SelectContent>
                  {devices[collection].iosVersions?.map((version) => (
                    <SelectItem key={version} value={version}>
                      {version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else {
          return (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor={`field-${key}`} className="font-medium capitalize">{key}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => {
                    const { [key]: _, ...rest } = editedWallpaper;
                    setEditedWallpaper(rest as WallpaperData);
                    toast.success(`Field "${key}" removed`);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id={`field-${key}`}
                value={value?.toString() || ''}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          );
        }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Wallpaper</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Wallpaper Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-2">
                  <AspectRatio ratio={9/16} className="w-full bg-gray-100 rounded-md overflow-hidden">
                    <img 
                      src={displayImageUrl} 
                      alt={editedWallpaper.wallpaperName || "Wallpaper preview"} 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = wallpaper.imageUrl;
                      }}
                    />
                    
                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">{editedWallpaper.views || 0}</span>
                    </div>
                  </AspectRatio>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wallpaperName">Wallpaper Name</Label>
                      <Input
                        id="wallpaperName"
                        value={editedWallpaper.wallpaperName || ''}
                        onChange={(e) => handleChange('wallpaperName', e.target.value)}
                        placeholder="Wallpaper Name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="views">Views</Label>
                      <Input
                        id="views"
                        type="number"
                        value={editedWallpaper.views || 0}
                        onChange={(e) => handleChange('views', parseInt(e.target.value, 10) || 0)}
                        placeholder="Views"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="downloads">Downloads</Label>
                      <Input
                        id="downloads"
                        type="number"
                        value={editedWallpaper.downloads || 0}
                        onChange={(e) => handleChange('downloads', parseInt(e.target.value, 10) || 0)}
                        placeholder="Downloads"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {collection === 'TrendingWallpapers' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="category" className="font-medium mb-2 block">Main Category</Label>
                      <div className="flex flex-wrap gap-2 w-full">
                        {mainCategories.map(category => (
                          <div 
                            key={category.categoryName} 
                            className={`px-3 py-2 rounded-md border cursor-pointer transition-colors ${editedWallpaper.category === category.categoryName ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                            onClick={() => handleChange('category', category.categoryName)}
                          >
                            {category.categoryName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    Timestamp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-3">
                    <div className="w-full">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="hour" className="text-xs">Hour</Label>
                        <Select value={hour} onValueChange={setHour}>
                          <SelectTrigger id="hour" className="h-9">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {hours.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="minute" className="text-xs">Minute</Label>
                        <Select value={minute} onValueChange={setMinute}>
                          <SelectTrigger id="minute" className="h-9">
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutesSeconds.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="second" className="text-xs">Second</Label>
                        <Select value={second} onValueChange={setSecond}>
                          <SelectTrigger id="second" className="h-9">
                            <SelectValue placeholder="Second" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutesSeconds.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ampm" className="text-xs">AM/PM</Label>
                        <Select value={amPm} onValueChange={(value) => setAmPm(value as "AM" | "PM")}>
                          <SelectTrigger id="ampm" className="h-9">
                            <SelectValue placeholder="AM/PM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Fields</span>
                {!showAddField && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 flex items-center justify-center gap-2"
                    onClick={() => setShowAddField(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add New Field
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(editedWallpaper).map(([key, value]) => renderField(key, value))}
              </div>
              
              {showAddField && (
                <div className="mt-6 p-4 bg-accent/50 rounded-lg space-y-3">
                  <h3 className="text-sm font-medium">Add New Field</h3>
                  <div>
                    <Label htmlFor="newFieldName">Field Name</Label>
                    <Input
                      id="newFieldName"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Field Name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newFieldValue">Field Value</Label>
                    <Input
                      id="newFieldValue"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      placeholder="Field Value"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleAddNewField}
                    >
                      Add Field
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddField(false);
                        setNewFieldName('');
                        setNewFieldValue('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteLoading ? 'Deleting...' : 'Delete Wallpaper'}
          </Button>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="gap-2"
            >
              {loading ? 'Saving...' : 'Save Changes'}
              {!loading && <Check className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditWallpaperDialog;
