import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle, MessageCircle, ArrowRightLeft } from 'lucide-react';

interface TradeEvent {
  id: string;
  type: 'created' | 'countered' | 'accepted' | 'rejected' | 'message';
  user_name: string;
  timestamp: string;
  details?: string;
}

interface TradeTimelineProps {
  events: TradeEvent[];
}

export function TradeTimeline({ events }: TradeTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <ArrowRightLeft className="w-4 h-4" />;
      case 'countered':
        return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
      case 'accepted':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'created':
        return 'Trade Offer Created';
      case 'countered':
        return 'Counter Offer Made';
      case 'accepted':
        return 'Offer Accepted';
      case 'rejected':
        return 'Offer Rejected';
      case 'message':
        return 'Message Sent';
      default:
        return 'Event';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Trade History</h3>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {getIcon(event.type)}
              </div>
              {index < events.length - 1 && (
                <div className="absolute left-1/2 top-8 bottom-0 w-px bg-border -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{getLabel(event.type)}</p>
                  <p className="text-xs text-muted-foreground">by {event.user_name}</p>
                  {event.details && (
                    <p className="text-sm mt-1">{event.details}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
