"""Collection parsing utilities.

Supports:
  - Moxfield CSV export
  - Plain-text card lists (one per line, optional quantity prefix)
"""

import csv
import io
from typing import List

from .models import Card, Collection

# Moxfield CSV column names (from a standard export)
_MOXFIELD_COUNT_COL = "Count"
_MOXFIELD_NAME_COL = "Name"


def parse_moxfield_csv(content: str) -> Collection:
    """Parse a Moxfield collection CSV export into a Collection.

    The CSV is expected to have at least "Count" and "Name" columns.
    Extra columns (Edition, Condition, etc.) are ignored.
    """
    reader = csv.DictReader(io.StringIO(content))
    cards: List[Card] = []

    for row in reader:
        name = row.get(_MOXFIELD_NAME_COL, "").strip().strip('"')
        count_str = row.get(_MOXFIELD_COUNT_COL, "1").strip()
        if not name:
            continue
        try:
            count = int(count_str)
        except ValueError:
            count = 1
        cards.append(Card(name=name, quantity=count))

    return Collection(cards=cards)


def parse_text_list(text: str) -> Collection:
    """Parse a plain-text card list into a Collection.

    Supported line formats:
      - "4 Sol Ring"
      - "Sol Ring 4"
      - "Sol Ring"          (quantity defaults to 1)
      - "4x Sol Ring"
    """
    cards: List[Card] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        quantity = 1
        name = line

        # Try "4 Card Name" or "4x Card Name"
        parts = line.split(None, 1)
        if len(parts) == 2:
            qty_str = parts[0].rstrip("xX")
            if qty_str.isdigit():
                quantity = int(qty_str)
                name = parts[1].strip()
            else:
                # Try "Card Name 4" (quantity at end)
                rparts = line.rsplit(None, 1)
                if len(rparts) == 2 and rparts[1].isdigit():
                    name = rparts[0].strip()
                    quantity = int(rparts[1])

        if name:
            cards.append(Card(name=name, quantity=quantity))

    return Collection(cards=cards)
