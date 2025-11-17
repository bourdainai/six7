import type { OnboardingFormData } from "@/pages/SellerOnboardingMultiStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OnboardingStepReviewProps {
  formData: OnboardingFormData;
}

const OnboardingStepReview = ({ formData }: OnboardingStepReviewProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
        <p className="text-sm text-muted-foreground">
          Please review all information before submitting. You can go back to make changes.
        </p>
      </div>

      <div className="space-y-4">
        {/* Business Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Type</CardTitle>
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
            <CardTitle className="text-base">Personal Information</CardTitle>
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
              {formData.ssnLast4 && (
                <div>
                  <span className="text-muted-foreground">SSN Last 4:</span>
                  <p className="font-medium">****{formData.ssnLast4}</p>
                </div>
              )}
            </div>
            <div className="pt-2 border-t">
              <span className="text-muted-foreground">Address:</span>
              <p className="font-medium">
                {formData.addressLine1}
                {formData.addressLine2 && `, ${formData.addressLine2}`}
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
              <CardTitle className="text-base">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {formData.businessName && (
                <div>
                  <span className="text-muted-foreground">Business Name:</span>
                  <p className="font-medium">{formData.businessName}</p>
                </div>
              )}
              {formData.businessTaxId && (
                <div>
                  <span className="text-muted-foreground">Tax ID:</span>
                  <p className="font-medium">{formData.businessTaxId}</p>
                </div>
              )}
              {formData.businessTypeCategory && (
                <div>
                  <span className="text-muted-foreground">Business Type:</span>
                  <p className="font-medium capitalize">
                    {formData.businessTypeCategory.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Account Holder:</span>
              <p className="font-medium">{formData.accountHolderName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Account Number:</span>
                <p className="font-medium">****{formData.accountNumber.slice(-4)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Routing Number:</span>
                <p className="font-medium">{formData.routingNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Type:</span>
                <p className="font-medium capitalize">{formData.accountType}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingStepReview;

