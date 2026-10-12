/* ============================================================
   THE CODEX OF AZEROTH — app.js  (v2: dungeon-crawl flow + maps)
   Hash routes: #/  #/tomes  #/surah/N  #/ayah/N  #/classes
                #/class/Name  #/search  #/map
   Verse array: [s, a, enc, pos, encLen, roomType, title, spell,
                 item, rarity, flavor]
   ============================================================ */
(function () {
"use strict";

const D = window.WQE;
const API = "https://api.alquran.cloud/v1/ayah/{s}:{a}/editions/quran-uthmani,en.sahih";
const app = document.getElementById("app");
const CLASS_ICONS = {
  "Warrior":"⚔️","Paladin":"🛡️","Hunter":"🏹","Rogue":"🗡️","Priest":"✨","Death Knight":"💀",
  "Shaman":"⚡","Mage":"🔮","Warlock":"😈","Monk":"🍵","Druid":"🌙","Demon Hunter":"👁️"
};
const ROOM = D.rooms; // {GT:"Gate", ...}
const ROOM_ICONS = {GT:"🚪",CO:"🕯️",CX:"🔀",TR:"🪤",TL:"📜",GR:"🗿",TV:"💰",RS:"⛲",BS:"💀",SC:"🔮"};
const ROOM_COLORS = {GT:"#e8c76a",CO:"#9aa4b5",CX:"#5ec9ff",TR:"#ff6a5e",TL:"#a34ee0",GR:"#ff9a2e",TV:"#3df06e",RS:"#67d8ff",BS:"#ff4655",SC:"#ffe9a8"};

const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byGlobal = n => D.verses[n - 1];
const verseURL = n => `#/ayah/${n}`;
const globalOf = (s, a) => { const t = D.tomes[s - 1]; return rangeOf(s)[0] + a - 1; };
function rangeOf(surah) {
  let start = 1;
  for (const t of D.tomes) { if (t.n === surah) return [start, start + t.count - 1]; start += t.count; }
  return [1, D.total];
}
/* encounters of a surah -> [[ayahNumbers...], ...] */
const encCache = {};
function encounters(surah) {
  if (encCache[surah]) return encCache[surah];
  const t = D.tomes[surah - 1], encs = [];
  let cur = null;
  for (let i = 0; i < t.count; i++) {
    const v = D.verses[rangeOf(surah)[0] - 1 + i];
    if (v[2] === 1) cur = [];
    cur.push(rangeOf(surah)[0] + i);
    if (i === t.count - 1 || D.verses[rangeOf(surah)[0] + i][2] === 1) { encs.push(cur); cur = null; }
  }
  return encCache[surah] = encs;
}
function chip(k, v, icon) {
  return `<div class="chip-card"><span class="k">${icon ? icon + " " : ""}${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
}

/* ---------- deterministic hash + boss generator ---------- */
function jhash(n, salt) {
  let x = (n * 2654435761 + salt * 40503 + 0x9E3779B9) >>> 0;
  x ^= x >>> 13; x = (x * 1274126177) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}
const BOS_PRE = ["Mor","Zul","Thal","Kael","Naz","Ver","Dro","Gal","Azj","Uld","Ran","Sar","Kel","Mal","Tor","Bar","Ana","Nok","Fel","Vor","Gor","Hy","Vex","Qir"];
const BOS_MID = ["ga","ran","thas","kir","ok","mir","den","us","ath","esh","ul","ion","dra","nis","rok","vek","osh","ida","ur","ax"];
const BOS_TITLES = ["the Unbound","the Gatekeeper","Warden of {zone}","the {elem}touched","Herald of the Deep","Keeper of the Last Seal","the Undying","Scourge of {zone}","the Hollow King","the Silent Coil","Dread Adept of {elem}","the Iron Vigil","the Ashen Tyrant","the Veiled One","the Soulbinder","Tyrant of the {adj} Halls"];
const BOS_TAUNTS = [
  "None shall pass while I draw breath.",
  "My chains are older than your kingdom.",
  "You disturb a sleep of ten thousand years.",
  "Turn back — the dark ahead is not for the living.",
  "I have broken mightier heroes than you.",
  "This hall was built upon my name.",
  "The Sanctum keeps itself. So do I.",
  "Your banners will join the others in the dust.",
  "Come, then. The Codex needs another ending.",
  "Even light bends in this place.",
  "I was guarding this room before your gods had names.",
  "Deep calls to deep. I answer."
];
function bossOf(surah, enc) {
  const seed = surah * 1009 + enc, t = D.tomes[surah - 1];
  const name = BOS_PRE[jhash(seed, 1) % BOS_PRE.length]
    + BOS_MID[jhash(seed, 2) % BOS_MID.length]
    + (jhash(seed, 3) % 3 === 0 ? BOS_MID[jhash(seed, 4) % BOS_MID.length] : "");
  const adj = ["Ashen","Frozen","Verdant","Umbral","Gilded","Stormforged"][jhash(seed, 7) % 6];
  const title = BOS_TITLES[jhash(seed, 5) % BOS_TITLES.length]
    .replace("{zone}", t.tome).replace("{elem}", t.elem).replace("{adj}", adj);
  const taunt = BOS_TAUNTS[jhash(seed, 6) % BOS_TAUNTS.length];
  return { name, title, taunt };
}

/* ---------- delve log (localStorage) + achievements ---------- */
const LOG_KEY = "wqe-visited", ACH_KEY = "wqe-ach";
let visited = new Set();
try { visited = new Set(JSON.parse(localStorage.getItem(LOG_KEY) || "[]")); } catch (e) {}
function saveVisited() { try { localStorage.setItem(LOG_KEY, JSON.stringify([...visited])); } catch (e) {} }
function statsOf(set) {
  let rooms = 0, bosses = 0, sanctums = 0, leg = 0, myth = 0, treasure = 0;
  const floors = new Set(), cleared = new Set();
  for (const n of set) {
    const v = byGlobal(n); if (!v) continue;
    rooms++;
    if (v[5] === "BS") bosses++;
    if (v[5] === "SC") sanctums++;
    if (v[9] === "Legendary") leg++;
    if (v[9] === "Mythic") myth++;
    if (v[8]) treasure++;
    floors.add(v[0]); if (v[5] === "SC") cleared.add(v[0]);
  }
  return { rooms, bosses, sanctums, leg, myth, treasure, floors: floors.size, cleared: cleared.size };
}
const levelOf = rooms => Math.floor(Math.sqrt(rooms) / 1.8) + 1;
const ACHIEVEMENTS = [
  { id: "first-step",  icon: "🥾", name: "First Step",            desc: "Enter your first room of the Grand Dungeon.",        test: s => s.rooms >= 1 },
  { id: "delve-100",   icon: "🔥", name: "Deep Delver",           desc: "Delve 100 rooms.",                                   test: s => s.rooms >= 100 },
  { id: "delve-500",   icon: "🧭", name: "Cartographer",          desc: "Delve 500 rooms.",                                   test: s => s.rooms >= 500 },
  { id: "delve-1000",  icon: "⚜", name: "Legend of the Codex",    desc: "Delve 1,000 rooms.",                                 test: s => s.rooms >= 1000 },
  { id: "halfway",     icon: "🌗", name: "Halfway to the Heart",   desc: "Delve 3,118 rooms — the midpoint of the descent.",   test: s => s.rooms >= 3118 },
  { id: "completionist", icon: "👑", name: "The Grand Delve",      desc: "Delve all 6,236 rooms.",                             test: s => s.rooms >= 6236 },
  { id: "first-blood", icon: "🗡️", name: "First Blood",           desc: "Engage your first Boss Lair.",                       test: s => s.bosses >= 1 },
  { id: "boss-10",     icon: "💀", name: "Boss Breaker",          desc: "Engage 10 Boss Lairs.",                              test: s => s.bosses >= 10 },
  { id: "boss-50",     icon: "⚔", name: "Slayer of Keepers",     desc: "Engage 50 Boss Lairs.",                              test: s => s.bosses >= 50 },
  { id: "boss-100",    icon: "🏆", name: "Century of Skulls",     desc: "Engage 100 Boss Lairs.",                             test: s => s.bosses >= 100 },
  { id: "first-sanctum", icon: "🔮", name: "Sanctum Sealed",       desc: "Complete your first encounter-chain: reach a Sanctum.", test: s => s.sanctums >= 1 },
  { id: "floor-1",     icon: "🗺️", name: "Floor Cleared",         desc: "Fully clear a floor — reach its final Sanctum.",     test: s => s.cleared >= 1 },
  { id: "floor-10",    icon: "🪜", name: "Stair Descender",       desc: "Fully clear 10 floors.",                             test: s => s.cleared >= 10 },
  { id: "floor-all",   icon: "🌌", name: "Master of the Deep",    desc: "Fully clear all 114 floors.",                        test: s => s.cleared >= 114 },
  { id: "legendary",   icon: "🟠", name: "Legendary Loot",        desc: "Stand in a room of Legendary rarity.",               test: s => s.leg >= 1 },
  { id: "mythic",      icon: "🔴", name: "Mythic Moment",         desc: "Stand in a room of Mythic rarity.",                  test: s => s.myth >= 1 },
  { id: "hoard-25",    icon: "💰", name: "Hoarder",               desc: "Claim loot in 25 vaults, lairs or sanctums.",        test: s => s.treasure >= 25 },
  { id: "scout-20",    icon: "🔭", name: "Scout of the Deep",     desc: "Set foot on 20 different floors.",                   test: s => s.floors >= 20 },
];
function toast(a) {
  const el = document.createElement("div");
  el.className = "ach-toast";
  el.innerHTML = `<span class="ach-toast-icon">${a.icon}</span><div><div class="ach-toast-title">Achievement unlocked!</div><div class="ach-toast-name">${esc(a.name)}</div><div class="ach-toast-desc">${esc(a.desc)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 60);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 600); }, 5200);
}
function visit(n) {
  if (!visited.has(n)) {
    visited.add(n); saveVisited();
    const st = statsOf(visited);
    let unlocked;
    try { unlocked = new Set(JSON.parse(localStorage.getItem(ACH_KEY) || "[]")); } catch (e) { unlocked = new Set(); }
    const newly = ACHIEVEMENTS.filter(a => !unlocked.has(a.id) && a.test(st));
    if (newly.length) {
      newly.forEach(a => unlocked.add(a.id));
      try { localStorage.setItem(ACH_KEY, JSON.stringify([...unlocked])); } catch (e) {}
      newly.slice(0, 3).forEach((a, i) => setTimeout(() => toast(a), 400 + i * 900));
    }
  }
}

