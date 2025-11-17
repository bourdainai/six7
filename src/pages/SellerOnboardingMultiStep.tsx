import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Form } from "@/components/ui/form";
import OnboardingStepPersonal from "@/components/seller/OnboardingStepPersonal";
import OnboardingStepBusiness from "@/components/seller/OnboardingStepBusiness";
import OnboardingStepPayout from "@/components/seller/OnboardingStepPayout";
import OnboardingStepReview from "@/components/seller/OnboardingStepReview";

// Zod schema for the complete form
const onboardingSchema = z.object({
  businessType: z.enum(["individual", "company"], {
    required_error: "Please select a business type",
  }),
  // Personal information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
  ssnLast4: z.string().regex(/^\d{4}$/, "SSN last 4 digits must be 4 numbers").optional(),
  personalIdNumber: z.string().min(1, "ID number is required").optional(),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone number is required"),
  // Business information (if company)
  businessName: z.string().optional(),
  businessTaxId: z.string().optional(),
  businessTypeCategory: z.string().optional(),
  // Bank account information
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z.string().min(1, "Routing number is required"),
  accountType: z.enum(["checking", "savings"], {
    required_error: "Please select an account type",
  }),
}).refine((data) => {
  // If company, require business fields
  if (data.businessType === "company") {
    return data.businessName && data.businessName.length > 0;
  }
  return true;
}, {
  message: "Business name is required for companies",
  path: ["businessName"],
}).refine((data) => {
  // Validate UK sort code format (XX-XX-XX)
  if (data.country === "GB") {
    const sortCodeRegex = /^\d{2}-\d{2}-\d{2}$/;
    return sortCodeRegex.test(data.routingNumber);
  }
  // Validate US routing number (9 digits)
  if (data.country === "US") {
    const routingRegex = /^\d{9}$/;
    return routingRegex.test(data.routingNumber);
  }
  return true;
}, {
  message: "Invalid routing number format for selected country",
  path: ["routingNumber"],
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: "business-type", title: "Business Type" },
  { id: "personal", title: "Personal Information" },
  { id: "business", title: "Business Details" },
  { id: "payout", title: "Bank Account" },
  { id: "review", title: "Review" },
];

