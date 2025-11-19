import { FeedCard } from "./FeedCard";

export function VerticalFeed() {
  return (
    <div className="snap-y snap-mandatory h-screen w-full overflow-y-scroll">
      {/* Map through feed items */}
      <FeedCard />
      <FeedCard />
    </div>
  );
}

