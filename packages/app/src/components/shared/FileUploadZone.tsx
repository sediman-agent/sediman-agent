import { useCallback, useState } from 'react';
import { Upload, FileText, FileImage, File, X, Check, AlertCircle, FileType, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
  preview?: string;
  error?: string;
}

interface FileUploadZoneProps {
  onFilesUploaded?: (files: UploadedFile[]) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
}

export function FileUploadZone({
  onFilesUploaded,
  acceptedTypes = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'],
  maxSize = 100,
  disabled = false,
  className
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const apiBaseUrl = 'http://localhost:3001';

  const processFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);

    // Upload each file
    for (const fileData of newFiles) {
      try {
        const fileIndex = Array.from(files).findIndex(f => f.name === fileData.name);
        if (fileIndex === -1) continue;

        const file = files[fileIndex];

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiBaseUrl}/api/files/upload`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileData.id
                ? { ...f, status: 'done' as const }
                : f
            )
          );
        } else {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileData.id
                ? { ...f, status: 'error' as const, error: 'Upload failed' }
                : f
            )
          );
        }
      } catch (error) {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileData.id
              ? { ...f, status: 'error' as const, error: 'Network error' }
              : f
          )
        );
      }
    }

    setIsUploading(false);

    // Notify parent with completed files
    const completedFiles = (currentFiles: UploadedFile[]) => {
      return [...currentFiles, ...newFiles].map((f) => {
        const updated = newFiles.find(nf => nf.id === f.id);
        return updated || f;
      });
    };

    onFilesUploaded?.(completedFiles(uploadedFiles));
  }, [disabled, uploadedFiles, onFilesUploaded, apiBaseUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string, className = '') => {
    if (type.includes('pdf')) return <FileText className={className} />;
    if (type.includes('powerpoint') || type.includes('presentation') || type.includes('ppt')) {
      return <FileType className={className} />;
    }
    if (type.includes('word') || type.includes('document') || type.includes('wordprocessingml')) {
      return <File className={className} />;
    }
    if (type.includes('image')) return <FileImage className={className} />;
    if (type.includes('zip') || type.includes('rar') || type.includes('archive') || type.includes('compressed')) {
      return <Archive className={className} />;
    }
    return <File className={className} />;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all duration-200',
          'min-h-[120px] flex flex-col items-center justify-center p-6',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          disabled={disabled}
          className={cn(
            'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        />

        <div className="flex flex-col items-center text-center space-y-3 pointer-events-none">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
            isDragging ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Drop files here' : 'Drag & drop files'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Accepted:</span>
            <span className="font-medium">{acceptedTypes.join(', ')}</span>
            <span>•</span>
            <span>Max {maxSize}MB</span>
          </div>
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Uploaded Files</span>
            <span className="text-muted-foreground">{uploadedFiles.length} file(s)</span>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                  file.status === 'done' && 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20',
                  file.status === 'error' && 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20',
                  file.status === 'uploading' && 'border-border bg-muted/50'
                )}
              >
                {/* File Icon */}
                <div className="text-foreground/70">
                  {getFileIcon(file.type, 'w-5 h-5')}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-1 text-primary">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Uploading...</span>
                    </div>
                  )}

                  {file.status === 'done' && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Check className="w-4 h-4" />
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading' || isUploading}
                    className={cn(
                      'p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors',
                      (file.status === 'uploading' || isUploading) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {uploadedFiles.some(f => f.status === 'error') && (
            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Some files failed to upload. Please try again.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
