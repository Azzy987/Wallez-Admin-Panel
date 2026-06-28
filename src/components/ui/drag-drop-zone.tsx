import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Image, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatUploadSize } from '@/lib/imageMetadata';

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  /** When provided, the parent owns the file list (preview stays in sync after upload/clear). */
  selectedFiles?: File[];
  onClearSelection?: () => void;
  onRemoveFile?: (index: number) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  className?: string;
  disabled?: boolean;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onFilesSelected,
  selectedFiles: controlledFiles,
  onClearSelection,
  onRemoveFile,
  accept = 'image/*',
  multiple = true,
  maxFiles = 100, // Increased limit for batch uploads
  maxSizeBytes = 15 * 1024 * 1024, // 15MB default
  className = '',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<File[]>([]);
  const isControlled = controlledFiles !== undefined;
  const displayFiles = isControlled ? controlledFiles : internalSelectedFiles;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set()); // Track object URLs for cleanup

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeBytes) {
      toast.error(`File "${file.name}" is too large. Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB`);
      return false;
    }

    // Check file type
    if (accept && accept !== '*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type === 'image/*') return file.type.startsWith('image/');
        if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
        return file.type === type;
      });

      if (!isAccepted) {
        toast.error(`File "${file.name}" is not an accepted file type`);
        return false;
      }
    }

    return true;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check file count
    if (!multiple && fileArray.length > 1) {
      toast.error('Only one file can be selected');
      return;
    }

    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Show processing indicator for large batches
    const isLargeBatch = fileArray.length > 20;
    if (isLargeBatch) {
      toast.loading(`Processing ${fileArray.length} files...`, { id: 'file-processing' });
    }

    try {
      // Process files in chunks to prevent UI blocking
      const CHUNK_SIZE = 10;
      const validFiles: File[] = [];
      
      for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
        const chunk = fileArray.slice(i, i + CHUNK_SIZE);
        
        // Process chunk synchronously
        const validChunk = chunk.filter(validateFile);
        validFiles.push(...validChunk);
        
        // Yield control back to browser between chunks to prevent freezing
        if (i + CHUNK_SIZE < fileArray.length) {
          await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
        }
      }
      
      if (validFiles.length === 0) {
        if (isLargeBatch) {
          toast.dismiss('file-processing');
          toast.error('No valid files found');
        }
        return;
      }

      // Remove duplicates asynchronously
      const uniqueFiles: File[] = [];
      const seenFiles = new Set<string>();
      
      for (const file of validFiles) {
        const fileKey = `${file.name}-${file.size}`;
        if (!seenFiles.has(fileKey)) {
          seenFiles.add(fileKey);
          uniqueFiles.push(file);
        }
      }

      const duplicateCount = validFiles.length - uniqueFiles.length;
      if (duplicateCount > 0) {
        toast.warning(`Removed ${duplicateCount} duplicate files`);
      }

      // Update state (skip internal list when parent controls selection)
      if (!isControlled) {
        setInternalSelectedFiles(prev => [...prev, ...uniqueFiles]);
      }
      onFilesSelected(uniqueFiles);

      // Dismiss processing indicator
      if (isLargeBatch) {
        toast.dismiss('file-processing');
      }

      // Show completion message
      if (uniqueFiles.length > 0) {
        const totalFiles = displayFiles.length + uniqueFiles.length;
        if (totalFiles > 80) {
          toast.warning(`⚠️ ${totalFiles} files selected! Large uploads may take longer and use more memory.`);
        } else if (totalFiles > 50) {
          toast.info(`📊 ${totalFiles} files selected. Using optimized display for better performance.`);
        } else {
          toast.success(`Added ${uniqueFiles.length} file${uniqueFiles.length > 1 ? 's' : ''} for upload`);
        }
      }
    } catch (error) {
      console.error('Error processing files:', error);
      if (isLargeBatch) {
        toast.dismiss('file-processing');
      }
      toast.error('Error processing files. Please try again.');
    }
  }, [multiple, maxFiles, validateFile, onFilesSelected, displayFiles.length, isControlled]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
    // Reset input value to allow selecting same file again
    e.target.value = '';
  }, [processFiles]);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = useCallback((index: number) => {
    if (isControlled) {
      onRemoveFile?.(index);
      return;
    }

    setInternalSelectedFiles(prev => {
      const fileToRemove = prev[index];
      if (fileToRemove) {
        // Clean up object URL for removed file
        const objectUrl = Array.from(objectUrlsRef.current).find(url => 
          url.includes(fileToRemove.name.split('.')[0])
        );
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
            objectUrlsRef.current.delete(objectUrl);
          } catch (error) {
            console.warn('Failed to revoke object URL for removed file:', error);
          }
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [isControlled, onRemoveFile]);

  const clearAll = useCallback(() => {
    objectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('Failed to revoke object URL:', error);
      }
    });
    objectUrlsRef.current.clear();

    if (isControlled) {
      onClearSelection?.();
      return;
    }

    setInternalSelectedFiles([]);
  }, [isControlled, onClearSelection]);
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.warn('Failed to revoke object URL on unmount:', error);
        }
      });
      objectUrlsRef.current.clear();
    };
  }, []);

  const formatFileSize = (bytes: number): string => formatUploadSize(bytes);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            {isDragOver ? (
              <Upload className="w-full h-full animate-bounce" />
            ) : (
              <FileImage className="w-full h-full" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to browse files
            </p>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>Accepted: {accept === 'image/*' ? 'Images (JPG, PNG, WebP, etc.)' : accept}</p>
            <p>Max size: {Math.round(maxSizeBytes / 1024 / 1024)}MB per file</p>
            {multiple && <p>Max files: {maxFiles}</p>}
          </div>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg border-2 border-blue-500 flex items-center justify-center">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">
              Drop to add files
            </div>
          </div>
        )}
      </div>

      {/* Selected Files Preview */}
      {displayFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Selected Files ({displayFiles.length})
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          {/* For large file counts, use virtual rendering and eliminate thumbnails to prevent memory issues */}
          {displayFiles.length > 20 ? (
            <div className="space-y-2">
              {/* Enhanced list view for large batches - show thumbnails for first 20 */}
              <div className="border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="p-3 text-sm text-gray-600 dark:text-gray-400 border-b">
                  📊 Large batch mode: {displayFiles.length} files (thumbnails for first 20)
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {displayFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {file.type.startsWith('image/') && index < 20 ? (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                              <img
                                src={(() => {
                                  try {
                                    const objectUrl = URL.createObjectURL(file);
                                    objectUrlsRef.current.add(objectUrl);
                                    return objectUrl;
                                  } catch (error) {
                                    console.error('Failed to create object URL:', error);
                                    return '';
                                  }
                                })()}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                              <FileImage className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            #{index + 1} {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(file.size)}
                            {index >= 20 && <span className="ml-2 text-blue-600">📊 No thumbnail</span>}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1 h-auto ml-2 flex-shrink-0"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="flex-shrink-0">
                      {file.type.startsWith('image/') && index < 20 ? (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          <img
                            src={(() => {
                              try {
                                const objectUrl = URL.createObjectURL(file);
                                objectUrlsRef.current.add(objectUrl);
                                return objectUrl;
                              } catch (error) {
                                console.error('Failed to create object URL:', error);
                                return '';
                              }
                            })()}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken images
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <FileImage className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                      {index >= 20 && (
                        <p className="text-xs text-blue-600">
                          📊 Thumbnail disabled (#{index + 1})
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DragDropZone;