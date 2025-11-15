import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

export const Navigation = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { user, signOut } = useAuth();

  const handleAuthClick = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-foreground group-hover:scale-105 transition-transform" />
            <span className="text-xl font-light tracking-tight text-foreground">6Seven</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link 
              to="/browse" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              Browse
            </Link>
            <Link 
              to="/sell-enhanced" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-light"
            >
              Sell
            </Link>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 font-light">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/seller" className="cursor-pointer">
                      Seller Dashboard
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
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
