import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Upload, Loader2, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadProps {
  conversationId: string;
  onFilesSelected: (files: AttachmentData[]) => void;
  onClear?: () => void; // Callback to notify parent when files are cleared
}

export interface AttachmentData {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url: string;
  thumbnail_url?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/quicktime"
];

export function FileUpload({ conversationId, onFilesSelected, onClear }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<AttachmentData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: File type not allowed`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File too large (max 10MB)`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(validateFile);
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<AttachmentData[]> => {
    setUploading(true);
    const uploadedFiles: AttachmentData[] = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${conversationId}/${crypto.randomUUID()}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('message-attachments')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(data.path);

        const attachmentData: AttachmentData = {
          id: crypto.randomUUID(),
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: data.path,
          url: publicUrl,
        };

        // Generate thumbnail for images
        if (file.type.startsWith('image/')) {
          attachmentData.thumbnail_url = publicUrl;
        }

        uploadedFiles.push(attachmentData);
      }

      setUploadedAttachments(uploadedFiles);
      onFilesSelected(uploadedFiles);
      setSelectedFiles([]);
      toast.success(`${uploadedFiles.length} file(s) uploaded and ready to send`);
      return uploadedFiles;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      return [];
    } finally {
      setUploading(false);
    }
  };

  // Reset uploaded attachments when new conversation is selected
  useEffect(() => {
    setUploadedAttachments([]);
    setSelectedFiles([]);
  }, [conversationId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Uploaded Files Ready to Send */}
      {uploadedAttachments.length > 0 && (
        <div className="border border-primary/20 bg-primary/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-primary">
                {uploadedAttachments.length} file(s) ready to send
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setUploadedAttachments([]);
                onFilesSelected([]);
                onClear?.();
              }}
            >
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadedAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group border border-border rounded p-2 flex items-center gap-2 bg-background"
              >
                {attachment.file_type.startsWith('image/') ? (
                  <img
                    src={attachment.url}
                    alt={attachment.file_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <File className="w-12 h-12 text-muted-foreground p-2" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Files Preview (before upload) */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="relative flex items-center gap-2 bg-muted px-3 py-2 rounded-sm border border-border"
            >
              {file.type.startsWith('image/') && (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded-sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-sm p-4 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || selectedFiles.length >= MAX_FILES}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Attach Files
          </Button>

          {selectedFiles.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={uploadFiles}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} file(s)
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Drop files or click to browse • Max {MAX_FILES} files, 10MB each
          </p>
        </div>
      </div>
    </div>
  );
}
