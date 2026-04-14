export interface Card {
  name: string;
  quantity: number;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  rarity: string;
  set_code: string;
  image_uri: string;
  scryfall_id: string;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    eur?: string | null;
    tix?: string | null;
  } | null;
  card_faces?: Array<{
    name?: string;
    type_line?: string;
    oracle_text?: string;
  }> | null;
}

export function createCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "",
    quantity: 1,
    mana_cost: "",
    cmc: 0,
    type_line: "",
    oracle_text: "",
    colors: [],
    color_identity: [],
    keywords: [],
    rarity: "",
    set_code: "",
    image_uri: "",
    scryfall_id: "",
    prices: null,
    card_faces: null,
    ...overrides,
  };
}

export function isLand(card: Card): boolean {
  return card.type_line.toLowerCase().includes("land");
}

export function isCreature(card: Card): boolean {
  return card.type_line.toLowerCase().includes("creature");
}

export interface Deck {
  id: string;
  name: string;
  commander: Card | null;
  partner: Card | null;
  mainboard: Card[];
  sideboard: Card[];
  format: string;
  description: string;
}

export function getAllCards(deck: Deck): Card[] {
  const cards: Card[] = [];
  if (deck.commander) cards.push(deck.commander);
  if (deck.partner) cards.push(deck.partner);
  cards.push(...deck.mainboard);
  return cards;
}

export function getCardCount(deck: Deck): number {
  return getAllCards(deck).reduce((sum, c) => sum + c.quantity, 0);
}

export function getDeckColorIdentity(deck: Deck): string[] {
  const colors = new Set<string>();
  if (deck.commander) deck.commander.color_identity.forEach((c) => colors.add(c));
  if (deck.partner) deck.partner.color_identity.forEach((c) => colors.add(c));
  return [...colors].sort();
}

export interface Collection {
  cards: Card[];
}

export function getCollectionCard(collection: Collection, name: string): Card | null {
  return collection.cards.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
}

export function hasCard(collection: Collection, name: string): boolean {
  return getCollectionCard(collection, name) !== null;
}

export function getTotalCards(collection: Collection): number {
  return collection.cards.reduce((sum, c) => sum + c.quantity, 0);
}
