import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CollectrCard {
  name?: string;
  cardName?: string;
  title?: string;
  set?: string;
  setName?: string;
  set_name?: string;
  number?: string | number;
  cardNumber?: string | number;
  card_number?: string | number;
  marketPrice?: string | number;
  price?: string | number;
  value?: string | number;
  condition?: string;
  cardCondition?: string;
  qty?: string | number;
  quantity?: string | number;
  rarity?: string;
  grade?: string;
  variance?: string;
  id?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ---- Auth: require logged-in user ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      console.error("Auth error", authError);
      throw new Error("Unauthorized");
    }

    const { portfolioUrl } = await req.json();

    if (
      !portfolioUrl ||
      typeof portfolioUrl !== "string" ||
      !portfolioUrl.includes("app.getcollectr.com/showcase/profile/")
    ) {
      throw new Error("Invalid Collectr portfolio URL");
    }

    // Extract a simple portfolio id from the URL for metadata
    const urlParts = portfolioUrl.split("/").filter(Boolean);
    const portfolioId = urlParts[urlParts.length - 1];

    console.log("Fetching portfolio:", portfolioUrl);

    // IMPORTANT: we only fetch the page URL the user provided –
    // no calls to https://api.getcollectr.com which fails DNS.
    const portfolioResponse = await fetch(portfolioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; 6SevenBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!portfolioResponse.ok) {
      console.error("Collectr page fetch failed", portfolioResponse.status);
      throw new Error("Failed to fetch portfolio page");
    }

    const html = await portfolioResponse.text();
    console.log("HTML length:", html.length);

    // ---- Try to extract embedded JSON data from the page ----
    let portfolioData: any = null;

    // Pattern 1: Next.js __NEXT_DATA__ script tag with flexible attributes
    const nextDataTagMatch = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (nextDataTagMatch) {
      try {
        portfolioData = JSON.parse(nextDataTagMatch[1]);
        console.log("Parsed portfolio data from __NEXT_DATA__ tag");
      } catch (err) {
        console.error("Failed to parse __NEXT_DATA__ JSON", err);
      }
    }

    // Pattern 2: window.__NEXT_DATA__ = { ... } inline assignment
    if (!portfolioData) {
      const nextDataWindowMatch = html.match(
        /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?})\s*;/,
      );
      if (nextDataWindowMatch) {
        try {
          portfolioData = JSON.parse(nextDataWindowMatch[1]);
          console.log("Parsed portfolio data from window.__NEXT_DATA__ assignment");
        } catch (err) {
          console.error("Failed to parse window.__NEXT_DATA__ JSON", err);
        }
      }
    }

    // Pattern 3: window.__INITIAL_STATE__ = { ... } inline assignment
    if (!portfolioData) {
      const initialStateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/,
      );
      if (initialStateMatch) {
        try {
          portfolioData = JSON.parse(initialStateMatch[1]);
          console.log("Parsed portfolio data from window.__INITIAL_STATE__");
        } catch (err) {
          console.error("Failed to parse window.__INITIAL_STATE__ JSON", err);
        }
      }
    }

    // Pattern 4: any <script type="application/json"> with portfolio-like data
    if (!portfolioData) {
      const jsonScriptRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
      let match: RegExpExecArray | null;

      while (!portfolioData && (match = jsonScriptRegex.exec(html)) !== null) {
        try {
          const candidate = JSON.parse(match[1]);
          if (
            Array.isArray((candidate as any).cards) ||
            Array.isArray(candidate?.props?.pageProps?.cards) ||
            Array.isArray(candidate?.props?.pageProps?.portfolio?.cards) ||
            Array.isArray(candidate?.portfolio?.cards)
          ) {
            portfolioData = candidate;
            console.log("Parsed portfolio data from application/json script tag");
            break;
          }
        } catch (_err) {
          // ignore non‑JSON contents
        }
      }
    }

    // Pattern 5: generic scan of all <script> tags for a large JSON object
    if (!portfolioData) {
      const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/g);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const content = script
            .replace(/<script[^>]*>/, "")
            .replace(/<\/script>/, "")
            .trim();

          // Look for a JSON object assignment like window.X = { ... };
          const braceIndex = content.indexOf("{");
          const lastBraceIndex = content.lastIndexOf("}");

          if (braceIndex !== -1 && lastBraceIndex > braceIndex + 100) {
            const jsonSubstring = content.slice(braceIndex, lastBraceIndex + 1);
            try {
              const candidate = JSON.parse(jsonSubstring);
              if (
                Array.isArray((candidate as any).cards) ||
                Array.isArray(candidate?.props?.pageProps?.cards) ||
                Array.isArray(candidate?.props?.pageProps?.portfolio?.cards) ||
                Array.isArray(candidate?.portfolio?.cards)
              ) {
                portfolioData = candidate;
                console.log("Parsed portfolio data from generic script tag JSON");
                break;
              }
            } catch (_err) {
              // not valid JSON, continue searching
            }
          }
        }
      }
    }

    if (!portfolioData) {
      console.error("No recognizable portfolio JSON found in Collectr page");
      throw new Error(
        "Could not find portfolio data in page. The Collectr page format may have changed.",
      );
    }

    // ---- Find cards array in whatever structure Collectr uses ----
    let cards: CollectrCard[] = [];

    if (Array.isArray((portfolioData as any).cards)) {
      cards = (portfolioData as any).cards;
    } else if (Array.isArray(portfolioData?.props?.pageProps?.cards)) {
      cards = portfolioData.props.pageProps.cards;
    } else if (
      Array.isArray(portfolioData?.props?.pageProps?.portfolio?.cards)
    ) {
      cards = portfolioData.props.pageProps.portfolio.cards;
    } else if (Array.isArray(portfolioData?.portfolio?.cards)) {
      cards = portfolioData.portfolio.cards;
    }

    console.log("Detected cards count:", cards.length);

    if (!cards.length) {
      throw new Error(
        "No cards found in portfolio. The portfolio may be empty or the page format changed.",
      );
    }

    // ---- Create import job record ----
    const { data: importJob, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        user_id: user.id,
        source: "collectr_portfolio_url",
        total_items: cards.length,
        metadata: { portfolioUrl, portfolioId },
      })
      .select()
      .single();

    if (jobError || !importJob) {
      console.error("Failed to create import job", jobError);
      throw new Error("Failed to create import job");
    }

    // ---- Map Collectr cards into listings rows ----
    const portfolioName =
      portfolioData?.portfolioName ||
      portfolioData?.props?.pageProps?.portfolio?.name ||
      "Collectr Import";

    const listings = cards.map((card) => {
      const cardName = card.name || card.cardName || card.title || "Unnamed card";
      const setName = card.set || card.setName || card.set_name || "Unknown set";
      const rawNumber = card.number ?? card.cardNumber ?? card.card_number ?? "";
      const cardNumber = String(rawNumber || "");

      const rawPrice =
        (card.marketPrice as any) ??
        (card.price as any) ??
        (card.value as any) ??
        "0";
      const priceNum = Number(rawPrice) || 0;

      const rawCondition = card.condition || card.cardCondition || "Near Mint";
      const rawQty = (card.quantity as any) ?? (card.qty as any) ?? 1;
      const quantity = Math.max(1, Number(rawQty) || 1);

      return {
        seller_id: user.id,
        title: cardName || `${setName} - ${cardNumber || ""}`.trim(),
        set_code: setName,
        card_number: cardNumber || null,
        seller_price: priceNum > 0 ? priceNum : 1,
        condition: mapCollectrCondition(rawCondition),
        currency: "GBP",
        status: "draft",
        portfolio_name: portfolioName,
        import_job_id: importJob.id,
        import_metadata: {
          rarity: card.rarity,
          grade: card.grade,
          variance: card.variance,
          collectr_id: card.id,
          quantity,
          source: "collectr_portfolio_url",
        },
      };
    });

    // ---- Insert listings in batches ----
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from("listings")
        .insert(batch as any);

      if (insertError) {
        console.error("Batch insert error", insertError);
        failedCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // ---- Update import job status ----
    const { error: updateError } = await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        processed_items: successCount,
        failed_items: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importJob.id);

    if (updateError) {
      console.error("Failed to update import job", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: successCount,
        failed: failedCount,
        jobId: importJob.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("import-collectr-portfolio error", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown error importing Collectr portfolio";

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});

function mapCollectrCondition(condition: string): string {
  const normalized = (condition || "").toLowerCase();

  if (normalized.includes("near mint") || normalized === "nm") {
    return "like_new";
  }
  if (normalized.includes("lightly played") || normalized === "lp") {
    return "excellent";
  }
  if (normalized.includes("moderately played") || normalized === "mp") {
    return "good";
  }
  if (normalized.includes("heavily played") || normalized === "hp") {
    return "fair";
  }
  if (normalized.includes("damaged") || normalized.includes("poor")) {
    return "poor";
  }

  // sensible fallback
  return "good";
}
