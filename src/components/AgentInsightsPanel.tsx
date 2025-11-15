import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp } from "lucide-react";

interface AgentInsightsPanelProps {
  fitScore?: number;
  reasoning?: string;
  compact?: boolean;
}

export const AgentInsightsPanel = ({ 
  fitScore, 
  reasoning,
  compact = false 
}: AgentInsightsPanelProps) => {
  if (!reasoning && !fitScore) return null;

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10 text-green-700 border-green-500/20";
    if (score >= 60) return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  };

  const getFitScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    return "Potential Match";
  };

  if (compact) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {fitScore !== undefined && (
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={getFitScoreColor(fitScore)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {fitScore}% {getFitScoreLabel(fitScore)}
              </Badge>
            </div>
          )}
          {reasoning && (
            <p className="text-muted-foreground">{reasoning}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-background/50">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-sm">Why we picked this for you</h4>
            {fitScore !== undefined && (
              <Badge variant="outline" className={getFitScoreColor(fitScore)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {fitScore}% Match
              </Badge>
            )}
          </div>
          {reasoning && (
            <p className="text-sm text-muted-foreground">{reasoning}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
