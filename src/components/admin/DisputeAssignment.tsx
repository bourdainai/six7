import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

interface DisputeAssignmentProps {
  disputeId: string;
  currentAssignee?: string;
}

export const DisputeAssignment = ({ disputeId, currentAssignee }: DisputeAssignmentProps) => {
  const [selectedUser, setSelectedUser] = useState<string>(currentAssignee || "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all moderators and admins
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, profiles(full_name, email)")
        .in("role", ["admin", "moderator"]);
      
      if (error) throw error;
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedTo: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("dispute_assignments")
        .upsert({
          dispute_id: disputeId,
          assigned_to: assignedTo,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        }, {
          onConflict: 'dispute_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputes"] });
      toast({
        title: "Success",
        description: "Dispute assigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedUser} onValueChange={setSelectedUser}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Assign to..." />
        </SelectTrigger>
        <SelectContent>
          {teamMembers?.map((member: any) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              {member.profiles?.full_name || member.profiles?.email} ({member.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={() => assignMutation.mutate(selectedUser)}
        disabled={!selectedUser || assignMutation.isPending}
      >
        Assign
      </Button>
    </div>
  );
};
