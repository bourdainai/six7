import { motion } from "framer-motion";
import { Package, Truck, Gift, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SellWizardState } from "@/hooks/useSellWizard";

const SHIPPING_OPTIONS = [
  {
    value: 0,
    label: "Free Shipping",
    description: "You cover shipping costs",
    icon: Gift,
    popular: true,
  },
  {
    value: 1.50,
    label: "Standard Letter",
    description: "2-3 business days",
    icon: Package,
  },
  {
    value: 2.99,
    label: "Tracked Delivery",
    description: "1-2 business days, tracked",
    icon: Truck,
    recommended: true,
  },
] as const;

interface ShippingStepProps {
  wizard: SellWizardState;
}

export function ShippingStep({ wizard }: ShippingStepProps) {
  const { draft, updateDraft } = wizard;

  const handleSelectOption = (value: number) => {
    if (value === 0) {
      updateDraft({ freeShipping: true, shippingCost: 0 });
    } else {
      updateDraft({ freeShipping: false, shippingCost: value });
    }
  };

  const isCustomPrice = !SHIPPING_OPTIONS.some(
    opt => (opt.value === 0 && draft.freeShipping) ||
           (opt.value === draft.shippingCost && !draft.freeShipping)
  );

  return (
    <div className="p-4 space-y-6">
      {/* Shipping Info Card */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Shipping in the UK</p>
            <p className="text-sm text-muted-foreground">
              Cards are shipped in protective sleeves and toploaders.
              We recommend tracked shipping for cards over £20.
            </p>
          </div>
        </div>
      </div>

      {/* Shipping Options */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Choose shipping</Label>

        <div className="space-y-2">
          {SHIPPING_OPTIONS.map((option) => {
            const isSelected = option.value === 0
              ? draft.freeShipping
              : draft.shippingCost === option.value && !draft.freeShipping;

            return (
              <motion.button
                key={option.value}
                onClick={() => handleSelectOption(option.value)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}>
                    <option.icon className={cn(
                      "h-5 w-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      {option.popular && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                          Popular
                        </span>
                      )}
                      {option.recommended && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                          Recommended
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {option.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">
                      {option.value === 0 ? "Free" : `£${option.value.toFixed(2)}`}
                    </span>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}

          {/* Custom Price Option */}
          <button
            onClick={() => updateDraft({ freeShipping: false })}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              isCustomPrice
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">Custom price</span>
                <p className="text-sm text-muted-foreground">
                  Set your own shipping cost
                </p>
              </div>
              {isCustomPrice && <Check className="h-5 w-5 text-primary" />}
            </div>
          </button>
        </div>
      </div>

      {/* Custom Price Input */}
      {isCustomPrice && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="space-y-2"
        >
          <Label>Shipping cost (£)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              £
            </span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.shippingCost}
              onChange={(e) => updateDraft({ shippingCost: Number(e.target.value) || 0 })}
              className="h-11 pl-8"
              placeholder="0.00"
            />
          </div>
        </motion.div>
      )}

      {/* AI Visibility Toggle */}
      <div className="pt-4 border-t">
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div className="flex-1">
            <Label className="text-base font-medium">AI Discovery</Label>
            <p className="text-sm text-muted-foreground">
              Let AI assistants (ChatGPT, Claude) find and recommend your listing
            </p>
          </div>
          <Switch
            checked={draft.aiEnabled}
            onCheckedChange={(checked) => updateDraft({ aiEnabled: checked })}
          />
        </div>
      </div>
    </div>
  );
}
