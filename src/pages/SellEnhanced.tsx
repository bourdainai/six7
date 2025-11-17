import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, Check, Loader2, DollarSign, Package, Scale, Ruler, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { PhotoQualityFeedback } from "@/components/PhotoQualityFeedback";
import { ImageAnalysisPanel } from "@/components/ImageAnalysisPanel";

interface ListingData {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  condition: string;
  style_tags: string[];
  original_rrp: number | null;
}

interface ShippingData {
  shipping_cost_uk: number;
  shipping_cost_europe: number;
  shipping_cost_international: number;
  free_shipping: boolean;
  estimated_delivery_days: number;
  package_weight: number | null;
  package_length: number | null;
  package_width: number | null;
  package_height: number | null;
}

interface PricingData {
  suggested_price: number;
  quick_sale_price: number;
  ambitious_price: number;
  reasoning: string;
  estimated_days_to_sell?: {
    quick: string;
    fair: string;
    ambitious: string;
  };
}

interface QualityAnalysis {
  overall_quality: number;
  lighting: number;
  angle: number;
  background: number;
  clarity: number;
}

interface DamageDetected {
  type: string;
  severity: "minor" | "moderate" | "significant";
  confidence: number;
  location: string;
}

interface LogoDetected {
  brand: string;
  confidence: number;
  authentic_appearance: boolean;
}

interface ImageAnalysisData {
  quality_analysis?: QualityAnalysis;
  damage_detected?: DamageDetected[];
  logo_analysis?: {
    logos_detected: LogoDetected[];
    counterfeit_risk: number;
  };
  stock_photo_detected?: boolean;
  photo_advice?: string[];
}

const CATEGORIES = [
  "Outerwear", "Tops", "Bottoms", "Dresses", "Accessories", 
  "Shoes", "Trading Cards", "Electronics", "Books", "Music"
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Outerwear": ["Jackets", "Coats", "Blazers", "Cardigans", "Hoodies"],
  "Tops": ["T-Shirts", "Shirts", "Blouses", "Sweaters", "Tank Tops"],
  "Bottoms": ["Jeans", "Trousers", "Shorts", "Skirts", "Leggings"],
  "Dresses": ["Casual", "Formal", "Vintage", "Maxi", "Mini"],
  "Accessories": ["Bags", "Jewelry", "Belts", "Hats", "Scarves"],
  "Shoes": ["Sneakers", "Boots", "Heels", "Flats", "Sandals"],
  "Trading Cards": ["Sports", "Gaming", "Collectibles"],
  "Electronics": ["Phones", "Laptops", "Gaming", "Audio"],
  "Books": ["Fiction", "Non-Fiction", "Textbooks", "Comics"],
  "Music": ["Vinyl", "CDs", "Cassettes", "Instruments"]
};

