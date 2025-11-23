import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";

interface TrackingEvent {
  timestamp: string;
  status: string;
  message: string;
  location?: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  currentStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export const TrackingTimeline = ({
  events,
  currentStatus,
  trackingNumber,
  trackingUrl,
}: TrackingTimelineProps) => {
  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (lowerStatus.includes('transit') || lowerStatus.includes('route')) return <Truck className="h-5 w-5 text-blue-500" />;
    if (lowerStatus.includes('failed') || lowerStatus.includes('exception')) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (lowerStatus.includes('announced') || lowerStatus.includes('created')) return <Package className="h-5 w-5 text-gray-500" />;
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('delivered')) return 'default';
    if (lowerStatus.includes('transit') || lowerStatus.includes('route')) return 'secondary';
    if (lowerStatus.includes('failed')) return 'destructive';
    return 'outline';
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">Tracking Information</h3>
            {trackingNumber && (
              <p className="text-sm text-muted-foreground mt-1">
                Tracking #: {trackingNumber}
              </p>
            )}
          </div>
          <Badge variant={getStatusBadgeVariant(currentStatus)}>
            {currentStatus}
          </Badge>
        </div>

        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            Track on carrier website
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="space-y-4 pt-4">
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tracking events yet</p>
            </div>
          ) : (
            events.map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className="relative flex flex-col items-center">
                  {getStatusIcon(event.status)}
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2 absolute top-5" />
                  )}
                </div>

                <div className="flex-1 pb-8">
                  <div className="font-medium">{event.message}</div>
                  {event.location && (
                    <div className="text-sm text-muted-foreground">
                      {event.location}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.timestamp), 'PPp')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};