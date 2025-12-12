import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, Stack } from "expo-router";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/utils/auth/useAuth";
import { WalletDepositModal } from "@/components/WalletDepositModal";
import { WalletWithdrawModal } from "@/components/WalletWithdrawModal";
import { format } from "date-fns";

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  yellow: "#F59E0B",
};

export default function WalletPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fetch wallet balance
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("wallet_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id || !wallet?.id) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!wallet?.id,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wallet"] }),
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] }),
    ]);
    setRefreshing(false);
  };

  if (!fontsLoaded) return null;

  const balance = Number(wallet?.balance || 0);
  const pendingBalance = Number(wallet?.pending_balance || 0);

  const getTransactionIcon = (type, status) => {
    if (status === "pending") {
      return <Clock size={20} color={colors.yellow} strokeWidth={2} />;
    }
    if (status === "failed") {
      return <XCircle size={20} color={colors.red} strokeWidth={2} />;
    }
    switch (type) {
      case "deposit":
        return <ArrowDownLeft size={20} color={colors.green} strokeWidth={2} />;
      case "withdrawal":
        return <ArrowUpRight size={20} color={colors.red} strokeWidth={2} />;
      case "purchase":
        return <ArrowUpRight size={20} color={colors.red} strokeWidth={2} />;
      case "sale":
        return <ArrowDownLeft size={20} color={colors.green} strokeWidth={2} />;
      case "refund":
        return <ArrowDownLeft size={20} color={colors.blue} strokeWidth={2} />;
      default:
        return <Wallet size={20} color={colors.gray} strokeWidth={2} />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case "deposit":
      case "sale":
      case "refund":
        return colors.green;
      case "withdrawal":
      case "purchase":
        return colors.red;
      default:
        return colors.foreground;
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case "deposit":
        return "Deposit";
      case "withdrawal":
        return "Withdrawal";
      case "purchase":
        return "Purchase";
      case "sale":
        return "Sale";
      case "refund":
        return "Refund";
      default:
        return type;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

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
          Wallet
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View
          style={{
            margin: 16,
            backgroundColor: colors.foreground,
            borderRadius: 20,
            padding: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Wallet size={20} color={colors.background} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                color: "rgba(255,255,255,0.7)",
                marginLeft: 8,
              }}
            >
              Available Balance
            </Text>
          </View>
          
          {walletLoading ? (
            <ActivityIndicator color={colors.background} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 40,
                  color: colors.background,
                  marginBottom: 4,
                }}
              >
                £{balance.toFixed(2)}
              </Text>
              {pendingBalance > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Clock size={14} color={colors.yellow} strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      color: colors.yellow,
                      marginLeft: 6,
                    }}
                  >
                    £{pendingBalance.toFixed(2)} pending
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 12,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => setDepositModalOpen(true)}
            style={{
              flex: 1,
              backgroundColor: colors.green,
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ArrowDownLeft size={20} color={colors.background} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              Deposit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setWithdrawModalOpen(true)}
            style={{
              flex: 1,
              backgroundColor: colors.foreground,
              borderRadius: 12,
              paddingVertical: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ArrowUpRight size={20} color={colors.background} strokeWidth={2} />
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
                color: colors.background,
              }}
            >
              Withdraw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: colors.lightGray,
            borderRadius: 12,
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
            Why use your 6Seven Wallet?
          </Text>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle size={14} color={colors.green} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginLeft: 8,
                }}
              >
                Instant purchases - no payment delays
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle size={14} color={colors.green} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginLeft: 8,
                }}
              >
                Sales earnings deposited automatically
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <CheckCircle size={14} color={colors.green} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: colors.gray,
                  marginLeft: 8,
                }}
              >
                Withdraw to your bank anytime
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              color: colors.foreground,
              marginBottom: 16,
            }}
          >
            Transaction History
          </Text>

          {transactionsLoading ? (
            <ActivityIndicator color={colors.foreground} style={{ marginVertical: 40 }} />
          ) : transactions && transactions.length > 0 ? (
            <View style={{ gap: 8 }}>
              {transactions.map((tx) => (
                <View
                  key={tx.id}
                  style={{
                    backgroundColor: colors.lightGray,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
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
                    {getTransactionIcon(tx.type, tx.status)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                        color: colors.foreground,
                        marginBottom: 2,
                      }}
                    >
                      {getTransactionLabel(tx.type)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: colors.gray,
                      }}
                    >
                      {tx.description || format(new Date(tx.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </Text>
                    {tx.status === "pending" && (
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 11,
                          color: colors.yellow,
                          marginTop: 2,
                        }}
                      >
                        Pending
                      </Text>
                    )}
                    {tx.status === "failed" && (
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 11,
                          color: colors.red,
                          marginTop: 2,
                        }}
                      >
                        Failed
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 16,
                      color: getTransactionColor(tx.type),
                    }}
                  >
                    {tx.type === "deposit" || tx.type === "sale" || tx.type === "refund"
                      ? "+"
                      : "-"}
                    £{Number(tx.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: colors.lightGray,
                borderRadius: 12,
                padding: 40,
                alignItems: "center",
              }}
            >
              <Wallet size={40} color={colors.gray} strokeWidth={1.5} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  color: colors.foreground,
                  marginTop: 16,
                  marginBottom: 4,
                }}
              >
                No transactions yet
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: colors.gray,
                  textAlign: "center",
                }}
              >
                Make a deposit or purchase to see your transaction history
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <WalletDepositModal
        open={depositModalOpen}
        onOpenChange={setDepositModalOpen}
      />
      <WalletWithdrawModal
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        balance={balance}
      />
    </View>
  );
}

