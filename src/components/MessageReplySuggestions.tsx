import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReplySuggestion {
  text: string;
  tone: string;
}

interface MessageReplySuggestionsProps {
  conversationId: string;
  userRole: 'buyer' | 'seller';
  onSelectSuggestion: (text: string) => void;
}

export const MessageReplySuggestions = ({ 
  conversationId, 
  userRole, 
  onSelectSuggestion 
}: MessageReplySuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('message-reply-helper', {
        body: { conversationId, userRole }
      });

      if (error) throw error;
      
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to generate reply suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={generateSuggestions}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Reply Suggestions
          </>
        )}
      </Button>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <Card
              key={index}
              className="p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onSelectSuggestion(suggestion.text)}
            >
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{suggestion.text}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {suggestion.tone} tone
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
