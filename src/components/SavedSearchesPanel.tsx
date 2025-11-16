import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: any;
  created_at: string;
}

interface SavedSearchesPanelProps {
  currentQuery: string;
  currentFilters: any;
  onSelectSearch: (query: string, filters: any) => void;
  className?: string;
}

export const SavedSearchesPanel = ({
  currentQuery,
  currentFilters,
  onSelectSearch,
  className,
}: SavedSearchesPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [newSearchName, setNewSearchName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  const fetchSavedSearches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSearches(data);
    }
  };

  const saveCurrentSearch = async () => {
    if (!user || !newSearchName.trim()) return;

    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name: newSearchName.trim(),
      query: currentQuery,
      filters: currentFilters,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save search",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Search saved",
        description: `"${newSearchName}" has been saved`,
      });
      setNewSearchName("");
      setDialogOpen(false);
      fetchSavedSearches();
    }
  };

  const deleteSearch = async (id: string) => {
    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (!error) {
      setSearches(searches.filter((s) => s.id !== id));
      toast({
        title: "Search deleted",
      });
    }
  };

  if (!user) return null;

  return (
    <div className={cn("border rounded-lg bg-card", className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Saved Searches</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search Name</label>
                <Input
                  placeholder="e.g., Vintage Nike Sneakers under £100"
                  value={newSearchName}
                  onChange={(e) => setNewSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveCurrentSearch()}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Current query: <span className="font-medium">{currentQuery || "None"}</span></p>
              </div>
              <Button onClick={saveCurrentSearch} className="w-full">
                Save Search
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-2">
          {searches.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No saved searches yet</p>
            </div>
          ) : (
            searches.map((search) => (
              <div
                key={search.id}
                className="group flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors cursor-pointer"
                onClick={() => onSelectSearch(search.query, search.filters)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{search.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {search.query}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSearch(search.id);
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
