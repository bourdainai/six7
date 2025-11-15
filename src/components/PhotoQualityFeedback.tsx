import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Camera, Sun, Eye } from "lucide-react";

interface QualityScore {
  overall_quality: number;
  lighting: number;
  angle: number;
  background: number;
  clarity: number;
}

interface PhotoQualityFeedbackProps {
  quality?: QualityScore;
  stockPhoto?: boolean;
  advice?: string[];
  imageIndex?: number;
}

export const PhotoQualityFeedback = ({ 
  quality, 
  stockPhoto, 
  advice,
  imageIndex = 0 
}: PhotoQualityFeedbackProps) => {
  if (!quality) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  return (
    <Card className="p-4 space-y-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Photo {imageIndex + 1} Quality
        </h3>
        {stockPhoto && (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Stock Photo Detected
          </Badge>
        )}
      </div>

      {/* Overall Score */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Overall Quality</span>
          <span className={`text-sm font-bold ${getScoreColor(quality.overall_quality)}`}>
            {quality.overall_quality}/100 - {getScoreLabel(quality.overall_quality)}
          </span>
        </div>
        <Progress value={quality.overall_quality} className="h-2" />
      </div>

      {/* Detailed Scores */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sun className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Lighting</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={quality.lighting} className="h-1 flex-1" />
            <span className={`font-medium ${getScoreColor(quality.lighting)}`}>
              {quality.lighting}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Camera className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Angle</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={quality.angle} className="h-1 flex-1" />
            <span className={`font-medium ${getScoreColor(quality.angle)}`}>
              {quality.angle}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Clarity</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={quality.clarity} className="h-1 flex-1" />
            <span className={`font-medium ${getScoreColor(quality.clarity)}`}>
              {quality.clarity}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Background</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={quality.background} className="h-1 flex-1" />
            <span className={`font-medium ${getScoreColor(quality.background)}`}>
              {quality.background}
            </span>
          </div>
        </div>
      </div>

      {/* Photo Advice */}
      {advice && advice.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">💡 Tips to improve:</p>
          <ul className="text-xs space-y-1">
            {advice.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
