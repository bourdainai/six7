import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Lightbulb, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SentimentAnalysis {
  overall_sentiment: string;
  buyer_interest: string;
  deal_likelihood: number;
  insights: string[];
  recommendations: string[];
}

interface ConversationSentimentProps {
  conversationId: string;
  messages: Array<{ role: string; content: string }>;
}

export const ConversationSentiment = ({ conversationId, messages }: ConversationSentimentProps) => {
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const analyzeConversation = async () => {
      if (messages.length < 2) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('message-sentiment-analyzer', {
          body: { messages }
        });

        if (error) throw error;
        setAnalysis(data);
      } catch (error) {
        console.error('Error analyzing sentiment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(analyzeConversation, 2000);
    return () => clearTimeout(debounceTimeout);
  }, [messages]);

  if (!analysis || isLoading) return null;

  const getSentimentColor = (sentiment: string) => {
    if (sentiment.includes('positive')) return 'bg-green-500/10 text-green-700 border-green-200';
    if (sentiment.includes('negative') || sentiment.includes('frustrated')) {
      return 'bg-red-500/10 text-red-700 border-red-200';
    }
    return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
  };

  const getInterestColor = (interest: string) => {
    if (interest === 'high') return 'bg-green-500/10 text-green-700 border-green-200';
    if (interest === 'low') return 'bg-red-500/10 text-red-700 border-red-200';
    return 'bg-blue-500/10 text-blue-700 border-blue-200';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Conversation Insights</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={getSentimentColor(analysis.overall_sentiment)}>
          {analysis.overall_sentiment.replace('_', ' ')}
        </Badge>
        <Badge className={getInterestColor(analysis.buyer_interest)}>
          {analysis.buyer_interest} interest
        </Badge>
        <Badge variant="outline">
          <TrendingUp className="h-3 w-3 mr-1" />
          {analysis.deal_likelihood}% deal likelihood
        </Badge>
      </div>

      {analysis.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Key Insights:</p>
          <ul className="space-y-1">
            {analysis.insights.map((insight, index) => (
              <li key={index} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations:
          </p>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
