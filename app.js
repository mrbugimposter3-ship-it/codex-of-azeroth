/* ============================================================
   THE CODEX OF AZEROTH — app.js
   Hash router: #/  #/tomes  #/surah/N  #/ayah/N  #/classes
                 #/class/Name  #/search
   ============================================================ */
(function () {
"use strict";

const D = window.WQE;               // generated codex data
const API = "https://api.alquran.cloud/v1/ayah/{s}:{a}/editions/quran-uthmani,en.sahih";
const app = document.getElementById("app");
const CLASS_ICONS = {
  "Warrior":"⚔️","Paladin":"🛡️","Hunter":"🏹","Rogue":"🗡️","Priest":"✨","Death Knight":"💀",
  "Shaman":"⚡","Mage":"🔮","Warlock":"😈","Monk":"🍵","Druid":"🌙","Demon Hunter":"👁️"
};

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const byGlobal = n => D.verses[n - 1];               // verse n (1..6236)
const rangeOf = surah => {                            // global start/end for a surah
  let start = 1;
  for (const t of D.tomes) { if (t.n === surah) return [start, start + t.count - 1]; start += t.count; }
  return [1, D.total];
};
const verseURL = n => `#/ayah/${n}`;
function chip(k, v, icon) {
  return `<div class="chip-card"><span class="k">${icon ? icon + " " : ""}${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
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

/* ---------- router ---------- */
const routes = [
  [/^#\/$/, home], [/^#\/tomes$/, tomes],
  [/^#\/surah\/(\d+)$/, surahPage], [/^#\/ayah\/(\d+)$/, ayahPage],
  [/^#\/classes$/, classesPage], [/^#\/class\/(.+)$/, classPage],
  [/^#\/search$/, searchPage],
];
function router() {
  const hash = location.hash || "#/";
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) { fn(m); break; }
  }
  window.scrollTo({ top: 0 });
  document.querySelectorAll("[data-nav]").forEach(a =>
    a.classList.toggle("active", a.getAttribute("href") === ("#/" + (hash.split("/")[1] || "")) || (hash === "#/" && a.dataset.nav === "home")));
  app.classList.remove("entering"); void app.offsetWidth; app.classList.add("entering");
}
addEventListener("hashchange", router);

/* ---------- pages ---------- */
function home() {
  const rnd = n => byGlobal(1 + (n * 2654435761 >>> 3) % D.total);
  app.innerHTML = `
    <div class="ayah-head">
      <span class="ayah-eyebrow">⚔ A Fan-Made Crossover Codex ⚔</span>
      <h1 class="hero-title">The Codex of Azeroth</h1>
      <p class="sub">Every one of the Quran's <strong>6,236 verses</strong> receives its own unique page in the archives of Azeroth —
      a class, a spell, a zone, a dungeon or raid, and a legend of its own.</p>
    </div>
    <div class="stats stagger">
      <div class="stat"><span class="big">6,236</span><span class="lbl">Verses Mapped</span></div>
      <div class="stat"><span class="big">114</span><span class="lbl">Tomes (Surahs)</span></div>
      <div class="stat"><span class="big">12</span><span class="lbl">Classes</span></div>
      <div class="stat"><span class="big">${D.verses.filter(v=>v[7][0]==="R").length}</span><span class="lbl">Raid Verses</span></div>
      <div class="stat"><span class="big">${D.verses.filter(v=>v[11]==="Legendary"||v[11]==="Mythic").length}</span><span class="lbl">Legendaries</span></div>
    </div>
    <div class="divider">✦ Featured Codex Entries ✦</div>
    <div class="grid stagger">
      ${[97, 255, 1543, 6236, 110, 2861].map(n => {
        const v = byGlobal(n), t = D.tomes[v[0] - 1];
        return `<a class="card tome-card" href="${verseURL(n)}">
          <span class="num">VERSE ${n}</span>
          <div class="name">${esc(v[2])}</div>
          <div class="meta">${esc(t.en)} ${v[0]}:${v[1]} · ${esc(v[3])} · ${esc(v[5])}</div>
          <span class="rarity r-${v[11]}" style="--rc:var(--r-${v[11].toLowerCase()})">${v[11]}</span>
        </a>`;
      }).join("")}
    </div>
    <div class="divider">✦ Begin Your Journey ✦</div>
    <div class="search-row">
      <input id="jump" type="number" min="1" max="6236" placeholder="Jump to verse number (1 – 6236)…">
      <button class="btn-rune" id="jump-go">Open Verse ⚔</button>
    </div>
    <p class="sub" style="margin-top:26px">Use <kbd>←</kbd> <kbd>→</kbd> to travel between verses, <kbd>R</kbd> for a random verse.</p>`;
  document.getElementById("jump-go").onclick = () => {
    const v = Math.min(6236, Math.max(1, +document.getElementById("jump").value || 1));
    location.hash = verseURL(v);
  };
  document.getElementById("jump").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("jump-go").click(); });
}

function tomes() {
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Archives</span><h1 class="hero-title">114 Tomes</h1>
      <p class="sub">Each surah of the Quran is bound as a tome of the Codex, shelved in a great hall of Azeroth.</p></div>
    <div class="grid stagger">
      ${D.tomes.map(t => {
        const [start] = rangeOf(t.n);
        return `<a class="card tome-card" href="#/surah/${t.n}">
          <span class="num">TOME ${t.n} · ${t.count} VERSES · ${t.rev.toUpperCase()}</span>
          <div class="name">${esc(t.en)}</div>
          <div class="meta">“${esc(t.tr)}” — shelved in ${esc(t.tome)}</div>
          <span class="ar">${esc(t.ar)}</span>
        </a>`;
      }).join("")}
    </div>`;
}

function surahPage(m) {
  const n = Math.min(114, Math.max(1, +m[1]));
  const t = D.tomes[n - 1];
  const [start, end] = rangeOf(n);
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">Tome ${n} of 114</span>
      <h1 class="hero-title">${esc(t.en)} — “${esc(t.tr)}”</h1>
      <p class="sub">${esc(t.ar)} · ${t.count} verses · ${esc(t.rev)} revelation · Shelved in <strong>${esc(t.tome)}</strong></p></div>
    <div class="results stagger">
      ${D.verses.slice(start - 1, end).map((v, idx) => `
        <a class="res" href="${verseURL(start + idx)}">
          <span class="n">${n}:${v[1]}</span>
          <span class="t">${esc(v[2])}</span>
          <span class="m">${esc(v[3])} · ${esc(v[11])}</span>
        </a>`).join("")}
    </div>`;
}

function ayahPage(m) {
  const n = Math.min(D.total, Math.max(1, +m[1]));
  const v = byGlobal(n);
  const [s, a, tit, cls, spec, spell, zone, dr, item, fac, flavor, rar] = v;
  const t = D.tomes[s - 1];
  const isRaid = dr[0] === "R";
  app.innerHTML = `
    <div class="card ayah-card r-${rar}" style="--rc:var(--r-${rar.toLowerCase()})">
      <div class="ayah-head">
        <span class="ayah-eyebrow">Verse ${n} of 6,236 · Surah ${esc(t.en)} ${s}:${a}</span>
        <h1 class="ayah-title">${esc(tit)}</h1>
        <div style="margin-top:12px"><span class="rarity">${rar} Codex Entry</span></div>
      </div>
      <div class="arabic" id="ayah-arabic">⏳ Summoning the verse from the archives…</div>
      <p class="translation shimmer" id="ayah-translation"></p>
      <span class="ref">— Al-Qur'an ${s}:${a} · loaded live from alquran.cloud —</span>

      <div class="divider">✦ Codex Classification ✦</div>
      <div class="codex-grid stagger">
        ${chip("Class & Spec", `${cls} — ${spec}`, CLASS_ICONS[cls])}
        ${chip("Signature Spell", spell, "🔮")}
        ${chip("Zone", zone, "🗺️")}
        ${chip(isRaid ? "Raid" : "Dungeon", dr.slice(2), isRaid ? "🏰" : "🗝️")}
        ${chip("Relic of Note", item, "🗡️")}
        ${chip("Sworn Faction", fac, "🚩")}
      </div>
      <div class="flavor"><span class="k">Fan Flavor · Not Scripture</span>${esc(flavor)}</div>

      <div class="pager">
        ${n > 1 ? `<a href="${verseURL(n - 1)}">← Verse ${n - 1}</a>` : "<span></span>"}
        <a href="#/">Grand Hall</a>
        ${n < D.total ? `<a href="${verseURL(n + 1)}">Verse ${n + 1} →</a>` : "<span></span>"}
      </div>
    </div>`;
  window.__ayahN = n; // for keyboard nav
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
  D.verses.forEach(v => counts[v[3]] = (counts[v[3]] || 0) + 1);
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Roster</span><h1 class="hero-title">Twelve Classes</h1>
      <p class="sub">Every verse of the Codex is sworn to one of the twelve classes of Azeroth.</p></div>
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
  const verses = D.verses.map((v, i) => [v, i + 1]).filter(([v]) => v[3] === c.n);
  app.innerHTML = `
    <div class="card class-hero">
      <span class="crest">${CLASS_ICONS[c.n]}</span>
      <h1 class="hero-title">${esc(c.n)}s of the Codex</h1>
      <p class="sub">${verses.length} verses sworn to the ${esc(c.n)} path</p>
      <div>${c.specs.map(s => `<span class="spec-tag">${esc(s)}</span>`).join("")}</div>
    </div>
    <div class="results stagger">
      ${verses.slice(0, 60).map(([v, n]) => `
        <a class="res" href="${verseURL(n)}">
          <span class="n">${v[0]}:${v[1]}</span>
          <span class="t">${esc(v[2])}</span>
          <span class="m">${esc(v[5])} · ${esc(v[11])}</span>
        </a>`).join("")}
    </div>
    ${verses.length > 60 ? `<p class="sub">…and ${verses.length - 60} more — use Search to find them all.</p>` : ""}`;
}

function searchPage() {
  app.innerHTML = `
    <div class="ayah-head"><span class="ayah-eyebrow">The Librarium</span><h1 class="hero-title">Search the Codex</h1>
      <p class="sub">Search all 6,236 entries by verse number, title, class, spell, zone, dungeon, raid, relic or faction.</p></div>
    <div class="search-row">
      <input id="q" type="search" placeholder="e.g. Frostmourne, Molten Core, Suramar, Fireball, Warrior, 6236…">
    </div>
    <p class="meta" id="q-count"></p>
    <div class="results" id="q-results"></div>`;
  const qEl = document.getElementById("q"), resEl = document.getElementById("q-results"), cnt = document.getElementById("q-count");
  function run() {
    const q = qEl.value.trim().toLowerCase();
    if (!q) { resEl.innerHTML = ""; cnt.textContent = ""; return; }
    const num = parseInt(q, 10);
    let hits = D.verses.map((v, i) => [v, i + 1]).filter(([v]) =>
      (num && v[0] === num) || String(v[0] + ":" + v[1]) === q ||
      v.slice(2, 12).join(" ").toLowerCase().includes(q));
    cnt.textContent = `${hits.length} entries found`;
    resEl.innerHTML = hits.slice(0, 100).map(([v, n]) => `
      <a class="res" href="${verseURL(n)}">
        <span class="n">${v[0]}:${v[1]}</span>
        <span class="t">${esc(v[2])}</span>
        <span class="m">${esc(v[3])} · ${esc(v[5])} · ${esc(v[11])}</span>
      </a>`).join("") + (hits.length > 100 ? `<p class="meta">…showing first 100 of ${hits.length}</p>` : "");
  }
  qEl.addEventListener("input", run);
  if (location.hash.includes("?q=")) qEl.value = decodeURIComponent(location.hash.split("?q=")[1] || "");
  run(); qEl.focus();
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
