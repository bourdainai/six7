import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Star, Package, Calendar, Instagram, Twitter, Youtube, Loader2, Facebook, Linkedin } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { SEO } from "@/components/SEO";
import { format } from "date-fns";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const navigate = useNavigate();

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["seller-profile", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sellerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["seller-stats", sellerId],
    queryFn: async () => {
      // Get total sales
      const { count: salesCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .in("status", ["paid", "completed"]);

      // Get average rating
      const { data: ratings } = await supabase
        .from("ratings")
        .select("rating")
        .eq("reviewee_id", sellerId);

      const avgRating = ratings?.length
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      // Get active listings count
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId)
        .eq("status", "active");

      return {
        salesCount: salesCount || 0,
        avgRating: avgRating.toFixed(1),
        ratingCount: ratings?.length || 0,
        listingsCount: listingsCount || 0,
      };
    },
    enabled: !!sellerId,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ["seller-listings", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          listing_images(image_url, display_order)
        `)
        .eq("seller_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["seller-reviews", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          *,
          reviewer:profiles!ratings_reviewer_id_fkey(full_name, avatar_url),
          listing:listings(title)
        `)
        .eq("reviewee_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  if (sellerLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!seller) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Seller not found</h1>
          <Button onClick={() => navigate("/browse")}>Browse Listings</Button>
        </div>
      </PageLayout>
    );
  }

  const memberSince = format(new Date(seller.created_at), "MMMM yyyy");

  return (
    <PageLayout>
      <SEO
        title={`${seller.business_name || seller.full_name || "Seller"} - 6Seven`}
        description={seller.bio || `Shop from ${seller.business_name || seller.full_name || "this seller"} on 6Seven`}
      />

      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={seller.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {(seller.full_name || seller.email)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">
                      {seller.business_name || seller.full_name || "Seller"}
                    </h1>
                    {seller.email_verified && (
                      <Badge variant="secondary">Verified</Badge>
                    )}
                    {seller.verification_level === "premium" && (
                      <Badge variant="default">Premium Seller</Badge>
                    )}
                  </div>
                  {seller.bio && (
                    <p className="text-muted-foreground">{seller.bio}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{stats?.avgRating || "0.0"}</span>
                    <span className="text-muted-foreground">
                      ({stats?.ratingCount || 0} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{stats?.salesCount || 0} sales</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Member since {memberSince}</span>
                  </div>
                  {seller.avg_response_time_hours && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>
                        Responds within {seller.avg_response_time_hours}h
                      </span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {(seller.instagram_url || seller.twitter_url || seller.facebook_url || seller.linkedin_url || seller.youtube_url || seller.tiktok_url) && (
                  <div className="flex flex-wrap gap-2">
                    {seller.instagram_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(seller.instagram_url, "_blank")}
                      >
                        <Instagram className="h-4 w-4" />
                      </Button>
                    )}
                    {seller.twitter_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(seller.twitter_url, "_blank")}
                      >
                        <Twitter className="h-4 w-4" />
                      </Button>
                    )}
                    {seller.facebook_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(seller.facebook_url, "_blank")}
                      >
                        <Facebook className="h-4 w-4" />
                      </Button>
                    )}
                    {seller.linkedin_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(seller.linkedin_url, "_blank")}
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    )}
                    {seller.youtube_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(seller.youtube_url, "_blank")}
                      >
                        <Youtube className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                <Button onClick={() => navigate(`/messages?seller=${sellerId}`)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="listings">
              Listings ({stats?.listingsCount || 0})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({stats?.ratingCount || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            {listingsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No active listings</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviewsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              </div>
            ) : reviews && reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.reviewer?.avatar_url || undefined} />
                          <AvatarFallback>
                            {review.reviewer?.full_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {review.reviewer?.full_name || "Anonymous"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(review.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  {review.review_text && (
                    <CardContent>
                      <p className="text-sm">{review.review_text}</p>
                      {review.listing && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Item: {review.listing.title}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reviews yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}