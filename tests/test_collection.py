"""Tests for src/collection.py"""

from src.collection import parse_moxfield_csv, parse_text_list


CSV_SAMPLE = """\
Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number
4,0,"Sol Ring",Commander 2021,Near Mint,English,,,,27
1,0,"Arcane Signet",Commander Legends,Near Mint,English,,,,332
2,0,"Forest",Innistrad,Near Mint,English,,,,265
"""


class TestParseMoxfieldCsv:
    def test_basic_parse(self):
        col = parse_moxfield_csv(CSV_SAMPLE)
        assert len(col.cards) == 3

    def test_quantities(self):
        col = parse_moxfield_csv(CSV_SAMPLE)
        by_name = {c.name: c.quantity for c in col.cards}
        assert by_name["Sol Ring"] == 4
        assert by_name["Arcane Signet"] == 1
        assert by_name["Forest"] == 2

    def test_empty_csv(self):
        col = parse_moxfield_csv("Count,Name\n")
        assert col.cards == []

    def test_total_cards(self):
        col = parse_moxfield_csv(CSV_SAMPLE)
        assert col.total_cards == 7  # 4+1+2


class TestParseTextList:
    def test_quantity_prefix(self):
        col = parse_text_list("4 Sol Ring\n1 Arcane Signet")
        names = [c.name for c in col.cards]
        assert "Sol Ring" in names
        assert "Arcane Signet" in names

    def test_quantity_x_prefix(self):
        col = parse_text_list("4x Sol Ring")
        assert col.cards[0].quantity == 4

    def test_no_quantity(self):
        col = parse_text_list("Sol Ring")
        assert col.cards[0].quantity == 1

    def test_quantity_suffix(self):
        col = parse_text_list("Sol Ring 3")
        assert col.cards[0].quantity == 3

    def test_skips_blank_lines(self):
        col = parse_text_list("\n\nSol Ring\n\n")
        assert len(col.cards) == 1

    def test_skips_comments(self):
        col = parse_text_list("# This is a comment\nSol Ring")
        assert len(col.cards) == 1
        assert col.cards[0].name == "Sol Ring"

    def test_empty_input(self):
        col = parse_text_list("")
        assert col.cards == []
