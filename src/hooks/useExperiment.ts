import { useState, useEffect, useCallback, useMemo } from "react";

// Experiment definitions
export interface ExperimentDefinition {
  id: string;
  name: string;
  description?: string;
  variants: string[];
  defaultVariant: string;
  // Percentage allocation per variant (should sum to 100)
  allocation?: Record<string, number>;
  // Whether experiment is active
  enabled: boolean;
}

// Define all experiments here
export const EXPERIMENTS: Record<string, ExperimentDefinition> = {
  sell_flow_wizard: {
    id: "sell_flow_wizard",
    name: "Sell Flow Wizard",
    description: "Test different sell flow UX variations",
    variants: ["control", "streamlined", "camera_first"],
    defaultVariant: "control",
    allocation: {
      control: 34,
      streamlined: 33,
      camera_first: 33,
    },
    enabled: true,
  },
  sell_price_suggestion: {
    id: "sell_price_suggestion",
    name: "Price Suggestion Placement",
    description: "Test auto vs manual price suggestion",
    variants: ["manual", "auto_suggest"],
    defaultVariant: "manual",
    allocation: {
      manual: 50,
      auto_suggest: 50,
    },
    enabled: true,
  },
  sell_success_screen: {
    id: "sell_success_screen",
    name: "Success Screen Variation",
    description: "Test different success screen CTAs",
    variants: ["default", "social_share", "batch_prompt"],
    defaultVariant: "default",
    allocation: {
      default: 34,
      social_share: 33,
      batch_prompt: 33,
    },
    enabled: false, // Disabled for now
  },
};

const STORAGE_KEY = "6seven_experiments";

interface ExperimentAssignments {
  [experimentId: string]: {
    variant: string;
    assignedAt: number;
  };
}

function getStoredAssignments(): ExperimentAssignments {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveAssignments(assignments: ExperimentAssignments): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  } catch {
    // Ignore storage errors
  }
}

function assignVariant(experiment: ExperimentDefinition): string {
  if (!experiment.enabled) {
    return experiment.defaultVariant;
  }

  const allocation = experiment.allocation;
  if (!allocation) {
    // Equal distribution if no allocation specified
    const randomIndex = Math.floor(Math.random() * experiment.variants.length);
    return experiment.variants[randomIndex];
  }

  // Weighted random selection based on allocation
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += allocation[variant] || 0;
    if (random < cumulative) {
      return variant;
    }
  }

  return experiment.defaultVariant;
}

export function useExperiment(experimentId: string) {
  const [variant, setVariant] = useState<string>(() => {
    const experiment = EXPERIMENTS[experimentId];
    if (!experiment) return "control";

    const assignments = getStoredAssignments();
    const existing = assignments[experimentId];

    if (existing) {
      return existing.variant;
    }

    // Assign new variant
    const newVariant = assignVariant(experiment);
    const newAssignments = {
      ...assignments,
      [experimentId]: {
        variant: newVariant,
        assignedAt: Date.now(),
      },
    };
    saveAssignments(newAssignments);

    return newVariant;
  });

  const experiment = EXPERIMENTS[experimentId];

  const isVariant = useCallback(
    (checkVariant: string) => variant === checkVariant,
    [variant]
  );

  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      // Log experiment event for analytics
      // This could be integrated with your analytics provider
      console.debug(`[Experiment ${experimentId}] ${eventName}`, {
        variant,
        ...properties,
      });

      // Example: Track with a custom analytics function
      // analytics.track(eventName, {
      //   experiment_id: experimentId,
      //   variant,
      //   ...properties,
      // });
    },
    [experimentId, variant]
  );

  return {
    variant,
    isVariant,
    experimentId,
    experimentName: experiment?.name || experimentId,
    isEnabled: experiment?.enabled ?? false,
    trackEvent,
  };
}

// Hook to get multiple experiments at once
export function useExperiments(experimentIds: string[]) {
  const experiments = useMemo(() => {
    return experimentIds.reduce(
      (acc, id) => {
        const experiment = EXPERIMENTS[id];
        if (!experiment) return acc;

        const assignments = getStoredAssignments();
        const existing = assignments[id];

        let variant: string;
        if (existing) {
          variant = existing.variant;
        } else {
          variant = assignVariant(experiment);
          const newAssignments = {
            ...assignments,
            [id]: {
              variant,
              assignedAt: Date.now(),
            },
          };
          saveAssignments(newAssignments);
        }

        acc[id] = { variant, isEnabled: experiment.enabled };
        return acc;
      },
      {} as Record<string, { variant: string; isEnabled: boolean }>
    );
  }, [experimentIds]);

  return experiments;
}

// Utility to reset all experiment assignments (for testing)
export function resetExperiments(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// Utility to force a specific variant (for testing/debugging)
export function forceVariant(experimentId: string, variant: string): void {
  if (typeof window === "undefined") return;
  const assignments = getStoredAssignments();
  assignments[experimentId] = {
    variant,
    assignedAt: Date.now(),
  };
  saveAssignments(assignments);
}
