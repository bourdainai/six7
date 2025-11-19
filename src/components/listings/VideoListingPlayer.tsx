export function VideoListingPlayer({ src }: { src: string }) {
  return <video src={src} controls className="w-full h-full object-cover" />;
}

