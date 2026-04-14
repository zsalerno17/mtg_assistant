# MTG Commander Tooltip Definitions

Core definitions for tooltips in the mtg-assistant app. All definitions are Commander/EDH-focused.

---

## Game Mechanics

### CMC (Converted Mana Cost)
The total mana cost of a card, counting only the numbers. For example, a card that costs {2}{U}{U} has a CMC of 4. X costs count as 0 when the card is not on the stack. Also called "Mana Value" in current Magic rules.

### Color Identity
All mana symbols that appear in a card's mana cost and rules text. Determines which cards can be included in a Commander deck — only cards matching your commander's color identity are legal. For example, a commander with {W}{U} in its cost has a color identity of White-Blue.

### Commander Damage
Combat damage dealt by a commander to a player. When any single commander deals 21 or more combat damage to a player over the course of a game, that player loses. Tracked separately for each commander.

### Command Zone
A special zone where your commander starts the game. You can cast your commander from here. When your commander would die or be exiled, you may choose to send it to the command zone instead. Each additional cast from the command zone costs {2} more (commander tax).

### Commander Tax
A cumulative {2} cost added each time you cast your commander from the command zone after the first time. First cast is normal, second costs {2} more, third costs {4} more, etc.

---

## Card Categories

### Ramp
Cards that accelerate your mana production, letting you play bigger spells earlier. Includes land ramp (putting lands onto the battlefield), mana rocks (artifacts that tap for mana), and mana dorks (creatures that tap for mana). Most decks want 8-14 ramp pieces depending on strategy and power level.

### Land Ramp
Ramp that puts lands directly onto the battlefield. Examples: Rampant Growth, Cultivate, Kodama's Reach. Generally better than mana rocks because lands are harder to destroy and trigger landfall abilities.

### Mana Rocks
Artifacts that produce mana, like Sol Ring, Arcane Signet, or Fellwar Stone. Fast mana rocks (0-1 CMC) are extremely powerful in high-power and cEDH decks.

### Mana Dorks
Creatures that tap to produce mana, like Llanowar Elves, Birds of Paradise, or Bloom Tender. Vulnerable to creature removal but synergize with creature-based strategies.

### Card Draw
Effects that put cards from your library into your hand, refilling your resources. Includes one-shot effects (draw X cards) and engines (draw cards repeatedly over multiple turns). Most decks want 8-12+ draw sources depending on power level.

### Card Advantage
Any effect that puts you ahead in resources compared to opponents. Can be card draw (refilling hand), tutoring (finding specific cards), recursion (getting cards back from graveyard), or tokens (creating multiple permanents from one card).

### Removal
Spells that eliminate opponent threats. Quality matters: exile is best (bypasses recursion), destroy is good, bounce is temporary. Targeted removal hits one thing, board wipes reset the battlefield. Flexible removal (can hit multiple permanent types) is premium.

### Targeted Removal
Removal that affects a single specific permanent chosen on cast. Examples: Path to Exile, Beast Within, Chaos Warp. More efficient but limited to one threat.

### Board Wipes
Spells that destroy or remove multiple permanents at once. Examples: Wrath of God, Cyclonic Rift, Blasphemous Act. Critical for dealing with token/go-wide strategies and resetting the board when behind.

### Interaction
Spells that disrupt opponents' plans or protect your own. Includes counterspells, instant-speed removal, protection spells, and stax pieces. The ability to respond to threats as they happen rather than tapping out.

### Tutors
Cards that search your library for specific cards, bringing them to your hand or the top of your deck. Examples: Demonic Tutor, Vampiric Tutor, Mystical Tutor. Increase deck consistency but are more powerful in higher-power metas.

### Win Conditions
Cards or combinations that actually end the game. Can be combat damage, combo kills, alternate win conditions (like Laboratory Maniac), or overwhelming value that opponents can't overcome.

### Recursion
Effects that return cards from your graveyard to your hand, battlefield, or library. Examples: Eternal Witness, Regrowth, Sun Titan. Provides resilience and lets you reuse important pieces.

---

## Deck Archetypes

