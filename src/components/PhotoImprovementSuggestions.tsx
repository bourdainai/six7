import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PhotoImprovementSuggestionsProps {
  listingId: string;
}

const priorityConfig = {
  high: {
    icon: AlertCircle,
    color: 'text-red-600',
    badgeColor: 'destructive',
  },
  medium: {
    icon: Info,
    color: 'text-orange-600',
    badgeColor: 'default',
  },
  low: {
    icon: CheckCircle,
    color: 'text-blue-600',
    badgeColor: 'secondary',
  },
};

export const PhotoImprovementSuggestions = ({ listingId }: PhotoImprovementSuggestionsProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['photo-advice', listingId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('seller-copilot-photo-advisor', {
        body: { listingId }
      });
      
      if (error) throw error;
      return data?.data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Photo Quality</h3>
        </div>
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (!data || data.advice.length === 0) {
    return (
      <Card className="p-4 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-900 dark:text-green-100">
              Excellent Photo Quality!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Score: {data.overall_score}/100 • {data.photo_count} photos
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const scoreColor = data.overall_score >= 80 ? 'text-green-600' : 
                     data.overall_score >= 60 ? 'text-orange-600' : 'text-red-600';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Photo Quality</h3>
        </div>
        <Badge variant="outline" className={scoreColor}>
          {data.overall_score}/100
        </Badge>
      </div>

      <div className="space-y-3">
        {data.advice.map((advice: any, idx: number) => {
          const config = priorityConfig[advice.priority as keyof typeof priorityConfig];
          const Icon = config.icon;

          return (
            <div
              key={idx}
              className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{advice.title}</h4>
                    <Badge variant={config.badgeColor as any} className="text-xs">
                      {advice.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {advice.message}
                  </p>

                  {advice.missing_angles && advice.missing_angles.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Missing angles: {advice.missing_angles.join(', ')}
                    </div>
                  )}

                  {advice.missing_shots && advice.missing_shots.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Suggested shots: {advice.missing_shots.join(', ')}
                    </div>
                  )}

                  {advice.recommendations && Array.isArray(advice.recommendations) && (
                    <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                      {advice.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {advice.recommendation && (
                    <p className="text-xs text-primary mt-2 italic">
                      💡 {advice.recommendation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">
          Current: {data.photo_count} photo{data.photo_count !== 1 ? 's' : ''} • 
          Avg quality: {data.average_quality}/100
        </p>
        <Button size="sm" variant="outline" className="w-full">
          Add More Photos
        </Button>
      </div>
    </Card>
  );
};
