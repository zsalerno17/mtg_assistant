import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
});
