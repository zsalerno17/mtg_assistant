# League Tracking Feature

## Overview

The League/Pod Tracking system allows Commander players to create seasons, log weekly games, and track standings over time. Perfect for regular playgroups like "The Commander Gauntlet" — a WWE-style Commander league with entrance music, catchphrases, and trash talk.

## Features

### ✅ What's Included

- **League/Season Management**
  - Create multi-week seasons with start/end dates
  - Store league rules and description (Markdown supported)
  - Track league status (draft → active → completed)

- **Member Profiles**
  - Superstar names (wrestling persona names)
  - Entrance music URLs (YouTube, Spotify, etc.)
  - Catchphrases
  - Current titles ("The Betrayer", "Comeback Kid", etc.)

- **Game Logging**
  - Record placements (1st/2nd/3rd/4th)
  - Link to decks from your library (optional)
  - Upload screenshot URLs for final board states
  - Track special awards:
    - 🎤 WWE Entrance of the Week
    - 🔥 Spicy Play of the Week

- **Automatic Points Calculation**
  - **3 pts** — Win the game (1st place)
  - **1 pt** — First Blood (first elimination, 4th place)
  - **1 pt** — Last Stand (last eliminated, 2nd place)
  - **1 pt** — Entrance Bonus (voted best entrance)

- **Standings & Leaderboard**
  - Real-time standings with rank badges (🥇🥈🥉)
  - Tiebreaker logic: Total Points → Most Wins → Head-to-Head
  - Breakdown: games played, wins, first bloods, last stands, entrance bonuses

- **Game History**
  - Full history of all games with placements and points awarded
  - Spicy Play descriptions and screenshots
  - Per-game notes

## User Flow

### 1. Create a League

1. Navigate to **Leagues** in the top nav
2. Click **+ Create League**
3. Fill out:
   - League name (e.g., "The Commander Gauntlet - Spring 2026")
   - Description/rules (paste your league rules)
   - Season start and end dates
4. Click **Create League**

### 2. Join as a Member

1. Open the league
2. Go to **Members** tab
3. Click **+ Join League**
4. Enter:
   - Superstar name (your in-game persona)
   - Entrance music URL (optional)
   - Catchphrase (optional)
5. Other players join using a shared invite link (future feature) or manually add themselves

### 3. Log a Game

1. After your weekly session, go to the league page
2. Click **+ Log Game**
3. Fill out:
   - **Game Details**: Game number, date/time, screenshot URL, notes
   - **Player Results**: Select placement (1st/2nd/3rd/4th) for each player
   - **Special Awards**: Vote on entrance winner and spicy play
4. Click **Log Game**
5. Points are auto-calculated and standings update instantly

### 4. View Standings

1. Go to league page → **Standings** tab
2. See real-time leaderboard with:
   - Rank (with 🥇🥈🥉 badges)
   - Total points
   - Win/loss breakdown
   - Special stats (first bloods, last stands, entrances)

## Scoring Rules

### Points Per Game

| Achievement | Points | When Awarded |
|------------|--------|--------------|
| 🏆 **Win** | **3 pts** | Finish 1st place |
| 🩸 **First Blood** | **1 pt** | First player eliminated (4th place) |
| ⚔️ **Last Stand** | **1 pt** | Last player eliminated (2nd place) |
| 🎤 **Entrance Bonus** | **1 pt** | Pod votes on best entrance of the week |

### Example Game

In a 4-player game:
- **Alice** wins (1st) → 3 pts
- **Bob** comes 2nd → 1 pt (Last Stand)
- **Charlie** comes 3rd → 0 pts
- **David** eliminated first (4th) → 1 pt (First Blood)
- **Alice** also wins Entrance Bonus → +1 pt (total: 4 pts)

### Tiebreakers

If two players have the same total points at season's end:

1. **Most wins** takes it
2. Still tied? **Head-to-head record** (who eliminated whom)
3. Still tied? **Final duel** (one last game to settle it)

## Database Schema

### Tables

```sql
leagues
├── id (UUID)
├── name (TEXT)
├── description (TEXT) -- Markdown rules/lore
├── created_by (UUID → users)
├── season_start (DATE)
├── season_end (DATE)
└── status (draft | active | completed)

league_members
├── id (UUID)
├── league_id (UUID → leagues)
├── user_id (UUID → users)
├── superstar_name (TEXT)
├── entrance_music_url (TEXT)
├── catchphrase (TEXT)
└── current_title (TEXT) -- "The Betrayer", etc.

league_games
├── id (UUID)
├── league_id (UUID → leagues)
├── game_number (INT)
├── played_at (TIMESTAMPTZ)
├── screenshot_url (TEXT)
├── spicy_play_description (TEXT)
├── spicy_play_winner_id (UUID → league_members)
├── entrance_winner_id (UUID → league_members)
└── notes (TEXT)

league_game_results
├── id (UUID)
├── game_id (UUID → league_games)
├── member_id (UUID → league_members)
├── deck_id (UUID → user_decks) -- optional
├── placement (INT) -- 1 = winner, 4 = first out
├── earned_win (BOOLEAN)
├── earned_first_blood (BOOLEAN)
├── earned_last_stand (BOOLEAN)
├── earned_entrance_bonus (BOOLEAN)
├── total_points (INT) -- calculated on insert
└── notes (TEXT)
```

