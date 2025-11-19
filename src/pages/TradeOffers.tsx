import { PageLayout } from "@/components/PageLayout";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { TradeOfferCard } from "@/components/trade/TradeOfferCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function TradeOffersPage() {
  const { offers, isLoading } = useTradeOffers();

  return (
    <PageLayout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Trade Offers</h1>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4">
            {offers?.length === 0 ? (
              <p className="text-muted-foreground">No active offers.</p>
            ) : (
              offers?.map((offer: any) => (
                <TradeOfferCard key={offer.id} offer={offer} />
              ))
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

