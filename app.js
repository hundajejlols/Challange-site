/* ============================================================
   Logika strony — nie musisz tu nic zmieniać.
   Wszystkie dane edytujesz w data.js.
   ============================================================ */

const TIERS = [
  { id:"IRON",        pl:"Iron",        color:"#6e6a63" },
  { id:"BRONZE",      pl:"Bronze",      color:"#9c6a4a" },
  { id:"SILVER",      pl:"Silver",      color:"#9fadad" },
  { id:"GOLD",        pl:"Gold",        color:"#e6c15c" },
  { id:"PLATINUM",    pl:"Platinum",    color:"#4fb6a4" },
  { id:"EMERALD",     pl:"Emerald",     color:"#2fbf6b" },
  { id:"DIAMOND",     pl:"Diamond",     color:"#6b8cff" },
  { id:"MASTER",      pl:"Master",      color:"#b45cf0" },
  { id:"GRANDMASTER", pl:"Grandmaster", color:"#ef4b4b" },
  { id:"CHALLENGER",  pl:"Challenger",  color:"#3ed6ff" },
];
const tierIndex = id => TIERS.findIndex(t => t.id === id);
const tierColor = id => TIERS[tierIndex(id)].color;

/* wynik liczbowy rangi: tier*400 + dywizja*100 + LP (Master+ bez dywizji) */
function score(tier, dyw, lp){
  const ti = tierIndex(tier);
  const divPart = dyw > 0 ? (4 - dyw) * 100 : 0;
  return ti * 400 + divPart + lp;
}
const MAX_SCORE = 10 * 400; // sufit skali drabinki

const rzym = { 4:"IV", 3:"III", 2:"II", 1:"I", 0:"" };
function rankLabel(g){
  const t = TIERS[tierIndex(g.tier)].pl;
  return g.dywizja > 0 ? `${t} ${rzym[g.dywizja]}` : t;
}
function opgg(g){
  return "https://op.gg/summoners/eune/" + encodeURIComponent(g.riotId.replace("#","-"));
}

/* dane pochodne + sortowanie */
const players = GRACZE.map((g,i) => {
  const gry = g.wygrane + g.przegrane;
  const wr = gry ? Math.round(g.wygrane / gry * 100) : 0;
  return { ...g, idx:i, gry, wr, score: score(g.tier, g.dywizja, g.lp) };
}).sort((a,b) => b.score - a.score || b.lp - a.lp || b.wr - a.wr);

const leader = players[0];
const wagon  = players[players.length - 1];

/* ================= HERO ================= */
document.getElementById("hero-nazwa").textContent = CHALLENGE.nazwa;
document.getElementById("hero-podtytul").textContent = CHALLENGE.podtytul;
document.getElementById("hero-opis").textContent = CHALLENGE.opis;

const totalGames = players.reduce((s,p) => s + p.gry, 0);
const totalMax = CHALLENGE.maxGier * players.length;
document.getElementById("hero-progress-txt").textContent = `${totalGames} / ${totalMax} gier`;
document.getElementById("hero-leader").innerHTML =
  `<span class="crown">♛</span>Prowadzi: ${leader.imie} — ${rankLabel(leader)}, ${leader.lp} LP`;

requestAnimationFrame(() => {
  document.getElementById("hero-progress-bar").style.width =
    Math.min(100, totalGames / totalMax * 100) + "%";
});

/* ================= DRABINKA ================= */
const ladder = document.getElementById("ladder");

/* rzędy tierów: Challenger u góry, Iron na dole */
[...TIERS].reverse().forEach((t,i) => {
  const row = document.createElement("div");
  row.className = "tier-row";
  row.style.top = (i * 10) + "%";
  row.innerHTML = `<div class="tier-label" style="color:${t.color}">
    <span class="tier-gem"></span>${t.pl}</div>`;
  ladder.appendChild(row);
});

/* żetony graczy — każdy w swojej pionowej "alei" */
players.forEach((p,i) => {
  const tok = document.createElement("div");
  tok.className = "token" + (i === 0 ? " leader" : "");
  tok.style.backgroundImage = `url('${p.foto}')`;
  tok.style.borderColor = i === 0 ? "" : tierColor(p.tier);
  /* aleje rozmieszczone w prawej części drabinki */
  const laneStart = 24, laneEnd = 92;
  const lane = laneStart + (laneEnd - laneStart) * (p.idx + 0.5) / players.length;
  tok.style.left = lane + "%";
  tok.dataset.label = `${p.imie} · ${p.lp} LP`;
  tok.title = `${p.imie} — ${rankLabel(p)}, ${p.lp} LP`;
  tok.addEventListener("click", () => {
    document.getElementById("card-" + p.idx)
      .scrollIntoView({ behavior:"smooth", block:"center" });
  });
  ladder.appendChild(tok);
  /* animacja wspinaczki po załadowaniu */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    tok.style.top = (100 - Math.min(1, p.score / MAX_SCORE) * 100) + "%";
  }));
});

