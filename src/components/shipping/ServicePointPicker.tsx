import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Phone, Mail, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServicePoint {
  id: string;
  code: string;
  name: string;
  carrier: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  openingHours?: Record<string, any>;
  distance?: number;
  isPickupPoint: boolean;
}

interface ServicePointPickerProps {
  country: string;
  postalCode: string;
  city?: string;
  carrierCode?: string;
  onSelect: (servicePoint: ServicePoint) => void;
  selectedServicePoint?: ServicePoint | null;
}

export const ServicePointPicker = ({
  country,
  postalCode,
  city,
  carrierCode,
  onSelect,
  selectedServicePoint,
}: ServicePointPickerProps) => {
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [localPostalCode, setLocalPostalCode] = useState(postalCode);

  const fetchServicePoints = async () => {
    if (!country || !localPostalCode) {
      toast.error('Please enter a postal code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendcloud-service-points', {
        body: {
          country,
          postalCode: localPostalCode,
          city,
          carrierCode,
          radius: searchRadius,
          limit: 20,
        },
      });

      if (error) throw error;

      setServicePoints(data.servicePoints || []);
      
      if (data.servicePoints?.length === 0) {
        toast.info('No pickup points found in this area', {
          description: 'Try increasing the search radius or changing the postal code'
        });
      }
    } catch (error) {
      console.error('Failed to fetch service points:', error);
      toast.error('Failed to load pickup points');
      setServicePoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postalCode) {
      setLocalPostalCode(postalCode);
    }
  }, [postalCode]);

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatOpeningHours = (hours?: Record<string, any>) => {
    if (!hours) return 'Opening hours not available';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today];
    if (!todayHours) return 'Closed today';
    return `Today: ${todayHours}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="postal-code">Postal Code</Label>
          <Input
            id="postal-code"
            value={localPostalCode}
            onChange={(e) => setLocalPostalCode(e.target.value)}
            placeholder="Enter postal code"
          />
        </div>
        <div className="w-32">
          <Label htmlFor="radius">Radius</Label>
          <Input
            id="radius"
            type="number"
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            min={1000}
            max={25000}
            step={1000}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchServicePoints} disabled={loading}>
            {loading ? 'Searching...' : 'Find Locations'}
          </Button>
        </div>
      </div>

      {servicePoints.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {servicePoints.map((point) => (
            <Card
              key={point.id}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                selectedServicePoint?.id === point.id ? 'border-primary bg-accent' : ''
              }`}
              onClick={() => onSelect(point)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{point.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {point.street} {point.houseNumber}, {point.postalCode} {point.city}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {point.carrier}
                    </Badge>
                    {point.distance && (
                      <Badge variant="outline" className="text-xs">
                        <Navigation className="h-3 w-3 mr-1" />
                        {formatDistance(point.distance)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1 text-xs text-muted-foreground">
                {point.openingHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatOpeningHours(point.openingHours)}
                  </div>
                )}
                {point.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {point.phone}
                  </div>
                )}
                {point.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {point.email}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedServicePoint && (
        <Card className="border-primary bg-accent/50">
          <CardHeader>
            <CardTitle className="text-sm">Selected Pickup Point</CardTitle>
            <CardDescription>
              {selectedServicePoint.name} - {selectedServicePoint.city}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
