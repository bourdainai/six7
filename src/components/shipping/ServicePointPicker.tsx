import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Phone, Mail, Navigation, Map as MapIcon, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { logger } from '@/lib/logger';

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
  const [searchRadius, setSearchRadius] = useState(16093); // 10 miles in meters
  const [localPostalCode, setLocalPostalCode] = useState(postalCode);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

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

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.debug('Location access denied:', error);
        }
      );
    }
  }, []);

  // Load Mapbox public token from backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-public-token');
        if (error) throw error;
        if (!data?.token) {
          console.error('Mapbox token response missing token');
          return;
        }
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Failed to load Mapbox token', err);
      }
    };

    fetchToken();
  }, []);

  // Initialize and update map
  useEffect(() => {
    if (!mapContainer.current || servicePoints.length === 0 || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Initialize map if not exists
    if (!map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      
      // Add service points to bounds
      servicePoints.forEach(point => {
        bounds.extend([point.longitude, point.latitude]);
      });

      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        bounds: bounds,
        fitBoundsOptions: { padding: 50 },
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    } else {
      // Update bounds for existing map
      const bounds = new mapboxgl.LngLatBounds();
      servicePoints.forEach(point => {
        bounds.extend([point.longitude, point.latitude]);
      });
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }
      map.current.fitBounds(bounds, { padding: 50 });
    }

    // Add user location marker
    if (userLocation) {
      const userMarker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Your Location</div>'))
        .addTo(map.current);
      markers.current.push(userMarker);
    }

    // Add service point markers
    servicePoints.forEach(point => {
      const el = document.createElement('div');
      el.className = 'service-point-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';
      
      const isSelected = selectedServicePoint?.id === point.id;
      if (isSelected) {
        el.style.filter = 'hue-rotate(90deg)';
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.longitude, point.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <div class="font-semibold">${point.name}</div>
              <div class="text-sm text-muted-foreground">${point.street} ${point.houseNumber}</div>
              <div class="text-sm text-muted-foreground">${point.postalCode} ${point.city}</div>
              <div class="text-xs mt-1">
                <span class="font-medium">${point.carrier}</span>
                ${point.distance ? ` • ${formatDistance(point.distance)}` : ''}
              </div>
            </div>
          `)
        )
        .addTo(map.current);

      el.addEventListener('click', () => {
        onSelect(point);
      });

      markers.current.push(marker);
    });

    return () => {
      // Cleanup markers on unmount
      if (servicePoints.length === 0) {
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
      }
    };
  }, [servicePoints, selectedServicePoint, userLocation, onSelect, mapboxToken]);

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
          <Label htmlFor="radius">Radius (mi)</Label>
          <Input
            id="radius"
            type="number"
            value={Math.round(searchRadius / 1609.34)} // Convert meters to miles for display
            onChange={(e) => setSearchRadius(Number(e.target.value) * 1609.34)} // Convert miles to meters
            min={1}
            max={50}
            step={5}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchServicePoints} disabled={loading}>
            {loading ? 'Searching...' : 'Find Locations'}
          </Button>
        </div>
      </div>

      {servicePoints.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mobile: Tabs for List/Map */}
          <div className="lg:hidden">
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-2">
                  <MapIcon className="h-4 w-4" />
                  Map
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-4">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {servicePoints.map((point) => (
                    <ServicePointCard
                      key={point.id}
                      point={point}
                      isSelected={selectedServicePoint?.id === point.id}
                      onSelect={onSelect}
                      formatDistance={formatDistance}
                      formatOpeningHours={formatOpeningHours}
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="map" className="mt-4">
                <div 
                  ref={mapContainer} 
                  className="w-full h-[500px] rounded-lg border border-border"
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: Side by Side */}
          <div className="hidden lg:block">
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {servicePoints.map((point) => (
                <ServicePointCard
                  key={point.id}
                  point={point}
                  isSelected={selectedServicePoint?.id === point.id}
                  onSelect={onSelect}
                  formatDistance={formatDistance}
                  formatOpeningHours={formatOpeningHours}
                />
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div 
              ref={mapContainer} 
              className="w-full h-[600px] rounded-lg border border-border sticky top-4"
            />
          </div>
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

// Extracted ServicePointCard component for reusability
const ServicePointCard = ({
  point,
  isSelected,
  onSelect,
  formatDistance,
  formatOpeningHours,
}: {
  point: ServicePoint;
  isSelected: boolean;
  onSelect: (point: ServicePoint) => void;
  formatDistance: (meters?: number) => string;
  formatOpeningHours: (hours?: Record<string, any>) => string;
}) => (
  <Card
    className={`cursor-pointer transition-all ${
      isSelected 
        ? 'border-primary ring-2 ring-primary/20' 
        : 'hover:border-primary/50 hover:ring-1 hover:ring-primary/10'
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
);
