import React, { useState, useEffect } from 'react';
import { 
  addTrendingWallpaperWithId,
  addBrandWallpaperWithId,
  addBannerWithId,
  addBannerToMultipleApps,
  addBannerWithCustomStructure,
  getCategories, 
  getDevices,
  checkDuplicateWallpaper,
  Category,
  Device,
  samsungDeviceYearMap,
  iphoneDeviceYearMap,
  oneplusDeviceYearMap,
  xiaomiDeviceYearMap
} from '@/lib/firebase';
import { toast } from 'sonner';
import CategoryDialog from './CategoryDialog';
import WallpaperFormHeader from './FormComponents/WallpaperFormHeader';
import WallpaperFormItem from './FormComponents/WallpaperFormItem';
import SubmitButton from './FormComponents/SubmitButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';
import { Loader } from 'lucide-react';

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
  bannerType: 'wallpaper' | 'app_promo';
  appPromoName: string;
  appPromoUrl: string;
  depthEffect: boolean;
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

const initialFormState: WallpaperForm = {
  imageUrl: '',
  wallpaperName: '',
  source: 'Official',
  exclusive: false,
  addAsBanner: false,
  bannerApps: [],
  selectedBrandApp: '',
  customBrandApp: '',
  subcollectionName: '',
  bannerType: 'wallpaper',
  appPromoName: '',
  appPromoUrl: '',
  depthEffect: false,
  selectedCategories: [],
  selectedDeviceSeries: [],
  appleSelectionType: 'devices',
  category: '',
  subCategory: '',
  series: '',
  sameAsCategory: false,
  sameSource: false,
  sameWallpaperName: false,
  sameWallpaperNameBelow: false,
  sameLaunchYear: false
};

const appleDeviceYearMap: { [key: string]: number } = {
  "iPhone 16": 2024,
  "iPhone 15": 2023,
  "iPhone 14": 2022,
  "iPhone 13": 2021,
  "iPhone 12": 2020,
  "iPhone 11": 2019,
  "iPhone X": 2017,
  "iPhone 8": 2017,
  "iPhone 7": 2016,
  "iPad Pro": 2021,
  "iPad Air": 2022,
  "iPad Mini": 2021
};

const googleDeviceYearMap: { [key: string]: number } = {
  "Pixel 9": 2024,
  "Pixel 8": 2023,
  "Pixel 7": 2022,
  "Pixel 6": 2021,
  "Pixel 5": 2020,
  "Pixel 4": 2019,
  "Pixel 3": 2018,
  "Pixel 2": 2017,
  "Pixel": 2016
};

