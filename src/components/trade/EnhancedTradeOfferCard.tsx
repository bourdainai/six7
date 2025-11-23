import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { ArrowRightLeft, Clock, Eye, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FairnessMeter } from "./FairnessMeter";
import type { Database } from "@/integrations/supabase/types";

type TradeOfferWithDetails = Database["public"]["Tables"]["trade_offers"]["Row"] & {
  target_listing: Database["public"]["Tables"]["listings"]["Row"] | null;
  buyer: Database["public"]["Tables"]["profiles"]["Row"] | null;
  seller: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

interface EnhancedTradeOfferCardProps {
  offer: TradeOfferWithDetails;
  userRole: 'buyer' | 'seller';
  onCounter?: () => void;
  onViewDetails?: () => void;
}

export function EnhancedTradeOfferCard({ offer, userRole, onCounter, onViewDetails }: EnhancedTradeOfferCardProps) {
  const { acceptOffer, rejectOffer } = useTradeOffers();

  const totalOfferedValue = (offer.trade_item_valuations as any[])?.reduce(
    (sum, item) => sum + (item.valuation || 0), 
    offer.cash_amount || 0
  ) || offer.cash_amount || 0;

  const targetValue = offer.target_listing?.seller_price || 0;
  const isExpired = offer.expiry_date && new Date(offer.expiry_date) < new Date();

  const getStatusColor = () => {
    if (isExpired) return 'secondary';
    switch (offer.status) {
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'countered': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              {userRole === 'seller' ? 'Incoming' : 'Outgoing'} Trade
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(offer.created_at || ''), { addSuffix: true })}
            </div>
            {offer.view_count && offer.view_count > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                Viewed {offer.view_count} times
              </div>
            )}
          </div>
          <Badge variant={getStatusColor()}>
            {isExpired ? 'Expired' : offer.status}
            {offer.negotiation_round && offer.negotiation_round > 1 && ` (Round ${offer.negotiation_round})`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trade Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Offered Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Offering:</h4>
            {(offer.trade_items as any[])?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    £{(offer.trade_item_valuations as any[])?.[idx]?.valuation?.toFixed(2) || item.value?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {offer.cash_amount && offer.cash_amount > 0 && (
              <div className="p-2 border rounded">
                <p className="text-sm font-medium">Cash: £{offer.cash_amount.toFixed(2)}</p>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold">
                Total: £{totalOfferedValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Requested Item */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">For:</h4>
            {offer.target_listing && (
              <div className="p-2 border rounded">
                <p className="text-sm font-medium line-clamp-2">
                  {offer.target_listing.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {offer.target_listing.condition}
                </p>
                <p className="text-sm font-semibold mt-2">
                  £{targetValue.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fairness Meter */}
        {offer.ai_fairness_score !== null && (
          <FairnessMeter
            score={offer.ai_fairness_score * 100}
            myValue={totalOfferedValue}
            theirValue={targetValue}
            isLoading={false}
          />
        )}

        {/* Notes */}
        {offer.requester_notes && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <MessageCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm">{offer.requester_notes}</p>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {(offer.ai_suggestions as string[])?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">AI Suggestions:</h4>
            {(offer.ai_suggestions as string[]).map((suggestion, idx) => (
              <p key={idx} className="text-xs text-muted-foreground p-2 bg-muted rounded">
                💡 {suggestion}
              </p>
            ))}
          </div>
        )}

        {/* Actions */}
        {offer.status === 'pending' && !isExpired && userRole === 'seller' && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              onClick={() => acceptOffer.mutate(offer.id)}
              disabled={acceptOffer.isPending}
              className="flex-1"
            >
              Accept
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onCounter}
              className="flex-1"
            >
              Counter
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => rejectOffer.mutate(offer.id)}
              disabled={rejectOffer.isPending}
            >
              Reject
            </Button>
          </div>
        )}

        {onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewDetails}
            className="w-full"
          >
            View Full Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
