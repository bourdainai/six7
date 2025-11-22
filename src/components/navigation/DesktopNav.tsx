import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Shield, Heart } from "lucide-react";

interface NavLink {
  to: string;
  label: string;
}

interface DesktopNavProps {
  navLinks: NavLink[];
  user: any;
  isAdmin: boolean;
  onSignOut: () => void;
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const DesktopNav = ({
  navLinks,
  user,
  isAdmin,
  onSignOut,
  onAuthClick,
}: DesktopNavProps) => {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="text-sm text-foreground hover:opacity-70 transition-opacity duration-fast font-normal tracking-tight"
        >
          {link.label}
        </Link>
      ))}
      {user && (
        <>
          <Link 
            to="/messages" 
            className="text-sm text-foreground hover:opacity-70 transition-opacity duration-fast font-normal tracking-tight"
          >
            Messages
          </Link>
          <Link 
            to="/orders" 
            className="text-sm text-foreground hover:opacity-70 transition-opacity duration-fast font-normal tracking-tight"
          >
            Orders
          </Link>
        </>
      )}

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 font-normal">
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
              <Link to="/wallet" className="cursor-pointer">
                Wallet
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/trade-offers" className="cursor-pointer">
                Trade Offers
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/saved" className="cursor-pointer">
                <Heart className="w-4 h-4 mr-2" />
                Saved Items
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings/notifications" className="cursor-pointer">
                Notification Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onAuthClick("signin")}
            className="font-normal"
          >
            Sign In
          </Button>
          <Button 
            size="sm" 
            onClick={() => onAuthClick("signup")}
            className="font-normal"
          >
            Sign Up
          </Button>
        </div>
      )}
    </>
  );
};
