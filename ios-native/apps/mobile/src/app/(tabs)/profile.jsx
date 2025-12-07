import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Settings,
  Wallet,
  ShoppingBag,
  Heart,
  FileText,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Package,
  TrendingUp,
  ArrowLeftRight,
  User,
  Tag,
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
import { useWallet } from "@/utils/wallet/useWallet";
import { useAuthModal } from "@/utils/auth/store";
import Logo from "../../../assets/images/logo.svg";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  destructive: "#EF4444",
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut, isAuthenticated, loading: authLoading } = useAuth();
  const { wallet, isLoading: walletLoading } = useWallet();
  const { open: openAuthModal } = useAuthModal();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*, seller_stats:seller_stats(*)")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch saved listings count
  const { data: savedCount } = useQuery({
    queryKey: ["saved-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("saved_listings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch listings count
  const { data: listingsCount } = useQuery({
    queryKey: ["listings-count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/browse");
        },
      },
    ]);
  };

  const handleMenuPress = (label) => {
    switch (label) {
      case "Wallet":
        router.push("/wallet");
        break;
      case "My Orders":
        router.push("/orders");
        break;
      case "My Listings":
        router.push("/seller/dashboard");
        break;
      case "Seller Dashboard":
        router.push("/seller/dashboard");
        break;
      case "Saved Items":
        router.push("/saved");
        break;
      case "Notifications":
        router.push("/settings/notifications");
        break;
      case "Trade Offers":
        router.push("/trade-offers");
        break;
      case "Settings":
        router.push("/settings");
        break;
      case "Pricing & Fees":
        router.push("/pricing");
        break;
      case "Help Center":
        Alert.alert("Help Center", "Coming soon!");
        break;
      case "Terms & Privacy":
        Alert.alert("Terms & Privacy", "Coming soon!");
        break;
      default:
        Alert.alert("Coming Soon", `${label} feature is coming soon!`);
    }
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          icon: Wallet,
          label: "Wallet",
          value: `£${(wallet?.balance || 0).toFixed(2)}`,
        },
        { icon: ShoppingBag, label: "My Orders" },
        { icon: Package, label: "My Listings" },
        { icon: TrendingUp, label: "Seller Dashboard" },
        { icon: ArrowLeftRight, label: "Trade Offers" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Heart, label: "Saved Items" },
        { icon: Bell, label: "Notifications" },
        { icon: Settings, label: "Settings" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: Tag, label: "Pricing & Fees" },
        { icon: HelpCircle, label: "Help Center" },
        { icon: FileText, label: "Terms & Privacy" },
      ],
    },
  ];

  // Not authenticated view
  if (!isAuthenticated && !authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 40,
            paddingTop: insets.top,
          }}
        >
          <Logo width={200} height={50} style={{ marginBottom: 24 }} />
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              color: colors.foreground,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Welcome
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              color: colors.gray,
              textAlign: "center",
              marginBottom: 32,
              lineHeight: 24,
            }}
          >
            Sign in to access your profile, wallet, orders, and more.
          </Text>
          <TouchableOpacity
            onPress={() => openAuthModal("signin")}
            style={{
              backgroundColor: colors.foreground,
              paddingVertical: 16,
              paddingHorizontal: 40,
              borderRadius: 12,
              marginBottom: 12,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.background,
                textAlign: "center",
              }}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openAuthModal("signup")}
            style={{
              borderWidth: 1,
              borderColor: colors.foreground,
              paddingVertical: 16,
              paddingHorizontal: 40,
              borderRadius: 12,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.foreground,
                textAlign: "center",
              }}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalSales = profile?.seller_stats?.total_sales || 0;
  const rating = profile?.seller_stats?.average_rating || profile?.trust_score || 0;

  const Header = () => (
    <View
      style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: 24,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 32,
          color: colors.foreground,
          marginBottom: 24,
          letterSpacing: -1,
        }}
      >
        Profile
      </Text>

      {/* User Card */}
      <View
        style={{
          backgroundColor: colors.lightGray,
          borderRadius: 16,
          padding: 24,
        }}
      >
        {profileLoading ? (
          <ActivityIndicator size="large" color={colors.foreground} />
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: colors.foreground,
                  borderRadius: 32,
                  marginRight: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    color: colors.background,
                  }}
                >
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 20,
                    color: colors.foreground,
                    marginBottom: 4,
                    letterSpacing: -0.5,
                  }}
                >
                  {profile?.full_name || "User"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.gray,
                    marginBottom: 8,
                  }}
                >
                  {user?.email || ""}
                </Text>
                {rating > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                        color: colors.foreground,
                        marginRight: 6,
                      }}
                    >
                      ★ {Number(rating).toFixed(1)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        color: colors.gray,
                      }}
                    >
                      ({totalSales} sales)
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 24,
                    color: colors.foreground,
                    marginBottom: 4,
                    letterSpacing: -0.5,
                  }}
                >
                  {totalSales}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Sales
                </Text>
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 24,
                    color: colors.foreground,
                    marginBottom: 4,
                    letterSpacing: -0.5,
                  }}
                >
                  {listingsCount || 0}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Listings
                </Text>
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: colors.border }} />
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 24,
                    color: colors.foreground,
                    marginBottom: 4,
                    letterSpacing: -0.5,
                  }}
                >
                  {savedCount || 0}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    color: colors.gray,
                  }}
                >
                  Saved
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const MenuItem = ({ icon: Icon, label, value }) => (
    <TouchableOpacity
      onPress={() => handleMenuPress(label)}
      style={{
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 18,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Icon size={20} color={colors.foreground} strokeWidth={2} style={{ marginRight: 16 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_600SemiBold",
          fontSize: 15,
          color: colors.foreground,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            color: colors.foreground,
            marginRight: 8,
          }}
        >
          {value}
        </Text>
      )}
      <ChevronRight size={20} color={colors.gray} strokeWidth={2} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Header />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.foreground,
                marginBottom: 16,
              }}
            >
              {section.title}
            </Text>
            {section.items.map((item, itemIndex) => (
              <MenuItem key={itemIndex} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </View>
        ))}

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            backgroundColor: colors.destructive,
            borderRadius: 12,
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <LogOut size={20} color={colors.background} strokeWidth={2} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
              color: colors.background,
              marginLeft: 12,
            }}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
