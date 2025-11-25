import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, Upload, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ListingSummary } from "@/types/listings";
import { logger } from "@/lib/logger";

interface VibeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResults: (results: ListingSummary[], description: string) => void;
}

export const VibeSearchDialog = ({ open, onOpenChange, onResults }: VibeSearchDialogProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

    interface VibeSearchResponse {
      success: boolean;
      results: ListingSummary[];
      styleDescription: string;
    }

    const handleVibeSearch = async () => {
    if (!image) return;

    setIsSearching(true);

    try {
        const { data, error } = await supabase.functions.invoke<VibeSearchResponse>('vibe-search', {
        body: { image, limit: 40 }
      });

      if (error) throw error;
      
        if (data.success) {
          onResults(data.results || [], data.styleDescription);
        
        toast({
          title: "Vibe Search Complete!",
          description: `Found ${data.results?.length || 0} items matching your aesthetic`,
        });
        
        onOpenChange(false);
        setImage(null);
      }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Please try again";
      if (import.meta.env.DEV) {
        logger.error("Vibe search error:", error);
      }
      toast({
        title: "Search Failed",
          description: message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vibe Search
          </DialogTitle>
          <DialogDescription>
            Upload an image and AI will find items with similar style, aesthetic, and vibe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vibe-image">Upload Inspiration Image</Label>
            <Label
              htmlFor="vibe-image"
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors min-h-[200px]"
            >
              {image ? (
                <img src={image} alt="Vibe inspiration" className="max-h-48 object-contain rounded-lg" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                  <span className="text-sm text-muted-foreground">Click to upload</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Pokémon card photo or aesthetic inspiration
                  </span>
                </>
              )}
            </Label>
            <Input
              id="vibe-image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {image && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                🎨 AI will analyze the style, colors, and aesthetic to find matching items
              </p>
              <Button 
                onClick={handleVibeSearch} 
                disabled={isSearching}
                className="w-full gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing vibe...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Find Similar Items
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
