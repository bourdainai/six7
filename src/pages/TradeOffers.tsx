import { useState, useEffect } from 'react';
import { PageLayout } from "@/components/PageLayout";
import { useTradeOffers } from "@/hooks/useTradeOffers";
import { EnhancedTradeOfferCard } from "@/components/trade/EnhancedTradeOfferCard";
import { TradeAnalyticsDashboard } from "@/components/trade/TradeAnalyticsDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeftRight, ArrowRight, ArrowLeft, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { TradeErrorBoundary } from "@/components/trade/TradeErrorBoundary";

import type { Database } from "@/integrations/supabase/types";

type TradeOfferWithDetails = Database["public"]["Tables"]["trade_offers"]["Row"] & {
  target_listing: Database["public"]["Tables"]["listings"]["Row"];
  buyer: Database["public"]["Tables"]["profiles"]["Row"];
  seller: Database["public"]["Tables"]["profiles"]["Row"];
}

export default function TradeOffersPage() {
  const { offers, isLoading } = useTradeOffers();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Filter offers by type
  const incomingOffers = offers?.filter(o => o.seller_id === currentUserId && o.status === 'pending') || [];
  const outgoingOffers = offers?.filter(o => o.buyer_id === currentUserId) || [];
  const completedOffers = offers?.filter(o => o.status === 'accepted') || [];
  const rejectedOffers = offers?.filter(o => o.status === 'rejected') || [];

  return (
    <TradeErrorBoundary>
      <PageLayout>
      <div className="container py-8 max-w-6xl">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-8 h-8" />
            Trade Offers
          </h1>
          <p className="text-base text-muted-foreground font-normal tracking-tight">
            Manage your incoming and outgoing trade proposals with ease
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="incoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="incoming" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Incoming ({incomingOffers.length})
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Outgoing ({outgoingOffers.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Accepted ({completedOffers.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected ({rejectedOffers.length})
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="space-y-4">
              {incomingOffers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No incoming trade offers
                </div>
              ) : (
                incomingOffers.map((offer) => (
                  <EnhancedTradeOfferCard
                    key={offer.id}
                    offer={offer as unknown as TradeOfferWithDetails}
                    userRole="seller"
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-4">
              {outgoingOffers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No outgoing trade offers
                </div>
              ) : (
                outgoingOffers.map((offer) => (
                  <EnhancedTradeOfferCard
                    key={offer.id}
                    offer={offer as unknown as TradeOfferWithDetails}
                    userRole="buyer"
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOffers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No accepted trades yet
                </div>
              ) : (
                completedOffers.map((offer) => (
                  <EnhancedTradeOfferCard
                    key={offer.id}
                    offer={offer as unknown as TradeOfferWithDetails}
                    userRole={offer.buyer_id === currentUserId ? 'buyer' : 'seller'}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedOffers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No rejected trades
                </div>
              ) : (
                rejectedOffers.map((offer) => (
                  <EnhancedTradeOfferCard
                    key={offer.id}
                    offer={offer as unknown as TradeOfferWithDetails}
                    userRole={offer.buyer_id === currentUserId ? 'buyer' : 'seller'}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <TradeAnalyticsDashboard />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageLayout>
    </TradeErrorBoundary>
  );
}