/* ---------- starfield + runes ---------- */
(function starfield() {
  const cv = document.getElementById("starfield"), ctx = cv.getContext("2d");
  let stars = [], w, h;
  function resize() {
    w = cv.width = innerWidth; h = cv.height = innerHeight;
    stars = Array.from({length: Math.min(220, w * h / 9000)}, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.4 + .3, p: Math.random() * Math.PI * 2, s: .5 + Math.random()
    }));
  }
  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    for (const st of stars) {
      const a = .35 + .55 * Math.abs(Math.sin(t / 1000 * st.s + st.p));
      ctx.globalAlpha = a; ctx.fillStyle = "#e8c76a";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
      st.y += .03; if (st.y > h) st.y = 0;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  addEventListener("resize", resize); resize(); requestAnimationFrame(tick);
})();
(function runes() {
  const box = document.querySelector(".runes");
  const glyphs = ["ᚠ","ᚱ","ᛟ","ᛉ","✦","⟡","ᚹ","⚔"];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = (Math.random() * 100) + "vw";
    s.style.animationDuration = (14 + Math.random() * 18) + "s";
    s.style.animationDelay = (Math.random() * 20) + "s";
    s.style.fontSize = (14 + Math.random() * 26) + "px";
    box.appendChild(s);
  }
})();

