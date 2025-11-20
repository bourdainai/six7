import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Check, Loader2, X, AlertCircle, ArrowRight, ExternalLink, Camera, PoundSterling, Info, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { Database, Json } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { MagicCardSearch } from "@/components/listing/MagicCardSearch";
import { AIAnswerEnginesToggle } from "@/components/listings/AIAnswerEnginesToggle";

type ConditionType = Database["public"]["Enums"]["condition_type"];
type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

interface ListingData {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  // Card specific fields
  set_code: string;
  card_number: string;
  rarity: string;
  condition: ConditionType | "";
  is_graded: boolean;
  grading_service: string;
  grading_score: string;
  // Generic/Legacy fields (kept for compatibility but hidden/minimized)
  style_tags: string[];
  original_rrp: number | null;
}

interface ShippingData {
  shipping_cost_uk: number;
  free_shipping: boolean;
  estimated_delivery_days: number;
}

const CATEGORIES = [
  "Pokémon Singles",
  "Pokémon Sealed",
  "Graded Cards",
  "Raw Cards",
  "Accessories",
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Pokémon Singles": ["Standard Format", "Vintage (WOTC)", "Modern Chase", "Bulk / Lots"],
  "Pokémon Sealed": ["Booster Boxes", "ETBs", "Booster Packs", "Collection Boxes"],
  "Graded Cards": ["PSA", "BGS", "CGC", "ACE", "Other"],
  "Raw Cards": ["Near Mint", "Lightly Played", "Played", "Damaged"],
  "Accessories": ["Sleeves", "Toploaders", "Binders", "Playmats"],
};

const SellItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isVerified: emailVerified } = useEmailVerification();

  // State
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [gettingPrice, setGettingPrice] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<{ price: number, low: number, high: number } | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number | "">("");
  const [aiAnswerEnginesEnabled, setAiAnswerEnginesEnabled] = useState(false);

  const [listingData, setListingData] = useState<ListingData>({
    title: "",
    description: "",
    category: "Pokémon Singles",
    subcategory: "",
    set_code: "",
    card_number: "",
    rarity: "",
    condition: "",
    is_graded: false,
    grading_service: "",
    grading_score: "",
    style_tags: [],
    original_rrp: null,
  });

  const [shipping, setShipping] = useState<ShippingData>({
    shipping_cost_uk: 2.99,
    free_shipping: false,
    estimated_delivery_days: 3,
  });

  // Check seller profile and Stripe Connect status
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id, stripe_onboarding_complete, can_receive_payments")
        .eq("id", user!.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const fileArray = Array.from(files);
    setImageFiles(prev => [...prev, ...fileArray]);

    const newImages = fileArray.map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newFiles = [...imageFiles];
    newImages.splice(index, 1);
    newFiles.splice(index, 1);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  const handleMagicSearchSelect = (cardData: any) => {
    setListingData(prev => ({
      ...prev,
      title: cardData.title,
      description: cardData.description,
      category: "Pokémon Singles",
      subcategory: "Standard Format", // Default, user can change
      set_code: cardData.set_code,
      card_number: cardData.card_number,
      rarity: cardData.rarity,
      original_rrp: cardData.original_rrp
    }));

    // Pre-fill selling price with market price if available
    if (cardData.original_rrp) {
      setSelectedPrice(cardData.original_rrp);
    }

    if (cardData.image_url) {
      setImages([cardData.image_url]);
      // We don't have a File object for remote images, so imageFiles stays empty
      // The publish logic needs to handle this case (uploading from URL or skipping if already URL)
    }

    toast({
      title: "Card Details Found!",
      description: "We've auto-filled the details for you.",
    });
  };

  const handleAutoFill = async () => {
    if (imageFiles.length === 0 && images.length === 0) {
      toast({
        title: "No images",
        description: "Please upload photos first to use AI auto-fill.",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    try {
      // 1. Upload images first to get URLs
      const uploadedUrls: string[] = [];

      // Handle local files
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const fileName = `temp/${Date.now()}-${i}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('listing-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('listing-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        }
      }

      // Handle existing remote URLs (e.g. from Magic Search if mixed)
      images.forEach(url => {
        if (url.startsWith('http') && !uploadedUrls.includes(url)) {
          // Check if it's a blob url (local preview) or real url
          if (!url.startsWith('blob:')) {
            uploadedUrls.push(url);
          }
        }
      });

      if (uploadedUrls.length === 0) {
        throw new Error("Could not prepare images for analysis");
      }

      // 2. Call AI Function
      const { data, error } = await supabase.functions.invoke('ai-auto-list-from-photos', {
        body: { imageUrls: uploadedUrls }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "AI analysis failed");

      const result = data.data;

      // 3. Populate Form
      setListingData(prev => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
        category: result.category || "Pokémon Singles",
        subcategory: result.subcategory || prev.subcategory,
        set_code: result.set_code || prev.set_code,
        card_number: result.card_number || prev.card_number,
        rarity: result.rarity || prev.rarity,
        condition: result.condition || prev.condition,
      }));

      toast({
        title: "✨ Magic!",
        description: "We've analyzed your card and filled in the details.",
      });

      // 4. Auto-fetch price if we have enough info
      if (result.title || (result.set_code && result.card_number)) {
        handleGetPriceSuggestion(
          result.title || prev.title,
          result.set_code || prev.set_code,
          result.card_number || prev.card_number
        );
      }

    } catch (error) {
      console.error("Auto-fill error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze images. Please try again or fill manually.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

}
  };

const handleGetPriceSuggestion = async (title?: string, setCode?: string, cardNumber?: string) => {
  const t = title || listingData.title;
  const s = setCode || listingData.set_code;
  const c = cardNumber || listingData.card_number; // Note: card_number is in category_attributes in submit, but we need it here. 
  // Actually listingData has card_number at top level in our state interface, so that's fine.

  if (!t && !s) {
    toast({ title: "Need more info", description: "Please enter a title or set code first.", variant: "destructive" });
    return;
  }

  setGettingPrice(true);
  setSuggestedPrice(null);

  try {
    const { data, error } = await supabase.functions.invoke('ai-price-suggestion', {
      body: { card_name: t, set_code: s, card_number: c }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || "Could not find price");

    if (data.suggestedPrice) {
      setSuggestedPrice({
        price: data.suggestedPrice,
        low: data.range?.low || data.suggestedPrice * 0.8,
        high: data.range?.high || data.suggestedPrice * 1.2
      });
      toast({
        title: "Price Found!",
        description: `Market price is $${data.suggestedPrice} (USD).`,
      });
    } else {
      toast({ title: "No price data", description: "Card found but no market price available.", variant: "destructive" });
    }

  } catch (error) {
    console.error("Price error:", error);
    toast({ title: "Pricing Failed", description: "Could not fetch price suggestion.", variant: "destructive" });
  } finally {
    setGettingPrice(false);
  }
};

const handlePublish = async () => {
  if (!user || !selectedPrice || !listingData.title || !listingData.category || images.length === 0) {
    toast({
      title: "Missing fields",
      description: "Please add photos, a title, category, and price to list your card.",
      variant: "destructive"
    });
    return;
  }

  if (!emailVerified) {
    toast({
      title: "Email verification required",
      description: "Please verify your email address before listing.",
      variant: "destructive"
    });
    return;
  }

  setPublishing(true);

  try {
    const listingPayload: ListingInsert = {
      seller_id: user.id,
      title: listingData.title,
      description: listingData.description,
      category: listingData.category,
      subcategory: listingData.subcategory || null,

      // Card specific fields - store in category_attributes as JSON
      set_code: listingData.set_code || null,
      condition: listingData.condition || null,
      category_attributes: {
        card_number: listingData.card_number || null,
        rarity: listingData.rarity || null,
        is_graded: listingData.is_graded || false,
        grading_service: listingData.is_graded ? listingData.grading_service : null,
        grading_score: listingData.is_graded ? (parseFloat(listingData.grading_score) || null) : null,
      },

      seller_price: Number(selectedPrice),
      status: "active",
      published_at: new Date().toISOString(),
      ai_answer_engines_enabled: aiAnswerEnginesEnabled,

      // Shipping
      shipping_cost_uk: shipping.free_shipping ? 0 : shipping.shipping_cost_uk,
      shipping_cost_europe: null, // Disabled for now
      shipping_cost_international: null, // Disabled for now
      free_shipping: shipping.free_shipping,
      estimated_delivery_days: shipping.estimated_delivery_days,
    };

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert(listingPayload)
      .select()
      .single();

    if (listingError) throw listingError;

    // Upload images
    // If images contains URLs that are not local blobs (from Magic Search), we need to fetch and convert them or handle differently
    // For now, let's assume we only upload local files from imageFiles
    // If a user selected a Magic Search image, we might need to "save" that remote URL to our bucket or just use it directly.
    // Simplest approach: If imageFiles is empty but images has content (Magic Search), download it and upload to storage.

    let filesToUpload = [...imageFiles];

    if (filesToUpload.length === 0 && images.length > 0 && images[0].startsWith('http')) {
      // Magic search result
      try {
        const response = await fetch(images[0]);
        const blob = await response.blob();
        const file = new File([blob], "magic-card.jpg", { type: "image/jpeg" });
        filesToUpload = [file];
      } catch (e) {
        console.error("Failed to fetch magic image", e);
      }
    }

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileName = `${listing.id}/${Date.now()}-${i}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (uploadError) {
        if (import.meta.env.DEV) console.error("Image upload error:", uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      await supabase.from('listing_images').insert({
        listing_id: listing.id,
        image_url: publicUrl,
        display_order: i
      });
    }

    setPublishedListingId(listing.id);
    toast({
      title: "Listed Successfully!",
      description: "Your card is now live on the marketplace.",
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish listing.";
    console.error(error);
    toast({
      title: "Publishing Failed",
      description: message,
      variant: "destructive"
    });
  } finally {
    setPublishing(false);
  }
};

if (publishedListingId) {
  return (
    <PageLayout>
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-light text-foreground mb-4">Card Listed!</h1>
        <p className="text-muted-foreground mb-8">
          Your listing is live. Good luck with the sale!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate(`/listing/${publishedListingId}`)} size="lg">
            View Listing <ExternalLink className="ml-2 w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
            List Another
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

return (
  <PageLayout>
    <SEO title="List Your Pokémon Card | 6Seven" />
    <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultMode="signup" />

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-light">List Your Card</h1>
        <p className="text-muted-foreground">Add photos and details to start selling.</p>
      </div>

      {/* Magic Search Section */}
      <div className="mb-10">
        <MagicCardSearch onSelect={handleMagicSearchSelect} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

        {/* Left Column: Photos (Sticky on Desktop) */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="bg-background border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors relative group">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-foreground/70" />
              </div>
              <div>
                <p className="font-medium text-lg">Add Photos</p>
                <p className="text-sm text-muted-foreground mt-1">Drag & drop or tap to select</p>
              </div>
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border group">
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Tip: Clear photos of the front and back of the card help it sell faster.
              </p>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <Button
            onClick={handleAutoFill}
            disabled={analyzing}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Card...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Fill Details from Photos
              </>
            )}
          </Button>
        )}
      </div>

      {/* Right Column: Form Fields */}
      <div className="space-y-8">

        {/* Basics */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">Basics</h2>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Charizard Base Set Unlimited Holo"
              value={listingData.title}
              onChange={e => setListingData({ ...listingData, title: e.target.value })}
              className="text-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={listingData.category}
                onValueChange={val => setListingData({ ...listingData, category: val, subcategory: "" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={listingData.subcategory}
                onValueChange={val => setListingData({ ...listingData, subcategory: val })}
                disabled={!listingData.category}
              >
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {SUBCATEGORIES[listingData.category]?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Card Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">Card Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Set Name / Code</Label>
              <Input
                placeholder="e.g. BS 4/102"
                value={listingData.set_code}
                onChange={e => setListingData({ ...listingData, set_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rarity</Label>
              <Select
                value={listingData.rarity}
                onValueChange={val => setListingData({ ...listingData, rarity: val })}
              >
                <SelectTrigger><SelectValue placeholder="Select rarity" /></SelectTrigger>
                <SelectContent>
                  {[
                    "Common",
                    "Uncommon",
                    "Rare",
                    "Rare Holo",
                    "Ultra Rare",
                    "Secret Rare",
                    "Special Illustration Rare",
                    "Illustration Rare",
                    "Hyper Rare",
                    "Double Rare",
                    "Radiant Rare",
                    "Amazing Rare",
                    "Rainbow Rare",
                    "Shiny Rare",
                    "ACE SPEC",
                    "Promo"
                  ].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Condition</Label>
              {listingData.condition && (
                <Badge variant="secondary">{listingData.condition.replace(/_/g, ' ')}</Badge>
              )}
            </div>
            <Select
              value={listingData.condition}
              onValueChange={val => setListingData({ ...listingData, condition: val as ConditionType })}
            >
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_with_tags">Gem Mint / Mint (Sealed)</SelectItem>
                <SelectItem value="like_new">Near Mint (NM)</SelectItem>
                <SelectItem value="excellent">Lightly Played (LP)</SelectItem>
                <SelectItem value="good">Moderately Played (MP)</SelectItem>
                <SelectItem value="fair">Heavily Played (HP)</SelectItem>
                <SelectItem value="poor">Damaged (DMG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="graded"
              checked={listingData.is_graded}
              onCheckedChange={val => setListingData({ ...listingData, is_graded: val })}
            />
            <Label htmlFor="graded">This card is professionally graded</Label>
          </div>

          {listingData.is_graded && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
              <div className="space-y-2">
                <Label>Grading Company</Label>
                <Select
                  value={listingData.grading_service}
                  onValueChange={val => setListingData({ ...listingData, grading_service: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>
                    {["PSA", "BGS", "CGC", "ACE", "Other"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade (0-10)</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={listingData.grading_score}
                  onChange={e => setListingData({ ...listingData, grading_score: e.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">Description</h2>
          <Textarea
            placeholder="Any swirls, print lines, or specific details about the card..."
            rows={4}
            value={listingData.description}
            onChange={e => setListingData({ ...listingData, description: e.target.value })}
          />
        </section>

        {/* Pricing */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">Pricing</h2>
          <div className="space-y-2">
            <Label className="text-base">Selling Price (£)</Label>
            <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                className="pl-10 text-lg"
                placeholder="0.00"
                value={selectedPrice}
                onChange={e => setSelectedPrice(e.target.value ? parseFloat(e.target.value) : "")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              We recommend checking sold listings on eBay or 130point for accurate pricing.
            </p>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGetPriceSuggestion()}
                disabled={gettingPrice}
                className="w-full sm:w-auto"
              >
                {gettingPrice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />}
                Get Price Suggestion
              </Button>

              {suggestedPrice && (
                <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    Market Price: ${suggestedPrice.price.toFixed(2)}
                  </p>
                  <p className="text-xs text-green-600 mb-3">
                    Range: ${suggestedPrice.low.toFixed(2)} - ${suggestedPrice.high.toFixed(2)}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full bg-green-100 hover:bg-green-200 text-green-800 border-green-200"
                    onClick={() => setSelectedPrice(suggestedPrice.price)}
                  >
                    Apply Price (${suggestedPrice.price})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Shipping */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">Shipping</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="free-shipping"
                checked={shipping.free_shipping}
                onCheckedChange={(checked) => setShipping(prev => ({ ...prev, free_shipping: !!checked }))}
              />
              <Label htmlFor="free-shipping" className="font-normal cursor-pointer">
                I'll pay for shipping (Free for buyer)
              </Label>
            </div>

            {!shipping.free_shipping && (
              <div className="space-y-2 pl-6 border-l-2 border-border">
                <Label>UK Shipping Cost (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shipping.shipping_cost_uk}
                  onChange={e => setShipping(prev => ({ ...prev, shipping_cost_uk: parseFloat(e.target.value) || 0 }))}
                  className="max-w-[200px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Estimated Delivery (Days)</Label>
              <Input
                type="number"
                value={shipping.estimated_delivery_days}
                onChange={e => setShipping(prev => ({ ...prev, estimated_delivery_days: parseInt(e.target.value) || 3 }))}
                className="max-w-[200px]"
              />
            </div>
          </div>
        </section>

        {/* AI Answer Engines Visibility */}
        <section className="space-y-4">
          <h2 className="text-xl font-medium border-b pb-2">AI Agent Visibility</h2>
          <AIAnswerEnginesToggle
            enabled={aiAnswerEnginesEnabled}
            onChange={setAiAnswerEnginesEnabled}
            showLabel={true}
            compact={false}
          />
        </section>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-4 pb-8 border-t mt-8 flex items-center justify-between">
          <div className="text-sm text-muted-foreground hidden sm:block">
            By listing, you agree to our seller terms.
          </div>
          <Button
            size="lg"
            className="w-full sm:w-auto min-w-[200px]"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                Publish Listing
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  </PageLayout>
);
};

export default SellItem;
