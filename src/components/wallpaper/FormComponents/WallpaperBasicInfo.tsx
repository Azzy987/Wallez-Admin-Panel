
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Cloud, CheckCircle, SkipForward, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import BannerAppSelector from '@/components/BannerAppSelector';

// Progressive Image Loading Component to prevent CloudFront rate limiting
interface ProgressiveImageProps {
  src: string;
  alt: string;
  index: number;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ src, alt, index, onLoad, onError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Stagger image loading to prevent CloudFront rate limiting
    // Load in batches of 3 with 800ms delays between batches (more conservative)
    const batchNumber = Math.floor(index / 3);
    const delay = batchNumber * 800; // Increased delay for better CloudFront handling
    
    console.log(`🕐 [PROGRESSIVE] Scheduling image #${index + 1} to load in ${delay}ms (batch ${batchNumber + 1}/3)`);
    
    const timer = setTimeout(() => {
      console.log(`🚀 [PROGRESSIVE] Starting to load image #${index + 1}: ${src}`);
      setShouldLoad(true);
      setCurrentSrc(src);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [src, index]);
  
  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
    console.log(`✅ [PROGRESSIVE] Success for image #${index + 1}: ${currentSrc}`);
    onLoad?.();
  };
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    console.error(`❌ [PROGRESSIVE] Failed for image #${index + 1}:`, {
      src: currentSrc,
      originalSrc: src,
      retryCount,
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight
    });
    
    // Try different URL strategies before giving up
    if (retryCount < 3) {
      const nextRetry = retryCount + 1;
      console.log(`🔄 [PROGRESSIVE] Retry ${nextRetry}/3 for image #${index + 1}`);
      
      let nextSrc = src;
      if (nextRetry === 1 && src.includes('d1wqpnbk3wcub7.cloudfront.net')) {
        // First retry: try thumbnail size
        nextSrc = src.replace('d1wqpnbk3wcub7.cloudfront.net/', 'd1wqpnbk3wcub7.cloudfront.net/fit-in/200x200/');
        console.log(`📸 [PROGRESSIVE] Retry ${nextRetry} - trying thumbnail: ${nextSrc}`);
      } else if (nextRetry === 2) {
        // Second retry: add cache busting
        nextSrc = src + (src.includes('?') ? '&' : '?') + `cb=${Date.now()}`;
        console.log(`🔄 [PROGRESSIVE] Retry ${nextRetry} - cache busting: ${nextSrc}`);
      } else if (nextRetry === 3) {
        // Third retry: try direct S3
        nextSrc = src.replace('https://d1wqpnbk3wcub7.cloudfront.net/', 'https://wallpaperassets.s3.us-east-1.amazonaws.com/');
        console.log(`🏪 [PROGRESSIVE] Retry ${nextRetry} - direct S3: ${nextSrc}`);
      }
      
      setTimeout(() => {
        setRetryCount(nextRetry);
        setCurrentSrc(nextSrc);
        setError(null);
      }, 1000 * nextRetry); // Exponential backoff
      
      return;
    }
    
    // All retries failed
    setIsLoading(false);
    setError(`Failed after ${retryCount + 1} attempts`);
    console.error(`🚨 [PROGRESSIVE] All retries failed for image #${index + 1}`);
    onError?.(e);
  };
  
  if (!shouldLoad) {
    const batchNumber = Math.floor(index / 3) + 1;
    const delay = Math.floor(index / 3) * 800;
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
        <div className="text-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 mx-auto mb-1" />
          <div className="text-xs text-gray-600 font-medium">#{index + 1}</div>
          <div className="text-xs text-gray-500">Batch {batchNumber}</div>
          <div className="text-xs text-gray-400">{delay}ms</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 border border-red-200">
        <div className="text-center p-2">
          <X className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <div className="text-xs text-red-700 font-medium">#{index + 1}</div>
          <div className="text-xs text-red-600">Failed</div>
          <div className="text-xs text-red-500 mt-1">{error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 z-10">
          <div className="text-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-blue-700 font-medium">#{index + 1}</div>
            <div className="text-xs text-blue-600">
              {retryCount === 0 ? 'Loading' : `Retry ${retryCount}/3`}
            </div>
          </div>
        </div>
      )}
      <img 
        src={currentSrc}
        alt={alt}
        className="object-cover w-full h-full"
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </>
  );
};

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'skipped';
  error?: string;
}

interface WallpaperBasicInfoProps {
  index: number;
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
  sameAsCategory?: boolean;
  sameSource?: boolean;
  sameWallpaperName?: boolean;
  sameWallpaperNameBelow?: boolean;
  sameLaunchYear?: boolean;
  depthEffect?: boolean;
  launchYear?: string;
  showLaunchYear?: boolean;
  totalWallpapers?: number;
  onChange: (field: string, value: any) => void;
  onAddMultipleWallpapers?: (urls: string[]) => void;
  onClearUploads?: (clearFn: () => void) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
  onThumbnailLoad?: () => void;
  onThumbnailError?: () => void;
}