/* ============================================================
   2D DUNGEON MAP RENDERER (SVG)
   ============================================================ */
const RW = 78, RH = 62, GAP = 26, ROW_H = 108;   // room box + spacing

/* Draw one encounter as a row of rooms. dirs=+1 →, -1 ← (serpentine). */
function roomRowSVG(ayahs, curGlobal, y, x0, dir, opts = {}) {
  const rooms = ayahs.map(n => byGlobal(n));
  const n = rooms.length;
  const cell = RW + GAP;
  let out = "";
  // corridor line beneath rooms
  const lineY = y + RH / 2;
  if (dir > 0) out += `<line x1="${x0 + RW}" y1="${lineY}" x2="${x0 + (n - 1) * cell + RW}" y2="${lineY}" class="map-corridor"/>`;
  else out += `<line x1="${x0 - RW}" y1="${lineY}" x2="${x0 - (n - 1) * cell + RW}" y2="${lineY}" class="map-corridor"/>`;
  rooms.forEach((v, i) => {
    const g = ayahs[i];
    const cx = dir > 0 ? x0 + i * cell : x0 - i * cell;
    const state = curGlobal == null ? (opts.explored ? "seen" : "fog") : (g < curGlobal ? "seen" : g === curGlobal ? "cur" : "fog");
    const rt = v[5];
    const boss = rt === "BS" ? bossOf(v[0], v[2]) : null;
    out += `<a href="${verseURL(g)}" class="map-room" data-state="${state}">
      <title>${esc(boss ? boss.name + " — " + boss.title : ROOM[rt] + " — room " + g)}</title>
      <rect x="${cx - RW/2}" y="${y - RH/2}" width="${RW}" height="${RH}" rx="12"
        style="--rc:${ROOM_COLORS[rt]}" class="room-box ${state === "cur" ? "room-cur" : ""}"/>
      <text x="${cx}" y="${y - 10}" text-anchor="middle" class="room-icon">${ROOM_ICONS[rt]}</text>
      <text x="${cx}" y="${y + 12}" text-anchor="middle" class="room-name">${esc(ROOM[rt])}</text>
      <text x="${cx}" y="${y + 26}" text-anchor="middle" class="room-verse">${v[0]}:${v[1]}</text>
      ${boss ? `<text x="${cx}" y="${y - RH/2 - 6}" text-anchor="middle" class="room-bossname">${esc(boss.name)}</text>` : ""}
    </a>`;
  });
  return out;
}

