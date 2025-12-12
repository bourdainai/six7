import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Star,
  Package,
  MessageCircle,
  MapPin,
  Calendar,
  Shield,
  ChevronRight,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import { format } from "date-fns";

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  amber: "#F59E0B",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: profileId } = useLocalSearchParams();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  // Fetch user's listings
  const { data: listings } = useQuery({
    queryKey: ["profile-listings", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          seller_price,
          condition,
          status,
          listing_images(image_url, display_order)
        `)
        .eq("seller_id", profileId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
  });

  // Fetch ratings
  const { data: ratings } = useQuery({
    queryKey: ["profile-ratings", profileId],
    queryFn: async () => {
      if (!profileId) return { average: 0, count: 0, reviews: [] };

      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          rating,
          comment,
          created_at,
          rater:profiles!rater_id(id, full_name, avatar_url)
        `)
        .eq("rated_user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const reviews = data || [];
      const average = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return { average, count: reviews.length, reviews };
    },
    enabled: !!profileId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleContact = async () => {
    if (!user) {
      return;
    }

    if (profileId === user.id) {
      return;
    }

    // Navigate to messages - would need to create or get conversation
    router.push(`/(tabs)/messages`);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.foreground }}>
            User Not Found
          </Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = user?.id === profileId;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground, flex: 1 }}>
          Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={{ alignItems: "center", paddingVertical: 32, paddingHorizontal: 20 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.foreground,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              overflow: "hidden",
            }}
          >
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 100, height: 100 }} />
            ) : (
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 36, color: colors.background }}>
                {profile.full_name?.[0]?.toUpperCase() || "?"}
              </Text>
            )}
          </View>

          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: colors.foreground, marginBottom: 4 }}>
            {profile.full_name || "Anonymous"}
          </Text>

          {profile.username && (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, marginBottom: 12 }}>
              @{profile.username}
            </Text>
          )}

          {/* Stats Row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 20 }}>
            {profile.trust_score && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Shield size={16} color={colors.green} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.green }}>
                  {profile.trust_score}% Trust
                </Text>
              </View>
            )}
            {ratings?.count > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Star size={16} color={colors.amber} fill={colors.amber} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>
                  {ratings.average.toFixed(1)} ({ratings.count})
                </Text>
              </View>
            )}
          </View>

          {profile.created_at && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Calendar size={14} color={colors.gray} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray }}>
                Member since {format(new Date(profile.created_at), "MMM yyyy")}
              </Text>
            </View>
          )}

          {/* Contact Button */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleContact}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: colors.foreground,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                marginTop: 20,
              }}
            >
              <MessageCircle size={18} color={colors.background} />
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.background }}>
                Contact Seller
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 8 }}>
              About
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, lineHeight: 22 }}>
              {profile.bio}
            </Text>
          </View>
        )}

        {/* Listings */}
        {listings && listings.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground }}>
                Listings ({listings.length})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {listings.map((listing) => {
                const imageUrl = listing.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]?.image_url;
                return (
                  <TouchableOpacity
                    key={listing.id}
                    onPress={() => router.push(`/listing/${listing.id}`)}
                    style={{
                      width: 140,
                      backgroundColor: colors.lightGray,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <View style={{ width: 140, height: 140, backgroundColor: colors.border }}>
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={{ width: 140, height: 140 }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <Package size={32} color={colors.gray} />
                        </View>
                      )}
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text
                        style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground }}
                        numberOfLines={1}
                      >
                        {listing.title}
                      </Text>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground, marginTop: 4 }}>
                        £{Number(listing.seller_price || 0).toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Reviews */}
        {ratings?.reviews && ratings.reviews.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.foreground, marginBottom: 12 }}>
              Reviews ({ratings.count})
            </Text>
            {ratings.reviews.map((review) => (
              <View
                key={review.id}
                style={{
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.foreground,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                      overflow: "hidden",
                    }}
                  >
                    {review.rater?.avatar_url ? (
                      <Image source={{ uri: review.rater.avatar_url }} style={{ width: 36, height: 36 }} />
                    ) : (
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.background }}>
                        {review.rater?.full_name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>
                      {review.rater?.full_name || "Anonymous"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          color={star <= review.rating ? colors.amber : colors.border}
                          fill={star <= review.rating ? colors.amber : "transparent"}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.gray }}>
                    {format(new Date(review.created_at), "MMM d")}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.gray, lineHeight: 20 }}>
                    {review.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State for Listings */}
        {(!listings || listings.length === 0) && (
          <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 40 }}>
            <Package size={48} color={colors.gray} />
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray, marginTop: 12, textAlign: "center" }}>
              No active listings
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
