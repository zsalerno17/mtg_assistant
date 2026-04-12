/**
 * Phase 32-A Spike Test: Moxfield API compatibility with Deno fetch()
 *
 * Tests whether the Moxfield API can be called from Deno (the Edge Function runtime)
 * using browser-like headers, WITHOUT cloudscraper.
 *
 * Run: ~/.deno/bin/deno run --allow-net scripts/test_moxfield_deno.ts <deck_id_or_url>
 *
 * Decision gate:
 *   ✅ Returns deck JSON  → Deno fetch works, migration is feasible
 *   ❌ Returns 403/429/Cloudflare HTML → cloudscraper is required, migration is blocked
 */

const MOXFIELD_API_BASE = "https://api2.moxfield.com/v2";

function extractDeckId(input: string): string | null {
  const match = input.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]+$/.test(input.trim())) return input.trim();
  return null;
}

async function testMoxfieldFetch(deckIdOrUrl: string) {
  const deckId = extractDeckId(deckIdOrUrl);
  if (!deckId) {
    console.error("❌ Could not extract deck ID from:", deckIdOrUrl);
    Deno.exit(1);
  }

  const url = `${MOXFIELD_API_BASE}/decks/all/${deckId}`;
  console.log(`\n🧪 Testing Moxfield fetch from Deno`);
  console.log(`   URL: ${url}`);
  console.log(`   Headers: browser-like (Chrome/macOS)\n`);

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.moxfield.com/",
    "Origin": "https://www.moxfield.com",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
  };

  try {
    const start = Date.now();
    const response = await fetch(url, { headers });
    const elapsed = Date.now() - start;

    console.log(`   HTTP Status: ${response.status} ${response.statusText}`);
    console.log(`   Response time: ${elapsed}ms`);
    console.log(`   Content-Type: ${response.headers.get("content-type")}`);

    const body = await response.text();

    if (response.status === 200) {
      try {
        const json = JSON.parse(body);
        const deckName = json?.name ?? "(no name field)";
        const commander = json?.commanders
          ? Object.values(json.commanders as Record<string, { card: { name: string } }>)[0]?.card?.name ?? "(none)"
          : "(none)";
        const mainboardCount = json?.mainboard
          ? Object.values(json.mainboard as Record<string, { quantity: number }>).reduce(
              (sum, c) => sum + (c.quantity ?? 1),
              0
            )
          : 0;

        console.log(`\n✅ SUCCESS — Deno fetch works without cloudscraper!`);
        console.log(`   Deck: "${deckName}"`);
        console.log(`   Commander: ${commander}`);
        console.log(`   Mainboard cards: ${mainboardCount}`);
        console.log(`\n🟢 GO — Phase 32 migration is feasible`);
      } catch {
        console.log(`\n✅ Status 200 but couldn't parse JSON. Body preview:`);
        console.log(body.slice(0, 300));
      }
    } else if (response.status === 403) {
      console.log(`\n❌ BLOCKED — Cloudflare/Moxfield returned 403 Forbidden`);
      console.log(`   Body preview: ${body.slice(0, 500)}`);
      console.log(`\n🔴 NO-GO — cloudscraper is required, migration needs rethink`);
    } else if (response.status === 429) {
      console.log(`\n⚠️  RATE LIMITED — 429 Too Many Requests`);
      console.log(`   This is likely a temporary block, not a permanent one`);
      console.log(`   Retry in a few minutes with a different deck ID`);
    } else {
      console.log(`\n⚠️  Unexpected status: ${response.status}`);
      console.log(`   Body preview: ${body.slice(0, 500)}`);
    }
  } catch (e) {
    console.error(`\n❌ Network error:`, e);
    console.log(`\n🔴 NO-GO — fetch failed entirely`);
  }
}

const deckIdOrUrl = Deno.args[0] ?? "https://www.moxfield.com/decks/6CmDgAJlgEO3OkRJu-kbhg";
await testMoxfieldFetch(deckIdOrUrl);
