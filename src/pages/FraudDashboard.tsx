import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RiskScoreIndicator } from "@/components/RiskScoreIndicator";

export default function FraudDashboard() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");

  // Fetch fraud flags
  const { data: flags, isLoading, refetch } = useQuery({
    queryKey: ["fraud-flags", selectedStatus],
    queryFn: async () => {
      const query = supabase
        .from("fraud_flags")
        .select(`
          *,
          profiles!fraud_flags_user_id_fkey(id, full_name, email, trust_score),
          listings(id, title),
          orders(id, status)
        `)
        .order("created_at", { ascending: false });

      if (selectedStatus !== "all") {
        query.eq("status", selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleUpdateStatus = async (flagId: string, newStatus: string) => {
    const { error } = await supabase
      .from("fraud_flags")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", flagId);

    if (error) {
      toast.error("Failed to update flag status");
      return;
    }

    toast.success(`Flag marked as ${newStatus}`);
    refetch();
  };

  const getFlagTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      suspicious_listing: "Suspicious Listing",
      payment_abuse: "Payment Abuse",
      multi_account: "Multi-Account",
      stock_photo: "Stock Photo Detected",
      duplicate_listing: "Duplicate Listing",
      price_manipulation: "Price Manipulation",
      off_platform_request: "Off-Platform Request",
      counterfeit_risk: "Counterfeit Risk"
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const pendingCount = flags?.filter(f => f.status === "pending").length || 0;
  const confirmedCount = flags?.filter(f => f.status === "confirmed").length || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fraud Detection Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage fraud detection alerts across the platform
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Fraud</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dismissed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {flags?.filter(f => f.status === "dismissed").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flags List */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <div className="space-y-4">
            {flags?.map((flag) => (
              <Card key={flag.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getFlagTypeLabel(flag.flag_type)}
                        <RiskScoreIndicator score={flag.risk_score} type="risk" size="sm" />
                      </CardTitle>
                      <CardDescription>
                        {flag.profiles?.full_name || flag.profiles?.email || "Unknown User"}
                        {flag.profiles?.trust_score && (
                          <span className="ml-2">
                            <RiskScoreIndicator score={flag.profiles.trust_score} type="trust" size="sm" />
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      flag.status === "confirmed" ? "destructive" :
                      flag.status === "dismissed" ? "secondary" :
                      "default"
                    }>
                      {flag.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Details */}
                    {flag.details && typeof flag.details === 'object' && (
                      <div className="text-sm text-muted-foreground">
                        {(flag.details as any).message && <p>{(flag.details as any).message}</p>}
                        {(flag.details as any).duplicate_count && (
                          <p>Duplicate listings found: {(flag.details as any).duplicate_count}</p>
                        )}
                        {(flag.details as any).stock_photo_count && (
                          <p>Stock photos: {(flag.details as any).stock_photo_count}/{(flag.details as any).total_images}</p>
                        )}
                      </div>
                    )}

                    {/* Linked Items */}
                    <div className="flex flex-wrap gap-2 text-sm">
                      {flag.listings && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/listing/${flag.listing_id}`)}
                        >
                          View Listing: {flag.listings.title}
                        </Button>
                      )}
                      {flag.orders && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders`)}
                        >
                          View Order
                        </Button>
                      )}
                    </div>

                    {/* Actions */}
                    {flag.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(flag.id, "confirmed")}
                        >
                          Confirm Fraud
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(flag.id, "dismissed")}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(flag.id, "reviewed")}
                        >
                          Mark Reviewed
                        </Button>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(flag.created_at).toLocaleString()}
                      {flag.reviewed_at && ` • Reviewed: ${new Date(flag.reviewed_at).toLocaleString()}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {flags?.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No flags found for this status</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