/* Full floor plan of a surah: serpentine rows of encounters. */
function floorPlanSVG(surah, curGlobal) {
  const encs = encounters(surah);
  const maxLen = Math.max(...encs.map(e => e.length));
  const width = maxLen * (RW + GAP) + 80;
  const height = encs.length * ROW_H + 70;
  let out = `<svg viewBox="0 0 ${width} ${height}" class="dmap" role="img" aria-label="Dungeon floor plan">`;
  // floor entry arrow
  out += `<text x="${width/2}" y="26" text-anchor="middle" class="map-title">▼ DESCEND FROM THE SURFACE — ${esc(D.tomes[surah-1].dun.replace(/^[DR]:/,"")).toUpperCase()} ▼</text>`;
  encs.forEach((enc, r) => {
    const y = 62 + r * ROW_H + RH/2;
    const dir = r % 2 === 0 ? 1 : -1;
    const x0 = dir > 0 ? 52 + RW/2 : width - 52 - RW/2;
    out += roomRowSVG(enc, curGlobal, y, x0, dir);
    // connector to next row
    if (r < encs.length - 1) {
      out += `<line x1="${x0}" y1="${y + RH/2}" x2="${x0}" y2="${y + ROW_H - RH/2}" class="map-stairs"/>`;
      out += `<text x="${x0}" y="${y + ROW_H/2 + 4}" text-anchor="middle" class="map-stairs-label">⇣</text>`;
    }
  });
  out += `<text x="${width/2}" y="${height - 12}" text-anchor="middle" class="map-title">▲ FLOOR CLEARED — RETURN TO THE SURFACE ▲</text></svg>`;
  return out;
}

/* Single encounter strip for the ayah page (follow-along map). */
function encounterStripSVG(surah, encIdx, curGlobal) {
  const encs = encounters(surah);
  const enc = encs[encIdx - 1];
  const width = enc.length * (RW + GAP) + 120;
  let out = `<svg viewBox="0 0 ${width} ${RH + 70}" class="dmap dmap-strip" role="img" aria-label="Current dungeon corridor">`;
  out += `<text x="24" y="${RH/2 - 4}" class="map-side">IN ⤍</text>`;
  out += roomRowSVG(enc, curGlobal, RH/2 + 16, 70 + RW/2, 1);
  out += `<text x="${width - 24}" y="${RH/2 - 4}" text-anchor="end" class="map-side">⤍ OUT</text>`;
  out += `</svg>`;
  return out;
}

/* ============================================================
   ROUTER + PAGES
   ============================================================ */
const routes = [
  [/^#\/$/, home], [/^#\/tomes$/, tomes],
  [/^#\/surah\/(\d+)$/, surahPage], [/^#\/ayah\/(\d+)$/, ayahPage],
  [/^#\/classes$/, classesPage], [/^#\/class\/(.+)$/, classPage],
  [/^#\/search$/, searchPage], [/^#\/map$/, mapPage],
  [/^#\/achievements$/, achievementsPage],
];
function router() {
  const hash = location.hash || "#/";
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) { fn(m); break; }
  }
  window.scrollTo({ top: 0 });
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.remove("active"));
  app.classList.remove("entering"); void app.offsetWidth; app.classList.add("entering");
}
addEventListener("hashchange", router);

function home() {
  app.innerHTML = `
    <div class="ayah-head">
      <span class="ayah-eyebrow">⚔ A Fan-Made Crossover Codex ⚔</span>
      <h1 class="hero-title">The Codex of Azeroth</h1>
      <p class="sub">Every one of the Quran's <strong>6,236 verses</strong> is a room in the greatest dungeon ever charted.
      Follow the map verse by verse — gates open, corridors deepen, guardians fall, and every tome ends in a Sanctum.</p>
    </div>
    <div class="stats stagger">
      <div class="stat"><span class="big">6,236</span><span class="lbl">Rooms Charted</span></div>
      <div class="stat"><span class="big">114</span><span class="lbl">Dungeon Floors</span></div>
      <div class="stat"><span class="big">12</span><span class="lbl">Classes</span></div>
      <div class="stat"><span class="big">${D.tomes.filter(t=>t.dun[0]==="R").length}</span><span class="lbl">Raid Floors</span></div>
      <div class="stat"><span class="big">${D.verses.filter(v=>v[9]==="Legendary"||v[9]==="Mythic").length}</span><span class="lbl">Legendaries</span></div>
    </div>
    <div class="divider">✦ Your Position in the Delve ✦</div>
    <div id="home-pos"></div>
    <div class="divider">✦ Featured Codex Entries ✦</div>
    <div class="grid stagger">
      ${[97, 255, 1543, 6236, 110, 2861].map(n => {
        const v = byGlobal(n), t = D.tomes[v[0] - 1];
        return `<a class="card tome-card" href="${verseURL(n)}">
          <span class="num">VERSE ${n} · ${esc(ROOM[v[5]]).toUpperCase()} ${ROOM_ICONS[v[5]]}</span>
          <div class="name">${esc(v[6])}</div>
          <div class="meta">${esc(t.en)} ${v[0]}:${v[1]} · ${esc(t.cls)} · ${esc(v[7])}</div>
          <span class="rarity" style="--rc:var(--r-${v[9].toLowerCase()})">${v[9]}</span>
        </a>`;
      }).join("")}
    </div>
    <div class="divider">✦ Begin Your Journey ✦</div>
    <div class="search-row">
      <input id="jump" type="number" min="1" max="6236" placeholder="Jump to room number (1 – 6236)…">
      <button class="btn-rune" id="jump-go">Descend ⚔</button>
    </div>
    <p class="sub" style="margin-top:26px"><kbd>←</kbd> <kbd>→</kbd> walk between rooms · <kbd>R</kbd> for a random room · <a href="#/map">Open the Grand Dungeon Map →</a></p>`;
  document.getElementById("jump-go").onclick = () => {
    const v = Math.min(6236, Math.max(1, +document.getElementById("jump").value || 1));
    location.hash = verseURL(v);
  };
  document.getElementById("jump").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("jump-go").click(); });
  renderHomePosition();
}
function renderHomePosition() {
  const last = +sessionStorage.getItem("wqe-last") || 0;
  const box = document.getElementById("home-pos");
  if (!last || !box) { box.innerHTML = `<p class="sub">No delve in progress — open any room to plant your banner.</p>`; return; }
  const v = byGlobal(last), t = D.tomes[v[0] - 1];
  const encs = encounters(v[0]);
  box.innerHTML = `
    <div class="card">
      <p class="sub" style="margin-bottom:8px">Room <strong>${last}</strong> of 6,236 · Tome <strong>${t.n} — ${esc(t.en)}</strong> · Encounter ${v[2]}/${encs.length} · Room ${v[3]} of ${v[4]} · Delver level <strong>${levelOf(visited.size)}</strong> (${visited.size} rooms logged)</p>
      ${encounterStripSVG(v[0], v[2], last)}
      <div class="pager" style="justify-content:center"><a href="${verseURL(last)}">⚔ Resume the delve — Verse ${last}</a></div>
    </div>`;
}

