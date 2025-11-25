import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, EyeOff, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface AgentFeedbackButtonsProps {
  listingId: string;
  compact?: boolean;
}

export const AgentFeedbackButtons = ({ 
  listingId, 
  compact = false 
}: AgentFeedbackButtonsProps) => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleFeedback = async (feedbackType: string) => {
    try {
      const { error } = await supabase.functions.invoke('buyer-agent-learn', {
        body: {
          listingId,
          feedbackType,
        },
      });

      if (error) throw error;

      setFeedback(feedbackType);
      
      const messages = {
        liked: "Thanks! We'll show you more like this",
        saved: "Saved! We'll prioritize similar items",
        hidden: "Got it! We'll show fewer like this",
      };

      toast({
        title: messages[feedbackType as keyof typeof messages] || "Feedback recorded",
        description: "Your preferences have been updated",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        logger.error('Error recording feedback:', error);
      }
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive",
      });
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={feedback === 'liked' ? 'default' : 'ghost'}
          onClick={() => handleFeedback('liked')}
          disabled={!!feedback}
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant={feedback === 'hidden' ? 'default' : 'ghost'}
          onClick={() => handleFeedback('hidden')}
          disabled={!!feedback}
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={feedback === 'liked' ? 'default' : 'outline'}
        onClick={() => handleFeedback('liked')}
        disabled={!!feedback}
        className="flex-1"
      >
        <ThumbsUp className="w-4 h-4 mr-2" />
        Like This
      </Button>
      <Button
        size="sm"
        variant={feedback === 'saved' ? 'default' : 'outline'}
        onClick={() => handleFeedback('saved')}
        disabled={!!feedback}
        className="flex-1"
      >
        <Heart className="w-4 h-4 mr-2" />
        Love It
      </Button>
      <Button
        size="sm"
        variant={feedback === 'hidden' ? 'secondary' : 'outline'}
        onClick={() => handleFeedback('hidden')}
        disabled={!!feedback}
      >
        <EyeOff className="w-4 h-4 mr-2" />
        Not for Me
      </Button>
    </div>
  );
};
