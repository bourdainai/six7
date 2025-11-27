import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function DisputeManager() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Dispute Manager</CardTitle>
            <CardDescription className="text-sm">View and manage active disputes</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Navigate to the <span className="font-medium">Disputes</span> page to manage all disputes.
        </p>
      </CardContent>
    </Card>
  );
}
