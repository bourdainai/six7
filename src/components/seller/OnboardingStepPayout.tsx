import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import type { OnboardingFormData } from "@/pages/SellerOnboardingMultiStep";

const OnboardingStepPayout = () => {
  const form = useFormContext<OnboardingFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Bank Account Information</h3>
        <p className="text-sm text-muted-foreground">
          Provide your bank account details to receive payouts from sales.
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your bank account information is encrypted and securely stored. We use Stripe to process payments.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="accountHolderName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Holder Name</FormLabel>
            <FormControl>
              <Input placeholder="John Doe" {...field} />
            </FormControl>
            <FormDescription>Name as it appears on the bank account</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="accountNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Number</FormLabel>
            <FormControl>
              <Input type="text" placeholder="12345678" {...field} />
            </FormControl>
            <FormDescription>Your bank account number</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="routingNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Routing Number / Sort Code</FormLabel>
            <FormControl>
              <Input type="text" placeholder="12-34-56" {...field} />
            </FormControl>
            <FormDescription>
              For UK: Sort code (e.g., 12-34-56). For US: Routing number (9 digits)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="accountType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default OnboardingStepPayout;

