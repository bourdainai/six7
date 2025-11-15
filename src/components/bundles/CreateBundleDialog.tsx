import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package } from "lucide-react";

interface CreateBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedListings?: string[];
}

interface Listing {
  id: string;
  title: string;
  seller_price: number;
}

export function CreateBundleDialog({ open, onOpenChange, preselectedListings = [] }: CreateBundleDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedListings, setSelectedListings] = useState<string[]>(preselectedListings);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const queryClient = useQueryClient();

  const { data: userListings, isLoading } = useQuery({
    queryKey: ["seller-listings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("listings")
        .select("id, title, seller_price")
        .eq("seller_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Listing[];
    },
    enabled: open,
  });

  const createBundle = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const totalPrice = (userListings || [])
        .filter((l) => selectedListings.includes(l.id))
        .reduce((sum, l) => sum + Number(l.seller_price), 0);

      const discountedPrice = totalPrice * (1 - discountPercentage / 100);

      const { data: bundle, error: bundleError } = await supabase
        .from("bundles")
        .insert({
          seller_id: user.id,
          title,
          description,
          discount_percentage: discountPercentage,
          total_price: discountedPrice,
        })
        .select()
        .single();

      if (bundleError) throw bundleError;

      const bundleItems = selectedListings.map((listingId) => ({
        bundle_id: bundle.id,
        listing_id: listingId,
      }));

      const { error: itemsError } = await supabase
        .from("bundle_items")
        .insert(bundleItems);

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      toast.success("Bundle created successfully");
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setSelectedListings([]);
      setDiscountPercentage(0);
    },
    onError: (error) => {
      toast.error("Failed to create bundle: " + error.message);
    },
  });

  const toggleListing = (listingId: string) => {
    setSelectedListings((prev) =>
      prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId]
    );
  };

  const totalPrice = (userListings || [])
    .filter((l) => selectedListings.includes(l.id))
    .reduce((sum, l) => sum + Number(l.seller_price), 0);

  const discountedPrice = totalPrice * (1 - discountPercentage / 100);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Please enter a bundle title");
      return;
    }
    if (selectedListings.length < 2) {
      toast.error("Please select at least 2 items");
      return;
    }
    createBundle.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create a Bundle
          </DialogTitle>
          <DialogDescription>
            Combine multiple items and offer a discount to buyers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Bundle Title</Label>
            <Input
              id="title"
              placeholder="e.g., Summer Fashion Bundle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what's included..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount Percentage</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Items (minimum 2)</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading your listings...</p>
            ) : !userListings || userListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active listings found</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                {userListings.map((listing) => (
                  <div key={listing.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={listing.id}
                      checked={selectedListings.includes(listing.id)}
                      onCheckedChange={() => toggleListing(listing.id)}
                    />
                    <label
                      htmlFor={listing.id}
                      className="flex-1 text-sm cursor-pointer flex justify-between"
                    >
                      <span>{listing.title}</span>
                      <span className="text-muted-foreground">£{listing.seller_price}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedListings.length >= 2 && (
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between text-sm">
                <span>Original Total:</span>
                <span>£{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount ({discountPercentage}%):</span>
                <span className="text-destructive">-£{(totalPrice - discountedPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Bundle Price:</span>
                <span>£{discountedPrice.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createBundle.isPending}>
            {createBundle.isPending ? "Creating..." : "Create Bundle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
