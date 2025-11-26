import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Menu, X, Shield, Heart, Bell,
  PlusCircle, Search, User, LogOut,
  ShoppingBag, Wallet, RefreshCw, BarChart3, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NavLink {
  to: string;
  label: string;
}

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navLinks: NavLink[];
  user: any;
  isAdmin: boolean;
  onSignOut: () => void;
  onNotificationsClick: () => void;
  unreadMessagesCount?: number;
}

export const MobileMenu = ({
  open,
  onOpenChange,
  navLinks,
  user,
  isAdmin,
  onSignOut,
  onNotificationsClick,
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative overflow-hidden rounded-full hover:bg-secondary/50 transition-all duration-300">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] p-0 border-l border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Header Profile Section */}
          <div className="pt-12 pb-6 px-6 bg-gradient-to-b from-secondary/50 to-transparent">
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg ring-2 ring-background">
                  <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight">
                    {profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-2 py-0.5 rounded-full w-fit mt-1">
                    Member
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to 6Seven</h2>
                <p className="text-muted-foreground">Join the marketplace for collectors.</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-4 grid grid-cols-2 gap-3">
            <Link
              to="/sell"
              onClick={handleNavClick}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all active:scale-95 group"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                <PlusCircle className="h-5 w-5" />
              </div>
              <span className="font-semibold text-sm">Sell Item</span>
            </Link>
            <Link
              to="/browse"
              onClick={handleNavClick}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-secondary/50 hover:bg-secondary border border-white/5 transition-all active:scale-95 group"
            >
              <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                <Search className="h-5 w-5" />
              </div>
              <span className="font-semibold text-sm">Browse</span>
            </Link>
          </div>

          <motion.nav
            variants={container}
            initial="hidden"
            animate="show"
            className="flex-1 px-4 py-2 space-y-1"
          >
            {user && (
              <>
                <div className="px-4 py-2 mt-2">
                  <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3" /> Account
                  </h3>
                </div>

                <motion.div variants={item}>
                  <Link to="/messages" onClick={handleNavClick} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <span className="flex items-center gap-3 font-medium group-hover:translate-x-1 transition-transform">
                      Messages
                    </span>
                    {unreadMessagesCount > 0 && (
                      <Badge variant="destructive" className="rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-xs shadow-sm">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Badge>
                    )}
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/orders" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <ShoppingBag className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Orders</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/wallet" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <Wallet className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Wallet</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/trade-offers" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <RefreshCw className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Trade Offers</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/saved" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <Heart className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Saved Items</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <button
                    onClick={() => {
                      handleNavClick();
                      setTimeout(onNotificationsClick, 300);
                    }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group"
                  >
                    <Bell className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Notifications</span>
                  </button>
                </motion.div>

                <div className="my-4 border-t border-white/5 mx-4" />

                <div className="px-4 py-2">
                  <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" /> Seller Center
                  </h3>
                </div>

                <motion.div variants={item}>
                  <Link to="/dashboard/seller" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Dashboard</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/seller/analytics" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Analytics</span>
                  </Link>
                </motion.div>

                <motion.div variants={item}>
                  <Link to="/seller/reputation" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                    <Star className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Reputation</span>
                  </Link>
                </motion.div>

                {isAdmin && (
                  <>
                    <div className="my-4 border-t border-white/5 mx-4" />
                    <div className="px-4 py-2">
                      <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Admin
                      </h3>
                    </div>
                    <motion.div variants={item}>
                      <Link to="/admin" onClick={handleNavClick} className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary/50 active:bg-secondary transition-colors group">
                        <span className="font-medium group-hover:translate-x-1 transition-transform">Admin Dashboard</span>
                      </Link>
                    </motion.div>
                  </>
                )}

                <div className="my-4 border-t border-white/5 mx-4" />

                <motion.div variants={item}>
                  <button
                    onClick={onSignOut}
                    className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 text-destructive active:bg-destructive/20 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    <span className="font-medium group-hover:translate-x-1 transition-transform">Sign Out</span>
                  </button>
                </motion.div>
              </>
            )}
          </motion.nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};
