import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { formatForDisplay } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { DisputeDialog } from "@/components/disputes/DisputeDialog";
import { RatingDialog } from "@/components/ratings/RatingDialog";
import { ShipOrderDialog } from "@/components/ShipOrderDialog";
import { AlertCircle, Star, Truck, Package } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const Orders = () => {
  const { user } = useAuth();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [shipOrderOpen, setShipOrderOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: buyerOrders, isLoading: isLoadingBuyer } = useQuery({
    queryKey: ["orders", "buyer", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, brand)
          ),
          seller:profiles!seller_id(full_name, avatar_url),
          shipping_details(*)
        `)
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: sellerOrders, isLoading: isLoadingSeller } = useQuery({
    queryKey: ["orders", "seller", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            *,
            listing:listings(title, brand)
          ),
          buyer:profiles!buyer_id(full_name, avatar_url),
          shipping_details(*)
        `)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  if (isLoadingBuyer || isLoadingSeller) {
    return (
      <PageLayout>
        <div className="mb-8 space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="purchases">My Purchases</TabsTrigger>
            <TabsTrigger value="sales">My Sales</TabsTrigger>
          </TabsList>
          <TabsContent value="purchases">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground">
            Orders
          </h1>
          <p className="text-base text-muted-foreground font-light">
            Track and manage your purchases and sales
          </p>
        </div>

        <Tabs defaultValue="purchases" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="purchases">My Purchases</TabsTrigger>
            <TabsTrigger value="sales">My Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-4">
            {isLoadingBuyer ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : buyerOrders && buyerOrders.length > 0 ? (
              buyerOrders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-light text-foreground mb-1">
                        Order #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "PPP")}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>

                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.listing.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.listing.brand}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        £{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4 mt-4">
                    {order.shipping_details && order.shipping_details.length > 0 && (
                      <div className="mb-4 p-3 bg-accent/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4" />
                          <span className="font-medium text-sm">Shipping Status</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="capitalize">Status: {order.shipping_details[0].status}</p>
                          {order.shipping_details[0].tracking_number && (
                            <p>Tracking: {order.shipping_details[0].tracking_number}</p>
                          )}
                          {order.shipping_details[0].carrier && (
                            <p>Carrier: {order.shipping_details[0].carrier}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium text-foreground">
                            £{Number(order.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {order.status === "paid" && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDisputeOpen(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Open Dispute
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedOrder(order);
                            setRatingOpen(true);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Star className="h-4 w-4" />
                          Rate Seller
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No purchases yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            {isLoadingSeller ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sellerOrders && sellerOrders.length > 0 ? (
              sellerOrders.map((order) => (
                <div key={order.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-light text-foreground mb-1">
                        Order #{order.id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "PPP")}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>

                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {item.listing.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.listing.brand}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        £{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                  ))}

                  <div className="border-t border-border pt-4 mt-4 space-y-2">
                    {/* Shipping Management for Seller */}
                    <div className="mb-4 p-3 bg-accent/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          <span className="font-medium text-sm">Shipping</span>
                        </div>
                        {order.status === 'paid' && order.shipping_status === 'awaiting_shipment' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShipOrderOpen(true);
                            }}
                          >
                            Ship Order
                          </Button>
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="capitalize">
                          Status: <Badge variant="outline" className="ml-2">
                            {formatForDisplay(order.shipping_status || 'pending')}
                          </Badge>
                        </p>
                        {order.tracking_number && (
                          <>
                            <p>Carrier: {order.carrier}</p>
                            <p>Tracking: <span className="font-mono">{order.tracking_number}</span></p>
                          </>
                        )}
                        {order.shipped_at && (
                          <p>Shipped: {format(new Date(order.shipped_at), "PPP")}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sale Amount</span>
                      <span className="font-medium text-foreground">
                        £{Number(order.seller_amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="text-muted-foreground">
                        £{Number(order.platform_fee).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No sales yet
              </div>
            )}
          </TabsContent>
          </Tabs>

        {selectedOrder && (
        <>
          <DisputeDialog
            open={disputeOpen}
            onOpenChange={setDisputeOpen}
            orderId={selectedOrder.id}
            listingId={selectedOrder.order_items[0]?.listing_id}
            sellerId={selectedOrder.seller_id}
          />
          <RatingDialog
            open={ratingOpen}
            onOpenChange={setRatingOpen}
            revieweeId={selectedOrder.seller_id}
            orderId={selectedOrder.id}
            listingId={selectedOrder.order_items[0]?.listing_id}
            reviewType="buyer_to_seller"
            revieweeName={selectedOrder.seller?.full_name || "Seller"}
          />
          <ShipOrderDialog
            open={shipOrderOpen}
            onOpenChange={setShipOrderOpen}
            orderId={selectedOrder.id}
          />
        </>
      )}
    </PageLayout>
  );
};

export default Orders;