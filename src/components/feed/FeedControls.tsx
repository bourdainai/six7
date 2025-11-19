import { Heart, Share2, MessageCircle } from "lucide-react";

export function FeedControls() {
  return (
    <div className="absolute right-4 bottom-32 flex flex-col gap-6 text-white">
      <div className="flex flex-col items-center">
        <Heart size={32} />
        <span className="text-xs">1.2k</span>
      </div>
      <div className="flex flex-col items-center">
        <MessageCircle size={32} />
        <span className="text-xs">45</span>
      </div>
      <div className="flex flex-col items-center">
        <Share2 size={32} />
        <span className="text-xs">Share</span>
      </div>
    </div>
  );
}

