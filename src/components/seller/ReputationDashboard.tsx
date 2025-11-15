import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, TrendingUp, Award, Activity } from "lucide-react";
import { toast } from "sonner";
import { SellerReputation } from "./SellerReputation";

export const ReputationDashboard = () => {
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: reputationEvents, refetch: refetchEvents } = useQuery({
    queryKey: ["reputation-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reputation_events")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const recalculateReputation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.functions.invoke("calculate-seller-reputation", {
        body: { seller_id: user.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Reputation recalculated successfully");
      refetchEvents();
    },
    onError: (error: Error) => {
      toast.error("Failed to recalculate reputation: " + error.message);
    },
  });

  if (!user) return null;

  // Format events data for chart
  const chartData = reputationEvents?.slice(0, 10).reverse().map(event => ({
    date: new Date(event.created_at).toLocaleDateString(),
    impact: event.impact_score,
    event: event.event_type,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header with recalculate button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Seller Reputation</h2>
          <p className="text-muted-foreground">
            Track your performance and build trust with buyers
          </p>
        </div>
        <Button
          onClick={() => recalculateReputation.mutate()}
          disabled={recalculateReputation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recalculateReputation.isPending ? "animate-spin" : ""}`} />
          Recalculate
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history">
            <Activity className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award className="h-4 w-4 mr-2" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SellerReputation sellerId={user.id} />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Reputation History</CardTitle>
              <CardDescription>Track how your reputation has changed over time</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="impact"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium">Recent Events</h4>
                    {reputationEvents?.slice(0, 10).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{event.event_type}</div>
                          {event.reasoning && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {event.reasoning}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant={event.impact_score > 0 ? "default" : "destructive"}
                        >
                          {event.impact_score > 0 ? "+" : ""}
                          {event.impact_score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No reputation history yet. Complete sales to build your reputation!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>How to Improve Your Reputation</CardTitle>
              <CardDescription>
                Follow these tips to increase your seller score
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="text-2xl">⭐</div>
                  <div>
                    <div className="font-medium">Maintain High Ratings</div>
                    <div className="text-sm text-muted-foreground">
                      Provide excellent service to earn 5-star reviews from buyers
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <div className="font-medium">Respond Quickly</div>
                    <div className="text-sm text-muted-foreground">
                      Reply to messages within 2 hours to earn the Fast Responder badge
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="text-2xl">📦</div>
                  <div>
                    <div className="font-medium">Ship On Time</div>
                    <div className="text-sm text-muted-foreground">
                      Ship orders within 48 hours to maintain high on-time delivery rates
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="text-2xl">🛡️</div>
                  <div>
                    <div className="font-medium">Resolve Disputes Fairly</div>
                    <div className="text-sm text-muted-foreground">
                      Work with buyers to resolve issues and avoid disputes
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="text-2xl">📈</div>
                  <div>
                    <div className="font-medium">Complete More Sales</div>
                    <div className="text-sm text-muted-foreground">
                      Build your track record with consistent sales over time
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
