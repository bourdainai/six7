import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
            <FormLabel>Business Name</FormLabel>
            <FormControl>
              <Input placeholder="Acme Corporation Ltd" {...field} />
            </FormControl>
            <FormDescription>The legal name of your business</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="businessTaxId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tax ID / EIN (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="12-3456789" {...field} />
            </FormControl>
            <FormDescription>Employer Identification Number or Tax ID</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="businessTypeCategory"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="corporation">Corporation</SelectItem>
                <SelectItem value="llc">Limited Liability Company (LLC)</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Legal structure of your business</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default OnboardingStepBusiness;

