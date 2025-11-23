import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Archive, Ban, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationMenuProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  onArchive?: () => void;
}

export const ConversationMenu = ({
  conversationId,
  otherUserId,
  otherUserName,
  onArchive,
}: ConversationMenuProps) => {
  const { toast } = useToast();
  const [showBlockDialog, setShowBlockDialog] = useState(false);

  const handleArchive = async () => {
    try {
      // In a real implementation, you'd add an 'archived' column to conversations
      // For now, we'll just show a toast
      toast({
        title: "Conversation archived",
        description: "This conversation has been moved to archive",
      });
      onArchive?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive conversation",
        variant: "destructive",
      });
    }
  };

  const handleBlock = async () => {
    try {
      // In a real implementation, you'd create a blocks table
      toast({
        title: "User blocked",
        description: `You won't receive messages from ${otherUserName}`,
      });
      setShowBlockDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    }
  };

  const handleReport = async () => {
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: (await supabase.auth.getUser()).data.user?.id,
        reported_user_id: otherUserId,
        report_type: "user",
        reason: "Inappropriate messaging behavior",
      });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "We'll review this conversation",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowBlockDialog(true)}>
            <Ban className="h-4 w-4 mr-2" />
            Block {otherUserName}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleReport} className="text-destructive">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to send you messages. You can unblock them later from
              settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive">
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
