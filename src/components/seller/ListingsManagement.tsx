import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Listing {
  id: string;
  title: string;
  status: string;
  seller_price: number;
  created_at: string | null;
}

interface ListingsManagementProps {
  listings: Listing[];
  onDelete: (listingId: string) => void;
  isDeleting: boolean;
}

export const ListingsManagement = ({ listings, onDelete, isDeleting }: ListingsManagementProps) => {
  const navigate = useNavigate();

  if (listings.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground font-normal">No listings yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing) => (
        <Card key={listing.id}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-normal truncate tracking-tight">{listing.title}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="capitalize">{listing.status}</span>
                <span>£{Number(listing.seller_price).toFixed(2)}</span>
                {listing.created_at && (
                  <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/edit-listing/${listing.id}`)}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/listing/${listing.id}`)}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this listing?")) {
                    onDelete(listing.id);
                  }
                }}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
