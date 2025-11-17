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
              <Input 
                type="text" 
                placeholder="12345678" 
                {...field}
                onChange={(e) => {
                  // Allow alphanumeric for account numbers (some banks use letters)
                  const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormDescription>Your bank account number</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="routingNumber"
        render={({ field }) => {
          const country = form.watch("country");
          const isUK = country === "GB";
          const isUS = country === "US";
          
          return (
            <FormItem>
              <FormLabel>Routing Number / Sort Code</FormLabel>
              <FormControl>
                <Input 
                  type="text" 
                  placeholder={isUK ? "12-34-56" : isUS ? "123456789" : "Routing number"}
                  maxLength={isUK ? 8 : isUS ? 9 : undefined}
                  {...field}
                  onChange={(e) => {
                    let value = e.target.value;
                    
                    if (isUK) {
                      // UK sort code: format as XX-XX-XX
                      value = value.replace(/[^0-9]/g, ''); // Remove non-digits
                      if (value.length > 2) value = value.slice(0, 2) + '-' + value.slice(2);
                      if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
                      if (value.length > 8) value = value.slice(0, 8);
                    } else if (isUS) {
                      // US routing number: 9 digits only
                      value = value.replace(/[^0-9]/g, '').slice(0, 9);
                    } else {
                      // Other countries: allow numbers and hyphens
                      value = value.replace(/[^0-9-]/g, '');
                    }
                    
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <FormDescription>
                {isUK && "UK sort code format: XX-XX-XX (e.g., 12-34-56)"}
                {isUS && "US routing number: 9 digits (e.g., 123456789)"}
                {!isUK && !isUS && "Enter your routing number or sort code"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="accountType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
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

