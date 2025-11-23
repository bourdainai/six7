import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, TrendingDown, Minus, Plus, X } from 'lucide-react';
import { CardSelector } from './CardSelector';
import { FairnessMeter } from './FairnessMeter';
import type { Database } from '@/integrations/supabase/types';

type Listing = Database['public']['Tables']['listings']['Row'];

interface TradeItem {
  listing: Listing;
  valuation?: number;
}

interface TradeBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetListing: Listing;
}

export function TradeBuilderModal({ open, onOpenChange, targetListing }: TradeBuilderModalProps) {
  const { toast } = useToast();
  const [myCards, setMyCards] = useState<TradeItem[]>([]);
  const [cashOffer, setCashOffer] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValuating, setIsValuating] = useState(false);
  const [fairnessScore, setFairnessScore] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showCardSelector, setShowCardSelector] = useState(false);

  // Calculate total offer value
  const myTotalValue = myCards.reduce((sum, item) => 
    sum + (item.valuation || item.listing.seller_price), 0
  ) + cashOffer;

  const targetValue = targetListing.seller_price;
  const valueDifference = myTotalValue - targetValue;

  // Get AI valuation and fairness score
  useEffect(() => {
    if (myCards.length === 0 && cashOffer === 0) {
      setFairnessScore(null);
      return;
    }

    const evaluateTrade = async () => {
      setIsValuating(true);
      try {
        // Get valuations for my cards
        const valuations = await Promise.all(
          myCards.map(async (item) => {
            const { data } = await supabase.functions.invoke('trade-valuation', {
              body: { 
                listing_id: item.listing.id,
                card_name: item.listing.title,
                set: item.listing.set_code,
                condition: item.listing.condition
              }
            });
            return data?.valuation || item.listing.seller_price;
          })
        );

        // Update valuations
        setMyCards(prev => prev.map((item, idx) => ({
          ...item,
          valuation: valuations[idx]
        })));

        // Get fairness score
        const totalMyValue = valuations.reduce((sum, val) => sum + val, 0) + cashOffer;
        const { data: fairness } = await supabase.functions.invoke('trade-fairness', {
          body: {
            offered_value: totalMyValue,
            requested_value: targetValue,
            offered_items: myCards.map(item => item.listing.id),
            requested_items: [targetListing.id]
          }
        });

        if (fairness) {
          setFairnessScore(fairness.score);
          setAiSuggestions(fairness.suggestions || []);
        }
      } catch (error) {
        console.error('Valuation error:', error);
      } finally {
        setIsValuating(false);
      }
    };

    // Debounce the evaluation
    const timer = setTimeout(evaluateTrade, 1000);
    return () => clearTimeout(timer);
  }, [myCards, cashOffer, targetListing, targetValue]);

  const handleAddCard = (listing: Listing) => {
    if (myCards.some(item => item.listing.id === listing.id)) {
      toast({
        title: "Already Added",
        description: "This card is already in your offer",
        variant: "destructive"
      });
      return;
    }
    setMyCards(prev => [...prev, { listing }]);
    setShowCardSelector(false);
  };

  const handleRemoveCard = (listingId: string) => {
    setMyCards(prev => prev.filter(item => item.listing.id !== listingId));
  };

  const handleQuickAdjustCash = (amount: number) => {
    setCashOffer(prev => Math.max(0, prev + amount));
  };

  const handleSubmit = async () => {
    if (myCards.length === 0 && cashOffer === 0) {
      toast({
        title: "Empty Offer",
        description: "Add at least one card or cash to your offer",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('trade-create', {
        body: {
          targetListingId: targetListing.id,
          tradeItems: myCards.map(item => ({
            listingId: item.listing.id,
            title: item.listing.title,
            value: item.valuation || item.listing.seller_price
          })),
          cashAmount: cashOffer,
          notes: notes,
          tradeType: myCards.length > 1 ? 'multi_card' : 'simple',
          aiFairnessScore: fairnessScore,
          aiSuggestions: aiSuggestions
        }
      });

      if (error) throw error;

      toast({
        title: "Trade Offer Sent!",
        description: "The seller will be notified of your offer"
      });
      
      onOpenChange(false);
      setMyCards([]);
      setCashOffer(0);
      setNotes('');
    } catch (error) {
      console.error('Error creating trade:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create trade offer",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Make a Trade Offer</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Your Offer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Offer</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCardSelector(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cards
                </Button>
              </div>

              {/* Selected Cards */}
              <div className="space-y-2">
                {myCards.map((item) => (
                  <div key={item.listing.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <img
                      src={item.listing.import_metadata?.['image_url'] as string || '/placeholder.svg'}
                      alt={item.listing.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        £{item.valuation?.toFixed(2) || item.listing.seller_price.toFixed(2)}
                        {item.valuation && item.valuation !== item.listing.seller_price && (
                          <span className="ml-2 text-xs">
                            (Listed: £{item.listing.seller_price.toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCard(item.listing.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Cash Adjustment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Cash</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdjustCash(-5)}
                    disabled={cashOffer < 5}
                  >
                    -£5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdjustCash(-10)}
                    disabled={cashOffer < 10}
                  >
                    -£10
                  </Button>
                  <Input
                    type="number"
                    value={cashOffer}
                    onChange={(e) => setCashOffer(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="flex-1"
                    placeholder="0.00"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdjustCash(10)}
                  >
                    +£10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdjustCash(5)}
                  >
                    +£5
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Message (Optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a message to the seller..."
                  rows={3}
                />
              </div>

              {/* Total Offer */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Offer Value:</span>
                  <span className="text-2xl font-bold">£{myTotalValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Target & Analysis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">You're Asking For</h3>
              
              {/* Target Listing */}
              <div className="p-4 border-2 border-primary rounded-lg">
                <div className="flex gap-3">
                  <img
                    src={targetListing.import_metadata?.['image_url'] as string || '/placeholder.svg'}
                    alt={targetListing.title}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-semibold">{targetListing.title}</h4>
                    <p className="text-sm text-muted-foreground">{targetListing.condition}</p>
                    <p className="text-xl font-bold mt-2">£{targetValue.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Fairness Meter */}
              <FairnessMeter
                score={fairnessScore}
                myValue={myTotalValue}
                theirValue={targetValue}
                isLoading={isValuating}
              />

              {/* Value Difference */}
              <div className={`p-3 rounded-lg ${
                valueDifference > 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                valueDifference < 0 ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                'bg-muted'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Value Difference:</span>
                  <div className="flex items-center gap-2">
                    {valueDifference > 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : valueDifference < 0 ? (
                      <TrendingDown className="w-5 h-5" />
                    ) : (
                      <Minus className="w-5 h-5" />
                    )}
                    <span className="text-lg font-bold">
                      {valueDifference > 0 ? '+' : ''}£{valueDifference.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">AI Suggestions</h4>
                  <div className="space-y-2">
                    {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (myCards.length === 0 && cashOffer === 0)}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Offer...
                  </>
                ) : (
                  'Send Trade Offer'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Selector Modal */}
      <CardSelector
        open={showCardSelector}
        onOpenChange={setShowCardSelector}
        onSelectCard={handleAddCard}
        excludeIds={myCards.map(item => item.listing.id)}
      />
    </>
  );
}
