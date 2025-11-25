import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ParcelData } from "@/types/shipping";

interface CarrierData {
  carrier: string;
  totalShipments: number;
  delivered: number;
  failed: number;
  inTransit: number;
  avgDeliveryDays: number;
}

interface CarrierPerformanceChartProps {
  parcels: ParcelData[];
}

export function CarrierPerformanceChart({ parcels }: CarrierPerformanceChartProps) {
  const carrierData = useMemo(() => {
    const carrierMap = new Map<string, CarrierData>();

    parcels.forEach((parcel) => {
      const carrier = parcel.carrier || 'Unknown';
      
      if (!carrierMap.has(carrier)) {
        carrierMap.set(carrier, {
          carrier,
          totalShipments: 0,
          delivered: 0,
          failed: 0,
          inTransit: 0,
          avgDeliveryDays: 0,
        });
      }

      const data = carrierMap.get(carrier)!;
      data.totalShipments++;

      if (parcel.status === 'delivered') {
        data.delivered++;
        // Calculate delivery time using created_at and updated_at as approximation
        if (parcel.created_at && parcel.updated_at) {
          const createdDate = new Date(parcel.created_at);
          const updatedDate = new Date(parcel.updated_at);
          const deliveryDays = Math.ceil((updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          data.avgDeliveryDays += Math.max(1, deliveryDays);
        }
      } else if (parcel.status === 'delivery_failed') {
        data.failed++;
      } else if (parcel.status === 'in_transit') {
        data.inTransit++;
      }
    });

    // Calculate average delivery days
    return Array.from(carrierMap.values()).map(data => ({
      ...data,
      avgDeliveryDays: data.delivered > 0 ? Number((data.avgDeliveryDays / data.delivered).toFixed(1)) : 0,
      successRate: data.totalShipments > 0 ? Number(((data.delivered / data.totalShipments) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.totalShipments - a.totalShipments);
  }, [parcels]);

  if (carrierData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No carrier data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={carrierData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="carrier" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="delivered" fill="hsl(var(--success))" name="Delivered" />
          <Bar dataKey="inTransit" fill="hsl(var(--primary))" name="In Transit" />
          <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Failed" />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid gap-4">
        {carrierData.map((carrier) => (
          <div key={carrier.carrier} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{carrier.carrier}</p>
              <p className="text-sm text-muted-foreground">
                {carrier.totalShipments} shipments • {carrier.successRate}% success rate
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{carrier.avgDeliveryDays} days</p>
              <p className="text-xs text-muted-foreground">avg delivery</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
