import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { PageLayout } from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, ArrowLeft, Save, Image as ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface ListingImage {
  id: string;
  image_url: string;
  display_order: number;
}

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quickSalePrice, setQuickSalePrice] = useState("");
  const [condition, setCondition] = useState<string>("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [status, setStatus] = useState<string>("active");
  const [tradeEnabled, setTradeEnabled] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);
  const [shippingCostUK, setShippingCostUK] = useState("0");
  const [shippingCostEurope, setShippingCostEurope] = useState("0");
  const [shippingCostInternational, setShippingCostInternational] = useState("0");
  
  const [existingImages, setExistingImages] = useState<ListingImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Fetch listing data
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id!)
        .eq("seller_id", user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch listing images
  const { data: images } = useQuery({
    queryKey: ["listing-images", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", id!)
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (listing) {
      setTitle(listing.title || "");
      setDescription(listing.description || "");
      setPrice(listing.seller_price?.toString() || "");
      setQuickSalePrice(listing.quick_sale_price?.toString() || "");
      setCondition((listing.condition as string) || "");
      setCategory(listing.category || "");
      setBrand(listing.brand || "");
      setSize(listing.size || "");
      setColor(listing.color || "");
      setStatus((listing.status as string) || "active");
      setTradeEnabled(listing.trade_enabled ?? true);
      setFreeShipping(listing.free_shipping ?? false);
      setShippingCostUK(listing.shipping_cost_uk?.toString() || "0");
      setShippingCostEurope(listing.shipping_cost_europe?.toString() || "0");
      setShippingCostInternational(listing.shipping_cost_international?.toString() || "0");
    }
  }, [listing]);

  useEffect(() => {
    if (images) {
      setExistingImages(images);
    }
  }, [images]);

  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error("Missing required data");

      // Update listing details
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          title,
          description,
          seller_price: parseFloat(price),
          quick_sale_price: quickSalePrice ? parseFloat(quickSalePrice) : null,
          condition: condition as any,
          category,
          brand,
          size,
          color,
          status: status as any,
          trade_enabled: tradeEnabled,
          free_shipping: freeShipping,
          shipping_cost_uk: parseFloat(shippingCostUK),
          shipping_cost_europe: parseFloat(shippingCostEurope),
          shipping_cost_international: parseFloat(shippingCostInternational),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("seller_id", user.id);

      if (updateError) throw updateError;

      // Delete marked images
      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("listing_images")
          .delete()
          .in("id", imagesToDelete);

        if (deleteError) throw deleteError;

        // Delete from storage
        for (const imageId of imagesToDelete) {
          const image = existingImages.find(img => img.id === imageId);
          if (image) {
            const path = image.image_url.split("/").pop();
            if (path) {
              await supabase.storage.from("listing-images").remove([path]);
            }
          }
        }
      }

      // Upload new images
      if (newImages.length > 0) {
        setUploadingImages(true);
        const maxOrder = existingImages.length > 0 
          ? Math.max(...existingImages.filter(img => !imagesToDelete.includes(img.id)).map(img => img.display_order))
          : -1;

        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i];
          const fileExt = file.name.split(".").pop();
          const fileName = `${id}-${Date.now()}-${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("listing-images")
            .getPublicUrl(fileName);

          const { error: insertError } = await supabase
            .from("listing_images")
            .insert({
              listing_id: id,
              image_url: publicUrl,
              display_order: maxOrder + i + 1,
            });

          if (insertError) throw insertError;
        }
        setUploadingImages(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Listing updated successfully",
      });
      navigate("/dashboard/seller");
    },
    onError: (error) => {
      setUploadingImages(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update listing",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages(prev => [...prev, ...files]);
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const markImageForDeletion = (imageId: string) => {
    setImagesToDelete(prev => [...prev, imageId]);
  };

  const unmarkImageForDeletion = (imageId: string) => {
    setImagesToDelete(prev => prev.filter(id => id !== imageId));
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!listing) {
    return (
      <PageLayout>
        <div className="text-center">
          <h1 className="text-2xl font-light mb-4">Listing not found</h1>
          <Button onClick={() => navigate("/dashboard/seller")}>
            Back to Dashboard
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-light tracking-tight">Edit Listing</h1>
            <p className="text-muted-foreground">Update your listing details and images</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/seller")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); updateListingMutation.mutate(); }} className="space-y-6">
          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle className="font-normal tracking-tight">Images</CardTitle>
              <CardDescription>Manage your listing images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div>
                  <Label className="mb-2 block">Current Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image) => {
                      const isMarkedForDeletion = imagesToDelete.includes(image.id);
                      return (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.image_url}
                            alt="Listing"
                            className={`w-full h-32 object-cover rounded-lg ${
                              isMarkedForDeletion ? "opacity-30" : ""
                            }`}
                          />
                          {isMarkedForDeletion ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="absolute top-2 right-2"
                              onClick={() => unmarkImageForDeletion(image.id)}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => markImageForDeletion(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImages.length > 0 && (
                <div>
                  <Label className="mb-2 block">New Images to Upload</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {newImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="New"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeNewImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Images Button */}
              <div>
                <Label htmlFor="images" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to add more images
                    </p>
                  </div>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="font-normal tracking-tight">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quickSalePrice">Quick Sale Price (£)</Label>
                  <Input
                    id="quickSalePrice"
                    type="number"
                    step="0.01"
                    value={quickSalePrice}
                    onChange={(e) => setQuickSalePrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like_new">Like New</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-normal tracking-tight">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Options */}
          <Card>
            <CardHeader>
              <CardTitle className="font-normal tracking-tight">Shipping & Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="freeShipping"
                  checked={freeShipping}
                  onCheckedChange={(checked) => setFreeShipping(checked as boolean)}
                />
                <Label htmlFor="freeShipping" className="cursor-pointer">
                  Free Shipping
                </Label>
              </div>

              {!freeShipping && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingUK">UK Shipping (£)</Label>
                    <Input
                      id="shippingUK"
                      type="number"
                      step="0.01"
                      value={shippingCostUK}
                      onChange={(e) => setShippingCostUK(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingEurope">Europe Shipping (£)</Label>
                    <Input
                      id="shippingEurope"
                      type="number"
                      step="0.01"
                      value={shippingCostEurope}
                      onChange={(e) => setShippingCostEurope(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingInternational">International Shipping (£)</Label>
                    <Input
                      id="shippingInternational"
                      type="number"
                      step="0.01"
                      value={shippingCostInternational}
                      onChange={(e) => setShippingCostInternational(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tradeEnabled"
                  checked={tradeEnabled}
                  onCheckedChange={(checked) => setTradeEnabled(checked as boolean)}
                />
                <Label htmlFor="tradeEnabled" className="cursor-pointer">
                  Accept Trade Offers
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={updateListingMutation.isPending || uploadingImages}
              className="flex-1"
            >
              {updateListingMutation.isPending || uploadingImages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard/seller")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
