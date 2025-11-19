import { VideoListingPlayer } from "@/components/listings/VideoListingPlayer";
import { FeedControls } from "./FeedControls";

export function FeedCard() {
  return (
    <div className="snap-start h-screen w-full relative bg-black">
      <VideoListingPlayer src="placeholder.mp4" />
      <div className="absolute bottom-20 left-4 right-4 text-white">
        <h3 className="font-bold text-xl">Charizard Base Set</h3>
        <p>£150.00</p>
      </div>
      <FeedControls />
    </div>
  );
}

