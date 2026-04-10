"""MTG Commander Assistant — Streamlit application entry point."""

from __future__ import annotations

import os
from typing import List, Optional, Tuple

import pandas as pd
import plotly.express as px
import streamlit as st

from src.assistant import explain_deck_changes, get_improvement_suggestions, get_strategy_advice
from src.collection import parse_moxfield_csv, parse_text_list
from src.deck_analyzer import analyze_deck, find_collection_improvements
from src.models import Card, Collection, Deck
from src.moxfield import extract_deck_id, get_deck

# ─── Page config ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="MTG Commander Assistant",
    page_icon="🧙",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Sidebar ──────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("🧙 MTG Commander\nAssistant")
    st.divider()

    # OpenAI key
    st.subheader("🤖 AI Configuration")
    openai_key = st.text_input(
        "OpenAI API Key (optional)",
        type="password",
        help="Enter your OpenAI API key to unlock AI-powered strategy and improvement advice.",
    )
    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key
        st.success("API key set ✓")

    st.divider()

    # Collection input
    st.subheader("📚 Your Collection")
    collection_tab1, collection_tab2 = st.tabs(["CSV Upload", "Text List"])

    with collection_tab1:
        uploaded_file = st.file_uploader(
            "Upload Moxfield Collection CSV",
            type=["csv"],
            help=(
                "Export your collection from Moxfield: "
                "Collection → Export → CSV, then upload here."
            ),
        )

    with collection_tab2:
        manual_text = st.text_area(
            "Enter cards (one per line)",
            placeholder="4 Sol Ring\n1 Arcane Signet\nCommander's Sphere 2",
            height=150,
        )

    st.divider()
    st.caption("Data sources: Moxfield · Scryfall")


# ─── Helpers ──────────────────────────────────────────────────────────────────


@st.cache_data(show_spinner="Fetching deck from Moxfield…")
def fetch_deck(deck_id: str) -> Optional[Deck]:
    try:
        return get_deck(deck_id)
    except Exception as e:
        st.error(f"Could not fetch deck: {e}")
        return None


def build_collection() -> Collection:
    """Build a Collection from whichever input the user provided."""
    if uploaded_file is not None:
        content = uploaded_file.read().decode("utf-8", errors="replace")
        return parse_moxfield_csv(content)
    if manual_text and manual_text.strip():
        return parse_text_list(manual_text)
    return Collection()


def _mana_curve_chart(curve: dict) -> None:
    if not curve:
        st.info("No mana curve data available.")
        return
    df = pd.DataFrame(
        {"CMC": list(curve.keys()), "Cards": list(curve.values())}
    )
    fig = px.bar(
        df,
        x="CMC",
        y="Cards",
        title="Mana Curve",
        color_discrete_sequence=["#7B2FBE"],
        text="Cards",
    )
    fig.update_layout(
        xaxis_title="Converted Mana Cost",
        yaxis_title="Number of Cards",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=0, r=0, t=40, b=0),
    )
    fig.update_xaxes(type="category")
    st.plotly_chart(fig, use_container_width=True)


def _card_type_chart(card_types: dict) -> None:
    if not card_types:
        return
    df = pd.DataFrame(
        {"Type": list(card_types.keys()), "Count": list(card_types.values())}
    )
    fig = px.pie(
        df,
        names="Type",
        values="Count",
        title="Card Types",
        color_discrete_sequence=px.colors.qualitative.Set2,
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=40, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig, use_container_width=True)


def _metric_badge(label: str, value: int, ok: int, warn_below: bool = True) -> None:
    """Show a colored metric: green if ok, yellow/red otherwise."""
    if warn_below:
        color = "normal" if value >= ok else "off"
    else:
        color = "normal" if value <= ok else "off"
    st.metric(label, value, delta=None)


