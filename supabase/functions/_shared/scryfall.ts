import { Card, createCard } from "./models.ts";

const SCRYFALL_API_BASE = "https://api.scryfall.com";
const REQUEST_DELAY = 100; // ms

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scryfallGet(url: string, params?: Record<string, string>): Promise<Record<string, unknown> | null> {
  await sleep(REQUEST_DELAY);
  const u = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
  }
  try {
    const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getCardByName(name: string): Promise<Card | null> {
  const url = `${SCRYFALL_API_BASE}/cards/named`;
  let data = await scryfallGet(url, { exact: name });
  if (!data) {
    data = await scryfallGet(url, { fuzzy: name });
  }
  if (!data) return null;
  return parseCard(data);
}

export interface CardIdentifier {
  name: string;
  edition?: string;       // set code e.g. "mh2"
  collector_number?: string;
}

/**
 * Batch-fetch cards using Scryfall's /cards/collection endpoint.
 * When edition + collector_number are provided, uses exact printing lookup
 * so prices reflect the specific printing the user owns.
 * Falls back to name-only lookup for cards missing that info.
 * Returns a Map keyed by lowercase card name.
 */
export async function getCardsByNames(cards: string[] | CardIdentifier[]): Promise<Map<string, Card>> {
  const result = new Map<string, Card>();
  const BATCH_SIZE = 75;

  // Normalize input: accept plain string[] or CardIdentifier[]
  const identifiers: CardIdentifier[] = cards.map((c) =>
    typeof c === "string" ? { name: c } : c
  );

  for (let i = 0; i < identifiers.length; i += BATCH_SIZE) {
    const batch = identifiers.slice(i, i + BATCH_SIZE);

    // Build Scryfall identifiers: use set+collector_number when available for exact pricing
    const scryfallIdentifiers = batch.map(({ name, edition, collector_number }) => {
      if (edition && collector_number) {
        return { name, set: edition, collector_number };
      }
      if (edition) {
        return { name, set: edition };
      }
      return { name };
    });

    if (i > 0) {
      await sleep(REQUEST_DELAY);
    }

    try {
      const res = await fetch(`${SCRYFALL_API_BASE}/cards/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifiers: scryfallIdentifiers }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const cardDataArray: Record<string, unknown>[] = Array.isArray(json?.data) ? json.data : [];
      for (const cardData of cardDataArray) {
        const card = parseCard(cardData);
        result.set(card.name.toLowerCase(), card);
      }

      // Retry any not_found cards with name-only lookup so they get at least
      // the default-printing price rather than falling back to a $0 stub.
      const notFoundArray: Record<string, unknown>[] = Array.isArray(json?.not_found) ? json.not_found : [];
      if (notFoundArray.length > 0) {
        const retryNames = notFoundArray
          .map((id) => (id.name as string) || "")
          .filter(Boolean);
        if (retryNames.length > 0) {
          await sleep(REQUEST_DELAY);
          const retryRes = await fetch(`${SCRYFALL_API_BASE}/cards/collection`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ identifiers: retryNames.map((name) => ({ name })) }),
          });
          if (retryRes.ok) {
            const retryJson = await retryRes.json();
            const retryData: Record<string, unknown>[] = Array.isArray(retryJson?.data) ? retryJson.data : [];
            for (const cardData of retryData) {
              const card = parseCard(cardData);
              // Only set if not already in result (don't overwrite a good exact-printing match)
              if (!result.has(card.name.toLowerCase())) {
                result.set(card.name.toLowerCase(), card);
              }
            }
          }
        }
      }
    } catch {
      // ignore batch errors; missing cards will fall back to stubs
    }
  }

  return result;
}

export async function searchCards(query: string, order = "edhrec", page = 1): Promise<Card[]> {
  const url = `${SCRYFALL_API_BASE}/cards/search`;
  const data = await scryfallGet(url, { q: query, order, page: String(page) });
  if (!data) return [];
  const items = (data.data as Record<string, unknown>[]) || [];
  return items.map(parseCard);
}

export async function getCommanderSuggestions(
  colorIdentity: string[],
  themes?: string[],
  maxResults = 20
): Promise<Card[]> {
  if (colorIdentity.length === 0) return [];
  const colorStr = colorIdentity.join("").toUpperCase();
  let query = `id<=${colorStr} format:commander`;
  if (themes && themes.length > 0) {
    const themeParts = themes.slice(0, 3).map((t) => `o:"${t}"`).join(" OR ");
    query += ` (${themeParts})`;
  }
  const cards = await searchCards(query, "edhrec");
  return cards.slice(0, maxResults);
}

function parseCard(data: Record<string, unknown>): Card {
  let imageUris = (data.image_uris || {}) as Record<string, string>;
  let oracleText = (data.oracle_text as string) || "";
  const cardFaces = (data.card_faces || []) as Record<string, unknown>[];

  if (!imageUris.normal && cardFaces.length > 0) {
    imageUris = (cardFaces[0].image_uris || {}) as Record<string, string>;
  }
  if (!oracleText && cardFaces.length > 0) {
    oracleText = (cardFaces[0].oracle_text as string) || "";
  }

  // Extract card_faces data (for DFCs/MDFCs)
  const parsedCardFaces = cardFaces.length > 0
    ? cardFaces.map(face => ({
        name: (face.name as string) || "",
        type_line: (face.type_line as string) || "",
        oracle_text: (face.oracle_text as string) || "",
      }))
    : null;

  // Extract prices data
  const prices = data.prices
    ? {
        usd: (data.prices as Record<string, string | null>).usd || null,
        usd_foil: (data.prices as Record<string, string | null>).usd_foil || null,
        eur: (data.prices as Record<string, string | null>).eur || null,
        tix: (data.prices as Record<string, string | null>).tix || null,
      }
    : null;

  return createCard({
    name: (data.name as string) || "",
    mana_cost: (data.mana_cost as string) || "",
    cmc: Number(data.cmc || 0),
    type_line: (data.type_line as string) || "",
    oracle_text: oracleText,
    colors: (data.colors as string[]) || [],
    color_identity: (data.color_identity as string[]) || [],
    keywords: (data.keywords as string[]) || [],
    rarity: (data.rarity as string) || "",
    set_code: (data.set as string) || "",
    image_uri: imageUris.normal || "",
    scryfall_id: (data.id as string) || "",
    prices,
    card_faces: parsedCardFaces,
  });
}
