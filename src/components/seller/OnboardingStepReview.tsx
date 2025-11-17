import type { OnboardingFormData } from "@/pages/SellerOnboardingMultiStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface OnboardingStepReviewProps {
  formData: OnboardingFormData;
  onEditStep?: (stepNumber: number) => void;
}

const OnboardingStepReview = ({ formData, onEditStep }: OnboardingStepReviewProps) => {
  // Safely get last 4 digits of account number
  const getAccountLast4 = () => {
    if (!formData.accountNumber || formData.accountNumber.length < 4) {
      return "****";
    }
    return formData.accountNumber.slice(-4);
  };

  // Check if bank account is incomplete
  const isBankAccountIncomplete = 
    !formData.accountHolderName || 
    !formData.accountNumber || 
    !formData.routingNumber || 
    !formData.accountType;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
        <p className="text-sm text-muted-foreground">
          Please review all information before submitting. You can go back to make changes.
        </p>
      </div>

      {/* Warning if bank account incomplete */}
      {isBankAccountIncomplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Bank account details are incomplete. Please go back and fill in all bank account information.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Business Type */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Business Type</CardTitle>
              {onEditStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(0)}
                  className="h-8"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="capitalize">
              {formData.businessType}
            </Badge>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Personal Information</CardTitle>
              {onEditStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(1)}
                  className="h-8"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{formData.firstName} {formData.lastName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date of Birth:</span>
                <p className="font-medium">{formData.dateOfBirth}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{formData.phone}</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <span className="text-muted-foreground">Address:</span>
              <p className="font-medium">
                {formData.addressLine1}
                <br />
                {formData.city}, {formData.state} {formData.postalCode}
                <br />
                {formData.country}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Business Details (if company) */}
        {formData.businessType === "company" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Business Details</CardTitle>
                {onEditStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditStep(2)}
                    className="h-8"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {formData.businessName ? (
                <div>
                  <span className="text-muted-foreground">Business Name:</span>
                  <p className="font-medium">{formData.businessName}</p>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No business name provided</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Account */}
        <Card className={isBankAccountIncomplete ? "border-destructive" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bank Account</CardTitle>
              {onEditStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditStep(3)}
                  className="h-8"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Account Holder:</span>
              <p className={`font-medium ${!formData.accountHolderName ? "text-destructive" : ""}`}>
                {formData.accountHolderName || "Not provided"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Account Number:</span>
                <p className={`font-medium ${!formData.accountNumber ? "text-destructive" : ""}`}>
                  {formData.accountNumber ? `****${getAccountLast4()}` : "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Routing Number:</span>
                <p className={`font-medium ${!formData.routingNumber ? "text-destructive" : ""}`}>
                  {formData.routingNumber || "Not provided"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Type:</span>
                <p className={`font-medium capitalize ${!formData.accountType ? "text-destructive" : ""}`}>
                  {formData.accountType || "Not provided"}
                </p>
              </div>
            </div>
            {isBankAccountIncomplete && (
              <div className="mt-3 pt-3 border-t border-destructive/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditStep?.(3)}
                  className="w-full"
                >
                  Complete Bank Account Details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingStepReview;

