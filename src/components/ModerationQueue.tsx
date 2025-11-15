import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, Shield, FileText, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const ModerationQueue = () => {
  const navigate = useNavigate();
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  const { data: queueItems, isLoading, refetch } = useQuery({
    queryKey: ["moderation-queue", selectedPriority],
    queryFn: async () => {
      const query = supabase
        .from("moderation_queue")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedPriority !== "all") {
        query.eq("ai_classification", selectedPriority);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleAssign = async (itemId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("moderation_queue")
      .update({
        assigned_to: user.id,
        status: "in_progress"
      })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to assign item");
      return;
    }

    toast.success("Item assigned to you");
    refetch();
  };

  const handleResolve = async (itemId: string) => {
    const { error } = await supabase
      .from("moderation_queue")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString()
      })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to resolve item");
      return;
    }

    toast.success("Item marked as resolved");
    refetch();
  };

  const getPriorityColor = (classification: string) => {
    switch (classification) {
      case "critical": return "destructive";
      case "high_priority": return "default";
      case "medium_priority": return "secondary";
      case "low_priority": return "outline";
      default: return "outline";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "report": return <AlertTriangle className="h-4 w-4" />;
      case "dispute": return <Scale className="h-4 w-4" />;
      case "listing": return <FileText className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const criticalCount = queueItems?.filter(i => i.ai_classification === "critical" && i.status === "pending").length || 0;
  const highCount = queueItems?.filter(i => i.ai_classification === "high_priority" && i.status === "pending").length || 0;

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {queueItems?.filter(i => i.status === "in_progress").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {queueItems?.filter(i => i.status === "resolved").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Items */}
      <Tabs value={selectedPriority} onValueChange={setSelectedPriority}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="high_priority">High</TabsTrigger>
          <TabsTrigger value="medium_priority">Medium</TabsTrigger>
          <TabsTrigger value="low_priority">Low</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPriority} className="mt-6">
          <div className="space-y-4">
            {queueItems?.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getTypeIcon(item.item_type)}
                        {item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1)}
                        <Badge variant={getPriorityColor(item.ai_classification)}>
                          {item.ai_classification?.replace('_', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {item.ai_reason}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      item.status === "resolved" ? "default" :
                      item.status === "in_progress" ? "secondary" :
                      "outline"
                    }>
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Actions */}
                    <div className="flex gap-2">
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleAssign(item.id)}
                        >
                          Assign to Me
                        </Button>
                      )}
                      {item.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleResolve(item.id)}
                        >
                          Mark Resolved
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (item.item_type === "listing") {
                            navigate(`/listing/${item.item_id}`);
                          } else if (item.item_type === "report") {
                            navigate(`/moderation`);
                          } else if (item.item_type === "dispute") {
                            navigate(`/moderation`);
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(item.created_at).toLocaleString()}
                      {item.updated_at && item.updated_at !== item.created_at && 
                        ` • Updated: ${new Date(item.updated_at).toLocaleString()}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {queueItems?.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No items in queue</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
