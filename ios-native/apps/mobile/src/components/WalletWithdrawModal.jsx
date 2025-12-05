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
import { X } from "lucide-react-native";
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

export function WalletWithdrawModal({ open, onOpenChange, balance }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const MIN_WITHDRAWAL = 1;
  const MAX_WITHDRAWAL = 10000;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ amount, bank_account_id }) => {
      const { data, error } = await supabase.functions.invoke("wallet-withdraw", {
        body: { amount, bank_account_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Withdrawal Initiated",
        "Funds are on the way to your bank account. This typically takes 1-2 business days.",
        [{ text: "OK", onPress: () => onOpenChange(false) }]
      );
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      setAmount("");
    },
    onError: (error) => {
      Alert.alert("Withdrawal Failed", error.message || "Failed to process withdrawal");
    },
  });

  const handleWithdraw = () => {
    const val = parseFloat(amount);

    if (isNaN(val) || val < MIN_WITHDRAWAL) {
      Alert.alert("Invalid Amount", `Minimum withdrawal is £${MIN_WITHDRAWAL.toFixed(2)}`);
      return;
    }

    if (val > MAX_WITHDRAWAL) {
      Alert.alert("Maximum Exceeded", `Maximum withdrawal is £${MAX_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (val > balance) {
      Alert.alert("Insufficient Funds", `You only have £${balance.toFixed(2)} in your wallet`);
      return;
    }

    // TODO: Add bank account selector
    // For now, show alert that bank account selection is needed
    Alert.alert(
      "Bank Account Required",
      "Please add a bank account in settings before withdrawing funds.",
      [{ text: "OK" }]
    );
    // withdrawMutation.mutate({ amount: val, bank_account_id: "placeholder" });
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
              Withdraw Funds
            </Text>
            <TouchableOpacity onPress={() => onOpenChange(false)}>
              <X size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              color: colors.gray,
              marginBottom: 32,
            }}
          >
            Withdraw funds to your linked bank account. Funds typically arrive in 1-2 business days.
          </Text>

          {/* TODO: Bank Account Selector */}
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: colors.foreground,
                marginBottom: 8,
              }}
            >
              Bank Account
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.gray,
              }}
            >
              Add bank account in settings
            </Text>
          </View>

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
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                Min: £{MIN_WITHDRAWAL.toFixed(2)}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                }}
              >
                Max: £{MAX_WITHDRAWAL.toLocaleString()}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.gray,
                marginTop: 8,
              }}
            >
              Available: £{balance?.toFixed(2) || "0.00"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={withdrawMutation.isPending || !amount}
            style={{
              backgroundColor: colors.foreground,
              borderRadius: 8,
              paddingVertical: 16,
              alignItems: "center",
              opacity: withdrawMutation.isPending || !amount ? 0.6 : 1,
            }}
          >
            {withdrawMutation.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.background,
                }}
              >
                Confirm Withdrawal
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}


