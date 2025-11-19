# ⚡ Quick Start: 6-7 Gamification MVP
## Launch the Core Prediction Game in 2 Weeks

**Goal**: Get the basic prediction mechanic live to validate the concept  
**Timeline**: 2 weeks (10 working days)  
**Team**: 2-3 developers

---

## 🎯 MVP Scope

### What We're Building

A minimal but functional version of the 6-7 prediction game:

1. **Prediction Button** on listing pages
2. **User predicts** if item is a 6 or 7
3. **After purchase**, user rates actual experience
4. **Reward system** for correct predictions
5. **Streak counter** to encourage repeat play
6. **Simple leaderboard** to add competition

### What We're NOT Building (Yet)

- ❌ Complex level system
- ❌ Daily challenges
- ❌ Lucky 7 drops
- ❌ AI prediction model
- ❌ Advanced analytics
- ❌ Social features

---

## 📅 Day-by-Day Plan

### Days 1-2: Database Setup

#### Create Gamification Tables

```sql
-- Run this migration in Supabase
-- File: supabase/migrations/YYYYMMDD_gamification_mvp.sql

-- Simple user stats
CREATE TABLE user_gamification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  
  -- Basic stats
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  credits_earned DECIMAL(10,2) DEFAULT 0,
  
  -- Timestamps
  last_prediction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Computed
  accuracy DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_predictions > 0 
      THEN (correct_predictions::DECIMAL / total_predictions * 100)
      ELSE 0 
    END
  ) STORED
);

-- Prediction records
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  listing_id UUID REFERENCES listings NOT NULL,
  order_id UUID REFERENCES orders,
  
  -- Prediction data
  predicted_rating INTEGER NOT NULL CHECK (predicted_rating IN (6, 7)),
  actual_rating INTEGER CHECK (actual_rating IN (6, 7)),
  
  -- Outcome
  correct BOOLEAN,
  credits_earned DECIMAL(10,2) DEFAULT 0,
  streak_at_time INTEGER DEFAULT 0,
  
  -- Timestamps
  predicted_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  UNIQUE(user_id, listing_id)
);

-- Indexes
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_listing ON predictions(listing_id);
CREATE INDEX idx_predictions_unresolved ON predictions(user_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_gamification_stats_streak ON user_gamification_stats(current_streak DESC);

-- RLS Policies
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Users can read their own stats
CREATE POLICY "Users can view own stats"
  ON user_gamification_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own predictions
CREATE POLICY "Users can view own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create predictions
CREATE POLICY "Users can create predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions (for rating actual)
CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update stats
CREATE OR REPLACE FUNCTION update_gamification_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- If prediction is being resolved
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    -- Update user stats
    INSERT INTO user_gamification_stats (user_id, total_predictions)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_predictions = user_gamification_stats.total_predictions + 1,
      correct_predictions = user_gamification_stats.correct_predictions + 
        CASE WHEN NEW.correct THEN 1 ELSE 0 END,
      current_streak = CASE 
        WHEN NEW.correct THEN user_gamification_stats.current_streak + 1
        ELSE 0
      END,
      longest_streak = GREATEST(
        user_gamification_stats.longest_streak,
        CASE WHEN NEW.correct THEN user_gamification_stats.current_streak + 1 ELSE 0 END
      ),
      credits_earned = user_gamification_stats.credits_earned + NEW.credits_earned,
      last_prediction_at = NEW.resolved_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
CREATE TRIGGER update_stats_on_prediction_resolve
  AFTER UPDATE ON predictions
  FOR EACH ROW
  WHEN (NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL)
  EXECUTE FUNCTION update_gamification_stats();
```

### Days 3-4: Backend API

#### Edge Function: Make Prediction

