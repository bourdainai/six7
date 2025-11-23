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
import { Menu, X, Shield, Heart, Bell } from "lucide-react";

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
  const handleNavClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 border-l border-divider-gray">
        <SheetHeader className="px-6 py-4 border-b border-divider-gray">
          <SheetTitle className="text-left font-normal">Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full overflow-y-auto">
          <nav className="flex-1 px-6 py-6 space-y-1">
            {/* Main Navigation */}
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm"
              >
                {link.label}
              </Link>
            ))}
            
            {user && (
              <>
                <div className="border-t border-divider-gray my-4" />
                
                {/* User Section */}
                <div className="px-4 py-2">
                  <h3 className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
                    Account
                  </h3>
                </div>
                
                <Link to="/messages" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm flex items-center justify-between">
                  <span>Messages</span>
                  {unreadMessagesCount > 0 && (
                    <Badge variant="destructive" className="rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center text-xs">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Badge>
                  )}
                </Link>
                <Link to="/orders" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Orders
                </Link>
                <Link to="/wallet" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Wallet
                </Link>
                <Link to="/trade-offers" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Trade Offers
                </Link>
                <Link to="/saved" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Saved Items
                </Link>
                
                <button
                  onClick={() => {
                    handleNavClick();
                    setTimeout(onNotificationsClick, 300);
                  }}
                  className="w-full text-left px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </button>
                
                <div className="border-t border-divider-gray my-4" />
                
                {/* Seller Section */}
                <div className="px-4 py-2">
                  <h3 className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
                    Seller
                  </h3>
                </div>
                
                <Link to="/dashboard/seller" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Seller Dashboard
                </Link>
                <Link to="/seller/analytics" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Analytics
                </Link>
                <Link to="/seller/reputation" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                  Reputation
                </Link>
                
                {isAdmin && (
                  <>
                    <div className="border-t border-divider-gray my-4" />
                    <div className="px-4 py-2">
                      <h3 className="text-xs font-normal text-muted-foreground uppercase tracking-wider">
                        Admin
                      </h3>
                    </div>
                    <Link to="/admin" onClick={handleNavClick} className="block px-4 py-3 text-base font-normal text-foreground hover:bg-soft-neutral transition-colors duration-fast rounded-sm">
                      <Shield className="w-4 h-4 inline mr-2" />
                      Admin Dashboard
                    </Link>
                  </>
                )}
                
                <div className="border-t border-divider-gray my-4" />
                <button
                  onClick={onSignOut}
                  className="w-full text-left px-4 py-3 text-base font-normal text-destructive hover:bg-soft-neutral transition-colors duration-fast rounded-sm"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};
