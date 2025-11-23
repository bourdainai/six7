import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  existingReactions?: Record<string, string[]>;
}

export const MessageReactions = ({
  messageId,
  currentUserId,
  existingReactions = {},
}: MessageReactionsProps) => {
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>(
    REACTIONS.map((emoji) => ({
      emoji,
      count: existingReactions[emoji]?.length || 0,
      userReacted: existingReactions[emoji]?.includes(currentUserId) || false,
    }))
  );

  const handleReaction = async (emoji: string) => {
    try {
      const reaction = reactions.find((r) => r.emoji === emoji);
      if (!reaction) return;

      const newReactions = { ...existingReactions };
      
      if (reaction.userReacted) {
        // Remove reaction
        newReactions[emoji] = (newReactions[emoji] || []).filter((id) => id !== currentUserId);
      } else {
        // Add reaction
        newReactions[emoji] = [...(newReactions[emoji] || []), currentUserId];
      }

      const { error } = await supabase
        .from("messages")
        .update({
          metadata: {
            reactions: newReactions,
          },
        })
        .eq("id", messageId);

      if (error) throw error;

      setReactions(
        REACTIONS.map((e) => ({
          emoji: e,
          count: newReactions[e]?.length || 0,
          userReacted: newReactions[e]?.includes(currentUserId) || false,
        }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    }
  };

  const displayedReactions = reactions.filter((r) => r.count > 0);

  return (
    <div className="flex items-center gap-1 mt-1">
      {displayedReactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={`h-6 px-2 text-xs ${
            reaction.userReacted ? "bg-primary/10 border border-primary/20" : ""
          }`}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span>{reaction.emoji}</span>
          <span className="ml-1">{reaction.count}</span>
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg hover:bg-accent"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
