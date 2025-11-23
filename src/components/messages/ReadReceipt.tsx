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
        <CheckCheck className="h-3 w-3 text-background/40" />
      ) : (
        <Check className="h-3 w-3 text-background/40" />
      )}
    </span>
  );
};
