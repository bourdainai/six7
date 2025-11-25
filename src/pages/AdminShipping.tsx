import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  Truck,
  TestTube,
  Settings,
  BarChart3,
  Search,
  CheckCircle2
} from "lucide-react";
import { ShippingRateSelector } from '@/components/shipping/ShippingRateSelector';
import { ServicePointPicker } from '@/components/shipping/ServicePointPicker';
import { AddressValidationForm } from '@/components/shipping/AddressValidationForm';
import { CarrierPerformanceChart } from '@/components/admin/CarrierPerformanceChart';
import { CostTrendChart } from '@/components/admin/CostTrendChart';
import { format } from "date-fns";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

const AdminShipping = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [testOrderData, setTestOrderData] = useState({
    toName: "Test Buyer",
    toAddress: "123 Test Street",
    toCity: "London",
    toPostalCode: "SW1A 1AA",
    toCountry: "GB",
    weight: "0.5",
    carrier: "dpd",
  });

  // Fetch shipping analytics
  const { data: analytics } = useQuery({
    queryKey: ["admin", "shipping-analytics"],
    queryFn: async () => {
      const { data: parcels, error } = await supabase
        .from("sendcloud_parcels")
        .select("*, order:orders(total_amount, seller_id)")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const totalShipments = parcels?.length || 0;
      const totalCost = parcels?.reduce((sum, p) => sum + (p.shipping_cost || 0), 0) || 0;
      
      // Calculate actual average delivery time from parcels with delivery dates
      // Using created_at as ship date and updated_at for delivered parcels as approximation
      const deliveredParcels = parcels?.filter(p => 
        p.status === 'delivered' && p.created_at && p.updated_at
      ) || [];
      
      const avgDeliveryTime = deliveredParcels.length > 0
        ? deliveredParcels.reduce((sum, p) => {
            const createdDate = new Date(p.created_at);
            const updatedDate = new Date(p.updated_at);
            const days = Math.ceil((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + Math.max(1, days); // Min 1 day
          }, 0) / deliveredParcels.length
        : 0;
      
      const failedShipments = parcels?.filter(p => p.status === 'delivery_failed').length || 0;

      return {
        totalShipments,
        totalCost,
        avgDeliveryTime,
        failedShipments,
        parcels: parcels || [],
      };
    },
  });

  // Fetch recent shipments
  const { data: recentShipments } = useQuery({
    queryKey: ["admin", "recent-shipments", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("sendcloud_parcels")
        .select(`
          *,
          order:orders(
            id,
            buyer_id,
            seller_id,
            total_amount,
            buyer:profiles!buyer_id(full_name),
            seller:profiles!seller_id(full_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchTerm) {
        query = query.or(`tracking_number.ilike.%${searchTerm}%,order_id.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Test label creation
  const handleCreateTestLabel = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sendcloud-create-label', {
        body: {
          orderId: 'test-order-' + Date.now(),
          toAddress: {
            name: testOrderData.toName,
            address: testOrderData.toAddress,
            city: testOrderData.toCity,
            postalCode: testOrderData.toPostalCode,
            country: testOrderData.toCountry,
          },
          weight: parseFloat(testOrderData.weight),
          carrier: testOrderData.carrier,
          testMode: true,
        },
      });

      if (error) throw error;

      toast.success('Test label created successfully!');
      if (data.labelUrl) {
        window.open(data.labelUrl, '_blank');
      }
    } catch (error) {
      logger.error('Test label error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create test label');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'delivered': 'bg-green-500/10 text-green-500 border-green-500/20',
      'in_transit': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'processing': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      'delivery_failed': 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return colors[status] || 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            Shipping Management
          </h1>
          <p className="text-base text-muted-foreground font-normal tracking-tight mt-2">
            Monitor and manage all shipping operations
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalShipments || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Shipping Costs</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                £{analytics?.totalCost.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Total spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.avgDeliveryTime.toFixed(1) || '0.0'} days
              </div>
              <p className="text-xs text-muted-foreground">Estimated average</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {analytics?.failedShipments || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="shipments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shipments">
              <Package className="h-4 w-4 mr-2" />
              Shipments
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="testing">
              <TestTube className="h-4 w-4 mr-2" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="service-points">
              Service Points
            </TabsTrigger>
            <TabsTrigger value="validation">
              Address Validation
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Shipments Tab */}
          <TabsContent value="shipments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Shipments</CardTitle>
                    <CardDescription>Monitor and search all shipping activity</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by tracking number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentShipments?.map((shipment: any) => (
                    <div
                      key={shipment.id}
                      className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">
                              {shipment.tracking_number || 'No tracking'}
                            </p>
                            <Badge className={getStatusColor(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Order #{shipment.order_id?.slice(0, 8)} • {shipment.carrier || 'Unknown carrier'}
                          </p>
                          {shipment.order && (
                            <p className="text-xs text-muted-foreground">
                              Seller: {shipment.order.seller?.full_name} → Buyer: {shipment.order.buyer?.full_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            £{shipment.shipping_cost?.toFixed(2) || '0.00'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(shipment.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!recentShipments || recentShipments.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      No shipments found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Carrier Performance</CardTitle>
                  <CardDescription>Delivery success rates and average delivery times by carrier</CardDescription>
                </CardHeader>
                <CardContent>
                  <CarrierPerformanceChart parcels={analytics?.parcels || []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Analysis</CardTitle>
                  <CardDescription>Shipping costs over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <CostTrendChart parcels={analytics?.parcels || []} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            // ... keep existing code
          </TabsContent>

          {/* Service Points Tab */}
          <TabsContent value="service-points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Service Point Lookup</CardTitle>
                <CardDescription>
                  Search for pickup points in any location to test the integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ServicePointPicker
                  country="NL"
                  postalCode="1012AB"
                  city="Amsterdam"
                  onSelect={(point) => {
                    logger.debug('Selected service point:', point);
                    toast.success(`Selected: ${point.name}`, {
                      description: `${point.street} ${point.houseNumber}, ${point.city}`,
                    });
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Point Integration Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">How to Use Service Points:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Enter a postal code and click "Find Locations"</li>
                    <li>Service points will appear sorted by distance</li>
                    <li>Click on a service point to select it</li>
                    <li>When creating a label, pass the service point ID</li>
                    <li>The label will be for pickup at that location</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Supported Countries:</h4>
                  <p className="text-sm text-muted-foreground">
                    NL, BE, DE, FR, ES, IT, AT, DK, PL, CZ and more EU countries
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Validation Tab */}
          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Address Validation</CardTitle>
                <CardDescription>
                  Validate addresses to ensure accurate delivery and reduce failed shipments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddressValidationForm
                  onValidated={(address, isValid) => {
                    logger.info('Validated address:', address, 'Valid:', isValid);
                    if (isValid) {
                      toast.success('Address validated successfully');
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address Validation Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Reduces Failed Deliveries
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Catch address errors before shipping, saving return costs
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Standardizes Formats
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Normalizes addresses to carrier-preferred formats
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Suggests Corrections
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Offers alternatives when addresses can't be found
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Improves Customer Trust
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Shows buyers their address is verified and deliverable
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Label Creation</CardTitle>
                <CardDescription>
                  Create test shipping labels to verify integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Recipient Name</Label>
                    <Input
                      value={testOrderData.toName}
                      onChange={(e) =>
                        setTestOrderData({ ...testOrderData, toName: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={testOrderData.toCity}
                      onChange={(e) =>
                        setTestOrderData({ ...testOrderData, toCity: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea
                      value={testOrderData.toAddress}
                      onChange={(e) =>
                        setTestOrderData({ ...testOrderData, toAddress: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={testOrderData.toPostalCode}
                      onChange={(e) =>
                        setTestOrderData({ ...testOrderData, toPostalCode: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Country Code</Label>
                    <Select
                      value={testOrderData.toCountry}
                      onValueChange={(value) =>
                        setTestOrderData({ ...testOrderData, toCountry: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={testOrderData.weight}
                      onChange={(e) =>
                        setTestOrderData({ ...testOrderData, weight: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Carrier</Label>
                    <Select
                      value={testOrderData.carrier}
                      onValueChange={(value) =>
                        setTestOrderData({ ...testOrderData, carrier: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dpd">DPD</SelectItem>
                        <SelectItem value="royal-mail">Royal Mail</SelectItem>
                        <SelectItem value="hermes">Evri (Hermes)</SelectItem>
                        <SelectItem value="ups">UPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleCreateTestLabel} className="w-full">
                  <TestTube className="h-4 w-4 mr-2" />
                  Create Test Label
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shipping Configuration</CardTitle>
                <CardDescription>
                  Configure global shipping settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Carrier</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select default carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dpd">DPD</SelectItem>
                      <SelectItem value="royal-mail">Royal Mail</SelectItem>
                      <SelectItem value="hermes">Evri (Hermes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>SendCloud API Keys</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Manage your SendCloud integration credentials
                  </p>
                  <Button variant="outline">Update API Keys</Button>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Configuration</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Webhook URL for tracking updates
                  </p>
                  <Input 
                    value={`${window.location.origin}/api/sendcloud-webhook`} 
                    readOnly 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminShipping;
