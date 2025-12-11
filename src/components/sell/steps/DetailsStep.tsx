import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHaptics } from "@/hooks/useHaptics";
import type { SellWizardState } from "@/hooks/useSellWizard";

const CONDITIONS = [
  { value: "mint", label: "Mint", description: "Perfect, no flaws" },
  { value: "near_mint", label: "Near Mint", description: "Minor imperfections" },
  { value: "excellent", label: "Excellent", description: "Light wear" },
  { value: "good", label: "Good", description: "Noticeable wear" },
  { value: "played", label: "Played", description: "Heavy wear" },
  { value: "damaged", label: "Damaged", description: "Significant damage" },
] as const;

const GRADING_SERVICES = ["PSA", "BGS", "CGC", "ACE", "Other"] as const;

interface DetailsStepProps {
  wizard: SellWizardState;
}

interface PriceSuggestion {
  price: number;
  low: number;
  high: number;
  confidence: "high" | "medium" | "low";
}

export function DetailsStep({ wizard }: DetailsStepProps) {
  const { toast } = useToast();
  const haptics = useHaptics();
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [isGettingPrice, setIsGettingPrice] = useState(false);

  const { draft, updateDraft } = wizard;

  // Haptic-enhanced update
  const handleConditionSelect = useCallback((value: string) => {
    haptics.selection();
    updateDraft({ condition: value as any });
  }, [updateDraft, haptics]);

  const handleToggle = useCallback((field: string, value: boolean) => {
    haptics.light();
    updateDraft({ [field]: value } as any);
  }, [updateDraft, haptics]);

  const handleGetPriceSuggestion = useCallback(async () => {
    if (!draft.card && !draft.images.length) {
      haptics.warning();
      toast({
        title: "Add card info first",
        description: "Go back and add photos or search for your card",
        variant: "destructive",
      });
      return;
    }

    haptics.impact();
    setIsGettingPrice(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-price-suggestion", {
        body: {
          card_name: draft.card?.name,
          set_name: draft.card?.setName,
          card_number: draft.card?.cardNumber,
          rarity: draft.card?.rarity,
          condition: draft.condition,
          is_graded: draft.isGraded,
          grading_service: draft.gradingService,
          grading_score: draft.gradingScore,
        },
      });

      if (error) throw error;

      if (data?.suggested_price || data?.market_price) {
        const price = data.suggested_price || data.market_price;
        // Convert USD to GBP roughly (API returns USD)
        const gbpPrice = price * 0.79;
        const suggestion: PriceSuggestion = {
          price: Math.round(gbpPrice * 100) / 100,
          low: Math.round((data.price_low || price * 0.8) * 0.79 * 100) / 100,
          high: Math.round((data.price_high || price * 1.2) * 0.79 * 100) / 100,
          confidence: data.confidence || "medium",
        };
        haptics.success();
        setPriceSuggestion(suggestion);
      } else if (draft.card?.marketPrice) {
        // Use card's market price as fallback
        haptics.medium();
        setPriceSuggestion({
          price: draft.card.marketPrice,
          low: draft.card.marketPrice * 0.85,
          high: draft.card.marketPrice * 1.15,
          confidence: "medium",
        });
      } else {
        haptics.warning();
        toast({
          title: "No price data",
          description: "Enter your price manually",
        });
      }
    } catch (error) {
      logger.error("Price suggestion error", error);
      // Fall back to card's market price if available
      if (draft.card?.marketPrice) {
        haptics.medium();
        setPriceSuggestion({
          price: draft.card.marketPrice,
          low: draft.card.marketPrice * 0.85,
          high: draft.card.marketPrice * 1.15,
          confidence: "low",
        });
      } else {
        haptics.error();
        toast({
          title: "Couldn't get price",
          description: "Enter your price manually",
          variant: "destructive",
        });
      }
    } finally {
      setIsGettingPrice(false);
    }
  }, [draft, toast, haptics]);

  const applyPrice = useCallback((price: number) => {
    haptics.success();
    updateDraft({ price });
  }, [updateDraft, haptics]);

  // Calculate price confidence indicator
  const getPriceIndicator = () => {
    if (!priceSuggestion || !draft.price) return null;

    const price = Number(draft.price);
    const { low, high, price: suggested } = priceSuggestion;

    if (price < low) {
      return { icon: TrendingDown, color: "text-yellow-500", label: "Below market - may sell fast!" };
    } else if (price > high) {
      return { icon: TrendingUp, color: "text-orange-500", label: "Above market - may take longer" };
    } else {
      return { icon: Minus, color: "text-green-500", label: "Competitive price" };
    }
  };

  const priceIndicator = getPriceIndicator();

  return (
    <div className="p-4 space-y-6">
      {/* Condition Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Condition</Label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((condition) => {
            const isSelected = draft.condition === condition.value;
            return (
              <button
                key={condition.value}
                onClick={() => handleConditionSelect(condition.value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{condition.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {condition.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Graded Toggle */}
      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Professionally graded</Label>
          <p className="text-xs text-muted-foreground">PSA, BGS, CGC, etc.</p>
        </div>
        <Switch
          checked={draft.isGraded}
          onCheckedChange={(checked) => handleToggle('isGraded', checked)}
        />
      </div>

      {/* Grading Details */}
      {draft.isGraded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="space-y-2">
            <Label>Grading Service</Label>
            <Select
              value={draft.gradingService}
              onValueChange={(value) => updateDraft({ gradingService: value })}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {GRADING_SERVICES.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grade Score</Label>
            <Input
              placeholder="e.g. 10, 9.5"
              value={draft.gradingScore}
              onChange={(e) => updateDraft({ gradingScore: e.target.value })}
              className="h-11"
            />
          </div>
        </motion.div>
      )}

      {/* Pricing Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Your Price</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetPriceSuggestion}
            disabled={isGettingPrice}
            className="text-primary"
          >
            {isGettingPrice ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-4 w-4" />
                Get suggestion
              </>
            )}
          </Button>
        </div>

        {/* Price Suggestion Card */}
        {priceSuggestion && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Suggested price</span>
                <span className="text-xs text-muted-foreground">
                  {priceSuggestion.confidence} confidence
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-semibold">
                  £{priceSuggestion.price.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">
                  £{priceSuggestion.low.toFixed(2)} – £{priceSuggestion.high.toFixed(2)}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPrice(priceSuggestion.price)}
                className="w-full"
              >
                Use suggested price
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Price Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
            £
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={draft.price}
            onChange={(e) => updateDraft({ price: e.target.value ? Number(e.target.value) : "" })}
            className="h-14 pl-8 text-xl font-semibold"
          />
        </div>

        {/* Price Indicator */}
        {priceIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex items-center gap-2 text-sm", priceIndicator.color)}
          >
            <priceIndicator.icon className="h-4 w-4" />
            {priceIndicator.label}
          </motion.div>
        )}
      </div>

      {/* Accept Offers Toggle */}
      <div className="flex items-center justify-between py-3 border-t">
        <div>
          <Label className="text-sm font-medium">Accept offers</Label>
          <p className="text-xs text-muted-foreground">Let buyers make offers</p>
        </div>
        <Switch
          checked={draft.acceptsOffers}
          onCheckedChange={(checked) => handleToggle('acceptsOffers', checked)}
        />
      </div>

      {/* Optional Description */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">
          Description (optional)
        </Label>
        <Textarea
          placeholder="Add any extra details about your card..."
          value={draft.description}
          onChange={(e) => updateDraft({ description: e.target.value })}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
