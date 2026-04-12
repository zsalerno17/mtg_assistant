import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, AuthError } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await requireAllowedUser(req);

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ detail: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const sb = getServiceClient();
    const { data } = await sb
      .from("analyses")
      .select("id, deck_id, deck_name, moxfield_url, deck_updated_at, result_json, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    const analyses = (data || []).map((row: Record<string, unknown>) => {
      const rj = (row.result_json || {}) as Record<string, unknown>;
      return { ...row, verdict: rj.verdict || null };
    });

    return new Response(JSON.stringify({ analyses, page }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(JSON.stringify({ detail: e.message }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ detail: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
