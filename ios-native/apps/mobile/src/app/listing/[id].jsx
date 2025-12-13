import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Heart,
  Share2,
  MessageCircle,
  ShoppingBag,
  ArrowLeftRight,
  User,
  Star,
  Package,
  Truck,
  MoreVertical,
  Edit3,
  Trash2,
  Flag,
} from "lucide-react-native";
import * as Sharing from "expo-sharing";
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

const { width: screenWidth } = Dimensions.get("window");

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  red: "#EF4444",
  green: "#10B981",
  blue: "#3B82F6",
};

export default function ListingDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: listingId } = useLocalSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch listing details
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: async () => {
      if (!listingId) return null;

      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          seller:profiles!seller_id(id, full_name, avatar_url, trust_score),
          listing_images(image_url, display_order),
          listing_variants(
            id,
            variant_name,
            variant_price,
            variant_condition,
            variant_quantity,
            is_available,
            is_sold
          )
        `)
        .eq("id", listingId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!listingId,
  });

  // Check if listing is saved
  const { data: isSaved } = useQuery({
    queryKey: ["saved-listing", listingId, user?.id],
    queryFn: async () => {
      if (!user?.id || !listingId) return false;

      const { data, error } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    },
    enabled: !!user?.id && !!listingId,
  });

  // Toggle save mutation
  const toggleSaveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      if (isSaved) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_listings").insert({
          user_id: user.id,
          listing_id: listingId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-listing", listingId, user?.id] });
    },
  });

  const handleSave = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to save listings");
      return;
    }
    toggleSaveMutation.mutate();
  };

  const handleBuy = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to purchase");
      return;
    }
    if (listing?.seller_id === user.id) {
      Alert.alert("Cannot Purchase", "You cannot buy your own listing");
      return;
    }

    let checkoutUrl = `/checkout/${listingId}`;
    if (selectedVariant) {
      checkoutUrl += `?variant=${selectedVariant}`;
    }
    router.push(checkoutUrl);
  };

  const handleMakeOffer = async () => {
    if (!user || !listing) {
      Alert.alert("Sign In Required", "Please sign in to make an offer");
      return;
    }
    
    if (listing.seller_id === user.id) {
      Alert.alert("Cannot Make Offer", "You cannot make an offer on your own listing");
      return;
    }

    // Navigate to conversation where user can make an offer
    try {
      const { getOrCreateConversation } = await import("@/utils/conversations");
      
      // Create or get conversation
      const conversationId = await getOrCreateConversation(
        listingId,
        user.id,
        listing.seller_id
      );
      
      // Navigate to conversation screen where offer can be made
      router.push(`/messages/${conversationId}?makeOffer=true`);
    } catch (error) {
      console.error("Error opening conversation:", error);
      Alert.alert("Error", "Failed to open conversation. Please try again.");
    }
  };

  const handleTrade = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to propose a trade");
      return;
    }
    // Navigate to trade offer creation screen
    router.push(`/trade-offers/create?listingId=${listingId}`);
  };

  const handleContact = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to contact seller");
      return;
    }

    if (!listing) return;

    if (listing.seller_id === user.id) {
      Alert.alert("Cannot Contact", "You cannot contact yourself");
      return;
    }

    try {
      const { getOrCreateConversation } = await import("@/utils/conversations");
      const conversationId = await getOrCreateConversation(
        listingId,
        user.id,
        listing.seller_id
      );

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      Alert.alert("Error", "Failed to open conversation. Please try again.");
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://6seven.io/listing/${listingId}`;
      const message = `Check out ${listing?.title} on 6Seven - £${Number(listing?.seller_price || 0).toFixed(2)}`;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(shareUrl, {
          dialogTitle: "Share Listing",
          mimeType: "text/plain",
        });
      } else {
        // Fallback to native Share
        Alert.alert("Share", message + "\n\n" + shareUrl);
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    router.push(`/listing/edit/${listingId}`);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to delete this listing? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)
        .eq("seller_id", user.id);

      if (error) throw error;

      Alert.alert("Success", "Listing deleted successfully");
      router.back();
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete listing");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReport = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to report a listing");
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for reporting");
      return;
    }

    setIsReporting(true);
    try {
      const { error } = await supabase.from("listing_reports").insert({
        listing_id: listingId,
        reporter_id: user.id,
        reason: reportReason,
        status: "pending",
      });

      if (error) throw error;

      Alert.alert("Thank You", "Your report has been submitted and will be reviewed by our team.");
      setShowReportModal(false);
      setReportReason("");
    } catch (error) {
      console.error("Report error:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  };

  // Check if current user is the seller
  const isOwner = user && listing?.seller_id === user.id;

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View
          style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
          <Package size={64} color={colors.gray} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
              color: colors.foreground,
              marginTop: 16,
            }}
          >
            Listing Not Found
          </Text>
        </View>
      </View>
    );
  }

  const images = listing.listing_images?.sort((a, b) => a.display_order - b.display_order) || [];
  const variants = listing.listing_variants?.filter((v) => v.is_available && !v.is_sold) || [];
  const hasVariants = listing.has_variants && variants.length > 0;
  
  const displayPrice = selectedVariant
    ? variants.find((v) => v.id === selectedVariant)?.variant_price || listing.seller_price
    : listing.seller_price;

  const formatCondition = (condition) => {
    const conditionLabels = {
      new_with_tags: "New with Tags",
      like_new: "Like New",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
    };
    return conditionLabels[condition] || condition;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.9)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={toggleSaveMutation.isPending}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Heart
              size={22}
              color={isSaved ? colors.red : colors.foreground}
              fill={isSaved ? colors.red : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Share2 size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MoreVertical size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setSelectedImageIndex(index);
          }}
        >
          {images.length > 0 ? (
            images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.image_url }}
                style={{
                  width: screenWidth,
                  height: screenWidth * 1.2,
                }}
                resizeMode="cover"
              />
            ))
          ) : (
            <View
              style={{
                width: screenWidth,
                height: screenWidth * 1.2,
                backgroundColor: colors.lightGray,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={64} color={colors.gray} />
            </View>
          )}
        </ScrollView>

        {/* Image Indicators */}
        {images.length > 1 && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              paddingVertical: 12,
              gap: 6,
            }}
          >
            {images.map((_, index) => (
              <View
                key={index}
                style={{
                  width: index === selectedImageIndex ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    index === selectedImageIndex ? colors.foreground : colors.border,
                }}
              />
            ))}
          </View>
        )}

        {/* Content */}
        <View style={{ padding: 20 }}>
          {/* Title & Price */}
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: colors.foreground,
              marginBottom: 8,
              lineHeight: 30,
            }}
          >
            {listing.title}
          </Text>

          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            £{Number(displayPrice || 0).toFixed(2)}
          </Text>

          {/* Badges */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {listing.condition && (
              <View
                style={{
                  backgroundColor: colors.lightGray,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.foreground,
                  }}
                >
                  {formatCondition(listing.condition)}
                </Text>
              </View>
            )}
            {listing.brand && (
              <View
                style={{
                  backgroundColor: colors.lightGray,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.foreground,
                  }}
                >
                  {listing.brand}
                </Text>
              </View>
            )}
            {listing.free_shipping && (
              <View
                style={{
                  backgroundColor: colors.green + "20",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Truck size={14} color={colors.green} />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.green,
                  }}
                >
                  Free Shipping
                </Text>
              </View>
            )}
          </View>

          {/* Variants */}
          {hasVariants && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Select Option
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {variants.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    onPress={() => setSelectedVariant(variant.id)}
                    style={{
                      backgroundColor:
                        selectedVariant === variant.id ? colors.foreground : colors.lightGray,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 8,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor:
                        selectedVariant === variant.id ? colors.foreground : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 14,
                        color:
                          selectedVariant === variant.id ? colors.background : colors.foreground,
                      }}
                    >
                      {variant.variant_name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                        color:
                          selectedVariant === variant.id ? colors.background : colors.foreground,
                        marginTop: 2,
                      }}
                    >
                      £{Number(variant.variant_price || 0).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Description
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.gray,
                  lineHeight: 22,
                }}
              >
                {listing.description}
              </Text>
            </View>
          )}

          {/* Seller */}
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push(`/profile/${listing.seller?.id}`)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.foreground,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  overflow: "hidden",
                }}
              >
                {listing.seller?.avatar_url ? (
                  <Image
                    source={{ uri: listing.seller.avatar_url }}
                    style={{ width: 48, height: 48 }}
                  />
                ) : (
                  <User size={24} color={colors.background} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    color: colors.foreground,
                  }}
                >
                  {listing.seller?.full_name || "Seller"}
                </Text>
                {listing.seller?.trust_score && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Star size={14} color={colors.foreground} fill={colors.foreground} />
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                        color: colors.foreground,
                      }}
                    >
                      {listing.seller.trust_score}% Trust Score
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={handleContact}
                style={{
                  padding: 10,
                  backgroundColor: colors.background,
                  borderRadius: 8,
                }}
              >
                <MessageCircle size={20} color={colors.foreground} />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {!isOwner ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          }}
        >
          {/* Top row: Trade and Make Offer */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={handleTrade}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.blue,
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <ArrowLeftRight size={18} color={colors.blue} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  color: colors.blue,
                }}
              >
                Trade
              </Text>
            </TouchableOpacity>
            {listing.accepts_offers && (
              <TouchableOpacity
                onPress={handleMakeOffer}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.foreground,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.foreground,
                  }}
                >
                  Make Offer
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Bottom row: Buy Now */}
          <TouchableOpacity
            onPress={handleBuy}
            style={{
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor: colors.foreground,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ShoppingBag size={20} color={colors.background} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              Buy Now
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={handleEdit}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.foreground,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Edit3 size={18} color={colors.foreground} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.foreground,
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            style={{
              flex: 1,
              paddingVertical: 14,
              alignItems: "center",
              borderRadius: 8,
              backgroundColor: colors.red,
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: isDeleting ? 0.7 : 1,
            }}
          >
            <Trash2 size={18} color={colors.background} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            {isOwner ? (
              <>
                <TouchableOpacity
                  onPress={handleEdit}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    gap: 16,
                  }}
                >
                  <Edit3 size={22} color={colors.foreground} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      color: colors.foreground,
                    }}
                  >
                    Edit Listing
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 16,
                    paddingHorizontal: 24,
                    gap: 16,
                  }}
                >
                  <Trash2 size={22} color={colors.red} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      color: colors.red,
                    }}
                  >
                    Delete Listing
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setShowMenu(false);
                  handleReport();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  gap: 16,
                }}
              >
                <Flag size={22} color={colors.red} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    color: colors.red,
                  }}
                >
                  Report Listing
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowMenu(false)}
              style={{
                marginTop: 8,
                marginHorizontal: 20,
                paddingVertical: 14,
                alignItems: "center",
                borderRadius: 8,
                backgroundColor: colors.lightGray,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: colors.foreground,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 20,
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              Report Listing
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.gray,
                marginBottom: 20,
              }}
            >
              Please tell us why you're reporting this listing
            </Text>

            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Describe the issue..."
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                color: colors.foreground,
                backgroundColor: colors.lightGray,
                borderRadius: 12,
                padding: 16,
                minHeight: 120,
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 8,
                  backgroundColor: colors.lightGray,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: colors.foreground,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReport}
                disabled={isReporting}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 8,
                  backgroundColor: colors.red,
                  opacity: isReporting ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                    color: colors.background,
                  }}
                >
                  {isReporting ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
