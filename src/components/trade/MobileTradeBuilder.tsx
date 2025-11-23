import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Database } from '@/integrations/supabase/types';
import { FairnessMeter } from './FairnessMeter';

type Listing = Database['public']['Tables']['listings']['Row'];

interface TradeItem {
  listing: Listing;
  valuation?: number;
}

interface MobileTradeBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetListing: Listing;
}

export function MobileTradeBuilder({ open, onOpenChange, targetListing }: MobileTradeBuilderProps) {
  const { toast } = useToast();
  const [myCards, setMyCards] = useState<TradeItem[]>([]);
  const [cashOffer, setCashOffer] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValuating, setIsValuating] = useState(false);
  const [fairnessScore, setFairnessScore] = useState<number | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'cards' | 'cash' | 'notes' | null>('cards');
  const [userListings, setUserListings] = useState<Listing[]>([]);

  const myTotalValue = myCards.reduce((sum, item) => 
    sum + (item.valuation || item.listing.seller_price), 0
  ) + cashOffer;

  const targetValue = targetListing.seller_price;
  const valueDifference = myTotalValue - targetValue;

  // Fetch user's listings
  useEffect(() => {
    const fetchUserListings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .neq('id', targetListing.id);

      if (data) setUserListings(data);
    };

    if (open) fetchUserListings();
  }, [open, targetListing.id]);

  // Get AI valuation
  useEffect(() => {
    if (myCards.length === 0 && cashOffer === 0) {
      setFairnessScore(null);
      return;
    }

    const evaluateTrade = async () => {
      setIsValuating(true);
      try {
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

        setMyCards(prev => prev.map((item, idx) => ({
          ...item,
          valuation: valuations[idx]
        })));

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
          target_listing_id: targetListing.id,
          trade_items: myCards.map(item => ({
            listing_id: item.listing.id,
            title: item.listing.title,
            value: item.valuation || item.listing.seller_price
          })),
          cash_amount: cashOffer,
          notes: notes,
          trade_type: myCards.length > 1 ? 'multi_card' : 'simple',
          ai_fairness_score: fairnessScore,
          ai_suggestions: aiSuggestions
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Make Trade Offer</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Target Card */}
          <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground mb-2">You're asking for:</p>
            <div className="flex gap-3">
              <img
                src={targetListing.import_metadata?.['image_url'] as string || '/placeholder.svg'}
                alt={targetListing.title}
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{targetListing.title}</h4>
                <p className="text-xs text-muted-foreground">{targetListing.condition}</p>
                <p className="text-lg font-bold mt-1">£{targetValue.toFixed(2)}</p>
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

          {/* Your Offer Sections */}
          <div className="space-y-2">
            {/* Cards Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setExpandedSection(expandedSection === 'cards' ? null : 'cards')}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Your Cards</span>
                  <span className="text-sm text-muted-foreground">({myCards.length})</span>
                </div>
                {expandedSection === 'cards' ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSection === 'cards' && (
                <div className="p-4 pt-0 space-y-2">
                  {myCards.map((item) => (
                    <div key={item.listing.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <img
                        src={item.listing.import_metadata?.['image_url'] as string || '/placeholder.svg'}
                        alt={item.listing.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.listing.title}</p>
                        <p className="text-xs text-muted-foreground">
                          £{item.valuation?.toFixed(2) || item.listing.seller_price.toFixed(2)}
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
                  
                  <Sheet open={showCardSelector} onOpenChange={setShowCardSelector}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Cards
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Select Your Cards</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {userListings.map((listing) => (
                          <button
                            key={listing.id}
                            onClick={() => handleAddCard(listing)}
                            className="p-3 border rounded-lg text-left hover:bg-accent transition-colors"
                            disabled={myCards.some(item => item.listing.id === listing.id)}
                          >
                            <img
                              src={listing.import_metadata?.['image_url'] as string || '/placeholder.svg'}
                              alt={listing.title}
                              className="w-full h-32 object-cover rounded mb-2"
                            />
                            <p className="font-medium text-sm truncate">{listing.title}</p>
                            <p className="text-xs text-muted-foreground">£{listing.seller_price.toFixed(2)}</p>
                          </button>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              )}
            </div>

            {/* Cash Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setExpandedSection(expandedSection === 'cash' ? null : 'cash')}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Add Cash</span>
                  {cashOffer > 0 && (
                    <span className="text-sm text-primary">£{cashOffer.toFixed(2)}</span>
                  )}
                </div>
                {expandedSection === 'cash' ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSection === 'cash' && (
                <div className="p-4 pt-0 space-y-3">
                  <Input
                    type="number"
                    value={cashOffer}
                    onChange={(e) => setCashOffer(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0.00"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20, 50].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashOffer(prev => prev + amount)}
                      >
                        +£{amount}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setExpandedSection(expandedSection === 'notes' ? null : 'notes')}
                className="w-full p-4 flex items-center justify-between"
              >
                <span className="font-semibold">Message (Optional)</span>
                {expandedSection === 'notes' ? <ChevronUp /> : <ChevronDown />}
              </button>
              
              {expandedSection === 'notes' && (
                <div className="p-4 pt-0">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a message to the seller..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-semibold">AI Suggestions</p>
              {aiSuggestions.map((suggestion, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  • {suggestion}
                </p>
              ))}
            </div>
          )}

          {/* Total & Submit */}
          <div className="sticky bottom-0 bg-background pt-4 pb-2 space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Offer</span>
                <span className="text-2xl font-bold">£{myTotalValue.toFixed(2)}</span>
              </div>
              {valueDifference !== 0 && (
                <p className={`text-xs mt-1 ${
                  valueDifference > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {valueDifference > 0 ? '+' : ''}£{valueDifference.toFixed(2)} vs their price
                </p>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (myCards.length === 0 && cashOffer === 0)}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  Send Trade Offer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
