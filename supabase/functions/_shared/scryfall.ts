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
  });
}
