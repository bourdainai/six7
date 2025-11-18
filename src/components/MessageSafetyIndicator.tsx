import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SafetyAnalysis {
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  concerns: string[];
  reasoning: string;
  action_recommended: 'allow' | 'warn' | 'block' | 'review';
}

interface MessageSafetyIndicatorProps {
  message: string;
  onBlock?: () => void;
}

export const MessageSafetyIndicator = ({ message, onBlock }: MessageSafetyIndicatorProps) => {
  const [analysis, setAnalysis] = useState<SafetyAnalysis | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const scanMessage = async () => {
      if (message.trim().length < 10) return;

      setIsScanning(true);
      try {
        const { data, error } = await supabase.functions.invoke('message-safety-scanner', {
          body: { message }
        });

        if (error) throw error;
        setAnalysis(data);

        if (data.action_recommended === 'block' && onBlock) {
          onBlock();
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error scanning message:', error);
        }
      } finally {
        setIsScanning(false);
      }
    };

    const debounceTimeout = setTimeout(scanMessage, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [message]);

  if (!analysis || analysis.risk_level === 'safe') return null;

  const getAlertVariant = () => {
    if (analysis.risk_level === 'critical' || analysis.risk_level === 'high') {
      return 'destructive';
    }
    return 'default';
  };

  const getIcon = () => {
    if (analysis.risk_level === 'critical' || analysis.risk_level === 'high') {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (analysis.risk_level === 'medium') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  return (
    <Alert variant={getAlertVariant()} className="mb-4">
      {getIcon()}
      <AlertDescription>
        <p className="font-medium mb-1">Safety Alert: {analysis.risk_level.toUpperCase()}</p>
        {analysis.concerns.length > 0 && (
          <ul className="text-sm list-disc list-inside space-y-1">
            {analysis.concerns.map((concern, index) => (
              <li key={index}>{concern}</li>
            ))}
          </ul>
        )}
        {analysis.action_recommended === 'block' && (
          <p className="text-sm mt-2 font-medium">
            This message cannot be sent due to safety concerns.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};
