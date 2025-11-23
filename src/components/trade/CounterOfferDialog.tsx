import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CardSelector } from './CardSelector';
import { FairnessMeter } from './FairnessMeter';
import { ArrowLeftRight, Plus, Minus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TradeOfferWithDetails = Database["public"]["Tables"]["trade_offers"]["Row"] & {
  target_listing: Database["public"]["Tables"]["listings"]["Row"] | null;
};

interface CounterOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalOffer: TradeOfferWithDetails;
  userRole: 'buyer' | 'seller';
}

export function CounterOfferDialog({ open, onOpenChange, originalOffer, userRole }: CounterOfferDialogProps) {
  const { toast } = useToast();
  const [selectedCards, setSelectedCards] = useState<any[]>((originalOffer.trade_items as any[]) || []);
  const [cashAmount, setCashAmount] = useState(originalOffer.cash_amount || 0);
  const [notes, setNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [fairnessScore, setFairnessScore] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCardSelector, setShowCardSelector] = useState(false);

  const targetValue = originalOffer.target_listing?.seller_price || 0;
  const offeredValue = selectedCards.reduce((sum, card) => sum + (card.value || 0), 0) + cashAmount;

  const calculateFairness = async () => {
    if (selectedCards.length === 0 && cashAmount === 0) return;
    
    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('trade-fairness', {
        body: {
          offered_value: offeredValue,
          requested_value: targetValue,
          offered_items: selectedCards,
          requested_items: [originalOffer.target_listing]
        }
      });

      if (error) throw error;
      
      setFairnessScore(data.scorePercentage);
      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Fairness calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedCards.length === 0 && cashAmount === 0) {
      toast({
        title: 'Invalid Counter Offer',
        description: 'Please add cards or cash to your counter offer',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('trade-counter', {
        body: {
          originalOfferId: originalOffer.id,
          cashAmount,
          tradeItems: selectedCards.map(card => ({
            listingId: card.id,
            title: card.title,
            value: card.value
          })),
          notes,
          aiFairnessScore: fairnessScore ? fairnessScore / 100 : 0.5,
          aiSuggestions
        }
      });

      if (error) throw error;

      toast({
        title: 'Counter Offer Sent',
        description: 'Your counter offer has been sent successfully!'
      });
      
      onOpenChange(false);
      window.location.reload(); // Refresh to show new offer
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send counter offer',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAdjustCash = (amount: number) => {
    setCashAmount(prev => Math.max(0, prev + amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Make Counter Offer - Round {(originalOffer.negotiation_round || 1) + 1}
          </DialogTitle>
          <DialogDescription>
            Adjust the cards and cash in your offer to negotiate a better deal
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Counter Offer */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Your Counter Offer</h3>
              
              {/* Selected Cards Display */}
              <div className="space-y-2 mb-3">
                {selectedCards.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <p className="text-sm">No cards selected yet</p>
                  </div>
                ) : (
                  selectedCards.map((card, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{card.title}</p>
                        <p className="text-xs text-muted-foreground">
                          £{card.value?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCards(prev => prev.filter((_, i) => i !== idx));
                          calculateFairness();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowCardSelector(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Cards
              </Button>

              <div className="mt-4 space-y-3">
                <Label>Cash Amount</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="5"
                    value={cashAmount}
                    onChange={(e) => {
                      setCashAmount(Number(e.target.value));
                      calculateFairness();
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => quickAdjustCash(-5)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => quickAdjustCash(5)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => quickAdjustCash(10)}>
                    +£10
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => quickAdjustCash(25)}>
                    +£25
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => quickAdjustCash(50)}>
                    +£50
                  </Button>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold">
                    Total Offering: £{offeredValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add a message to explain your counter offer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* They're Asking For */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">They're Asking For</h3>
            
            {originalOffer.target_listing && (
              <div className="p-4 border rounded-lg">
                <p className="font-medium line-clamp-2">
                  {originalOffer.target_listing.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {originalOffer.target_listing.condition}
                </p>
                <p className="text-lg font-bold mt-2">
                  £{targetValue.toFixed(2)}
                </p>
              </div>
            )}

            <FairnessMeter
              score={fairnessScore}
              myValue={offeredValue}
              theirValue={targetValue}
              isLoading={isCalculating}
            />

            {aiSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">AI Suggestions:</h4>
                {aiSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="p-2 bg-muted rounded text-sm">
                    💡 {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (selectedCards.length === 0 && cashAmount === 0)}
          >
            {isSubmitting ? 'Sending...' : 'Send Counter Offer'}
          </Button>
        </div>
      </DialogContent>

      {/* Card Selector Dialog */}
      <CardSelector
        open={showCardSelector}
        onOpenChange={setShowCardSelector}
        onSelectCard={(listing) => {
          setSelectedCards(prev => [...prev, {
            id: listing.id,
            title: listing.title,
            value: listing.seller_price
          }]);
          setShowCardSelector(false);
          calculateFairness();
        }}
        excludeIds={selectedCards.map(c => c.id)}
      />
    </Dialog>
  );
}
