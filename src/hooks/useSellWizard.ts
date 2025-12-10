import { useState, useCallback, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";

type ConditionType = Database["public"]["Enums"]["condition_type"];

export interface CardData {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  imageUrl: string;
  marketPrice?: number;
  priceLow?: number;
  priceHigh?: number;
}

export interface ListingDraft {
  // Card info (from AI/search)
  card: CardData | null;

  // User inputs
  condition: ConditionType | "";
  isGraded: boolean;
  gradingService: string;
  gradingScore: string;

  // Pricing
  price: number | "";
  acceptsOffers: boolean;

  // Images
  images: string[];  // Preview URLs
  imageFiles: File[];

  // Shipping
  freeShipping: boolean;
  shippingCost: number;

  // Extras
  description: string;
  aiEnabled: boolean;
}

export type WizardStep = "capture" | "details" | "shipping" | "publish";

const STEPS: WizardStep[] = ["capture", "details", "shipping", "publish"];

const STEP_TITLES: Record<WizardStep, string> = {
  capture: "Add Photos",
  details: "Card Details",
  shipping: "Shipping",
  publish: "Review & Publish",
};

const initialDraft: ListingDraft = {
  card: null,
  condition: "",
  isGraded: false,
  gradingService: "",
  gradingScore: "",
  price: "",
  acceptsOffers: true,
  images: [],
  imageFiles: [],
  freeShipping: false,
  shippingCost: 2.99,
  description: "",
  aiEnabled: true,
};

export function useSellWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("capture");
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case "capture":
        return draft.images.length > 0 || draft.card !== null;
      case "details":
        return draft.condition !== "" && draft.price !== "" && Number(draft.price) > 0;
      case "shipping":
        return true; // Always can proceed (has defaults)
      case "publish":
        return true;
      default:
        return false;
    }
  }, [currentStep, draft]);

  const goNext = useCallback(() => {
    if (!canProceed) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex, canProceed]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const goToStep = useCallback((step: WizardStep) => {
    const targetIndex = STEPS.indexOf(step);
    // Only allow going back or to current step
    if (targetIndex <= currentStepIndex) {
      setCurrentStep(step);
    }
  }, [currentStepIndex]);

  const updateDraft = useCallback((updates: Partial<ListingDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  }, []);

  const addImages = useCallback((files: File[]) => {
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setDraft(prev => ({
      ...prev,
      images: [...prev.images, ...newPreviews],
      imageFiles: [...prev.imageFiles, ...files],
    }));
  }, []);

  const removeImage = useCallback((index: number) => {
    setDraft(prev => {
      const newImages = [...prev.images];
      const newFiles = [...prev.imageFiles];
      // Revoke object URL to free memory
      URL.revokeObjectURL(newImages[index]);
      newImages.splice(index, 1);
      newFiles.splice(index, 1);
      return { ...prev, images: newImages, imageFiles: newFiles };
    });
  }, []);

  const setCard = useCallback((card: CardData | null) => {
    setDraft(prev => ({
      ...prev,
      card,
      // If card has market price, suggest it
      price: card?.marketPrice || prev.price,
    }));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep("capture");
    setDraft(initialDraft);
    setIsAnalyzing(false);
    setIsPublishing(false);
    setPublishedId(null);
    setBatchMode(false);
    setPublishedCount(0);
  }, []);

  // Reset for batch mode - keeps shipping preferences
  const resetForBatch = useCallback(() => {
    const preservedSettings = {
      freeShipping: draft.freeShipping,
      shippingCost: draft.shippingCost,
      aiEnabled: draft.aiEnabled,
      acceptsOffers: draft.acceptsOffers,
    };

    setCurrentStep("capture");
    setDraft({
      ...initialDraft,
      ...preservedSettings,
    });
    setIsAnalyzing(false);
    setIsPublishing(false);
    setPublishedId(null);
    setBatchMode(true);
    setPublishedCount(prev => prev + 1);
  }, [draft.freeShipping, draft.shippingCost, draft.aiEnabled, draft.acceptsOffers]);

  const startBatchMode = useCallback(() => {
    setBatchMode(true);
  }, []);

  const endBatchMode = useCallback(() => {
    setBatchMode(false);
    setPublishedCount(0);
  }, []);

  return {
    // State
    currentStep,
    currentStepIndex,
    draft,
    progress,
    isFirstStep,
    isLastStep,
    canProceed,
    isAnalyzing,
    isPublishing,
    publishedId,
    batchMode,
    publishedCount,

    // Step info
    steps: STEPS,
    stepTitles: STEP_TITLES,

    // Navigation
    goNext,
    goBack,
    goToStep,

    // Draft management
    updateDraft,
    addImages,
    removeImage,
    setCard,
    reset,
    resetForBatch,
    startBatchMode,
    endBatchMode,

    // Status setters
    setIsAnalyzing,
    setIsPublishing,
    setPublishedId,
  };
}

export type SellWizardState = ReturnType<typeof useSellWizard>;
