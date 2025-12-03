import React, { ReactNode } from "react";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";
import { EmailVerificationBanner } from "./EmailVerificationBanner";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export const PageLayout = React.memo(({ children, className = "" }: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className={`flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-[72px] pb-24 lg:pb-12 w-full ${className}`}>
        <EmailVerificationBanner />
        {children}
      </main>
      <Footer />
    </div>
  );
});

