import "./styles/view-transitions.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PageTransition } from "@/components/PageTransition";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HelmetProvider } from "react-helmet-async";
import { CookieConsent } from "@/components/CookieConsent";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import { ListingSkeleton } from "@/components/skeletons/ListingSkeleton";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { FeedSkeleton } from "@/components/skeletons/FeedSkeleton";

// Lazy load routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Sell = lazy(() => import("./pages/SellItem"));
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
const SellerOnboarding = lazy(() => import("./pages/SellerOnboarding"));
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
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const SellerVerification = lazy(() => import("./pages/SellerVerification"));
const Wallet = lazy(() => import("./pages/Wallet"));
const TradeOffers = lazy(() => import("./pages/TradeOffers"));
const Feed = lazy(() => import("./pages/Feed"));
const APIKeys = lazy(() => import("./pages/Settings/APIKeys"));
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

// Routes component that uses location for transitions
const AppRoutes = () => {
  const location = useLocation();

  // Preload critical routes on mount
  useEffect(() => {
    // Use standard import() to trigger loading for critical paths
    const preloadCriticalRoutes = async () => {
      try {
        // We don't await these, just trigger them
        import("./pages/Index");
        import("./pages/Browse");
        import("./pages/SellItem");
        import("./pages/Feed");
      } catch (error) {
        console.error("Failed to preload critical routes:", error);
      }
    };

    // Delay slightly to prioritize initial render
    const timer = setTimeout(preloadCriticalRoutes, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <PageTransition>
      <Routes location={location}>
        <Route path="/" element={<Suspense fallback={<PageSkeleton />}><Index /></Suspense>} />
        <Route path="/sell" element={<Suspense fallback={<PageSkeleton />}><Sell /></Suspense>} />
        <Route path="/browse" element={<Suspense fallback={<PageSkeleton />}><Browse /></Suspense>} />
        <Route path="/listing/:id" element={<Suspense fallback={<ListingSkeleton />}><ListingDetail /></Suspense>} />
        <Route path="/checkout/:id" element={<Suspense fallback={<PageSkeleton />}><Checkout /></Suspense>} />
        <Route path="/orders" element={<Suspense fallback={<DashboardSkeleton />}><Orders /></Suspense>} />
        <Route path="/messages" element={<Suspense fallback={<DashboardSkeleton />}><Messages /></Suspense>} />
        <Route path="/membership" element={<Suspense fallback={<PageSkeleton />}><Membership /></Suspense>} />
        <Route path="/saved" element={<Suspense fallback={<FeedSkeleton />}><SavedItems /></Suspense>} />
        <Route path="/bundles" element={<Suspense fallback={<FeedSkeleton />}><Bundles /></Suspense>} />
        <Route path="/bundle/:id" element={<Suspense fallback={<ListingSkeleton />}><BundleDetail /></Suspense>} />
        <Route path="/dashboard/seller" element={<Suspense fallback={<DashboardSkeleton />}><SellerDashboard /></Suspense>} />
        <Route path="/seller/onboarding" element={<Suspense fallback={<PageSkeleton />}><SellerOnboarding /></Suspense>} />
        <Route path="/seller/account" element={<Suspense fallback={<DashboardSkeleton />}><SellerAccountManagement /></Suspense>} />
        <Route path="/seller/analytics" element={<Suspense fallback={<DashboardSkeleton />}><SellerAnalytics /></Suspense>} />
        <Route path="/seller/reputation" element={<Suspense fallback={<DashboardSkeleton />}><SellerReputation /></Suspense>} />
        <Route path="/seller/automation" element={<Suspense fallback={<DashboardSkeleton />}><AutoRelistRules /></Suspense>} />
        <Route path="/seller/verification" element={<Suspense fallback={<PageSkeleton />}><SellerVerification /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<DashboardSkeleton />}><AdminDashboard /></Suspense>} />
        <Route path="/admin/analytics" element={<Suspense fallback={<DashboardSkeleton />}><AdminAnalytics /></Suspense>} />
        <Route path="/admin/moderation" element={<Suspense fallback={<DashboardSkeleton />}><ModerationDashboard /></Suspense>} />
        <Route path="/admin/fraud" element={<Suspense fallback={<DashboardSkeleton />}><FraudDashboard /></Suspense>} />
        
        {/* Legal & Help Pages */}
        <Route path="/terms" element={<Suspense fallback={<PageSkeleton />}><TermsOfService /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageSkeleton />}><PrivacyPolicy /></Suspense>} />
        <Route path="/returns" element={<Suspense fallback={<PageSkeleton />}><ReturnPolicy /></Suspense>} />
        <Route path="/cookies" element={<Suspense fallback={<PageSkeleton />}><CookiePolicy /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<PageSkeleton />}><Help /></Suspense>} />
        <Route path="/settings/notifications" element={<Suspense fallback={<PageSkeleton />}><NotificationPreferences /></Suspense>} />
        <Route path="/settings/api-keys" element={<Suspense fallback={<PageSkeleton />}><APIKeys /></Suspense>} />
        
        {/* Wallet & Trading */}
        <Route path="/wallet" element={<Suspense fallback={<DashboardSkeleton />}><Wallet /></Suspense>} />
        <Route path="/trade-offers" element={<Suspense fallback={<DashboardSkeleton />}><TradeOffers /></Suspense>} />
        <Route path="/feed" element={<Suspense fallback={<FeedSkeleton />}><Feed /></Suspense>} />
        
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
      </Routes>
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
