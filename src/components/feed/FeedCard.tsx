import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

import type { ListingSummary } from "@/types/listings";

interface FeedCardProps {
  listing: ListingSummary;
}

export function FeedCard({ listing }: FeedCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play video when in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Auto-play failed, user interaction required
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Get primary image - prioritize first listing image
  const primaryImage = listing.listing_images?.[0]?.image_url || listing.images?.[0]?.image_url;
  const hasVideo = !!listing.video_url;

  return (
    <div className="snap-start h-screen w-full relative overflow-hidden">
      {/* Media Background */}
      {hasVideo ? (
        <video
          ref={videoRef}
          src={listing.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      ) : primaryImage ? (
        <img
          src={primaryImage}
          alt={listing.title}
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-muted" />
      )}

      {/* Gradient Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        {/* Top Actions */}
        <div className="flex justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="bg-background/20 backdrop-blur-md hover:bg-background/40 text-white"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current text-red-500' : ''}`} />
          </Button>
        </div>

        {/* Bottom Info */}
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <Link to={`/listing/${listing.id}`} className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 line-clamp-2">
                {listing.title}
              </h2>
              <p className="text-xl sm:text-2xl font-bold text-white">
                £{listing.seller_price}
              </p>
              {listing.brand && (
                <p className="text-sm text-white/80 mt-1">{listing.brand}</p>
              )}
            </Link>

            <div className="flex flex-col gap-2 flex-shrink-0">
              <Button
                size="icon"
                className="bg-primary hover:bg-primary/90 h-14 w-14"
                asChild
              >
                <Link to={`/checkout/${listing.id}`}>
                  <span className="text-sm font-bold">Buy</span>
                </Link>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="bg-background/20 backdrop-blur-md border-white/30 hover:bg-background/40 text-white h-12 w-12"
                asChild
              >
                <Link to={`/messages?listing=${listing.id}`}>
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {listing.description && (
            <p className="text-sm text-white/90 line-clamp-2 max-w-2xl">
              {listing.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