const SellerOnboardingMultiStep = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessType: "individual",
      country: "GB",
      accountType: "checking",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    // Check if user already has a Connect account
    const checkExistingAccount = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id, stripe_onboarding_complete")
        .eq("id", user.id)
        .single();

      if (profile?.stripe_onboarding_complete) {
        toast({
          title: "Onboarding complete",
          description: "You have already completed onboarding.",
        });
        navigate("/seller/account");
        return;
      }

      if (profile?.stripe_connect_account_id) {
        setAccountId(profile.stripe_connect_account_id);
      }
    };

    checkExistingAccount();
  }, [user, navigate, toast]);

  const nextStep = async () => {
    const businessType = form.watch("businessType");
    const isIndividual = businessType === "individual";
    
    // Adjust step indices based on business type
    // Step 0: Business Type
    // Step 1: Personal Info
    // Step 2: Business Details (skip if individual)
    // Step 3: Payout (becomes step 2 if individual)
    // Step 4: Review (becomes step 3 if individual)
    
    const stepFields: Record<number, (keyof OnboardingFormData)[]> = {
      0: ["businessType"],
      1: ["firstName", "lastName", "dateOfBirth", "addressLine1", "city", "state", "postalCode", "country", "phone"],
      2: isIndividual ? [] : ["businessName", "businessTaxId", "businessTypeCategory"],
      3: ["accountHolderName", "accountNumber", "routingNumber", "accountType"],
      4: [],
    };

    const fieldsToValidate = stepFields[currentStep] || [];
    const isValid = fieldsToValidate.length === 0 || await form.trigger(fieldsToValidate as any);

    if (isValid) {
      let nextStepIndex = currentStep + 1;
      
      // Skip business step (step 2) if individual
      if (nextStepIndex === 2 && isIndividual) {
        nextStepIndex = 3;
      }
      
      // Adjust review step index
      const maxStep = isIndividual ? STEPS.length - 2 : STEPS.length - 1;
      
      if (nextStepIndex <= maxStep) {
        setCurrentStep(nextStepIndex);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const businessType = form.watch("businessType");
      const isIndividual = businessType === "individual";
      
      let prevStepIndex = currentStep - 1;
      
      // Skip business step (step 2) if individual when going back
      if (prevStepIndex === 2 && isIndividual) {
        prevStepIndex = 1;
      }
      
      setCurrentStep(prevStepIndex);
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Ensure we have an account ID
      let connectAccountId = accountId;
      
      if (!connectAccountId) {
        // Create account session to get/create account
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          "stripe-connect-account-session"
        );

        if (sessionError) throw sessionError;
        connectAccountId = sessionData.accountId;
        setAccountId(connectAccountId);
      }

      // Submit onboarding data
      const { data: result, error } = await supabase.functions.invoke("stripe-connect-onboard-complete", {
        body: {
          accountId: connectAccountId,
          formData: data,
        },
      });

      if (error) throw error;

      if (result?.success) {
        toast({
          title: "Onboarding submitted!",
          description: "Your information has been submitted. We'll verify it shortly.",
        });

        // Check if additional verification is needed
        if (result.requiresVerification) {
          toast({
            title: "Verification required",
            description: "Please check your email for verification instructions.",
            variant: "default",
          });
        }

        navigate("/seller/account");
      } else {
        // Handle specific error fields from bank account creation
        const errorMessage = result?.error || "Failed to submit onboarding";
        const errorField = result?.errorField;
        
        // If we have a specific field error, set it on the form
        if (errorField && form) {
          const fieldMap: Record<string, keyof OnboardingFormData> = {
            'accountNumber': 'accountNumber',
            'routingNumber': 'routingNumber',
            'accountHolderName': 'accountHolderName',
            'bank_account': 'accountNumber', // Default to account number
          };
          
          const formField = fieldMap[errorField];
          if (formField) {
            form.setError(formField, {
              type: 'server',
              message: errorMessage,
            });
            
            // Navigate to payout step if we're not already there
            const businessType = form.watch("businessType");
            const isIndividual = businessType === "individual";
            const payoutStep = isIndividual ? 2 : 3;
            setCurrentStep(payoutStep);
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("Error submitting onboarding:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const businessType = form.watch("businessType");
  const isIndividual = businessType === "individual";
  const totalSteps = isIndividual ? STEPS.length - 1 : STEPS.length; // Exclude business step for individuals
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isBusinessType = currentStep === 0;
  const isPersonalStep = currentStep === 1;
  const isBusinessStep = currentStep === 2 && !isIndividual;
  const isPayoutStep = currentStep === (isIndividual ? 2 : 3);
  const isReviewStep = currentStep === (isIndividual ? 3 : 4);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/seller")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Seller Setup</CardTitle>
            <CardDescription>
              Set up your payment details to start receiving payments from buyers
            </CardDescription>
              <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>Step {currentStep + 1} of {totalSteps}</span>
                <span>{STEPS[Math.min(currentStep, STEPS.length - 1)].title}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Business Type Step */}
                {isBusinessType && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Select Business Type</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card
                        className={`cursor-pointer transition-colors ${
                          form.watch("businessType") === "individual"
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => form.setValue("businessType", "individual")}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Individual</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Selling as an individual person
                              </p>
                            </div>
                            {form.watch("businessType") === "individual" && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      <Card
                        className={`cursor-pointer transition-colors ${
                          form.watch("businessType") === "company"
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => form.setValue("businessType", "company")}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">Company</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Selling as a business or company
                              </p>
                            </div>
                            {form.watch("businessType") === "company" && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Personal Information Step */}
                {isPersonalStep && <OnboardingStepPersonal />}

                {/* Business Details Step */}
                {isBusinessStep && form.watch("businessType") === "company" && <OnboardingStepBusiness />}

                {/* Payout Step */}
                {isPayoutStep && <OnboardingStepPayout />}

                {/* Review Step */}
                {isReviewStep && <OnboardingStepReview formData={form.getValues()} />}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 0 || isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  {currentStep < (isIndividual ? totalSteps - 1 : STEPS.length - 1) ? (
                    <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Onboarding"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerOnboardingMultiStep;

