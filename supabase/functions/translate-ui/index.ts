import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { strings, targetLanguage, targetLanguageLabel } = await req.json();

    if (!strings || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing strings or targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a professional UI translator. Translate the given JSON object values from English to ${targetLanguageLabel || targetLanguage}. Keep the keys exactly the same. Return ONLY a valid JSON object with the translated values. Do not add any explanation or markdown formatting. Preserve any special characters, emojis, or placeholders in the text.`,
          },
          {
            role: "user",
            content: JSON.stringify(strings),
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let translatedText = data.choices?.[0]?.message?.content || "";

    // Clean up any markdown formatting
    translatedText = translatedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const translated = JSON.parse(translatedText);

    return new Response(
      JSON.stringify({ translations: translated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
