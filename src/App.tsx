import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Index from "./pages/Index";
import Sell from "./pages/Sell";
import SellEnhanced from "./pages/SellEnhanced";
import Browse from "./pages/Browse";
import ListingDetail from "./pages/ListingDetail";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Messages from "./pages/Messages";
import Membership from "./pages/Membership";
import SellerDashboard from "./pages/SellerDashboard";
import SellerAnalytics from "./pages/SellerAnalytics";
import SellerReputation from "./pages/SellerReputation";
import SellerOnboarding from "./pages/SellerOnboarding";
import SellerOnboardingMultiStep from "./pages/SellerOnboardingMultiStep";
import SellerAccountManagement from "./pages/SellerAccountManagement";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAnalytics from "./pages/AdminAnalytics";
import ModerationDashboard from "./pages/ModerationDashboard";
import FraudDashboard from "./pages/FraudDashboard";
import Bundles from "./pages/Bundles";
import BundleDetail from "./pages/BundleDetail";
import AutoRelistRules from "./pages/AutoRelistRules";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sell" element={<SellEnhanced />} />
            <Route path="/sell-enhanced" element={<SellEnhanced />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/checkout/:id" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/membership" element={<Membership />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
