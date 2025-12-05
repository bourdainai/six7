import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Database,
  Image,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LiveCard {
  id: string;
  cardId: string;
  name: string;
  setName: string;
  setCode: string;
  number: string;
  imageUrl: string | null;
  hasImages: boolean;
  hasPricing: boolean;
  hasMetadata: boolean;
  timestamp: Date;
}

interface ImportStats {
  totalCards: number;
  cardsThisSession: number;
  currentSet: string | null;
  isActive: boolean;
  lastActivityTime: Date | null;
  fieldStats: {
    withImages: number;
    withPricing: number;
    withMetadata: number;
  };
}

export function ImportActivityDashboard() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [liveCards, setLiveCards] = useState<LiveCard[]>([]);
  const [stats, setStats] = useState<ImportStats>({
    totalCards: 0,
    cardsThisSession: 0,
    currentSet: null,
    isActive: false,
    lastActivityTime: null,
    fieldStats: {
      withImages: 0,
      withPricing: 0,
      withMetadata: 0,
    },
  });

  // Fetch initial total count
  const fetchTotalCount = useCallback(async () => {
    const { count } = await supabase
      .from("pokemon_card_attributes")
      .select("*", { count: "exact", head: true });
    
    setStats(prev => ({ ...prev, totalCards: count || 0 }));
  }, []);

  // Check for activity timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => {
        if (prev.lastActivityTime) {
          const timeSince = Date.now() - prev.lastActivityTime.getTime();
          if (timeSince > 10000) { // 10 seconds of no activity
            return { ...prev, isActive: false };
          }
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time inserts
  useEffect(() => {
    fetchTotalCount();

    const channel = supabase
      .channel("import-activity-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pokemon_card_attributes",
        },
        (payload) => {
          const newCard = payload.new as any;
          
          // Create live card entry
          const liveCard: LiveCard = {
            id: newCard.id || crypto.randomUUID(),
            cardId: newCard.card_id || "",
            name: newCard.name || "Unknown",
            setName: newCard.set_name || "Unknown Set",
            setCode: newCard.set_code || "",
            number: newCard.number || "",
            imageUrl: newCard.images?.small || newCard.images?.large || null,
            hasImages: !!(newCard.images?.small || newCard.images?.large),
            hasPricing: !!(newCard.tcgplayer_prices || newCard.cardmarket_prices),
            hasMetadata: !!(newCard.metadata?.hp || newCard.metadata?.types || newCard.metadata?.abilities),
            timestamp: new Date(),
          };

          // Update live cards feed (keep last 30)
          setLiveCards(prev => [liveCard, ...prev].slice(0, 30));

          // Update stats
          setStats(prev => ({
            ...prev,
            totalCards: prev.totalCards + 1,
            cardsThisSession: prev.cardsThisSession + 1,
            currentSet: newCard.set_name || prev.currentSet,
            isActive: true,
            lastActivityTime: new Date(),
            fieldStats: {
              withImages: prev.fieldStats.withImages + (liveCard.hasImages ? 1 : 0),
              withPricing: prev.fieldStats.withPricing + (liveCard.hasPricing ? 1 : 0),
              withMetadata: prev.fieldStats.withMetadata + (liveCard.hasMetadata ? 1 : 0),
            },
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pokemon_card_attributes",
        },
        (payload) => {
          const updatedCard = payload.new as any;
          
          // Show update in feed
          const liveCard: LiveCard = {
            id: updatedCard.id || crypto.randomUUID(),
            cardId: updatedCard.card_id || "",
            name: `${updatedCard.name || "Unknown"} (updated)`,
            setName: updatedCard.set_name || "Unknown Set",
            setCode: updatedCard.set_code || "",
            number: updatedCard.number || "",
            imageUrl: updatedCard.images?.small || updatedCard.images?.large || null,
            hasImages: !!(updatedCard.images?.small || updatedCard.images?.large),
            hasPricing: !!(updatedCard.tcgplayer_prices || updatedCard.cardmarket_prices),
            hasMetadata: !!(updatedCard.metadata?.hp || updatedCard.metadata?.types),
            timestamp: new Date(),
          };

          setLiveCards(prev => [liveCard, ...prev].slice(0, 30));
          setStats(prev => ({
            ...prev,
            isActive: true,
            lastActivityTime: new Date(),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTotalCount]);

  // Reset session stats
  const resetSession = useCallback(() => {
    setStats(prev => ({
      ...prev,
      cardsThisSession: 0,
      fieldStats: { withImages: 0, withPricing: 0, withMetadata: 0 },
    }));
    setLiveCards([]);
  }, []);

  // Calculate field percentages
  const imagesPct = stats.cardsThisSession > 0 
    ? Math.round((stats.fieldStats.withImages / stats.cardsThisSession) * 100) 
    : 0;
  const pricingPct = stats.cardsThisSession > 0 
    ? Math.round((stats.fieldStats.withPricing / stats.cardsThisSession) * 100) 
    : 0;
  const metadataPct = stats.cardsThisSession > 0 
    ? Math.round((stats.fieldStats.withMetadata / stats.cardsThisSession) * 100) 
    : 0;

  // No activity state
  if (!stats.isActive && stats.cardsThisSession === 0) {
    return (
      <Alert className="mb-6 border-muted bg-muted/30">
        <Database className="h-4 w-4" />
        <AlertTitle>No Active Import</AlertTitle>
        <AlertDescription>
          Click "Import" on a set below to start importing cards. Real-time updates will appear here as cards are added to the database.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`mb-6 border-2 ${stats.isActive ? "border-green-500/50 bg-gradient-to-r from-green-500/5 to-transparent" : "border-muted"}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.isActive ? "bg-green-500/20" : "bg-muted"}`}>
                {stats.isActive ? (
                  <Zap className="h-5 w-5 text-green-500 animate-pulse" />
                ) : (
                  <Database className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {stats.isActive ? "Import Active" : "Import Session Complete"}
                  {stats.isActive && (
                    <Badge className="bg-green-500 animate-pulse">
                      <Activity className="h-3 w-3 mr-1" />
                      LIVE
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {stats.currentSet ? `Current: ${stats.currentSet}` : "Watching for card imports"}
                  {stats.isActive && " • Cards appearing in real-time"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetSession}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats.cardsThisSession.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Cards This Session</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">
                  {stats.totalCards.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total in Database</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {imagesPct}%
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Image className="h-3 w-3" /> With Images
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {pricingPct}%
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <DollarSign className="h-3 w-3" /> With Pricing
                </div>
              </div>
            </div>

            {/* Field Completion Bars */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Data Field Completion (This Session)</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <Image className="h-3 w-3 text-blue-500" /> Images
                    </span>
                    <span>{stats.fieldStats.withImages}/{stats.cardsThisSession}</span>
                  </div>
                  <Progress value={imagesPct} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-yellow-500" /> Pricing
                    </span>
                    <span>{stats.fieldStats.withPricing}/{stats.cardsThisSession}</span>
                  </div>
                  <Progress value={pricingPct} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-purple-500" /> Metadata
                    </span>
                    <span>{stats.fieldStats.withMetadata}/{stats.cardsThisSession}</span>
                  </div>
                  <Progress value={metadataPct} className="h-2" />
                </div>
              </div>
            </div>

            {/* Live Card Feed */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Live Card Feed
                {stats.isActive && (
                  <Loader2 className="h-3 w-3 animate-spin text-green-500" />
                )}
              </h4>
              <div className="max-h-64 overflow-y-auto border rounded-lg bg-muted/20">
                {liveCards.length > 0 ? (
                  <div className="divide-y">
                    {liveCards.map((card, idx) => (
                      <div
                        key={card.id}
                        className={`flex items-center gap-3 p-2 ${
                          idx === 0 ? "bg-green-500/10 animate-pulse" : ""
                        }`}
                      >
                        {/* Card Image */}
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-8 h-11 object-contain rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "";
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-11 bg-muted rounded flex items-center justify-center">
                            <Database className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}

                        {/* Card Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{card.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {card.setName} • #{card.number}
                          </div>
                        </div>

                        {/* Field Indicators */}
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={card.hasImages ? "default" : "outline"}
                            className={`text-xs px-1 ${card.hasImages ? "bg-blue-500" : ""}`}
                          >
                            <Image className="h-2.5 w-2.5" />
                          </Badge>
                          <Badge
                            variant={card.hasPricing ? "default" : "outline"}
                            className={`text-xs px-1 ${card.hasPricing ? "bg-yellow-500" : ""}`}
                          >
                            <DollarSign className="h-2.5 w-2.5" />
                          </Badge>
                          <Badge
                            variant={card.hasMetadata ? "default" : "outline"}
                            className={`text-xs px-1 ${card.hasMetadata ? "bg-purple-500" : ""}`}
                          >
                            <FileText className="h-2.5 w-2.5" />
                          </Badge>
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {card.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p>Waiting for cards to import...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Last Activity */}
            {stats.lastActivityTime && (
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last activity: {stats.lastActivityTime.toLocaleTimeString()}
                </div>
                {!stats.isActive && (
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                    Waiting for more activity...
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
