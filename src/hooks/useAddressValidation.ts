import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Address {
  address: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
}

interface ValidationResult {
  isValid: boolean;
  normalizedAddress?: Address;
  issues?: string[];
  suggestions?: Address[];
  details?: {
    checks?: Record<string, boolean>;
    postcodeValid?: boolean;
    hasStreetNumber?: boolean;
  };
}

export const useAddressValidation = () => {
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateAddress = async (address: Address): Promise<ValidationResult> => {
    setValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sendcloud-validate-address', {
        body: address,
      });

      if (error) throw error;

      const result: ValidationResult = {
        isValid: data.isValid || false,
        normalizedAddress: data.normalizedAddress,
        issues: data.issues || data.details?.issues || [],
        suggestions: data.suggestions || [],
        details: data.details,
      };

      setValidationResult(result);

      if (!result.isValid) {
        toast.warning('Address validation issues', {
          description: result.issues?.join(', ') || 'Please check the address details',
        });
      } else if (result.normalizedAddress) {
        toast.success('Address validated successfully');
      }

      return result;
    } catch (error) {
      logger.error('Address validation error:', error);
      const result: ValidationResult = {
        isValid: false,
        issues: ['Failed to validate address'],
      };
      setValidationResult(result);
      toast.error('Failed to validate address');
      return result;
    } finally {
      setValidating(false);
    }
  };

  const clearValidation = () => {
    setValidationResult(null);
  };

  return {
    validateAddress,
    validating,
    validationResult,
    clearValidation,
  };
};
