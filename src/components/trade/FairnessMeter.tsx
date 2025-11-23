import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Minus, TrendingDown } from 'lucide-react';

interface FairnessMeterProps {
  score: number | null;
  myValue: number;
  theirValue: number;
  isLoading: boolean;
}

export function FairnessMeter({ score, myValue, theirValue, isLoading }: FairnessMeterProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Calculating fairness...</span>
        </div>
      </div>
    );
  }

  if (score === null) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Add cards or cash to see fairness score
        </p>
      </div>
    );
  }

  const getColorClass = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLabel = (score: number) => {
    if (score >= 90) return 'Very Fair';
    if (score >= 80) return 'Fair';
    if (score >= 70) return 'Slightly Unbalanced';
    if (score >= 60) return 'Unbalanced';
    return 'Very Unbalanced';
  };

  const getIcon = () => {
    const diff = myValue - theirValue;
    if (Math.abs(diff) < 5) return <Minus className="w-5 h-5" />;
    if (diff > 0) return <TrendingUp className="w-5 h-5" />;
    return <TrendingDown className="w-5 h-5" />;
  };

  const percentage = (myValue / theirValue) * 100;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Trade Fairness</span>
        <div className={`flex items-center gap-2 ${getColorClass(score)}`}>
          {getIcon()}
          <span className="text-2xl font-bold">{score}%</span>
        </div>
      </div>

      <Progress 
        value={Math.min(score, 100)} 
        className="h-3"
      />

      <div className="flex items-center justify-between text-sm">
        <span className={getColorClass(score)}>{getLabel(score)}</span>
        <span className="text-muted-foreground">
          {percentage.toFixed(0)}% of requested value
        </span>
      </div>

      {score < 80 && (
        <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
          💡 Tip: {score < 60 
            ? 'Consider adding more value to make this trade more appealing'
            : 'This trade might be accepted, but consider adjusting slightly'
          }
        </div>
      )}
    </div>
  );
}
