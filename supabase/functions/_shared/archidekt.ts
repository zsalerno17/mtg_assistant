import { Card, createCard, Deck } from "./models.ts";

const ARCHIDEKT_API_BASE = "https://archidekt.com/api/decks";

export function extractDeckId(url: string): string | null {
  url = url.trim();
  // Match https://archidekt.com/decks/365563/... or https://archidekt.com/decks/365563
  const match = url.match(/archidekt\.com\/decks\/(\d+)/);
  if (match) return match[1];
  // Accept a raw numeric ID
  if (/^\d+$/.test(url)) return url;
  return null;
}

export async function getDeck(deckId: string, timeoutMs = 10000): Promise<Deck> {
  const url = `${ARCHIDEKT_API_BASE}/${encodeURIComponent(deckId)}/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Archidekt API error: ${res.status}`);
    const data = await res.json();
    return parseArchidektDeck(data);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Archidekt API timeout after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDeckWithMeta(
  deckId: string,
  timeoutMs = 10000,
): Promise<[Deck, string]> {
  const url = `${ARCHIDEKT_API_BASE}/${encodeURIComponent(deckId)}/`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Archidekt API error: ${res.status}`);
    const data = await res.json();
    const deck = parseArchidektDeck(data);
    const lastUpdatedAt = (data.updatedAt as string) || (data.updatedAt as string) || "";
    return [deck, lastUpdatedAt];
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Archidekt API timeout after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseArchidektDeck(data: Record<string, unknown>): Deck {
  const deckId = String((data.id as number) || "");
  const name = (data.name as string) || "Unknown Deck";

  const categories = (data.categories as Record<string, unknown>[]) || [];

  const commanders: Card[] = [];
  const mainboard: Card[] = [];
  const sideboard: Card[] = [];

  for (const category of categories) {
    const categoryName = ((category.name as string) || "").toLowerCase();
    const cards = (category.cards as Record<string, unknown>[]) || [];

    for (const entry of cards) {
      const card = parseArchidektCard(entry);
      if (!card) continue;

      if (categoryName === "commander") {
        commanders.push(card);
      } else if (categoryName === "sideboard") {
        sideboard.push(card);
      } else {
        mainboard.push(card);
      }
    }
  }

  const commander = commanders.length >= 1 ? commanders[0] : null;
  const partner = commanders.length >= 2 ? commanders[1] : null;

  return {
    id: deckId,
    name,
    commander,
    partner,
    mainboard,
    sideboard,
    format: "commander",
    description: (data.description as string) || "",
  };
}

function parseArchidektCard(entry: Record<string, unknown>): Card | null {
  const quantity = (entry.quantity as number) || 1;
  const cardObj = (entry.card || {}) as Record<string, unknown>;
  const oracleCard = (cardObj.oracleCard || {}) as Record<string, unknown>;

  const name = (oracleCard.name as string) || "";
  if (!name) return null;

  const scryfallId = (cardObj.uid as string) || "";

  // Construct Scryfall CDN image URL from the UUID.
  // Format: https://cards.scryfall.io/normal/front/{a}/{b}/{uuid}.jpg
  // Fall back to the API image endpoint if uid is missing.
  let imageUri = "";
  if (scryfallId && scryfallId.length >= 2) {
    const a = scryfallId[0];
    const b = scryfallId[1];
    imageUri = `https://cards.scryfall.io/normal/front/${a}/${b}/${scryfallId}.jpg`;
  } else if (scryfallId) {
    imageUri = `https://api.scryfall.com/cards/${scryfallId}?format=image`;
  }

  // Archidekt returns color arrays as uppercase single letters (same as our model)
  const colors = (oracleCard.colors as string[]) || [];
  const colorIdentity = (oracleCard.colorIdentity as string[]) || [];

  return createCard({
    name,
    quantity,
    mana_cost: (oracleCard.manaCost as string) || "",
    cmc: Number(oracleCard.cmc || 0),
    type_line: (oracleCard.typeLine as string) || "",
    oracle_text: (oracleCard.oracleText as string) || "",
    colors,
    color_identity: colorIdentity,
    keywords: (oracleCard.keywords as string[]) || [],
    rarity: (oracleCard.rarity as string) || "",
    set_code: (cardObj.edition as string) || "",
    image_uri: imageUri,
    scryfall_id: scryfallId,
  });
}
