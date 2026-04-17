import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, AuthError } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const ADMIN_EMAIL = "zsalerno17@gmail.com";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const corsHeaders = getCorsHeaders(req);

  try {
    const user = await requireAllowedUser(req);

    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ detail: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const srv = getServiceClient();

    // GET /admin — list all allowed users with profile + deck count
    if (req.method === "GET") {
      const { data: allowedUsers, error: allowError } = await srv
        .from("allowed_users")
        .select("email")
        .order("email");

      if (allowError) {
        console.error("[admin/GET] Error fetching allowed_users:", allowError);
        return new Response(
          JSON.stringify({ detail: "Failed to fetch allowed users" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all auth users to build email → {id, timestamps} map
      const { data: authData, error: authError } = await srv.auth.admin.listUsers();
      if (authError) {
        console.error("[admin/GET] Error fetching auth.users:", authError);
      }

      const authByEmail = new Map<string, { id: string; created_at: string; last_sign_in_at: string | null }>();
      for (const u of (authData?.users ?? [])) {
        if (u.email) {
          authByEmail.set(u.email.toLowerCase(), {
            id: u.id,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
          });
        }
      }

      // Collect user_ids for signed-in users so we can batch-fetch profiles + deck counts
      const signedInUserIds = (allowedUsers ?? [])
        .map((u: { email: string }) => authByEmail.get(u.email.toLowerCase())?.id)
        .filter((id: string | undefined): id is string => !!id);

      const [profilesResult, userDecksResult, analysesResult] = await Promise.all([
        signedInUserIds.length > 0
          ? srv.from("user_profiles").select("user_id, username, avatar_url").in("user_id", signedInUserIds)
          : { data: [] as { user_id: string; username: string | null; avatar_url: string | null }[], error: null },
        signedInUserIds.length > 0
          ? srv.from("user_decks").select("user_id, moxfield_id").in("user_id", signedInUserIds)
          : { data: [] as { user_id: string; moxfield_id: string }[], error: null },
        signedInUserIds.length > 0
          ? srv.from("analyses").select("user_id, moxfield_id").in("user_id", signedInUserIds)
          : { data: [] as { user_id: string; moxfield_id: string }[], error: null },
      ]);

      const profileByUserId = new Map<string, { username: string | null; avatar_url: string | null }>();
      for (const p of (profilesResult.data ?? [])) {
        profileByUserId.set(p.user_id, { username: p.username, avatar_url: p.avatar_url });
      }

      // Count distinct moxfield_ids per user across both user_decks and analyses
      // (mirrors the backwards-compat logic in the deck library endpoint)
      const deckCountByUserId = new Map<string, number>();
      for (const userId of signedInUserIds) {
        const inLibrary = new Set<string>(
          (userDecksResult.data ?? [])
            .filter((d: { user_id: string; moxfield_id: string }) => d.user_id === userId)
            .map((d: { user_id: string; moxfield_id: string }) => d.moxfield_id)
        );
        const inAnalyses = new Set<string>(
          (analysesResult.data ?? [])
            .filter((a: { user_id: string; moxfield_id: string }) => a.user_id === userId)
            .map((a: { user_id: string; moxfield_id: string }) => a.moxfield_id)
        );
        const combined = new Set([...inLibrary, ...inAnalyses]);
        deckCountByUserId.set(userId, combined.size);
      }

      const enrichedUsers = (allowedUsers ?? []).map((u: { email: string }) => {
        const authInfo = authByEmail.get(u.email.toLowerCase());
        const profile = authInfo ? (profileByUserId.get(authInfo.id) ?? null) : null;
        const deckCount = authInfo ? (deckCountByUserId.get(authInfo.id) ?? 0) : 0;

        return {
          email: u.email,
          has_signed_in: !!authInfo,
          created_at: authInfo?.created_at ?? null,
          last_sign_in_at: authInfo?.last_sign_in_at ?? null,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          deck_count: deckCount,
        };
      });

      return new Response(
        JSON.stringify({ allowed_users: enrichedUsers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /admin — add email to allowlist
    if (req.method === "POST") {
      const body = await req.json();
      const { email } = body;

      if (!email || typeof email !== "string") {
        return new Response(
          JSON.stringify({ detail: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ detail: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailLower = email.toLowerCase();

      const { data: existing } = await srv
        .from("allowed_users")
        .select("email")
        .eq("email", emailLower)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ detail: "Email already in allowlist" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: insertError } = await srv
        .from("allowed_users")
        .insert({ email: emailLower });

      if (insertError) {
        console.error("[admin/POST] Error inserting allowed_user:", insertError);
        return new Response(
          JSON.stringify({ detail: "Failed to add email to allowlist" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, email: emailLower }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE /admin?email=... — remove email from allowlist
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const email = url.searchParams.get("email");

      if (!email) {
        return new Response(
          JSON.stringify({ detail: "Email parameter is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailLower = email.toLowerCase();

      if (emailLower === ADMIN_EMAIL) {
        return new Response(
          JSON.stringify({ detail: "Cannot remove admin email from allowlist" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: deleteError } = await srv
        .from("allowed_users")
        .delete()
        .eq("email", emailLower);

      if (deleteError) {
        console.error("[admin/DELETE] Error deleting allowed_user:", deleteError);
        return new Response(
          JSON.stringify({ detail: "Failed to remove email from allowlist" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ detail: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(
        JSON.stringify({ detail: err.message }),
        { status: err.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.error("[admin] Unexpected error:", err);
    return new Response(
      JSON.stringify({ detail: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
