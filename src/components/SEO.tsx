import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  structuredData?: object;
  noindex?: boolean;
  canonical?: string;
}

export const SEO = ({
  title = "6Seven - AI-Native Marketplace | Buy & Sell with AI",
  description = "List items in seconds with AI. Smart pricing, instant matching, and personalized discovery. The next generation of C2C marketplace for fashion, electronics, collectibles, and more.",
  keywords = "online marketplace, buy and sell, AI marketplace, resale platform, secondhand goods, fashion marketplace, electronics marketplace, collectibles, C2C marketplace, smart pricing, AI-powered selling, instant matching, personalized shopping, resale AI, 6Seven",
  image = "https://storage.googleapis.com/gpt-engineer-file-uploads/qfo8Fpg59Pa4COntVGgcg2WjBfX2/social-images/social-1763392506052-6Seven%20(1).svg",
  url = "https://6seven.ai",
  type = "website",
  structuredData,
  noindex = false,
  canonical,
}: SEOProps) => {
  const fullTitle = title.includes("6Seven") ? title : `${title} | 6Seven`;
  const fullUrl = canonical || url;
  const siteName = "6Seven";

  // Default structured data for organization
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "6Seven",
    url: "https://6seven.ai",
    logo: "https://storage.googleapis.com/gpt-engineer-file-uploads/qfo8Fpg59Pa4COntVGgcg2WjBfX2/uploads/1763330102487-android-chrome-512x512.png",
    description: "AI-native marketplace for buying and selling items with intelligent pricing and matching",
    sameAs: [
      "https://twitter.com/ResaleAI",
    ],
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="6Seven" />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@ResaleAI" />
      <meta name="twitter:creator" content="@ResaleAI" />

      {/* Additional SEO */}
      <meta name="theme-color" content="#000000" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="6Seven" />

      {/* Structured Data */}
      {finalStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(finalStructuredData)}
        </script>
      )}
    </Helmet>
  );
};
