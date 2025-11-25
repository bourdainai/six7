import { useState, useEffect, useRef } from "react";
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
import { Upload, Check, Loader2, X, AlertCircle, ArrowRight, ExternalLink, Camera, PoundSterling, Info, Sparkles, Plus, GripVertical, Trash2, Truck } from "lucide-react";
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
import { useShippingCarriers } from "@/hooks/useShippingCarriers";

type ConditionType = Database["public"]["Enums"]["condition_type"];
type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

interface CardEntry {
  id: string;
  cardData: MagicCardData;
  condition: ConditionType | "";
  quantity: number;
  price: number; // Individual price for this variant
  notes: string;
  uploadedImages?: File[]; // Variant-specific images
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
  const [acceptsOffers, setAcceptsOffers] = useState(true);
  
  // Multi-card state
  const [isMultiCard, setIsMultiCard] = useState(false);
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [showCardSearch, setShowCardSearch] = useState(false);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  
  // Bundle pricing state
  const [bundleDiscountEnabled, setBundleDiscountEnabled] = useState(true);
  const [bundlePrice, setBundlePrice] = useState<number | "">("");

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

  // Fetch available shipping carriers
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');
  const { data: carrierData, isLoading: loadingCarriers } = useShippingCarriers({
    toCountry: 'GB',
    weight: 100, // Default weight, will be calculated based on items
    enabled: true
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
      // Add to cards array with price
      const newCard: CardEntry = {
        id: `card-${Date.now()}-${Math.random()}`,
        cardData,
        condition: "",
        quantity: 1,
        price: cardData.original_rrp || 0,
        notes: "",
        uploadedImages: []
      };
      setCards(prev => [...prev, newCard]);
      setShowCardSearch(false);
      
      // Scroll to bottom to show the new card
      setTimeout(() => {
        if (cardsScrollRef.current) {
          const scrollContainer = cardsScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTo({ 
              top: scrollContainer.scrollHeight, 
              behavior: 'smooth' 
            });
          }
        }
      }, 100);
      
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

  const handleVariantImageUpload = (cardId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files);
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, uploadedImages: [...(card.uploadedImages || []), ...newFiles] }
        : card
    ));
  };

  const removeVariantImage = (cardId: string, index: number) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, uploadedImages: card.uploadedImages?.filter((_, i) => i !== index) || [] }
        : card
    ));
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
      const invalidCards = cards.filter(c => !c.condition || c.quantity < 1 || !c.price || c.price <= 0);
      if (invalidCards.length > 0) {
        toast({
          title: "Incomplete card details",
          description: "All cards must have a condition, quantity, and price greater than 0.",
          variant: "destructive"
        });
        return;
      }
    }

    // Basic validation
    const needsPrice = isMultiCard 
      ? bundleDiscountEnabled // Only need bundle price if discount enabled
      : true; // Single items always need price
    
    const hasPrice = isMultiCard && bundleDiscountEnabled
      ? bundlePrice && Number(bundlePrice) > 0
      : selectedPrice && Number(selectedPrice) > 0;
    
    if (!user || (needsPrice && !hasPrice) || !listingData.title || !listingData.category) {
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
      // Multi-card bundle pricing validation
      if (isMultiCard && bundleDiscountEnabled) {
        if (!bundlePrice || Number(bundlePrice) <= 0) {
          toast({
            title: "Missing bundle price",
            description: "Please set a bundle price for your card bundle.",
            variant: "destructive"
          });
          return;
        }
        
        const individualTotal = cards.reduce((sum, c) => sum + (c.price * c.quantity), 0);
        if (Number(bundlePrice) >= individualTotal) {
          toast({
            title: "Bundle price too high",
            description: "Bundle price should be lower than individual prices to attract buyers.",
            variant: "destructive"
          });
          return;
        }
      }

      // Calculate pricing based on bundle mode
      const individualTotal = isMultiCard ? cards.reduce((sum, c) => sum + (c.price * c.quantity), 0) : 0;
      const bundlePriceNum = bundleDiscountEnabled && bundlePrice ? Number(bundlePrice) : 0;
      const bundleDiscount = bundleDiscountEnabled && bundlePriceNum > 0 
        ? Math.round(((individualTotal - bundlePriceNum) / individualTotal) * 100)
        : 0;
      
      // For listing display price: use bundle price if enabled, otherwise lowest variant price
      const displayPrice = isMultiCard 
        ? (bundleDiscountEnabled && bundlePriceNum > 0 ? bundlePriceNum : Math.min(...cards.map(c => c.price)))
        : Number(selectedPrice);
      
      const listingPayload: ListingInsert = {
        seller_id: user.id,
        title: listingData.title,
        description: listingData.description,
        category: listingData.category,
        subcategory: isMultiCard ? "Multi-Card Bundle" : (listingData.subcategory || null),
        has_variants: isMultiCard,

        // Bundle pricing fields
        bundle_type: isMultiCard 
          ? (bundleDiscountEnabled ? 'bundle_with_discount' : 'variants_only')
          : 'none',
        bundle_price: bundleDiscountEnabled && bundlePriceNum > 0 ? bundlePriceNum : null,
        bundle_discount_percentage: bundleDiscount || null,
        original_bundle_price: bundleDiscountEnabled && bundlePriceNum > 0 ? bundlePriceNum : null,
        remaining_bundle_price: bundleDiscountEnabled && bundlePriceNum > 0 ? bundlePriceNum : null,

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
          has_variants: true,
          bundle_mode: bundleDiscountEnabled ? 'bundle_with_discount' : 'variants_only',
          card_count: cards.length,
          total_value: individualTotal,
          individual_total: individualTotal,
          bundle_savings: bundleDiscount > 0 ? (individualTotal - bundlePriceNum) : 0,
        } : (isCardCategory ? {
          rarity: listingData.rarity || null,
          is_graded: listingData.is_graded || false,
          grading_service: listingData.is_graded ? listingData.grading_service : null,
          grading_score: listingData.is_graded ? (parseFloat(listingData.grading_score) || null) : null,
        } : (isSealedProduct ? {
          quantity: listingData.quantity || 1,
        } : {})),

        seller_price: displayPrice,
        status: "active",
        published_at: new Date().toISOString(),
        ai_answer_engines_enabled: aiAnswerEnginesEnabled,
        accepts_offers: acceptsOffers,

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

      // Image handling and variant creation for multi-card bundles vs single items
      if (isMultiCard && cards.length > 0) {
        // Create variants for each card in the bundle with progress tracking
        const variantsCreated: string[] = [];
        
        try {
          for (let idx = 0; idx < cards.length; idx++) {
            const card = cards[idx];
            
            // Show progress toast
            toast({
              title: `Creating variants... (${idx + 1}/${cards.length})`,
              description: `Processing: ${card.cardData.title}`,
            });
            
            // Upload variant-specific images if any
            const variantImageUrls: string[] = [];
            
            if (card.uploadedImages && card.uploadedImages.length > 0) {
              for (let imgIdx = 0; imgIdx < card.uploadedImages.length; imgIdx++) {
                const file = card.uploadedImages[imgIdx];
                const fileName = `${listing.id}/variants/${card.id}-${Date.now()}-${imgIdx}.jpg`;
                
                const { error: uploadError } = await supabase.storage
                  .from('listing-images')
                  .upload(fileName, file);
                
                if (!uploadError) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('listing-images')
                    .getPublicUrl(fileName);
                  variantImageUrls.push(publicUrl);
                }
              }
            }
            
            // Add stock photo if no uploaded images
            if (variantImageUrls.length === 0 && card.cardData.image_url) {
              variantImageUrls.push(card.cardData.image_url);
            }
            
            // Validate card_id exists in pokemon_card_attributes before using it
            let validCardId: string | null = null;
            if (card.cardData.card_number && card.cardData.set_code) {
              const constructedCardId = `${card.cardData.set_code}-${card.cardData.card_number}`;
              const { data: cardExists } = await supabase
                .from('pokemon_card_attributes')
                .select('card_id')
                .eq('card_id', constructedCardId)
                .single();
              
              if (cardExists) {
                validCardId = constructedCardId;
              }
            }
            
            // Insert variant into database
            const { data: newVariant, error: variantError } = await supabase
              .from('listing_variants')
              .insert({
                listing_id: listing.id,
                variant_name: card.cardData.title,
                variant_price: card.price,
                variant_condition: card.condition as ConditionType,
                variant_quantity: card.quantity,
                variant_images: variantImageUrls,
                card_id: validCardId,
                is_available: true,
                is_sold: false,
                display_order: idx
              })
              .select()
              .single();
            
            if (variantError) {
              console.error("Variant creation error for", card.cardData.title, ":", variantError);
              throw new Error(`Failed to create variant for ${card.cardData.title}: ${variantError.message}`);
            }
            
            if (newVariant) {
              variantsCreated.push(newVariant.id);
            }
          }
          
          // Success! Show final confirmation
          toast({
            title: "✅ All variants created!",
            description: `Successfully created ${variantsCreated.length} variants.`,
          });
          
        } catch (variantCreationError) {
          // Rollback: Delete the listing if variants failed
          console.error("Critical variant creation failure:", variantCreationError);
          
          await supabase.from('listings').delete().eq('id', listing.id);
          
          throw new Error(
            `Failed to create variants. ${variantCreationError instanceof Error ? variantCreationError.message : 'Unknown error'}. The listing has been rolled back.`
          );
        }
        
        // Use first card's images for parent listing display
        const firstCardImages = cards[0].uploadedImages && cards[0].uploadedImages.length > 0
          ? cards[0].uploadedImages
          : (cards[0].cardData.image_url ? [cards[0].cardData.image_url] : []);
        
        // Insert parent listing images (first variant's images)
        for (let i = 0; i < Math.min(firstCardImages.length, 6); i++) {
          const imageSource = firstCardImages[i];
          
          if (typeof imageSource === 'string') {
            // Stock photo URL
            await supabase.from('listing_images').insert({
              listing_id: listing.id,
              image_url: imageSource,
              display_order: i,
              is_stock_photo: true
            });
          } else {
            // File object - already uploaded above, skip parent listing images
          }
        }
        
        // If no images at all, use aggregated card images
        if (firstCardImages.length === 0) {
          const cardImages = cards
            .filter(c => c.cardData.image_url)
            .map(c => c.cardData.image_url!)
            .slice(0, 6);
          
          for (let i = 0; i < cardImages.length; i++) {
            await supabase.from('listing_images').insert({
              listing_id: listing.id,
              image_url: cardImages[i],
              display_order: i,
              is_stock_photo: true
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
      
      // Try to activate promotional credits if eligible
      try {
        await supabase.functions.invoke('credit-activate-promo', {
          body: { listingId: listing.id }
        });
      } catch (promoError) {
        // Silently fail - promo activation is not critical
        console.log('Promo activation not applicable or failed:', promoError);
      }
      
      const bundleMode = isMultiCard
        ? (bundleDiscountEnabled ? 'bundle with discount' : 'individual variants')
        : null;
      
      toast({
        title: "Listed Successfully!",
        description: isMultiCard 
          ? `Your ${cards.length}-card bundle is now live ${bundleMode ? `(${bundleMode} mode)` : ''}.`
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
            {/* Cards Summary Panel - Balanced Scrollable View */}
            {cards.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">
                        Cards in Bundle
                      </h3>
                      <Badge variant="secondary" className="text-sm font-semibold">
                        {cards.length} / 30 cards
                      </Badge>
                    </div>
                    {cards.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        ↓ Scroll to see all cards
                      </p>
                    )}
                  </div>

                  {/* Scrollable Container with Better Card Visibility */}
                  <div className="relative">
                    <ScrollArea ref={cardsScrollRef} className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {cards.map((card, index) => (
                          <Card key={card.id} className="border-2 hover:border-primary/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-[100px_1fr_auto] gap-4 items-start">
                              {/* Card Image Preview - Medium Size */}
                              <div className="flex flex-col gap-2">
                                {card.cardData.image_url ? (
                                  <div className="aspect-[2.5/3.5] bg-muted rounded-lg overflow-hidden border-2 border-border shadow-sm">
                                    <img
                                      src={card.cardData.image_url}
                                      alt={card.cardData.title}
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="aspect-[2.5/3.5] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                                    <span className="text-xs text-muted-foreground text-center p-2">No image</span>
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs justify-center">
                                  #{index + 1}
                                </Badge>
                              </div>

                              {/* Card Details & Form */}
                              <div className="space-y-3 min-w-0">
                                {/* Card Info Header */}
                                <div>
                                  <h4 className="font-semibold text-sm line-clamp-2">{card.cardData.title}</h4>
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <Badge variant="secondary" className="text-xs">
                                      #{card.cardData.card_number}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {card.cardData.set_code}
                                    </Badge>
                                    {card.cardData.rarity && (
                                      <Badge variant="outline" className="text-xs">
                                        {card.cardData.rarity}
                                      </Badge>
                                    )}
                                  </div>
                                  {card.cardData.original_rrp && (
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                      Value: <span className="font-semibold text-foreground">£{card.cardData.original_rrp.toFixed(2)}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                  {/* Condition - Required */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                      Condition
                                      <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                      value={card.condition}
                                      onValueChange={(val) => updateCardEntry(card.id, { condition: val as ConditionType })}
                                    >
                                      <SelectTrigger className={`h-9 text-sm ${!card.condition ? 'border-destructive' : ''}`}>
                                        <SelectValue placeholder="Select..." />
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

                                  {/* Quantity - Required */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                      Qty
                                      <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="99"
                                      value={card.quantity}
                                      onChange={(e) => updateCardEntry(card.id, { quantity: parseInt(e.target.value) || 1 })}
                                      className={`h-9 ${card.quantity < 1 ? 'border-destructive' : ''}`}
                                    />
                                  </div>

                                  {/* Price - Required */}
                                  <div className="space-y-1.5 col-span-2">
                                    <Label className="text-xs font-semibold flex items-center gap-1">
                                      Price (£)
                                      <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={card.price || ""}
                                      onChange={(e) => updateCardEntry(card.id, { price: parseFloat(e.target.value) || 0 })}
                                      className={`h-9 ${!card.price || card.price <= 0 ? 'border-destructive' : ''}`}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Variant Images (Optional) */}
                                <div className="space-y-1.5">
                                  <Label className="text-xs">Variant Photos (optional)</Label>
                                  <div className="space-y-2">
                                    {card.uploadedImages && card.uploadedImages.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {card.uploadedImages.map((file, idx) => (
                                          <div key={idx} className="relative group">
                                            <img
                                              src={URL.createObjectURL(file)}
                                              alt={`Variant ${idx + 1}`}
                                              className="w-16 h-16 object-cover rounded border"
                                            />
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="destructive"
                                              className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => removeVariantImage(card.id, idx)}
                                            >
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8"
                                      onClick={() => document.getElementById(`variant-upload-${card.id}`)?.click()}
                                    >
                                      <Camera className="w-3 h-3 mr-2" />
                                      {card.uploadedImages?.length ? 'Add More Photos' : 'Add Photos'}
                                    </Button>
                                    <input
                                      id={`variant-upload-${card.id}`}
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => handleVariantImageUpload(card.id, e.target.files)}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => removeCard(card.id)}
                                title="Remove card"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      </div>
                    </ScrollArea>
                    
                    {/* Bottom fade indicator when there's overflow */}
                    {cards.length > 2 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
                    )}
                  </div>
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

            {/* Multi-Card Bundle Pricing Options */}
            {isMultiCard && cards.length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="pt-6 space-y-5">
                  {/* Bundle Discount Toggle */}
                  <div className="flex items-start justify-between gap-4 pb-4 border-b">
                    <div className="space-y-1">
                      <Label className="text-base font-medium">Enable Bundle Discount?</Label>
                      <p className="text-sm text-muted-foreground">
                        Offer a special price when buyers purchase all cards together
                      </p>
                    </div>
                    <Switch
                      checked={bundleDiscountEnabled}
                      onCheckedChange={setBundleDiscountEnabled}
                    />
                  </div>

                  {/* Important: Bundle Discount Rule */}
                  {bundleDiscountEnabled && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">Bundle Discount Rule</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        Your discount percentage will <strong>only apply when 2 or more cards remain available</strong>. 
                        Once only 1 card is left, buyers will pay the individual card price without discount.
                        This ensures fair pricing as your bundle reduces in size.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Individual Card Prices Summary */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Individual Card Prices:</Label>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      {cards.map((card, idx) => (
                        <div key={card.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[200px]">
                            {idx + 1}. {card.cardData.title}
                          </span>
                          <span className="font-medium">£{card.price.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
                        <span>Total if sold individually:</span>
                        <span>£{cards.reduce((sum, c) => sum + (c.price * c.quantity), 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bundle Price Input (only if discount enabled) */}
                  {bundleDiscountEnabled && (
                    <div className="space-y-3">
                      <Label className="text-base font-medium">
                        Bundle Price (All {cards.length} Cards) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="pl-10 text-lg"
                          placeholder="0.00"
                          value={bundlePrice}
                          onChange={e => setBundlePrice(e.target.value ? parseFloat(e.target.value) : "")}
                        />
                      </div>

                      {/* Savings Calculator */}
                      {bundlePrice && Number(bundlePrice) > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                          {(() => {
                            const individualTotal = cards.reduce((sum, c) => sum + (c.price * c.quantity), 0);
                            const bundlePriceNum = Number(bundlePrice);
                            const savings = individualTotal - bundlePriceNum;
                            const savingsPercent = (savings / individualTotal) * 100;

                            if (bundlePriceNum >= individualTotal) {
                              return (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle>No Discount</AlertTitle>
                                  <AlertDescription>
                                    Bundle price should be lower than £{individualTotal.toFixed(2)} (individual total) to incentivize buyers.
                                  </AlertDescription>
                                </Alert>
                              );
                            }

                            return (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-green-900">
                                      Great Bundle Deal! 🎉
                                    </p>
                                    <p className="text-sm text-green-700">
                                      Buyers save <span className="font-bold">£{savings.toFixed(2)}</span> ({savingsPercent.toFixed(1)}% discount)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        💡 Recommended: Offer 10-20% discount for faster sales
                      </p>
                    </div>
                  )}

                  {/* Note for variants-only mode */}
                  {!bundleDiscountEnabled && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Variants Only Mode</AlertTitle>
                      <AlertDescription>
                        Cards will be listed separately. Buyers can purchase individual cards or use bulk checkout to buy multiple cards.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Single Item Pricing - Only show for non-multi-card listings */}
            {!isMultiCard && (
              <div className="space-y-2">
                <Label className="text-base">
                  Selling Price (£)
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
                  We recommend checking sold listings on eBay or 130point for accurate pricing.
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
            )}
          </section>

          {/* Offers Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium border-b pb-2">Offer Settings</h2>
            <div className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Accept Offers on This Listing?</Label>
                <p className="text-sm text-muted-foreground">
                  Enable if you're open to negotiating the price. Disable for firm pricing only.
                </p>
              </div>
              <Switch
                checked={acceptsOffers}
                onCheckedChange={setAcceptsOffers}
              />
            </div>
            {!acceptsOffers && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Buyers will only see "Buy Now" - no offer button will be shown.
                </AlertDescription>
              </Alert>
            )}
          </section>

          {/* Shipping */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium border-b pb-2 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping
            </h2>
            <div className="space-y-4">
              {/* Free Shipping Toggle */}
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
                <div className="space-y-4 pl-6 border-l-2 border-border">
                  {/* Carrier Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Shipping Service
                      <span className="text-muted-foreground font-normal ml-2">(Select your preferred carrier)</span>
                    </Label>
                    {loadingCarriers ? (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading shipping options...</span>
                      </div>
                    ) : carrierData?.rates && carrierData.rates.length > 0 ? (
                      <Select
                        value={selectedCarrier}
                        onValueChange={(value) => {
                          setSelectedCarrier(value);
                          const carrier = carrierData.rates.find(r => r.carrierCode === value);
                          if (carrier) {
                            setShipping(prev => ({
                              ...prev,
                              shipping_cost_uk: carrier.rate,
                              estimated_delivery_days: carrier.estimatedDays
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Choose shipping service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {carrierData.rates.map((carrier) => (
                            <SelectItem key={carrier.carrierCode} value={carrier.carrierCode}>
                              <div className="flex items-center justify-between w-full gap-4">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{carrier.carrierName}</span>
                                  <span className="text-xs text-muted-foreground">{carrier.serviceName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="text-xs">
                                    {carrier.estimatedDays} days
                                  </Badge>
                                  <span className="font-semibold">£{carrier.rate.toFixed(2)}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Shipping rates will be calculated automatically. You can set a custom rate below.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Manual Price Override */}
                  <div className="space-y-2">
                    <Label className="text-sm">
                      UK Shipping Cost (£)
                      {selectedCarrier && (
                        <span className="text-muted-foreground ml-2">(Auto-filled from selected service)</span>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={shipping.shipping_cost_uk}
                      onChange={e => setShipping(prev => ({ ...prev, shipping_cost_uk: parseFloat(e.target.value) || 0 }))}
                      className="max-w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can override the auto-filled price if needed
                    </p>
                  </div>
                </div>
              )}

              {/* Estimated Delivery */}
              <div className="space-y-2">
                <Label className="text-sm">Estimated Delivery (Days)</Label>
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
