import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Simplified PageTransition component that delegates animations to the
 * native View Transitions API via global CSS.
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  );
};
