import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Check, Loader2, Package, Scale, Ruler, Tag, X, AlertCircle, ArrowRight, ExternalLink, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/auth/AuthModal";
import { useQuery } from "@tanstack/react-query";
import type { Database, Json } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import { useEmailNotification } from "@/hooks/useEmailNotification";

type PackageDimensions = {
  length: number;
  width: number;
  height: number;
  unit: string;
};

type ConditionType = Database["public"]["Enums"]["condition_type"];
type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

interface ListingData {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  size: string;
  color: string;
  material: string;
  condition: ConditionType | "";
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
  const navigate = useNavigate();
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState("photos");
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
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [publishing, setPublishing] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isVerified: emailVerified } = useEmailVerification();
  const { sendEmail } = useEmailNotification();

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

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, authLoading]);

  // Check if seller needs to set up payments (warn but don't block)
  const needsPaymentSetup = user && profile && !profile.stripe_connect_account_id;
  const paymentSetupIncomplete = user && profile && profile.stripe_connect_account_id && !profile.stripe_onboarding_complete;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const fileArray = Array.from(files);
    setImageFiles(fileArray);
    
    // Create preview URLs
    const newImages = fileArray.map(file => URL.createObjectURL(file));
    setImages(newImages);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newFiles = [...imageFiles];
    newImages.splice(index, 1);
    newFiles.splice(index, 1);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  const handleContinueFromPhotos = () => {
    if (images.length === 0) {
      toast({
        title: "Photos required",
        description: "Please upload at least one photo to continue.",
        variant: "destructive"
      });
      return;
    }
    setActiveTab("details");
  };

  const handleContinueFromDetails = () => {
    if (!listingData.title || !listingData.category) {
      toast({
        title: "Required fields missing",
        description: "Please fill in title and category to continue.",
        variant: "destructive"
      });
      return;
    }
    setActiveTab("pricing");
  };

  const handleContinueFromPricing = () => {
    if (!selectedPrice || selectedPrice <= 0) {
      toast({
        title: "Price required",
        description: "Please set a price to continue.",
        variant: "destructive"
      });
      return;
    }
    setActiveTab("shipping");
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
    if (!user || !selectedPrice || !listingData.title || !listingData.category || images.length === 0) {
      toast({
        title: "Cannot publish",
        description: "Please complete all required fields (photos, title, category, price).",
        variant: "destructive"
      });
      return;
    }

    // Check email verification
    if (!emailVerified) {
      toast({
        title: "Email verification required",
        description: "Please verify your email address before publishing listings. Check your inbox for the verification link.",
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
              height: shipping.package_height,
              unit: "cm",
            }
          : null;

      // Create listing
        const listingPayload: ListingInsert = {
          seller_id: user.id,
          title: listingData.title,
          description: listingData.description,
          category: listingData.category || null,
          subcategory: listingData.subcategory || null,
          brand: listingData.brand || null,
          size: listingData.size || null,
          color: listingData.color || null,
          material: listingData.material || null,
          condition: listingData.condition || null,
          seller_price: selectedPrice,
          original_rrp: listingData.original_rrp,
          style_tags: listingData.style_tags.length ? (listingData.style_tags as Json) : null,
          status: "active",
          published_at: new Date().toISOString(),
          shipping_cost_uk: shipping.shipping_cost_uk,
          shipping_cost_europe: shipping.shipping_cost_europe,
          shipping_cost_international: shipping.shipping_cost_international,
          free_shipping: shipping.free_shipping,
          estimated_delivery_days: shipping.estimated_delivery_days,
          package_weight: shipping.package_weight,
          package_dimensions: packageDimensions,
        };

        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .insert(listingPayload)
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
          // Log error but continue with other images
          if (import.meta.env.DEV) {
            console.error("Image upload error:", uploadError);
          }
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

      // Send email notification
      try {
        sendEmail({
          type: "listing_published",
          subject: "Your listing is live!",
          template: "listing_published",
          data: {
            itemName: listingData.title,
            listingLink: `${window.location.origin}/listing/${listing.id}`,
          },
        });
      } catch (emailError) {
        // Don't fail the publish if email fails
        if (import.meta.env.DEV) {
          console.error("Failed to send listing published email:", emailError);
        }
      }

      toast({
        title: "Listed Successfully!",
        description: "Your item is now live on the marketplace.",
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish listing. Please try again.";
      if (import.meta.env.DEV) {
        console.error("Publish error:", error);
      }
      toast({
        title: "Publishing Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  // Show success screen after publishing
  if (publishedListingId) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-light text-foreground mb-4">Listing Published!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your item is now live and visible to buyers on the marketplace.
            </p>
          </div>

          {needsPaymentSetup && (
            <Alert className="mb-6 text-left border-amber-500/20 bg-amber-500/5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Set up payments to receive money</AlertTitle>
              <AlertDescription className="mt-2">
                To receive payments when your item sells, you'll need to complete seller onboarding.
                You can list items now, but buyers won't be able to purchase until you set up payments.
              </AlertDescription>
              <Button
                className="mt-4"
                onClick={() => navigate("/seller/onboarding")}
              >
                Set Up Payments
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Alert>
          )}

          {paymentSetupIncomplete && (
            <Alert className="mb-6 text-left border-yellow-500/20 bg-yellow-500/5">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Payment setup in progress</AlertTitle>
              <AlertDescription className="mt-2">
                Your payment account setup is in progress. Complete verification to start receiving payments.
              </AlertDescription>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/seller/account")}
              >
                Check Status
              </Button>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate(`/listing/${publishedListingId}`)}
            >
              View Listing
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setPublishedListingId(null);
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
                  style_tags: [],
                  original_rrp: null,
                });
                setSelectedPrice(0);
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
                setActiveTab("photos");
              }}
            >
              List Another Item
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => navigate("/dashboard/seller")}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Show auth required screen
  if (!user && !authLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-light text-foreground mb-4">Sign in to List Items</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Create an account to start selling on 6Seven. It only takes a moment.
          </p>
          <Button size="lg" onClick={() => setAuthModalOpen(true)}>
            Sign In or Sign Up
          </Button>
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultMode="signup" />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEO
        title="Sell Your Items | List in Seconds with AI | 6Seven"
        description="Sell your items in seconds with AI-powered listing. Get smart pricing suggestions, instant matching with buyers, and maximize your sales on 6Seven marketplace."
        keywords="sell online, list items, AI selling, marketplace seller, resale platform, sell fashion, sell electronics, sell collectibles, smart pricing, instant listing, 6Seven seller"
        url="https://6seven.ai/sell"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Sell Your Items on 6Seven",
          "description": "List your items in seconds with AI-powered tools",
          "url": "https://6seven.ai/sell"
        }}
      />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultMode="signup" />
      
      <div className="mb-6 sm:mb-8 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-light text-foreground">List Your Item</h1>
        <p className="text-sm sm:text-base text-muted-foreground font-light">
          Add photos and details to get your item online
        </p>
      </div>

      {/* Payment Setup Alerts */}
      {needsPaymentSetup && (
        <Alert className="mb-6 border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Set up payments to receive money</AlertTitle>
          <AlertDescription className="mt-2">
            You can list items now, but to receive payments when they sell, you'll need to complete seller onboarding.
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/seller/onboarding")}
            >
              Set Up Payments
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {paymentSetupIncomplete && (
        <Alert className="mb-6 border-yellow-500/20 bg-yellow-500/5">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>Payment setup in progress</AlertTitle>
          <AlertDescription className="mt-2">
            Your payment account setup is in progress. Complete verification to start receiving payments.
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/seller/account")}
            >
              Check Status
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 sm:mb-8 overflow-x-auto">
            <TabsTrigger value="photos" className="text-xs sm:text-sm">1. Photos</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm">2. Details</TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs sm:text-sm">3. Pricing</TabsTrigger>
            <TabsTrigger value="shipping" className="text-xs sm:text-sm">4. Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Upload Photos</CardTitle>
                <CardDescription className="text-sm">Upload 1-5 photos of your item</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Preview - Above fold on mobile */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                        <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-background/80 rounded-full px-2 py-0.5">
                          <span className="text-xs font-medium">{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area */}
                <Label
                  htmlFor="image-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 sm:p-12 cursor-pointer hover:border-primary transition-colors ${
                    images.length > 0 ? 'min-h-[200px] sm:min-h-[300px]' : 'min-h-[300px] sm:min-h-[400px]'
                  }`}
                >
                  {images.length === 0 ? (
                    <>
                      <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
                      <span className="text-base sm:text-lg font-medium text-foreground mb-2">Click to upload photos</span>
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">1-5 images recommended</span>
                      <span className="text-xs text-muted-foreground mt-2">You can select multiple images at once</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mb-3" />
                      <span className="text-sm sm:text-base font-medium text-foreground mb-1">Add more photos</span>
                      <span className="text-xs text-muted-foreground">Tap to select additional images</span>
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
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in to start listing
                  </p>
                )}

                {/* Continue Button - Prominent on mobile */}
                {images.length > 0 && (
                  <Button 
                    className="w-full sm:w-auto sm:ml-auto sm:block" 
                    size="lg"
                    onClick={handleContinueFromPhotos}
                  >
                    Continue to Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Item Details</CardTitle>
                <CardDescription className="text-sm">Tell us about your item</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Vintage Denim Jacket"
                    value={listingData.title}
                    onChange={(e) => setListingData({...listingData, title: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={listingData.category}
                      onValueChange={(value) => {
                        setListingData({
                          ...listingData,
                          category: value,
                          subcategory: ""
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onValueChange={(value) => setListingData({...listingData, condition: value as any})}
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
                      placeholder="Add style tag (e.g., vintage, casual)"
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

                <Button 
                  className="w-full sm:w-auto sm:ml-auto sm:block" 
                  size="lg"
                  onClick={handleContinueFromDetails}
                >
                  Continue to Pricing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Pricing</CardTitle>
                <CardDescription className="text-sm">Set your price</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div>
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={selectedPrice || ""}
                    onChange={(e) => setSelectedPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 text-lg"
                  />
                </div>

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

                <Button 
                  className="w-full sm:w-auto sm:ml-auto sm:block" 
                  size="lg"
                  onClick={handleContinueFromPricing}
                >
                  Continue to Shipping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Shipping & Packaging</CardTitle>
                <CardDescription className="text-sm">Configure shipping costs and package details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  disabled={publishing || !selectedPrice}
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
