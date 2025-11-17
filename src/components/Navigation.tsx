import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AuthModal } from "@/components/auth/AuthModal";
import { NotificationCenter } from "@/components/NotificationCenter";
import logo from "@/assets/logo.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { User, LogOut, Shield, Menu, X, Bell, Heart } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export const Navigation = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useAdminCheck();

  const handleAuthClick = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { to: "/browse", label: "Browse" },
    { to: "/bundles", label: "Bundles" },
    { to: "/membership", label: "Membership" },
    { to: "/sell-enhanced", label: "Sell" },
  ];

  const userNavLinks = user
    ? [
        { to: "/messages", label: "Messages" },
        { to: "/orders", label: "Orders" },
      ]
    : [];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group relative h-14 flex-shrink-0" onClick={handleNavClick}>
            <img 
              src={logo} 
              alt="6Seven" 
              className="h-14 w-auto group-hover:scale-105 transition-transform"
              style={{ 
                width: 'auto',
                height: '56px',
                maxHeight: '56px',
                display: 'block',
                position: 'relative',
                flexShrink: 0
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <Link 
                  to="/messages" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Messages
                </Link>
                <Link 
                  to="/orders" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
                >
                  Orders
                </Link>
              </>
            )}

            {user ? (
              <>
                <NotificationCenter />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 font-light">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/seller" className="cursor-pointer">
                        Seller Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/analytics" className="cursor-pointer">
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/automation" className="cursor-pointer">
                        Automation Rules
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/reputation" className="cursor-pointer">
                        Reputation
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/messages" className="cursor-pointer">
                        Messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/saved" className="cursor-pointer">
                        <Heart className="w-4 h-4 mr-2" />
                        Saved Items
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAuthClick("signin")}
                  className="font-light"
                >
                  Sign In
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleAuthClick("signup")}
                  className="font-light"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2">
            {user && <NotificationCenter />}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
                <SheetHeader className="px-6 py-4 border-b border-border">
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full overflow-y-auto">
                  <nav className="flex-1 px-6 py-6 space-y-1">
                    {/* Main Navigation */}
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={handleNavClick}
                        className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                    
                    {user && (
                      <>
                        <div className="border-t border-border my-4" />
                        
                        {/* User Section Header */}
                        <div className="px-4 py-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Account
                          </h3>
                        </div>
                        
                        {/* Messages */}
                        <Link
                          to="/messages"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Messages
                        </Link>
                        
                        {/* Orders */}
                        <Link
                          to="/orders"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Orders
                        </Link>
                        
                        {/* Saved Items */}
                        <Link
                          to="/saved"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Heart className="w-4 h-4" />
                          Saved Items
                        </Link>
                        
                        {/* Notifications - as a menu item */}
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            // Trigger notification center after menu closes
                            setTimeout(() => {
                              // Find the notification bell button by looking for the Bell icon
                              const buttons = Array.from(document.querySelectorAll('button'));
                              const notificationButton = buttons.find(btn => {
                                const bellIcon = btn.querySelector('svg');
                                return bellIcon && bellIcon.getAttribute('class')?.includes('lucide-bell');
                              }) as HTMLElement;
                              if (notificationButton) {
                                notificationButton.click();
                              }
                            }, 300);
                          }}
                          className="w-full text-left px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Bell className="w-4 h-4" />
                          Notifications
                        </button>
                        
                        <div className="border-t border-border my-4" />
                        
                        {/* Seller Section Header */}
                        <div className="px-4 py-2">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Seller
                          </h3>
                        </div>
                        
                        <Link
                          to="/dashboard/seller"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Seller Dashboard
                        </Link>
                        <Link
                          to="/seller/analytics"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Analytics
                        </Link>
                        <Link
                          to="/seller/automation"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Automation Rules
                        </Link>
                        <Link
                          to="/seller/reputation"
                          onClick={handleNavClick}
                          className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Reputation
                        </Link>
                        {isAdmin && (
                          <>
                            <div className="border-t border-border my-4" />
                            <div className="px-4 py-2">
                              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Admin
                              </h3>
                            </div>
                            <Link
                              to="/admin"
                              onClick={handleNavClick}
                              className="block px-4 py-3 text-base font-light text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                              <Shield className="w-4 h-4 inline mr-2" />
                              Admin Dashboard
                            </Link>
                          </>
                        )}
                        <div className="border-t border-border my-4" />
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 text-base font-light text-destructive hover:bg-muted rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4 inline mr-2" />
                          Sign Out
                        </button>
                      </>
                    )}
                    
                    {!user && (
                      <>
                        <div className="border-t border-border my-4" />
                        <Button
                          variant="outline"
                          className="w-full justify-start font-light mb-2"
                          onClick={() => handleAuthClick("signin")}
                        >
                          Sign In
                        </Button>
                        <Button
                          className="w-full justify-start font-light"
                          onClick={() => handleAuthClick("signup")}
                        >
                          Sign Up
                        </Button>
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <AuthModal 
        open={authOpen} 
        onOpenChange={setAuthOpen}
        defaultMode={authMode}
      />
    </>
  );
};
