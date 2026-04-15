/**
 * Shared deck usage utility
 *
 * Provides a reusable `buildCardUsageMap` function that cross-references a user's
 * decks against their collection to produce a per-card usage count. This was
 * previously duplicated across the /analyze and /efficiency endpoint handlers.
 *
 * Any endpoint that needs card usage data (in_use, available) should call this
 * function rather than reimplementing the deck-query logic.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DeckUsageEntry {
  total: number;
  decks: Array<{ deck_name: string; quantity: number }>;
}

export type UsageMap = Map<string, DeckUsageEntry>;

/**
 * Builds a map of card name → usage data by querying the user's decks.
 *
 * Keys are lowercased card names for case-insensitive lookup.
 * Returns an empty map if the user has no decks.
 */
export async function buildCardUsageMap(
  sb: SupabaseClient,
  userId: string,
  logPrefix = "[buildCardUsageMap]"
): Promise<UsageMap> {
  const usageMap: UsageMap = new Map();

  const { data: userDecks } = await sb
    .from("user_decks")
    .select("moxfield_id, deck_name")
    .eq("user_id", userId);

  if (!userDecks || userDecks.length === 0) return usageMap;

  const moxfieldIds = userDecks.map((d: { moxfield_id: string }) => d.moxfield_id);

  const { data: deckData } = await sb
    .from("decks")
    .select("moxfield_id, data_json")
    .in("moxfield_id", moxfieldIds);

  if (!deckData) return usageMap;

  for (const deck of deckData) {
    const deckInfo = userDecks.find(
      (ud: { moxfield_id: string; deck_name: string }) => ud.moxfield_id === deck.moxfield_id
    );
    const deckName = deckInfo?.deck_name || "Unnamed Deck";
    const mainboard =
      (deck.data_json as { mainboard?: { name: string; quantity?: number }[] })
        .mainboard || [];

    for (const card of mainboard) {
      const key = card.name.toLowerCase();
      const qty = card.quantity || 1;
      const existing = usageMap.get(key);

      if (existing) {
        existing.total += qty;
        existing.decks.push({ deck_name: deckName, quantity: qty });
      } else {
        usageMap.set(key, {
          total: qty,
          decks: [{ deck_name: deckName, quantity: qty }],
        });
      }
    }
  }

  console.log(
    `${logPrefix} Built usage map with ${usageMap.size} unique cards from ${deckData.length} decks`
  );

  return usageMap;
}
