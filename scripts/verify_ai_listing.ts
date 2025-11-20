
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample Charizard image
const sampleImageUrl = "https://images.pokemontcg.io/base1/4_hires.png";

console.log("Testing AI Listing Engine...");
console.log("Image:", sampleImageUrl);

try {
    const { data, error } = await supabase.functions.invoke('ai-auto-list-from-photos', {
        body: { imageUrls: [sampleImageUrl] }
    });

    if (error) {
        console.error("Function Error:", error);
        Deno.exit(1);
    }

    console.log("Success! Result:");
    console.log(JSON.stringify(data, null, 2));

} catch (err) {
    console.error("Script Error:", err);
}
