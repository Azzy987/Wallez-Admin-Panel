import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ImagePlus, Upload, Check, X, FolderOpen, Trash2, CheckCircle, SkipForward } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'skipped';
  error?: string;
}

const UploadWallpaper: React.FC = () => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<File[]>([]);

  const [customFolder, setCustomFolder] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [completedUploads, setCompletedUploads] = useState(0);

  // Main categories and subcategories
  const categories = {
    '4k-ultra-hd': {
      label: '🔥 4K & Ultra HD',
      path: 'wallpapers/4k-ultra-hd',
      subcategories: []
    },
    'amoled-dark': {
      label: '🖤 Amoled & Dark',
      path: 'wallpapers/amoled-dark',
      subcategories: []
    },
    'depth-effect': {
      label: '🌊 Depth Effect',
      path: 'wallpapers/depth-effect',
      subcategories: []
    },
    'fandoms': {
      label: '🎭 Fandoms',
      path: 'wallpapers/fandoms',
      subcategories: [
        { value: 'anime', label: '🎌 Anime' },
        { value: 'gaming', label: '🎮 Gaming' },
        { value: 'movies-tv-shows', label: '🎬 Movies & TV Shows' },
        { value: 'superheroes', label: '🦸 Superheroes' },
        { value: 'sci-fi-fantasy', label: '🚀 Sci-Fi & Fantasy' }
      ]
    },
    'minimal-aesthetic': {
      label: '⚪ Minimal & Aesthetic',
      path: 'wallpapers/minimal-aesthetic',
      subcategories: [
        { value: 'abstract', label: '🎨 Abstract' },
        { value: 'gradient', label: '🌈 Gradient' },
        { value: 'typography', label: '📝 Typography' }
      ]
    },
    'nature-landscapes': {
      label: '🌿 Nature & Landscapes',
      path: 'wallpapers/nature-landscapes',
      subcategories: [
        { value: 'mountains', label: '🏔️ Mountains' },
        { value: 'beaches', label: '🏖️ Beaches' },
        { value: 'forests', label: '🌲 Forests' },
        { value: 'sky-clouds', label: '☁️ Sky & Clouds' },
        { value: 'flowers', label: '🌸 Flowers' },
        { value: 'space-cosmos', label: '🌌 Space & Cosmos' }
      ]
    },
    'samsung': {
      label: '📱 Samsung',
      path: 'wallpapers/samsung',
      subcategories: [
        // S Series
        { value: 'galaxy-s25-series', label: 'Galaxy S25 series' },
        { value: 'galaxy-s24-series', label: 'Galaxy S24 series' },
        { value: 'galaxy-s23-series', label: 'Galaxy S23 series' },
        { value: 'galaxy-s22-series', label: 'Galaxy S22 series' },
        { value: 'galaxy-s21-series', label: 'Galaxy S21 series' },
        { value: 'galaxy-s20-series', label: 'Galaxy S20 series' },
        { value: 'galaxy-s10-series', label: 'Galaxy S10 series' },
        
        // Note Series
        { value: 'galaxy-note-20-series', label: 'Galaxy Note 20 series' },
        { value: 'galaxy-note-10-series', label: 'Galaxy Note 10 series' },
        
        // Z Fold Series
        { value: 'galaxy-z-fold-7', label: 'Galaxy Z Fold 7' },
        { value: 'galaxy-z-fold-6', label: 'Galaxy Z Fold 6' },
        { value: 'galaxy-z-fold-5', label: 'Galaxy Z Fold 5' },
        { value: 'galaxy-z-fold-4', label: 'Galaxy Z Fold 4' },
        { value: 'galaxy-z-fold-3', label: 'Galaxy Z Fold 3' },
        { value: 'galaxy-z-fold-2', label: 'Galaxy Z Fold 2' },
        { value: 'galaxy-fold', label: 'Galaxy Fold' },
        
        // Z Flip Series
        { value: 'galaxy-z-flip-7', label: 'Galaxy Z Flip 7' },
        { value: 'galaxy-z-flip-6', label: 'Galaxy Z Flip 6' },
        { value: 'galaxy-z-flip-5', label: 'Galaxy Z Flip 5' },
        { value: 'galaxy-z-flip-4', label: 'Galaxy Z Flip 4' },
        { value: 'galaxy-z-flip-3', label: 'Galaxy Z Flip 3' },
        { value: 'galaxy-z-flip', label: 'Galaxy Z Flip' },
        
        // A Series
        { value: 'galaxy-a56', label: 'Galaxy A56' },
        { value: 'galaxy-a55', label: 'Galaxy A55' },
        { value: 'galaxy-a54', label: 'Galaxy A54' },
        { value: 'galaxy-a53', label: 'Galaxy A53' },
        { value: 'galaxy-a52', label: 'Galaxy A52' },
        { value: 'galaxy-a51', label: 'Galaxy A51' },
        { value: 'galaxy-a50', label: 'Galaxy A50' },
        { value: 'galaxy-a36', label: 'Galaxy A36' },
        { value: 'galaxy-a35', label: 'Galaxy A35' },
        { value: 'galaxy-a34', label: 'Galaxy A34' },
        { value: 'galaxy-a33', label: 'Galaxy A33' },
        { value: 'galaxy-a32', label: 'Galaxy A32' },
        { value: 'galaxy-a31', label: 'Galaxy A31' },
        { value: 'galaxy-a30', label: 'Galaxy A30' },
        { value: 'galaxy-a25', label: 'Galaxy A25' },
        { value: 'galaxy-a24', label: 'Galaxy A24' },
        { value: 'galaxy-a23', label: 'Galaxy A23' },
        { value: 'galaxy-a22', label: 'Galaxy A22' },
        { value: 'galaxy-a21', label: 'Galaxy A21' },
        { value: 'galaxy-a20', label: 'Galaxy A20' },
        { value: 'galaxy-a16', label: 'Galaxy A16' },
        { value: 'galaxy-a15', label: 'Galaxy A15' },
        { value: 'galaxy-a14', label: 'Galaxy A14' },
        { value: 'galaxy-a13', label: 'Galaxy A13' },
        { value: 'galaxy-a12', label: 'Galaxy A12' },
        { value: 'galaxy-a11', label: 'Galaxy A11' },
        { value: 'galaxy-a10', label: 'Galaxy A10' },
        { value: 'galaxy-a05', label: 'Galaxy A05' },
        { value: 'galaxy-a04', label: 'Galaxy A04' },
        { value: 'galaxy-a03', label: 'Galaxy A03' },
        { value: 'galaxy-a02', label: 'Galaxy A02' },
        { value: 'galaxy-a01', label: 'Galaxy A01' },
        { value: 'galaxy-a90', label: 'Galaxy A90' },
        { value: 'galaxy-a80', label: 'Galaxy A80' },
        { value: 'galaxy-a73', label: 'Galaxy A73' },
        { value: 'galaxy-a72', label: 'Galaxy A72' },
        { value: 'galaxy-a71', label: 'Galaxy A71' },
        { value: 'galaxy-a70', label: 'Galaxy A70' },
        
        // M Series
        { value: 'galaxy-m62', label: 'Galaxy M62' },
        { value: 'galaxy-m55', label: 'Galaxy M55' },
        { value: 'galaxy-m54', label: 'Galaxy M54' },
        { value: 'galaxy-m53', label: 'Galaxy M53' },
        { value: 'galaxy-m52', label: 'Galaxy M52' },
        { value: 'galaxy-m51', label: 'Galaxy M51' },
        { value: 'galaxy-m42', label: 'Galaxy M42' },
        { value: 'galaxy-m40', label: 'Galaxy M40' },
        { value: 'galaxy-m35', label: 'Galaxy M35' },
        { value: 'galaxy-m34', label: 'Galaxy M34' },
        { value: 'galaxy-m33', label: 'Galaxy M33' },
        { value: 'galaxy-m32', label: 'Galaxy M32' },
        { value: 'galaxy-m31', label: 'Galaxy M31' },
        { value: 'galaxy-m30', label: 'Galaxy M30' },
        { value: 'galaxy-m23', label: 'Galaxy M23' },
        { value: 'galaxy-m21', label: 'Galaxy M21' },
        { value: 'galaxy-m20', label: 'Galaxy M20' },
        { value: 'galaxy-m15', label: 'Galaxy M15' },
        { value: 'galaxy-m14', label: 'Galaxy M14' },
        { value: 'galaxy-m13', label: 'Galaxy M13' },
        { value: 'galaxy-m12', label: 'Galaxy M12' },
        { value: 'galaxy-m11', label: 'Galaxy M11' },
        { value: 'galaxy-m10', label: 'Galaxy M10' },
        
        // F Series
        { value: 'galaxy-f55', label: 'Galaxy F55' },
        { value: 'galaxy-f35', label: 'Galaxy F35' },
        { value: 'galaxy-f15', label: 'Galaxy F15' }
      ]
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  useEffect(() => {
    document.title = 'Upload Wallpapers | Admin';
    const meta = document.querySelector('meta[name="description"]');
    const content = 'Upload multiple wallpapers to organized S3 folders with real-time progress tracking.';
    if (meta) meta.setAttribute('content', content);
    else {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      m.setAttribute('content', content);
      document.head.appendChild(m);
    }
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', window.location.origin + '/upload-wallpaper');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setUploadProgress([]);
    setCompletedUploads(0);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setUploadProgress(uploadProgress.filter((_, i) => i !== index));
  };

  const getUploadDirectory = () => {
    if (selectedCategory === 'custom') {
      return customFolder || 'wallpapers';
    }
    
    if (selectedCategory && categories[selectedCategory as keyof typeof categories]) {
      const category = categories[selectedCategory as keyof typeof categories];
      if (selectedSubcategory && category.subcategories.length > 0) {
        return `${category.path}/${selectedSubcategory}`;
      }
      return category.path;
    }
    
    return 'wallpapers';
  };

  const uploadSingleFile = async (file: File, index: number): Promise<void> => {
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
        throw new Error(errData.error || `HTTP ${apiRes.status}`);
      }
      const response = await apiRes.json() as { uploadUrl?: string; publicUrl: string; thumbnailTemplate: string; fileExists?: boolean; message?: string };
      
      // Check if file already exists
      if (response.fileExists) {
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
        console.log(`File ${file.name} already exists, skipping upload`);
        return;
      }
      
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
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
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
      setUploadProgress(prev => {
        const newProgress = [...prev];
        newProgress[index] = {
          fileName: file.name,
          progress: 0,
          status: 'error',
          error: e.message
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
      // Upload files in parallel with a limit of 3 concurrent uploads
      const maxConcurrent = 3;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        const batchPromises = batch.map((file, batchIndex) => 
          uploadSingleFile(file, i + batchIndex)
        );
        
        // Wait for this batch to complete before starting the next
        const results = await Promise.allSettled(batchPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
          }
        });
      }

      const skippedCount = uploadProgress.filter(p => p.status === 'skipped').length;
      
      if (errorCount === 0 && skippedCount === 0) {
        toast.success(`🎉 All ${files.length} wallpapers uploaded successfully!`);
      } else if (errorCount === 0) {
        toast.success(`✅ ${successCount} uploaded, 🔄 ${skippedCount} already existed (total: ${files.length})`);
      } else {
        toast.warning(`✅ ${successCount} uploaded, 🔄 ${skippedCount} skipped, ❌ ${errorCount} failed`);
      }
      
    } catch (e: any) {
      console.error('Upload error:', e);
      toast.error('Upload process failed');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadProgress([]);
    setCompletedUploads(0);
    setUploading(false);
    setSelectedCategory('');
    setSelectedSubcategory('');
    setCustomFolder('');
  };

  const overallProgress = files.length > 0 ? Math.round((completedUploads / files.length) * 100) : 0;
  const canUpload = useMemo(() => {
    if (files.length === 0) return false;
    if (selectedCategory === 'custom') return customFolder.trim() !== '';
    return selectedCategory !== '';
  }, [files.length, selectedCategory, customFolder]);

  return (
    <Layout>
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold flex items-center gap-2`}>
          <ImagePlus className="h-8 w-8 text-primary" />
          Upload Wallpapers
        </h1>
        <p className="text-muted-foreground">Upload multiple wallpapers to organized S3 folders with real-time progress tracking.</p>
      </div>

      {/* File Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" /> 
            Select Files & Destination
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="files" className="text-sm font-medium">Select Images</Label>
            <Input 
              id="files" 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-muted-foreground">Select multiple images (JPEG, PNG, WebP)</p>
          </div>

          {/* Category Selection */}
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-sm font-medium">Main Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedSubcategory('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categories).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        {category.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Custom Folder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && selectedCategory !== 'custom' && categories[selectedCategory as keyof typeof categories]?.subcategories.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subcategory</Label>
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subcategory" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories[selectedCategory as keyof typeof categories].subcategories.map((sub) => (
                        <SelectItem key={sub.value} value={sub.value}>
                          {sub.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {selectedCategory === 'custom' && (
            <div className="space-y-2">
                <Label htmlFor="custom-folder" className="text-sm font-medium">Custom Folder Path</Label>
                <Input
                  id="custom-folder"
                  value={customFolder}
                  onChange={(e) => setCustomFolder(e.target.value)}
                  placeholder="e.g. wallpapers/custom/2025"
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* Preview Path */}
            {selectedCategory && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs font-medium text-blue-800">Upload Path:</Label>
                <code className="block text-sm text-blue-900 mt-1 font-mono">
                  wallpaperassets/{getUploadDirectory()}
                </code>
            </div>
            )}
          </div>

          {/* Selected Files Preview */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Selected Files ({files.length})</Label>
                <Button variant="outline" size="sm" onClick={resetUpload} disabled={uploading}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500 mx-2">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                    {!uploading && (
                      <Button variant="ghost" size="sm" onClick={() => removeFile(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-3 justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={!canUpload || uploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading... ({completedUploads}/{files.length})
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length > 0 ? `${files.length} files` : 'to S3'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {uploading && uploadProgress.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="animate-pulse">📤</div>
              Upload Progress
            </CardTitle>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{completedUploads}/{files.length} files completed</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {uploadProgress.map((progress, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 pr-2">{progress.fileName}</span>
                <div className="flex items-center gap-2">
                      {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {progress.status === 'skipped' && <SkipForward className="h-4 w-4 text-blue-600" />}
                      {progress.status === 'error' && <X className="h-4 w-4 text-red-600" />}
                      <span className="text-xs">
                        {progress.status === 'completed' ? '100%' : 
                         progress.status === 'skipped' ? 'Already exists' :
                         progress.status === 'error' ? 'Failed' : `${progress.progress}%`}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={progress.progress} 
                    className={`w-full h-2 ${
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
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {completedUploads > 0 && !uploading && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Upload Complete!</h3>
                <p className="text-green-700">
                  {completedUploads} wallpaper{completedUploads > 1 ? 's' : ''} uploaded successfully to <code className="bg-green-100 px-1 rounded">{getUploadDirectory()}</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default UploadWallpaper;