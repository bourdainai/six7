import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { OnboardingFormData } from "@/pages/SellerOnboardingMultiStep";

const OnboardingStepBusiness = () => {
  const form = useFormContext<OnboardingFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Business Details</h3>
        <p className="text-sm text-muted-foreground">
          Please provide your business information for tax and verification purposes.
        </p>
      </div>

      <FormField
        control={form.control}
        name="businessName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Name *</FormLabel>
            <FormControl>
              <Input placeholder="Acme Corporation Ltd" {...field} />
            </FormControl>
            <FormDescription>The legal name of your business</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default OnboardingStepBusiness;