def _show_deck_overview(deck: Deck, analysis: dict) -> None:
    st.subheader("🃏 Deck Overview")

    commander_name = deck.commander.name if deck.commander else "No Commander"
    partner_name = f" + {deck.partner.name}" if deck.partner else ""
    st.markdown(f"**Commander:** {commander_name}{partner_name}")
    st.markdown(f"**Deck name:** {deck.name}  |  **Format:** {deck.format.title()}")
    if deck.description:
        with st.expander("Deck description"):
            st.write(deck.description)

    st.divider()

    # Key stats
    col1, col2, col3, col4, col5 = st.columns(5)
    card_types = analysis.get("card_types", {})
    col1.metric("Total Cards", analysis.get("total_cards", 0))
    col2.metric("Lands", card_types.get("Lands", 0))
    col3.metric("Avg CMC", f"{analysis.get('average_cmc', 0):.2f}")
    col4.metric("Ramp", analysis.get("ramp_count", 0))
    col5.metric("Draw", analysis.get("draw_count", 0))

    col6, col7, col8, col9, col10 = st.columns(5)
    col6.metric("Removal", analysis.get("removal_count", 0))
    col7.metric("Creatures", card_types.get("Creatures", 0))
    col8.metric("Instants", card_types.get("Instants", 0))
    col9.metric("Sorceries", card_types.get("Sorceries", 0))
    col10.metric("Artifacts", card_types.get("Artifacts", 0))

    st.divider()

    # Charts
    chart_col1, chart_col2 = st.columns(2)
    with chart_col1:
        _mana_curve_chart(analysis.get("mana_curve", {}))
    with chart_col2:
        _card_type_chart(analysis.get("card_types", {}))

    # Themes
    themes = analysis.get("themes", [])
    if themes:
        st.markdown("**Identified Themes:** " + "  ·  ".join(f"`{t}`" for t in themes))

    # Weaknesses
    weaknesses = analysis.get("weaknesses", [])
    if weaknesses:
        st.warning("⚠️ **Potential Weaknesses Detected:**")
        for w in weaknesses:
            st.markdown(f"  - {w}")
    else:
        st.success("✅ No major weaknesses detected in the deck's core ratios.")


def _show_collection_tab(
    deck: Deck,
    analysis: dict,
    collection: Collection,
    improvements: List[Tuple[Card, Optional[Card], str]],
) -> None:
    st.subheader("💎 Collection-Based Improvements")

    if not collection.cards:
        st.info(
            "Upload your Moxfield collection CSV or enter cards manually in the sidebar "
            "to see personalized improvement suggestions."
        )
        return

    st.markdown(
        f"Analysing **{collection.total_cards} cards** "
        f"({len(collection.cards)} unique) in your collection…"
    )

    if not improvements:
        st.success(
            "🎉 Your collection doesn't contain any obvious upgrades for this deck "
            "based on current weakness analysis. Either the deck is well-optimised or "
            "your collection data needs Scryfall enrichment for a deeper analysis."
        )
        return

    st.markdown(f"Found **{len(improvements)} potential improvements** from your collection:")
    st.divider()

    for i, (col_card, cut_card, reason) in enumerate(improvements, 1):
        with st.container():
            cols = st.columns([3, 1, 3, 4])
            cols[0].markdown(f"**➕ Add:** `{col_card.name}`")
            cols[1].markdown("→")
            cut_name = cut_card.name if cut_card else "*(flex slot)*"
            cols[2].markdown(f"**✂️ Cut:** `{cut_name}`")
            cols[3].markdown(f"*{reason}*")
        if i < len(improvements):
            st.divider()


def _show_strategy_tab(deck: Deck, analysis: dict) -> None:
    st.subheader("🗺️ Strategy Guide")

    with st.spinner("Generating strategy advice…"):
        advice = get_strategy_advice(deck, analysis)

    st.markdown(advice)


def _show_improvements_tab(
    deck: Deck,
    analysis: dict,
    improvements: List[Tuple[Card, Optional[Card], str]],
) -> None:
    st.subheader("📈 Improvement Recommendations")

    with st.spinner("Generating improvement suggestions…"):
        suggestions = get_improvement_suggestions(deck, analysis, improvements)

    st.markdown(suggestions)


