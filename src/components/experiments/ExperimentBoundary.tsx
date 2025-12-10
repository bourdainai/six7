import { ReactNode } from "react";
import { useExperiment } from "@/hooks/useExperiment";

interface ExperimentBoundaryProps {
  experimentId: string;
  variants: Record<string, ReactNode>;
  fallback?: ReactNode;
}

/**
 * Render different content based on experiment variant assignment.
 *
 * Usage:
 * ```tsx
 * <ExperimentBoundary
 *   experimentId="sell_flow_wizard"
 *   variants={{
 *     control: <OriginalFlow />,
 *     streamlined: <StreamlinedFlow />,
 *     camera_first: <CameraFirstFlow />,
 *   }}
 * />
 * ```
 */
export function ExperimentBoundary({
  experimentId,
  variants,
  fallback = null,
}: ExperimentBoundaryProps) {
  const { variant, isEnabled } = useExperiment(experimentId);

  if (!isEnabled) {
    // Return first variant (control) if experiment is disabled
    const controlVariant = Object.keys(variants)[0];
    return <>{variants[controlVariant] || fallback}</>;
  }

  return <>{variants[variant] || fallback}</>;
}

interface VariantProps {
  experimentId: string;
  variant: string;
  children: ReactNode;
}

/**
 * Only render children if user is in the specified variant.
 *
 * Usage:
 * ```tsx
 * <Variant experimentId="sell_price_suggestion" variant="auto_suggest">
 *   <AutoPriceSuggestion />
 * </Variant>
 * ```
 */
export function Variant({ experimentId, variant, children }: VariantProps) {
  const { isVariant, isEnabled } = useExperiment(experimentId);

  if (!isEnabled || !isVariant(variant)) {
    return null;
  }

  return <>{children}</>;
}

interface VariantFeatureProps {
  experimentId: string;
  variant: string;
  enabled: ReactNode;
  disabled?: ReactNode;
}

/**
 * Conditionally render content based on variant with fallback.
 *
 * Usage:
 * ```tsx
 * <VariantFeature
 *   experimentId="sell_success_screen"
 *   variant="social_share"
 *   enabled={<ShareButtons />}
 *   disabled={<DefaultButtons />}
 * />
 * ```
 */
export function VariantFeature({
  experimentId,
  variant,
  enabled,
  disabled = null,
}: VariantFeatureProps) {
  const { isVariant, isEnabled } = useExperiment(experimentId);

  if (isEnabled && isVariant(variant)) {
    return <>{enabled}</>;
  }

  return <>{disabled}</>;
}
