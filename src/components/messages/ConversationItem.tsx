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
  otherUser: { full_name: string } | null;
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
      className={`w-full p-3 text-left transition-colors duration-fast border relative ${
        isSelected
          ? "bg-soft-neutral border-foreground"
          : "bg-background border-divider-gray hover:bg-soft-neutral"
      }`}
    >
      <div className="flex gap-3">
        {firstImage && (
          <img
            src={firstImage.image_url}
            alt={conversation.listing?.title || "Item"}
            className="w-12 h-12 object-cover border border-divider-gray"
            width="48"
            height="48"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-normal text-sm truncate tracking-tight">
              {conversation.listing?.title || "Untitled"}
            </p>
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate font-normal">
            {otherUser?.full_name || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground font-normal">
            {format(new Date(conversation.updated_at), "MMM d, h:mm a")}
          </p>
        </div>
      </div>
    </button>
  );
};