function tomes() {
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Archives</span><h1 class="hero-title">114 Dungeon Floors</h1>
      <p class="sub">Each surah is a floor of the Grand Dungeon, delved in order — every tome ends in a Sanctum, and the stair leads ever down.</p></div>
    <div class="grid stagger">
      ${D.tomes.map(t => {
        const [start] = rangeOf(t.n);
        return `<a class="card tome-card" href="#/surah/${t.n}">
          <span class="num">FLOOR ${t.n} · ${t.count} ROOMS · ${t.dun[0]==="R"?"RAID":"DUNGEON"} · ${t.rev.toUpperCase()}</span>
          <div class="name">${esc(t.en)}</div>
          <div class="meta">“${esc(t.tr)}” — ${esc(t.tome)} · delve: ${esc(t.dun.slice(2))} · party: ${esc(t.cls)} ${CLASS_ICONS[t.cls]}</div>
          <span class="ar">${esc(t.ar)}</span>
        </a>`;
      }).join("")}
    </div>`;
}

function surahPage(m) {
  const n = Math.min(114, Math.max(1, +m[1]));
  const t = D.tomes[n - 1];
  const [start, end] = rangeOf(n);
  const last = +sessionStorage.getItem("wqe-last") || 0;
  const cur = (last >= start && last <= end) ? last : null;
  const rows = D.verses.slice(start - 1, end);
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">Floor ${n} of 114 · ${t.dun[0]==="R" ? "Raid Floor 🏰" : "Dungeon Floor 🗝️"}</span>
      <h1 class="hero-title">${esc(t.en)} — “${esc(t.tr)}”</h1>
      <p class="sub">${esc(t.ar)} · ${t.count} rooms · ${esc(t.rev)} revelation<br>
      Delve: <strong>${esc(t.dun.slice(2))}</strong> ${t.dun[0]==="R"?"🏰 (Raid floor)":"🗝️ (Dungeon)"} · Location: <strong>${esc(t.tome)}</strong> · Element: <strong>${esc(t.elem)}</strong><br>
      Party lead: <strong>${CLASS_ICONS[t.cls]} ${esc(t.cls)} (${esc(t.spec)})</strong> sworn to <strong>${esc(t.fac)}</strong></p></div>
    <div class="card">${floorPlanSVG(n, cur)}</div>
    <div class="divider">✦ Room Index ✦</div>
    <div class="results stagger">
      ${rows.map((v, idx) => `
        <a class="res" href="${verseURL(start + idx)}">
          <span class="n">${n}:${v[1]}</span>
          <span class="t">${ROOM_ICONS[v[5]]} ${esc(v[6])}</span>
          <span class="m">${esc(ROOM[v[5]])} · ${esc(t.cls)} · ${esc(v[9])}</span>
        </a>`).join("")}
    </div>`;
}

