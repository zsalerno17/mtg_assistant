import { Card, createCard, Deck } from "./models.ts";

const MOXFIELD_API_BASE = "https://api2.moxfield.com/v2";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.moxfield.com/",
  Origin: "https://www.moxfield.com",
};

export function extractDeckId(url: string): string | null {
  url = url.trim();
  const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]+$/.test(url)) return url;
  return null;
}

export async function getDeck(deckId: string, timeoutMs = 10000): Promise<Deck> {
  const url = `${MOXFIELD_API_BASE}/decks/all/${encodeURIComponent(deckId)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { 
      headers: BROWSER_HEADERS,
      signal: controller.signal 
    });
    
    if (!res.ok) throw new Error(`Moxfield API error: ${res.status}`);
    const data = await res.json();
    return parseMoxfieldDeck(data);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Moxfield API timeout after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDeckWithMeta(deckId: string, timeoutMs = 10000): Promise<[Deck, string]> {
  const url = `${MOXFIELD_API_BASE}/decks/all/${encodeURIComponent(deckId)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const res = await fetch(url, { 
      headers: BROWSER_HEADERS,
      signal: controller.signal 
    });
    
    if (!res.ok) throw new Error(`Moxfield API error: ${res.status}`);
    const data = await res.json();
    const deck = parseMoxfieldDeck(data);
    const lastUpdatedAt = data.lastUpdatedAtUtc || data.updatedAt || "";
    return [deck, lastUpdatedAt];
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(`Moxfield API timeout after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseMoxfieldDeck(data: Record<string, unknown>): Deck {
  const deckId = (data.publicId as string) || (data.id as string) || "";
  const name = (data.name as string) || "Unknown Deck";

  const commandersRaw = (data.commanders || {}) as Record<string, unknown>;
  const commanderList = Object.values(commandersRaw);
  const commander = commanderList.length >= 1 ? parseMoxfieldCard(commanderList[0] as Record<string, unknown>) : null;
  const partner = commanderList.length >= 2 ? parseMoxfieldCard(commanderList[1] as Record<string, unknown>) : null;

  const mainboardRaw = (data.mainboard || {}) as Record<string, unknown>;
  const mainboard = Object.values(mainboardRaw).map((e) => parseMoxfieldCard(e as Record<string, unknown>));

  const sideboardRaw = (data.sideboard || {}) as Record<string, unknown>;
  const sideboard = Object.values(sideboardRaw).map((e) => parseMoxfieldCard(e as Record<string, unknown>));

  return {
    id: deckId,
    name,
    commander,
    partner,
    mainboard,
    sideboard,
    format: (data.format as string) || "commander",
    description: (data.description as string) || "",
  };
}

function parseMoxfieldCard(entry: Record<string, unknown>): Card {
  const quantity = (entry.quantity as number) || 1;
  const card = (entry.card || {}) as Record<string, unknown>;

  let imageUris = (card.image_uris || {}) as Record<string, string>;
  const cardFaces = (card.card_faces || []) as Record<string, unknown>[];
  if (!imageUris.normal && cardFaces.length > 0) {
    imageUris = (cardFaces[0].image_uris || {}) as Record<string, string>;
  }

  let oracleText = (card.oracle_text as string) || "";
  if (!oracleText && cardFaces.length > 0) {
    oracleText = (cardFaces[0].oracle_text as string) || "";
  }

  return createCard({
    name: (card.name as string) || "",
    quantity,
    mana_cost: (card.mana_cost as string) || "",
    cmc: Number(card.cmc || 0),
    type_line: (card.type_line as string) || "",
    oracle_text: oracleText,
    colors: (card.colors as string[]) || [],
    color_identity: (card.color_identity as string[]) || [],
    keywords: (card.keywords as string[]) || [],
    rarity: (card.rarity as string) || "",
    set_code: (card.set as string) || "",
    image_uri: imageUris.normal || "",
    scryfall_id: (card.scryfall_id as string) || "",
  });
}
