import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface FraudAlertBannerProps {
  type: "warning" | "danger";
  title: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const FraudAlertBanner = ({
  type,
  title,
  message,
  dismissible = true,
  onDismiss
}: FraudAlertBannerProps) => {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  const variantClass = type === "danger" 
    ? "border-red-500 bg-red-50 text-red-900"
    : "border-orange-500 bg-orange-50 text-orange-900";

  return (
    <Alert className={`${variantClass} relative`}>
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
      </AlertDescription>
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  );
};
