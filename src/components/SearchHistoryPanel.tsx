import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchHistoryItem {
  id: string;
  search_query: string;
  search_type: string;
  created_at: string;
}

interface SearchHistoryPanelProps {
  onSelectSearch: (query: string) => void;
  className?: string;
}

export const SearchHistoryPanel = ({ onSelectSearch, className }: SearchHistoryPanelProps) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const clearHistory = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setHistory([]);
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase
      .from("search_history")
      .delete()
      .eq("id", id);

    if (!error) {
      setHistory(history.filter(item => item.id !== id));
    }
  };

  if (!user || loading) return null;

  if (history.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No search history yet</p>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Recent Searches</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="h-8 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors cursor-pointer"
              onClick={() => onSelectSearch(item.search_query)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.search_query}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()} at{' '}
                  {new Date(item.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