/* ================= KARTY GRACZY ================= */
function sparkline(hist){
  if (!hist || hist.length < 2) return "";
  const vals = hist.map(h => score(h[0], h[1], h[2]));
  const min = Math.min(...vals), max = Math.max(...vals);
  const W = 200, H = 44, pad = 3;
  const pts = vals.map((v,i) => {
    const x = pad + i / (vals.length - 1) * (W - 2*pad);
    const y = H - pad - (max === min ? .5 : (v - min) / (max - min)) * (H - 2*pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `${pad},${H} ` + pts.join(" ") + ` ${W-pad},${H}`;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <polygon class="area" points="${area}"/>
    <polyline points="${pts.join(" ")}"/>
  </svg>`;
}

const cards = document.getElementById("cards");
players.forEach((p,i) => {
  const c = document.createElement("article");
  c.className = "card reveal";
  c.id = "card-" + p.idx;
  const col = tierColor(p.tier);
  c.innerHTML = `
    <div class="card-photo" style="background-image:url('${p.foto}')"></div>
    <div class="card-base">
      <div class="card-name">${i===0 ? "♛ " : ""}${p.imie}</div>
      <div class="card-rank-line" style="color:${col}">
        <span class="rank-dot"></span>${rankLabel(p)} · ${p.lp} LP
      </div>
    </div>
    <div class="card-stats">
      <div class="cs-name">${p.imie}</div>
      <div class="cs-riot">${p.riotId}</div>
      <div class="cs-rank" style="color:${col}">${rankLabel(p)} · ${p.lp} LP</div>
      <dl class="cs-grid">
        <div><dt>Bilans</dt><dd class="cs-wr"><span class="w">${p.wygrane}W</span> / <span class="l">${p.przegrane}L</span></dd></div>
        <div><dt>Winrate</dt><dd>${p.wr}%</dd></div>
        <div><dt>KDA</dt><dd>${p.kda}</dd></div>
        <div><dt>Gry</dt><dd>${p.gry} / ${CHALLENGE.maxGier}</dd></div>
        <div><dt>Main</dt><dd>${p.mainChamp}</dd></div>
        <div><dt>Rola</dt><dd>${p.rola}</dd></div>
      </dl>
      <div class="cs-motto">„${p.motto}"</div>
      ${sparkline(p.historia)}
      <a class="cs-link" href="${opgg(p)}" target="_blank" rel="noopener">Profil na OP.GG →</a>
    </div>`;
  /* tap na telefonie */
  c.addEventListener("click", e => {
    if (e.target.closest("a")) return;
    if (matchMedia("(hover:hover)").matches) return;
    document.querySelectorAll(".card.open").forEach(x => x !== c && x.classList.remove("open"));
    c.classList.toggle("open");
  });
  cards.appendChild(c);
});

/* ================= TABELA ================= */
const tbody = document.getElementById("table-body");
players.forEach((p,i) => {
  const tr = document.createElement("tr");
  if (i === 0) tr.className = "first";
  tr.innerHTML = `
    <td class="td-place">${i+1}</td>
    <td><div class="td-player"><span class="td-avatar" style="background-image:url('${p.foto}')"></span>${p.imie}</div></td>
    <td style="color:${tierColor(p.tier)};font-weight:700">${rankLabel(p)}</td>
    <td class="td-num">${p.lp}</td>
    <td class="td-num">${p.wygrane}–${p.przegrane}</td>
    <td class="td-num">${p.wr}%<span class="wr-bar"><i style="width:${p.wr}%"></i></span></td>
    <td class="td-num">${p.gry}/${CHALLENGE.maxGier}</td>`;
  tbody.appendChild(tr);
});

/* ================= WYRÓŻNIENIA ================= */
const bestWr   = [...players].sort((a,b) => b.wr - a.wr)[0];
const grinder  = [...players].sort((a,b) => b.gry - a.gry)[0];
const bestKda  = [...players].sort((a,b) => parseFloat(b.kda) - parseFloat(a.kda))[0];

const BADGES = [
  { icon:"♛",  title:"Lider drabinki",  who:leader.imie,  desc:`${rankLabel(leader)} · ${leader.lp} LP — na razie patrzy na resztę z góry.` },
  { icon:"🎯", title:"Snajper winrate'u", who:bestWr.imie, desc:`${bestWr.wr}% wygranych. Jakość, nie ilość.` },
  { icon:"⚒️", title:"Grinder",          who:grinder.imie, desc:`${grinder.gry} rozegranych gier. Sen jest dla słabych.` },
  { icon:"⚔️", title:"Maszyna KDA",      who:bestKda.imie, desc:`KDA ${bestKda.kda}. Umierać? Nie znam.` },
  { icon:"🚃", title:"Wagon",            who:wagon.imie,   desc:`Ostatnie miejsce. Jeszcze ${CHALLENGE.maxGier - wagon.gry} gier na comeback.` },
];
document.getElementById("badges").innerHTML = BADGES.map(b => `
  <div class="badge reveal">
    <div class="badge-icon">${b.icon}</div>
    <div class="badge-title">${b.title}</div>
    <div class="badge-who">${b.who}</div>
    <div class="badge-desc">${b.desc}</div>
  </div>`).join("");

/* ================= ZASADY ================= */
document.getElementById("rules").innerHTML =
  ZASADY.map(z => `<li>${z}</li>`).join("");
document.getElementById("stake").innerHTML =
  `<strong>Stawka</strong>${CHALLENGE.stawka}`;

/* ================= FOOTER ================= */
document.getElementById("footer-info").textContent =
  `${CHALLENGE.nazwa} · start ${CHALLENGE.start} · serwer EUNE`;

/* ================= REVEAL ON SCROLL ================= */
const io = new IntersectionObserver(es => {
  es.forEach(e => e.isIntersecting && e.target.classList.add("in"));
}, { threshold:.12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));
document.querySelectorAll(".section").forEach(s => {
  s.classList.add("reveal"); io.observe(s);
});
