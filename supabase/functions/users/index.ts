import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { requireAllowedUser, AuthError } from "../_shared/auth.ts";
import { getServiceClient } from "../_shared/supabase.ts";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

const VALID_PRESET_IDS = new Set([
  "w", "u", "b", "r", "g", "c", "x", "s", "e", "p", "chaos", "tap", "planeswalker",
  "dragon", "goblin", "wizard", "zombie", "elf", "vampire", "vampire-bat",
  "knight", "knight-mounted", "rogue", "minotaur", "orc", "dwarf",
  "ninja", "samurai", "griffin", "wyvern", "skeleton", "pirate",
]);

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const user = await requireAllowedUser(req);
    const sb = getServiceClient();

    if (req.method === "GET") {
      const { data, error } = await sb
        .from("user_profiles")
        .select("username, avatar_url, updated_at")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (error) {
        console.error("[users/GET] Profile query error:", error);
        return new Response(
          JSON.stringify({ detail: "Failed to load profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(data || { username: null, avatar_url: null, updated_at: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const { username, avatar_url } = body;

      if (username !== undefined && username !== null) {
        if (!USERNAME_RE.test(username)) {
          return new Response(
            JSON.stringify({ detail: "Username must be 3–20 characters: letters, numbers, hyphens, and underscores only." }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (avatar_url !== undefined && avatar_url !== null) {
        if (avatar_url.startsWith("preset:")) {
          const presetId = avatar_url.slice(7);
          if (!VALID_PRESET_IDS.has(presetId)) {
            return new Response(
              JSON.stringify({ detail: `Unknown preset id '${presetId}'.` }),
              { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const allowedPrefix = `${supabaseUrl}/storage/v1/object/public/avatars/`;
          if (!avatar_url.startsWith(allowedPrefix)) {
            return new Response(
              JSON.stringify({ detail: "avatar_url must be a Supabase Storage URL in the avatars bucket." }),
              { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        if (avatar_url.length > 500) {
          return new Response(
            JSON.stringify({ detail: "avatar_url is too long." }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const now = new Date().toISOString();

      const { data: existing } = await sb
        .from("user_profiles")
        .select("user_id")
        .eq("user_id", user.userId)
        .single();

      try {
        if (existing) {
          const patch: Record<string, unknown> = { updated_at: now };
          if (username !== undefined) patch.username = username;
          if (avatar_url !== undefined) patch.avatar_url = avatar_url;
          await sb.from("user_profiles").update(patch).eq("user_id", user.userId);
        } else {
          await sb.from("user_profiles").insert({
            user_id: user.userId,
            username: username || null,
            avatar_url: avatar_url || null,
            updated_at: now,
          });
        }
      } catch (e: unknown) {
        const errStr = String(e).toLowerCase();
        if (errStr.includes("username") && (errStr.includes("unique") || errStr.includes("duplicate"))) {
          return new Response(
            JSON.stringify({ detail: "That username is already taken." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ detail: "Failed to update profile." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: updated } = await sb
        .from("user_profiles")
        .select("username, avatar_url, updated_at")
        .eq("user_id", user.userId)
        .single();

      return new Response(JSON.stringify(updated || { username, avatar_url, updated_at: now }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ detail: "Method not allowed" }), {
      status: 405,
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
