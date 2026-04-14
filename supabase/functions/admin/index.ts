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

    // Only allow admin user to access this endpoint
    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ detail: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const srv = getServiceClient();

    // GET /admin - List all allowed users with their auth status
    if (req.method === "GET") {
      // Get all allowed users
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

      // Get auth.users to check who has actually signed in
      const { data: authUsers, error: authError } = await srv.auth.admin.listUsers();

      if (authError) {
        console.error("[admin/GET] Error fetching auth.users:", authError);
        // Continue without auth data - non-critical
      }

      // Build email -> auth user map (normalized to lowercase for matching)
      const authUserMap = new Map();
      if (authUsers?.users) {
        for (const authUser of authUsers.users) {
          if (authUser.email) {
            authUserMap.set(authUser.email.toLowerCase(), {
              id: authUser.id,
              created_at: authUser.created_at,
              last_sign_in_at: authUser.last_sign_in_at,
            });
          }
        }
      }

      // Enrich allowlist with auth status
      const enrichedUsers = (allowedUsers || []).map((allowedUser) => {
        const authInfo = authUserMap.get(allowedUser.email.toLowerCase());
        return {
          email: allowedUser.email,
          has_signed_in: !!authInfo,
          created_at: authInfo?.created_at || null,
          last_sign_in_at: authInfo?.last_sign_in_at || null,
        };
      });

      return new Response(
        JSON.stringify({ allowed_users: enrichedUsers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /admin - Add new email to allowlist
    if (req.method === "POST") {
      const body = await req.json();
      const { email } = body;

      if (!email || typeof email !== "string") {
        return new Response(
          JSON.stringify({ detail: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ detail: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Normalize to lowercase
      const emailLower = email.toLowerCase();

      // Check if already exists
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

      // Insert into allowed_users
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

    // DELETE /admin?email=... - Remove email from allowlist
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

      // Prevent admin from removing themselves
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