```typescript
// supabase/functions/make-prediction/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { listing_id, predicted_rating } = await req.json();

    // Validate input
    if (!listing_id || ![6, 7].includes(predicted_rating)) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("id, title, seller_id")
      .eq("id", listing_id)
      .eq("status", "active")
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: "Listing not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Don't allow predicting on your own listings
    if (listing.seller_id === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot predict on your own listing" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current streak
    const { data: stats } = await supabaseClient
      .from("user_gamification_stats")
      .select("current_streak")
      .eq("user_id", user.id)
      .single();

    const currentStreak = stats?.current_streak || 0;

    // Insert prediction
    const { data: prediction, error: predictionError } = await supabaseClient
      .from("predictions")
      .insert({
        user_id: user.id,
        listing_id: listing_id,
        predicted_rating: predicted_rating,
        streak_at_time: currentStreak,
      })
      .select()
      .single();

    if (predictionError) {
      // Check if already predicted
      if (predictionError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "You've already predicted on this listing" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      throw predictionError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        prediction,
        message: `You predicted: ${predicted_rating}! Let's see if you're right... 🤞`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error making prediction:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

#### Edge Function: Resolve Prediction

```typescript
// supabase/functions/resolve-prediction/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { prediction_id, actual_rating } = await req.json();

    if (!prediction_id || ![6, 7].includes(actual_rating)) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get prediction
    const { data: prediction, error: predError } = await supabaseClient
      .from("predictions")
      .select("*")
      .eq("id", prediction_id)
      .eq("user_id", user.id)
      .single();

    if (predError || !prediction) {
      return new Response(
        JSON.stringify({ error: "Prediction not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if already resolved
    if (prediction.resolved_at) {
      return new Response(
        JSON.stringify({ error: "Prediction already resolved" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calculate if correct
    const correct = prediction.predicted_rating === actual_rating;
    
    // Calculate credits earned
    let creditsEarned = 0;
    if (correct) {
      const baseCredits = 1.0;
      const streak = prediction.streak_at_time + 1; // Include this prediction
      
      // Streak multiplier
      let multiplier = 1.0;
      if (streak >= 20) multiplier = 6.0;
      else if (streak >= 10) multiplier = 4.0;
      else if (streak >= 7) multiplier = 3.0;
      else if (streak >= 5) multiplier = 2.0;
      else if (streak >= 3) multiplier = 1.5;
      
      creditsEarned = baseCredits * multiplier;
    }

    // Update prediction
    const { error: updateError } = await supabaseClient
      .from("predictions")
      .update({
        actual_rating,
        correct,
        credits_earned: creditsEarned,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", prediction_id);

    if (updateError) {
      throw updateError;
    }

    // Get updated stats
    const { data: stats } = await supabaseClient
      .from("user_gamification_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        correct,
        credits_earned: creditsEarned,
        streak: stats?.current_streak || 0,
        accuracy: stats?.accuracy || 0,
        message: correct
          ? `🎉 You were right! Earned $${creditsEarned.toFixed(2)} credits!`
          : `❌ Not quite! Your streak reset, but keep trying!`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error resolving prediction:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

### Days 5-7: Frontend Components

#### Prediction Button Component

```typescript
// src/components/gamification/PredictionButton.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PredictionButtonProps {
  listingId: string;
  listingTitle: string;
}

export const PredictionButton = ({ 
  listingId, 
  listingTitle 
}: PredictionButtonProps) => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPredicted, setHasPredicted] = useState(false);

  const makePrediction = async (rating: 6 | 7) => {
    if (!user) {
      toast.error("Please log in to make predictions");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "make-prediction",
        {
          body: {
            listing_id: listingId,
            predicted_rating: rating,
          },
        }
      );

      if (error) throw error;

      toast.success(data.message);
      setHasPredicted(true);
      setShowPrompt(false);
    } catch (error: any) {
      console.error("Prediction error:", error);
      toast.error(error.message || "Failed to make prediction");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;
  if (hasPredicted) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <p className="text-sm text-green-700">
          ✅ Prediction locked in! We'll check after you receive the item.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowPrompt(true)}
        variant="outline"
        className="w-full border-2 border-purple-500 hover:bg-purple-50"
      >
        <span className="text-lg mr-2">🎯</span>
        Is this a 6 or a 7?
      </Button>

      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-4 text-center">
                Quick! What's your prediction?
              </h2>
              
              <p className="text-gray-600 mb-6 text-center">
                Is "{listingTitle}" a 6 or a 7?
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => makePrediction(6)}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-4xl font-bold py-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "6"}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => makePrediction(7)}
                  disabled={isLoading}
                  className="bg-gold-500 hover:bg-gold-600 text-white text-4xl font-bold py-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#FFD700" }}
                >
                  {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "7"}
                </motion.button>
              </div>

              <div className="text-xs text-gray-500 text-center">
                <p>Correct guess = credits + streak boost!</p>
                <p>Wrong guess = streak resets</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
```

#### Stats Display Component

```typescript
// src/components/gamification/StatsDisplay.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export const StatsDisplay = ({ userId }: { userId: string }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["gamification-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_gamification_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows, which is fine for new users
        throw error;
      }

      return data || {
        total_predictions: 0,
        correct_predictions: 0,
        current_streak: 0,
        longest_streak: 0,
        credits_earned: 0,
        accuracy: 0,
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Card>
    );
  }

  const statItems = [
    {
      label: "Current Streak",
      value: stats.current_streak,
      icon: "🔥",
      color: "text-orange-600",
    },
    {
      label: "Accuracy",
      value: `${stats.accuracy?.toFixed(1) || 0}%`,
      icon: "🎯",
      color: "text-blue-600",
    },
    {
      label: "Credits Earned",
      value: `$${stats.credits_earned?.toFixed(2) || "0.00"}`,
      icon: "💰",
      color: "text-green-600",
    },
    {
      label: "Longest Streak",
      value: stats.longest_streak,
      icon: "⭐",
      color: "text-purple-600",
    },
  ];

  return (
    <Card className="p-6">
      <h3 className="text-2xl font-bold mb-4">Your Stats</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-4 text-center"
          >
            <div className="text-3xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t text-center">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">{stats.correct_predictions}</span>
          {" "}correct out of{" "}
          <span className="font-semibold">{stats.total_predictions}</span>
          {" "}predictions
        </p>
      </div>
    </Card>
  );
};
```

#### Simple Leaderboard

```typescript
// src/components/gamification/Leaderboard.tsx

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Leaderboard = () => {
  const { data: leaders, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_gamification_stats")
        .select(`
          user_id,
          current_streak,
          accuracy,
          credits_earned,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order("current_streak", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🏆</span>
        Top Predictors
      </h3>

      <div className="space-y-2">
        {leaders?.map((leader, index) => (
          <div
            key={leader.user_id}
            className={`
              flex items-center gap-3 p-3 rounded-lg
              ${index === 0 ? "bg-yellow-50 border-2 border-yellow-400" : ""}
              ${index === 1 ? "bg-gray-50 border-2 border-gray-400" : ""}
              ${index === 2 ? "bg-orange-50 border-2 border-orange-400" : ""}
              ${index > 2 ? "bg-gray-50" : ""}
            `}
          >
            <div className="text-2xl font-bold w-8">
              {index === 0 && "🥇"}
              {index === 1 && "🥈"}
              {index === 2 && "🥉"}
              {index > 2 && `#${index + 1}`}
            </div>

            <Avatar className="h-10 w-10">
              <AvatarImage src={leader.profiles?.avatar_url} />
              <AvatarFallback>
                {leader.profiles?.username?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="font-semibold">
                {leader.profiles?.username || "Anonymous"}
              </div>
              <div className="text-sm text-gray-600">
                {leader.accuracy?.toFixed(1)}% accuracy
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                🔥 {leader.current_streak}
              </div>
              <div className="text-xs text-gray-500">
                ${leader.credits_earned?.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### Days 8-9: Integration

#### Add to Listing Detail Page

```typescript
// src/pages/ListingDetail.tsx - Add these components

import { PredictionButton } from "@/components/gamification/PredictionButton";

// Inside the ListingDetail component, after the main listing info:

<div className="mt-8">
  <PredictionButton 
    listingId={id!} 
    listingTitle={listing.title}
  />
</div>
```

#### Add Stats to User Profile/Dashboard

```typescript
// src/pages/Index.tsx or Profile page

import { StatsDisplay } from "@/components/gamification/StatsDisplay";
import { Leaderboard } from "@/components/gamification/Leaderboard";

// In the dashboard/profile:

<div className="grid md:grid-cols-2 gap-6">
  <StatsDisplay userId={user.id} />
  <Leaderboard />
</div>
```

#### Add Rating Prompt After Order

```typescript
// src/components/gamification/RatingPrompt.tsx

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface RatingPromptProps {
  orderId: string;
  listingId: string;
  listingTitle: string;
}

export const RatingPrompt = ({ orderId, listingId, listingTitle }: RatingPromptProps) => {
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<6 | 7 | null>(null);

  // Check if user has unresolved prediction
  const { data: prediction } = useQuery({
    queryKey: ["prediction", listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("listing_id", listingId)
        .is("resolved_at", null)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const resolvePrediction = useMutation({
    mutationFn: async (rating: 6 | 7) => {
      const { data, error } = await supabase.functions.invoke(
        "resolve-prediction",
        {
          body: {
            prediction_id: prediction!.id,
            actual_rating: rating,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["prediction"] });
      queryClient.invalidateQueries({ queryKey: ["gamification-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit rating");
    },
  });

  if (!prediction) return null;

  return (
    <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300">
      <h3 className="text-xl font-bold mb-4">
        Time to find out... were you right? 🤔
      </h3>

      <p className="text-gray-700 mb-4">
        You predicted "{listingTitle}" was a{" "}
        <span className="font-bold text-lg">{prediction.predicted_rating}</span>.
      </p>

      <p className="text-gray-700 mb-6">
        Now that you've received it, what would you actually rate it?
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedRating(6);
            resolvePrediction.mutate(6);
          }}
          disabled={resolvePrediction.isPending}
          className={`
            text-4xl font-bold py-6 rounded-xl border-4 transition-all
            ${selectedRating === 6 ? "border-blue-500 bg-blue-100" : "border-gray-300 bg-white"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          6
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedRating(7);
            resolvePrediction.mutate(7);
          }}
          disabled={resolvePrediction.isPending}
          className={`
            text-4xl font-bold py-6 rounded-xl border-4 transition-all
            ${selectedRating === 7 ? "border-gold-500 bg-gold-100" : "border-gray-300 bg-white"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          style={{
            borderColor: selectedRating === 7 ? "#FFD700" : undefined,
            backgroundColor: selectedRating === 7 ? "#FFF8DC" : undefined,
          }}
        >
          7
        </motion.button>
      </div>

      {prediction.streak_at_time > 0 && (
        <p className="text-sm text-center text-gray-600">
          Your {prediction.streak_at_time}-prediction streak is on the line! 🔥
        </p>
      )}
    </Card>
  );
};
```

### Day 10: Testing & Launch

#### Test Checklist

```markdown
## Manual Testing

- [ ] User can make prediction on listing
- [ ] Cannot predict twice on same listing
- [ ] Cannot predict on own listing
- [ ] Prediction saves to database
- [ ] Stats update when prediction resolves
- [ ] Streak increments on correct prediction
- [ ] Streak resets on wrong prediction
- [ ] Credits calculate correctly with multiplier
- [ ] Leaderboard updates in real-time
- [ ] UI is responsive on mobile
- [ ] Animations work smoothly
- [ ] Error states display properly
- [ ] Loading states work

## Edge Cases

- [ ] New user (no stats yet)
- [ ] User with 0 predictions
- [ ] User with long streak (10+)
- [ ] Multiple predictions in quick succession
- [ ] Concurrent predictions by different users
- [ ] Database connection errors
- [ ] Auth errors

## Performance

- [ ] Prediction button loads instantly
- [ ] Stats display loads in < 500ms
- [ ] Leaderboard loads in < 1s
- [ ] No janky animations
- [ ] Works on slow 3G connection
```

---

## 🎉 Launch Strategy

### Soft Launch (Day 11)

1. **Beta Test with Team**
   - Internal team tests for 1-2 days
   - Fix any critical bugs
   - Gather feedback

2. **Limited Release**
   - Enable for 10% of users
   - Monitor error rates
   - Watch database performance

3. **Gather Initial Data**
   - Prediction rate (% of listings)
   - Accuracy distribution
   - Streak lengths
   - Engagement metrics

### Full Launch (Day 12-14)

1. **Roll out to 100%**
2. **Announce on platform**
   - Homepage banner
   - Email to users
   - Social media
3. **Monitor closely**
   - Real-time dashboard
   - User feedback
   - Bug reports

---

## 📊 Success Metrics

### Week 1 Goals

- **Adoption**: 20% of active users make at least 1 prediction
- **Engagement**: Average 3 predictions per user
- **Retention**: 50% of predictors return next day
- **Accuracy**: Average prediction accuracy ~55% (better than random)

### Red Flags to Watch For

- ⚠️ Prediction rate < 5% (not engaging enough)
- ⚠️ Too many errors (> 1%)
- ⚠️ Average session time decreases (hurting core experience)
- ⚠️ Negative user feedback

---

## 🚀 What's Next?

After MVP proves successful:

1. **Week 3-4**: Add AI prediction model
2. **Week 5-6**: Implement daily challenges
3. **Week 7-8**: Add Lucky 7 drops
4. **Week 9-10**: Build out full level system

---

## 💡 Tips for Success

1. **Keep it Simple**: Don't over-engineer MVP
2. **Ship Fast**: 2 weeks is aggressive but doable
3. **Listen to Users**: They'll tell you what's fun
4. **Iterate Quickly**: Be ready to adjust mechanics
5. **Make it Rewarding**: Even small wins should feel good

---

## 🆘 Common Issues & Solutions

### Issue: Low Engagement

**Solution**: Make prediction more prominent, add timer for urgency, increase rewards

### Issue: Too Easy to Game

**Solution**: Add fraud detection, limit predictions per day, require purchase to resolve

### Issue: Users Forget to Rate

**Solution**: Email/push notifications, in-app reminders, auto-resolve after 7 days

### Issue: Performance Problems

**Solution**: Add caching, use materialized views, implement pagination

---

**Ready to build? Let's make shopping fun again! 🎮**

