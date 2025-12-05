import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Shield,
  User,
  ChevronRight,
  Globe,
  Moon,
  Lock,
  Mail,
  Info,
  ExternalLink,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useAuth } from "@/utils/auth/useAuth";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export default function Settings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleSettingPress = (setting) => {
    switch (setting) {
      case "Notifications":
        router.push("/settings/notifications");
        break;
      case "Account Details":
        Alert.alert("Account Details", "Edit your account information");
        break;
      case "Payment Methods":
        Alert.alert("Payment Methods", "Manage your payment methods");
        break;
      case "Privacy":
        Linking.openURL("https://6seven.io/privacy");
        break;
      case "Security":
        Alert.alert("Security", "Manage your account security settings");
        break;
      case "Language":
        Alert.alert("Language", "Currently only English is supported");
        break;
      case "Appearance":
        Alert.alert("Appearance", "Dark mode coming soon!");
        break;
      case "Contact Support":
        Linking.openURL("mailto:support@6seven.io");
        break;
      case "About":
        Alert.alert("6Seven", "Version 1.0.0\n\nThe AI-Native Trading Marketplace");
        break;
      default:
        Alert.alert("Coming Soon", `${setting} is coming soon!`);
    }
  };

  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Account Details" },
        { icon: Bell, label: "Notifications" },
        { icon: CreditCard, label: "Payment Methods" },
      ],
    },
    {
      title: "Privacy & Security",
      items: [
        { icon: Shield, label: "Privacy" },
        { icon: Lock, label: "Security" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Globe, label: "Language", value: "English" },
        { icon: Moon, label: "Appearance", value: "Light" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: Mail, label: "Contact Support" },
        { icon: Info, label: "About" },
      ],
    },
  ];

  const SettingItem = ({ icon: Icon, label, value, external }) => (
    <TouchableOpacity
      onPress={() => handleSettingPress(label)}
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
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: colors.lightGray,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Icon size={18} color={colors.foreground} />
      </View>
      <Text
        style={{
          flex: 1,
          fontFamily: "Inter_500Medium",
          fontSize: 15,
          color: colors.foreground,
        }}
      >
        {label}
      </Text>
      {value && (
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: colors.gray,
            marginRight: 8,
          }}
        >
          {value}
        </Text>
      )}
      {external ? (
        <ExternalLink size={18} color={colors.gray} />
      ) : (
        <ChevronRight size={18} color={colors.gray} />
      )}
    </TouchableOpacity>
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
          Settings
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
        {/* User Info */}
        {user && (
          <View
            style={{
              backgroundColor: colors.lightGray,
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
                backgroundColor: colors.foreground,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: colors.background,
                }}
              >
                {user.email?.[0]?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.foreground,
                }}
              >
                {user.email}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginTop: 2,
                }}
              >
                Member since {new Date(user.created_at).getFullYear()}
              </Text>
            </View>
          </View>
        )}

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.gray,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {section.title}
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
              {section.items.map((item, itemIndex) => (
                <SettingItem
                  key={itemIndex}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  external={item.external}
                />
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: colors.gray,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          6Seven v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}


