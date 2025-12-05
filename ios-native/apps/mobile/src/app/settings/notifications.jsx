import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  ShoppingBag,
  Tag,
  ArrowLeftRight,
  DollarSign,
  Star,
} from "lucide-react-native";
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
import { registerForPushNotificationsAsync } from "@/utils/notifications";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
};

export default function NotificationSettings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] = useState("unknown");

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Notification preferences (stored locally for now, could be synced to Supabase)
  const [preferences, setPreferences] = useState({
    pushEnabled: true,
    messages: true,
    offers: true,
    orders: true,
    priceDrops: true,
    trades: true,
    promotions: false,
    reviews: true,
  });

  // Check notification permission status
  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    };
    checkPermissions();
  }, []);

  // Fetch user preferences from profile (if stored there)
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update preferences when profile loads
  useEffect(() => {
    if (profile?.notification_preferences) {
      setPreferences((prev) => ({
        ...prev,
        ...profile.notification_preferences,
      }));
    }
  }, [profile]);

  // Save preferences mutation
  const savePrefsMutation = useMutation({
    mutationFn: async (newPrefs) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: newPrefs })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-notifications"] });
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save notification preferences");
    },
  });

  const updatePreference = (key, value) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    savePrefsMutation.mutate(newPrefs);
  };

  const requestPermissions = async () => {
    try {
      const token = await registerForPushNotificationsAsync(user?.id);
      if (token) {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
        Alert.alert("Success", "Push notifications enabled!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to enable notifications. Please check your device settings.");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const NotificationToggle = ({ icon: Icon, title, description, value, onValueChange }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: colors.lightGray,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Icon size={20} color={colors.foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            color: colors.foreground,
          }}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.green }}
        thumbColor={colors.background}
        ios_backgroundColor={colors.border}
      />
    </View>
  );

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
          Notifications
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Banner */}
        {permissionStatus !== "granted" && (
          <TouchableOpacity
            onPress={requestPermissions}
            style={{
              backgroundColor: colors.foreground,
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Bell size={24} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.background,
                  marginBottom: 4,
                }}
              >
                Enable Push Notifications
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Stay updated on orders, messages, and offers
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Master Toggle */}
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Bell size={24} color={colors.foreground} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.foreground,
                }}
              >
                Push Notifications
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginTop: 2,
                }}
              >
                {preferences.pushEnabled ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={preferences.pushEnabled}
              onValueChange={(value) => updatePreference("pushEnabled", value)}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor={colors.background}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        {/* Notification Categories */}
        {preferences.pushEnabled && (
          <>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.gray,
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Notification Types
            </Text>

            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
              }}
            >
              <NotificationToggle
                icon={MessageCircle}
                title="Messages"
                description="New messages from buyers and sellers"
                value={preferences.messages}
                onValueChange={(value) => updatePreference("messages", value)}
              />

              <NotificationToggle
                icon={Tag}
                title="Offers"
                description="New offers on your listings"
                value={preferences.offers}
                onValueChange={(value) => updatePreference("offers", value)}
              />

              <NotificationToggle
                icon={ShoppingBag}
                title="Orders"
                description="Order updates and shipping notifications"
                value={preferences.orders}
                onValueChange={(value) => updatePreference("orders", value)}
              />

              <NotificationToggle
                icon={DollarSign}
                title="Price Drops"
                description="Price drops on saved items"
                value={preferences.priceDrops}
                onValueChange={(value) => updatePreference("priceDrops", value)}
              />

              <NotificationToggle
                icon={ArrowLeftRight}
                title="Trades"
                description="Trade offers and updates"
                value={preferences.trades}
                onValueChange={(value) => updatePreference("trades", value)}
              />

              <NotificationToggle
                icon={Star}
                title="Reviews"
                description="New reviews on your profile"
                value={preferences.reviews}
                onValueChange={(value) => updatePreference("reviews", value)}
              />

              <View style={{ paddingVertical: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: colors.lightGray,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Bell size={20} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 15,
                        color: colors.foreground,
                      }}
                    >
                      Promotions
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.gray,
                        marginTop: 2,
                      }}
                    >
                      Sales, discounts, and special offers
                    </Text>
                  </View>
                  <Switch
                    value={preferences.promotions}
                    onValueChange={(value) => updatePreference("promotions", value)}
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor={colors.background}
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {/* Info */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.gray,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            You can also manage notification permissions in your device's Settings app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}


