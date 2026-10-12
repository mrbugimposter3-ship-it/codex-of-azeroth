# ⚔ The Codex of Azeroth

A fan-made encyclopedia where **every one of the Quran's 6,236 verses (ayahs) gets its own unique page** themed after the world of *World of Warcraft* — classes, specs, spells, zones, dungeons, raids, relics and factions.

> **Disclaimer:** Purely a creative crossover for fun. The Quranic text is displayed verbatim via the [AlQuran.cloud API](https://alquran.cloud). The WoW-themed content is fantasy flavor — it is **not** religious commentary or interpretation, and is not affiliated with or endorsed by Blizzard Entertainment.

## ✨ What's inside

- **6,236 unique verse pages** — hash-routed (`#/ayah/1` … `#/ayah/6236`), each with:
  - The real Arabic (Uthmani) text + Saheeh International translation, loaded live from the AlQuran.cloud API
  - A unique themed title (e.g. *“Verdict of the Broken Lantern”*)
  - An assigned **class & spec** (Warrior → Demon Hunter), **spell cast in that room**, **zone**, **dungeon or raid floor**, **loot** (treasure/boss/sanctum rooms), **faction**, and a **rarity tier** tied to room type
  - A clearly-labeled *fan flavor* line of fantasy lore

## 🗺️ The dungeon-crawl flow
The codex is laid out as one continuous dungeon run, so consecutive verses read as a journey:

- Each **surah = a dungeon floor** (114 floors), delved in order
- Each floor is split into **encounters of 5–9 rooms**; every verse = one room with a type that flows from the last:
  `Gate → Corridor → (Crossroads / Trap / Trial / Guardian / Treasure Vault / Fountain Rest) → Boss Lair → Sanctum`
- Flavor text is written as a **continuing story** — each room says what happened there and what lies ahead (*“Ahead: the Guardian's Hall”*), spells match rooms (travel spells in corridors, wards in traps, big damage in boss lairs), and loot only drops where loot makes sense
- Rarity scales with depth: Gates and Corridors are Common; Boss Lairs drop Epic/Legendary; Sanctums hold Legendary/Mythic
- **💀 Generated Boss encounters** — every Boss Lair room has a unique deterministic boss (name, title, taunt, elemental affinity) with an animated health bar, and bosses are named right on the maps (hover for details)
- **🏆 Delve log, level & achievements** — rooms you enter are remembered in your browser: a Delver level, 18 unlockable achievements (First Step, Century of Skulls, Master of the Deep, Mythic Moment…) with animated toast popups, a **Loot Bag** of every relic you've claimed, and a Feats page (`#/achievements`)
- **📌 Sticky follow-along minimap** — the corridor strip pins to the top of the page while you scroll a verse
- **🗺️ 2D dungeon maps you can follow along**:
  - Every verse page has a **follow-along corridor strip** — the current encounter's rooms drawn as an SVG dungeon corridor, your position pulsing gold, visited rooms lit, unexplored rooms in fog; click any room to walk there, plus “came from / next room” links
  - Every floor page (`#/surah/N`) has a full **serpentine floor plan** with descent stairs between encounter rows
  - `#/map` — the **Grand Dungeon Map**: all 114 floors, your banner, depth bar and room-type legend
- **Class codex** — browse verses by class (`#/classes`, `#/class/Mage`)
- **Librarium search** — search everything: verse numbers, titles, spells, zones, raids… (`#/search`)
- **Keyboard navigation** — `←` / `→` prev/next verse, `R` for a random verse

## 🎇 Animations

Twinkling starfield canvas, rising arcane runes, rotating portal rings, glowing Arabic script, staggered card entrances, rarity pulsing auras, shimmer loaders, and hover lifts throughout.

## 🚀 Run locally

No build step, no dependencies — plain static files:

```bash
# any static server works, e.g.
python -m http.server 8080
# or just open index.html directly
```

## 🧭 Structure

Verse data arrays: `[surah, ayah, encounter, roomPos, encounterLen, roomType, title, spell, loot, rarity, flavor]`. Room types: `GT` Gate, `CO` Corridor, `CX` Crossroads, `TR` Trap Run, `TL` Trial, `GR` Guardian, `TV` Treasure Vault, `RS` Fountain Rest, `BS` Boss Lair, `SC` Sanctum.

```
index.html      — shell + fonts + nav + footer disclaimer
styles.css      — theme + all animations
app.js          — hash router, pages, search, starfield/runes
data/data.js    — generated codex: 6,236 verse rooms + 114 floor descriptors
                  (verse = [surah, ayah, encounter, roomPos, encLen, roomType,
                  title, spell, loot, rarity, flavor]; floor = dungeon, class,
                  spec, faction, element, tome location)
```

Verse content is deterministically derived (a fixed hash of each verse's global number 1–6236), so every verse always keeps the same page.

*For the Horde — and for the Light.* 🌙
