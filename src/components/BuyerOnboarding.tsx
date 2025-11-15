import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./auth/AuthProvider";

const COMMON_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "UK 6", "UK 8", "UK 10", "UK 12", "UK 14", "UK 16"];
const COMMON_BRANDS = ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "COS", "Mango", "Arket", "& Other Stories"];
const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories"];
const STYLE_TAGS = ["Minimal", "Streetwear", "Vintage", "Y2K", "Business Casual", "Bohemian", "Sporty", "Elegant"];

interface BuyerOnboardingProps {
  onComplete: () => void;
}

export const BuyerOnboarding = ({ onComplete }: BuyerOnboardingProps) => {
  const [step, setStep] = useState(1);
  const [sizes, setSizes] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [customSize, setCustomSize] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const toggleItem = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustomItem = (item: string, list: string[], setList: (list: string[]) => void, setClear: (val: string) => void) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
      setClear("");
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
          sizes: sizes,
          brands: brands,
          categories: categories,
          style_tags: styleTags,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Preferences saved!",
        description: "Your buyer agent is now configured.",
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving preferences:', error);
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
    if (step === 1) return sizes.length > 0;
    if (step === 2) return brands.length > 0;
    if (step === 3) return categories.length > 0;
    if (step === 4) return styleTags.length > 0;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-light text-foreground">Set up your buyer agent</h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            Help us understand your style so we can show you the best matches
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">What sizes do you wear?</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_SIZES.map(size => (
                  <Badge
                    key={size}
                    variant={sizes.includes(size) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(size, sizes, setSizes)}
                  >
                    {sizes.includes(size) && <Check className="w-3 h-3 mr-1" />}
                    {size}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom size"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem(customSize, sizes, setSizes, setCustomSize)}
                />
                <Button onClick={() => addCustomItem(customSize, sizes, setSizes, setCustomSize)}>
                  Add
                </Button>
              </div>
              {sizes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <Badge key={size} variant="secondary" className="flex items-center gap-1">
                      {size}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(size, sizes, setSizes)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">Favorite brands?</Label>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMMON_BRANDS.map(brand => (
                  <Badge
                    key={brand}
                    variant={brands.includes(brand) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleItem(brand, brands, setBrands)}
                  >
                    {brands.includes(brand) && <Check className="w-3 h-3 mr-1" />}
                    {brand}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom brand"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem(customBrand, brands, setBrands, setCustomBrand)}
                />
                <Button onClick={() => addCustomItem(customBrand, brands, setBrands, setCustomBrand)}>
                  Add
                </Button>
              </div>
              {brands.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {brands.map(brand => (
                    <Badge key={brand} variant="secondary" className="flex items-center gap-1">
                      {brand}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => toggleItem(brand, brands, setBrands)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">What categories interest you?</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <Badge
                    key={category}
                    variant={categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => toggleItem(category, categories, setCategories)}
                  >
                    {categories.includes(category) && <Check className="w-4 h-4 mr-1" />}
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">Your style vibe?</Label>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={styleTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => toggleItem(tag, styleTags, setStyleTags)}
                  >
                    {styleTags.includes(tag) && <Check className="w-4 h-4 mr-1" />}
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <Label className="text-base mb-3 block">Budget range (optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Minimum £</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Maximum £</Label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Back
          </Button>
          
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
