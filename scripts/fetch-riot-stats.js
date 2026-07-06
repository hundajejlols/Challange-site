#!/usr/bin/env node
/* ============================================================
   Pobiera aktualne staty graczy z Riot API i nadpisuje GRACZE
   w data.js (CHALLENGE i ZASADY zostają nietknięte).

   Użycie:  node scripts/fetch-riot-stats.js
   Wymaga:  RIOT_API_KEY w .env (klucz development wygasa po 24h,
            odśwież na developer.riotgames.com w razie 401/403).
   ============================================================ */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data.js");
const ENV_PATH = path.join(ROOT, ".env");

const ACCOUNT_ROUTE = "europe";   // riot account-v1 / match-v5
const PLATFORM_ROUTE = "eun1";    // league-v4 (serwer EUNE)
const RANKED_SOLO_QUEUE_ID = 420;
const MATCHES_TO_SAMPLE = 15;
const REQUEST_DELAY_MS = 70;      // ~14 zapytań/s, bezpiecznie pod limitem 20/1s

/* gracze do odpytania — te same dane co dotąd w data.js,
   tylko ranga/bilans/KDA/champ/rola zostaną nadpisane świeżymi z API */
const PLAYERS_CONFIG = [
  { imie: "FNC 根小香腸",     riotId: "FNC 根小香腸#2115",   foto: "img/gracz3.jpg", motto: "Wjeżdżam po swoje." },
  { imie: "G2 菲烏特克馬利",  riotId: "G2 菲烏特克馬利#g2win", foto: "img/gracz4.jpg", motto: "Wjazd bez pytania." },
  { imie: "レイピスト",       riotId: "レイピスト#BBWDH",     foto: "img/gracz1.jpg", motto: "Cisza przed burzą." },
  { imie: "Narciarz123",     riotId: "Narciarz123#AAA",    foto: "img/gracz2.jpg", motto: "Sax przed grą, LP po grze." },
];

const RANK_TO_DYWIZJA = { I: 1, II: 2, III: 3, IV: 4 };
const POSITION_PL = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid",
  BOTTOM: "ADC", UTILITY: "Wspieracz",
};

function readEnv() {
  const txt = fs.readFileSync(ENV_PATH, "utf8");
  const line = txt.split("\n").find(l => l.startsWith("RIOT_API_KEY="));
  if (!line) throw new Error("Brak RIOT_API_KEY w .env");
  return line.split("=")[1].trim();
}

const API_KEY = readEnv();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function riotFetch(url) {
  await sleep(REQUEST_DELAY_MS);
  const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

function splitRiotId(riotId) {
  const idx = riotId.lastIndexOf("#");
  return { gameName: riotId.slice(0, idx), tagLine: riotId.slice(idx + 1) };
}

function formatChampName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

async function fetchPlayer(cfg) {
  const { gameName, tagLine } = splitRiotId(cfg.riotId);
  const account = await riotFetch(
    `https://${ACCOUNT_ROUTE}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/` +
    `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
  const puuid = account.puuid;

  const entries = await riotFetch(
    `https://${PLATFORM_ROUTE}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`
  );
  const solo = entries.find(e => e.queueType === "RANKED_SOLO_5x5");

  const rank = solo
    ? {
        tier: solo.tier,
        dywizja: RANK_TO_DYWIZJA[solo.rank] ?? 0,
        lp: solo.leaguePoints,
        wygrane: solo.wins,
        przegrane: solo.losses,
      }
    : { tier: "IRON", dywizja: 4, lp: 0, wygrane: 0, przegrane: 0 };

  const matchIds = await riotFetch(
    `https://${ACCOUNT_ROUTE}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids` +
    `?queue=${RANKED_SOLO_QUEUE_ID}&count=${MATCHES_TO_SAMPLE}`
  );

  let kills = 0, deaths = 0, assists = 0;
  const champCounts = {}, posCounts = {};
  for (const id of matchIds) {
    const match = await riotFetch(
      `https://${ACCOUNT_ROUTE}.api.riotgames.com/lol/match/v5/matches/${id}`
    );
    const p = match.info.participants.find(pp => pp.puuid === puuid);
    if (!p) continue;
    kills += p.kills; deaths += p.deaths; assists += p.assists;
    champCounts[p.championName] = (champCounts[p.championName] || 0) + 1;
    if (p.teamPosition) posCounts[p.teamPosition] = (posCounts[p.teamPosition] || 0) + 1;
  }

  const kda = deaths === 0
    ? (matchIds.length ? "Perfect" : "0.0")
    : ((kills + assists) / deaths).toFixed(1);

  const mainChampRaw = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mainChamp = mainChampRaw ? formatChampName(mainChampRaw) : "—";

  const mainPos = Object.entries(posCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const rola = mainPos ? (POSITION_PL[mainPos] || mainPos) : "—";

  return { ...cfg, ...rank, kda, mainChamp, rola };
}

function loadExistingHistoria() {
  const src = fs.readFileSync(DATA_PATH, "utf8");
  const map = {};
  const re = /riotId:\s*"([^"]+)"[\s\S]*?historia:\s*(\[[\s\S]*?\]),/g;
  let m;
  while ((m = re.exec(src))) {
    try { map[m[1]] = eval(m[2]); } catch { /* ignore malformed entry */ }
  }
  return map;
}

