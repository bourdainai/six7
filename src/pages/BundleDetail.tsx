import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Package, User, Shield } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

export default function BundleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: bundle, isLoading } = useQuery({
    queryKey: ["bundle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundles")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
          bundle_items(
            id,
            listing:listings(
              id,
              title,
              brand,
              seller_price,
              condition,
              size,
              listing_images(image_url)
            )
          )
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleBuyBundle = async () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      return;
    }

    if (!bundle) return;

    // Create order with all bundle items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: bundle.seller_id,
        total_amount: bundle.total_price,
        platform_fee: Number(bundle.total_price) * 0.1,
        seller_amount: Number(bundle.total_price) * 0.9,
        shipping_address: {},
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      toast.error("Failed to create order");
      return;
    }

    // Add all bundle items to order_items
    const orderItems = bundle.bundle_items.map((item) => ({
      order_id: order.id,
      listing_id: item.listing.id,
      price: item.listing.seller_price,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      toast.error("Failed to add items to order");
      return;
    }

    // Navigate to checkout
    navigate(`/checkout?order=${order.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          <div className="animate-pulse space-y-8">
            <div className="h-96 bg-muted rounded-lg" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
          <p className="text-center text-muted-foreground">Bundle not found</p>
        </div>
      </div>
    );
  }

  const originalPrice = bundle.bundle_items.reduce(
    (sum, item) => sum + Number(item.listing.seller_price),
    0
  );
  const savings = originalPrice - Number(bundle.total_price);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              {bundle.bundle_items[0]?.listing?.listing_images?.[0] ? (
                <img
                  src={bundle.bundle_items[0].listing.listing_images[0].image_url}
                  alt={bundle.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {bundle.bundle_items.slice(1, 5).map((item, idx) => (
                <div key={item.id} className="aspect-square bg-muted rounded-lg overflow-hidden">
                  {item.listing?.listing_images?.[0] ? (
                    <img
                      src={item.listing.listing_images[0].image_url}
                      alt={item.listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">
                  <Package className="h-3 w-3 mr-1" />
                  Bundle of {bundle.bundle_items.length} items
                </Badge>
              </div>
              <h1 className="text-3xl font-light text-foreground mb-2">{bundle.title}</h1>
              <p className="text-muted-foreground">{bundle.description}</p>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-light text-foreground">
                  £{Number(bundle.total_price).toFixed(2)}
                </span>
                <span className="text-xl text-muted-foreground line-through">
                  £{originalPrice.toFixed(2)}
                </span>
              </div>
              {bundle.discount_percentage > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Save {bundle.discount_percentage}% (£{savings.toFixed(2)})
                </Badge>
              )}
            </div>

            <Separator />

            {/* Seller Info */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                {bundle.seller.avatar_url ? (
                  <img
                    src={bundle.seller.avatar_url}
                    alt={bundle.seller.full_name || "Seller"}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {bundle.seller.full_name || "Seller"}
                </p>
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Trust Score: {bundle.seller.trust_score || 50}/100
                  </span>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={handleBuyBundle}
              disabled={bundle.seller_id === user?.id}
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Buy Bundle
            </Button>

            {bundle.seller_id === user?.id && (
              <p className="text-sm text-muted-foreground text-center">
                You cannot buy your own bundle
              </p>
            )}
          </div>
        </div>

        {/* Items in Bundle */}
        <div className="mt-12">
          <h2 className="text-2xl font-light text-foreground mb-6">Items in this bundle</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {bundle.bundle_items.map((item) => (
              <Card key={item.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-muted overflow-hidden">
                  {item.listing?.listing_images?.[0] ? (
                    <img
                      src={item.listing.listing_images[0].image_url}
                      alt={item.listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-foreground mb-1 truncate">{item.listing.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.listing.brand}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {item.listing.condition?.replace("_", " ")}
                    </span>
                    <span className="font-medium text-foreground">
                      £{Number(item.listing.seller_price).toFixed(2)}
                    </span>
                  </div>
                  {item.listing.size && (
                    <p className="text-xs text-muted-foreground mt-1">Size: {item.listing.size}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
