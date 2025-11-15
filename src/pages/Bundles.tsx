import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingBag } from "lucide-react";

export default function Bundles() {
  const navigate = useNavigate();

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select(`
          *,
          seller:profiles!seller_id(full_name, trust_score),
          bundle_items(
            listing:listings(id, title, seller_price, listing_images(image_url))
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-foreground mb-2 flex items-center gap-2">
            <Package className="h-8 w-8" />
            Bundles
          </h1>
          <p className="text-muted-foreground">
            Save more by buying multiple items together
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-96 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !bundles || bundles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No bundles available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => {
              const firstImage = bundle.bundle_items[0]?.listing?.listing_images?.[0]?.image_url;
              const itemCount = bundle.bundle_items.length;
              const originalPrice = bundle.bundle_items.reduce(
                (sum, item) => sum + Number(item.listing?.seller_price || 0),
                0
              );
              const savings = originalPrice - Number(bundle.total_price);

              return (
                <Card
                  key={bundle.id}
                  className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/bundle/${bundle.id}`)}
                >
                  <div className="aspect-square bg-muted overflow-hidden relative">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={bundle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                        {itemCount} items
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-lg">{bundle.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {bundle.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-light text-foreground">
                        £{Number(bundle.total_price).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        £{originalPrice.toFixed(2)}
                      </span>
                    </div>

                    {bundle.discount_percentage > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Save {bundle.discount_percentage}% (£{savings.toFixed(2)})
                      </Badge>
                    )}

                    <div className="text-xs text-muted-foreground">
                      By {bundle.seller?.full_name || "Seller"}
                    </div>

                    <Button className="w-full" size="sm">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Buy Bundle
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
