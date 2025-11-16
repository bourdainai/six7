import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OutfitBuilderProps {
  listingId: string;
  listingTitle: string;
}

interface OutfitItem {
  id: string;
  title: string;
  price: number;
  image?: string;
  category?: string;
  brand?: string;
  color?: string;
}

interface Outfit {
  base_item: OutfitItem;
  recommended_items: OutfitItem[];
  outfit_name: string;
  description: string;
  style_reasoning: string;
  total_price: number;
  fit_score: number;
}

export const OutfitBuilder = ({ listingId, listingTitle }: OutfitBuilderProps) => {
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const buildOutfit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('outfit-builder', {
        body: {
          baseItemId: listingId,
        },
      });

      if (error) throw error;

      if (data.success && data.outfit) {
        setOutfit(data.outfit);
        toast({
          title: "Outfit Created!",
          description: `Built a complete look around ${listingTitle}`,
        });
      }
    } catch (error: any) {
      console.error('Outfit builder error:', error);
      toast({
        title: "Failed to Build Outfit",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Complete the Look
        </CardTitle>
        <CardDescription>
          Let AI build a complete outfit around this item
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!outfit ? (
          <Button
            onClick={buildOutfit}
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Build Complete Outfit
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{outfit.outfit_name}</h3>
                <p className="text-sm text-muted-foreground">{outfit.description}</p>
              </div>
              <Badge variant="secondary">
                {outfit.fit_score}% Match
              </Badge>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Why this works:</p>
              <p className="text-muted-foreground">{outfit.style_reasoning}</p>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Recommended Items:</p>
              <div className="grid grid-cols-2 gap-2">
                {outfit.recommended_items.map((item) => (
                  <div
                    key={item.id}
                    className="relative group cursor-pointer rounded-lg border overflow-hidden hover:border-primary transition-colors"
                    onClick={() => navigate(`/listing/${item.id}`)}
                  >
                    <div className="aspect-square bg-muted relative">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-xs text-primary font-semibold">£{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Total Outfit Price</p>
                <p className="text-xl font-bold">£{outfit.total_price.toFixed(2)}</p>
              </div>
              <Button onClick={() => setOutfit(null)} variant="outline">
                Build Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
