import { PageLayout } from "@/components/PageLayout";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { TradeOfferCard } from "@/components/trade/TradeOfferCard";
import { Skeleton } from "@/components/ui/skeleton";

import type { Database } from "@/integrations/supabase/types";

type TradeOfferWithDetails = Database["public"]["Tables"]["trade_offers"]["Row"] & {
  target_listing: Database["public"]["Tables"]["listings"]["Row"];
  buyer: Database["public"]["Tables"]["profiles"]["Row"];
  seller: Database["public"]["Tables"]["profiles"]["Row"];
}

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
              offers?.map((offer) => (
                <TradeOfferCard key={offer.id} offer={offer as unknown as TradeOfferWithDetails} />
              ))
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

