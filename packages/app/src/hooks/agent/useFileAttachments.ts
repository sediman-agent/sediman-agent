/**
 * useFileAttachments Hook
 * Manages file attachments for agent input
 */

import { useState, useCallback } from 'react';

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'done' | 'error';
}

export function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Add file attachment
  const addFile = useCallback((file: AttachedFile) => {
    setAttachedFiles(prev => [...prev, file]);
  }, []);

  // Remove file attachment
  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Update file status
  const updateFileStatus = useCallback((id: string, status: AttachedFile['status']) => {
    setAttachedFiles(prev =>
      prev.map(f => f.id === id ? { ...f, status } : f)
    );
  }, []);

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    setAttachedFiles([]);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    // Process dropped files
    files.forEach(file => {
      const newFile: AttachedFile = {
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'done'
      };
      addFile(newFile);
    });
  }, [addFile]);

  // Toggle file upload zone
  const toggleFileUpload = useCallback(() => {
    setShowFileUpload(prev => !prev);
  }, []);

  return {
    attachedFiles,
    showFileUpload,
    isDragOver,
    addFile,
    removeFile,
    updateFileStatus,
    clearAttachments,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    toggleFileUpload,
    setShowFileUpload
  };
}
