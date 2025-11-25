import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Package, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useMarketplace } from "@/contexts/MarketplaceContext";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface AdminOrderWithRelations extends OrderRow {
  order_items: Array<
    OrderItemRow & {
      listing: Pick<ListingRow, "title" | "brand" | "id" | "bundle_type" | "has_variants">;
      variant?: {
        id: string;
        variant_name: string;
        variant_price: number;
        variant_condition: string;
      } | null;
    }
  >;
  seller: Pick<ProfileRow, "id" | "full_name" | "email" | "avatar_url"> | null;
  buyer: Pick<ProfileRow, "id" | "full_name" | "email" | "avatar_url"> | null;
}

export function AdminOrderView() {
  const { currencySymbol } = useMarketplace();
  const { data: allOrders, isLoading } = useQuery<AdminOrderWithRelations[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, brand, id, bundle_type, has_variants),
            variant:listing_variants(id, variant_name, variant_price, variant_condition)
          ),
          seller:profiles!seller_id(id, full_name, email, avatar_url),
          buyer:profiles!buyer_id(id, full_name, email, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AdminOrderWithRelations[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalRevenue = allOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const totalOrders = allOrders?.length || 0;
  const bundleOrders = allOrders?.filter(o => 
    o.order_items.some(item => item.listing.bundle_type === 'bundle_with_discount')
  ).length || 0;
  const pendingOrders = allOrders?.filter(o => o.status === 'pending').length || 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bundle Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bundleOrders}</div>
            <p className="text-xs text-muted-foreground">
              {totalOrders > 0 ? ((bundleOrders / totalOrders) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>All orders with bundle and variant details</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="bundles">Bundle Orders</TabsTrigger>
              <TabsTrigger value="singles">Single Items</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {allOrders?.map((order) => (
                <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} currencySymbol={currencySymbol} />
              ))}
            </TabsContent>

            <TabsContent value="bundles" className="space-y-4 mt-4">
              {allOrders
                ?.filter(o => o.order_items.some(item => item.listing.bundle_type === 'bundle_with_discount'))
                .map((order) => (
                  <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} currencySymbol={currencySymbol} />
                ))}
            </TabsContent>

            <TabsContent value="singles" className="space-y-4 mt-4">
              {allOrders
                ?.filter(o => !o.order_items.some(item => item.listing.bundle_type === 'bundle_with_discount'))
                .map((order) => (
                  <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} currencySymbol={currencySymbol} />
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderCard({ 
  order, 
  getStatusColor,
  currencySymbol 
}: { 
  order: AdminOrderWithRelations; 
  getStatusColor: (status: string) => string;
  currencySymbol: string;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">Order #{order.id.slice(0, 8)}</h4>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "PPP 'at' p")}
          </p>
        </div>
        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Buyer</p>
          <p className="font-medium">{order.buyer?.full_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{order.buyer?.email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Seller</p>
          <p className="font-medium">{order.seller?.full_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{order.seller?.email}</p>
        </div>
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-sm font-medium">Items:</p>
        {order.order_items.map((item) => {
          const isBundle = item.listing.bundle_type === 'bundle_with_discount';
          const isSingleVariant = item.variant_id && !isBundle;
          
          return (
            <div key={item.id} className="flex items-start justify-between text-sm bg-accent/5 p-2 rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.listing.title}</p>
                  {isBundle && (
                    <Badge variant="secondary" className="text-xs">
                      Bundle
                    </Badge>
                  )}
                  {isSingleVariant && (
                    <Badge variant="outline" className="text-xs">
                      Single
                    </Badge>
                  )}
                </div>
                {isSingleVariant && item.variant && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.variant.variant_name} • {item.variant.variant_condition?.replace('_', ' ')}
                  </p>
                )}
              </div>
              <p className="font-medium">{currencySymbol}{Number(item.price).toFixed(2)}</p>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-3 flex justify-between items-center">
        <div className="text-sm">
          <span className="text-muted-foreground">Platform Fee: </span>
          <span className="font-medium">{currencySymbol}{Number(order.platform_fee).toFixed(2)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Seller Amount: </span>
          <span className="font-medium">{currencySymbol}{Number(order.seller_amount).toFixed(2)}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium text-lg">{currencySymbol}{Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {order.shipping_status && (
        <div className="border-t pt-3 text-sm">
          <span className="text-muted-foreground">Shipping: </span>
          <Badge variant="outline" className="capitalize">
            {order.shipping_status.replace('_', ' ')}
          </Badge>
          {order.tracking_number && (
            <span className="ml-2 text-muted-foreground">
              Tracking: {order.tracking_number}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
