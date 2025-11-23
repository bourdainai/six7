import { useState } from "react";
import { Download, FileText, PlayCircle, ZoomIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AttachmentData } from "./FileUpload";

interface MessageAttachmentsProps {
  attachments: AttachmentData[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter(a => a.file_type.startsWith('image/'));
  const pdfs = attachments.filter(a => a.file_type === 'application/pdf');
  const videos = attachments.filter(a => a.file_type.startsWith('video/'));

  return (
    <div className="space-y-2 mt-2">
      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group cursor-pointer rounded-sm overflow-hidden border border-border"
              onClick={() => setLightboxImage(image.url)}
            >
              <img
                src={image.thumbnail_url || image.url}
                alt={image.file_name}
                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/60 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Attachments */}
      {pdfs.length > 0 && (
        <div className="space-y-2">
          {pdfs.map((pdf) => (
            <a
              key={pdf.id}
              href={pdf.url}
              download={pdf.file_name}
              className="flex items-center gap-3 p-3 border border-border rounded-sm hover:bg-muted/50 transition-colors group"
            >
              <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pdf.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(pdf.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </a>
          ))}
        </div>
      )}

      {/* Video Attachments */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative rounded-sm overflow-hidden border border-border"
            >
              <video
                src={video.url}
                controls
                className="w-full max-h-64 bg-background"
              >
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2">
                <p className="text-xs text-foreground truncate">{video.file_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox for images */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Full size"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
