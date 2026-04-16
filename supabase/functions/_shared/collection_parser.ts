import { Card, Collection, createCard } from "./models.ts";

export function parseMoxfieldCsv(content: string): Collection {
  const lines = content.split("\n");
  if (lines.length === 0) return { cards: [] };

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  // Moxfield uses "Count"; Archidekt uses "Quantity"
  const countIdx = header.findIndex((h) => h === "Count" || h === "Quantity");
  const nameIdx = header.findIndex((h) => h === "Name");
  // Moxfield CSV has a "Foil" column with value "foil" for foil cards
  const foilIdx = header.findIndex((h) => h === "Foil");

  if (nameIdx === -1) return { cards: [] };

  const cards: Card[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (handles quoted fields)
    const fields = parseCsvLine(line);
    const name = (fields[nameIdx] || "").trim().replace(/^"|"$/g, "");
    const countStr = countIdx >= 0 ? (fields[countIdx] || "1").trim() : "1";
    if (!name) continue;

    const count = parseInt(countStr, 10) || 1;
    const foilStr = foilIdx >= 0 ? (fields[foilIdx] || "").trim().toLowerCase() : "";
    const isFoil = foilStr === "foil" || foilStr === "true" || foilStr === "1";
    cards.push(createCard({ name, quantity: count, foil: isFoil }));
  }

  return { cards };
}

export function parseTextList(text: string): Collection {
  const cards: Card[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    let quantity = 1;
    let name = line;

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const qtyStr = parts[0].replace(/[xX]$/, "");
      if (/^\d+$/.test(qtyStr)) {
        quantity = parseInt(qtyStr, 10);
        name = parts.slice(1).join(" ").trim();
      } else {
        // Try quantity at end
        const last = parts[parts.length - 1];
        if (/^\d+$/.test(last)) {
          name = parts.slice(0, -1).join(" ").trim();
          quantity = parseInt(last, 10);
        }
      }
    }

    if (name) {
      cards.push(createCard({ name, quantity }));
    }
  }

  return { cards };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
