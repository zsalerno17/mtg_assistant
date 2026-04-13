import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getServiceClient } from "./supabase.ts";

export interface AuthUser {
  userId: string;
  email: string;
}

let _anonClient: ReturnType<typeof createClient> | null = null;

function getAnonClient() {
  if (!_anonClient) {
    _anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
  }
  return _anonClient;
}

export async function requireAllowedUser(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing or invalid authorization header");
  }
  const token = authHeader.slice(7);

  const sb = getAnonClient();

  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) {
    throw new AuthError(401, "Invalid or expired token");
  }

  const email = user.email;
  if (!email) {
    throw new AuthError(401, "Token missing email claim");
  }

  const srv = getServiceClient();
  const { data, error: allowError } = await srv
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (allowError) {
    console.error("[requireAllowedUser] Database error checking allowed_users:", allowError);
    throw new AuthError(500, "Auth validation failed");
  }

  if (!data) {
    throw new AuthError(403, "Account not authorized. Contact the administrator.");
  }

  return { userId: user.id, email };
}

export function getTokenFromRequest(req: Request): string {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError(401, "Missing or invalid authorization header");
  }
  return authHeader.slice(7);
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
