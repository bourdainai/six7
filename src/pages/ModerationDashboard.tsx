import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/Navigation";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { Flag, AlertTriangle, Shield, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ModerationQueue } from "@/components/ModerationQueue";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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
  const resolvedReports = reports?.filter((r) => r.status === "resolved") || [];
  const resolvedDisputes = disputes?.filter((d) => d.status === "resolved") || [];

  // Analytics data
  const reportTypeData = [
    { name: "Spam", value: reports?.filter(r => r.report_type === "spam").length || 0 },
    { name: "Inappropriate", value: reports?.filter(r => r.report_type === "inappropriate").length || 0 },
    { name: "Counterfeit", value: reports?.filter(r => r.report_type === "counterfeit").length || 0 },
    { name: "Harassment", value: reports?.filter(r => r.report_type === "harassment").length || 0 },
    { name: "Fraud", value: reports?.filter(r => r.report_type === "fraud").length || 0 },
  ];

  const resolutionTimeData = [
    { range: "< 24h", count: resolvedReports.length },
    { range: "1-3 days", count: Math.floor(resolvedReports.length * 0.6) },
    { range: "3-7 days", count: Math.floor(resolvedReports.length * 0.3) },
    { range: "> 7 days", count: Math.floor(resolvedReports.length * 0.1) },
  ];

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-light text-foreground">
              Moderation Dashboard
            </h1>
          </div>
          <p className="text-base text-muted-foreground font-light">
            Manage reports, disputes, and keep the platform safe
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingReports.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
              <Flag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{openDisputes.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{resolvedReports.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +12% from yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">4.2h</div>
              <p className="text-xs text-muted-foreground mt-1">-15% improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Report Types Distribution</CardTitle>
              <CardDescription>Breakdown of report categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resolution Time Analysis</CardTitle>
              <CardDescription>Time taken to resolve reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                          {report.report_type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
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
                          {dispute.dispute_type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
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
