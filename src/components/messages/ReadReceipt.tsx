import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  isSent: boolean;
  isRead: boolean;
  readAt?: string | null;
}

export const ReadReceipt = ({ isSent, isRead, readAt }: ReadReceiptProps) => {
  if (!isSent) return null;

  return (
    <span className="inline-flex items-center">
      {isRead ? (
        <CheckCheck className={`h-3.5 w-3.5 ${readAt ? 'text-blue-500' : 'text-primary-foreground/60'}`} />
      ) : (
        <Check className="h-3.5 w-3.5 text-primary-foreground/60" />
      )}
    </span>
  );
};
