import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, MessageSquare, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const UserActivityTable = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-user-metrics", {
        method: "GET"
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const users = data?.users || [];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent User Activity</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.full_name || 'Anonymous'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.last_city && user.last_country ? (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {user.last_city}, {user.last_country}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Unknown</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.last_activity ? (
                    <div className="text-sm">
                      <Badge variant="outline" className="text-xs">
                        {user.last_activity_type}
                      </Badge>
                      <div className="text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No activity</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {user.listing_count}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    {user.message_count}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
