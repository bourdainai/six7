import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Shield, Heart, Bell, X,
  User, LogOut, ChevronRight,
  ShoppingBag, Wallet, RefreshCw, BarChart3, Star, Home,
  Package, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  isAdmin: boolean;
  onSignOut: () => void;
  onNotificationsClick: () => void;
  onAuthClick?: (mode: "signin" | "signup") => void;
  unreadMessagesCount?: number;
}

export const MobileMenu = ({
  open,
  onOpenChange,
  user,
  isAdmin,
  onSignOut,
  onNotificationsClick,
  onAuthClick,
  unreadMessagesCount = 0,
}: MobileMenuProps) => {
  // Fetch user profile for avatar
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user!.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const handleNavClick = () => {
    onOpenChange(false);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > 200) {
      onOpenChange(false);
    }
  };

  const hasUnread = unreadMessagesCount > 0;

  // Navigation items with consistent structure
  const accountItems = [
    { to: "/orders", icon: ShoppingBag, label: "Orders" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/trade-offers", icon: RefreshCw, label: "Trade Offers" },
    { to: "/saved", icon: Heart, label: "Saved Items" },
    { 
      to: "/notifications", 
      icon: Bell, 
      label: "Notifications",
      onClick: () => {
        handleNavClick();
        setTimeout(onNotificationsClick, 300);
      }
    },
  ];

  const sellerItems = [
    { to: "/dashboard/seller", icon: Package, label: "Dashboard" },
    { to: "/seller/analytics", icon: TrendingUp, label: "Analytics" },
    { to: "/seller/reputation", icon: Star, label: "Reputation" },
  ];

  const adminItems = [
    { to: "/admin", icon: Shield, label: "Admin Dashboard" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={() => onOpenChange(false)}
          />

          {/* Menu panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-[9999] max-h-[92vh] rounded-t-[28px] overflow-hidden"
            style={{ touchAction: "none" }}
          >
            {/* Dark glass background */}
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
            
            {/* Top gradient glow */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative flex flex-col h-full max-h-[92vh] overflow-hidden">
              
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Close button */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
                
                {/* Profile Header */}
                <div className="px-6 pt-4 pb-6">
                  {user ? (
                    <Link 
                      to="/profile" 
                      onClick={handleNavClick}
                      className="flex items-center gap-4 p-4 -mx-2 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors min-h-[96px]"
                    >
                      <div className="relative">
                        <Avatar className="h-20 w-20 ring-2 ring-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                          <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-white/10 text-white text-2xl font-medium">
                            {user?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-white truncate">
                          {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                        </h2>
                        <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm">
                          View Profile
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="py-4">
                      <h2 className="text-2xl font-bold text-white mb-2">Welcome to 6Seven</h2>
                      <p className="text-white/50 mb-6">Join the marketplace for collectors.</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            handleNavClick();
                            onAuthClick?.("signin");
                          }}
                          className="flex-1 h-14 rounded-2xl bg-white text-black font-semibold text-base hover:bg-white/90 active:scale-[0.98] transition-all"
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => {
                            handleNavClick();
                            onAuthClick?.("signup");
                          }}
                          className="flex-1 h-14 rounded-2xl bg-white/10 text-white font-semibold text-base hover:bg-white/20 active:scale-[0.98] transition-all border border-white/10"
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Home Link */}
                <div className="px-4">
                  <NavItem
                    to="/"
                    icon={Home}
                    label="Home"
                    onClick={handleNavClick}
                    index={0}
                  />
                </div>

                {user && (
                  <>
                    {/* Account Section */}
                    <div className="px-6 pt-6 pb-2">
                      <SectionHeader icon={User} label="Account" />
                    </div>
                    <div className="px-4 space-y-1">
                      {accountItems.map((item, index) => (
                        <NavItem
                          key={item.to}
                          to={item.to}
                          icon={item.icon}
                          label={item.label}
                          onClick={item.onClick || handleNavClick}
                          hasNotification={item.label === "Notifications" && hasUnread}
                          index={index + 1}
                        />
                      ))}
                    </div>

                    {/* Seller Center Section */}
                    <div className="px-6 pt-8 pb-2">
                      <SectionHeader icon={BarChart3} label="Seller Center" />
                    </div>
                    <div className="px-4 space-y-1">
                      {sellerItems.map((item, index) => (
                        <NavItem
                          key={item.to}
                          to={item.to}
                          icon={item.icon}
                          label={item.label}
                          onClick={handleNavClick}
                          index={index + accountItems.length + 2}
                        />
                      ))}
                    </div>

                    {/* Admin Section */}
                    {isAdmin && (
                      <>
                        <div className="px-6 pt-8 pb-2">
                          <SectionHeader icon={Shield} label="Admin" />
                        </div>
                        <div className="px-4 space-y-1">
                          {adminItems.map((item, index) => (
                            <NavItem
                              key={item.to}
                              to={item.to}
                              icon={item.icon}
                              label={item.label}
                              onClick={handleNavClick}
                              index={index + accountItems.length + sellerItems.length + 3}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Sign Out */}
                    <div className="px-4 pt-8 pb-4">
                      <div className="h-[1px] bg-white/10 mb-6 mx-2" />
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        onClick={onSignOut}
                        className="w-full h-16 flex items-center justify-center gap-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 transition-colors group"
                      >
                        <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
                        <span className="text-lg font-medium text-red-400 group-hover:text-red-300 transition-colors">
                          Sign Out
                        </span>
                      </motion.button>
                    </div>
                  </>
                )}

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Section Header Component
const SectionHeader = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex items-center gap-2 px-2">
    <Icon className="w-4 h-4 text-white/30" />
    <span className="text-xs font-semibold uppercase tracking-wider text-white/30">
      {label}
    </span>
  </div>
);

// Navigation Item Component
const NavItem = ({
  to,
  icon: Icon,
  label,
  onClick,
  hasNotification,
  index,
}: {
  to: string;
  icon: any;
  label: string;
  onClick: () => void;
  hasNotification?: boolean;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
  >
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full h-16 px-4 rounded-2xl",
        "hover:bg-white/5 active:bg-white/10 transition-all duration-200",
        "group"
      )}
    >
      <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 group-hover:bg-white/15 transition-colors">
        <Icon className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
        {hasNotification && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </span>
        )}
      </div>
      <span className="flex-1 text-lg font-medium text-white/70 group-hover:text-white transition-colors">
        {label}
      </span>
      <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
    </Link>
  </motion.div>
);
