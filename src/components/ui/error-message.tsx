import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  showHomeButton?: boolean;
  suggestion?: string;
}

export function ErrorMessage({
  title = "Something went wrong",
  message,
  actionLabel = "Try Again",
  onAction,
  showHomeButton = false,
  suggestion,
}: ErrorMessageProps) {
  // Map common technical errors to user-friendly messages
  const getUserFriendlyMessage = (msg: string) => {
    if (msg.includes("Network")) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    if (msg.includes("timeout")) {
      return "The request took too long. Please try again.";
    }
    if (msg.includes("authentication") || msg.includes("unauthorized")) {
      return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("not found") || msg.includes("404")) {
      return "The requested item could not be found. It may have been removed or sold.";
    }
    if (msg.includes("insufficient")) {
      return "Insufficient balance. Please top up your wallet or use another payment method.";
    }
    if (msg.includes("already")) {
      return "This item is no longer available. It may have already been purchased.";
    }
    return msg;
  };

  const displayMessage = getUserFriendlyMessage(message);

  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{displayMessage}</p>
        
        {suggestion && (
          <p className="text-sm text-muted-foreground">
            💡 {suggestion}
          </p>
        )}
        
        <div className="flex gap-2 mt-4">
          {onAction && (
            <Button onClick={onAction} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          )}
          {showHomeButton && (
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              size="sm"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
