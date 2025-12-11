import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, CheckCircle, Gift } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
  amber: "#F59E0B",
};

// Deposit bonus tiers
const DEPOSIT_BONUSES = [
  { threshold: 200, bonus: 0.05, label: "+5% bonus" },
  { threshold: 100, bonus: 0.03, label: "+3% bonus" },
  { threshold: 50, bonus: 0.02, label: "+2% bonus" },
];

const getDepositBonus = (amount) => {
  for (const tier of DEPOSIT_BONUSES) {
    if (amount >= tier.threshold) {
      return { bonus: amount * tier.bonus, percentage: tier.bonus * 100, tier };
    }
  }
  return { bonus: 0, percentage: 0, tier: null };
};

export function WalletDepositModal({ open, onOpenChange }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [depositComplete, setDepositComplete] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const depositMutation = useMutation({
    mutationFn: async ({ amount }) => {
      const { data, error } = await supabase.functions.invoke("wallet-deposit", {
        body: { amount, currency: "gbp" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (data?.url) {
        // Open Stripe checkout URL in browser
        setPaymentUrl(data.url);
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);
          // Show success state - user will complete payment in browser
          setDepositComplete(true);
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
        } else {
          Alert.alert("Error", "Cannot open payment page. Please try again.");
        }
      } else {
        // No URL returned, show generic success
        setDepositComplete(true);
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      }
    },
    onError: (error) => {
      Alert.alert("Deposit Failed", error.message || "Failed to initiate deposit");
    },
  });

  const handleDeposit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (val < 1) {
      Alert.alert("Minimum Deposit", "Minimum deposit amount is £1.00");
      return;
    }

    depositMutation.mutate({ amount: val });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 20,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                color: colors.foreground,
              }}
            >
              Deposit Funds
            </Text>
            <TouchableOpacity onPress={() => onOpenChange(false)}>
              <X size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {depositComplete ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
              <CheckCircle size={64} color={colors.green} />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: colors.foreground,
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                Payment Page Opened
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.gray,
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                Complete the payment in your browser.{"\n"}Your wallet will be credited once payment is confirmed.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDepositComplete(false);
                  setAmount("");
                  onOpenChange(false);
                }}
                style={{
                  backgroundColor: colors.foreground,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.background }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.gray,
                  marginBottom: 24,
                }}
              >
                Add funds to your 6Seven wallet to make instant purchases with zero buyer fees.
              </Text>

              {/* Bonus Tiers */}
              <View
                style={{
                  backgroundColor: colors.amber + "15",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <Gift size={18} color={colors.amber} />
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, marginLeft: 8 }}>
                    Deposit Bonuses
                  </Text>
                </View>
                {DEPOSIT_BONUSES.slice().reverse().map((tier, idx) => (
                  <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.gray }}>
                      Deposit £{tier.threshold}+
                    </Text>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.green }}>
                      {tier.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: colors.foreground,
                    marginBottom: 8,
                  }}
                >
                  Amount
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.lightGray,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 18,
                      color: colors.foreground,
                      paddingLeft: 16,
                    }}
                  >
                    £
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.gray}
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      fontFamily: "Inter_500Medium",
                      fontSize: 18,
                      color: colors.foreground,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: colors.gray,
                    marginTop: 8,
                  }}
                >
                  Minimum: £1.00
                </Text>
              </View>

              {/* Show bonus if applicable */}
              {(() => {
                const val = parseFloat(amount) || 0;
                const { bonus, percentage, tier } = getDepositBonus(val);
                if (bonus > 0) {
                  return (
                    <View
                      style={{
                        backgroundColor: colors.green + "15",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 24,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.foreground }}>
                        You'll receive
                      </Text>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.green }}>
                        £{(val + bonus).toFixed(2)} (+£{bonus.toFixed(2)})
                      </Text>
                    </View>
                  );
                }
                return null;
              })()}

              <TouchableOpacity
                onPress={handleDeposit}
                disabled={depositMutation.isPending || !amount}
                style={{
                  backgroundColor: colors.foreground,
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: depositMutation.isPending || !amount ? 0.6 : 1,
                }}
              >
                {depositMutation.isPending ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                      color: colors.background,
                    }}
                  >
                    Continue to Payment
                  </Text>
                )}
              </TouchableOpacity>

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                Secure payment powered by Stripe
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}


