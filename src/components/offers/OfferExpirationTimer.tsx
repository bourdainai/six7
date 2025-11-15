import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface OfferExpirationTimerProps {
  expiresAt: string | null;
  compact?: boolean;
}

export const OfferExpirationTimer = ({ expiresAt, compact = false }: OfferExpirationTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft("Expired");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;

  if (compact) {
    return (
      <Badge variant={isExpired ? "destructive" : "secondary"} className="text-xs">
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
      <Clock className="w-4 h-4" />
      <span>{isExpired ? 'Expired' : `Expires in ${timeLeft}`}</span>
    </div>
  );
};
