import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, ArrowRight, Percent, PiggyBank } from "lucide-react";

// Fee configuration matching the Edge Function
const FEE_CONFIG: Record<string, { baseFee: number; percentThreshold: number; percentRate: number; symbol: string; name: string }> = {
  GBP: { baseFee: 0.40, percentThreshold: 20, percentRate: 0.01, symbol: "£", name: "British Pound" },
  USD: { baseFee: 0.50, percentThreshold: 25, percentRate: 0.01, symbol: "$", name: "US Dollar" },
  EUR: { baseFee: 0.45, percentThreshold: 22, percentRate: 0.01, symbol: "€", name: "Euro" },
};

interface FeeBreakdown {
  baseFee: number;
  percentageFee: number;
  total: number;
}

function calculateTieredFee(itemPrice: number, currency: string): FeeBreakdown {
  const config = FEE_CONFIG[currency] || FEE_CONFIG.GBP;
  
  const baseFee = config.baseFee;
  let percentageFee = 0;
  
  if (itemPrice > config.percentThreshold) {
    const amountOverThreshold = itemPrice - config.percentThreshold;
    percentageFee = amountOverThreshold * config.percentRate;
  }
  
  const total = baseFee + percentageFee;
  
  return {
    baseFee: Math.round(baseFee * 100) / 100,
    percentageFee: Math.round(percentageFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

interface FeeCalculatorProps {
  initialPrice?: number;
  initialCurrency?: string;
  showComparison?: boolean;
  compact?: boolean;
}

export function FeeCalculator({ 
  initialPrice = 10, 
  initialCurrency = "GBP",
  showComparison = true,
  compact = false 
}: FeeCalculatorProps) {
  const [itemPrice, setItemPrice] = useState(initialPrice);
  const [currency, setCurrency] = useState(initialCurrency);
  
  const config = FEE_CONFIG[currency] || FEE_CONFIG.GBP;
  const symbol = config.symbol;
  
  const buyerFee = useMemo(() => calculateTieredFee(itemPrice, currency), [itemPrice, currency]);
  const sellerFee = useMemo(() => calculateTieredFee(itemPrice, currency), [itemPrice, currency]);
  
  const totalBuyerPays = itemPrice + buyerFee.total;
  const totalSellerReceives = itemPrice - sellerFee.total;
  const platformRevenue = buyerFee.total + sellerFee.total;
  
  // Competitor fee calculations for comparison
  const competitors = useMemo(() => {
    const ebayFee = itemPrice * 0.128 + 0.30; // 12.8% + 30p
    const vintedBuyerFee = itemPrice * 0.05 + 0.70; // 5% + 70p buyer fee
    const cardmarketFee = itemPrice * 0.05; // 5% seller fee
    
    return {
      ebay: { sellerFee: ebayFee, buyerFee: 0, total: ebayFee },
      vinted: { sellerFee: 0, buyerFee: vintedBuyerFee, total: vintedBuyerFee },
      cardmarket: { sellerFee: cardmarketFee, buyerFee: 0, total: cardmarketFee },
      sixseven: { sellerFee: sellerFee.total, buyerFee: buyerFee.total, total: platformRevenue },
    };
  }, [itemPrice, buyerFee.total, sellerFee.total, platformRevenue]);
  
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={itemPrice}
            onChange={(e) => setItemPrice(Math.max(0, Number(e.target.value)))}
            className="w-24"
            min={0}
            step={0.01}
          />
          <span className="text-muted-foreground">{currency}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Buyer pays</p>
            <p className="font-medium">{symbol}{totalBuyerPays.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Seller receives</p>
            <p className="font-medium">{symbol}{totalSellerReceives.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Fee Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="price">Item Price</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-medium text-muted-foreground">{symbol}</span>
                <Input
                  id="price"
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(Math.max(0, Number(e.target.value)))}
                  className="text-2xl font-light h-14"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
            <div className="w-full sm:w-32">
              <Label>Currency</Label>
              <Tabs value={currency} onValueChange={setCurrency} className="mt-1">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="GBP">£</TabsTrigger>
                  <TabsTrigger value="USD">$</TabsTrigger>
                  <TabsTrigger value="EUR">€</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Results Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Buyer Side */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-3">What Buyers Pay</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item price</span>
                  <span>{symbol}{itemPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protection fee (base)</span>
                  <span>{symbol}{buyerFee.baseFee.toFixed(2)}</span>
                </div>
                {buyerFee.percentageFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">+ 1% over {symbol}{config.percentThreshold}</span>
                    <span>{symbol}{buyerFee.percentageFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-lg">{symbol}{totalBuyerPays.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Seller Side */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-medium text-green-700 dark:text-green-300 mb-3">What Sellers Receive</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item price</span>
                  <span>{symbol}{itemPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="text-muted-foreground">- Transaction fee (base)</span>
                  <span>-{symbol}{sellerFee.baseFee.toFixed(2)}</span>
                </div>
                {sellerFee.percentageFee > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="text-muted-foreground">- 1% over {symbol}{config.percentThreshold}</span>
                    <span>-{symbol}{sellerFee.percentageFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>You receive</span>
                  <span className="text-lg text-green-600">{symbol}{totalSellerReceives.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 6Seven Revenue */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">6Seven earns</span>
              <span className="font-medium">{symbol}{platformRevenue.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Competitor Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5" />
              Compare Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Platform</th>
                    <th className="text-right py-2 font-medium">Seller Fee</th>
                    <th className="text-right py-2 font-medium">Buyer Fee</th>
                    <th className="text-right py-2 font-medium">Total Fees</th>
                    <th className="text-right py-2 font-medium">You Save</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-primary/5">
                    <td className="py-3">
                      <span className="font-medium">6Seven</span>
                      <Badge variant="secondary" className="ml-2 text-xs">Best</Badge>
                    </td>
                    <td className="text-right">{symbol}{competitors.sixseven.sellerFee.toFixed(2)}</td>
                    <td className="text-right">{symbol}{competitors.sixseven.buyerFee.toFixed(2)}</td>
                    <td className="text-right font-medium">{symbol}{competitors.sixseven.total.toFixed(2)}</td>
                    <td className="text-right text-green-600">—</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">eBay</td>
                    <td className="text-right">{symbol}{competitors.ebay.sellerFee.toFixed(2)}</td>
                    <td className="text-right">{symbol}0.00</td>
                    <td className="text-right">{symbol}{competitors.ebay.total.toFixed(2)}</td>
                    <td className="text-right text-green-600 font-medium">
                      {symbol}{(competitors.ebay.total - competitors.sixseven.total).toFixed(2)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">Vinted</td>
                    <td className="text-right">{symbol}0.00</td>
                    <td className="text-right">{symbol}{competitors.vinted.buyerFee.toFixed(2)}</td>
                    <td className="text-right">{symbol}{competitors.vinted.total.toFixed(2)}</td>
                    <td className="text-right text-green-600 font-medium">
                      {symbol}{(competitors.vinted.total - competitors.sixseven.total).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3">Cardmarket</td>
                    <td className="text-right">{symbol}{competitors.cardmarket.sellerFee.toFixed(2)}</td>
                    <td className="text-right">{symbol}0.00</td>
                    <td className="text-right">{symbol}{competitors.cardmarket.total.toFixed(2)}</td>
                    <td className="text-right text-green-600 font-medium">
                      {competitors.cardmarket.total > competitors.sixseven.total 
                        ? `${symbol}${(competitors.cardmarket.total - competitors.sixseven.total).toFixed(2)}`
                        : "—"
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              * Comparison based on {symbol}{itemPrice.toFixed(2)} item. Actual fees may vary. Shipping costs not included.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default FeeCalculator;