def _show_changes_tab(deck: Deck) -> None:
    st.subheader("🔄 Analyse Proposed Changes")
    st.markdown(
        "Enter the cards you want to **add** and **remove** to see how the changes "
        "affect your deck's strategy and power level."
    )

    col1, col2 = st.columns(2)
    with col1:
        add_text = st.text_area(
            "Cards to ADD (one per line)",
            placeholder="Sol Ring\nArcane Signet",
            height=180,
        )
    with col2:
        remove_text = st.text_area(
            "Cards to REMOVE (one per line)",
            placeholder="Llanowar Elves\nElvish Mystic",
            height=180,
        )

    if st.button("Analyse Changes", type="primary"):
        cards_to_add = [Card(name=n.strip()) for n in add_text.splitlines() if n.strip()]
        cards_to_remove = [Card(name=n.strip()) for n in remove_text.splitlines() if n.strip()]

        if not cards_to_add and not cards_to_remove:
            st.warning("Enter at least one card to add or remove.")
            return

        # Net change warning
        net = len(cards_to_add) - len(cards_to_remove)
        if net != 0:
            direction = "over" if net > 0 else "under"
            st.warning(
                f"⚠️ These changes would put you {abs(net)} card(s) {direction} 100. "
                "Make sure to balance adds and removes."
            )

        with st.spinner("Analysing changes…"):
            explanation = explain_deck_changes(deck, cards_to_add, cards_to_remove)
        st.markdown(explanation)


# ─── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    st.markdown(
        "<h1 style='text-align:center;'>🧙 MTG Commander Assistant</h1>"
        "<p style='text-align:center; color:grey;'>"
        "Deck analysis · Collection matching · Strategy · AI-powered advice"
        "</p>",
        unsafe_allow_html=True,
    )
    st.divider()

    deck_input = st.text_input(
        "🃏 Moxfield Deck URL or Deck ID",
        placeholder="https://www.moxfield.com/decks/AbCdEfGhIj",
        help="Paste a public Moxfield deck URL or just the deck ID.",
    )

    if not deck_input or not deck_input.strip():
        st.info(
            "👆 Paste a Moxfield deck URL above to get started. "
            "You can optionally upload your collection in the sidebar for personalised suggestions."
        )
        _show_feature_overview()
        return

    deck_id = extract_deck_id(deck_input.strip())
    if not deck_id:
        st.error("Could not parse a deck ID from the input. Please use a Moxfield deck URL.")
        return

    deck = fetch_deck(deck_id)
    if deck is None:
        return

    analysis = analyze_deck(deck)
    collection = build_collection()
    improvements = find_collection_improvements(deck, collection) if collection.cards else []

    tab_overview, tab_collection, tab_strategy, tab_improvements, tab_changes = st.tabs([
        "📊 Overview",
        "💎 Collection",
        "🗺️ Strategy",
        "📈 Improvements",
        "🔄 Changes",
    ])

    with tab_overview:
        _show_deck_overview(deck, analysis)

    with tab_collection:
        _show_collection_tab(deck, analysis, collection, improvements)

    with tab_strategy:
        _show_strategy_tab(deck, analysis)

    with tab_improvements:
        _show_improvements_tab(deck, analysis, improvements)

    with tab_changes:
        _show_changes_tab(deck)


def _show_feature_overview() -> None:
    """Landing page feature summary shown before a deck is loaded."""
    st.markdown("---")
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown(
            "### 📊 Deck Analysis\n"
            "Instantly see your deck's mana curve, card type breakdown, "
            "average CMC, ramp/draw/removal counts, and detected themes."
        )

    with col2:
        st.markdown(
            "### 💎 Collection Matching\n"
            "Upload your Moxfield collection export and the assistant identifies "
            "cards you already own that would improve your deck — complete with "
            "suggested cuts."
        )

    with col3:
        st.markdown(
            "### 🗺️ Strategy & AI Advice\n"
            "Get a strategy guide, improvement recommendations, and change-impact "
            "analysis. Provide an OpenAI API key for detailed AI-powered responses."
        )


if __name__ == "__main__":
    main()
