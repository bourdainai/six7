import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const VerificationRequirements = () => {
  const { user } = useAuth();

  const { data: requirements, isLoading } = useQuery({
    queryKey: ["verification-requirements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-requirements", {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const formatRequirementName = (requirement: string): string => {
    // Convert Stripe requirement codes to human-readable names
    const requirementMap: Record<string, string> = {
      "individual.verification.document": "Identity Document",
      "individual.verification.additional_document": "Additional Identity Document",
      "individual.verification.document_back": "Document Back",
      "business_profile.mcc": "Merchant Category Code",
      "business_profile.url": "Business Website",
      "business_profile.name": "Business Name",
      "external_account": "Bank Account",
      "individual.dob.day": "Date of Birth - Day",
      "individual.dob.month": "Date of Birth - Month",
      "individual.dob.year": "Date of Birth - Year",
      "individual.address.line1": "Address Line 1",
      "individual.address.city": "City",
      "individual.address.state": "State/Province",
      "individual.address.postal_code": "Postal Code",
      "individual.address.country": "Country",
      "individual.phone": "Phone Number",
      "individual.email": "Email",
      "individual.first_name": "First Name",
      "individual.last_name": "Last Name",
      "company.verification.document": "Company Verification Document",
      "company.verification.document_back": "Company Document Back",
      "company.name": "Company Name",
      "company.tax_id": "Tax ID",
      "company.address.line1": "Company Address",
      "company.phone": "Company Phone",
    };

    return requirementMap[requirement] || requirement.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Requirements</CardTitle>
          <CardDescription>Checking your account verification status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!requirements) {
    return null;
  }

  const currentlyDue = requirements.currently_due || [];
  const eventuallyDue = requirements.eventually_due || [];
  const pastDue = requirements.past_due || [];
  const disabledReason = requirements.disabled_reason;
  const chargesEnabled = requirements.charges_enabled;
  const detailsSubmitted = requirements.details_submitted;

  const hasRequirements = currentlyDue.length > 0 || eventuallyDue.length > 0 || pastDue.length > 0;
  const isFullyVerified = chargesEnabled && detailsSubmitted && !hasRequirements;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>
              {isFullyVerified
                ? "Your account is fully verified and ready to receive payments"
                : "Complete the requirements below to start receiving payments"}
            </CardDescription>
          </div>
          {isFullyVerified ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
              <AlertCircle className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFullyVerified ? (
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              Your Stripe Connect account is fully verified. You can receive payments from buyers.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {disabledReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Account Disabled:</strong> {disabledReason}
                </AlertDescription>
              </Alert>
            )}

            {!chargesEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your account cannot receive payments yet. Please complete the verification requirements below.
                </AlertDescription>
              </Alert>
            )}

            {pastDue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Past Due (Required Immediately)
                </h4>
                <ul className="space-y-1">
                  {pastDue.map((req: string, idx: number) => (
                    <li key={idx} className="text-sm text-destructive flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {formatRequirementName(req)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentlyDue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Currently Due (Required Now)
                </h4>
                <ul className="space-y-1">
                  {currentlyDue.map((req: string, idx: number) => (
                    <li key={idx} className="text-sm text-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      {formatRequirementName(req)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eventuallyDue.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Eventually Due (Required Later)
                </h4>
                <ul className="space-y-1">
                  {eventuallyDue.map((req: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      {formatRequirementName(req)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasRequirements && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">
                  To complete verification, you may need to upload documents or provide additional information through
                  your Stripe account.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // The ConnectAccountManagement component will handle document uploads
                    // This button can scroll to it or we can add a note
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Complete Verification in Account Settings Above
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationRequirements;