function nextHistoria(prev, tier, dywizja, lp) {
  const hist = prev && prev.length ? [...prev] : [["IRON", 4, 0]];
  const last = hist[hist.length - 1];
  if (!last || last[0] !== tier || last[1] !== dywizja || last[2] !== lp) {
    hist.push([tier, dywizja, lp]);
  }
  return hist;
}

function graczeBlock(players, historiaMap) {
  const entries = players.map(p => {
    const historia = nextHistoria(historiaMap[p.riotId], p.tier, p.dywizja, p.lp);
    const historiaStr = historia.map(h => `["${h[0]}",${h[1]},${h[2]}]`).join(",");
    return `  {
    imie: ${JSON.stringify(p.imie)},
    riotId: ${JSON.stringify(p.riotId)},
    foto: ${JSON.stringify(p.foto)},
    tier: "${p.tier}", dywizja: ${p.dywizja}, lp: ${p.lp},
    wygrane: ${p.wygrane}, przegrane: ${p.przegrane},
    kda: ${JSON.stringify(p.kda)},
    mainChamp: ${JSON.stringify(p.mainChamp)},
    rola: ${JSON.stringify(p.rola)},
    motto: ${JSON.stringify(p.motto)},
    historia: [${historiaStr}],
  }`;
  });
  return `const GRACZE = [\n${entries.join(",\n")},\n];`;
}

async function main() {
  const historiaMap = loadExistingHistoria();

  const players = [];
  for (const cfg of PLAYERS_CONFIG) {
    process.stdout.write(`Pobieram: ${cfg.imie} (${cfg.riotId})... `);
    try {
      const p = await fetchPlayer(cfg);
      console.log(`${p.tier} ${p.dywizja || ""} ${p.lp}LP, ${p.wygrane}W/${p.przegrane}L, KDA ${p.kda}, ${p.mainChamp}/${p.rola}`);
      players.push(p);
    } catch (err) {
      console.log(`BŁĄD: ${err.message}`);
      throw err;
    }
  }

  const src = fs.readFileSync(DATA_PATH, "utf8");
  const startIdx = src.indexOf("const GRACZE = [");
  const endMarker = "\n];\n\nconst ZASADY";
  const endIdx = src.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Nie znaleziono bloku GRACZE w data.js — nadpisywanie przerwane.");
  }

  const newSrc =
    src.slice(0, startIdx) +
    graczeBlock(players, historiaMap) +
    src.slice(endIdx + "\n];".length);

  fs.writeFileSync(DATA_PATH, newSrc);
  console.log("\ndata.js zaktualizowany.");
}

main().catch(err => {
  console.error("\nNie udało się pobrać danych z Riot API:", err.message);
  process.exit(1);
});
