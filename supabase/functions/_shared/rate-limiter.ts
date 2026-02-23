import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Simple database-backed rate limiter for edge functions.
 * Uses the rate_limit_entries table (service role only).
 * 
 * @param identifier - User identifier (email, IP, or user ID)
 * @param endpoint - The function name being rate limited
 * @param maxRequests - Max requests allowed in the window (default: 10)
 * @param windowSeconds - Time window in seconds (default: 60)
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests = 10,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Clean up old entries (older than 5 minutes) to prevent table bloat
  await supabaseAdmin
    .from("rate_limit_entries")
    .delete()
    .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

  // Count recent requests
  const { count, error } = await supabaseAdmin
    .from("rate_limit_entries")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("endpoint", endpoint)
    .gte("created_at", windowStart);

  const currentCount = count ?? 0;

  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: windowSeconds,
    };
  }

  // Record this request
  await supabaseAdmin.from("rate_limit_entries").insert({
    identifier,
    endpoint,
  });

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
  };
}

export function rateLimitResponse(corsHeaders: Record<string, string>, retryAfter = 60) {
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}
