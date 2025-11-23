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
      className={`w-full text-left p-3 rounded-xl transition-all ${
        isSelected 
          ? 'bg-primary/5 border border-primary/30 shadow-sm' 
          : 'hover:bg-muted/50 border border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {firstImage && (
          <img
            src={firstImage.image_url}
            alt={conversation.listing?.title || "Item"}
            className="w-14 h-14 object-cover rounded-lg border border-border/50 flex-shrink-0"
            width="56"
            height="56"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
              {conversation.listing?.title || 'Conversation'}
            </h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground truncate">
              {otherUser?.full_name || 'Unknown'}
            </p>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full h-5 min-w-[20px] px-2 text-xs font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