const AddWallpaperForm: React.FC = () => {
  const [wallpaperForms, setWallpaperForms] = useState<WallpaperForm[]>([
    { ...initialFormState }
  ]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<{[key: string]: Device | null}>({});
  const [loading, setLoading] = useState(false);
  const [showBrandOptions, setShowBrandOptions] = useState<{[key: string]: boolean}>({});
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [useSharedCategories, setUseSharedCategories] = useState(false);
  const [wallpaperCount, setWallpaperCount] = useState<number>(3);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [clearUploadsFunction, setClearUploadsFunction] = useState<(() => void) | null>(null);
  const [showProgressOverlay, setShowProgressOverlay] = useState<boolean>(false);
  const [visibleForms, setVisibleForms] = useState<number>(10); // Start with 10 visible forms
  const [isProgressiveLoading, setIsProgressiveLoading] = useState<boolean>(false);
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState<number>(0);
  const [thumbnailsFailed, setThumbnailsFailed] = useState<number>(0);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, []);

  // Progressive form loading for large batches
  useEffect(() => {
    if (wallpaperForms.length > 20) {
      if (visibleForms < wallpaperForms.length) {
        setIsProgressiveLoading(true);
        
        const loadMoreForms = () => {
          const remainingForms = wallpaperForms.length - visibleForms;
          const batchSize = Math.min(5, remainingForms); // Load 5 forms at a time
          
          setTimeout(() => {
            setVisibleForms(prev => {
              const newVisible = Math.min(prev + batchSize, wallpaperForms.length);
              
              // Continue loading if there are more forms
              if (newVisible < wallpaperForms.length) {
                requestAnimationFrame(loadMoreForms);
              } else {
                setIsProgressiveLoading(false);
              }
              
              return newVisible;
            });
          }, 50); // Smaller delay for smoother loading
        };
        
        requestAnimationFrame(loadMoreForms);
      } else {
        setIsProgressiveLoading(false);
      }
    } else {
      setVisibleForms(wallpaperForms.length);
      setIsProgressiveLoading(false);
    }
  }, [wallpaperForms.length]); // Remove visibleForms dependency to prevent infinite loop
  
  const getUrlWithL = (url: string): string => {
    try {
      // Check if URL already contains the CloudFront domain and transformation pattern
      if (url.includes('d1wqpnbk3wcub7.cloudfront.net') && url.includes('/fit-in/360x640/')) {
        return url;
      }
      
      // If it's a CloudFront URL but doesn't have the transformation, add it
      if (url.includes('d1wqpnbk3wcub7.cloudfront.net')) {
        const baseUrl = 'https://d1wqpnbk3wcub7.cloudfront.net';
        const pathIndex = url.indexOf('cloudfront.net/') + 'cloudfront.net/'.length;
        const imagePath = url.substring(pathIndex);
        return `${baseUrl}/fit-in/360x640/${imagePath}`;
      }
      
      // For other URLs (like imgur), keep the original logic
      const lastDotIndex = url.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        return `${url.substring(0, lastDotIndex)}l${url.substring(lastDotIndex)}`;
      }
      return url;
    } catch (error) {
      console.error('Error generating thumbnail URL:', error);
      return url; // Return original URL as fallback
    }
  };
  
  const handleAddSameCategoryWallpaper = (count: number = 1) => {
    if (wallpaperForms.length === 0) return;
    
    const firstForm = wallpaperForms[0];
    const newForms = [];
    
    for (let i = 0; i < count; i++) {
      newForms.push({ 
        ...initialFormState,
        wallpaperName: firstForm.wallpaperName,
        source: firstForm.source,
        exclusive: firstForm.exclusive,
        addAsBanner: firstForm.addAsBanner,
        selectedBrandApp: firstForm.selectedBrandApp,
        customBrandApp: firstForm.customBrandApp,
        subcollectionName: firstForm.subcollectionName,
        depthEffect: firstForm.depthEffect,
        selectedCategories: [...firstForm.selectedCategories],
        selectedDeviceSeries: [...firstForm.selectedDeviceSeries],
        selectedIosVersion: firstForm.selectedIosVersion,
        launchYear: firstForm.launchYear,
        category: firstForm.category,
        subCategory: firstForm.subCategory,
        series: firstForm.series,
        sameAsCategory: true
      });
    }
    
    setWallpaperForms(prevForms => [...prevForms, ...newForms]);
  };
  
  const handleAddDifferentCategoryWallpaper = () => {
    setWallpaperForms(prevForms => [
      ...prevForms,
      { ...initialFormState, sameAsCategory: false }
    ]);
  };
  
  const handleRemoveWallpaperForm = (index: number) => {
    if (wallpaperForms.length === 1) return;
    
    setWallpaperForms(prevForms => 
      prevForms.filter((_, i) => i !== index)
    );
  };

  // Handle multiple wallpaper creation from S3 uploads
  const handleAddMultipleWallpapers = (urls: string[]) => {
    console.log('🚀 Creating wallpaper forms for URLs:', urls);
    console.log(`📊 Creating ${urls.length} wallpaper forms`);
    
    const newForms = urls.map((url, index) => {
      console.log(`📝 Processing wallpaper #${index + 1}: ${url}`);
      // Determine the wallpaper name based on category selection
      const determineWallpaperName = (url: string): string => {
        const firstForm = wallpaperForms[0];
        const brandCategory = getSelectedBrandCategory(firstForm);
        
        // For Samsung, Apple, OnePlus, and Xiaomi categories, use series name if available, otherwise extract from filename
        if ((brandCategory === 'Samsung' || brandCategory === 'Apple' || brandCategory === 'OnePlus' || brandCategory === 'Xiaomi') && firstForm?.series) {
          console.log(`📝 Using ${brandCategory} series name for wallpaper ${index + 1}: "${firstForm.series}"`);
          return firstForm.series;
        }
        
        // For other categories or no series selected, extract from filename
        const extractWallpaperName = (url: string): string => {
          // Extract filename from URL
          const urlParts = url.split('/');
          const filename = urlParts[urlParts.length - 1];
          
          // Remove file extension
          let name = filename.replace(/\.[^/.]+$/, '');
          
          // Remove resolution patterns (e.g., 4k, 2160x3840, 1080p, etc.)
          name = name.replace(/\d{3,4}x\d{3,4}/g, ''); // Remove dimensions like 2160x3840
          name = name.replace(/[_-]?\d{1,4}[kK]/g, ''); // Remove 4k, 1080p, etc.
          name = name.replace(/[_-]?\d{1,4}[pP]/g, ''); // Remove 1080p, 720p, etc.
          
          // Remove common suffixes and numbers at the end
          name = name.replace(/[_-]?\d{6,}$/g, ''); // Remove long numbers like 140741
          name = name.replace(/[_-]?\d{1,2}$/g, ''); // Remove short numbers like -4, -12
          
          // Remove common file suffixes
          name = name.replace(/[_-]?(wallpaper|bg|background|img|image|pic|picture|art|design|hd|ultra|wv|uw|wide|ultrawide|vertical|portrait|landscape)/gi, '');
          
          // Clean up multiple dashes/underscores and trim
          name = name.replace(/[_-]+/g, '-').replace(/^-|-$/g, '');
          
          // Capitalize first letter of each word
          name = name.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          
          // If name is empty after cleaning, use original filename
          if (!name || name.trim() === '') {
            return filename.replace(/\.[^/.]+$/, '');
          }
          
          return name.trim();
        };
        
        const extractedName = extractWallpaperName(url);
        console.log(`📝 Extracted name from filename for wallpaper ${index + 1}: "${extractedName}" from URL: ${url}`);
        return extractedName;
      };
      
      const determinedName = determineWallpaperName(url);
      
      const newForm = {
        ...initialFormState,
        imageUrl: url,
        wallpaperName: determinedName,
        sameAsCategory: wallpaperForms[0]?.sameAsCategory || false,
        sameWallpaperName: wallpaperForms[0]?.sameWallpaperName || false,
        sameLaunchYear: wallpaperForms[0]?.sameLaunchYear || false,
        selectedCategories: wallpaperForms[0]?.selectedCategories || [],
        selectedDeviceSeries: wallpaperForms[0]?.selectedDeviceSeries || [],
        category: wallpaperForms[0]?.category || '',
        subCategory: wallpaperForms[0]?.subCategory || '',
        series: wallpaperForms[0]?.series || '',
        depthEffect: wallpaperForms[0]?.depthEffect || false,
        source: wallpaperForms[0]?.source || 'Official',
        exclusive: wallpaperForms[0]?.exclusive || false,
        addAsBanner: wallpaperForms[0]?.addAsBanner || false,
        selectedBrandApp: wallpaperForms[0]?.selectedBrandApp || '',
        customBrandApp: wallpaperForms[0]?.customBrandApp || '',
        subcollectionName: wallpaperForms[0]?.subcollectionName || '',
        bannerType: wallpaperForms[0]?.bannerType || 'wallpaper',
        appPromoName: wallpaperForms[0]?.appPromoName || '',
        appPromoUrl: wallpaperForms[0]?.appPromoUrl || '',
        selectedIosVersion: wallpaperForms[0]?.selectedIosVersion || '',
        launchYear: wallpaperForms[0]?.launchYear || ''
      };
      
      console.log(`✅ Created form #${index + 1}:`, {
        imageUrl: newForm.imageUrl,
        wallpaperName: newForm.wallpaperName,
        urlValid: newForm.imageUrl.startsWith('http')
      });
      
      return newForm;
    });
    
    console.log(`🎯 Setting ${newForms.length} wallpaper forms`);
    setWallpaperForms(newForms);
    
    // Reset progressive loading and thumbnail counters
    setThumbnailsLoaded(0);
    setThumbnailsFailed(0);
    
    if (newForms.length > 20) {
      setVisibleForms(10); // Start with 10 visible forms for large batches
      toast.success(`📊 Created ${newForms.length} wallpaper forms!`, { duration: 3000 });
      toast.info(`🕐 Thumbnails will load in batches of 3 (800ms delays) to prevent CloudFront overload`, { duration: 6000 });
    } else if (newForms.length > 10) {
      setVisibleForms(newForms.length);
      toast.success(`📊 Created ${newForms.length} wallpaper forms!`, { duration: 2000 });
      toast.info(`🕐 Thumbnails loading progressively to prevent server overload`, { duration: 3000 });
    } else {
      setVisibleForms(newForms.length);
      toast.success(`✅ Created ${newForms.length} wallpaper forms!`);
    }
    
    // Provide user guidance for large batches
    if (newForms.length > 25) {
      setTimeout(() => {
        toast.info(`💡 Large batch detected! Thumbnails are loading in small groups to prevent CloudFront rate limiting. Please wait for all images to load.`, { 
          duration: 8000,
          action: {
            label: 'Got it',
            onClick: () => console.log('User acknowledged large batch guidance')
          }
        });
      }, 2000);
    }
  };
  
  const handleChange = (index: number, field: keyof WallpaperForm, value: any) => {
    setWallpaperForms(prevForms => {
      const updatedForms = [...prevForms];
      
      updatedForms[index] = {
        ...updatedForms[index],
        [field]: value
      };
      
      if (field === 'depthEffect' && value === true) {
        if (!updatedForms[index].selectedCategories.includes('Depth Effect')) {
          updatedForms[index].selectedCategories = [...updatedForms[index].selectedCategories, 'Depth Effect'];
        }
      } else if (field === 'depthEffect' && value === false) {
        updatedForms[index].selectedCategories = updatedForms[index].selectedCategories
          .filter(cat => cat !== 'Depth Effect');
      }
      
      if (index === 0) {
        if (field === 'selectedCategories' || field === 'source' || 
            field === 'exclusive' || field === 'addAsBanner' || field === 'bannerApps' ||
            field === 'selectedBrandApp' || field === 'customBrandApp' || field === 'subcollectionName' ||
            field === 'selectedDeviceSeries' || field === 'selectedIosVersion' || field === 'appleSelectionType' ||
            field === 'category' || field === 'series' || field === 'depthEffect' ||
            field === 'launchYear' || field === 'subCategory' || field === 'sameWallpaperName' ||
            field === 'sameWallpaperNameBelow' || field === 'sameLaunchYear') {
          updatedForms.forEach((form, i) => {
            if (i !== 0 && form.sameAsCategory) {
              updatedForms[i] = {
                ...updatedForms[i],
                [field]: Array.isArray(value) ? [...value] : value
              };
            }
          });
        }
        
        // Special handling for wallpaper name - propagate if sameWallpaperName is checked
        if (field === 'wallpaperName') {
          updatedForms.forEach((form, i) => {
            if (i !== 0 && (form.sameAsCategory || updatedForms[0].sameWallpaperName)) {
              updatedForms[i] = {
                ...updatedForms[i],
                wallpaperName: value
              };
            }
          });
        }
        
        // Special handling for launch year - propagate if sameLaunchYear is checked
        if (field === 'launchYear') {
          updatedForms.forEach((form, i) => {
            if (i !== 0 && (form.sameAsCategory || updatedForms[0].sameLaunchYear)) {
              updatedForms[i] = {
                ...updatedForms[i],
                launchYear: value
              };
            }
          });
        }
        
        // Special handling for sameAsCategory checkbox
        if (field === 'sameAsCategory' && value === true) {
          // If Samsung, Apple, OnePlus, or Xiaomi category and series selected, set wallpaper name to series name
          const brandCategory = getSelectedBrandCategory(updatedForms[0]);
          if ((brandCategory === 'Samsung' || brandCategory === 'Apple' || brandCategory === 'OnePlus' || brandCategory === 'Xiaomi') && updatedForms[0].series) {
            updatedForms[0].wallpaperName = updatedForms[0].series;
            
            // Also update all other forms that have sameAsCategory checked
            updatedForms.forEach((form, i) => {
              if (i !== 0 && form.sameAsCategory) {
                updatedForms[i] = {
                  ...updatedForms[i],
                  wallpaperName: updatedForms[0].series
                };
              }
            });
          }
        }
      }

      // Handle sameSource functionality
      if (field === 'sameSource') {
        if (value === true) {
          // When checking "Same source in all wallpapers"
          const sourceValue = updatedForms[index].source;
          updatedForms.forEach((form, i) => {
            if (i !== index) {
              updatedForms[i] = {
                ...updatedForms[i],
                source: sourceValue
              };
            }
          });
        } else {
          // When unchecking "Same source in all wallpapers", reset all other sources to "Official"
          updatedForms.forEach((form, i) => {
            if (i !== index) {
              updatedForms[i] = {
                ...updatedForms[i],
                source: 'Official'
              };
            }
          });
        }
      }

      // Handle sameWallpaperName functionality
      if (field === 'sameWallpaperName') {
        if (value === true) {
          // When checking "Same wallpaper name in all wallpapers"
          const wallpaperNameValue = updatedForms[index].wallpaperName;
          updatedForms.forEach((form, i) => {
            if (i !== index) {
              updatedForms[i] = {
                ...updatedForms[i],
                wallpaperName: wallpaperNameValue
              };
            }
          });
        }
        // When unchecking, don't reset other wallpaper names as they might be intentionally different
      }

      // Handle sameWallpaperNameBelow functionality
      if (field === 'sameWallpaperNameBelow') {
        if (value === true) {
          // When checking "Same wallpaper name for below items"
          const wallpaperNameValue = updatedForms[index].wallpaperName;
          updatedForms.forEach((form, i) => {
            if (i > index) { // Only apply to items BELOW the current index
              updatedForms[i] = {
                ...updatedForms[i],
                wallpaperName: wallpaperNameValue
              };
            }
          });
        }
        // When unchecking, don't reset other wallpaper names as they might be intentionally different
      }

      // Handle sameLaunchYear functionality
      if (field === 'sameLaunchYear') {
        if (value === true) {
          // When checking "Same launch year in all wallpapers"
          const launchYearValue = updatedForms[index].launchYear;
          updatedForms.forEach((form, i) => {
            if (i !== index) {
              updatedForms[i] = {
                ...updatedForms[i],
                launchYear: launchYearValue
              };
            }
          });
        }
        // When unchecking, don't reset other launch years as they might be intentionally different
      }

      // Handle wallpaper name propagation for sameWallpaperNameBelow (works for any form, not just index 0)
      if (field === 'wallpaperName' && updatedForms[index].sameWallpaperNameBelow) {
        updatedForms.forEach((form, i) => {
          if (i > index) { // Only apply to items BELOW the current index
            updatedForms[i] = {
              ...updatedForms[i],
              wallpaperName: value
            };
          }
        });
      }
      
      return updatedForms;
    });
  };
  
  const handleCategoryChange = (index: number, categoryType: 'main' | 'brand', categoryName: string) => {
    setWallpaperForms(prevForms => {
      const updatedForms = [...prevForms];
      const form = { ...updatedForms[index] };
      
      const otherTypeCategories = form.selectedCategories.filter(cat => {
        const catObj = categories.find(c => c.categoryName === cat);
        return catObj && catObj.categoryType !== categoryType;
      });
      
      form.selectedCategories = [...otherTypeCategories, categoryName];
      
      if (categoryName === 'Depth Effect') {
        form.depthEffect = true;
      }
      
      if (categoryType === 'main') {
        form.category = categoryName;
      }
      
      if (categoryType === 'brand') {
        setShowBrandOptions(prev => ({...prev, [categoryName]: true}));
        fetchDevices(categoryName);
      }
      
      updatedForms[index] = form;
      
      if (index === 0) {
        updatedForms.forEach((form, i) => {
          if (i !== 0 && form.sameAsCategory) {
            updatedForms[i] = {
              ...updatedForms[i],
              selectedCategories: [...updatedForms[0].selectedCategories],
              category: updatedForms[0].category,
              depthEffect: updatedForms[0].depthEffect
            };
          }
        });
      }
      
      return updatedForms;
    });
  };
  
  const handleDeviceSeriesChange = (index: number, brand: string, deviceSeries: string, checked: boolean) => {
    setWallpaperForms(prevForms => {
      const updatedForms = [...prevForms];
      const form = { ...updatedForms[index] };
      
      if (checked) {
        form.selectedDeviceSeries = [deviceSeries];
        form.series = deviceSeries;
        
        const year = fetchLaunchYear(brand, deviceSeries);
        if (year) {
          form.launchYear = year;
        }
        
        // For Samsung, Apple, OnePlus, and Xiaomi, always auto-set wallpaper name to device series
        if (brand === 'Samsung' || brand === 'Apple' || brand === 'OnePlus' || brand === 'Xiaomi') {
          form.wallpaperName = deviceSeries;
        }
      } else {
        form.selectedDeviceSeries = [];
        form.series = '';
        form.launchYear = '';
      }
      
      updatedForms[index] = form;
      
      if (index === 0) {
        updatedForms.forEach((form, i) => {
          if (i !== 0 && form.sameAsCategory) {
            updatedForms[i] = {
              ...updatedForms[i],
              selectedDeviceSeries: [...updatedForms[0].selectedDeviceSeries],
              series: updatedForms[0].series,
              launchYear: updatedForms[0].launchYear
            };
            
            // For Samsung, Apple, OnePlus, and Xiaomi, also update wallpaper name to series name
            if ((brand === 'Samsung' || brand === 'Apple' || brand === 'OnePlus' || brand === 'Xiaomi') && updatedForms[0].series) {
              updatedForms[i].wallpaperName = updatedForms[0].series;
            }
          }
        });
      }
      
      return updatedForms;
    });
  };
  
  const fetchLaunchYear = (brand: string, deviceSeries: string): string | null => {
    try {
      const currentYear = new Date().getFullYear();
      
      let year = null;
      if (brand === 'Samsung') {
        year = samsungDeviceYearMap[deviceSeries] || currentYear;
      } else if (brand === 'Apple') {
        year = iphoneDeviceYearMap[deviceSeries] || currentYear;
      } else if (brand === 'OnePlus') {
        year = oneplusDeviceYearMap[deviceSeries] || currentYear;
      } else if (brand === 'Xiaomi') {
        year = xiaomiDeviceYearMap[deviceSeries] || currentYear;
      } else {
        year = currentYear;
      }
      
      return year?.toString() || null;
    } catch (error) {
      console.error('Error getting launch year:', error);
      return null;
    }
  };
  
  const handleIosVersionChange = (index: number, iosVersion: string) => {
    setWallpaperForms(prevForms => {
      const updatedForms = [...prevForms];
      updatedForms[index] = {
        ...updatedForms[index],
        selectedIosVersion: iosVersion
      };
      
      if (index === 0) {
        updatedForms.forEach((form, i) => {
          if (i !== 0 && form.sameAsCategory) {
            updatedForms[i] = {
              ...updatedForms[i],
              selectedIosVersion: iosVersion
            };
          }
        });
      }
      
      return updatedForms;
    });
  };
  
  const handleRemoveCategory = (index: number, category: string) => {
    setWallpaperForms(prevForms => {
      const updatedForms = [...prevForms];
      const form = { ...updatedForms[index] };
      
      form.selectedCategories = form.selectedCategories.filter(c => c !== category);
      
      if (category === 'Depth Effect') {
        form.depthEffect = false;
      }
      
      const categoryObj = categories.find(c => c.categoryName === category);
      
      if (categoryObj?.categoryType === 'main') {
        form.category = '';
      } else if (categoryObj?.categoryType === 'brand') {
        setShowBrandOptions(prev => ({...prev, [category]: false}));
        form.selectedDeviceSeries = [];
        form.series = '';
        form.launchYear = '';
        if (category === 'Apple') {
          form.selectedIosVersion = undefined;
        }
      }
      
      updatedForms[index] = form;
      
      if (index === 0) {
        updatedForms.forEach((form, i) => {
          if (i !== 0 && form.sameAsCategory) {
            updatedForms[i] = {
              ...updatedForms[i],
              selectedCategories: [...updatedForms[0].selectedCategories],
              category: updatedForms[0].category,
              selectedDeviceSeries: [...updatedForms[0].selectedDeviceSeries], 
              series: updatedForms[0].series,
              selectedIosVersion: updatedForms[0].selectedIosVersion,
              depthEffect: updatedForms[0].depthEffect,
              launchYear: updatedForms[0].launchYear
            };
          }
        });
      }
      
      return updatedForms;
    });
  };
  
  const fetchDevices = async (brand: string) => {
    try {
      const devicesData = await getDevices(brand);
      
      if (devicesData) {
        if ('devices' in devicesData) {
          setDevices(prev => ({...prev, [brand]: devicesData as Device}));
        } else {
          const formattedDeviceData: Device = {
            devices: Array.isArray(devicesData.devices) ? devicesData.devices : [],
            iosVersions: Array.isArray(devicesData.iosVersions) ? devicesData.iosVersions : []
          };
          setDevices(prev => ({...prev, [brand]: formattedDeviceData}));
        }
      }
    } catch (error) {
      console.error(`Error fetching devices for ${brand}:`, error);
      toast.error(`Failed to load devices for ${brand}`);
    }
  };
  
  const validateForm = (form: WallpaperForm): boolean => {
    if (!form.imageUrl.trim()) {
      toast.error('Image URL is required');
      return false;
    }
    
    if (!form.wallpaperName.trim()) {
      toast.error('Wallpaper name is required');
      return false;
    }
    
    if (form.selectedCategories.length === 0) {
      toast.error('At least one category must be selected');
      return false;
    }
    
    const brandCategories = form.selectedCategories.filter(cat => 
      categories.find(c => c.categoryName === cat && c.categoryType === 'brand')
    );
    
    for (const brand of brandCategories) {
      // Handle Apple validation based on selection type
      if (brand === 'Apple') {
        if (form.appleSelectionType === 'iosVersions') {
          // When iOS versions is selected, validate iOS version
          if (!form.selectedIosVersion && devices[brand]?.iosVersions?.length > 0) {
            toast.error('Please select an iOS version for Apple wallpapers');
            return false;
          }
        } else {
          // When devices is selected (default), validate device series
          if (devices[brand] && form.selectedDeviceSeries.length === 0) {
            toast.error('Please select an iPhone device for Apple wallpapers');
            return false;
          }
        }
      } else {
        // For non-Apple brands, always validate device series
        if (devices[brand] && form.selectedDeviceSeries.length === 0) {
          toast.error(`At least one device series must be selected for ${brand} wallpapers`);
          return false;
        }
      }
    }
    
    return true;
  };
  
  // Process wallpapers in batches to prevent memory issues and improve performance
  const processBatch = async (batch: WallpaperForm[], batchIndex: number, totalBatches: number): Promise<void> => {
    const batchSize = batch.length;
    let batchCompleted = 0;
    
    // Process each wallpaper in the batch
    for (const form of batch) {
      const uniqueId = crypto.randomUUID();
      const createdWallpaperIds: string[] = []; // Track created wallpaper IDs for banner creation
      
      try {
        // Handle main/trending categories
        const mainCategory = form.selectedCategories.find(cat => 
          categories.find(c => c.categoryName === cat && c.categoryType === 'main')
        );
        
        if (mainCategory || form.category) {
          const trendingWallpaperData = {
            wallpaperName: form.wallpaperName,
            imageUrl: form.imageUrl,
            thumbnail: getUrlWithL(form.imageUrl),
            source: form.source,
            exclusive: form.exclusive,
            depthEffect: form.depthEffect,
            category: form.category || mainCategory || '',
            subCategory: form.subCategory || 'None',
            views: 0,
            downloads: 0
          };
          
          await addTrendingWallpaperWithId(uniqueId, trendingWallpaperData);
          createdWallpaperIds.push(uniqueId); // Track the trending wallpaper ID
        }
        
        // Handle brand categories
        const brandCategories = form.selectedCategories.filter(cat => 
          categories.find(c => c.categoryName === cat && c.categoryType === 'brand')
        );
        
        for (const brand of brandCategories) {
          // Handle Apple based on selection type
          if (brand === 'Apple' && form.appleSelectionType === 'iosVersions') {
            // For iOS versions, create a single wallpaper with iOS version info
            const launchYearValue = form.launchYear ? parseInt(form.launchYear, 10) : '';
            
            const brandWallpaperData: any = {
              wallpaperName: form.wallpaperName,
              imageUrl: form.imageUrl,
              thumbnail: getUrlWithL(form.imageUrl),
              series: form.selectedIosVersion || 'iOS Version',
              launchYear: launchYearValue,
              iosVersion: form.selectedIosVersion,
              views: 0,
              downloads: 0
            };
            
            const iosUniqueId = `${uniqueId}-${form.selectedIosVersion}`;
            await addBrandWallpaperWithId(brand, iosUniqueId, brandWallpaperData);
            createdWallpaperIds.push(iosUniqueId); // Track the iOS wallpaper ID
          } else if (devices[brand] && form.selectedDeviceSeries.length > 0) {
            // For device series (Apple with devices selected, or other brands)
            for (const deviceSeries of form.selectedDeviceSeries) {
              const launchYearValue = (brand === 'Samsung' || brand === 'Apple' || brand === 'OnePlus' || brand === 'Xiaomi') && form.launchYear
                ? parseInt(form.launchYear, 10)
                : form.launchYear || '';
              
              const brandWallpaperData: any = {
                wallpaperName: form.wallpaperName,
                imageUrl: form.imageUrl,
                thumbnail: getUrlWithL(form.imageUrl),
                series: deviceSeries,
                launchYear: launchYearValue,
                views: 0,
                downloads: 0
              };
              
              const deviceUniqueId = `${uniqueId}-${deviceSeries}`;
              await addBrandWallpaperWithId(brand, deviceUniqueId, brandWallpaperData);
              createdWallpaperIds.push(deviceUniqueId); // Track the device wallpaper ID
            }
          } else {
            const launchYearValue = (brand === 'Samsung' || brand === 'Apple' || brand === 'OnePlus') && form.launchYear
              ? parseInt(form.launchYear, 10)
              : form.launchYear || '';
              
            const brandWallpaperData = {
              wallpaperName: form.wallpaperName,
              imageUrl: form.imageUrl,
              thumbnail: getUrlWithL(form.imageUrl),
              series: form.series || 'Default Series',
              launchYear: launchYearValue,
              views: 0,
              downloads: 0
            };
            
            const brandUniqueId = `${uniqueId}-${brand}`;
            await addBrandWallpaperWithId(brand, brandUniqueId, brandWallpaperData);
            createdWallpaperIds.push(brandUniqueId); // Track the brand wallpaper ID
          }
        }
        
        // Handle banner creation with custom structure
        if (form.addAsBanner && form.selectedBrandApp && form.subcollectionName && createdWallpaperIds.length > 0) {
          const brandApp = form.selectedBrandApp === 'custom' ? form.customBrandApp : form.selectedBrandApp;

          if (!brandApp || brandApp.trim() === '') {
            toast.error('Please provide a brand app name for banner creation');
            continue;
          }

          const isAppPromo = form.bannerType === 'app_promo';
          const bannerData = {
            bannerName: isAppPromo ? (form.appPromoName || form.wallpaperName) : form.wallpaperName,
            bannerUrl: isAppPromo ? form.appPromoUrl : form.imageUrl,
            bannerType: form.bannerType || 'wallpaper',
          };

          for (const wallpaperId of createdWallpaperIds) {
            await addBannerWithCustomStructure(
              brandApp,
              form.subcollectionName,
              wallpaperId,
              bannerData
            );
          }
        }
        
        batchCompleted++;
        
        // Update progress based on both batch and individual wallpaper progress
        const batchProgress = (batchIndex / totalBatches) * 100;
        const withinBatchProgress = (batchCompleted / batchSize) * (100 / totalBatches);
        const totalProgress = Math.min(99, Math.round(batchProgress + withinBatchProgress));
        setUploadProgress(totalProgress);
        
        // Add a small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error processing wallpaper ${form.wallpaperName}:`, error);
        throw new Error(`Failed to process wallpaper: ${form.wallpaperName}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowProgressOverlay(true);
    setUploadProgress(0);
    
    try {
      // Validate all forms first
      for (const form of wallpaperForms) {
        if (!validateForm(form)) {
          setLoading(false);
          setShowProgressOverlay(false);
          return;
        }
      }
      
      // Check for duplicates — skip duplicates instead of stopping entirely
      const DUPLICATE_CHECK_BATCH_SIZE = 20;
      const formsToProcess: WallpaperForm[] = [];
      let skippedCount = 0;

      for (let i = 0; i < wallpaperForms.length; i += DUPLICATE_CHECK_BATCH_SIZE) {
        const batch = wallpaperForms.slice(i, i + DUPLICATE_CHECK_BATCH_SIZE);
        const duplicateChecks = await Promise.allSettled(
          batch.map(form => checkDuplicateWallpaper(form.imageUrl))
        );
        for (let j = 0; j < duplicateChecks.length; j++) {
          const result = duplicateChecks[j];
          if (result.status === 'fulfilled' && result.value) {
            skippedCount++;
          } else {
            formsToProcess.push(batch[j]);
          }
        }
      }

      if (skippedCount > 0) {
        toast.info(`Skipped ${skippedCount} duplicate(s), uploading ${formsToProcess.length} new wallpaper(s)`);
      }

      if (formsToProcess.length === 0) {
        toast.warning('All wallpapers already exist — nothing to upload');
        setLoading(false);
        setShowProgressOverlay(false);
        return;
      }

      // Process in larger batches for better performance
      const BATCH_SIZE = formsToProcess.length > 80 ? 8 : formsToProcess.length > 30 ? 12 : 20;
      const batches = [];

      for (let i = 0; i < formsToProcess.length; i += BATCH_SIZE) {
        batches.push(formsToProcess.slice(i, i + BATCH_SIZE));
      }

      // Process each batch sequentially
      for (let i = 0; i < batches.length; i++) {
        await processBatch(batches[i], i, batches.length);
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setUploadProgress(100);
      toast.success(`Successfully added ${formsToProcess.length} wallpaper(s) to Firebase!`);
      
      // Clear all form state
      setWallpaperForms([{ ...initialFormState }]);
      setUseSharedCategories(false);
      setShowBrandOptions({});
      
      // Clear S3 uploaded files with a small delay to ensure UI updates
      setTimeout(() => {
        if (clearUploadsFunction) {
          try {
            clearUploadsFunction();
            toast.info('🗂️ S3 upload section cleared - ready for new uploads!');
          } catch (error) {
            console.error('❌ Error clearing S3 uploads:', error);
          }
        }
      }, 500);
      
    } catch (error) {
      console.error('Error in batch upload:', error);
      toast.error(
        error instanceof Error 
          ? `Upload failed: ${error.message}` 
          : 'Failed to add wallpapers. Please try again with fewer images.'
      );
    } finally {
      setLoading(false);
      setShowProgressOverlay(false);
      setUploadProgress(0);
    }
  };
  
  const getSelectedMainCategory = (form: WallpaperForm) => {
    return form.selectedCategories.find(cat =>
      categories.find(c => c.categoryName === cat && c.categoryType === 'main')
    ) || '';
  };

  const getSelectedBrandCategory = (form: WallpaperForm) => {
    return form.selectedCategories.find(cat =>
      categories.find(c => c.categoryName === cat && c.categoryType === 'brand')
    ) || '';
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 mb-10 relative">
      <WallpaperFormHeader 
        onAddSameCategory={handleAddSameCategoryWallpaper}
        onAddDifferentCategory={handleAddDifferentCategoryWallpaper}
        wallpaperCount={wallpaperCount}
        setWallpaperCount={setWallpaperCount}
      />
      
      {/* Thumbnail Loading Progress Summary */}
      {wallpaperForms.length > 10 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Thumbnail Loading Progress
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {thumbnailsLoaded + thumbnailsFailed} / {wallpaperForms.length} processed
                  {thumbnailsFailed > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      ({thumbnailsFailed} failed)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {Math.round((thumbnailsLoaded / wallpaperForms.length) * 100)}%
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                {wallpaperForms.length - (thumbnailsLoaded + thumbnailsFailed)} remaining
              </div>
            </div>
          </div>
          <div className="mt-3 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(thumbnailsLoaded / wallpaperForms.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Render only visible forms to prevent UI blocking */}
      {wallpaperForms.slice(0, visibleForms).map((form, index) => (
        <WallpaperFormItem
          key={index}
          form={form}
          index={index}
          categories={categories}
          devices={devices}
          showRemoveButton={wallpaperForms.length > 1}
          onRemove={() => handleRemoveWallpaperForm(index)}
          onFieldChange={(field, value) => handleChange(index, field, value)}
          onCategoryChange={(categoryType, categoryName) => handleCategoryChange(index, categoryType, categoryName)}
          onRemoveCategory={(category) => handleRemoveCategory(index, category)}
          onAddCategoryClick={() => setCategoryDialogOpen(true)}
          onDeviceSeriesChange={(brand, deviceSeries, checked) => 
            handleDeviceSeriesChange(index, brand, deviceSeries, checked)
          }
          onIosVersionChange={(version) => handleIosVersionChange(index, version)}
          getSelectedMainCategory={() => getSelectedMainCategory(form)}
          getSelectedBrandCategory={() => getSelectedBrandCategory(form)}
          showCategories={true}
          onAddMultipleWallpapers={index === 0 ? handleAddMultipleWallpapers : undefined}
          onClearUploads={index === 0 ? setClearUploadsFunction : undefined}
          onThumbnailLoad={() => setThumbnailsLoaded(prev => prev + 1)}
          onThumbnailError={() => setThumbnailsFailed(prev => prev + 1)}
          selectedCategory={
            getSelectedBrandCategory(form) || getSelectedMainCategory(form) || form.selectedCategories[0] || ''
          }
          selectedSubcategory={
            // For Samsung, Apple, OnePlus, and Xiaomi (brand categories), use the selected device series for S3 path
            (getSelectedBrandCategory(form) === 'Samsung' || getSelectedBrandCategory(form) === 'Apple' || getSelectedBrandCategory(form) === 'OnePlus' || getSelectedBrandCategory(form) === 'Xiaomi') && form.series
              ? form.series
              : form.subCategory
          }
          totalWallpapers={wallpaperForms.length}
        />
      ))}
      
      {/* Progressive loading indicator */}
      {isProgressiveLoading && wallpaperForms.length > visibleForms && (
        <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-200">
          <Loader className="h-6 w-6 animate-spin text-blue-600 mb-2" />
          <p className="text-sm text-blue-700 font-medium">
            Loading forms {visibleForms + 1}-{Math.min(visibleForms + 5, wallpaperForms.length)} of {wallpaperForms.length}...
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Loading progressively to prevent browser freezing
          </p>
        </div>
      )}
      
      {/* Summary for remaining forms */}
      {!isProgressiveLoading && wallpaperForms.length > visibleForms && (
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 font-medium">
            {wallpaperForms.length - visibleForms} more forms loaded in background
          </p>
          <p className="text-xs text-gray-500">
            All forms are ready for submission
          </p>
        </div>
      )}
      
      <SubmitButton loading={loading} />
      
      <CategoryDialog 
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onCategoriesUpdated={() => {
          getCategories().then(categoriesData => {
            setCategories(categoriesData);
          });
        }}
      />
      
      {showProgressOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="text-center space-y-4">
              <Loader className="h-10 w-10 text-primary animate-spin mx-auto" />
              <h3 className="text-xl font-medium">Saving to Firebase</h3>
              <Progress value={uploadProgress} className="h-2 w-full" />
              <p className="text-muted-foreground">{uploadProgress}% Complete</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default AddWallpaperForm;