### Combo
Decks focused on assembling specific card combinations that win the game on the spot or create an overwhelming advantage. Examples: Mike and Trike (Mikaeus + Triskelion), Consultation (Thassa's Oracle + Demonic Consultation). Relies on tutors, card draw, and protection.

### Aggro
Decks that win through early pressure and combat damage. Prioritizes low-cost creatures, combat tricks, and dealing damage quickly before opponents stabilize. Less common in Commander due to multiplayer dynamics but viable with the right commander.

### Control
Decks that win through attrition, removing threats and answering everything opponents do until they run out of resources. Heavy on counterspells, removal, and card draw. Wins late game when opponents are exhausted.

### Midrange
Decks that ramp early, play value creatures and engines in the mid-game, and grind out wins through card advantage. Flexible strategy with a mix of threats and answers. Most "75%" decks fall into this category.

### Stax
Decks that slow down or stop opponents through resource denial and taxing effects. Examples: Winter Orb, Trinisphere, Rule of Law. Aims to break parity (be less affected than opponents) and win slowly while opponents can't interact.

### Voltron
Decks that win by making a single creature (usually the commander) extremely large and lethal, often with equipment or auras. Vulnerable to removal but can kill players quickly with commander damage.

### Aristocrats
Sacrifice-based strategies that generate value from creatures dying. Uses sacrifice outlets, death triggers, and recursion. Named after Cartel Aristocrat from the original Standard deck. Examples: Blood Artist triggers, Grave Pact effects.

### Spellslinger
Decks built around casting lots of instants and sorceries, with creatures or enchantments that trigger whenever you do. Examples: Storm decks, prowess-based strategies, or spell-copy effects like Thousand-Year Storm.

### Tokens
"Go-wide" strategies that create many small creatures rather than a few large ones. Relies on token generators and anthem effects (cards that boost all your creatures). Vulnerable to board wipes.

### Group Hug
Decks that give resources to all players (card draw, mana, creatures) to politic and control the game socially. Often has a secret win condition to capitalize on the shared resources. Highly political playstyle.

### Reanimator
Decks that put expensive creatures into the graveyard early, then cheat them onto the battlefield with reanimation spells. Bypasses mana costs to play threats turns earlier than normal. Examples: Animate Dead, Reanimate, Living Death.

### Tribal
Decks built around a specific creature type, using lords (creatures that boost that type) and tribal synergies. Examples: Elves, Goblins, Dragons, Zombies. Strength varies by tribe and available support cards.

---

## Power Level

### Power Level
A subjective 1-10 scale measuring how quickly and consistently a deck can win. Level 1-3 is preconstructed/casual, 4-6 is upgraded casual, 6-7 is focused/tuned, 7-8 is optimized, 9-10 is cEDH (competitive). Determined by card quality, mana efficiency, speed to win, and interaction density.

### cEDH (Competitive EDH)
Power level 9-10. Decks built to win as fast as possible, typically turns 3-4. Uses fast mana (Mana Crypt, Mox Diamond), efficient tutors, and powerful interaction. Different meta from casual — expects everyone to run optimized lists.

### Casual
Power levels 4-6. Decks built for social, longer games with suboptimal but fun cards. May have themes or restrictions (budget, no infinite combos, tribe-focused). Prioritizes interesting games over maximum efficiency.

### 75%
Philosophy of deck building that aims for power level 6-7 — strong enough to compete but not oppressive. Often deliberately excludes the absolute best cards (fast mana, infinite combos) to match casual pods while remaining competitive.

---

## Deck Construction

### Mana Curve
The distribution of cards by mana cost in your deck. A good curve has more low-cost cards than high-cost, letting you play spells every turn. Visualized as a histogram with CMC on the x-axis and card count on the y-axis.

### Average CMC
The average converted mana cost of all cards in your deck (excluding lands). Lower average means faster deck. Typical range is 2.5-3.5 for most strategies; combo decks often lower, battlecruiser decks higher.

### Color Fixing
Lands and mana sources that can produce multiple colors of mana. Critical in 3+ color decks. Includes dual lands, fetch lands, mana rocks like Arcane Signet, and ramp spells like Farseek.

### Synergy
Cards that work well together, creating more value as a combination than individually. Good deckbuilding maximizes synergy — cards that support your gameplan and commander rather than generic "good stuff."

### Redundancy
Running multiple cards with similar effects to increase consistency. Since you can't run duplicates in Commander, this means functionally similar cards. Example: running multiple 2-CMC ramp spells rather than hoping to draw the one you included.

---

## Analysis Thresholds

### Ramp Count
Target: 8-14 pieces depending on strategy. Faster decks and higher CMC commanders need more. cEDH prioritizes speed (0-1 CMC mana rocks) over raw count.

### Draw Count
Target: 8-12+ sources depending on power level. Includes both one-shot draw and repeatable engines. Higher-power decks need more consistent draw.

### Removal Count
Target: 6-10+ pieces depending on meta. Should include mix of targeted and board wipes, and exile-quality removal for resilient threats. Flexibility (can hit multiple permanent types) is premium.

### Land Count
Target: 33-38 lands. Lower for fast combo or low-curve decks, higher for land-matters strategies or high CMC commanders. Adjust based on mana rock density.

### Interaction Suite
Combined removal + counterspells + protection. High-power decks should be able to interact at instant speed on every opponent's turn. Includes answers to combos, threats, and protection for your own win attempts.

---

## Important Concepts

### Threat Assessment
Multiplayer-specific skill of identifying which opponent is the biggest threat and when. Being perceived as the archenemy draws removal from the entire table. Sometimes politically advantageous to not be the strongest player.

### Table Politics
Social aspect of Commander. Trading favors ("I won't attack you if you don't counter my spell"), forming temporary alliances, managing threat perception. Legitimate game mechanic in multiplayer.

### Rattlesnake Cards
Permanents that passively discourage opponents from targeting you. Examples: Propaganda (taxes attacks), No Mercy (kills attackers), Ghostly Prison. The threat of the effect is often as useful as the effect itself.

### Fast Mana
Mana-positive or neutral rocks that cost 0-1 mana. Examples: Sol Ring, Mana Crypt, Mox Diamond, Chrome Mox. Extremely powerful because they let you curve out turns ahead of opponents. Defining feature of high-power and cEDH decks.

### Mana Efficiency
How much value you get per mana spent. Efficient cards do powerful things for low cost. Example: Sol Ring produces 2 mana for 1 mana invested — incredibly efficient. Lower-power decks often run less efficient but more fun cards.

### Card Quality
The inherent power level of individual cards. Premium removal (Path to Exile) vs. situational removal (Smelt). cEDH runs only the highest-quality cards; casual decks may run lower-quality cards for theme or budget.

### Graveyard Hate
Cards that remove or exile cards from graveyards, disrupting recursion and reanimator strategies. Examples: Rest in Peace, Bojuka Bog, Scavenging Ooze. Critical in metas with heavy graveyard strategies.

### Staples
Cards that are generically powerful and fit in many decks. Examples: Sol Ring, Swords to Plowshares, Rhystic Study, Cyclonic Rift. Every deck in those colors should consider them.

### Salt Score
Community-voted score indicating how much players dislike playing against a card. High-salt cards (like Armageddon, Stasis) are often powerful but unfun. Useful for gauging casual play appropriateness.

---

## Game Phases

### Early Game
Turns 1-3. Focus on playing lands, casting ramp, and setting up mana base. Most commanders are cast during this phase. Limited interaction because players are still developing.

### Mid Game
Turns 4-6. Develop threats, establish engines, interact with opponents' setups. Board state complexity increases. Political maneuvering begins as players assess threats.

### Late Game
Turns 7+. Execute win conditions or grind out value. Board states are complex with multiple engines online. Heavy interaction as players attempt to win and stop others from winning.

### Commander-Specific Timing
Unlike other formats, Commander games often "agree" on pacing. Turn 4 wins are expected in cEDH but rule zero'd out in casual. Understanding expected game length for your pod's power level is critical.
