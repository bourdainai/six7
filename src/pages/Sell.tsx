import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Sparkles, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Sell = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setImages(prev => [...prev, ...newImages]);
      
      // Simulate AI analysis
      setAnalyzing(true);
      setTimeout(() => {
        setAnalyzing(false);
        setAnalyzed(true);
        toast({
          title: "AI Analysis Complete",
          description: "Your item has been analyzed and details have been pre-filled.",
        });
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-light text-foreground">
            List Your Item
          </h1>
          <p className="text-base text-muted-foreground font-light">
            Upload photos and let AI handle the rest
          </p>
        </div>

        <div className="max-w-4xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 text-foreground">Photos</h2>
              
              <Label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary transition-colors"
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
              />

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

            {/* Details Section */}
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

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Item title"
                    value={analyzed ? "Vintage Leather Jacket - Black, Size M" : ""}
                    disabled={!analyzed}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="Category"
                    value={analyzed ? "Outerwear > Jackets" : ""}
                    disabled={!analyzed}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="Brand"
                      value={analyzed ? "Zara" : ""}
                      disabled={!analyzed}
                    />
                  </div>
                  <div>
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      placeholder="Size"
                      value={analyzed ? "M" : ""}
                      disabled={!analyzed}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description"
                    rows={4}
                    value={analyzed ? "Classic black leather jacket in excellent condition. Minimal wear, all zippers functional. Perfect for casual or dressy occasions." : ""}
                    disabled={!analyzed}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Input
                      id="condition"
                      placeholder="Condition"
                      value={analyzed ? "Like New" : ""}
                      disabled={!analyzed}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (€)</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={analyzed ? "85" : ""}
                      disabled={!analyzed}
                    />
                  </div>
                </div>

                {analyzed && (
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="text-sm font-medium mb-2 text-foreground">AI Price Suggestions:</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quick sale (3-7 days):</span>
                        <span className="font-medium text-foreground">€75</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fair price (1-2 weeks):</span>
                        <span className="font-medium text-primary">€85</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Premium (3-4 weeks):</span>
                        <span className="font-medium text-foreground">€95</span>
                      </div>
                    </div>
                  </div>
                )}

                <Button className="w-full" size="lg" disabled={!analyzed}>
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

export default Sell;
