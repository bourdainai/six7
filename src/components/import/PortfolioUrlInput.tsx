import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImportProgress } from "./ImportProgress";
import { ImportSummary } from "./ImportSummary";

interface PortfolioUrlInputProps {
  onClose: () => void;
}

export function PortfolioUrlInput({ onClose }: PortfolioUrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<{ success: number; failed: number } | null>(null);
  const { toast } = useToast();

  const validateUrl = (input: string): boolean => {
    return input.includes("app.getcollectr.com/showcase/profile/");
  };

  const processImport = async () => {
    if (!url || !validateUrl(url)) {
      setError("Please enter a valid Collectr portfolio URL");
      return;
    }

    setImporting(true);
    setError(null);
    setSummary(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call edge function to fetch and process portfolio
      const { data, error: functionError } = await supabase.functions.invoke(
        "import-collectr-portfolio",
        {
          body: { portfolioUrl: url }
        }
      );

      if (functionError) throw functionError;

      if (data.success) {
        setSummary({ 
          success: data.imported || 0, 
          failed: data.failed || 0 
        });
        toast({
          title: "Import complete",
          description: `Successfully imported ${data.imported} cards`
        });
      } else {
        throw new Error(data.error || "Import failed");
      }

    } catch (err) {
      console.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  if (summary) {
    return <ImportSummary success={summary.success} failed={summary.failed} onClose={onClose} />;
  }

  if (importing) {
    return <ImportProgress current={progress.current} total={progress.total} message="Fetching portfolio data..." />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Portfolio Showcase URL</label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">How to get your portfolio URL:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open Collectr app</li>
                    <li>Go to your Profile</li>
                    <li>Tap "Portfolio Sharing"</li>
                    <li>Copy the showcase URL</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    URL format: app.getcollectr.com/showcase/profile/...
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Input
          type="url"
          placeholder="https://app.getcollectr.com/showcase/profile/..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          className="font-mono text-sm"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
        <p className="font-medium">What happens next:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>We'll fetch your portfolio data from Collectr</li>
          <li>All cards will be imported as draft listings</li>
          <li>You can add photos and review before publishing</li>
          <li>This may take a minute for large collections</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={processImport} disabled={!url || importing} className="flex-1">
          Import Portfolio
        </Button>
      </div>
    </div>
  );
}
