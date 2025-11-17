import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  listingId?: string;
}

export function ImageSearchDialog({
  open,
  onOpenChange,
  imageUrl,
  listingId,
}: ImageSearchDialogProps) {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-search", {
        body: {
          imageUrl,
          listingId,
          limit: 12,
        },
      });

      if (error) throw error;

      setResults(data.results || []);
      setAnalysis(data.analysis || null);

      if (data.results?.length === 0) {
        toast.info("No similar items found");
      }
    } catch (error) {
      console.error("Image search error:", error);
      toast.error("Failed to search for similar items");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Find Similar Items
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Image */}
          <div className="flex gap-4">
            <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img src={imageUrl} alt="Search" className="w-full h-full object-cover" width="400" height="400" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <p className="text-sm text-muted-foreground">
                Search for visually similar fashion items using AI
              </p>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Similar Items
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Analysis */}
          {analysis && (
            <div className="p-4 bg-accent/10 rounded-lg space-y-2">
              <h3 className="font-medium text-sm">AI Analysis</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.category && (
                  <Badge variant="secondary">Category: {analysis.category}</Badge>
                )}
                {analysis.color && <Badge variant="secondary">Color: {analysis.color}</Badge>}
                {analysis.style && <Badge variant="secondary">Style: {analysis.style}</Badge>}
                {analysis.pattern && <Badge variant="secondary">Pattern: {analysis.pattern}</Badge>}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Similar Items ({results.length})</h3>
              <div className="grid grid-cols-3 gap-4">
                {results.map((listing) => (
                  <Card
                    key={listing.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/listing/${listing.id}`);
                    }}
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {listing.listing_images?.[0] ? (
                        <img
                          src={listing.listing_images[0].image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          width="200"
                          height="200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-1">
                      <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                      {listing.brand && (
                        <p className="text-xs text-muted-foreground">{listing.brand}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          £{Number(listing.seller_price).toFixed(2)}
                        </span>
                        {listing.similarityScore > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round((listing.similarityScore / 30) * 100)}% match
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
