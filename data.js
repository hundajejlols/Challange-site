/* ============================================================
   DANE CHALLENGE'U — edytuj TYLKO ten plik po każdej sesji gier
   Po zmianie: git add . && git commit -m "update" && git push
   Vercel sam przebuduje stronę.
   ============================================================ */

const CHALLENGE = {
  nazwa: "WYŚCIG NA SZCZYT",
  podtytul: "4 kumpli · 4 świeże konta · 100 gier · EUNE",
  opis: "Kto po 100 grach rankingowych solo/duo wejdzie najwyżej — ten wygrywa. Reszta płaci.",
  stawka: "Przegrani stawiają zwycięzcy pizzę i noszą tytuł Wagona do końca sezonu.",
  start: "2026-07-06",
  maxGier: 100,
};

/* ----- RANGI ----------------------------------------------------
   tier: "IRON" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" |
         "EMERALD" | "DIAMOND" | "MASTER" | "GRANDMASTER" | "CHALLENGER"
   dywizja: 4, 3, 2, 1  (dla MASTER+ wpisz 0)
   lp: aktualne LP w dywizji
------------------------------------------------------------------ */

/* historia = migawki rangi co ~10 gier, do wykresu formy.
   Dopisuj [tier, dywizja, lp]. Wykres pojawi się od 2. wpisu. */

const GRACZE = [
  {
    imie: "FNC 根小香腸",
    riotId: "FNC 根小香腸#2115",
    foto: "img/gracz3.jpg",
    tier: "IRON", dywizja: 4, lp: 0,
    wygrane: 0, przegrane: 0,
    kda: "0.0",
    mainChamp: "—",
    rola: "—",
    motto: "Wjeżdżam po swoje.",
    historia: [["IRON",4,0]],
  },
  {
    imie: "G2 菲烏特克馬利",
    riotId: "G2 菲烏特克馬利#g2win",
    foto: "img/gracz4.jpg",
    tier: "IRON", dywizja: 4, lp: 0,
    wygrane: 0, przegrane: 0,
    kda: "0.0",
    mainChamp: "—",
    rola: "—",
    motto: "Wjazd bez pytania.",
    historia: [["IRON",4,0]],
  },
  {
    imie: "レイピスト",
    riotId: "レイピスト#BBWDH",
    foto: "img/gracz1.jpg",
    tier: "IRON", dywizja: 4, lp: 0,
    wygrane: 0, przegrane: 0,
    kda: "0.0",
    mainChamp: "—",
    rola: "—",
    motto: "Cisza przed burzą.",
    historia: [["IRON",4,0]],
  },
  {
    imie: "Narciarz123",
    riotId: "Narciarz123#AAA",
    foto: "img/gracz2.jpg",
    tier: "IRON", dywizja: 4, lp: 0,
    wygrane: 0, przegrane: 0,
    kda: "0.0",
    mainChamp: "—",
    rola: "—",
    motto: "Sax przed grą, LP po grze.",
    historia: [["IRON",4,0]],
  },
];

const ZASADY = [
  "Każdy startuje na świeżym koncie na serwerze EUNE — zero smurfowania na starych kontach.",
  "Liczą się wyłącznie gry rankingowe Solo/Duo.",
  "Limit to 100 gier — decyduje ranga w momencie zakończenia setnej gry.",
  "Zakaz duo z osobami spoza challenge'u powyżej Silvera.",
  "Dodge'e nie liczą się jako gra, ale nie więcej niż 2 dziennie.",
  "Przy remisie rangi decyduje wyższe LP, potem lepszy winrate.",
];
