import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Loader2 } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HelmetProvider } from "react-helmet-async";
import { CookieConsent } from "@/components/CookieConsent";

// Lazy load routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const SellEnhanced = lazy(() => import("./pages/SellEnhanced"));
const Browse = lazy(() => import("./pages/Browse"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Orders = lazy(() => import("./pages/Orders"));
const Messages = lazy(() => import("./pages/Messages"));
const Membership = lazy(() => import("./pages/Membership"));
const SavedItems = lazy(() => import("./pages/SavedItems"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SellerAnalytics = lazy(() => import("./pages/SellerAnalytics"));
const SellerReputation = lazy(() => import("./pages/SellerReputation"));
const SellerOnboardingMultiStep = lazy(() => import("./pages/SellerOnboardingMultiStep"));
const SellerAccountManagement = lazy(() => import("./pages/SellerAccountManagement"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const ModerationDashboard = lazy(() => import("./pages/ModerationDashboard"));
const FraudDashboard = lazy(() => import("./pages/FraudDashboard"));
const Bundles = lazy(() => import("./pages/Bundles"));
const BundleDetail = lazy(() => import("./pages/BundleDetail"));
const AutoRelistRules = lazy(() => import("./pages/AutoRelistRules"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure QueryClient with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 min
      gcTime: 1000 * 60 * 10, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
      refetchOnMount: true, // Refetch when component mounts if data is stale
    },
  },
});

// Lightweight loading fallback - just a small spinner, not full screen
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

// Routes component that uses location for transitions
const AppRoutes = () => {
  const location = useLocation();
  
  return (
    <PageTransition>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/sell" element={<SellEnhanced />} />
          <Route path="/sell-enhanced" element={<SellEnhanced />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/checkout/:id" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/saved" element={<SavedItems />} />
          <Route path="/bundles" element={<Bundles />} />
          <Route path="/bundle/:id" element={<BundleDetail />} />
          <Route path="/dashboard/seller" element={<SellerDashboard />} />
          <Route path="/seller/onboarding" element={<SellerOnboardingMultiStep />} />
          <Route path="/seller/account" element={<SellerAccountManagement />} />
          <Route path="/seller/analytics" element={<SellerAnalytics />} />
          <Route path="/seller/reputation" element={<SellerReputation />} />
          <Route path="/seller/automation" element={<AutoRelistRules />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/moderation" element={<ModerationDashboard />} />
          <Route path="/admin/fraud" element={<FraudDashboard />} />
          {/* Legal & Help Pages */}
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/returns" element={<ReturnPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </PageTransition>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
              <CookieConsent />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
