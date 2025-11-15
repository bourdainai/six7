import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Heart } from "lucide-react";

const mockListings = [
  {
    id: 1,
    title: "Vintage Denim Jacket",
    brand: "Levi's",
    price: 65,
    condition: "Excellent",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=500&fit=crop",
  },
  {
    id: 2,
    title: "Designer Leather Bag",
    brand: "Coach",
    price: 145,
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=500&fit=crop",
  },
  {
    id: 3,
    title: "Summer Floral Dress",
    brand: "Zara",
    price: 35,
    condition: "Good",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop",
  },
  {
    id: 4,
    title: "Running Sneakers",
    brand: "Nike",
    price: 55,
    condition: "Very Good",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop",
  },
  {
    id: 5,
    title: "Wool Blazer",
    brand: "H&M",
    price: 45,
    condition: "Excellent",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop",
  },
  {
    id: 6,
    title: "Silk Scarf",
    brand: "Hermès",
    price: 225,
    condition: "Like New",
    image: "https://images.unsplash.com/photo-1601924357840-3c6abfdae9af?w=400&h=500&fit=crop",
  },
];

const Browse = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Curated For You</h1>
            </div>
            <p className="text-xl text-muted-foreground">
              Items matched to your style, size, and preferences
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by item, brand, or describe what you're looking for..."
                className="pl-12 h-14 text-base shadow-soft"
              />
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Button variant="outline" size="sm">All Items</Button>
            <Button variant="outline" size="sm">Jackets</Button>
            <Button variant="outline" size="sm">Dresses</Button>
            <Button variant="outline" size="sm">Accessories</Button>
            <Button variant="outline" size="sm">Shoes</Button>
            <Button variant="outline" size="sm">Under €50</Button>
          </div>

          {/* Listings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockListings.map((item) => (
              <Card key={item.id} className="group overflow-hidden border-border hover:shadow-medium transition-all hover:-translate-y-1 cursor-pointer">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-4 right-4 rounded-full shadow-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <div className="text-sm text-muted-foreground mb-1">{item.brand}</div>
                  <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">€{item.price}</span>
                    <span className="text-sm text-muted-foreground">{item.condition}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-12 text-center">
            <Button size="lg" variant="outline">
              Load More Items
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Browse;
