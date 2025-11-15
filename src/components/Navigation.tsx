import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            Resale AI
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link to="/browse">Browse</Link>
          </Button>
          <Button asChild>
            <Link to="/sell">Start Selling</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
