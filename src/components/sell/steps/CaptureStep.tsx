import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, X, Sparkles, Loader2, Search, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHaptics } from "@/hooks/useHaptics";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { SellWizardState, CardData } from "@/hooks/useSellWizard";

interface CaptureStepProps {
  wizard: SellWizardState;
}

export function CaptureStep({ wizard }: CaptureStepProps) {
  const { toast } = useToast();
  const haptics = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Voice input handler
  const handleVoiceTranscript = useCallback(async (transcript: string) => {
    haptics.success();
    // Use the transcript as search query
    setSearchQuery(transcript);
    setShowSearch(true);

    // Auto-search with transcript
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("pokemon_card_attributes")
        .select("*")
        .or(`name.ilike.%${transcript}%,name_en.ilike.%${transcript}%,set_name.ilike.%${transcript}%,set_name_en.ilike.%${transcript}%`)
        .limit(12);

      if (error) throw error;

      const results: CardData[] = (data || []).map(card => ({
        id: card.id,
        name: card.name_en || card.name || "",
        setName: card.set_name_en || card.set_name || "",
        setCode: card.set_id || "",
        cardNumber: card.printed_number || card.number || "",
        rarity: card.rarity || "",
        imageUrl: card.image_url_large || card.image_url_small || "",
        marketPrice: card.price_tcgplayer_holofoil || card.price_tcgplayer_normal || card.price_cardmarket_avg || undefined,
      }));

      setSearchResults(results);

      if (results.length === 0) {
        toast({
          title: "No cards found",
          description: `Try different search terms for "${transcript}"`,
        });
      }
    } catch (error) {
      logger.error("Voice search error", error);
    } finally {
      setIsSearching(false);
    }
  }, [haptics, toast]);

  const voice = useVoiceInput({
    onTranscript: handleVoiceTranscript,
    onError: (error) => {
      haptics.error();
      toast({
        title: "Voice input failed",
        description: error,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    haptics.medium();
    wizard.addImages(Array.from(files));
  }, [wizard, haptics]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      haptics.medium();
      wizard.addImages(Array.from(files));
    }
  }, [wizard, haptics]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Search pokemon_card_attributes table
      const { data, error } = await supabase
        .from("pokemon_card_attributes")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%,set_name.ilike.%${searchQuery}%,set_name_en.ilike.%${searchQuery}%,printed_number.ilike.%${searchQuery}%`)
        .limit(12);

      if (error) throw error;

      const results: CardData[] = (data || []).map(card => ({
        id: card.id,
        name: card.name_en || card.name || "",
        setName: card.set_name_en || card.set_name || "",
        setCode: card.set_id || "",
        cardNumber: card.printed_number || card.number || "",
        rarity: card.rarity || "",
        imageUrl: card.image_url_large || card.image_url_small || "",
        marketPrice: card.price_tcgplayer_holofoil || card.price_tcgplayer_normal || card.price_cardmarket_avg || undefined,
      }));

      setSearchResults(results);
    } catch (error) {
      logger.error("Search error", error);
      toast({
        title: "Search failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, toast]);

  const handleSelectCard = useCallback((card: CardData) => {
    haptics.success();
    wizard.setCard(card);
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery("");
  }, [wizard, haptics]);

  const handleAIAnalyze = useCallback(async () => {
    if (wizard.draft.imageFiles.length === 0) {
      haptics.warning();
      toast({
        title: "Add a photo first",
        description: "Take or upload a photo of your card",
        variant: "destructive",
      });
      return;
    }

    haptics.impact();
    wizard.setIsAnalyzing(true);

    try {
      // Convert first image to base64
      const file = wizard.draft.imageFiles[0];
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ai-auto-list-from-photos", {
        body: { images: [base64] },
      });

      if (error) throw error;

      if (data?.card_name || data?.title) {
        // Try to find matching card in database
        const searchName = data.card_name || data.title;
        const { data: cardData } = await supabase
          .from("pokemon_card_attributes")
          .select("*")
          .or(`name.ilike.%${searchName}%,name_en.ilike.%${searchName}%`)
          .limit(1)
          .single();

        if (cardData) {
          wizard.setCard({
            id: cardData.id,
            name: cardData.name_en || cardData.name || searchName,
            setName: cardData.set_name_en || cardData.set_name || data.set_name || "",
            setCode: cardData.set_id || data.set_code || "",
            cardNumber: cardData.printed_number || data.card_number || "",
            rarity: cardData.rarity || data.rarity || "",
            imageUrl: cardData.image_url_large || "",
            marketPrice: cardData.price_tcgplayer_holofoil || cardData.price_tcgplayer_normal || undefined,
          });
        }

        // Update condition if detected
        if (data.condition) {
          wizard.updateDraft({ condition: data.condition });
        }

        haptics.success();
        toast({
          title: "Card identified! ✨",
          description: searchName,
        });
      } else {
        haptics.warning();
        toast({
          title: "Couldn't identify card",
          description: "Try searching manually",
        });
        setShowSearch(true);
      }
    } catch (error) {
      logger.error("AI analysis error", error);
      haptics.error();
      toast({
        title: "Analysis failed",
        description: "Try searching manually",
        variant: "destructive",
      });
      setShowSearch(true);
    } finally {
      wizard.setIsAnalyzing(false);
    }
  }, [wizard, toast, haptics]);

  return (
    <div className="p-4 space-y-6">
      {/* Photo Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "relative border-2 border-dashed rounded-2xl transition-colors",
          wizard.draft.images.length > 0
            ? "border-muted bg-muted/30"
            : "border-primary/30 bg-primary/5"
        )}
      >
        {wizard.draft.images.length === 0 ? (
          // Empty state - prominent camera
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4"
            >
              <Camera className="w-10 h-10 text-primary" />
            </motion.div>

            <h3 className="text-lg font-medium mb-2">Add photos of your card</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Take a photo or upload from gallery
            </p>

            <div className="flex gap-3">
              <Button
                size="lg"
                onClick={() => cameraInputRef.current?.click()}
                className="h-12 px-6"
              >
                <Camera className="mr-2 h-5 w-5" />
                Camera
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-12 px-6"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload
              </Button>
            </div>
          </div>
        ) : (
          // Photos grid
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {wizard.draft.images.map((img, index) => (
                <motion.div
                  key={img}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <img
                    src={img}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => wizard.removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white">
                      Main
                    </span>
                  )}
                </motion.div>
              ))}

              {/* Add more button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* AI Analysis Button */}
      {wizard.draft.images.length > 0 && !wizard.draft.card && (
        <Button
          className="w-full h-12"
          onClick={handleAIAnalyze}
          disabled={wizard.isAnalyzing}
        >
          {wizard.isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Identifying card...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Identify Card
            </>
          )}
        </Button>
      )}

      {/* Selected Card Display */}
      {wizard.draft.card && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {wizard.draft.card.imageUrl && (
                <img
                  src={wizard.draft.card.imageUrl}
                  alt={wizard.draft.card.name}
                  className="w-20 h-28 object-contain rounded bg-muted"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{wizard.draft.card.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {wizard.draft.card.setName} · {wizard.draft.card.cardNumber}
                    </p>
                    {wizard.draft.card.rarity && (
                      <p className="text-xs text-muted-foreground mt-1">{wizard.draft.card.rarity}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => wizard.setCard(null)}
                    className="text-muted-foreground h-8 px-2"
                  >
                    Change
                  </Button>
                </div>
                {wizard.draft.card.marketPrice && (
                  <p className="text-sm mt-2">
                    Market price: <span className="font-medium">£{wizard.draft.card.marketPrice.toFixed(2)}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            <Search className="h-4 w-4" />
            {showSearch ? "Hide search" : "Search card manually"}
          </button>

          {voice.isSupported && (
            <>
              <span className="text-muted-foreground">or</span>
              <button
                onClick={() => {
                  haptics.medium();
                  if (voice.isRecording) {
                    voice.stopRecording();
                  } else {
                    voice.startRecording();
                  }
                }}
                className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  voice.isRecording ? "text-red-500" : "text-primary"
                )}
              >
                {voice.isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Voice search
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {voice.isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm">Listening... say a card name</span>
          </motion.div>
        )}

        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, set, or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-11"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="h-11 px-4"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                {searchResults.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    className="text-left p-2 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    {card.imageUrl && (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full aspect-[2.5/3.5] object-contain mb-2 rounded"
                      />
                    )}
                    <p className="text-xs font-medium truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {card.setName}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
