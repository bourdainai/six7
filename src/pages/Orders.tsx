import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { format } from "date-fns";

const Orders = () => {
  const { user } = useAuth();

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
          seller:profiles!seller_id(full_name, avatar_url)
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
          buyer:profiles!buyer_id(full_name, avatar_url)
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <h1 className="text-3xl font-light text-foreground mb-8">Orders</h1>

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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium text-foreground">
                        £{Number(order.total_amount).toFixed(2)}
                      </span>
                    </div>
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
      </div>
    </div>
  );
};

export default Orders;