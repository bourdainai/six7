import React from "react";
import { useQuery } from "@tanstack/react-query";
import { createACPClient, ACPProduct } from "@/lib/acp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

interface ACPProductListProps {
  apiKey: string;
  filters?: {
    condition?: string;
    set_code?: string;
    rarity?: string;
    min_price?: number;
    max_price?: number;
  };
}

export const ACPProductList: React.FC<ACPProductListProps> = ({ apiKey, filters }) => {
  const { toast } = useToast();
  const acpClient = React.useMemo(() => createACPClient(apiKey), [apiKey]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["acp-products", filters],
    queryFn: async () => {
      return acpClient.listProducts({
        limit: 20,
        ...filters,
      });
    },
    enabled: !!apiKey,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">Failed to load products: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.products || data.products.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No products available via ACP.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ACP Products</h3>
        <Badge variant="secondary">
          {data.pagination.total} total
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.products.map((product: ACPProduct) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted relative">
              {product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-1 line-clamp-2">{product.title}</h4>
              <p className="text-sm text-muted-foreground mb-2">{product.condition}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">£{product.price.toFixed(2)}</span>
                {product.trade_enabled && (
                  <Badge variant="outline" className="text-xs">Trade Enabled</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.pagination.has_more && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Showing {data.products.length} of {data.pagination.total} products</p>
        </div>
      )}
    </div>
  );
};
