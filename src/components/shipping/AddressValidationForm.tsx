import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAddressValidation } from '@/hooks/useAddressValidation';

interface AddressValidationFormProps {
  initialAddress?: {
    address: string;
    address2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  onValidated: (address: any, isValid: boolean) => void;
  autoValidate?: boolean;
}

export const AddressValidationForm = ({
  initialAddress,
  onValidated,
  autoValidate = false,
}: AddressValidationFormProps) => {
  const [address, setAddress] = useState(initialAddress || {
    address: '',
    address2: '',
    city: '',
    postalCode: '',
    country: 'NL',
  });

  const { validateAddress, validating, validationResult, clearValidation } = useAddressValidation();

  useEffect(() => {
    if (initialAddress && autoValidate) {
      handleValidate();
    }
  }, [initialAddress, autoValidate]);

  const handleValidate = async () => {
    const result = await validateAddress(address);
    onValidated(result.normalizedAddress || address, result.isValid);
  };

  const handleInputChange = (field: string, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    clearValidation();
  };

  const applySuggestion = (suggested: any) => {
    setAddress(suggested);
    clearValidation();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={address.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            placeholder="Street name and number"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="address2">Address Line 2 (Optional)</Label>
          <Input
            id="address2"
            value={address.address2}
            onChange={(e) => handleInputChange('address2', e.target.value)}
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            value={address.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            placeholder="Postal code"
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="City"
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={address.country}
            onChange={(e) => handleInputChange('country', e.target.value)}
            placeholder="Country code (e.g., NL, DE, BE)"
            maxLength={2}
          />
        </div>
      </div>

      <Button 
        onClick={handleValidate} 
        disabled={validating}
        className="w-full"
      >
        {validating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Validating...
          </>
        ) : (
          'Validate Address'
        )}
      </Button>

      {validationResult && (
        <Alert variant={validationResult.isValid ? 'default' : 'destructive'}>
          {validationResult.isValid ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {validationResult.isValid ? (
              'Address is valid and ready for shipping'
            ) : (
              <div className="space-y-2">
                <div>Address validation failed:</div>
                <ul className="list-disc list-inside text-sm">
                  {validationResult.issues?.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Did you mean?</CardTitle>
            <CardDescription>Select a suggested address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {validationResult.suggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => applySuggestion(suggestion)}
              >
                <div className="flex flex-col items-start">
                  <div>{suggestion.address}</div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.postalCode} {suggestion.city}, {suggestion.country}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {validationResult?.normalizedAddress && validationResult.isValid && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-sm">Validated Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div>{validationResult.normalizedAddress.address}</div>
            {validationResult.normalizedAddress.address2 && (
              <div>{validationResult.normalizedAddress.address2}</div>
            )}
            <div>
              {validationResult.normalizedAddress.postalCode} {validationResult.normalizedAddress.city}
            </div>
            <div>{validationResult.normalizedAddress.country}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
