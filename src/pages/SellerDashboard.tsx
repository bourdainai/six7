import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, ShoppingCart, TrendingUp, Award, CheckCircle2, Upload, User, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, memo } from "react";
import { SellerCopilot } from "@/components/SellerCopilot";
import { StaleInventoryAlert } from "@/components/StaleInventoryAlert";
import { OnboardingStatusCards } from "@/components/seller/OnboardingStatusCards";
import { BalanceCards } from "@/components/seller/BalanceCards";
import { ListingsManagement } from "@/components/seller/ListingsManagement";
import { CollectrImportDialog } from "@/components/import/CollectrImportDialog";
import { CreditsBanner } from "@/components/seller/CreditsBanner";

const SellerDashboard = memo(() => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedListingForCopilot, setSelectedListingForCopilot] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Read tab from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const activeTab = searchParams.get("tab") || "overview";

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change frequently
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: listings, refetch: refetchListings } = useQuery({
    queryKey: ["seller-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          images:listing_images(image_url, display_order)
        `)
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100); // Limit to recent 100 listings for performance
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Listing Deleted", description: "Your listing has been removed" });
      refetchListings();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete listing", variant: "destructive" });
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["seller-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("seller_id", user!.id).eq("status", "paid");
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const { data: balance } = useQuery({
    queryKey: ["seller-balance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_balances")
        .select("*")
        .eq("seller_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" - that's okay, we'll return default
        throw error;
      }
      return data || { available_balance: 0, pending_balance: 0, currency: "GBP" };
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-account-session");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      navigate("/seller/onboarding");
      toast({ title: "Starting Onboarding", description: "Complete your setup to start receiving payments" });
    },
  });

  useEffect(() => {
    if (window.location.search.includes("onboarding=complete")) {
      setTimeout(() => refetchProfile(), 2000);
    }
  }, [refetchProfile]);

  const activeListings = listings?.filter((l) => l.status === "active").length || 0;
  const totalSales = sales?.reduce((sum, order) => sum + Number(order.seller_amount), 0) || 0;
  const totalOrders = sales?.length || 0;

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4 tracking-tight">Please sign in</h1>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-light text-foreground tracking-tight">
              Seller Dashboard
            </h1>
            <p className="text-base text-muted-foreground font-normal tracking-tight">
              Manage your listings and track your performance
            </p>
          </div>
          <div className="flex gap-2">
            {/* Desktop Actions */}
            <div className="hidden md:flex gap-2">
              <Button onClick={() => setShowImportDialog(true)} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Import from Collectr
              </Button>
              <Button onClick={() => navigate("/seller/profile/settings")} variant="outline" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button onClick={() => navigate("/seller/verification")} variant="outline" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Verification
              </Button>
              <Button onClick={() => navigate("/seller/reputation")} variant="outline" className="gap-2">
                <Award className="h-4 w-4" />
                Reputation
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import from Collectr
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/seller/profile/settings")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/seller/verification")}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verification
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/seller/reputation")}>
                    <Award className="mr-2 h-4 w-4" />
                    Reputation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => navigate(`/dashboard/seller?tab=${value}`)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CreditsBanner />

          <OnboardingStatusCards
            profile={profile}
            onStartOnboarding={() => onboardMutation.mutate()}
            isOnboardingLoading={onboardMutation.isPending}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                  <Package className="h-4 w-4" />Active Listings
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-light tracking-tight">{activeListings}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                  <ShoppingCart className="h-4 w-4" />Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-light tracking-tight">{totalOrders}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                  <DollarSign className="h-4 w-4" />Revenue
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-light tracking-tight">£{totalSales.toFixed(2)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-normal flex items-center gap-2 tracking-tight">
                  <TrendingUp className="h-4 w-4" />Avg Order
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-light tracking-tight">£{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00"}</div></CardContent>
            </Card>
          </div>

          {/* Balance Cards */}
          {profile?.stripe_onboarding_complete && (
            <BalanceCards balance={balance} />
          )}

          <StaleInventoryAlert />
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle className="font-normal tracking-tight">My Listings</CardTitle>
              <CardDescription className="font-normal">Manage all your listings</CardDescription>
            </CardHeader>
            <CardContent>
              <ListingsManagement
                listings={listings || []}
                onDelete={(id) => deleteListingMutation.mutate(id)}
                isDeleting={deleteListingMutation.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedListingForCopilot && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-divider-gray bg-background shadow-elevation">
            <Button variant="ghost" size="sm" className="absolute top-2 right-2 z-10" onClick={() => setSelectedListingForCopilot(null)}>Close</Button>
            <SellerCopilot listingId={selectedListingForCopilot} />
          </div>
        </div>
      )}

      <CollectrImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
    </PageLayout>
  );
});

SellerDashboard.displayName = 'SellerDashboard';

export default SellerDashboard;
