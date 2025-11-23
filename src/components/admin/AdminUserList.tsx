import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AdminUserListProps {
  onSelectUser: (userId: string, userName: string) => void;
  currentUserId?: string;
}

export function AdminUserList({ onSelectUser, currentUserId }: AdminUserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, created_at")
        .neq("id", currentUserId || "") // Exclude current admin user
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filteredUsers?.map((user) => (
          <Card
            key={user.id}
            className="p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onSelectUser(user.id, user.full_name || user.email || "User")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.full_name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {user.id.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredUsers?.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No users found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
}
