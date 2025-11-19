import { VerticalFeed } from "@/components/feed/VerticalFeed";
import { Navigation } from "@/components/Navigation";

export default function FeedPage() {
  return (
    <div className="bg-black min-h-screen">
      <VerticalFeed />
      <div className="fixed bottom-0 w-full z-50">
        <Navigation />
      </div>
    </div>
  );
}

