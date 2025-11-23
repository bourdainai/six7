import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  isSent: boolean;
  isRead: boolean;
  readAt?: string | null;
}

export const ReadReceipt = ({ isSent, isRead, readAt }: ReadReceiptProps) => {
  if (!isSent) return null;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {isRead ? (
        <CheckCheck className={`h-3 w-3 ${readAt ? 'text-blue-500' : 'text-muted-foreground'}`} />
      ) : (
        <Check className="h-3 w-3 text-muted-foreground" />
      )}
    </span>
  );
};
