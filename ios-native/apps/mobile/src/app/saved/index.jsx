import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Heart, Trash2, Package } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  red: "#EF4444",
};

export default function SavedListings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch saved listings
  const { data: savedListings, isLoading, refetch } = useQuery({
    queryKey: ["saved-listings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("saved_listings")
        .select(`
          id,
          created_at,
          listing:listings(
            id,
            title,
            seller_price,
            condition,
            status,
            listing_images(image_url, display_order)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Remove from saved mutation
  const removeMutation = useMutation({
    mutationFn: async (savedId) => {
      const { error } = await supabase.from("saved_listings").delete().eq("id", savedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-listings"] });
      queryClient.invalidateQueries({ queryKey: ["saved-count"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!fontsLoaded) {
    return null;
  }

  const formatCondition = (condition) => {
    const conditionLabels = {
      new_with_tags: "New",
      like_new: "Like New",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
    };
    return conditionLabels[condition] || condition;
  };

  const renderItem = ({ item }) => {
    const listing = item.listing;
    if (!listing) return null;

    const imageUrl = listing.listing_images?.sort((a, b) => a.display_order - b.display_order)?.[0]
      ?.image_url;

    const isSoldOrUnavailable = listing.status !== "active";

    return (
      <TouchableOpacity
        onPress={() => router.push(`/listing/${listing.id}`)}
        style={{
          flexDirection: "row",
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: isSoldOrUnavailable ? 0.6 : 1,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              backgroundColor: colors.lightGray,
              marginRight: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={32} color={colors.gray} />
          </View>
        )}
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 15,
              color: colors.foreground,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {listing.title}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            £{Number(listing.seller_price || 0).toFixed(2)}
          </Text>
          {listing.condition && (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.gray,
              }}
            >
              {formatCondition(listing.condition)}
            </Text>
          )}
          {isSoldOrUnavailable && (
            <View
              style={{
                backgroundColor: colors.lightGray,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
                alignSelf: "flex-start",
                marginTop: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 11,
                  color: colors.gray,
                }}
              >
                {listing.status === "sold" ? "Sold" : "Unavailable"}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => removeMutation.mutate(item.id)}
          disabled={removeMutation.isPending}
          style={{
            padding: 8,
            alignSelf: "center",
          }}
        >
          <Heart size={24} color={colors.red} fill={colors.red} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.foreground }}>
          Saved Items
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      ) : savedListings?.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Heart size={64} color={colors.gray} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: colors.foreground,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No Saved Items
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              color: colors.gray,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Items you save will appear here
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/browse")}
            style={{
              backgroundColor: colors.foreground,
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 8,
              marginTop: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              Browse Items
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedListings}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 40,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}


