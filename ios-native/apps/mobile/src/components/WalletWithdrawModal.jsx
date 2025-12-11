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
import { X, Building2, ChevronRight, Plus, CheckCircle } from "lucide-react-native";
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
import { useRouter } from "expo-router";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#10B981",
};

export function WalletWithdrawModal({ open, onOpenChange, balance }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const MIN_WITHDRAWAL = 1;
  const MAX_WITHDRAWAL = 10000;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch user's bank accounts
  const { data: bankAccounts, isLoading: loadingBankAccounts } = useQuery({
    queryKey: ["bank-accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_verified", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Auto-select default bank account
  React.useEffect(() => {
    if (bankAccounts?.length > 0 && !selectedBankAccount) {
      const defaultAccount = bankAccounts.find((a) => a.is_default) || bankAccounts[0];
      setSelectedBankAccount(defaultAccount);
    }
  }, [bankAccounts, selectedBankAccount]);

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
      setSelectedBankAccount(null);
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

    if (val > (balance || 0)) {
      Alert.alert("Insufficient Funds", `You only have £${(balance || 0).toFixed(2)} in your wallet`);
      return;
    }

    if (!selectedBankAccount) {
      Alert.alert("Bank Account Required", "Please select a bank account for withdrawal");
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw £${val.toFixed(2)} to ${selectedBankAccount.bank_name} account ending in ${selectedBankAccount.account_last_four}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => withdrawMutation.mutate({ amount: val, bank_account_id: selectedBankAccount.id }),
        },
      ]
    );
  };

  const handleAddBankAccount = () => {
    onOpenChange(false);
    router.push("/settings");
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
              marginBottom: 24,
            }}
          >
            Withdraw funds to your linked bank account. Funds typically arrive in 1-2 business days.
          </Text>

          {/* Bank Account Selector */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
              color: colors.foreground,
              marginBottom: 12,
            }}
          >
            Bank Account
          </Text>

          {loadingBankAccounts ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator color={colors.foreground} />
            </View>
          ) : bankAccounts?.length === 0 ? (
            <TouchableOpacity
              onPress={handleAddBankAccount}
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 12,
                padding: 20,
                marginBottom: 24,
                alignItems: "center",
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: colors.border,
              }}
            >
              <Plus size={24} color={colors.gray} />
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: colors.gray,
                  marginTop: 8,
                }}
              >
                Add Bank Account
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: colors.gray,
                  marginTop: 4,
                }}
              >
                Go to Settings to add your bank details
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginBottom: 24 }}>
              {bankAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => setSelectedBankAccount(account)}
                  style={{
                    backgroundColor: selectedBankAccount?.id === account.id ? colors.green + "15" : colors.lightGray,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: selectedBankAccount?.id === account.id ? colors.green : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.background,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Building2 size={22} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                        color: colors.foreground,
                      }}
                    >
                      {account.bank_name || "Bank Account"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        color: colors.gray,
                        marginTop: 2,
                      }}
                    >
                      •••• {account.account_last_four || "****"}
                    </Text>
                  </View>
                  {selectedBankAccount?.id === account.id && (
                    <CheckCircle size={22} color={colors.green} />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={handleAddBankAccount}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                }}
              >
                <Plus size={16} color={colors.gray} />
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: colors.gray,
                    marginLeft: 6,
                  }}
                >
                  Add Another Account
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

            {/* Quick Amount Buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {[10, 50, 100].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  onPress={() => setAmount(Math.min(quickAmount, balance || 0).toString())}
                  disabled={quickAmount > (balance || 0)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.lightGray,
                    alignItems: "center",
                    opacity: quickAmount > (balance || 0) ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground }}>
                    £{quickAmount}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setAmount((balance || 0).toString())}
                disabled={!balance || balance <= 0}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: colors.lightGray,
                  alignItems: "center",
                  opacity: !balance || balance <= 0 ? 0.5 : 1,
                }}
              >
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.foreground }}>
                  All
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.gray,
                marginTop: 12,
              }}
            >
              Available: £{(balance || 0).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={withdrawMutation.isPending || !amount || !selectedBankAccount}
            style={{
              backgroundColor: colors.foreground,
              borderRadius: 8,
              paddingVertical: 16,
              alignItems: "center",
              opacity: withdrawMutation.isPending || !amount || !selectedBankAccount ? 0.6 : 1,
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
