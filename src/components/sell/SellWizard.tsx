import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { useHaptics } from "@/hooks/useHaptics";
import { supabase } from "@/integrations/supabase/client";
import { useSellWizard, type SellWizardState } from "@/hooks/useSellWizard";
import { CaptureStep } from "./steps/CaptureStep";
import { DetailsStep } from "./steps/DetailsStep";
import { ShippingStep } from "./steps/ShippingStep";
import { PublishStep } from "./steps/PublishStep";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

interface StepIndicatorProps {
  wizard: SellWizardState;
  onStepClick?: (step: any) => void;
}

function StepIndicator({ wizard, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {wizard.steps.map((step, index) => {
        const isActive = index === wizard.currentStepIndex;
        const isCompleted = index < wizard.currentStepIndex;

        return (
          <button
            key={step}
            onClick={() => onStepClick ? onStepClick(step) : wizard.goToStep(step)}
            disabled={index > wizard.currentStepIndex}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              isActive ? "w-8 bg-primary" : "w-2",
              isCompleted ? "bg-primary/60" : "bg-muted",
              index > wizard.currentStepIndex && "cursor-not-allowed opacity-50"
            )}
          />
        );
      })}
    </div>
  );
}

export function SellWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const haptics = useHaptics();
  const wizard = useSellWizard();
  const swipeThreshold = 80;

  // Track swipe direction for animations
  const direction = wizard.currentStepIndex;

  // Handle swipe gestures
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    // Only trigger if swipe was significant
    if (Math.abs(offset.x) < swipeThreshold && Math.abs(velocity.x) < 500) {
      return;
    }

    if (offset.x > 0 && !wizard.isFirstStep) {
      // Swipe right - go back
      haptics.light();
      wizard.goBack();
    } else if (offset.x < 0 && wizard.canProceed && !wizard.isLastStep) {
      // Swipe left - go forward
      haptics.medium();
      wizard.goNext();
    }
  }, [wizard, haptics, swipeThreshold]);

  // Wrapped navigation with haptics
  const handleGoNext = useCallback(() => {
    haptics.medium();
    wizard.goNext();
  }, [wizard, haptics]);

  const handleGoBack = useCallback(() => {
    haptics.light();
    wizard.goBack();
  }, [wizard, haptics]);

  const handleStepClick = useCallback((step: typeof wizard.currentStep) => {
    haptics.selection();
    wizard.goToStep(step);
  }, [wizard, haptics]);

  const handlePublish = useCallback(async () => {
    if (!user) {
      haptics.warning();
      toast({
        title: "Sign in required",
        description: "Please sign in to publish your listing",
        variant: "destructive",
      });
      return;
    }

    const { draft } = wizard;

    // Validation
    if (!draft.condition) {
      haptics.error();
      toast({ title: "Please select a condition", variant: "destructive" });
      return;
    }
    if (!draft.price || Number(draft.price) <= 0) {
      haptics.error();
      toast({ title: "Please set a price", variant: "destructive" });
      return;
    }
    if (draft.images.length === 0 && !draft.card?.imageUrl) {
      haptics.error();
      toast({ title: "Please add at least one photo", variant: "destructive" });
      return;
    }

    haptics.impact();
    wizard.setIsPublishing(true);

    try {
      // Generate title from card data or use default
      const title = draft.card
        ? `${draft.card.name} - ${draft.card.setName} ${draft.card.cardNumber}`
        : "Pokemon Card";

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title,
          description: draft.description || `${title} in ${draft.condition} condition.`,
          category: "Trading Cards",
          subcategory: "Pokémon Singles",
          seller_price: Number(draft.price),
          currency: "GBP",
          condition: draft.condition as any,
          is_graded: draft.isGraded,
          grading_service: draft.gradingService || null,
          grade_score: draft.gradingScore || null,
          set_code: draft.card?.setCode || null,
          card_number: draft.card?.cardNumber || null,
          rarity: draft.card?.rarity || null,
          free_shipping: draft.freeShipping,
          shipping_cost_uk: draft.freeShipping ? 0 : draft.shippingCost,
          accepts_offers: draft.acceptsOffers,
          ai_answer_engines_enabled: draft.aiEnabled,
          status: "active",
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Upload images
      const uploadedUrls: string[] = [];

      for (let i = 0; i < draft.imageFiles.length; i++) {
        const file = draft.imageFiles[i];
        const filePath = `listing-images/${listing.id}/${Date.now()}-${i}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) {
          logger.error("Upload error", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("listing-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // If we have card image but no uploaded images, use card image
      if (uploadedUrls.length === 0 && draft.card?.imageUrl) {
        uploadedUrls.push(draft.card.imageUrl);
      }

      // Insert image records
      if (uploadedUrls.length > 0) {
        const imageRecords = uploadedUrls.map((url, index) => ({
          listing_id: listing.id,
          image_url: url,
          display_order: index,
        }));

        await supabase.from("listing_images").insert(imageRecords);
      }

      wizard.setPublishedId(listing.id);
      haptics.success();

      toast({
        title: "Listed successfully! 🎉",
        description: "Your card is now live",
      });
    } catch (error) {
      logger.error("Publish error", error);
      haptics.error();
      toast({
        title: "Failed to publish",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      wizard.setIsPublishing(false);
    }
  }, [user, wizard, toast, haptics]);

  const handleClose = useCallback(() => {
    if (wizard.draft.images.length > 0 || wizard.draft.card) {
      if (confirm("Discard this listing?")) {
        navigate("/sell");
      }
    } else {
      navigate("/sell");
    }
  }, [wizard.draft, navigate]);

  // Success state
  if (wizard.publishedId) {
    const totalListed = wizard.publishedCount + 1;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-6"
        >
          <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <h2 className="text-xl font-semibold mb-1">Listed</h2>
        {wizard.batchMode && totalListed > 1 && (
          <p className="text-sm text-muted-foreground mb-6">
            {totalListed} cards listed this session
          </p>
        )}
        {!wizard.batchMode && (
          <p className="text-sm text-muted-foreground mb-6">
            Your card is now visible to buyers
          </p>
        )}

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            className="w-full h-12"
            onClick={() => {
              haptics.medium();
              wizard.resetForBatch();
            }}
          >
            List Another Card
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/listing/${wizard.publishedId}`)}
            >
              View
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                wizard.endBatchMode();
                navigate("/sell");
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={wizard.isFirstStep ? handleClose : handleGoBack}
            className="h-9 w-9"
          >
            {wizard.isFirstStep ? (
              <X className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1 px-4">
            <StepIndicator wizard={wizard} onStepClick={handleStepClick} />
          </div>

          <div className="w-9" />
        </div>

        <Progress value={wizard.progress} className="h-0.5 rounded-none" />
      </header>

      {/* Step Title */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">
            {wizard.stepTitles[wizard.currentStep]}
          </h1>
          {wizard.batchMode && wizard.publishedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {wizard.publishedCount} listed
            </span>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={wizard.currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="h-full overflow-y-auto touch-pan-y"
          >
            {wizard.currentStep === "capture" && <CaptureStep wizard={wizard} />}
            {wizard.currentStep === "details" && <DetailsStep wizard={wizard} />}
            {wizard.currentStep === "shipping" && <ShippingStep wizard={wizard} />}
            {wizard.currentStep === "publish" && <PublishStep wizard={wizard} onPublish={handlePublish} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!wizard.isLastStep && (
        <footer className="sticky bottom-0 bg-background border-t p-4 safe-area-inset-bottom">
          <Button
            className="w-full h-12"
            disabled={!wizard.canProceed}
            onClick={handleGoNext}
          >
            Continue
          </Button>
        </footer>
      )}
    </div>
  );
}