### SQL Helper Function

```sql
get_league_standings(league_uuid UUID)
```

Returns standings with:
- Superstar name
- Total points
- Games played
- Wins
- First bloods
- Last stands
- Entrance bonuses

Sorted by: `total_points DESC, wins DESC` (tiebreaker built-in)

## API Endpoints

### Leagues

- `POST /api/leagues` — Create league
- `GET /api/leagues` — List user's leagues
- `GET /api/leagues/{id}` — Get league details
- `PATCH /api/leagues/{id}` — Update league (creator only)
- `DELETE /api/leagues/{id}` — Delete league (creator only)

### Members

- `POST /api/leagues/{id}/members` — Join league
- `GET /api/leagues/{id}/members` — List members
- `PATCH /api/leagues/{id}/members/{member_id}` — Update profile

### Games

- `POST /api/leagues/{id}/games` — Log game (with results)
- `GET /api/leagues/{id}/games` — Get game history

### Standings

- `GET /api/leagues/{id}/standings` — Calculate current standings

## Future Enhancements

### Planned

- **Invite links** — Generate shareable links for joining leagues
- **Season archives** — Historical view of past seasons
- **Export standings** — Download leaderboard as image or PDF
- **Statistics dashboard** — Win rates, favorite decks, head-to-head records
- **Playoff brackets** — Auto-generate single-elimination tournament for season finals
- **In-app notifications** — Remind pod when it's game night
- **Photo uploads** — Direct upload for screenshots (instead of URLs)
- **Match scheduler** — Calendar integration for weekly sessions

### Potential Integrations

- **SpellTable API** — Auto-detect when games start/end
- **Discord bot** — Post standings updates to Discord channels
- **Moxfield decks** — Auto-import decks from shared Moxfield folder
- **Webhooks** — Trigger custom actions (e.g., tweet when someone wins)

## MTG Expert Notes

### Why This Feature Matters

**Gap in existing tools:**
- EDHREC, Moxfield, Archidekt — deck building, not session tracking
- MTG Arena/MTGO — digital play only, no Commander pod support
- TappedOut — outdated tournament brackets, not season-based
- Manual tracking (Google Sheets, Discord) — no automation, manual math

**What we do better:**
- **Automatic points** — no manual spreadsheet calculations
- **Integrated with decks** — link games to your deck library
- **Commander-specific** — built for 4-player multiplayer, not 1v1
- **Persistence** — full history, not just current standings
- **Persona system** — embrace the social/trash-talk aspect of Commander

### Commander-Specific Considerations

**Scoring assumptions:**
- 4 players per game (configurable up to 10 in schema)
- First elimination = 4th place (last in finish order)
- Last elimination = 2nd place (fought to the end but didn't win)
- Multiplayer threat assessment matters — first blood is a badge of honor

**Not included (intentionally):**
- **Match results (best-of-3)** — Commander is one-game format
- **Swiss pairings** — pods are fixed groups, not tournaments
- **Banned list tracking** — use Rule 0 conversations instead
- **cEDH power budgets** — meta-dependent, handled in league rules

## Testing Checklist

Before shipping:

- [ ] Run migration 007 on dev Supabase
- [ ] Create a league with 4 members
- [ ] Log 2-3 games with varied placements
- [ ] Verify standings calculate correctly
- [ ] Test tiebreaker scenarios
- [ ] Verify RLS policies (users can only see leagues they're in)
- [ ] Test edge cases: 2-player game, 6-player game
- [ ] Verify deck linking works (optional deck selection)
- [ ] Test entrance bonus awards
- [ ] Validate spicy play descriptions display correctly

## Example League Rules

Copy/paste this into a league description:

```markdown
# ⚔️ THE COMMANDER GAUNTLET ⚔️
*A 4-Player League of Glory, Treachery, and Cardboard Combat*

## Format
- 4 players, 1 pod, Commander (EDH) format
- 1 game per week on SpellTable
- Season runs April–May (~6 weeks)

## Scoring
- **3 pts** — Win the game
- **1 pt** — First elimination (drawing blood)
- **1 pt** — Last player eliminated (dying with your boots on)
- **1 bonus pt** — WWE Entrance of the Week

## The WWE Entrance Rule (MANDATORY)
Every player must have:
- 🎵 Entrance music (screen share or mic blast)
- 🗣️ A catchphrase
- 💀 A superstar name

Best entrance each week earns +1 pt.

## House Rules
- **Handshake Rule** — Verbal callout to each opponent before game
- **Villain of the Week** — Previous winner delivers 10-sec victory speech
- **Open Negotiation** — Deals allowed. Betrayal encouraged.
- **No Ragequits** — Minimum 3 turns before conceding
- **Spicy Play of the Week** — Vote in group chat for most unhinged play

*Log on. Camera up. May your draws be gas and your opponents' hands be bricks.*
```

---

**Built with:** FastAPI, Supabase, React, Tailwind CSS  
**Best enjoyed with:** Trash talk, entrance music, and cardboard
