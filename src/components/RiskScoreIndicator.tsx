import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RiskScoreIndicatorProps {
  score: number;
  type?: "trust" | "risk";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RiskScoreIndicator = ({ 
  score, 
  type = "trust",
  showLabel = true,
  size = "md" 
}: RiskScoreIndicatorProps) => {
  const getScoreColor = () => {
    if (type === "trust") {
      if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
      if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
      if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
      return "text-red-600 bg-red-50 border-red-200";
    } else {
      // Risk scores (higher = worse)
      if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
      if (score >= 40) return "text-orange-600 bg-orange-50 border-orange-200";
      if (score >= 20) return "text-yellow-600 bg-yellow-50 border-yellow-200";
      return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getScoreLabel = () => {
    if (type === "trust") {
      if (score >= 80) return "Excellent";
      if (score >= 60) return "Good";
      if (score >= 40) return "Fair";
      return "Low";
    } else {
      if (score >= 70) return "High Risk";
      if (score >= 40) return "Medium Risk";
      if (score >= 20) return "Low Risk";
      return "Minimal Risk";
    }
  };

  const getIcon = () => {
    if (type === "trust") {
      if (score >= 80) return <CheckCircle className="h-4 w-4" />;
      if (score >= 40) return <Shield className="h-4 w-4" />;
      return <AlertTriangle className="h-4 w-4" />;
    } else {
      if (score >= 70) return <AlertTriangle className="h-4 w-4" />;
      if (score >= 40) return <Shield className="h-4 w-4" />;
      return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getTooltipText = () => {
    if (type === "trust") {
      return `Trust Score: ${score}/100 - Based on transaction history, reviews, and platform behavior`;
    } else {
      return `Risk Level: ${score}/100 - Based on fraud detection analysis`;
    }
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getScoreColor()} ${sizeClasses[size]} flex items-center gap-1.5 font-medium`}
          >
            {getIcon()}
            {showLabel && (
              <span>
                {getScoreLabel()} ({score})
              </span>
            )}
            {!showLabel && <span>{score}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
