import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function FakeCardReviewQueue() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Shield className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Review Queue</CardTitle>
            <CardDescription className="text-sm">Check listings for counterfeit items</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Navigate to the <span className="font-medium">Fraud Detection</span> page to review flagged items.
        </p>
      </CardContent>
    </Card>
  );
}
