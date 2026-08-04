window.EP = window.EP || {};
/* ==========================================================================
   PÉNZÜGYI TÉRKÉP — globális kérdőív
   6 kérdés → a 13 szolgáltatásból kiválasztja a 3 legrelevánsabbat.
   A pontozás súlyokkal működik: minden válasz megnövel bizonyos slug-okat.
   ========================================================================== */

const QUIZ = {
  title: "Pénzügyi Térkép",
  lead:
    "Hat kérdés, kb. egy perc. A végén megmutatom, melyik három téma hozza neked most a legtöbb pénzt vagy a legnagyobb biztonságot — és mennyi az a szám.",
  steps: [
    {
      id: "life",
      kicker: "Élethelyzet",
      q: "Melyik írja le a leginkább a mostani helyzetedet?",
      opts: [
        {
          v: "single",
          label: "Egyedül, még építem",
          note: "Karrier kezdet, első komolyabb megtakarítások",
          w: { "nyugdij-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "dijmentes-bankszamla": 2, "baleset-biztositas": 1 },
        },
        {
          v: "couple",
          label: "Párban, gyerek még nincs",
          note: "Közös célok, lakás, tartalék",
          w: { "tamogatott-hitelek": 3, "szabad-felhasznalasu-megtakaritas": 2, "nyugdij-megtakaritas": 2, "egeszsegbiztositas": 1 },
        },
        {
          v: "smallkids",
          label: "Kisgyerekes család",
          note: "Sok kiadás, kevés idő",
          w: { "adokedvezmeny-gyerek-no": 4, "gyerek-megtakaritas": 3, "elet-biztositas": 3, "egeszsegbiztositas": 2 },
        },
        {
          v: "schoolkids",
          label: "Iskolás/nagyobb gyerekek",
          note: "Tanszer, sport, jövőtervezés",
          w: { "adokedvezmeny-gyerek-no": 4, "gyerek-megtakaritas": 3, "baleset-biztositas": 2, "nyugdij-megtakaritas": 2 },
        },
        {
          v: "mature",
          label: "50 felett, a nyugdíj a téma",
          note: "Utolsó nagy szakasz a felkészülésre",
          w: { "nyugdij-megtakaritas": 4, "egeszsegbiztositas": 3, "adokedvezmeny-gyerek-no": 2 },
        },
      ],
    },
    {
      id: "home",
      kicker: "Lakhatás",
      q: "Hogy állsz a lakhatással?",
      opts: [
        {
          v: "rent",
          label: "Bérlek",
          note: "A saját lakás a cél",
          w: { "tamogatott-hitelek": 4, "szabad-felhasznalasu-megtakaritas": 3 },
        },
        {
          v: "plan",
          label: "Most vásárolnék elsőként",
          note: "Otthon Start-terület",
          w: { "tamogatott-hitelek": 5, "piaci-hitelek": 2, "szabad-felhasznalasu-megtakaritas": 2 },
        },
        {
          v: "loan",
          label: "Van lakáshitelem",
          note: "Van mit optimalizálni",
          w: { "adokedvezmeny-lakashitel": 5, "elet-biztositas": 3, "piaci-hitelek": 3 },
        },
        {
          v: "own",
          label: "Saját lakás, hitel nélkül",
          note: "Szabad kapacitás megtakarításra",
          w: { "nyugdij-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "egeszsegbiztositas": 2 },
        },
      ],
    },
    {
      id: "car",
      kicker: "Autó",
      q: "Autó?",
      opts: [
        { v: "none", label: "Nincs", note: "Ez a téma kimarad", w: {} },
        {
          v: "kgfb",
          label: "Van, csak kötelezővel",
          note: "Évfordulós váltás lehetőség",
          w: { "kgfb-casco": 4 },
        },
        {
          v: "casco",
          label: "Van, cascóval is",
          note: "Két szerződés, két optimalizálási pont",
          w: { "kgfb-casco": 3, "baleset-biztositas": 1 },
        },
        {
          v: "buy",
          label: "Most veszek autót",
          note: "Hitel + biztosítás egyszerre",
          w: { "kgfb-casco": 4, "szemelyi-kolcson": 2 },
        },
      ],
    },
    {
      id: "pain",
      kicker: "Fókusz",
      q: "Mi zavar most a legjobban a pénzügyeidben?",
      opts: [
        {
          v: "notax",
          label: "Túl sok adót fizetek",
          note: "Van rá három legális eszköz",
          w: { "nyugdij-megtakaritas": 4, "adokedvezmeny-gyerek-no": 4, "adokedvezmeny-lakashitel": 3 },
        },
        {
          v: "nosave",
          label: "Nem marad félretenni való",
          note: "Először a kiadási oldalt nézzük",
          w: { "dijmentes-bankszamla": 4, "kgfb-casco": 3, "szabad-felhasznalasu-megtakaritas": 2 },
        },
        {
          v: "risk",
          label: "Kiszolgáltatottnak érzem magunkat",
          note: "Ha valami történik, összeomlik a kassza",
          w: { "elet-biztositas": 4, "baleset-biztositas": 4, "egeszsegbiztositas": 2 },
        },
        {
          v: "money",
          label: "Most kell pénz egy célra",
          note: "Finanszírozás",
          w: { "szemelyi-kolcson": 4, "piaci-hitelek": 3, "tamogatott-hitelek": 2 },
        },
        {
          v: "future",
          label: "Nem látom, mi lesz 10–20 év múlva",
          note: "Terv kell, nem termék",
          w: { "nyugdij-megtakaritas": 4, "gyerek-megtakaritas": 2, "szabad-felhasznalasu-megtakaritas": 2 },
        },
      ],
    },
    {
      id: "health",
      kicker: "Egészség",
      q: "Mikor jártál utoljára szakorvosnál várólista nélkül?",
      opts: [
        {
          v: "private",
          label: "Privátban járok, zsebből fizetem",
          note: "Ez tipikusan kiváltható előfizetéssel",
          w: { "egeszsegbiztositas": 4, "adokedvezmeny-gyerek-no": 3 },
        },
        {
          v: "waited",
          label: "Hónapokat vártam",
          note: "Itt van a legnagyobb életszínvonal-nyereség",
          w: { "egeszsegbiztositas": 4 },
        },
        {
          v: "rare",
          label: "Ritkán fordulok orvoshoz",
          note: "Prevenció és baleseti fedezet a fókusz",
          w: { "baleset-biztositas": 2, "egeszsegbiztositas": 1 },
        },
        {
          v: "kids",
          label: "A gyerekekkel járunk gyakran",
          note: "Gyermek-szakrendelés + pénztári elszámolás",
          w: { "egeszsegbiztositas": 3, "adokedvezmeny-gyerek-no": 4 },
        },
      ],
    },
    {
      id: "tax",
      kicker: "Adózás",
      q: "Fizetsz személyi jövedelemadót?",
      help: "A 20%-os állami jóváírásokhoz ez a feltétel. Ha nem, más eszközökre koncentrálunk.",
      opts: [
        {
          v: "yes",
          label: "Igen",
          note: "Minden adókedvezmény nyitva áll",
          w: { "nyugdij-megtakaritas": 3, "adokedvezmeny-gyerek-no": 3, "adokedvezmeny-lakashitel": 2 },
        },
        {
          v: "exempt",
          label: "Nem, kedvezmény miatt nem fizetek",
          note: "Pl. gyermeket nevelő anyák szja-mentessége",
          w: { "gyerek-megtakaritas": 3, "szabad-felhasznalasu-megtakaritas": 3, "elet-biztositas": 2, "dijmentes-bankszamla": 2 },
        },
        {
          v: "dunno",
          label: "Nem tudom pontosan",
          note: "Átnézzük együtt",
          w: { "nyugdij-megtakaritas": 1, "adokedvezmeny-gyerek-no": 1, "dijmentes-bankszamla": 1 },
        },
      ],
    },
  ],

  /** Válaszok → rangsorolt slug-lista */
  score(answers) {
    const totals = {};
    this.steps.forEach((step) => {
      const picked = answers[step.id];
      if (!picked) return;
      const opt = step.opts.find((o) => o.v === picked);
      if (!opt) return;
      Object.entries(opt.w || {}).forEach(([slug, w]) => {
        totals[slug] = (totals[slug] || 0) + w;
      });
    });
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, score]) => ({ slug, score }));
  },
};


Object.assign(window.EP, { QUIZ });
