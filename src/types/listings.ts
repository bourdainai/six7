import type { Database } from "@/integrations/supabase/types";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type ListingImageRow = Database["public"]["Tables"]["listing_images"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ListingImageSummary = Pick<ListingImageRow, "image_url" | "display_order">;

export type ListingSellerSummary = Pick<ProfileRow, "id" | "full_name" | "trust_score">;

export interface ListingSummary extends ListingRow {
  images?: ListingImageSummary[] | null;
  listing_images?: ListingImageSummary[] | null;
  seller?: ListingSellerSummary | null;
  similarityScore?: number;
}
