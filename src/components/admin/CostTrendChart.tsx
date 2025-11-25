import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfMonth, subMonths } from "date-fns";
import type { ParcelData } from "@/types/shipping";

interface CostTrendChartProps {
  parcels: ParcelData[];
}

export function CostTrendChart({ parcels }: CostTrendChartProps) {
  const costData = useMemo(() => {
    // Get last 6 months
    const months: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      months.push(startOfMonth(subMonths(new Date(), i)));
    }

    const monthlyData = months.map(month => {
      const monthParcels = parcels.filter(parcel => {
        const parcelDate = new Date(parcel.created_at);
        return parcelDate.getMonth() === month.getMonth() && 
               parcelDate.getFullYear() === month.getFullYear();
      });

      const totalCost = monthParcels.reduce((sum, p) => sum + (Number(p.shipping_cost) || 0), 0);
      const count = monthParcels.length;
      const avgCost = count > 0 ? totalCost / count : 0;

      return {
        month: format(month, 'MMM yyyy'),
        totalCost: Number(totalCost.toFixed(2)),
        avgCost: Number(avgCost.toFixed(2)),
        shipments: count,
      };
    });

    return monthlyData;
  }, [parcels]);

  if (costData.every(d => d.totalCost === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cost data available for the past 6 months
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={costData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => `£${value.toFixed(2)}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="totalCost" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            name="Total Cost"
          />
          <Line 
            type="monotone" 
            dataKey="avgCost" 
            stroke="hsl(var(--success))" 
            strokeWidth={2}
            name="Avg Cost"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {costData.map((data) => (
          <div key={data.month} className="p-3 border rounded-lg">
            <p className="text-sm font-medium">{data.month}</p>
            <p className="text-lg font-bold">£{data.totalCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {data.shipments} shipments • £{data.avgCost.toFixed(2)} avg
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
