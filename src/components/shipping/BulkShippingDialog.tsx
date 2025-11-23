import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Package, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkShippingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: any[];
  onSuccess?: () => void;
}

export const BulkShippingDialog = ({ open, onOpenChange, orders, onSuccess }: BulkShippingDialogProps) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  const eligibleOrders = orders.filter(o => o.status === 'paid' && !o.shipped_at);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(eligibleOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleToggleOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleCreateLabels = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('sendcloud-bulk-labels', {
        body: {
          orderIds: selectedOrders,
          presetId: presetId || null,
        },
      });

      if (error) throw error;

      setResults(data);
      
      if (data.successCount > 0) {
        toast.success(`Successfully created ${data.successCount} shipping labels`);
        if (data.errorCount > 0) {
          toast.warning(`Failed to create ${data.errorCount} labels`);
        }
        onSuccess?.();
      } else {
        toast.error('Failed to create any shipping labels');
      }
    } catch (error) {
      console.error('Bulk shipping error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create bulk labels');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bulk Create Shipping Labels
          </DialogTitle>
          <DialogDescription>
            Select orders and create shipping labels in bulk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results ? (
            <>
              {/* Preset Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Shipping Preset (Optional)
                </label>
                <Select value={presetId} onValueChange={setPresetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a preset or use default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preset</SelectItem>
                    {/* TODO: Load user's presets */}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Selection */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Select Orders ({selectedOrders.length} of {eligibleOrders.length})
                  </label>
                  <Checkbox
                    checked={selectedOrders.length === eligibleOrders.length && eligibleOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {eligibleOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={(checked) => handleToggleOrder(order.id, checked as boolean)}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              Order #{order.id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              £{Number(order.total_amount).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLabels}
                  disabled={isProcessing || selectedOrders.length === 0}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Labels...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Create {selectedOrders.length} Labels
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Results Display */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {results.totalProcessed}
                    </p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center border-green-500/20 bg-green-500/5">
                    <p className="text-2xl font-bold text-green-600">
                      {results.successCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Success</p>
                  </div>
                  <div className="border rounded-lg p-4 text-center border-red-500/20 bg-red-500/5">
                    <p className="text-2xl font-bold text-red-600">
                      {results.errorCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {results.results?.map((result: any) => (
                      <div
                        key={result.orderId}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-green-500/5 border-green-500/20"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <p className="text-sm">
                          Order #{result.orderId.slice(0, 8)} - Label created
                        </p>
                      </div>
                    ))}
                    {results.errors?.map((error: any) => (
                      <div
                        key={error.orderId}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-red-500/5 border-red-500/20"
                      >
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Order #{error.orderId.slice(0, 8)}</p>
                          <p className="text-muted-foreground text-xs">{error.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button onClick={() => onOpenChange(false)} className="w-full">
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
