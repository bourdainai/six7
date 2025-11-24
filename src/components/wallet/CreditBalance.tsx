import { useCredits } from "@/hooks/useCredits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Coins } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const CreditBalance = () => {
  const { balance, lifetimeEarned, isLoading } = useCredits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Selling Credits</CardTitle>
        <Coins className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">£{balance.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">
          £{lifetimeEarned.toFixed(2)} earned lifetime
        </p>
      </CardContent>
    </Card>
  );
};