const WallpaperBasicInfo: React.FC<WallpaperBasicInfoProps> = ({
  index,
  imageUrl,
  wallpaperName,
  source,
  exclusive,
  addAsBanner,
  bannerApps,
  selectedBrandApp,
  customBrandApp,
  subcollectionName,
  bannerType = 'wallpaper',
  appPromoName = '',
  appPromoUrl = '',
  sameAsCategory = false,
  sameSource = false,
  sameWallpaperName = false,
  sameWallpaperNameBelow = false,
  sameLaunchYear = false,
  depthEffect = false,
  launchYear = '',
  showLaunchYear = false,
  totalWallpapers = 1,
  onChange,
  onAddMultipleWallpapers,
  onClearUploads,
  selectedCategory,
  selectedSubcategory,
  onThumbnailLoad,
  onThumbnailError
}) => {
  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [completedUploads, setCompletedUploads] = useState(0);

  // AI generation state
  const [generatingAiName, setGeneratingAiName] = useState(false);

  // Simple clear function - will be called directly by parent
  const clearUploads = React.useCallback(() => {
    setFiles([]);
    setUploadProgress([]);
    setCompletedUploads(0);
    setUploading(false);
  }, []);

  // Expose clear function to parent via callback ref pattern
  React.useEffect(() => {
    if (onClearUploads && index === 0) {
      // Only for the first wallpaper (where S3 upload happens)
      onClearUploads(clearUploads);
    }
  }, [onClearUploads, clearUploads, index]);



  // Helper functions

  // Image name generation from filename pattern matching (runs locally, no server needed)
  const generateAiName = () => {
    if (!imageUrl) {
      toast.error('Please provide an image URL first');
      return;
    }

    setGeneratingAiName(true);
    try {
      const suggestedName = extractWallpaperName(imageUrl);
      onChange('wallpaperName', suggestedName);
      toast.success(`Generated: "${suggestedName}"`, { duration: 4000 });
    } catch (error) {
      console.error('Name generation error:', error);
      toast.error('Could not generate name');
    } finally {
      setGeneratingAiName(false);
    }
  };

  
  // Enhanced intelligent name extraction for device wallpapers
  const extractWallpaperName = (input: string): string => {
    console.log('🔍 Extracting name from:', input);
    
    // Extract filename from URL if it's a full URL
    let filename = input;
    if (input.includes('http')) {
      const urlParts = input.split('/');
      filename = urlParts[urlParts.length - 1];
      console.log('📁 Extracted filename from URL:', filename);
    }
    
    // Remove file extension
    let name = filename.replace(/\.[^/.]+$/, '');
    console.log('📝 After removing extension:', name);
    
    // Device model patterns for intelligent extraction
    const devicePatterns = {
      samsung: [
        // Galaxy S series patterns
        /samsung[_\s-]*galaxy[_\s-]*s(\d+)(?:[_\s-]*ultra|[_\s-]*plus|[_\s-]*fe)?/gi,
        // Galaxy Note series
        /samsung[_\s-]*galaxy[_\s-]*note[_\s-]*(\d+)(?:[_\s-]*ultra)?/gi,
        // Galaxy A series patterns
        /samsung[_\s-]*galaxy[_\s-]*a(\d+)(?:[_\s-]*5g|[_\s-]*4g|[_\s-]*lte)?/gi,
        // Galaxy Z series patterns
        /samsung[_\s-]*galaxy[_\s-]*z[_\s-]*(fold|flip)[_\s-]*(\d+)?/gi,
        // Galaxy M series
        /samsung[_\s-]*galaxy[_\s-]*m(\d+)/gi,
        // Galaxy F series
        /samsung[_\s-]*galaxy[_\s-]*f(\d+)/gi,
        // General Galaxy pattern
        /samsung[_\s-]*galaxy[_\s-]*([a-z]\d+)/gi,
        // Just Samsung with model
        /samsung[_\s-]*([a-z]\d+)/gi
      ],
      apple: [
        // iPhone patterns
        /iphone[_\s-]*(\d+)(?:[_\s-]*pro|[_\s-]*max|[_\s-]*mini|[_\s-]*plus)?/gi,
        // iPad patterns
        /ipad(?:[_\s-]*pro|[_\s-]*air|[_\s-]*mini)?/gi
      ],
      google: [
        // Pixel patterns
        /(?:google[_\s-]*)?pixel[_\s-]*(\d+)(?:[_\s-]*pro|[_\s-]*xl|[_\s-]*a)?/gi
      ]
    };
    
    // Try to extract device name using patterns
    let extractedDeviceName = '';
    
    // Check Samsung patterns
    for (const pattern of devicePatterns.samsung) {
      const match = name.match(pattern);
      if (match) {
        let deviceName = match[0];
        // Clean up the matched device name
        deviceName = deviceName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Handle specific Samsung model formatting
        if (deviceName.toLowerCase().includes('galaxy s')) {
          deviceName = deviceName.replace(/galaxy\s*s(\d+)/gi, 'Galaxy S$1');
        } else if (deviceName.toLowerCase().includes('galaxy a')) {
          deviceName = deviceName.replace(/galaxy\s*a(\d+)/gi, 'Galaxy A$1');
        } else if (deviceName.toLowerCase().includes('galaxy z')) {
          deviceName = deviceName.replace(/galaxy\s*z\s*(fold|flip)\s*(\d+)?/gi, 'Galaxy Z $1$2');
        } else if (deviceName.toLowerCase().includes('galaxy note')) {
          deviceName = deviceName.replace(/galaxy\s*note\s*(\d+)/gi, 'Galaxy Note $1');
        }
        
        // Ensure Samsung prefix
        if (!deviceName.toLowerCase().startsWith('samsung')) {
          deviceName = 'Samsung ' + deviceName;
        }
        
        extractedDeviceName = deviceName;
        break;
      }
    }
    
    // Check Apple patterns if no Samsung match
    if (!extractedDeviceName) {
      for (const pattern of devicePatterns.apple) {
        const match = name.match(pattern);
        if (match) {
          let deviceName = match[0];
          deviceName = deviceName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Format iPhone names
          if (deviceName.toLowerCase().includes('iphone')) {
            deviceName = deviceName.replace(/iphone\s*(\d+)/gi, 'iPhone $1');
            deviceName = deviceName.replace(/\s*pro\s*/gi, ' Pro');
            deviceName = deviceName.replace(/\s*max\s*/gi, ' Max');
            deviceName = deviceName.replace(/\s*mini\s*/gi, ' Mini');
            deviceName = deviceName.replace(/\s*plus\s*/gi, ' Plus');
          }
          
          extractedDeviceName = deviceName;
          break;
        }
      }
    }
    
    // Check Google patterns if no previous match
    if (!extractedDeviceName) {
      for (const pattern of devicePatterns.google) {
        const match = name.match(pattern);
        if (match) {
          let deviceName = match[0];
          deviceName = deviceName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Format Pixel names
          deviceName = deviceName.replace(/(?:google\s*)?pixel\s*(\d+)/gi, 'Google Pixel $1');
          deviceName = deviceName.replace(/\s*pro\s*/gi, ' Pro');
          deviceName = deviceName.replace(/\s*xl\s*/gi, ' XL');
          deviceName = deviceName.replace(/\s*a\s*/gi, ' a');
          
          extractedDeviceName = deviceName;
          break;
        }
      }
    }
    
    // If device pattern found, use it
    if (extractedDeviceName) {
      // Clean up and format properly
      extractedDeviceName = extractedDeviceName.replace(/\s+/g, ' ').trim();
      
      // Proper title case
      extractedDeviceName = extractedDeviceName.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      
      console.log('🎯 Device pattern matched:', extractedDeviceName);
      return extractedDeviceName;
    }
    
    // Fallback to original logic if no device pattern matches
    // Remove resolution patterns (e.g., 4k, 2160x3840, 1080p, etc.)
    name = name.replace(/\d{3,4}x\d{3,4}/g, ''); // Remove dimensions like 2160x3840
    name = name.replace(/[_-]?\d{1,4}[kK]/g, ''); // Remove 4k, 1080p, etc.
    name = name.replace(/[_-]?\d{1,4}[pP]/g, ''); // Remove 1080p, 720p, etc.
    
    // Remove technical specifications
    name = name.replace(/[_-]?(5g|4g|lte|wifi|cellular)/gi, '');
    
    // Remove version numbers and source identifiers
    name = name.replace(/[_-]?\d{6,}$/g, ''); // Remove long numbers like 140741
    name = name.replace(/[_-]?\d{1,2}$/g, ''); // Remove short numbers like -4, -12
    name = name.replace(/[_-]?(ytechb|techb|source|src|orig|original)/gi, ''); // Remove source identifiers
    
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
      const fallback = filename.replace(/\.[^/.]+$/, '');
      console.log('⚠️ Using fallback name:', fallback);
      return fallback;
    }
    
    const finalName = name.trim();
    console.log('🎯 Final extracted name:', finalName);
    return finalName;
  };

  const getUploadDirectory = () => {
    if (!selectedCategory) {
      return 'wallpapers';
    }
    
    // Helper function to convert series name to S3-safe path
    const formatSeriesPath = (seriesName: string): string => {
      return seriesName.toLowerCase()
        .replace(/[&]/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    };
    
    // Map category names to S3 paths (using actual category names from the form)
    const categoryPaths: { [key: string]: string } = {
      // Main categories
      '4K & Ultra HD': 'wallpapers/4k-ultra-hd',
      'Amoled & Dark': 'wallpapers/amoled-dark',
      'Depth Effect': 'wallpapers/depth-effect',
      'Fandoms': selectedSubcategory ? `wallpapers/fandoms/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/fandoms',
      'Minimal & Aesthetic': selectedSubcategory ? `wallpapers/minimal-aesthetic/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/minimal-aesthetic',
      'Nature & Landscapes': selectedSubcategory ? `wallpapers/nature-landscapes/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/nature-landscapes',
      
      // Brand categories (these come from the form)
      // For Samsung, always include the series subdirectory when selectedSubcategory is available
      'Samsung': selectedSubcategory ? `wallpapers/samsung/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/samsung',
      'Apple': selectedSubcategory ? `wallpapers/apple/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/apple',
      'OnePlus': selectedSubcategory ? `wallpapers/oneplus/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/oneplus',
      'Xiaomi': selectedSubcategory ? `wallpapers/xiaomi/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/xiaomi',
      'Google': selectedSubcategory ? `wallpapers/google/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/google',
      
      // Fallback for any other category names
      '4K Ultra HD': 'wallpapers/4k-ultra-hd',
      'Amoled Dark': 'wallpapers/amoled-dark',
      'Minimal Aesthetic': selectedSubcategory ? `wallpapers/minimal-aesthetic/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/minimal-aesthetic',
      'Nature Landscapes': selectedSubcategory ? `wallpapers/nature-landscapes/${formatSeriesPath(selectedSubcategory)}` : 'wallpapers/nature-landscapes'
    };
    
    // Add comprehensive debug logging
    console.log('=== UPLOAD DIRECTORY DEBUG ===');
    console.log('selectedCategory:', selectedCategory);
    console.log('selectedSubcategory:', selectedSubcategory);
    console.log('categoryPaths keys:', Object.keys(categoryPaths));
    console.log('Exact match for selectedCategory:', categoryPaths[selectedCategory]);
    
    const result = categoryPaths[selectedCategory] || 'wallpapers';
    console.log('Final generated S3 path:', result);
    console.log('=== END UPLOAD DIRECTORY DEBUG ===');
    
    return result;
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setUploadProgress(uploadProgress.filter((_, i) => i !== index));
  };

  // Function to generate a simple hash for file content
  const generateFileHash = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const hash = Array.from(new Uint8Array(arrayBuffer))
          .slice(0, 1000) // Only check first 1000 bytes for performance
          .reduce((acc, byte) => acc + byte, 0)
          .toString(16);
        resolve(hash);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Function to check if a file exists in S3 by trying to access it
  const checkFileExistsInS3 = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log('Error checking file existence:', error);
      return false;
    }
  };

  const uploadSingleFile = async (file: File, index: number): Promise<string | null> => {
    // Check if we have the required category info
    if (!selectedCategory) {
      const error = 'No category selected. Please select a category in the form below first.';
      console.error(error);
      toast.error(error);
      throw new Error(error);
    }
    
    // Check if this file has already been uploaded in this session (by name)
    const alreadyUploadedByName = uploadProgress.some(progress => 
      progress.fileName === file.name && progress.status === 'completed'
    );
    
    if (alreadyUploadedByName) {
      console.log(`🔄 File ${file.name} already uploaded in this session (by name), skipping`);
      toast.info(`🔄 File "${file.name}" already uploaded in this session`);
      return null;
    }
    
    // Check if a file with similar content has been uploaded (by checking first few bytes)
    const fileHash = await generateFileHash(file);
    const similarContentUploaded = uploadProgress.some(progress => 
      progress.status === 'completed' && progress.fileName.includes(file.name.split('.')[0])
    );
    
    if (similarContentUploaded) {
      console.log(`🔄 File with similar content already uploaded, checking if it's a duplicate...`);
      toast.warning(`⚠️ File "${file.name}" might be a duplicate. Checking...`);
    }
    
    const dir = getUploadDirectory();
    
    try {
      // Update progress to show starting
      setUploadProgress(prev => {
        const newProgress = [...prev];
        newProgress[index] = {
          fileName: file.name,
          progress: 0,
          status: 'uploading'
        };
        return newProgress;
      });

      // 1) Get a presigned URL
      const apiRes = await fetch('/api/s3-presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dir,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }),
      });

      if (!apiRes.ok) {
        const errData = await apiRes.json().catch(() => ({}));
        const msg = errData.error || `HTTP ${apiRes.status}`;
        toast.error(`Upload failed: ${msg}`);
        throw new Error(`s3-presign-upload failed: ${msg}`);
      }

      const response = await apiRes.json() as { uploadUrl?: string; publicUrl: string; thumbnailTemplate: string; fileExists?: boolean; message?: string };

      if (response.fileExists === true) {
        
        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[index] = {
            fileName: file.name,
            progress: 100,
            status: 'skipped'
          };
          return newProgress;
        });
        setCompletedUploads(prev => prev + 1);
        toast.info(`Skipped "${file.name}" — already exists`);
        
        return response.publicUrl; // Return existing URL
      }
      
      console.log(`🆕 File ${file.name} does not exist, proceeding with upload`);
      
      const { uploadUrl } = response;

      // 2) Upload to S3 with progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(prev => {
              const newProgress = [...prev];
              newProgress[index] = {
                fileName: file.name,
                progress,
                status: 'uploading'
              };
              return newProgress;
            });
          }
        });

        xhr.addEventListener('load', () => {
          console.log(`📡 XHR Load Event - Status: ${xhr.status}, File: ${file.name}`);
          console.log('XHR Response Headers:', xhr.getAllResponseHeaders());
          
          if (xhr.status === 200) {
            setUploadProgress(prev => {
              const newProgress = [...prev];
              newProgress[index] = {
                fileName: file.name,
                progress: 100,
                status: 'completed'
              };
              return newProgress;
            });
            setCompletedUploads(prev => prev + 1);
            
            console.log(`✅ S3 Upload SUCCESS for ${file.name}`);
            console.log(`✅ Public URL generated: ${response.publicUrl}`);
            
            // Test URL accessibility immediately after upload
            setTimeout(async () => {
              try {
                const testResponse = await fetch(response.publicUrl, { method: 'HEAD' });
                console.log(`🔍 Post-upload URL test for ${file.name}:`, {
                  status: testResponse.status,
                  ok: testResponse.ok,
                  url: response.publicUrl
                });
                if (!testResponse.ok) {
                  console.error(`❌ URL not accessible after upload: ${response.publicUrl}`);
                }
              } catch (err) {
                console.error(`❌ Post-upload URL test failed for ${file.name}:`, err);
              }
            }, 2000); // Wait 2 seconds for S3/CloudFront propagation
            
            resolve(response.publicUrl);
          } else {
            console.error(`❌ S3 Upload FAILED for ${file.name}:`, {
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText
            });
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

    } catch (e: any) {
      console.error('Full upload error:', e);
      console.error('Error details:', {
        name: e.name,
        message: e.message,
        stack: e.stack,
        response: e.response,
        data: e.data
      });
      
      setUploadProgress(prev => {
        const newProgress = [...prev];
        newProgress[index] = {
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: e.message || 'Unknown error occurred'
        };
        return newProgress;
      });
      throw e;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return toast.error('Please select at least one file');
    
    setUploading(true);
    setUploadProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    })));
    setCompletedUploads(0);

    try {
      // Ultra-aggressive batch sizing for large uploads to prevent freezing
      const BATCH_SIZE = files.length > 100 ? 1 : files.length > 80 ? 2 : files.length > 50 ? 3 : files.length > 30 ? 4 : 8;
      const batches = [];
      
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        batches.push(files.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`🚀 Starting S3 upload of ${files.length} files in ${batches.length} batches (max ${BATCH_SIZE} files per batch)`);
      
      const uploadedUrls: string[] = [];
      
      // Process each batch sequentially, files within batch concurrently
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} files`);
        
        // Process files in current batch concurrently
        const batchPromises = batch.map(async (file, indexInBatch) => {
          const globalIndex = batchIndex * BATCH_SIZE + indexInBatch;
          
          try {
            const url = await uploadSingleFile(file, globalIndex);
            if (url) {
              setCompletedUploads(prev => prev + 1);
              return url;
            }
            return null;
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            setCompletedUploads(prev => prev + 1); // Count as completed even if failed
            return null;
          }
        });
        
        // Wait for current batch to complete and collect results
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Add successful uploads to the array
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            uploadedUrls.push(result.value);
          }
        });
        
        // Progressive delays based on upload size to prevent server overload
        if (batchIndex < batches.length - 1) {
          const delay = files.length > 100 ? 1200 : files.length > 80 ? 900 : files.length > 50 ? 600 : files.length > 30 ? 400 : 300;
          console.log(`⏳ Waiting ${delay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Report results
      const failedUploads = files.length - uploadedUrls.length;
      
      if (uploadedUrls.length > 0 && onAddMultipleWallpapers) {
        onAddMultipleWallpapers(uploadedUrls);
        if (failedUploads > 0) {
          toast.success(`✅ ${uploadedUrls.length} of ${files.length} images uploaded successfully! ${failedUploads} failed.`);
        } else {
          toast.success(`✅ All ${uploadedUrls.length} images uploaded successfully! Wallpaper forms created.`);
        }
      } else if (uploadedUrls.length > 0 && !imageUrl) {
        // Fallback: auto-fill the first image URL if callback not available
        onChange('imageUrl', uploadedUrls[0]);
        toast.success(`✅ ${uploadedUrls.length} images uploaded! First URL auto-filled.`);
      } else if (uploadedUrls.length > 0) {
        toast.success(`✅ ${uploadedUrls.length} images uploaded successfully!`);
      } else {
        toast.error('No images were uploaded successfully. Please check the errors above.');
      }
      
      // Clear files after successful upload
      setFiles([]);
      setUploadProgress([]);
      setCompletedUploads(0);
      
    } catch (e: any) {
      console.error('Upload error:', e);
      console.error('Full error object:', e);
      
      // Show more detailed error message
      let errorMessage = 'Upload process failed';
      if (e.message) {
        errorMessage = e.message;
      } else if (e.error) {
        errorMessage = e.error;
      } else if (e.data?.error) {
        errorMessage = e.data.error;
      }
      
      // Check if it's a duplicate file error
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.warning(`⚠️ ${errorMessage}`);
      } else {
        toast.error(`❌ ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadProgress([]);
    setCompletedUploads(0);
    setUploading(false);
  };

  const overallProgress = files.length > 0 ? Math.round((completedUploads / files.length) * 100) : 0;
  
  const canUpload = files.length > 0 && !uploading;
  

  return (
    <div className="space-y-6">
      {/* S3 Upload Section - Only show for first wallpaper */}
      {index === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">Upload to S3</h3>
        </div>
        
        {/* Category Info Display */}
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-md">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">S3 Path:</span> {getUploadDirectory()}
            {selectedCategory && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">
                ({selectedCategory}{selectedSubcategory ? ` / ${selectedSubcategory}` : ''})
              </span>
            )}
          </div>
          {!selectedCategory && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Select a category below to change the upload path
            </div>
          )}
        </div>
        
        {/* Drag & Drop File Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Images</Label>
          <DragDropZone
            onFilesSelected={(newFiles) => {
              const uniqueFiles = newFiles.filter((newFile) =>
                !files.some(existingFile =>
                  existingFile.name === newFile.name && existingFile.size === newFile.size
                )
              );
              if (uniqueFiles.length < newFiles.length) {
                toast.warning(`${newFiles.length - uniqueFiles.length} duplicate(s) removed`);
              }
              if (uniqueFiles.length > 0) {
                setFiles(prev => [...prev, ...uniqueFiles]);
                setUploadProgress([]);
                setCompletedUploads(0);
              }
            }}
            accept="image/*"
            multiple={true}
            maxFiles={100}
            maxSizeBytes={15 * 1024 * 1024}
            disabled={uploading}
            className="min-h-[120px] sm:min-h-[180px]"
          />
          
          {/* Additional File Controls */}
          {files.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ready to upload: {files.length} file{files.length > 1 ? 's' : ''}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiles([])}
                disabled={uploading}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          )}
          
          {/* Upload Button */}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload to S3 ({files.length} file{files.length !== 1 ? 's' : ''})
              </>
            )}
          </Button>
          
          
          {/* Progress Display */}
          {uploadProgress.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadProgress.map((progress, progressIndex) => (
                  <div key={progressIndex} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1 pr-2">{progress.fileName}</span>
                      <div className="flex items-center gap-1">
                        {progress.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-600" />}
                        {progress.status === 'skipped' && <SkipForward className="h-3 w-3 text-blue-600" />}
                        {progress.status === 'error' && <X className="h-3 w-3 text-red-600" />}
                        <span className="text-xs">
                          {progress.status === 'completed' ? '100%' : 
                           progress.status === 'skipped' ? 'Exists' :
                           progress.status === 'error' ? 'Failed' : `${progress.progress}%`}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={progress.progress} 
                      className={`w-full h-1 ${
                        progress.status === 'completed' ? 'bg-green-100' :
                        progress.status === 'skipped' ? 'bg-blue-100' :
                        progress.status === 'error' ? 'bg-red-100' : ''
                      }`}
                    />
                    {progress.error && (
                      <p className="text-xs text-red-600">{progress.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Help Text */}
        <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
          Select images → Upload to S3 → Fill category &amp; details → Submit
        </div>
      </div>
      )}
      
      {/* Message for additional wallpapers */}
      {index > 0 && (
        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-md border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="font-medium">Using same category as Wallpaper 1</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This wallpaper will use the same category and subcategory settings as the first wallpaper.
          </p>
        </div>
      )}
      
      {/* Form Fields */}
      <div className="flex flex-col sm:flex-row gap-4">
        {imageUrl && (
          <div className="relative w-full sm:w-32 h-48 sm:h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
            <ProgressiveImage 
              src={imageUrl} 
              alt={wallpaperName || "Wallpaper preview"}
              index={index}
              onLoad={() => {
                console.log(`✅ Image loaded successfully (#${index + 1}):`, imageUrl);
                onThumbnailLoad?.();
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const currentSrc = target.src;
                console.error(`❌ CloudFront rate limit hit for image #${index + 1}:`, currentSrc);
                
                // Enhanced fallback strategy for CloudFront rate limiting
                if (imageUrl.includes('d1wqpnbk3wcub7.cloudfront.net')) {
                  console.log(`🔄 Attempting CloudFront fallbacks for image #${index + 1}`);
                  
                  // Strategy 1: Try thumbnail URL (smaller processing load)
                  if (!currentSrc.includes('/fit-in/')) {
                    const thumbnailUrl = imageUrl.replace(
                      'd1wqpnbk3wcub7.cloudfront.net/',
                      'd1wqpnbk3wcub7.cloudfront.net/fit-in/150x150/'
                    );
                    console.log(`📸 Fallback 1 - Small thumbnail (#${index + 1}):`, thumbnailUrl);
                    target.src = thumbnailUrl;
                    return;
                  }
                  
                  // Strategy 2: Try original size without processing
                  if (!currentSrc.includes('?bypass=true')) {
                    const bypassUrl = imageUrl + '?bypass=true&t=' + Date.now();
                    console.log(`🔄 Fallback 2 - Bypass processing (#${index + 1}):`, bypassUrl);
                    target.src = bypassUrl;
                    return;
                  }
                  
                  // Strategy 3: Wait and retry with exponential backoff
                  const retryDelay = Math.min(1000 * Math.pow(2, index % 4), 8000); // Max 8 seconds
                  console.log(`⏳ Fallback 3 - Retry in ${retryDelay}ms (#${index + 1})`);
                  setTimeout(() => {
                    target.src = imageUrl + '?retry=' + Date.now();
                  }, retryDelay);
                  return;
                }
                
                // If all CloudFront strategies fail, show rate limit error
                target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'flex flex-col items-center justify-center w-full h-full bg-yellow-50 text-yellow-700 text-xs p-2 border border-yellow-200 rounded';
                errorDiv.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-1">
                    <path d="m21 16-4-4-4 4"/>
                    <path d="m21 12-4-4-4 4"/>
                    <path d="M3 12h18"/>
                  </svg>
                  <span class="text-center font-semibold">Rate Limited</span>
                  <span class="text-xs mt-1 opacity-70 text-center">CloudFront processing overloaded. Try refreshing in a few minutes.</span>
                `;
                target.parentElement?.appendChild(errorDiv);
                
                console.error(`🚨 CloudFront rate limit confirmed for image #${index + 1}:`, imageUrl);
                toast.error(`⚠️ Image #${index + 1} rate limited - will retry automatically`, { duration: 2000 });
                onThumbnailError?.();
              }}
            />
            
            {/* Open image in new tab */}
            <button
              type="button"
              className="absolute bottom-1 right-1 h-6 w-6 bg-black/40 hover:bg-black/60 rounded text-white text-xs flex items-center justify-center"
              onClick={() => window.open(imageUrl, '_blank')}
              title="Open image"
            >
              ↗
            </button>
          </div>
        )}
        <div className="flex-1 space-y-4">
          <div>
            <Label htmlFor={`imageUrl-${index}`}>Image URL</Label>
            <Input
              id={`imageUrl-${index}`}
              value={imageUrl}
              onChange={(e) => {
                const newUrl = e.target.value;
                onChange('imageUrl', newUrl);
                
                // Auto-extract wallpaper name from URL if it's a valid image URL
                if (newUrl && newUrl.includes('http') && newUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
                  const extractedName = extractWallpaperName(newUrl);
                  console.log(`🔗 Auto-extracting name from URL: "${extractedName}"`);
                  
                  // Always update wallpaper name when URL changes (for immediate feedback)
                  onChange('wallpaperName', extractedName);
                  toast.info(`📝 Auto-filled wallpaper name: "${extractedName}"`);
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor={`wallpaperName-${index}`}>Wallpaper Name</Label>
              <div className="flex space-x-2">
            <Input
              id={`wallpaperName-${index}`}
              value={wallpaperName}
              onChange={(e) => onChange('wallpaperName', e.target.value)}
              placeholder="iPhone 14 Pro"
                  className="mt-1 flex-1"
                />
                {imageUrl && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const extractedName = extractWallpaperName(imageUrl);
                        onChange('wallpaperName', extractedName);
                        toast.info(`📝 Extracted name: "${extractedName}"`);
                      }}
                      className="mt-1 text-xs"
                      title="Extract name from image URL"
                    >
                      📝 Extract
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAiName}
                      disabled={generatingAiName}
                      className="mt-1 text-xs bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 text-purple-700"
                      title="Generate name using AI analysis"
                    >
                      {generatingAiName ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          AI
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
              
              {/* Same wallpaper name checkbox - only show for Samsung category and first wallpaper */}
              {index === 0 && selectedCategory === 'Samsung' && selectedSubcategory && (
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id={`sameWallpaperName-${index}`}
                    checked={sameAsCategory}
                    onCheckedChange={(checked) => {
                      onChange('sameAsCategory', checked === true);
                      if (checked && selectedSubcategory) {
                        // Set wallpaper name to selected series name
                        onChange('wallpaperName', selectedSubcategory);
                        toast.info(`📝 Wallpaper name set to: "${selectedSubcategory}"`);
                      }
                    }}
                  />
                  <Label htmlFor={`sameWallpaperName-${index}`} className="text-sm text-gray-600">
                    Use series name as wallpaper name ({selectedSubcategory})
                  </Label>
                </div>
              )}
              
              {/* Same wallpaper name checkbox - only show for first wallpaper */}
              {index === 0 && (
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id={`sameWallpaperNameAll-${index}`}
                    checked={sameWallpaperName}
                    onCheckedChange={(checked) => {
                      onChange('sameWallpaperName', checked === true);
                      if (checked) {
                        toast.info('📝 All wallpapers will use the same wallpaper name');
                      }
                    }}
                  />
                  <Label htmlFor={`sameWallpaperNameAll-${index}`} className="text-sm text-gray-600">
                    Same wallpaper name in all wallpapers
                  </Label>
                </div>
              )}

              {/* Same wallpaper name for below items checkbox - show for all except last wallpaper */}
              {index < totalWallpapers - 1 && (
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id={`sameWallpaperNameBelow-${index}`}
                    checked={sameWallpaperNameBelow}
                    onCheckedChange={(checked) => {
                      onChange('sameWallpaperNameBelow', checked === true);
                      if (checked) {
                        toast.info(`📝 Wallpapers ${index + 2} to ${totalWallpapers} will use the same wallpaper name as this one`);
                      }
                    }}
                  />
                  <Label htmlFor={`sameWallpaperNameBelow-${index}`} className="text-sm text-gray-600">
                    Same wallpaper name for below items
                  </Label>
                </div>
              )}
          </div>
        </div>
      </div>
      
      {/* Only show these fields if sameAsCategory is false */}
      {!sameAsCategory && (
        <>
          <div>
            <Label htmlFor={`source-${index}`}>Source</Label>
            <Input
              id={`source-${index}`}
              value={source}
              onChange={(e) => onChange('source', e.target.value)}
              placeholder="Official"
              className="mt-1"
            />
            
            {/* Popular Source Chips */}
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">Popular sources:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '4K Wallpapers', icon: '🔥' },
                  { name: 'hdqwalls', icon: '🎨' },
                  { name: 'Unsplash', icon: '📷' },
                  { name: 'Pexels', icon: '🖼️' },
                  { name: 'Pixabay', icon: '🌟' }
                ].map((sourceItem) => (
                  <button
                    key={sourceItem.name}
                    type="button"
                    onClick={() => {
                      onChange('source', sourceItem.name);
                      toast.success(`📝 Source set to: ${sourceItem.name}`);
                    }}
                    className={`
                      inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                      transition-all duration-200 border
                      ${source === sourceItem.name 
                        ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm' 
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }
                    `}
                    title={`Set source to ${sourceItem.name}`}
                  >
                    <span>{sourceItem.icon}</span>
                    <span>{sourceItem.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Only show "Same source in all wallpapers" checkbox for the first wallpaper */}
            {index === 0 && (
              <div className="flex items-center space-x-2 mt-3">
                <Checkbox
                  id={`sameSource-${index}`}
                  checked={sameSource}
                  onCheckedChange={(checked) => {
                    onChange('sameSource', checked === true);
                  }}
                />
                <Label htmlFor={`sameSource-${index}`} className="text-sm text-gray-600">
                  Same source in all wallpapers
                </Label>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`exclusive-${index}`}
                checked={exclusive}
                onCheckedChange={(checked) => 
                  onChange('exclusive', checked === true)
                }
              />
              <Label htmlFor={`exclusive-${index}`}>Exclusive</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`addAsBanner-${index}`}
                checked={addAsBanner}
                onCheckedChange={(checked) => 
                  onChange('addAsBanner', checked === true)
                }
              />
              <Label htmlFor={`addAsBanner-${index}`}>Add as Banner</Label>
            </div>
            
            {/* Banner App Configuration - only show when addAsBanner is true */}
            {addAsBanner && (
              <div className="w-full mt-2">
                <BannerAppSelector
                  selectedBrandApp={selectedBrandApp}
                  customBrandApp={customBrandApp}
                  subcollectionName={subcollectionName}
                  bannerType={bannerType}
                  appPromoName={appPromoName}
                  appPromoUrl={appPromoUrl}
                  onBrandAppChange={(brandApp) => onChange('selectedBrandApp', brandApp)}
                  onCustomBrandAppChange={(customApp) => onChange('customBrandApp', customApp)}
                  onSubcollectionNameChange={(name) => onChange('subcollectionName', name)}
                  onBannerTypeChange={(type) => onChange('bannerType', type)}
                  onAppPromoNameChange={(name) => onChange('appPromoName', name)}
                  onAppPromoUrlChange={(url) => onChange('appPromoUrl', url)}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`depthEffect-${index}`}
                checked={depthEffect}
                onCheckedChange={(checked) => 
                  onChange('depthEffect', checked === true)
                }
              />
              <Label htmlFor={`depthEffect-${index}`}>Depth Effect</Label>
            </div>
          </div>
        </>
      )}
      
      {/* Show launch year field if it's needed */}
      {showLaunchYear && (
        <div>
          <Label htmlFor={`launchYear-${index}`}>Launch Year</Label>
          <Input
            id={`launchYear-${index}`}
            value={launchYear}
            onChange={(e) => onChange('launchYear', e.target.value)}
            placeholder="2025"
            className="mt-1"
          />
          
          {/* Same launch year checkbox - only show for first wallpaper */}
          {index === 0 && (
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id={`sameLaunchYearAll-${index}`}
                checked={sameLaunchYear}
                onCheckedChange={(checked) => {
                  onChange('sameLaunchYear', checked === true);
                  if (checked) {
                    toast.info('📅 All wallpapers will use the same launch year');
                  }
                }}
              />
              <Label htmlFor={`sameLaunchYearAll-${index}`} className="text-sm text-gray-600">
                Same launch year in all wallpapers
              </Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WallpaperBasicInfo;