function ayahPage(m) {
  const n = Math.min(D.total, Math.max(1, +m[1]));
  sessionStorage.setItem("wqe-last", n);
  const v = byGlobal(n);
  const [s, a, enc, pos, encLen, rt, tit, spell, item, rar, flavor] = v;
  const t = D.tomes[s - 1];
  const encs = encounters(s);
  const isRaid = t.dun[0] === "R";
  const prev = n > 1 ? byGlobal(n - 1) : null;
  const next = n < D.total ? byGlobal(n + 1) : null;
  const pct = (n / D.total * 100).toFixed(1);
  const boss = rt === "BS" ? bossOf(s, enc) : null;
  const bossHTML = boss ? `
      <div class="boss-card">
        <div class="boss-head">
          <span class="boss-skull">💀</span>
          <div class="boss-id"><div class="boss-name">${esc(boss.name)}</div><div class="boss-title">${esc(boss.title)}</div></div>
          <span class="boss-elem">🌡️ ${esc(t.elem)}</span>
        </div>
        <div class="boss-hp"><div class="boss-hp-fill"></div></div>
        <span class="boss-hp-label">ENGAGED — you stand in its lair</span>
        <p class="boss-taunt">“${esc(boss.taunt)}”</p>
      </div>` : "";
  app.innerHTML = `
    <div class="card ayah-card" style="--rc:var(--r-${rar.toLowerCase()})">
      <div class="ayah-head">
        <span class="ayah-eyebrow">Room ${n} of 6,236 · Floor ${s} — ${esc(t.en)} ${s}:${a} · Encounter ${enc}/${encs.length}, Room ${pos}/${encLen}</span>
        <h1 class="ayah-title">${ROOM_ICONS[rt]} ${esc(tit)}</h1>
        <div style="margin-top:12px"><span class="rarity">${rar} · ${esc(ROOM[rt])}</span></div>
        <div class="depth-bar"><div class="depth-fill" style="width:${pct}%"></div></div>
        <span class="ref">delve depth ${pct}% of the Grand Dungeon</span>
      </div>

      <div class="map-follow sticky">
        <div class="map-follow-label">🗺️ Follow the map — you are in the glowing room. Click any room to walk there.</div>
        ${encounterStripSVG(s, enc, n)}
        <div class="map-follow-nav">
          ${prev ? `<a href="${verseURL(n - 1)}">← came from: ${ROOM_ICONS[prev[5]]} ${esc(ROOM[prev[5]])}</a>` : `<span></span>`}
          ${next ? `<a href="${verseURL(n + 1)}">next: ${ROOM_ICONS[next[5]]} ${esc(ROOM[next[5]])} →</a>` : `<span></span>`}
        </div>
      </div>

      <div class="arabic" id="ayah-arabic">⏳ Summoning the verse from the archives…</div>
      <p class="translation shimmer" id="ayah-translation"></p>
      <span class="ref">— Al-Qur'an ${s}:${a} · loaded live from alquran.cloud —</span>

      <div class="divider">✦ Codex Classification ✦</div>
      <div class="codex-grid stagger">
        ${chip("Class & Spec", `${t.cls} — ${t.spec}`, CLASS_ICONS[t.cls])}
        ${chip("Spell Cast Here", spell, "🔮")}
        ${chip("Zone", t.tome, "🗺️")}
        ${chip(isRaid ? "Raid Floor" : "Dungeon Floor", t.dun.slice(2), isRaid ? "🏰" : "🗝️")}
        ${item ? chip("Loot Gained", item, "🗡️") : chip("Element of the Floor", t.elem, "🌡️")}
        ${chip("Sworn Faction", t.fac, "🚩")}
      </div>
      ${bossHTML}
      <div class="flavor"><span class="k">Fan Flavor · Not Scripture</span>${esc(flavor)}</div>

      <div class="pager">
        ${n > 1 ? `<a href="${verseURL(n - 1)}">← ${prev ? ROOM_ICONS[prev[5]] + " " + esc(ROOM[prev[5]]) : ""}</a>` : "<span></span>"}
        <a href="#/surah/${s}">🗺️ Floor Map</a>
        <a href="#/map">Grand Dungeon</a>
        ${n < D.total ? `<a href="${verseURL(n + 1)}">${next ? ROOM_ICONS[next[5]] + " " + esc(ROOM[next[5]]) : ""} →</a>` : "<span></span>"}
      </div>
    </div>`;
  window.__ayahN = n;
  visit(n);
  fetch(API.replace("{s}", s).replace("{a}", a))
    .then(r => r.json())
    .then(j => {
      const [ar, en] = j.data;
      const arEl = document.getElementById("ayah-arabic"), enEl = document.getElementById("ayah-translation");
      arEl.textContent = ar.text; arEl.classList.add("entering");
      enEl.classList.remove("shimmer"); enEl.textContent = `“${en.text}”`;
    })
    .catch(() => {
      document.getElementById("ayah-arabic").textContent = `Al-Qur'an ${s}:${a}`;
      const enEl = document.getElementById("ayah-translation");
      enEl.classList.remove("shimmer");
      enEl.textContent = "The archives could not be reached — check your connection to view the verse text.";
    });
}

