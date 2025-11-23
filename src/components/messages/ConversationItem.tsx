import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useUnreadCount } from "@/hooks/useUnreadCount";

interface ConversationItemProps {
  conversation: {
    id: string;
    listing?: {
      title: string;
      seller_price: number;
    } | null;
    updated_at: string;
  };
  isSelected: boolean;
  otherUser: { 
    id: string;
    full_name: string;
  } | null;
  firstImage?: { image_url: string };
  currentUserId: string;
  onClick: () => void;
}

export const ConversationItem = ({
  conversation,
  isSelected,
  otherUser,
  firstImage,
  currentUserId,
  onClick,
}: ConversationItemProps) => {
  const { unreadCount } = useUnreadCount(conversation.id, currentUserId);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 transition-colors border-b border-border/20 ${
        isSelected 
          ? 'bg-muted/20 border-l-2 border-l-foreground' 
          : 'hover:bg-muted/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {firstImage && (
          <img
            src={firstImage.image_url}
            alt={conversation.listing?.title || "Item"}
            className="w-12 h-12 object-cover flex-shrink-0 border border-border/30"
            width="48"
            height="48"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">
              {conversation.listing?.title || 'Conversation'}
            </h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(conversation.updated_at), 'MMM d')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground truncate">
              {otherUser?.full_name || 'Unknown'}
            </p>
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 min-w-[20px] px-2 text-xs font-semibold bg-foreground text-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
