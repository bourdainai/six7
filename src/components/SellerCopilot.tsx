import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertCircle, Info, Loader2 } from "lucide-react";

interface CopilotSuggestion {
  type: "price" | "title" | "description" | "photos" | "timing" | "promotion";
  priority: "high" | "medium" | "low";
  title: string;
  suggestion: string;
  impact: string;
  action: string;
}

interface CopilotData {
  suggestions: CopilotSuggestion[];
  overall_health: "excellent" | "good" | "needs_attention" | "critical";
  health_score: number;
  reasoning: string;
}

interface SellerCopilotProps {
  listingId: string;
}

const priorityColors = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const priorityIcons = {
  high: AlertCircle,
  medium: Info,
  low: TrendingUp,
};

const healthColors = {
  excellent: "text-green-600",
  good: "text-blue-600",
  needs_attention: "text-orange-600",
  critical: "text-red-600",
};

export const SellerCopilot = ({ listingId }: SellerCopilotProps) => {
  const { data, isLoading, error } = useQuery<CopilotData>({
    queryKey: ["seller-copilot", listingId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("seller-copilot", {
        body: { listingId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to get suggestions");
      
      return data.data;
    },
    refetchInterval: 60000 * 5, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Copilot</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Copilot</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Unable to load suggestions at this time.
        </p>
      </Card>
    );
  }

  const sortedSuggestions = [...data.suggestions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Copilot</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${healthColors[data.overall_health]}`}>
            {data.health_score}/100
          </span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">{data.reasoning}</p>
      </div>

      <div className="space-y-4">
        {sortedSuggestions.map((suggestion, idx) => {
          const PriorityIcon = priorityIcons[suggestion.priority];
          
          return (
            <div
              key={idx}
              className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-medium">{suggestion.title}</h4>
                </div>
                <Badge variant={priorityColors[suggestion.priority]}>
                  {suggestion.priority}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {suggestion.suggestion}
              </p>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Expected Impact</p>
                  <p className="text-sm font-medium">{suggestion.impact}</p>
                </div>
                <Button size="sm" variant="outline">
                  {suggestion.action}
                </Button>
              </div>
            </div>
          );
        })}

        {sortedSuggestions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Your listing looks great! No suggestions at this time.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
