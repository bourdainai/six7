import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
}

interface MessageSearchProps {
  messages: Message[];
  currentUserId: string;
  onSelectMessage: (messageId: string) => void;
}

export const MessageSearch = ({ messages, currentUserId, onSelectMessage }: MessageSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredMessages = messages.filter((msg) =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="shrink-0"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-background border-b border-divider-gray p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-9"
            autoFocus
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {searchQuery && (
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => (
              <Card
                key={msg.id}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  onSelectMessage(msg.id);
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                <p className="text-sm line-clamp-2">{msg.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {msg.sender_id === currentUserId ? "You" : "Them"}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages found
            </p>
          )}
        </div>
      )}
    </div>
  );
};
