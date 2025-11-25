import { useState, useEffect } from "react";
import { useShipping, ShippingRate } from "@/hooks/useShipping";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Package, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { logger } from "@/lib/logger";

interface ShippingRateSelectorProps {
  toCountry: string;
  toPostalCode: string;
  toCity: string;
  weight: number;
  declaredValue?: number;
  onRateSelected: (rate: ShippingRate) => void;
  selectedRate?: ShippingRate;
}

export const ShippingRateSelector = ({
  toCountry,
  toPostalCode,
  toCity,
  weight,
  declaredValue,
  onRateSelected,
  selectedRate,
}: ShippingRateSelectorProps) => {
  const { getRates } = useShipping();
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRates = async () => {
      if (!toCountry || !toPostalCode || !toCity || !weight) return;

      setLoading(true);
      try {
        const fetchedRates = await getRates({
          toCountry,
          toPostalCode,
          toCity,
          weight,
          declaredValue,
        });
        setRates(fetchedRates);
        
        // Auto-select cheapest rate if none selected
        if (fetchedRates.length > 0 && !selectedRate) {
          onRateSelected(fetchedRates[0]);
        }
      } catch (error) {
        logger.error('Error fetching rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, [toCountry, toPostalCode, toCity, weight, declaredValue]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Calculating shipping rates...
          </span>
        </div>
      </Card>
    );
  }

  if (rates.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4" />
          <span className="text-sm">
            No shipping rates available for this destination
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          <h3 className="font-semibold">Select Shipping Method</h3>
        </div>

        <RadioGroup
          value={selectedRate?.carrierCode}
          onValueChange={(value) => {
            const rate = rates.find(r => r.carrierCode === value);
            if (rate) onRateSelected(rate);
          }}
        >
          <div className="space-y-3">
            {rates.map((rate) => (
              <div
                key={rate.carrierCode}
                className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedRate?.carrierCode === rate.carrierCode
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onRateSelected(rate)}
              >
                <RadioGroupItem value={rate.carrierCode} id={rate.carrierCode} />
                <Label
                  htmlFor={rate.carrierCode}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{rate.carrierName}</div>
                      <div className="text-sm text-muted-foreground">
                        {rate.serviceName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Est. delivery: {rate.estimatedDays} {rate.estimatedDays === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(rate.rate, rate.currency)}
                      </div>
                      {rate.rate === Math.min(...rates.map(r => r.rate)) && (
                        <div className="text-xs text-primary mt-1">
                          Cheapest
                        </div>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    </Card>
  );
};