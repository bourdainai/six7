import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AIGeneratedPreviewProps {
  listing: {
    title: string;
    description: string;
    price: number;
  };
  onConfirm: () => void;
}

export function AIGeneratedPreview({ listing, onConfirm }: AIGeneratedPreviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">AI Generated Listing</h3>
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-lg font-bold">{listing.title}</h4>
          <p className="text-muted-foreground">{listing.description}</p>
          <div className="mt-4 font-bold text-xl">£{listing.price}</div>
        </CardContent>
      </Card>
      <Button className="w-full" onClick={onConfirm}>Publish Listing</Button>
    </div>
  );
}

