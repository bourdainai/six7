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
import { Upload, Check, Loader2, X, AlertCircle, ArrowRight, ExternalLink, Camera, PoundSterling, Info, Sparkles, Plus, GripVertical, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { Database, Json } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { MagicCardSearch, type MagicCardData } from "@/components/listing/MagicCardSearch";
import { AIAnswerEnginesToggle } from "@/components/listings/AIAnswerEnginesToggle";
import { ScrollArea } from "@/components/ui/scroll-area";

type ConditionType = Database["public"]["Enums"]["condition_type"];
type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

interface CardEntry {
  id: string;
  cardData: MagicCardData;
  condition: ConditionType | "";
  quantity: number;
  notes: string;
}

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
  // Product-specific fields
  quantity: number | null; // For bulk/sealed
  brand: string; // For all products
  size: string; // For accessories, clothing
  color: string; // General attribute
  material: string; // For accessories
  // Pricing
  style_tags: string[];
  original_rrp: number | null;
}

interface ShippingData {
  shipping_cost_uk: number;
  free_shipping: boolean;
  estimated_delivery_days: number;
}

const CATEGORIES = [
  "Trading Cards",
  "Sealed Products",
  "Accessories",
  "Collectibles",
  "Other"
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Trading Cards": ["Pokémon Singles", "Pokémon Graded", "Magic: The Gathering", "Yu-Gi-Oh!", "Sports Cards", "Other TCG"],
  "Sealed Products": ["Booster Boxes", "Booster Packs", "ETBs", "Tins", "Collection Boxes", "Bundle/Lot"],
  "Accessories": ["Sleeves", "Deck Boxes", "Playmats", "Binders", "Toploaders", "Dice/Counters"],
  "Collectibles": ["Figures", "Plush", "Keychains", "Pins", "Art Prints", "Posters"],
  "Other": ["Bulk Lots", "Custom Items", "Miscellaneous"]
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
  
  // Multi-card state
  const [isMultiCard, setIsMultiCard] = useState(false);
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [showCardSearch, setShowCardSearch] = useState(false);

  const [listingData, setListingData] = useState<ListingData>({
    title: "",
    description: "",
    category: "Trading Cards",
    subcategory: "",
    set_code: "",
    card_number: "",
    rarity: "",
    condition: "",
    is_graded: false,
    grading_service: "",
    grading_score: "",
    quantity: null,
    brand: "",
    size: "",
    color: "",
    material: "",
    style_tags: [],
    original_rrp: null,
  });

  // Check if current category is card-related
  const isCardCategory = listingData.category === "Trading Cards";
  const isSealedProduct = listingData.category === "Sealed Products";
  const isAccessory = listingData.category === "Accessories";
  const isCollectible = listingData.category === "Collectibles";

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

  const handleMagicSearchSelect = (cardData: MagicCardData) => {
    if (isMultiCard) {
      // Add to cards array
      const newCard: CardEntry = {
        id: `card-${Date.now()}-${Math.random()}`,
        cardData,
        condition: "",
        quantity: 1,
        notes: ""
      };
      setCards(prev => [...prev, newCard]);
      setShowCardSearch(false);
      
      toast({
        title: "Card Added!",
        description: `${cardData.title} added to bundle (${cards.length + 1}/30)`,
      });
    } else {
      // Single card mode - existing behavior
      setListingData(prev => ({
        ...prev,
        title: cardData.title,
        description: cardData.description,
        category: "Trading Cards",
        subcategory: "Pokémon Singles",
        set_code: cardData.set_code,
        card_number: cardData.card_number,
        rarity: cardData.rarity,
        original_rrp: cardData.original_rrp
      }));

      if (cardData.original_rrp) {
        setSelectedPrice(cardData.original_rrp);
      }

      if (cardData.image_url) {
        setImages([cardData.image_url]);
      }

      toast({
        title: "Card Details Found!",
        description: "We've auto-filled the details for you.",
      });
    }
  };

  const removeCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    toast({
      title: "Card Removed",
      description: "Card removed from bundle",
    });
  };

  const updateCardEntry = (cardId: string, updates: Partial<CardEntry>) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
  };

  // Description grouping options
  const [descriptionGroupBy, setDescriptionGroupBy] = useState<'set' | 'rarity' | 'none'>('set');

  // Generate multi-card description
  const generateMultiCardDescription = (groupBy: 'set' | 'rarity' | 'none'): string => {
    if (cards.length === 0) return "";

    let description = `This listing includes ${cards.length} trading card${cards.length > 1 ? 's' : ''}:\n\n`;

    if (groupBy === 'none') {
      // Simple list
      cards.forEach((card, idx) => {
        const conditionText = card.condition ? ` - ${card.condition.replace(/_/g, ' ')}` : '';
        const qtyText = card.quantity > 1 ? ` x${card.quantity}` : '';
        description += `• ${card.cardData.title} #${card.cardData.card_number}${conditionText}${qtyText}\n`;
      });
    } else if (groupBy === 'set') {
      // Group by set
      const grouped = cards.reduce((acc, card) => {
        const setName = card.cardData.set_code || 'Unknown Set';
        if (!acc[setName]) acc[setName] = [];
        acc[setName].push(card);
        return acc;
      }, {} as Record<string, CardEntry[]>);

      Object.entries(grouped).forEach(([setName, setCards]) => {
        description += `**${setName}:**\n`;
        setCards.forEach(card => {
          const conditionText = card.condition ? ` - ${card.condition.replace(/_/g, ' ')}` : '';
          const qtyText = card.quantity > 1 ? ` x${card.quantity}` : '';
          description += `• ${card.cardData.title} #${card.cardData.card_number}${conditionText}${qtyText}\n`;
          if (card.notes) description += `  ↳ ${card.notes}\n`;
        });
        description += '\n';
      });
    } else if (groupBy === 'rarity') {
      // Group by rarity
      const grouped = cards.reduce((acc, card) => {
        const rarity = card.cardData.rarity || 'Unknown Rarity';
        if (!acc[rarity]) acc[rarity] = [];
        acc[rarity].push(card);
        return acc;
      }, {} as Record<string, CardEntry[]>);

      Object.entries(grouped).forEach(([rarity, rarityCards]) => {
        description += `**${rarity}:**\n`;
        rarityCards.forEach(card => {
          const conditionText = card.condition ? ` - ${card.condition.replace(/_/g, ' ')}` : '';
          const qtyText = card.quantity > 1 ? ` x${card.quantity}` : '';
          description += `• ${card.cardData.title} #${card.cardData.card_number}${conditionText}${qtyText}\n`;
          if (card.notes) description += `  ↳ ${card.notes}\n`;
        });
        description += '\n';
      });
    }

    // Add condition notes section if any cards have notes
    const cardsWithNotes = cards.filter(c => c.notes);
    if (cardsWithNotes.length > 0 && groupBy !== 'set' && groupBy !== 'rarity') {
      description += '\n**Additional Notes:**\n';
      cardsWithNotes.forEach(card => {
        description += `• ${card.cardData.title}: ${card.notes}\n`;
      });
    }

    // Calculate total estimated value
    const totalValue = cards.reduce((sum, card) => {
      return sum + ((card.cardData.original_rrp || 0) * card.quantity);
    }, 0);

    if (totalValue > 0) {
      description += `\n**Estimated Total Value:** £${totalValue.toFixed(2)}\n`;
    }

    description += '\nAll cards will be shipped with care in protective sleeves.';

    return description;
  };

  // Auto-update description when cards or grouping changes
  useEffect(() => {
    if (isMultiCard && cards.length > 0) {
      const generatedDesc = generateMultiCardDescription(descriptionGroupBy);
      setListingData(prev => ({
        ...prev,
        title: `${cards.length} Card Bundle - ${cards[0]?.cardData.set_code || 'Mixed Set'}`,
        description: generatedDesc
      }));
    }
  }, [cards, descriptionGroupBy, isMultiCard]);

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
        category: result.category || "Trading Cards",
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
          result.title || listingData.title,
          result.set_code || listingData.set_code,
          result.card_number || listingData.card_number
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
    // Multi-card validation
    if (isMultiCard) {
      if (cards.length < 2) {
        toast({
          title: "Not enough cards",
          description: "Please add at least 2 cards to create a bundle.",
          variant: "destructive"
        });
        return;
      }

      if (cards.length > 30) {
        toast({
          title: "Too many cards",
          description: "Maximum 30 cards per bundle.",
          variant: "destructive"
        });
        return;
      }

      // Check all cards have required fields
      const invalidCards = cards.filter(c => !c.condition || c.quantity < 1);
      if (invalidCards.length > 0) {
        toast({
          title: "Incomplete card details",
          description: "All cards must have a condition and quantity of at least 1.",
          variant: "destructive"
        });
        return;
      }
    }

    // Basic validation
    if (!user || !selectedPrice || !listingData.title || !listingData.category) {
      toast({
        title: "Missing fields",
        description: "Please add a title, category, and price to list your item.",
        variant: "destructive"
      });
      return;
    }

    // Image validation - relaxed for multi-card bundles (can use card images)
    if (!isMultiCard && images.length === 0) {
      toast({
        title: "Missing photos",
        description: "Please add photos of your item.",
        variant: "destructive"
      });
      return;
    }

    // Category-specific validation (single card mode)
    if (isCardCategory && !isMultiCard && !listingData.condition) {
      toast({
        title: "Missing condition",
        description: "Please specify the condition for trading cards.",
        variant: "destructive"
      });
      return;
    }

    if (isSealedProduct && !listingData.quantity) {
      toast({
        title: "Missing quantity",
        description: "Please specify the quantity for sealed products.",
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
        subcategory: isMultiCard ? "Multi-Card Bundle" : (listingData.subcategory || null),

        // Card specific fields (only for single card Trading Cards)
        set_code: (isCardCategory && !isMultiCard) ? (listingData.set_code || null) : null,
        card_number: (isCardCategory && !isMultiCard) ? (listingData.card_number || null) : null,
        condition: (!isMultiCard && listingData.condition) ? listingData.condition : null,
        
        // General product attributes
        brand: listingData.brand || null,
        size: listingData.size || null,
        color: listingData.color || null,
        material: listingData.material || null,
        original_rrp: listingData.original_rrp || null,
        
        category_attributes: isMultiCard ? {
          is_bundle: true,
          card_count: cards.length,
          cards: cards.map(c => ({
            name: c.cardData.title,
            set_code: c.cardData.set_code,
            card_number: c.cardData.card_number,
            condition: c.condition,
            quantity: c.quantity,
            rarity: c.cardData.rarity,
            notes: c.notes || null,
            image_url: c.cardData.image_url || null,
            market_price: c.cardData.original_rrp || null
          }))
        } : (isCardCategory ? {
          rarity: listingData.rarity || null,
          is_graded: listingData.is_graded || false,
          grading_service: listingData.is_graded ? listingData.grading_service : null,
          grading_score: listingData.is_graded ? (parseFloat(listingData.grading_score) || null) : null,
        } : (isSealedProduct ? {
          quantity: listingData.quantity || 1,
        } : {})),

        seller_price: Number(selectedPrice),
        status: "active",
        published_at: new Date().toISOString(),
        ai_answer_engines_enabled: aiAnswerEnginesEnabled,

        // Shipping
        shipping_cost_uk: shipping.free_shipping ? 0 : shipping.shipping_cost_uk,
        shipping_cost_europe: null,
        shipping_cost_international: null,
        free_shipping: shipping.free_shipping,
        estimated_delivery_days: shipping.estimated_delivery_days,
      };

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingPayload)
        .select()
        .single();

      if (listingError) throw listingError;

      // Image handling for multi-card bundles vs single items
      if (isMultiCard && cards.length > 0) {
        // Multi-card bundle: Auto-pull card images from database
        const cardImages = cards
          .filter(c => c.cardData.image_url)
          .map(c => c.cardData.image_url!)
          .slice(0, 6); // Take first 6 card images

        // Insert card images as listing images
        for (let i = 0; i < cardImages.length; i++) {
          await supabase.from('listing_images').insert({
            listing_id: listing.id,
            image_url: cardImages[i],
            display_order: i,
            is_stock_photo: true
          });
        }

        // If user uploaded additional photos, add them after card images
        if (imageFiles.length > 0) {
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
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
              display_order: cardImages.length + i,
              is_stock_photo: false
            });
          }
        }
      } else {
        // Single item: Upload user photos or fetch Magic Search image
        let filesToUpload = [...imageFiles];

        if (filesToUpload.length === 0 && images.length > 0 && images[0].startsWith('http')) {
          // Magic search result - fetch and upload
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
      }

      setPublishedListingId(listing.id);
      toast({
        title: "Listed Successfully!",
        description: isMultiCard 
          ? `Your ${cards.length}-card bundle is now live on the marketplace.`
          : "Your item is now live on the marketplace.",
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
          <h1 className="text-3xl font-light text-foreground mb-4">Item Listed!</h1>
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
      <SEO title="List Your Item | 6Seven" />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultMode="signup" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 pt-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground tracking-tight">
            List Your Item
          </h1>
          <p className="text-base text-muted-foreground font-normal tracking-tight">
            Add photos and details to start selling.
          </p>
        </div>

        {/* Multi-Card Toggle - Only for Trading Cards */}
        {isCardCategory && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">List Multiple Cards</Label>
                  <p className="text-sm text-muted-foreground">
                    Create a bundle listing with up to 30 cards
                  </p>
                </div>
                <Switch
                  checked={isMultiCard}
                  onCheckedChange={(checked) => {
                    setIsMultiCard(checked);
                    if (!checked) {
                      setCards([]);
                      setShowCardSearch(false);
                    } else {
                      setShowCardSearch(true);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Magic Search Section - Only for Trading Cards */}
        {isCardCategory && !isMultiCard && (
          <div className="mb-10">
            <MagicCardSearch onSelect={handleMagicSearchSelect} />
          </div>
        )}

        {/* Multi-Card Bundle Interface */}
        {isCardCategory && isMultiCard && (
          <div className="mb-10 space-y-6">
            {/* Cards Summary Panel */}
            {cards.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Cards in Bundle</h3>
                    <Badge variant="secondary" className="text-sm">
                      {cards.length} / 30 cards
                    </Badge>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {cards.map((card, index) => (
                        <Card key={card.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Card Image */}
                              <div className="flex-shrink-0 w-16 h-20 rounded overflow-hidden bg-secondary">
                                {card.cardData.image_url && (
                                  <img 
                                    src={card.cardData.image_url} 
                                    alt={card.cardData.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>

                              {/* Card Info */}
                              <div className="flex-1 min-w-0 space-y-3">
                                <div>
                                  <h4 className="font-medium text-sm truncate">{card.cardData.title}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {card.cardData.set_code} • #{card.cardData.card_number}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  {/* Condition */}
                                  <div className="space-y-1">
                                    <Label className="text-xs">Condition</Label>
                                    <Select
                                      value={card.condition}
                                      onValueChange={(val) => updateCardEntry(card.id, { condition: val as ConditionType })}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="new_with_tags">Mint</SelectItem>
                                        <SelectItem value="like_new">Near Mint</SelectItem>
                                        <SelectItem value="excellent">Lightly Played</SelectItem>
                                        <SelectItem value="good">Moderately Played</SelectItem>
                                        <SelectItem value="fair">Heavily Played</SelectItem>
                                        <SelectItem value="poor">Damaged</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Quantity */}
                                  <div className="space-y-1">
                                    <Label className="text-xs">Quantity</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={card.quantity}
                                      onChange={(e) => updateCardEntry(card.id, { quantity: parseInt(e.target.value) || 1 })}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Notes (optional)</Label>
                                  <Input
                                    placeholder="Special notes about this card..."
                                    value={card.notes}
                                    onChange={(e) => updateCardEntry(card.id, { notes: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => removeCard(card.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Add Card Section */}
            {cards.length < 30 && (
              <div className="space-y-4">
                {showCardSearch ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Search for a card to add</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCardSearch(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <MagicCardSearch onSelect={handleMagicSearchSelect} />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCardSearch(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Card ({cards.length}/30)
                  </Button>
                )}
              </div>
            )}

            {cards.length >= 30 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Maximum Reached</AlertTitle>
                <AlertDescription>
                  You've reached the maximum of 30 cards per bundle listing.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">

          {/* Left Column: Photos (Sticky on Desktop) */}
          <div className="lg:sticky lg:top-24 space-y-4">
            {/* Multi-Card Bundle Photo Info */}
            {isMultiCard && cards.length > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900">Bundle Images</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm">
                  We'll use the first 6 card images from your bundle. You can optionally upload additional photos of the entire bundle.
                </AlertDescription>
              </Alert>
            )}

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
                  <p className="font-medium text-lg">
                    {isMultiCard ? "Add Bundle Photos (Optional)" : "Add Photos"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isMultiCard 
                      ? "Upload photos of your card bundle"
                      : "Drag & drop or tap to select"
                    }
                  </p>
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
                  Tip: Clear photos of your item help it sell faster.
                </p>
              </div>
            )}
          </div>

          {/* Auto-Fill Button - Only for Cards */}
          {isCardCategory && images.length > 0 && (
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

          {/* Card Details - Only for Trading Cards */}
          {isCardCategory && (
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
          )}

          {/* Product Details - For Sealed Products & Accessories */}
          {(isSealedProduct || isAccessory || isCollectible) && (
            <Card className="border-soft-neutral">
              <CardContent className="pt-6 space-y-6">
                <h3 className="text-lg font-light text-foreground tracking-tight">Product Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Brand - Show for all non-card products */}
                  <div className="space-y-2">
                    <Label>Brand {isSealedProduct && <span className="text-muted-foreground">(Optional)</span>}</Label>
                    <Input
                      placeholder="e.g. Pokémon Company"
                      value={listingData.brand}
                      onChange={e => setListingData({ ...listingData, brand: e.target.value })}
                    />
                  </div>

                  {/* Quantity - Required for sealed products */}
                  {isSealedProduct && (
                    <div className="space-y-2">
                      <Label>Quantity <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={listingData.quantity || ""}
                        onChange={e => setListingData({ ...listingData, quantity: parseInt(e.target.value) || null })}
                      />
                    </div>
                  )}

                  {/* Condition - Show for most products */}
                  {!isCardCategory && (
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select
                        value={listingData.condition}
                        onValueChange={val => setListingData({ ...listingData, condition: val as ConditionType })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New / Sealed</SelectItem>
                          <SelectItem value="like_new">Like New</SelectItem>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Color - For accessories and collectibles */}
                  {(isAccessory || isCollectible) && (
                    <div className="space-y-2">
                      <Label>Color <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        placeholder="e.g. Black, Blue, Red"
                        value={listingData.color}
                        onChange={e => setListingData({ ...listingData, color: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Size - For accessories */}
                  {isAccessory && (
                    <div className="space-y-2">
                      <Label>Size <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        placeholder="e.g. Standard, 60mm x 87mm"
                        value={listingData.size}
                        onChange={e => setListingData({ ...listingData, size: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Material - For accessories */}
                  {isAccessory && (
                    <div className="space-y-2">
                      <Label>Material <span className="text-muted-foreground">(Optional)</span></Label>
                      <Input
                        placeholder="e.g. Plastic, Metal, Fabric"
                        value={listingData.material}
                        onChange={e => setListingData({ ...listingData, material: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium border-b pb-2">Description</h2>
            
            {/* Multi-Card Grouping Options */}
            {isMultiCard && cards.length > 0 && (
              <Card className="bg-secondary/20">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Description Format</Label>
                    <Select
                      value={descriptionGroupBy}
                      onValueChange={(val) => setDescriptionGroupBy(val as 'set' | 'rarity' | 'none')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Group by Set</SelectItem>
                        <SelectItem value="rarity">Group by Rarity</SelectItem>
                        <SelectItem value="none">Simple List</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose how to organize cards in the description
                    </p>
                  </div>

                  {/* Description Preview */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Auto-Generated Preview
                    </Label>
                    <div className="bg-background border rounded-lg p-4 max-h-60 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {generateMultiCardDescription(descriptionGroupBy)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>
                {isMultiCard && cards.length > 0 
                  ? "Additional Notes (optional)" 
                  : "Description"
                }
              </Label>
              <Textarea
                placeholder={
                  isMultiCard && cards.length > 0
                    ? "Add any additional details or special instructions..."
                    : "Any details about the item..."
                }
                rows={isMultiCard && cards.length > 0 ? 3 : 4}
                value={listingData.description}
                onChange={e => setListingData({ ...listingData, description: e.target.value })}
              />
              {isMultiCard && cards.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  The auto-generated description above will be used. Add any extra details here.
                </p>
              )}
            </div>
          </section>

          {/* Pricing */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium border-b pb-2">Pricing</h2>

            {/* Multi-Card Bundle Pricing Calculator */}
            {isMultiCard && cards.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-3 flex-1">
                      <div>
                        <h3 className="font-medium text-blue-900 mb-1">Bundle Value Calculator</h3>
                        <p className="text-sm text-blue-700">
                          {(() => {
                            const totalEstimated = cards.reduce((sum, c) => 
                              sum + ((c.cardData.original_rrp || 0) * c.quantity), 0
                            );
                            const currentPrice = Number(selectedPrice) || 0;
                            const savings = totalEstimated > 0 && currentPrice > 0 
                              ? ((totalEstimated - currentPrice) / totalEstimated * 100).toFixed(0)
                              : 0;

                            return totalEstimated > 0 ? (
                              <>
                                Estimated individual value: <span className="font-semibold">£{totalEstimated.toFixed(2)}</span>
                                {currentPrice > 0 && currentPrice < totalEstimated && (
                                  <span className="block mt-1">
                                    🎉 Bundle saves buyers <span className="font-bold text-green-700">{savings}%</span> (£{(totalEstimated - currentPrice).toFixed(2)})
                                  </span>
                                )}
                                {currentPrice > totalEstimated && (
                                  <span className="block mt-1 text-orange-700">
                                    ⚠️ Price is above estimated value - may be harder to sell
                                  </span>
                                )}
                              </>
                            ) : (
                              "Add cards with market prices to see value estimate"
                            );
                          })()}
                        </p>
                      </div>

                      {/* Pricing Tips */}
                      <div className="bg-white rounded-lg p-3 border border-blue-100">
                        <p className="text-xs text-blue-800 font-medium mb-2">💡 Bundle Pricing Tips:</p>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• Offer 10-20% discount for faster sales</li>
                          <li>• Price competitively to beat single card buying</li>
                          <li>• Consider condition when pricing below market</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label className="text-base">
                {isMultiCard ? "Bundle Price (£)" : "Selling Price (£)"}
              </Label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-10 text-lg"
                  placeholder="0.00"
                  value={selectedPrice}
                  onChange={e => setSelectedPrice(e.target.value ? parseFloat(e.target.value) : "")}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isMultiCard 
                  ? "Set a single price for the entire bundle"
                  : "We recommend checking sold listings on eBay or 130point for accurate pricing."
                }
              </p>

              {/* Price Suggestion Button - Only for Cards */}
              {isCardCategory && (
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
              )}
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
