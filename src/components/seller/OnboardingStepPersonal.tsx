import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OnboardingFormData } from "@/pages/SellerOnboardingMultiStep";

const OnboardingStepPersonal = () => {
  const form = useFormContext<OnboardingFormData>();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Please provide your personal details for identity verification.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name *</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name *</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="dateOfBirth"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date of Birth *</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormDescription>Format: YYYY-MM-DD</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number *</FormLabel>
            <FormControl>
              <Input 
                type="tel" 
                placeholder="+44 20 1234 5678" 
                {...field}
                onChange={(e) => {
                  // Allow digits, spaces, +, and hyphens
                  let value = e.target.value.replace(/[^\d+\s-]/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormDescription>UK format: +44 20 1234 5678 or 020 1234 5678</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="border-t pt-6">
        <h4 className="font-medium mb-4">Address *</h4>
        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address Line 1 *</FormLabel>
              <FormControl>
                <Input placeholder="123 Main Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="London" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postcode *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SW1A 1AA" 
                    {...field}
                    onChange={(e) => {
                      // Format UK postcode: convert to uppercase and add space if needed
                      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
                      // Auto-format: if 5-6 chars without space, add space before last 3 chars
                      if (value.length > 3 && value.length <= 6 && !value.includes(' ')) {
                        value = value.slice(0, -3) + ' ' + value.slice(-3);
                      }
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>UK format: SW1A 1AA</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default OnboardingStepPersonal;
