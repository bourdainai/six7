import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, Stack } from "expo-router";
import { ArrowLeft, Calculator, Check, Shield, CreditCard } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  primary: "#0A0A0A",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  green: "#22C55E",
  greenLight: "#F0FDF4",
};

// Fee calculation logic matching backend
const FEE_CONFIG = {
  GBP: { baseFee: 0.40, percentThreshold: 20, percentRate: 0.01, symbol: "£" },
  USD: { baseFee: 0.50, percentThreshold: 25, percentRate: 0.01, symbol: "$" },
};

function calculateTieredFee(itemPrice, currency) {
  const config = FEE_CONFIG[currency] || FEE_CONFIG.GBP;
  
  let percentageFee = 0;
  if (itemPrice > config.percentThreshold) {
    percentageFee = (itemPrice - config.percentThreshold) * config.percentRate;
  }
  
  return {
    baseFee: config.baseFee,
    percentageFee: Math.round(percentageFee * 100) / 100,
    total: Math.round((config.baseFee + percentageFee) * 100) / 100,
  };
}

export default function Pricing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [itemPrice, setItemPrice] = useState("10");
  const [currency, setCurrency] = useState("GBP");
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  const price = parseFloat(itemPrice) || 0;
  const config = FEE_CONFIG[currency];
  const buyerFee = calculateTieredFee(price, currency);
  const sellerFee = calculateTieredFee(price, currency);
  const totalBuyerPays = price + buyerFee.total;
  const totalSellerReceives = price - sellerFee.total;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.lightGray,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color={colors.foreground} strokeWidth={2} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            color: colors.foreground,
            textAlign: "center",
            marginRight: 40,
          }}
        >
          Pricing & Fees
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              color: colors.foreground,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            Fair Fees for Everyone
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              color: colors.gray,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Both buyers and sellers pay a small fee.{"\n"}No hidden costs. No subscriptions.
          </Text>
        </View>

        {/* How It Works */}
        <View style={{ marginBottom: 32 }}>
          {/* Buyer Card */}
          <View
            style={{
              backgroundColor: colors.blueLight,
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.blue + "30",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Shield size={20} color={colors.blue} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.blue,
                  marginLeft: 8,
                }}
              >
                For Buyers
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              When you buy an item, you pay a small Transaction Fee:
            </Text>
            <View style={{ backgroundColor: "#FFFFFF80", borderRadius: 8, padding: 12 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                • Items under {config.symbol}20: Just {config.symbol}{config.baseFee.toFixed(2)}
              </Text>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground, marginTop: 4 }}>
                • Items over {config.symbol}20: {config.symbol}{config.baseFee.toFixed(2)} + 1% of amount over threshold
              </Text>
            </View>
          </View>

          {/* Seller Card */}
          <View
            style={{
              backgroundColor: colors.greenLight,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.green + "30",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <CreditCard size={20} color={colors.green} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.green,
                  marginLeft: 8,
                }}
              >
                For Sellers
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 12,
              }}
            >
              When your item sells, we take a small Transaction Fee:
            </Text>
            <View style={{ backgroundColor: "#FFFFFF80", borderRadius: 8, padding: 12 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                • Items under {config.symbol}20: Just {config.symbol}{config.baseFee.toFixed(2)}
              </Text>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground, marginTop: 4 }}>
                • Items over {config.symbol}20: {config.symbol}{config.baseFee.toFixed(2)} + 1% of amount over threshold
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <Check size={16} color={colors.green} strokeWidth={2.5} />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: colors.green,
                  marginLeft: 6,
                }}
              >
                Only pay when you sell. Listing is always free.
              </Text>
            </View>
          </View>
        </View>

        {/* Fee Calculator */}
        <View
          style={{
            backgroundColor: colors.lightGray,
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Calculator size={20} color={colors.foreground} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                color: colors.foreground,
                marginLeft: 8,
              }}
            >
              Calculate Your Fees
            </Text>
          </View>

          {/* Currency Toggle */}
          <View style={{ flexDirection: "row", marginBottom: 16 }}>
            {Object.keys(FEE_CONFIG).map((cur) => (
              <TouchableOpacity
                key={cur}
                onPress={() => setCurrency(cur)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: currency === cur ? colors.foreground : colors.background,
                  borderRadius: 8,
                  marginRight: cur === "GBP" ? 8 : 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: currency === cur ? colors.background : colors.foreground,
                    textAlign: "center",
                  }}
                >
                  {FEE_CONFIG[cur].symbol} {cur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: colors.gray,
                marginBottom: 8,
              }}
            >
              Item Price
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 24,
                  color: colors.gray,
                  marginRight: 8,
                }}
              >
                {config.symbol}
              </Text>
              <TextInput
                value={itemPrice}
                onChangeText={setItemPrice}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 24,
                  color: colors.foreground,
                  paddingVertical: 16,
                }}
              />
            </View>
          </View>

          {/* Results */}
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray }}>
                Buyer pays
              </Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>
                {config.symbol}{totalBuyerPays.toFixed(2)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray }}>
                Seller receives
              </Text>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.green }}>
                {config.symbol}{totalSellerReceives.toFixed(2)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.gray }}>
                Total fees
              </Text>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.gray }}>
                {config.symbol}{(buyerFee.total + sellerFee.total).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Examples */}
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: colors.foreground,
            marginBottom: 16,
          }}
        >
          Quick Examples
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[1, 5, 15, 50].map((examplePrice) => {
            const exFee = calculateTieredFee(examplePrice, currency);
            const exBuyerPays = examplePrice + exFee.total;
            const exSellerReceives = examplePrice - exFee.total;
            
            return (
              <View
                key={examplePrice}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: colors.lightGray,
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 16,
                    color: colors.foreground,
                    marginBottom: 8,
                  }}
                >
                  {config.symbol}{examplePrice} Card
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.gray }}>
                  Buyer pays: {config.symbol}{exBuyerPays.toFixed(2)}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.green }}>
                  Seller gets: {config.symbol}{exSellerReceives.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

