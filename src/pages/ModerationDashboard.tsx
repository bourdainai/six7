import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { Flag, AlertTriangle, Shield } from "lucide-react";
import { format } from "date-fns";
import { ModerationQueue } from "@/components/ModerationQueue";

export default function ModerationDashboard() {
  const { data: isAdmin, isLoading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name, email),
          reported_user:profiles!reports_reported_user_id_fkey(full_name, email),
          reported_listing:listings(title)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          buyer:profiles!disputes_buyer_id_fkey(full_name, email),
          seller:profiles!disputes_seller_id_fkey(full_name, email),
          listing:listings(title)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  if (adminLoading || reportsLoading || disputesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingReports = reports?.filter((r) => r.status === "pending") || [];
  const openDisputes = disputes?.filter((d) => d.status === "open") || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Moderation Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage reports, disputes, and keep the platform safe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingReports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openDisputes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reports?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              AI Queue
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <ModerationQueue />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {pendingReports.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending reports
                </CardContent>
              </Card>
            ) : (
              pendingReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {report.report_type.replace(/_/g, " ").toUpperCase()}
                        </CardTitle>
                        <CardDescription>
                          Reported by {report.reporter?.full_name || "Unknown"} on{" "}
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <Badge>{report.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm">{report.reason}</p>
                    {report.reported_listing && (
                      <p className="text-sm text-muted-foreground">
                        Listing: {report.reported_listing.title}
                      </p>
                    )}
                    {report.reported_user && (
                      <p className="text-sm text-muted-foreground">
                        User: {report.reported_user.full_name}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                      <Button size="sm" variant="destructive">
                        Take Action
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            {openDisputes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No open disputes
                </CardContent>
              </Card>
            ) : (
              openDisputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {dispute.dispute_type.replace(/_/g, " ").toUpperCase()}
                        </CardTitle>
                        <CardDescription>
                          {dispute.buyer?.full_name} vs {dispute.seller?.full_name}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">{dispute.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm font-medium">Listing: {dispute.listing?.title}</p>
                    <p className="text-sm">{dispute.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Opened {format(new Date(dispute.created_at), "MMM d, yyyy")}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        Review Details
                      </Button>
                      <Button size="sm">Mediate</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
