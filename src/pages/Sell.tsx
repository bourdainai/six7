import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { SEO } from "@/components/SEO";
import { SellWizard } from "@/components/sell/SellWizard";

export default function Sell() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const mode = searchParams.get("mode");

  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  // Quick mode - show wizard directly
  if (mode === "quick" && user) {
    return <SellWizard />;
  }

  // Advanced mode - redirect to old flow
  if (mode === "advanced") {
    navigate("/sell/advanced");
    return null;
  }

  const startQuickList = () => {
    if (user) {
      setSearchParams({ mode: "quick" });
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sell Pokemon Cards | 6Seven"
        description="List your Pokemon cards in seconds with AI-powered pricing."
      />

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />

      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent h-[400px]" />

        <div className="relative max-w-xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
              Sell your cards
            </h1>
            <p className="text-lg text-muted-foreground mb-10">
              Snap a photo. AI fills the details. Listed in seconds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-4"
          >
            <Button
              size="lg"
              onClick={startQuickList}
              className="h-14 px-10 text-base font-medium"
            >
              <Camera className="mr-2 h-5 w-5" />
              Start Listing
            </Button>

            <p className="text-sm text-muted-foreground">
              No listing fees · Takes ~30 seconds
            </p>
          </motion.div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-6 py-20">
        <div className="grid gap-12 sm:gap-16">
          {[
            {
              number: "01",
              title: "Take a photo",
              description: "Use your camera or upload from your gallery. Works best with a clear, well-lit image.",
            },
            {
              number: "02",
              title: "AI identifies your card",
              description: "We automatically detect the card name, set, and condition. Then suggest a competitive market price.",
            },
            {
              number: "03",
              title: "Confirm and publish",
              description: "Review the details, adjust if needed, and go live. Your listing is instantly visible to buyers.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="flex gap-6"
            >
              <div className="text-4xl font-light text-muted-foreground/40 tabular-nums">
                {item.number}
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Advanced option */}
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-lg font-medium mb-2">Need more options?</h2>
        <p className="text-muted-foreground mb-6">
          List bundles, sealed products, graded cards, and accessories with full control over every detail.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/sell/advanced")}
        >
          Advanced Listing
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
