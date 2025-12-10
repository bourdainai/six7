import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";

interface BankAccount {
  id: string;
  bank_name: string;
  last4: string;
  currency: string;
  country: string;
  default_for_currency: boolean;
}

interface BankAccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BankAccountSelector({ value, onChange }: BankAccountSelectorProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-get-bank-accounts');
      
      if (error) throw error;
      
      setBankAccounts(data.bankAccounts || []);
      setNeedsOnboarding(data.needsOnboarding || false);
      
      // Auto-select default bank account if available
      if (data.bankAccounts?.length > 0 && !value) {
        const defaultAccount = data.bankAccounts.find((acc: BankAccount) => acc.default_for_currency);
        onChange(defaultAccount?.id || data.bankAccounts[0].id);
      }
    } catch (error) {
      logger.error('Failed to fetch bank accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBankAccounts = () => {
    // Redirect to seller onboarding/management
    window.open('/seller/onboarding', '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Bank Account</Label>
        <div className="flex items-center justify-center p-4 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading bank accounts...</span>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="space-y-2">
        <Label>Bank Account</Label>
        <div className="p-4 border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">
            You need to complete seller onboarding to add a bank account for withdrawals.
          </p>
          <Button onClick={handleManageBankAccounts} size="sm" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Complete Seller Onboarding
          </Button>
        </div>
      </div>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Bank Account</Label>
        <div className="p-4 border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">
            No bank accounts found. Please add a bank account to your Stripe Connect account.
          </p>
          <Button onClick={handleManageBankAccounts} size="sm" variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Bank Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="bank-account">Bank Account</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="bank-account">
          <SelectValue placeholder="Select bank account" />
        </SelectTrigger>
        <SelectContent>
          {bankAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.bank_name || 'Bank'} ••••{account.last4}
              {account.default_for_currency && ' (Default)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button 
        onClick={handleManageBankAccounts} 
        size="sm" 
        variant="ghost" 
        className="w-full mt-2"
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        Manage Bank Accounts
      </Button>
    </div>
  );
}
