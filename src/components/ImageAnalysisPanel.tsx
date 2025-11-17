import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Package, Tag } from "lucide-react";

interface DamageDetected {
  type: string;
  severity: "minor" | "moderate" | "significant";
  confidence: number;
  location: string;
}

interface LogoDetected {
  brand: string;
  confidence: number;
  authentic_appearance: boolean;
}

interface LogoAnalysis {
  logos_detected: LogoDetected[];
  counterfeit_risk: number;
}

interface ImageAnalysisPanelProps {
  damageDetected?: DamageDetected[];
  logoAnalysis?: LogoAnalysis;
  condition?: string;
}

export const ImageAnalysisPanel = ({ 
  damageDetected, 
  logoAnalysis,
  condition 
}: ImageAnalysisPanelProps) => {
  const hasDamage = damageDetected && damageDetected.length > 0;
  const hasLogos = logoAnalysis?.logos_detected && logoAnalysis.logos_detected.length > 0;
  const counterftRisk = logoAnalysis?.counterfeit_risk || 0;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor": return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "moderate": return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      case "significant": return "bg-red-500/10 text-red-700 border-red-500/20";
      default: return "bg-muted";
    }
  };

  const getRiskLevel = (risk: number) => {
    if (risk >= 70) return { label: "High Risk", color: "destructive" };
    if (risk >= 40) return { label: "Medium Risk", color: "default" };
    return { label: "Low Risk", color: "secondary" };
  };

  return (
    <div className="space-y-4">
      {/* Counterfeit Risk Alert */}
      {counterftRisk > 40 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Authenticity Warning:</strong> AI detected potential counterfeit indicators 
            (Risk Score: {counterftRisk}/100). Please verify authenticity before listing.
          </AlertDescription>
        </Alert>
      )}

      {/* Logo Detection */}
      {hasLogos && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Brand Detection</h3>
          </div>
          
          <div className="space-y-2">
            {logoAnalysis.logos_detected.map((logo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{logo.brand}</span>
                  <span className="text-xs text-muted-foreground">
                    ({logo.confidence}% confident)
                  </span>
                </div>
                <Badge 
                  variant={logo.authentic_appearance ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {logo.authentic_appearance ? "Authentic appearance" : "Verify authenticity"}
                </Badge>
              </div>
            ))}
          </div>

          {counterftRisk > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">Counterfeit Risk</span>
              <Badge variant={getRiskLevel(counterftRisk).color as "destructive" | "default" | "secondary"}>
                {getRiskLevel(counterftRisk).label} ({counterftRisk}/100)
              </Badge>
            </div>
          )}
        </Card>
      )}

      {/* Damage Detection */}
      {hasDamage && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Condition Analysis</h3>
          </div>
          
          {condition && (
            <Badge variant="outline" className="mb-2">
              AI Estimated: {condition.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
            </Badge>
          )}

          <div className="space-y-2">
            {damageDetected.map((damage, idx) => (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border ${getSeverityColor(damage.severity)}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium">
                    {damage.type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {damage.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Location: {damage.location}
                </p>
                <p className="text-xs text-muted-foreground">
                  Confidence: {damage.confidence}%
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t">
            💡 Tip: Mention detected flaws in your description to build trust with buyers
          </p>
        </Card>
      )}

      {!hasDamage && !hasLogos && (
        <Card className="p-4 text-center text-sm text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No specific issues detected. Photos look good!
        </Card>
      )}
    </div>
  );
};
