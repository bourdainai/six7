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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, CheckCircle } from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabase";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export function WalletDepositModal({ open, onOpenChange }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [depositComplete, setDepositComplete] = useState(false);

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
    onSuccess: (data) => {
      setDepositComplete(true);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      
      // TODO: Handle Stripe payment flow
      // For now, show success message
      setTimeout(() => {
        onOpenChange(false);
        setAmount("");
        setDepositComplete(false);
      }, 2000);
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
              <CheckCircle size={64} color="#10B981" />
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  color: colors.foreground,
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                Deposit Initiated!
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.gray,
                  textAlign: "center",
                }}
              >
                Complete payment to add funds to your wallet
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  color: colors.gray,
                  marginBottom: 32,
                }}
              >
                Add funds to your 6Seven wallet to make instant purchases with lower fees.
              </Text>

              <View style={{ marginBottom: 32 }}>
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


