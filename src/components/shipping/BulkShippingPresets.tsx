import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SelectItem } from "@/components/ui/select";
import type { ShippingPreset } from "@/types/shipping";

export const BulkShippingPresets = () => {
  const { data: presets } = useQuery({
    queryKey: ['shipping-presets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_presets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as unknown as ShippingPreset[];
    },
  });

  if (!presets || presets.length === 0) {
    return null;
  }

  return (
    <>
      {presets.map((preset) => (
        <SelectItem key={preset.id} value={preset.id}>
          {preset.name} ({preset.default_carrier})
        </SelectItem>
      ))}
    </>
  );
};
