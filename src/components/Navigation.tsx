import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, User } from "lucide-react";
import { useAuth } from "./auth/AuthProvider";
import { AuthModal } from "./auth/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { user, signOut } = useAuth();

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              FCVD
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link to="/browse">Browse</Link>
            </Button>

            {user ? (
              <>
                <Button asChild>
                  <Link to="/sell">Start Selling</Link>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => openAuth("signin")}>
                  Sign In
                </Button>
                <Button onClick={() => openAuth("signup")}>
                  Sign Up
                </Button>
              </>
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
