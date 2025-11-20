import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface AIAnswerEnginesToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  showLabel?: boolean;
  compact?: boolean;
}

export const AIAnswerEnginesToggle: React.FC<AIAnswerEnginesToggleProps> = ({
  enabled,
  onChange,
  showLabel = true,
  compact = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'flex-row' : 'flex-col sm:flex-row'} ${compact ? '' : 'p-4 border rounded-lg bg-muted/30'}`}>
      <div className="flex items-center gap-2 flex-1">
        <Switch
          id="ai-answer-engines"
          checked={enabled}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-primary"
        />
        {showLabel && (
          <Label htmlFor="ai-answer-engines" className="text-sm font-medium cursor-pointer">
            Sell via AI Answer Engines
          </Label>
        )}
        {enabled && (
          <Badge variant="secondary" className="ml-2 text-xs">
            Enabled
          </Badge>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                When enabled, AI agents (ChatGPT, Claude, etc.) can discover and purchase this item
                through the ACP and MCP protocols. This expands your reach to automated buyers.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground mt-1 sm:mt-0">
          Allow AI agents to discover and purchase this item
        </p>
      )}
    </div>
  );
};