const SellEnhanced = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisData | null>(null);
  const [listingData, setListingData] = useState<ListingData>({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    size: "",
    color: "",
    material: "",
    condition: "",
    style_tags: [],
    original_rrp: null,
  });
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);
  const [shipping, setShipping] = useState<ShippingData>({
    shipping_cost_uk: 5.99,
    shipping_cost_europe: 12.99,
    shipping_cost_international: 19.99,
    free_shipping: false,
    estimated_delivery_days: 3,
    package_weight: null,
    package_length: null,
    package_width: null,
    package_height: null,
  });
  const [styleTagInput, setStyleTagInput] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const fileArray = Array.from(files);
    setImageFiles(fileArray);
    
    // Create preview URLs
    const newImages = fileArray.map(file => URL.createObjectURL(file));
    setImages(newImages);
    
    // Start AI analysis
    setAnalyzing(true);
    setAnalyzed(false);

    try {
      // Convert images to base64 for AI analysis
      const base64Images = await Promise.all(
        fileArray.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
        })
      );

      // Call AI vision extraction
      const { data: visionData, error: visionError } = await supabase.functions.invoke(
        'analyze-listing-images',
        { body: { images: base64Images } }
      );

      if (visionError) throw visionError;
      if (!visionData?.success) throw new Error(visionData?.error || "Analysis failed");

      const extracted = visionData.data;
      console.log("Extracted data:", extracted);

      // Update listing data
      setListingData({
        title: extracted.title || "",
        description: extracted.description || "",
        category: extracted.category || "",
        subcategory: extracted.subcategory || "",
        brand: extracted.brand || "",
        size: extracted.size_hints || "",
        color: extracted.color || "",
        material: extracted.material || "",
        condition: extracted.condition || "",
        style_tags: extracted.style_tags || [],
        original_rrp: null,
      });

      // Capture image analysis data
      setImageAnalysis({
        quality_analysis: extracted.quality_analysis,
        damage_detected: extracted.damage_detected,
        logo_analysis: extracted.logo_analysis,
        stock_photo_detected: extracted.stock_photo_detected,
        photo_advice: extracted.photo_advice
      });

      // Get pricing suggestions
      const { data: pricingData, error: pricingError } = await supabase.functions.invoke(
        'suggest-listing-price',
        { 
          body: { 
            category: extracted.category,
            subcategory: extracted.subcategory,
            brand: extracted.brand,
            condition: extracted.condition,
            originalRrp: null
          } 
        }
      );

      if (pricingError) throw pricingError;
      if (!pricingData?.success) throw new Error(pricingData?.error || "Pricing failed");

      setPricing(pricingData.data);
      setSelectedPrice(pricingData.data.suggested_price);
      
      setAnalyzed(true);
      toast({
        title: "AI Analysis Complete",
        description: "Your item has been analyzed. Review and adjust as needed.",
      });

    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again or fill in details manually.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const addStyleTag = () => {
    if (styleTagInput.trim() && !listingData.style_tags.includes(styleTagInput.trim())) {
      setListingData({
        ...listingData,
        style_tags: [...listingData.style_tags, styleTagInput.trim()]
      });
      setStyleTagInput("");
    }
  };

  const removeStyleTag = (tag: string) => {
    setListingData({
      ...listingData,
      style_tags: listingData.style_tags.filter(t => t !== tag)
    });
  };

  const handlePublish = async () => {
    if (!user || !selectedPrice || !listingData.title || !listingData.category) {
      toast({
        title: "Cannot publish",
        description: "Please complete all required fields (title, category, price).",
        variant: "destructive"
      });
      return;
    }

    setPublishing(true);

    try {
      // Prepare package dimensions
      const packageDimensions = shipping.package_length && shipping.package_width && shipping.package_height
        ? {
            length: shipping.package_length,
            width: shipping.package_width,
            height: shipping.package_height
          }
        : null;

      // Create listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          title: listingData.title,
          description: listingData.description,
          category: listingData.category,
          subcategory: listingData.subcategory,
          brand: listingData.brand,
          size: listingData.size,
          color: listingData.color,
          material: listingData.material,
          condition: listingData.condition as any,
          seller_price: selectedPrice,
          original_rrp: listingData.original_rrp,
          suggested_price: pricing?.suggested_price || null,
          quick_sale_price: pricing?.quick_sale_price || null,
          ambitious_price: pricing?.ambitious_price || null,
          style_tags: listingData.style_tags as any,
          status: 'active' as any,
          published_at: new Date().toISOString(),
          shipping_cost_uk: shipping.shipping_cost_uk,
          shipping_cost_europe: shipping.shipping_cost_europe,
          shipping_cost_international: shipping.shipping_cost_international,
          free_shipping: shipping.free_shipping,
          estimated_delivery_days: shipping.estimated_delivery_days,
          package_weight: shipping.package_weight,
          package_dimensions: packageDimensions as any,
        } as any)
        .select()
        .single();

      if (listingError) throw listingError;

      // Upload images to storage and create listing_images records
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileName = `${listing.id}/${Date.now()}-${i}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        // Prepare image analysis data
        const imageData: any = {
          listing_id: listing.id,
          image_url: publicUrl,
          display_order: i
        };

        // Add quality and analysis data if available
        if (imageAnalysis) {
          if (imageAnalysis.quality_analysis) {
            imageData.quality_score = imageAnalysis.quality_analysis.overall_quality;
            imageData.lighting_score = imageAnalysis.quality_analysis.lighting;
            imageData.angle_score = imageAnalysis.quality_analysis.angle;
            imageData.background_score = imageAnalysis.quality_analysis.background;
          }
          if (imageAnalysis.damage_detected) {
            imageData.damage_detected = imageAnalysis.damage_detected;
          }
          if (imageAnalysis.logo_analysis) {
            imageData.logo_detected = imageAnalysis.logo_analysis.logos_detected;
            imageData.counterfeit_risk_score = imageAnalysis.logo_analysis.counterfeit_risk;
          }
          if (imageAnalysis.stock_photo_detected !== undefined) {
            imageData.is_stock_photo = imageAnalysis.stock_photo_detected;
          }
        }

        await supabase.from('listing_images').insert(imageData);
      }

      toast({
        title: "Listed Successfully!",
        description: "Your item is now live on the marketplace.",
      });

      // Reset form
      setImages([]);
      setImageFiles([]);
      setImageAnalysis(null);
      setListingData({
        title: "",
        description: "",
        category: "",
        subcategory: "",
        brand: "",
        size: "",
        color: "",
        material: "",
        condition: "",
        style_tags: [],
        original_rrp: null,
      });
      setPricing(null);
      setSelectedPrice(0);
      setAnalyzed(false);
      setShipping({
        shipping_cost_uk: 5.99,
        shipping_cost_europe: 12.99,
        shipping_cost_international: 19.99,
        free_shipping: false,
        estimated_delivery_days: 3,
        package_weight: null,
        package_length: null,
        package_width: null,
        package_height: null,
      });

      // Trigger embedding generation for the new listing
      try {
        await supabase.functions.invoke('generate-listing-embedding', {
          body: { listingId: listing.id }
        });
        console.log("Embedding generation triggered");
      } catch (embError) {
        console.error("Failed to generate embedding:", embError);
      }

    } catch (error: any) {
      console.error("Publish error:", error);
      toast({
        title: "Publishing Failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <PageLayout>
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-light text-foreground">List Your Item</h1>
        <p className="text-base text-muted-foreground font-light">
          Upload photos and let AI analyze everything in seconds
        </p>
      </div>
      
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="photos">1. Photos</TabsTrigger>
            <TabsTrigger value="details" disabled={!analyzed}>2. Details</TabsTrigger>
            <TabsTrigger value="pricing" disabled={!analyzed}>3. Pricing</TabsTrigger>
            <TabsTrigger value="shipping" disabled={!analyzed}>4. Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Photos</CardTitle>
                <CardDescription>Upload 1-5 photos of your item. AI will analyze them automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary transition-colors min-h-[400px]"
                >
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                          <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
                            <span className="text-xs font-medium">{idx + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                      <span className="text-base font-medium text-foreground mb-2">Click to upload photos</span>
                      <span className="text-sm text-muted-foreground">1-5 images recommended</span>
                    </>
                  )}
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={!user}
                />

                {!user && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">
                    Sign in to start listing
                  </p>
                )}

                {analyzing && (
                  <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm font-medium text-foreground">AI analyzing your item...</span>
                  </div>
                )}

                {analyzed && (
                  <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-foreground">Analysis complete! Continue to Details.</span>
                  </div>
                )}

                {/* Image Quality Feedback */}
                {analyzed && imageAnalysis?.quality_analysis && (
                  <div className="mt-6">
                    <PhotoQualityFeedback
                      quality={imageAnalysis.quality_analysis}
                      stockPhoto={imageAnalysis.stock_photo_detected}
                      advice={imageAnalysis.photo_advice}
                    />
                  </div>
                )}

                {/* Damage & Logo Analysis */}
                {analyzed && (imageAnalysis?.damage_detected || imageAnalysis?.logo_analysis) && (
                  <div className="mt-6">
                    <ImageAnalysisPanel
                      damageDetected={imageAnalysis.damage_detected}
                      logoAnalysis={imageAnalysis.logo_analysis}
                      condition={listingData.condition}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Item Details</CardTitle>
                  {analyzed && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Generated</span>
                    </div>
                  )}
                </div>
                <CardDescription>Review and edit the details extracted by AI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Item title"
                    value={listingData.title}
                    onChange={(e) => setListingData({...listingData, title: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={listingData.category}
                      onValueChange={(value) => {
                        setListingData({
                          ...listingData,
                          category: value,
                          subcategory: "" // Reset subcategory when category changes
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select
                      value={listingData.subcategory}
                      onValueChange={(value) => setListingData({...listingData, subcategory: value})}
                      disabled={!listingData.category}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {listingData.category && SUBCATEGORIES[listingData.category]?.map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Brand name"
                      value={listingData.brand}
                      onChange={(e) => setListingData({...listingData, brand: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      placeholder="e.g., M, 42, 10"
                      value={listingData.size}
                      onChange={(e) => setListingData({...listingData, size: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      placeholder="Primary color"
                      value={listingData.color}
                      onChange={(e) => setListingData({...listingData, color: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={listingData.condition}
                      onValueChange={(value) => setListingData({...listingData, condition: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_with_tags">New with Tags</SelectItem>
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    placeholder="e.g., Cotton, Leather, Polyester"
                    value={listingData.material}
                    onChange={(e) => setListingData({...listingData, material: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your item in detail..."
                    rows={5}
                    value={listingData.description}
                    onChange={(e) => setListingData({...listingData, description: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="style-tags">Style Tags</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="style-tags"
                      placeholder="Add style tag (e.g., vintage, casual, formal)"
                      value={styleTagInput}
                      onChange={(e) => setStyleTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addStyleTag()}
                    />
                    <Button type="button" onClick={addStyleTag} variant="outline">
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                  {listingData.style_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {listingData.style_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            onClick={() => removeStyleTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set your price and original retail price if applicable</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="original-rrp">Original Retail Price (Optional)</Label>
                  <Input
                    id="original-rrp"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={listingData.original_rrp || ""}
                    onChange={(e) => setListingData({
                      ...listingData,
                      original_rrp: e.target.value ? parseFloat(e.target.value) : null
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The original price when new (helps buyers see the savings)
                  </p>
                </div>

                {pricing && (
                  <div className="p-6 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">AI Price Suggestions</span>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 rounded-lg border-2 border-border hover:border-primary cursor-pointer transition-colors bg-background">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="price"
                              checked={selectedPrice === pricing.quick_sale_price}
                              onChange={() => setSelectedPrice(pricing.quick_sale_price)}
                              className="text-primary"
                            />
                            <span className="font-medium text-foreground">Quick Sale</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                            {pricing.estimated_days_to_sell?.quick || "3-7 days"}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-foreground">£{pricing.quick_sale_price.toFixed(2)}</span>
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="price"
                              checked={selectedPrice === pricing.suggested_price}
                              onChange={() => setSelectedPrice(pricing.suggested_price)}
                              className="text-primary"
                            />
                            <span className="font-medium text-foreground">Fair Price</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Recommended</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                            {pricing.estimated_days_to_sell?.fair || "1-2 weeks"}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-primary">£{pricing.suggested_price.toFixed(2)}</span>
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-lg border-2 border-border hover:border-primary cursor-pointer transition-colors bg-background">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="price"
                              checked={selectedPrice === pricing.ambitious_price}
                              onChange={() => setSelectedPrice(pricing.ambitious_price)}
                              className="text-primary"
                            />
                            <span className="font-medium text-foreground">Premium Price</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                            {pricing.estimated_days_to_sell?.ambitious || "3-4 weeks"}
                          </p>
                        </div>
                        <span className="text-2xl font-bold text-foreground">£{pricing.ambitious_price.toFixed(2)}</span>
                      </label>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">{pricing.reasoning}</p>
                  </div>
                )}

                {!pricing && (
                  <div className="p-6 rounded-lg bg-muted border border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      Upload photos first to get AI price suggestions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping & Packaging</CardTitle>
                <CardDescription>Configure shipping costs and package details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2 p-4 rounded-lg border border-border">
                  <input
                    type="checkbox"
                    id="free-shipping"
                    checked={shipping.free_shipping}
                    onChange={(e) => setShipping({ ...shipping, free_shipping: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="free-shipping" className="cursor-pointer font-medium">
                    Offer free shipping
                  </Label>
                </div>

                {!shipping.free_shipping && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ship-uk">UK Shipping (£)</Label>
                      <Input
                        id="ship-uk"
                        type="number"
                        step="0.01"
                        value={shipping.shipping_cost_uk}
                        onChange={(e) => setShipping({ ...shipping, shipping_cost_uk: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ship-eu">Europe Shipping (£)</Label>
                      <Input
                        id="ship-eu"
                        type="number"
                        step="0.01"
                        value={shipping.shipping_cost_europe}
                        onChange={(e) => setShipping({ ...shipping, shipping_cost_europe: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ship-intl">International Shipping (£)</Label>
                      <Input
                        id="ship-intl"
                        type="number"
                        step="0.01"
                        value={shipping.shipping_cost_international}
                        onChange={(e) => setShipping({ ...shipping, shipping_cost_international: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="delivery-days">Estimated Delivery (days)</Label>
                  <Input
                    id="delivery-days"
                    type="number"
                    value={shipping.estimated_delivery_days}
                    onChange={(e) => setShipping({ ...shipping, estimated_delivery_days: parseInt(e.target.value) || 3 })}
                    className="mt-1"
                  />
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Package Details (Optional)</span>
                  </div>

                  <div>
                    <Label htmlFor="package-weight" className="flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Package Weight (kg)
                    </Label>
                    <Input
                      id="package-weight"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={shipping.package_weight || ""}
                      onChange={(e) => setShipping({ ...shipping, package_weight: e.target.value ? parseFloat(e.target.value) : null })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Ruler className="w-4 h-4" />
                      Package Dimensions (cm)
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="package-length" className="text-xs">Length</Label>
                        <Input
                          id="package-length"
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={shipping.package_length || ""}
                          onChange={(e) => setShipping({ ...shipping, package_length: e.target.value ? parseFloat(e.target.value) : null })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="package-width" className="text-xs">Width</Label>
                        <Input
                          id="package-width"
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={shipping.package_width || ""}
                          onChange={(e) => setShipping({ ...shipping, package_width: e.target.value ? parseFloat(e.target.value) : null })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="package-height" className="text-xs">Height</Label>
                        <Input
                          id="package-height"
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={shipping.package_height || ""}
                          onChange={(e) => setShipping({ ...shipping, package_height: e.target.value ? parseFloat(e.target.value) : null })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={!analyzed || publishing || !selectedPrice}
                  onClick={handlePublish}
                >
                  {publishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Publish Listing
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default SellEnhanced;
