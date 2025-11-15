import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Sparkles, Check, Loader2, DollarSign, Clock, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

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
}

interface ShippingData {
  shipping_cost_uk: number;
  shipping_cost_europe: number;
  shipping_cost_international: number;
  free_shipping: boolean;
  estimated_delivery_days: number;
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

const SellEnhanced = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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
    style_tags: []
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
  });
  
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
        style_tags: extracted.style_tags || []
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

  const handlePublish = async () => {
    if (!user || !selectedPrice) {
      toast({
        title: "Cannot publish",
        description: "Please complete all required fields.",
        variant: "destructive"
      });
      return;
    }

    setPublishing(true);

    try {
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

        await supabase.from('listing_images').insert({
          listing_id: listing.id,
          image_url: publicUrl,
          display_order: i
        });
      }

      toast({
        title: "Listed Successfully!",
        description: "Your item is now live on the marketplace.",
      });

      // Reset form
      setImages([]);
      setImageFiles([]);
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
        style_tags: []
      });
      setPricing(null);
      setAnalyzed(false);

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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 text-foreground">List Your Item</h1>
            <p className="text-xl text-muted-foreground">
              Upload photos and let AI analyze everything in seconds
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Upload Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">Photos</h2>
              
              <Label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary transition-colors min-h-[300px]"
              >
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {images.map((img, idx) => (
                      <img key={idx} src={img} alt={`Upload ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                    <span className="text-sm text-muted-foreground">Click to upload photos</span>
                    <span className="text-xs text-muted-foreground mt-2">1-5 images recommended</span>
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
                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-sm font-medium text-foreground">AI analyzing your item...</span>
                </div>
              )}

              {analyzed && (
                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">Analysis complete!</span>
                </div>
              )}
            </Card>

            {/* Right: Details Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Details</h2>
                {analyzed && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Generated</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Item title"
                    value={listingData.title}
                    onChange={(e) => setListingData({...listingData, title: e.target.value})}
                    disabled={!analyzed}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="Category"
                      value={listingData.category}
                      onChange={(e) => setListingData({...listingData, category: e.target.value})}
                      disabled={!analyzed}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Input
                      id="subcategory"
                      placeholder="Subcategory"
                      value={listingData.subcategory}
                      onChange={(e) => setListingData({...listingData, subcategory: e.target.value})}
                      disabled={!analyzed}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Brand"
                      value={listingData.brand}
                      onChange={(e) => setListingData({...listingData, brand: e.target.value})}
                      disabled={!analyzed}
                    />
                  </div>
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      placeholder="Size"
                      value={listingData.size}
                      onChange={(e) => setListingData({...listingData, size: e.target.value})}
                      disabled={!analyzed}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      placeholder="Color"
                      value={listingData.color}
                      onChange={(e) => setListingData({...listingData, color: e.target.value})}
                      disabled={!analyzed}
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={listingData.condition}
                      onValueChange={(value) => setListingData({...listingData, condition: value})}
                      disabled={!analyzed}
                    >
                      <SelectTrigger>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description"
                    rows={4}
                    value={listingData.description}
                    onChange={(e) => setListingData({...listingData, description: e.target.value})}
                    disabled={!analyzed}
                  />
                </div>

                {pricing && (
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">AI Price Suggestions</span>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:border-primary cursor-pointer transition-colors">
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
                          <p className="text-xs text-muted-foreground ml-6">
                            {pricing.estimated_days_to_sell?.quick || "3-7 days"}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-foreground">${pricing.quick_sale_price}</span>
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer">
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
                          <p className="text-xs text-muted-foreground ml-6">
                            {pricing.estimated_days_to_sell?.fair || "1-2 weeks"}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-primary">${pricing.suggested_price}</span>
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:border-primary cursor-pointer transition-colors">
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
                          <p className="text-xs text-muted-foreground ml-6">
                            {pricing.estimated_days_to_sell?.ambitious || "3-4 weeks"}
                          </p>
                        </div>
                        <span className="text-xl font-bold text-foreground">${pricing.ambitious_price}</span>
                      </label>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">{pricing.reasoning}</p>
                  </div>
                )}

                {/* Shipping Section */}
                <div className="p-4 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">Shipping Options</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="free-shipping"
                        checked={shipping.free_shipping}
                        onChange={(e) => setShipping({ ...shipping, free_shipping: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="free-shipping" className="cursor-pointer">
                        Offer free shipping
                      </Label>
                    </div>

                    {!shipping.free_shipping && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="ship-uk" className="text-xs">UK (£)</Label>
                          <Input
                            id="ship-uk"
                            type="number"
                            step="0.01"
                            value={shipping.shipping_cost_uk}
                            onChange={(e) => setShipping({ ...shipping, shipping_cost_uk: parseFloat(e.target.value) || 0 })}
                            disabled={!analyzed}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-eu" className="text-xs">Europe (£)</Label>
                          <Input
                            id="ship-eu"
                            type="number"
                            step="0.01"
                            value={shipping.shipping_cost_europe}
                            onChange={(e) => setShipping({ ...shipping, shipping_cost_europe: parseFloat(e.target.value) || 0 })}
                            disabled={!analyzed}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ship-intl" className="text-xs">International (£)</Label>
                          <Input
                            id="ship-intl"
                            type="number"
                            step="0.01"
                            value={shipping.shipping_cost_international}
                            onChange={(e) => setShipping({ ...shipping, shipping_cost_international: parseFloat(e.target.value) || 0 })}
                            disabled={!analyzed}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="delivery-days" className="text-xs">Estimated Delivery (days)</Label>
                      <Input
                        id="delivery-days"
                        type="number"
                        value={shipping.estimated_delivery_days}
                        onChange={(e) => setShipping({ ...shipping, estimated_delivery_days: parseInt(e.target.value) || 3 })}
                        disabled={!analyzed}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg" 
                  disabled={!analyzed || publishing}
                  onClick={handlePublish}
                >
                  {publishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Publish Listing
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellEnhanced;
