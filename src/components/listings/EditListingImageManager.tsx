import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, RotateCcw } from "lucide-react";

interface ListingImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface EditListingImageManagerProps {
  existingImages: ListingImage[];
  newImages: File[];
  imagesToDelete: Set<string>;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNewImage: (index: number) => void;
  onMarkForDeletion: (imageId: string) => void;
  onUnmarkForDeletion: (imageId: string) => void;
}

export const EditListingImageManager = ({
  existingImages,
  newImages,
  imagesToDelete,
  onImageSelect,
  onRemoveNewImage,
  onMarkForDeletion,
  onUnmarkForDeletion,
}: EditListingImageManagerProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal tracking-tight">Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div>
            <Label className="font-normal">Current Images</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {existingImages.map((image) => (
                <div
                  key={image.id}
                  className={`relative aspect-square border border-divider-gray overflow-hidden ${
                    imagesToDelete.has(image.id) ? "opacity-50" : ""
                  }`}
                >
                  <img
                    src={image.image_url}
                    alt="Listing"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 flex gap-1">
                    {imagesToDelete.has(image.id) ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => onUnmarkForDeletion(image.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={() => onMarkForDeletion(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Images */}
        {newImages.length > 0 && (
          <div>
            <Label className="font-normal">New Images to Upload</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {newImages.map((file, idx) => (
                <div key={idx} className="relative aspect-square border border-divider-gray overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="New"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-7 w-7"
                    onClick={() => onRemoveNewImage(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload New Images */}
        <div>
          <Label htmlFor="images" className="font-normal">
            Add More Images
          </Label>
          <div className="mt-2">
            <label
              htmlFor="images"
              className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-divider-gray hover:border-foreground cursor-pointer transition-colors duration-fast"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-normal">Click to upload images</span>
            </label>
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={onImageSelect}
              className="hidden"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
