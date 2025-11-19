import { WalletBalance } from "@/components/wallet/WalletBalance";
import { WalletTransactions } from "@/components/wallet/WalletTransactions";
import { PageLayout } from "@/components/PageLayout";

export default function WalletPage() {
  return (
    <PageLayout>
      <div className="container py-8 space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your 6Seven balance, deposits, and withdrawals.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[350px_1fr]">
          <div className="space-y-6">
            <WalletBalance />
            <div className="p-4 border rounded-lg bg-muted/30 text-sm">
              <h4 className="font-medium mb-2">About 6Seven Wallet</h4>
              <p className="text-muted-foreground">
                Use your wallet balance to pay for cards instantly with lower fees.
                Withdrawals to UK bank accounts typically take 1-2 business days.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            <WalletTransactions />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

