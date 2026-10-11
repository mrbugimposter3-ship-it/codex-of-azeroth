# ⚔ The Codex of Azeroth

A fan-made encyclopedia where **every one of the Quran's 6,236 verses (ayahs) gets its own unique page** themed after the world of *World of Warcraft* — classes, specs, spells, zones, dungeons, raids, relics and factions.

> **Disclaimer:** Purely a creative crossover for fun. The Quranic text is displayed verbatim via the [AlQuran.cloud API](https://alquran.cloud). The WoW-themed content is fantasy flavor — it is **not** religious commentary or interpretation, and is not affiliated with or endorsed by Blizzard Entertainment.

## ✨ What's inside

- **6,236 unique verse pages** — hash-routed (`#/ayah/1` … `#/ayah/6236`), each with:
  - The real Arabic (Uthmani) text + Saheeh International translation, loaded live from the AlQuran.cloud API
  - A unique themed title (e.g. *“Verdict of the Broken Lantern”*)
  - An assigned **class & spec** (Warrior → Demon Hunter), **signature spell** (all real WoW spells), **zone**, **dungeon or raid**, **relic**, **faction**, and a **rarity tier** (Common → Mythic)
  - A clearly-labeled *fan flavor* line of fantasy lore
- **114 Tomes** — every surah is a codex tome shelved in a WoW location (`#/tomes`, `#/surah/N`)
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

```
index.html      — shell + fonts + footer disclaimer
styles.css      — theme + all animations
app.js          — hash router, pages, search, starfield/runes
data/data.js    — generated codex: 6,236 verses × [surah, ayah, title, class, spec,
                  spell, zone, dungeon/raid, item, faction, flavor, rarity] + 114 tomes
```

Verse content is deterministically derived (a fixed hash of each verse's global number 1–6236), so every verse always keeps the same page.

*For the Horde — and for the Light.* 🌙
