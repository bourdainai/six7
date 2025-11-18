import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check, Edit } from "lucide-react";
import { Form } from "@/components/ui/form";
import OnboardingStepPersonal from "@/components/seller/OnboardingStepPersonal";
import OnboardingStepBusiness from "@/components/seller/OnboardingStepBusiness";
import OnboardingStepPayout from "@/components/seller/OnboardingStepPayout";
import OnboardingStepReview from "@/components/seller/OnboardingStepReview";

// Streamlined schema - UK only
const onboardingSchema = z.object({
  businessType: z.enum(["individual", "company"], {
    required_error: "Please select a business type",
  }),
  // Personal information - essential only
  firstName: z.string().min(1, "First name is required").max(100, "First name is too long"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name is too long"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
  addressLine1: z.string().min(1, "Address is required").max(200, "Address is too long"),
  city: z.string().min(1, "City is required").max(100, "City name is too long"),
  postalCode: z.string()
    .min(1, "Postcode is required")
    .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, "Invalid UK postcode format (e.g., SW1A 1AA)"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^(\+44|0)[1-9]\d{8,9}$/, "Invalid UK phone number format (e.g., +44 20 1234 5678 or 020 1234 5678)"),
  // Business information (only if company)
  businessName: z.string().optional(),
  // Bank account information - UK only
  accountHolderName: z.string().min(1, "Account holder name is required").max(100, "Name is too long"),
  accountNumber: z.string()
    .min(1, "Account number is required")
    .min(6, "Account number must be at least 6 characters")
    .max(17, "Account number must be no more than 17 characters")
    .regex(/^[A-Z0-9]+$/i, "Account number can only contain letters and numbers"),
  routingNumber: z.string().min(1, "Sort code is required"),
  accountType: z.enum(["checking", "savings"], {
    required_error: "Please select an account type",
  }),
}).refine((data) => {
  // If company, require business name
  if (data.businessType === "company") {
    return data.businessName && data.businessName.length > 0;
  }
  return true;
}, {
  message: "Business name is required for companies",
  path: ["businessName"],
}).refine((data) => {
  // Validate UK sort code format (XX-XX-XX)
  const sortCodeRegex = /^\d{2}-\d{2}-\d{2}$/;
  return sortCodeRegex.test(data.routingNumber);
}, {
  message: "Sort code must be in format XX-XX-XX (e.g., 12-34-56)",
  path: ["routingNumber"],
}).refine((data) => {
  // Validate date of birth - must be at least 18 years old
  const dob = new Date(data.dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
  return actualAge >= 18;
}, {
  message: "You must be at least 18 years old to create a seller account",
  path: ["dateOfBirth"],
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessType: "individual",
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
    
    // Determine which fields to validate based on current step
      let fieldsToValidate: FieldPath<OnboardingFormData>[] = [];
    
    if (currentStep === 0) {
      // Business Type step
      fieldsToValidate = ["businessType"];
    } else if (currentStep === 1) {
      // Personal Information step
      fieldsToValidate = ["firstName", "lastName", "dateOfBirth", "addressLine1", "city", "postalCode", "phone"];
    } else if (currentStep === 2) {
      // Step 2: Business (if company) OR Payout (if individual)
      if (isIndividual) {
        // For individual, step 2 is the payout step
        fieldsToValidate = ["accountHolderName", "accountNumber", "routingNumber", "accountType"];
      } else {
        // For company, step 2 is the business step
        fieldsToValidate = ["businessName"];
      }
    } else if (currentStep === 3) {
      // Step 3: Payout (if company) OR Review (if individual)
      if (isIndividual) {
        // For individual, step 3 is review - no validation needed
        fieldsToValidate = [];
      } else {
        // For company, step 3 is the payout step
        fieldsToValidate = ["accountHolderName", "accountNumber", "routingNumber", "accountType"];
      }
    } else if (currentStep === 4) {
      // Step 4: Review (company only) - no validation needed
      fieldsToValidate = [];
    }

      const isValid = fieldsToValidate.length === 0 || await form.trigger(fieldsToValidate);

    if (isValid) {
        const nextStepIndex = currentStep + 1;
      
      // Calculate max step based on business type
      // Individual: steps 0,1,2,3 (Business Type, Personal, Payout, Review)
      // Company: steps 0,1,2,3,4 (Business Type, Personal, Business, Payout, Review)
      const maxStep = isIndividual ? 4 : 5;
      
      if (nextStepIndex < maxStep) {
        setCurrentStep(nextStepIndex);
        setSubmitError(null); // Clear errors when moving forward
      }
    } else {
      // Show validation errors
      const errors = form.formState.errors;
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        toast({
          title: "Please fix errors",
          description: firstError.message,
          variant: "destructive",
        });
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
        prevStepIndex = 1; // Skip from step 3 (payout) back to step 1 (personal)
      }
      
      setCurrentStep(prevStepIndex);
      setSubmitError(null); // Clear errors when going back
    }
  };

  // Navigate to specific step from review
  // stepNumber: 0=Business Type, 1=Personal, 2=Business, 3=Payout, 4=Review
  const goToStep = (stepNumber: number) => {
    const businessType = form.watch("businessType");
    const isIndividual = businessType === "individual";
    
    // Convert logical step number to actual currentStep index
    let actualStep = stepNumber;
    
    if (stepNumber === 0) {
      actualStep = 0; // Business Type
    } else if (stepNumber === 1) {
      actualStep = 1; // Personal Info
    } else if (stepNumber === 2) {
      // Business step - only exists for company
      if (isIndividual) {
        // For individual, business step doesn't exist, go to personal instead
        actualStep = 1;
      } else {
        actualStep = 2; // Business step for company
      }
    } else if (stepNumber === 3) {
      // Payout step
      actualStep = isIndividual ? 2 : 3; // Individual: step 2, Company: step 3
    } else if (stepNumber === 4) {
      // Review step
      actualStep = isIndividual ? 3 : 4; // Individual: step 3, Company: step 4
    }
    
    setCurrentStep(actualStep);
    setSubmitError(null);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) return;

    setSubmitError(null);
    setIsSubmitting(true);
    
    try {
      // Validate all fields before submitting
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        const firstError = Object.values(errors)[0];
        const errorMessage = firstError?.message || "Please fill in all required fields";
        setSubmitError(errorMessage);
        toast({
          title: "Validation Error",
          description: errorMessage,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Double-check bank account fields are filled
      if (!data.accountHolderName || !data.accountNumber || !data.routingNumber || !data.accountType) {
        const errorMessage = "Please complete all bank account details";
        setSubmitError(errorMessage);
        toast({
          title: "Bank Account Required",
          description: errorMessage,
          variant: "destructive",
        });
        // Navigate to payout step
        const businessType = form.watch("businessType");
        const isIndividual = businessType === "individual";
        const payoutStep = isIndividual ? 2 : 3;
        setCurrentStep(payoutStep);
        setIsSubmitting(false);
        return;
      }

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
            'bank_account': 'accountNumber',
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
      const errorMessage = err instanceof Error ? err.message : "Failed to submit onboarding. Please try again.";
      setSubmitError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const businessType = form.watch("businessType");
  const isIndividual = businessType === "individual";
  
  // Calculate total steps and progress
  const totalSteps = isIndividual ? 4 : 5; // Individual: 0,1,2,3 | Company: 0,1,2,3,4
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  // Determine which step we're on
  const isBusinessType = currentStep === 0;
  const isPersonalStep = currentStep === 1;
  const isBusinessStep = currentStep === 2 && !isIndividual;
  const isPayoutStep = currentStep === (isIndividual ? 2 : 3);
  const isReviewStep = currentStep === (isIndividual ? 3 : 4);

  // Get current step title for display
  const getStepTitle = () => {
    if (isBusinessType) return "Business Type";
    if (isPersonalStep) return "Personal Information";
    if (isBusinessStep) return "Business Details";
    if (isPayoutStep) return "Bank Account";
    if (isReviewStep) return "Review";
    return "Step";
  };

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
                <span>{getStepTitle()}</span>
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
                {isReviewStep && (
                  <OnboardingStepReview 
                    formData={form.getValues()} 
                    onEditStep={goToStep}
                  />
                )}

                {/* Error Display */}
                {submitError && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {submitError}
                  </div>
                )}

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
                  {!isReviewStep ? (
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
