import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutomationRule {
  id: string;
  rule_type: string;
  conditions: any;
  actions: any;
  enabled: boolean;
}

export const AutomationRulesPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AutomationRule[];
    },
  });

  const toggleRule = useMutation({
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
        title: "Rule updated",
        description: "Automation rule has been updated",
      });
    },
  });

  const deleteRule = useMutation({
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
        title: "Rule deleted",
        description: "Automation rule has been removed",
      });
    },
  });

  const ruleTypeLabels: Record<string, string> = {
    auto_relist: 'Auto-Relist',
    auto_discount: 'Auto-Discount',
    auto_bundle: 'Auto-Bundle',
    price_drop: 'Price Drop',
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Automation Rules</h3>
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Automation Rules</h3>
        </div>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {!rules || rules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            No automation rules yet. Create rules to automatically manage your listings.
          </p>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(enabled) =>
                    toggleRule.mutate({ id: rule.id, enabled })
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">
                      {ruleTypeLabels[rule.rule_type] || rule.rule_type}
                    </Badge>
                    {!rule.enabled && (
                      <Badge variant="outline" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getRuleDescription(rule)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteRule.mutate(rule.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Pro tip:</strong> Automation rules help you save time by automatically
          managing your inventory based on conditions you set. Examples: Auto-relist items
          after 30 days, apply discounts to stale inventory, or create bundles from
          similar items.
        </p>
      </div>
    </Card>
  );
};

function getRuleDescription(rule: AutomationRule): string {
  const conditions = rule.conditions || {};
  const actions = rule.actions || {};

  switch (rule.rule_type) {
    case 'auto_relist':
      return `Relist items after ${conditions.days_old || 30} days with no views`;
    case 'auto_discount':
      return `Apply ${actions.discount_percent || 10}% discount after ${conditions.days_old || 14} days`;
    case 'auto_bundle':
      return `Create bundles from similar items in same category`;
    case 'price_drop':
      return `Drop price by ${actions.price_reduction || 5}% when stale risk > ${conditions.stale_score || 70}%`;
    default:
      return 'Custom automation rule';
  }
}