function classesPage() {
  const counts = {};
  D.tomes.forEach(t => counts[t.cls] = (counts[t.cls] || 0) + t.count);
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Roster</span><h1 class="hero-title">Twelve Classes</h1>
      <p class="sub">Every floor of the dungeon is delved under the banner of one class — its verses are that class's watch.</p></div>
    <div class="grid stagger">
      ${D.classes.map(c => `<a class="card tome-card" href="#/class/${encodeURIComponent(c.n)}">
        <span style="font-size:2rem">${CLASS_ICONS[c.n]}</span>
        <div class="name">${esc(c.n)}</div>
        <div class="meta">${c.specs.map(esc).join(" · ")}</div>
        <div style="margin-top:10px"><span class="count-bubble">${counts[c.n] || 0}</span> <span class="meta">verses</span></div>
      </a>`).join("")}
    </div>`;
}

function classPage(m) {
  const name = decodeURIComponent(m[1]).replace(/-/g, " ").toLowerCase();
  const c = D.classes.find(x => x.n.toLowerCase() === name);
  if (!c) { location.hash = "#/classes"; return; }
  const floors = D.tomes.filter(t => t.cls === c.n);
  const list = [];
  floors.forEach(t => {
    const [start, end] = rangeOf(t.n);
    for (let i = start; i <= end; i++) list.push([i, D.verses[i - 1], t]);
  });
  app.innerHTML = `
    <div class="card class-hero">
      <span class="crest">${CLASS_ICONS[c.n]}</span>
      <h1 class="hero-title">${esc(c.n)}s of the Codex</h1>
      <p class="sub">${list.length} verses on ${floors.length} floors, from ${esc(floors.length ? floors[0].en : "")} to ${esc(floors.length ? floors[floors.length-1].en : "")}</p>
      <div>${c.specs.map(s => `<span class="spec-tag">${esc(s)}</span>`).join("")}</div>
    </div>
    <div class="results stagger">
      ${list.slice(0, 80).map(([n, v, t]) => `
        <a class="res" href="${verseURL(n)}">
          <span class="n">${v[0]}:${v[1]}</span>
          <span class="t">${ROOM_ICONS[v[5]]} ${esc(v[6])}</span>
          <span class="m">${esc(v[7])} · ${esc(v[9])}</span>
        </a>`).join("")}
    </div>
    ${list.length > 80 ? `<p class="sub">…and ${list.length - 80} more — use Search to find them all.</p>` : ""}`;
}

function searchPage() {
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Librarium</span><h1 class="hero-title">Search the Codex</h1>
      <p class="sub">Search all 6,236 rooms by verse number, title, spell, relic, room type, class, zone, dungeon or raid.</p></div>
    <div class="search-row"><input id="q" type="search" placeholder="e.g. Frostmourne, Molten Core, Suramar, Fireball, Warrior, Sanctum, 6236…"></div>
    <p class="meta" id="q-count"></p>
    <div class="results" id="q-results"></div>`;
  const qEl = document.getElementById("q"), resEl = document.getElementById("q-results"), cnt = document.getElementById("q-count");
  const index = D.verses.map((v, i) => {
    const t = D.tomes[v[0] - 1];
    return { n: i + 1, v, hay: `${v[0]}:${v[1]} ${v[6]} ${v[7]} ${v[8]} ${v[9]} ${ROOM[v[5]]} ${t.cls} ${t.spec} ${t.tome} ${t.dun} ${t.fac} ${t.elem}`.toLowerCase() };
  });
  function run() {
    const q = qEl.value.trim().toLowerCase();
    if (!q) { resEl.innerHTML = ""; cnt.textContent = ""; return; }
    const num = parseInt(q, 10);
    const hits = index.filter(e => (num && e.v[0] === num) || `${e.v[0]}:${e.v[1]}` === q || e.hay.includes(q));
    cnt.textContent = `${hits.length} rooms found`;
    resEl.innerHTML = hits.slice(0, 100).map(e => `
      <a class="res" href="${verseURL(e.n)}">
        <span class="n">${e.v[0]}:${e.v[1]}</span>
        <span class="t">${ROOM_ICONS[e.v[5]]} ${esc(e.v[6])}</span>
        <span class="m">${esc(e.v[7])} · ${esc(ROOM[e.v[5]])} · ${esc(e.v[9])}</span>
      </a>`).join("") + (hits.length > 100 ? `<p class="meta">…showing first 100 of ${hits.length}</p>` : "");
  }
  qEl.addEventListener("input", run);
  if (location.hash.includes("?q=")) qEl.value = decodeURIComponent(location.hash.split("?q=")[1] || "");
  run(); qEl.focus();
}

