import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export function RefundProcessor() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Refund Processor</CardTitle>
            <CardDescription className="text-sm">Process refunds and reversals</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Navigate to the <span className="font-medium">Disputes</span> page to process refunds.
        </p>
      </CardContent>
    </Card>
  );
}
