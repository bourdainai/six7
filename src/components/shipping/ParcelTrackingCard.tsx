import { useShipping } from "@/hooks/useShipping";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Package, Truck, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ParcelTrackingCardProps {
  orderId: string;
}

const statusIcons: Record<string, any> = {
  announced: Package,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: CheckCircle2,
  exception: AlertCircle,
};

const statusColors: Record<string, string> = {
  announced: "bg-blue-500",
  in_transit: "bg-yellow-500",
  out_for_delivery: "bg-orange-500",
  delivered: "bg-green-500",
  exception: "bg-red-500",
};

export const ParcelTrackingCard = ({ orderId }: ParcelTrackingCardProps) => {
  const { getParcelTracking } = useShipping();
  const { data: parcel, isLoading } = getParcelTracking(orderId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (!parcel) {
    return null;
  }

  const StatusIcon = statusIcons[parcel.status] || Package;
  const statusColor = statusColors[parcel.status] || "bg-gray-500";

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${statusColor}`}>
              <StatusIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">Shipping Status</div>
              <div className="text-sm text-muted-foreground">
                {parcel.status_message || parcel.status}
              </div>
            </div>
          </div>
          <Badge variant={parcel.status === 'delivered' ? 'default' : 'secondary'}>
            {parcel.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {parcel.tracking_number && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Tracking Number</div>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {parcel.tracking_number}
              </code>
              {parcel.tracking_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a
                    href={parcel.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Track
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {parcel.carrier && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Carrier</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {parcel.carrier}
            </div>
          </div>
        )}

        {parcel.label_url && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a
              href={parcel.label_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Package className="h-4 w-4" />
              View Shipping Label
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}

        <div className="text-xs text-muted-foreground">
          Last updated {formatDistanceToNow(new Date(parcel.updated_at))} ago
        </div>
      </div>
    </Card>
  );
};