/* ---------- Grand Dungeon Map ---------- */
function mapPage() {
  const last = +sessionStorage.getItem("wqe-last") || 1;
  const lv = byGlobal(last), lt = D.tomes[lv[0] - 1];
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Grand Dungeon</span><h1 class="hero-title">Map of the Delve</h1>
      <p class="sub">114 floors, 6,236 rooms, one descent. Your banner stands on <strong>Floor ${lv[0]} — ${esc(lt.en)}</strong> (${esc(lt.dun.slice(2))}).</p></div>
    <div class="depth-bar big"><div class="depth-fill" style="width:${(last / D.total * 100).toFixed(2)}%"></div></div>
    <p class="sub">${last} / 6,236 rooms delved (${(last / D.total * 100).toFixed(1)}%)</p>
    <div class="map-legend">
      ${Object.keys(ROOM).map(rt => `<span class="legend-dot" style="--rc:${ROOM_COLORS[rt]}">${ROOM_ICONS[rt]} ${esc(ROOM[rt])}</span>`).join("")}
    </div>
    <div class="grandmap">
      ${D.tomes.map(t => {
        const encs = encounters(t.n);
        const [start] = rangeOf(t.n);
        const here = t.n === lv[0];
        return `<div class="floor-row ${here ? "floor-here" : ""}">
          <div class="floor-head">
            <span class="floor-num">${here ? "🚩" : ""} FLOOR ${t.n}</span>
            <a href="#/surah/${t.n}" class="floor-name">${esc(t.en)} — “${esc(t.tr)}”</a>
            <span class="floor-dun">${t.dun[0]==="R"?"🏰":"🗝️"} ${esc(t.dun.slice(2))}</span>
          </div>
          <svg viewBox="0 0 ${encs.length * 34 + 20} 30" class="enc-dots" preserveAspectRatio="xMinYMid">
            ${encs.map((enc, i) => `<a href="${verseURL(start)}">
              <rect x="${i * 34}" y="4" width="24" height="22" rx="6" class="enc-dot ${enc.length >= 7 ? "enc-big" : ""}"/>
              <text x="${i * 34 + 12}" y="19" text-anchor="middle" class="enc-dot-label">${enc.length}</text>
            </a>`).join("")}
          </svg>
        </div>`;
      }).join("")}
    </div>`;
}

/* ---------- Achievements ---------- */
function achievementsPage() {
  const st = statsOf(visited);
  let unlocked;
  try { unlocked = new Set(JSON.parse(localStorage.getItem(ACH_KEY) || "[]")); } catch (e) { unlocked = new Set(); }
  const lvl = levelOf(st.rooms);
  const done = ACHIEVEMENTS.filter(a => unlocked.has(a.id) || a.test(st)).length;
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">Feats of the Delve</span><h1 class="hero-title">Achievements</h1>
      <p class="sub">${done} of ${ACHIEVEMENTS.length} unlocked · your log remembers every room you have entered.</p></div>
    <div class="card char-sheet">
      <div class="char-row">
        <span class="char-level">Lv ${lvl}</span>
        <div><div class="char-name">Delver of the Codex</div>
        <div class="char-sub">${st.rooms} / 6,236 rooms · ${st.bosses} bosses engaged · ${st.cleared} floors cleared · ${st.treasure} treasures claimed</div></div>
      </div>
      <div class="depth-bar big"><div class="depth-fill" style="width:${(st.rooms / D.total * 100).toFixed(2)}%"></div></div>
    </div>
    <div class="grid stagger">
      ${ACHIEVEMENTS.map(a => {
        const got = unlocked.has(a.id) || a.test(st);
        return `<div class="card ach-card ${got ? "ach-got" : "ach-locked"}">
          <span class="ach-icon">${a.icon}</span>
          <div class="ach-name">${esc(a.name)}</div>
          <div class="ach-desc">${esc(a.desc)}</div>
          <span class="ach-state">${got ? "✔ Unlocked" : "🔒 Locked"}</span>
        </div>`;
      }).join("")}
    </div>
    ${st.treasure ? `<div class="divider">✦ The Loot Bag ✦</div>
    <div class="loot-bag">
      ${[...new Set([...visited].map(n => (byGlobal(n)[8] || ""))).filter(Boolean)].slice(0, 18).map(i => `<span class="loot-tag">🗡️ ${esc(i)}</span>`).join("")}
      ${(() => { const total = [...new Set([...visited].map(n => (byGlobal(n)[8] || ""))).filter(Boolean)].length; return total > 18 ? `<span class="loot-tag more">…and ${total - 18} more</span>` : ""; })()}
    </div>` : ""}
    <p class="sub" style="margin-top:22px">Delve rooms to unlock more — progress is stored in your browser. <a href="#/map">To the map →</a></p>`;
}

/* ---------- random + keyboard ---------- */
document.getElementById("random-btn").onclick = () => location.hash = verseURL(1 + Math.floor(Math.random() * D.total));
addEventListener("keydown", e => {
  if (e.target.matches("input, textarea")) return;
  const n = window.__ayahN;
  if (n && e.key === "ArrowRight") location.hash = verseURL(Math.min(D.total, n + 1));
  if (n && e.key === "ArrowLeft") location.hash = verseURL(Math.max(1, n - 1));
  if (e.key === "r" || e.key === "R") location.hash = verseURL(1 + Math.floor(Math.random() * D.total));
});

router();
})();
