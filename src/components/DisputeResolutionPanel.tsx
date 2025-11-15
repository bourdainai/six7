import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DisputeResolutionPanelProps {
  dispute: {
    ai_summary?: string;
    ai_recommended_outcome?: string;
    ai_confidence_score?: number;
    buyer?: { full_name?: string; trust_score?: number };
    seller?: { full_name?: string; trust_score?: number };
  };
  onAcceptRecommendation?: () => void;
  onReject?: () => void;
}

export const DisputeResolutionPanel = ({
  dispute,
  onAcceptRecommendation,
  onReject
}: DisputeResolutionPanelProps) => {
  const getOutcomeLabel = (outcome?: string) => {
    const labels: Record<string, string> = {
      buyer_favor: "Favor Buyer",
      seller_favor: "Favor Seller",
      partial_refund: "Partial Refund",
      full_refund: "Full Refund"
    };
    return outcome ? labels[outcome] || outcome : "Not available";
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "buyer_favor":
      case "full_refund":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "seller_favor":
        return "text-green-600 bg-green-50 border-green-200";
      case "partial_refund":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getConfidenceLevel = (score?: number) => {
    if (!score) return "Unknown";
    if (score >= 80) return "Very High";
    if (score >= 60) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  };

  const hasAIAnalysis = dispute.ai_summary || dispute.ai_recommended_outcome;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Dispute Analysis</CardTitle>
          </div>
          {dispute.ai_confidence_score && (
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {getConfidenceLevel(dispute.ai_confidence_score)} Confidence
            </Badge>
          )}
        </div>
        <CardDescription>
          AI-powered analysis and recommendation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAIAnalysis ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              AI analysis not yet available for this dispute. Run auto-summarizer to generate insights.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* AI Summary */}
            {dispute.ai_summary && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Summary
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {dispute.ai_summary}
                </p>
              </div>
            )}

            {/* Recommended Outcome */}
            {dispute.ai_recommended_outcome && (
              <div className="space-y-3">
                <h4 className="font-semibold">Recommended Outcome</h4>
                <Badge 
                  variant="outline" 
                  className={`${getOutcomeColor(dispute.ai_recommended_outcome)} text-base py-2 px-4`}
                >
                  {getOutcomeLabel(dispute.ai_recommended_outcome)}
                </Badge>
              </div>
            )}

            {/* Confidence Score */}
            {dispute.ai_confidence_score !== undefined && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">AI Confidence</h4>
                  <span className="text-sm font-medium">{dispute.ai_confidence_score}%</span>
                </div>
                <Progress value={dispute.ai_confidence_score} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {dispute.ai_confidence_score >= 80 && "Very high confidence - Strong evidence supports this outcome"}
                  {dispute.ai_confidence_score >= 60 && dispute.ai_confidence_score < 80 && "High confidence - Evidence leans toward this outcome"}
                  {dispute.ai_confidence_score >= 40 && dispute.ai_confidence_score < 60 && "Medium confidence - Some ambiguity in evidence"}
                  {dispute.ai_confidence_score < 40 && "Low confidence - Manual review strongly recommended"}
                </p>
              </div>
            )}

            {/* Trust Scores Context */}
            {(dispute.buyer?.trust_score || dispute.seller?.trust_score) && (
              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-semibold text-sm">Trust Context</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {dispute.buyer && (
                    <div>
                      <p className="text-muted-foreground">Buyer Trust</p>
                      <p className="font-medium">{dispute.buyer.trust_score || 50}/100</p>
                    </div>
                  )}
                  {dispute.seller && (
                    <div>
                      <p className="text-muted-foreground">Seller Trust</p>
                      <p className="font-medium">{dispute.seller.trust_score || 50}/100</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                className="flex-1"
                onClick={onAcceptRecommendation}
                disabled={!dispute.ai_recommended_outcome}
              >
                Accept AI Recommendation
              </Button>
              <Button 
                variant="outline"
                onClick={onReject}
              >
                Manual Review
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
