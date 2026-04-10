# MTG Commander Assistant 🧙

An intelligent deck-building assistant for **Magic: The Gathering Commander (EDH)**.  
Built with Python and Streamlit, powered by Moxfield data and optionally by OpenAI GPT.

---

## Features

| Feature | Description |
|---|---|
| **Deck Analysis** | Fetches any public Moxfield deck and shows mana curve, card-type breakdown, average CMC, ramp/draw/removal counts, and identified themes. |
| **Weakness Detection** | Flags low land count, insufficient ramp/draw/removal, and high average CMC automatically. |
| **Collection-Based Suggestions** | Upload your Moxfield collection CSV (or paste a text list) to see which cards you already own could improve the deck — with suggested cuts. |
| **Strategy Guide** | Rule-based strategy advice out of the box; full AI-powered strategy guides when an OpenAI key is provided. |
| **Improvement Recommendations** | Prioritised list of changes, including collection cards and Commander staples. |
| **Change Impact Analysis** | Enter cards to add/remove and instantly see how those changes affect the deck's strategy and power level. |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/zsalerno17/mtg_assistant.git
cd mtg_assistant
pip install -r requirements.txt
```

### 2. (Optional) Configure OpenAI

AI-powered advice requires an OpenAI API key.  
Either set it as an environment variable or enter it in the app sidebar:

```bash
export OPENAI_API_KEY=sk-...
# or copy .env.example to .env and fill it in
```

### 3. Run the app

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`.

---

## Usage

1. Paste a **Moxfield deck URL** (e.g. `https://www.moxfield.com/decks/AbCdEfGh`) into the input field.
2. (Optional) Upload your **Moxfield collection CSV** or enter cards in the sidebar text box.
3. Explore the five tabs:
   - **📊 Overview** — Stats, mana curve chart, weaknesses
   - **💎 Collection** — Cards from your collection that fit the deck
   - **🗺️ Strategy** — How the deck wants to play
   - **📈 Improvements** — Prioritised upgrade suggestions
   - **🔄 Changes** — Analyse the impact of specific add/remove decisions

### Exporting your Moxfield collection

1. Go to [moxfield.com](https://www.moxfield.com) → **Collection**
2. Click **Export → CSV**
3. Upload the downloaded file in the app sidebar

---

## Development

```bash
# Run tests
pip install pytest
python -m pytest tests/ -v

# Project structure
app.py                # Streamlit entry point
src/
  models.py           # Card / Deck / Collection dataclasses
  moxfield.py         # Moxfield API client
  scryfall.py         # Scryfall API client
  deck_analyzer.py    # Analysis engine
  collection.py       # CSV & text-list collection parser
  assistant.py        # AI assistant (OpenAI + rule-based fallback)
tests/
  test_models.py
  test_moxfield.py
  test_deck_analyzer.py
  test_collection.py
```

---

## Data Sources

- **[Moxfield](https://www.moxfield.com)** — Deck and collection data (public API)
- **[Scryfall](https://scryfall.com)** — Card database lookups
- **[OpenAI](https://openai.com)** — AI-powered advice (optional)

