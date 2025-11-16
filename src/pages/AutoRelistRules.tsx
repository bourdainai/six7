import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Clock, TrendingDown, RefreshCw, Tag } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AutomationRule {
  id: string;
  rule_type: string;
  enabled: boolean;
  conditions: any;
  actions: any;
  created_at: string;
}

export default function AutoRelistRules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRule, setNewRule] = useState({
    days_listed_min: 30,
    min_stale_risk_score: 60,
    max_views_per_day: 1,
    reduce_price_by: 10,
    mark_as_quick_sale: true,
    refresh_listing: true,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_automation_rules')
        .select('*')
        .eq('seller_id', user!.id)
        .eq('rule_type', 'auto_relist')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AutomationRule[];
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('seller_automation_rules')
        .insert({
          seller_id: user!.id,
          rule_type: 'auto_relist',
          enabled: true,
          conditions: {
            days_listed_min: newRule.days_listed_min,
            min_stale_risk_score: newRule.min_stale_risk_score,
            max_views_per_day: newRule.max_views_per_day,
          },
          actions: {
            reduce_price_by_percentage: newRule.reduce_price_by,
            mark_as_quick_sale: newRule.mark_as_quick_sale,
            refresh_listing: newRule.refresh_listing,
          },
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({
        title: "Rule Created",
        description: "Your auto-relist rule has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Rule",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('seller_automation_rules')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({
        title: "Rule Updated",
        description: "Rule status has been updated.",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('seller_automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({
        title: "Rule Deleted",
        description: "Auto-relist rule has been removed.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto-Relist Rules</h1>
        <p className="text-muted-foreground">
          Automatically refresh and optimize stale listings to keep them visible
        </p>
      </div>

      <Alert className="mb-6">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Rules run daily at 5 AM. Listings matching your conditions will be automatically updated.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Rule
          </CardTitle>
          <CardDescription>
            Set conditions for when listings should be automatically refreshed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="days">Minimum Days Listed</Label>
              <Input
                id="days"
                type="number"
                value={newRule.days_listed_min}
                onChange={(e) => setNewRule({ ...newRule, days_listed_min: parseInt(e.target.value) })}
                min={1}
                max={365}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Only relist items older than this many days
              </p>
            </div>

            <div>
              <Label htmlFor="stale">Minimum Stale Risk Score</Label>
              <Input
                id="stale"
                type="number"
                value={newRule.min_stale_risk_score}
                onChange={(e) => setNewRule({ ...newRule, min_stale_risk_score: parseInt(e.target.value) })}
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Target listings with stale risk above this threshold
              </p>
            </div>

            <div>
              <Label htmlFor="views">Maximum Views Per Day</Label>
              <Input
                id="views"
                type="number"
                value={newRule.max_views_per_day}
                onChange={(e) => setNewRule({ ...newRule, max_views_per_day: parseInt(e.target.value) })}
                min={0}
                max={100}
                step={0.5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Relist items getting fewer views than this per day
              </p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="price-reduction">Price Reduction (%)</Label>
              <Input
                id="price-reduction"
                type="number"
                value={newRule.reduce_price_by}
                onChange={(e) => setNewRule({ ...newRule, reduce_price_by: parseInt(e.target.value) })}
                min={0}
                max={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Reduce price by this percentage when relisting
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="quick-sale">Mark as Quick Sale</Label>
              </div>
              <Switch
                id="quick-sale"
                checked={newRule.mark_as_quick_sale}
                onCheckedChange={(checked) => setNewRule({ ...newRule, mark_as_quick_sale: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="refresh">Refresh Published Date</Label>
              </div>
              <Switch
                id="refresh"
                checked={newRule.refresh_listing}
                onCheckedChange={(checked) => setNewRule({ ...newRule, refresh_listing: checked })}
              />
            </div>
          </div>

          <Button
            onClick={() => createRuleMutation.mutate()}
            disabled={createRuleMutation.isPending}
            className="w-full"
          >
            {createRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Rule
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Rules</h2>
        
        {!rules || rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No auto-relist rules created yet
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? "Active" : "Disabled"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(rule.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>Conditions:</strong> Items older than {rule.conditions.days_listed_min} days,
                        stale risk ≥ {rule.conditions.min_stale_risk_score}%,
                        views ≤ {rule.conditions.max_views_per_day}/day
                      </p>
                      <p>
                        <strong>Actions:</strong> Reduce price by {rule.actions.reduce_price_by_percentage}%
                        {rule.actions.mark_as_quick_sale && ', mark as quick sale'}
                        {rule.actions.refresh_listing && ', refresh listing date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => 
                        toggleRuleMutation.mutate({ id: rule.id, enabled: checked })
                      }
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
