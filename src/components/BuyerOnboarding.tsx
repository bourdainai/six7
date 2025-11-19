import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface BuyerOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const CATEGORIES = [
  "Electronics", "Home & Garden", "Fashion & Accessories", "Sports & Leisure", 
  "Books & Media", "Toys & Games", "Baby & Kids", "Beauty & Health",
  "Vehicles", "Other"
];

const POPULAR_BRANDS = [
  "Apple", "Samsung", "Nike", "Adidas", "IKEA", "H&M", "Zara", 
  "PlayStation", "Xbox", "LEGO"
];

export const BuyerOnboarding = ({ onComplete, onSkip }: BuyerOnboardingProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [saving, setSaving] = useState(false);
  const [showListingCTA, setShowListingCTA] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const toggleItem = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustomBrand = () => {
    if (customBrand.trim() && !brands.includes(customBrand.trim())) {
      setBrands([...brands, customBrand.trim()]);
      setCustomBrand("");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          categories: categories,
          brands: brands,
          budget_min: budgetMin ? parseFloat(budgetMin) : null,
          budget_max: budgetMax ? parseFloat(budgetMax) : null,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved!",
        description: "Your personalized feed is now ready.",
      });
      
      setShowListingCTA(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving preferences:', error);
      }
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch(step) {
      case 1: return categories.length > 0;
      case 2: return true; // Brands are optional
      case 3: return budgetMin && budgetMax && parseFloat(budgetMin) < parseFloat(budgetMax);
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Personalize Your Experience
          </CardTitle>
          <CardDescription>
            Tell us what you're interested in to see relevant items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Indicators */}
          <div className="flex justify-between mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 mx-1 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Categories */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">What are you interested in?</h3>
              <p className="text-sm text-muted-foreground">Select categories you'd like to browse</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={categories.includes(cat) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(cat, categories, setCategories)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Brands (Optional) */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Favorite brands?</h3>
              <p className="text-sm text-muted-foreground">Add brands you're interested in (optional)</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {POPULAR_BRANDS.map((brand) => (
                  <Badge
                    key={brand}
                    variant={brands.includes(brand) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(brand, brands, setBrands)}
                  >
                    {brand}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom brand"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCustomBrand();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={addCustomBrand}
                >
                  Add
                </Button>
              </div>
              {brands.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {brands.map((brand) => (
                    <Badge
                      key={brand}
                      variant="default"
                      className="cursor-pointer"
                      onClick={() => setBrands(brands.filter(b => b !== brand))}
                    >
                      {brand} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">What's your budget?</h3>
              <p className="text-sm text-muted-foreground">Set your price range</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Min (£)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Max (£)</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              {budgetMin && budgetMax && parseFloat(budgetMin) >= parseFloat(budgetMax) && (
                <p className="text-sm text-destructive">Max budget must be greater than min budget</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {onSkip && (
                <Button variant="ghost" onClick={onSkip}>
                  Skip for now
                </Button>
              )}
            </div>
            <div>
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving || !canProceed()}>
                  {saving ? "Saving..." : "Complete Setup"}
                </Button>
              )}
            </div>
          </div>

          {/* Show CTA after saving */}
          {showListingCTA && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium text-foreground">Ready to start selling?</h3>
                <p className="text-sm text-muted-foreground">
                  List your first item in seconds with AI-powered listing
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      onComplete();
                      navigate("/sell");
                    }}
                    className="flex items-center gap-2"
                  >
                    List Your First Item
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onComplete();
                    }}
                  >
                    Browse Marketplace
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
