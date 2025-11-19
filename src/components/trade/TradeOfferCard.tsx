import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTradeOffers } from "@/hooks/useTradeOffers";

export function TradeOfferCard({ offer }: any) {
  const { acceptOffer, rejectOffer } = useTradeOffers();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Offer for {offer.target_listing?.title}</CardTitle>
        <Badge>{offer.status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Cash Offer</p>
            <p className="font-bold">£{offer.cash_amount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fairness Score</p>
            <p className="font-bold text-green-600">{offer.ai_fairness_score * 100}%</p>
          </div>
        </div>
        {offer.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => acceptOffer.mutate(offer.id)}>Accept</Button>
            <Button size="sm" variant="destructive" onClick={() => rejectOffer.mutate(offer.id)}>Reject</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

