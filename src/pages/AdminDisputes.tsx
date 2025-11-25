import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Clock, TrendingUp, User } from "lucide-react";
import { DisputeAssignment } from "@/components/admin/DisputeAssignment";

export default function AdminDisputes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: disputes, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          buyer:profiles!disputes_buyer_id_fkey(full_name, email),
          seller:profiles!disputes_seller_id_fkey(full_name, email),
          listing:listings!disputes_listing_id_fkey(title),
          order:orders!disputes_order_id_fkey(total_amount)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: moderationQueue } = useQuery({
    queryKey: ["moderation-queue-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_queue")
        .select("*")
        .eq("item_type", "dispute")
        .eq("status", "pending");

      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ disputeId, userId }: { disputeId: string; userId: string }) => {
      const { error } = await supabase
        .from("moderation_queue")
        .update({ assigned_to: userId })
        .eq("item_id", disputeId)
        .eq("item_type", "dispute");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-queue-disputes"] });
      toast({ title: "Dispute assigned successfully" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, outcome }: { disputeId: string; outcome: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("disputes")
        .update({
          status: "resolved",
          resolution: outcome,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          admin_notes: adminNotes,
        })
        .eq("id", disputeId);

      if (error) throw error;

      // Update moderation queue
      await supabase
        .from("moderation_queue")
        .update({ status: "resolved" })
        .eq("item_id", disputeId)
        .eq("item_type", "dispute");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-queue-disputes"] });
      setSelectedDispute(null);
      setResolution("");
      setAdminNotes("");
      toast({ title: "Dispute resolved successfully" });
    },
  });

  const triggerAIAnalysis = useMutation({
    mutationFn: async (disputeId: string) => {
      const { data, error } = await supabase.functions.invoke("dispute-auto-summarizer", {
        body: { dispute_id: disputeId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      toast({ title: "AI analysis completed" });
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-yellow-500",
      in_review: "bg-blue-500",
      resolved: "bg-green-500",
      rejected: "bg-red-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  const getPriorityIcon = (classification: string | null) => {
    if (classification === "high") return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (classification === "medium") return <Clock className="h-4 w-4 text-yellow-500" />;
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">AI-powered dispute resolution and admin controls</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">
                  {disputes?.filter((d) => d.status === "open").length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold">
                  {disputes?.filter((d) => d.status === "in_review").length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">
                  {disputes?.filter((d) => d.status === "resolved").length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Assigned</p>
                <p className="text-2xl font-bold">
                  {moderationQueue?.filter((m) => m.assigned_to).length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Disputes List */}
        <Card className="p-6">
          <div className="space-y-4">
            {disputes?.map((dispute) => {
              const queueItem = moderationQueue?.find((m) => m.item_id === dispute.id);
              
              return (
                <div
                  key={dispute.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(dispute.status)}>
                          {dispute.status}
                        </Badge>
                        {queueItem && getPriorityIcon(queueItem.ai_classification)}
                        {dispute.ai_confidence_score && (
                          <span className="text-xs text-muted-foreground">
                            AI Confidence: {Math.round(dispute.ai_confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-semibold mb-1">{dispute.listing.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {dispute.dispute_type} - {dispute.reason}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Buyer: {dispute.buyer.full_name || dispute.buyer.email}</span>
                        <span>Seller: {dispute.seller.full_name || dispute.seller.email}</span>
                        <span>Order: £{dispute.order.total_amount}</span>
                      </div>

                      {dispute.ai_recommended_outcome && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-xs">
                          <strong>AI Recommendation:</strong> {dispute.ai_recommended_outcome}
                        </div>
                      )}

                      {/* Team Assignment */}
                      <div className="mt-3">
                        <DisputeAssignment 
                          disputeId={dispute.id}
                          currentAssignee={queueItem?.assigned_to}
                        />
                      </div>
                    </div>

                    <Button variant="outline" size="sm">
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}

            {disputes?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No disputes to display
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Listing</label>
                  <p className="text-sm">{selectedDispute.listing.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Order Amount</label>
                  <p className="text-sm">£{selectedDispute.order.total_amount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Buyer</label>
                  <p className="text-sm">
                    {selectedDispute.buyer.full_name || selectedDispute.buyer.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Seller</label>
                  <p className="text-sm">
                    {selectedDispute.seller.full_name || selectedDispute.seller.email}
                  </p>
                </div>
              </div>

              {/* Dispute Details */}
              <div>
                <label className="text-sm font-medium">Dispute Reason</label>
                <p className="text-sm mt-1">{selectedDispute.reason}</p>
              </div>

              {/* AI Analysis */}
              {selectedDispute.ai_summary && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    AI Analysis
                  </h3>
                  <p className="text-sm">{selectedDispute.ai_summary}</p>
                  {selectedDispute.ai_recommended_outcome && (
                    <div>
                      <label className="text-xs font-medium">Recommended Outcome:</label>
                      <p className="text-sm">{selectedDispute.ai_recommended_outcome}</p>
                    </div>
                  )}
                  {selectedDispute.ai_confidence_score && (
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round(selectedDispute.ai_confidence_score * 100)}%
                    </p>
                  )}
                </div>
              )}

              {!selectedDispute.ai_summary && selectedDispute.status === "open" && (
                <Button
                  onClick={() => triggerAIAnalysis.mutate(selectedDispute.id)}
                  disabled={triggerAIAnalysis.isPending}
                  variant="outline"
                >
                  {triggerAIAnalysis.isPending ? "Analyzing..." : "Run AI Analysis"}
                </Button>
              )}

              {/* Evidence */}
              {selectedDispute.buyer_evidence && (
                <div>
                  <label className="text-sm font-medium">Buyer Evidence</label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedDispute.buyer_evidence, null, 2)}
                  </pre>
                </div>
              )}

              {selectedDispute.seller_evidence && (
                <div>
                  <label className="text-sm font-medium">Seller Evidence</label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedDispute.seller_evidence, null, 2)}
                  </pre>
                </div>
              )}

              {/* Resolution Form */}
              {selectedDispute.status !== "resolved" && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Resolve Dispute</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Resolution Outcome</label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund_buyer">Full Refund to Buyer</SelectItem>
                        <SelectItem value="partial_refund">Partial Refund</SelectItem>
                        <SelectItem value="favor_seller">Favor Seller</SelectItem>
                        <SelectItem value="split">Split Decision</SelectItem>
                        <SelectItem value="no_action">No Action Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes about the resolution..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => resolveMutation.mutate({
                        disputeId: selectedDispute.id,
                        outcome: resolution,
                      })}
                      disabled={!resolution || resolveMutation.isPending}
                    >
                      {resolveMutation.isPending ? "Resolving..." : "Resolve Dispute"}
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Already Resolved */}
              {selectedDispute.status === "resolved" && (
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <h3 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                    Dispute Resolved
                  </h3>
                  <p className="text-sm">
                    <strong>Resolution:</strong> {selectedDispute.resolution}
                  </p>
                  {selectedDispute.admin_notes && (
                    <p className="text-sm mt-2">
                      <strong>Admin Notes:</strong> {selectedDispute.admin_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
