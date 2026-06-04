/* ============================================================
   Mock data — Patrimoine simulator (Linear redesign)
   Plain JS, exposes window.DATA
   ============================================================ */
(function () {
  const eur = (v) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(v));
  const eurk = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v).toString());

  // ── Projection series (20 ans, équilibré ~5.5%) ───────────────────────────
  const YEARS = 20;
  const monthly = 500;
  const annualReturn = 0.055;
  const proj = [];
  let bal = 0, contrib = 0;
  const r = annualReturn / 12;
  for (let y = 0; y <= YEARS; y++) {
    if (y > 0) for (let m = 0; m < 12; m++) { bal = (bal + monthly) * (1 + r); contrib += monthly; }
    proj.push({ year: y, age: 25 + y, capital: Math.round(bal), contrib: Math.round(contrib), gain: Math.round(bal - contrib) });
  }
  const last = proj[proj.length - 1];

  // ── Monte-Carlo bands (P10/P50/P90) ───────────────────────────────────────
  const mc = proj.map((p, i) => {
    const t = i / YEARS;
    const spread = p.capital * (0.10 + 0.42 * t);
    return {
      year: p.year,
      p50: p.capital,
      p10: Math.round(p.capital - spread * 0.72),
      p90: Math.round(p.capital + spread * 1.18),
    };
  });
  const mcLast = mc[mc.length - 1];

  // ── Envelopes (project + issues model) ────────────────────────────────────
  const envelopes = [
    {
      id: "pea", label: "PEA", type: "PEA", hue: "#5e6ad2",
      contribution: 250, capital: 109400, tax: "17,2 %", taxNote: "PS après 5 ans",
      ret: 6.8, bank: "BoursoBank", fees: "0 € / ordre ETF",
      assets: [
        { id: "a1", name: "ETF MSCI World", ticker: "CW8", alloc: 55, ret: 8.5, risk: 4, cls: "Actions" },
        { id: "a2", name: "ETF S&P 500", ticker: "PE500", alloc: 25, ret: 9.2, risk: 4, cls: "Actions" },
        { id: "a3", name: "ETF Europe (Stoxx 600)", ticker: "ESE", alloc: 20, ret: 6.8, risk: 4, cls: "Actions" },
      ],
    },
    {
      id: "cto", label: "CTO", type: "CTO", hue: "#8b6bd2",
      contribution: 120, capital: 38600, tax: "30 %", taxNote: "Flat tax (PFU)",
      ret: 8.1, bank: "Trade Republic", fees: "1 € / ordre",
      assets: [
        { id: "b1", name: "ETF Nasdaq 100", ticker: "PANX", alloc: 50, ret: 12.5, risk: 5, cls: "Actions" },
        { id: "b2", name: "ETF Marchés Émergents", ticker: "AEEM", alloc: 25, ret: 5.2, risk: 5, cls: "Actions" },
        { id: "b3", name: "OAT France 10 ans", ticker: "OAT10", alloc: 25, ret: 2.1, risk: 2, cls: "Obligations" },
      ],
    },
    {
      id: "av", label: "Assurance-vie", type: "AV", hue: "#6c8cd5",
      contribution: 80, capital: 41200, tax: "Abattement", taxNote: "4 600 € / an après 8 ans",
      ret: 3.6, bank: "Fortuneo", fees: "0,75 %/an UC",
      assets: [
        { id: "c1", name: "Fonds euros performant", ticker: null, alloc: 60, ret: 3.1, risk: 2, cls: "Fonds euros" },
        { id: "c2", name: "ETF MSCI World", ticker: "CW8", alloc: 40, ret: 8.5, risk: 4, cls: "Actions" },
      ],
    },
    {
      id: "livret_a", label: "Livret A", type: "Livret", hue: "#4cb782",
      contribution: 30, capital: 18300, tax: "Exonéré", taxNote: "0 % — réglementé",
      ret: 3.0, bank: "BoursoBank", fees: "Aucun frais",
      assets: [{ id: "d1", name: "Livret A réglementé", ticker: null, alloc: 100, ret: 3.0, risk: 1, cls: "Livret" }],
    },
    {
      id: "ldds", label: "LDDS", type: "Livret", hue: "#4cb782",
      contribution: 20, capital: 9800, tax: "Exonéré", taxNote: "0 % — réglementé",
      ret: 3.0, bank: "BoursoBank", fees: "Aucun frais",
      assets: [{ id: "e1", name: "LDDS réglementé", ticker: null, alloc: 100, ret: 3.0, risk: 1, cls: "Livret" }],
    },
  ];
  const totalCapital = envelopes.reduce((s, e) => s + e.capital, 0);
  const effort = envelopes.reduce((s, e) => s + e.contribution, 0);

  // ── Allocation by asset class (donut) ─────────────────────────────────────
  const allocation = [
    { label: "Actions", pct: 58, color: "#5e6ad2" },
    { label: "Fonds euros", pct: 14, color: "#6c8cd5" },
    { label: "Obligations", pct: 11, color: "#8b6bd2" },
    { label: "Livrets", pct: 17, color: "#4cb782" },
  ];

  // ── Milestones ────────────────────────────────────────────────────────────
  const milestones = [
    { label: "Premiers 50 000 €", year: 7, age: 32, done: true, amount: 50000 },
    { label: "Cap des 100 000 €", year: 11, age: 36, done: true, amount: 100000 },
    { label: "Patrimoine ×2 vs versé", year: 16, age: 41, done: false, amount: 158000 },
    { label: "Objectif retraite anticipée", year: 20, age: 45, done: false, amount: last.capital },
  ];

  // ── Activity feed ─────────────────────────────────────────────────────────
  const activity = [
    { who: "AL", color: "#5e6ad2", text: "a modifié l'allocation du PEA", meta: "MSCI World 55 % → 50 %", time: "il y a 2 h", icon: "edit" },
    { who: "AL", color: "#5e6ad2", text: "a lancé la simulation", meta: "Scénario central · 20 ans", time: "il y a 2 h", icon: "play" },
    { who: "AL", color: "#5e6ad2", text: "a ajouté l'enveloppe Assurance-vie", meta: "Fortuneo · 80 €/mois", time: "hier", icon: "plus" },
    { who: "AL", color: "#5e6ad2", text: "a importé les frais BoursoBank", meta: "PEA · 0 € / ordre ETF", time: "hier", icon: "import" },
    { who: "AL", color: "#5e6ad2", text: "a optimisé le portefeuille", meta: "+0,9 % de rendement net", time: "3 j", icon: "spark" },
  ];

  // ── Smart alerts ──────────────────────────────────────────────────────────
  const alerts = [
    { kind: "warn", title: "Plafond Livret A bientôt atteint", body: "18 300 € sur 22 950 €. Réorientez vers le PEA au-delà." },
    { kind: "info", title: "Fenêtre fiscale AV dans 2 ans", body: "Après 8 ans, abattement de 4 600 €/an sur les retraits." },
  ];

  // ── Assets catalog (data modal) ───────────────────────────────────────────
  const catalog = [
    { name: "ETF MSCI World", ticker: "CW8", cat: "ETF", r10: 8.5, r5: 12.3, vol: "Moyenne", risk: 4 },
    { name: "ETF S&P 500", ticker: "PE500", cat: "ETF", r10: 9.2, r5: 13.1, vol: "Moyenne", risk: 4 },
    { name: "ETF Nasdaq 100", ticker: "PANX", cat: "ETF", r10: 12.5, r5: 16.8, vol: "Élevée", risk: 5 },
    { name: "ETF Europe (Stoxx 600)", ticker: "ESE", cat: "ETF", r10: 6.8, r5: 8.4, vol: "Moyenne", risk: 4 },
    { name: "ETF Marchés Émergents", ticker: "AEEM", cat: "ETF", r10: 5.2, r5: 6.1, vol: "Élevée", risk: 5 },
    { name: "ETF CAC 40", ticker: "C40", cat: "ETF", r10: 6.5, r5: 9.2, vol: "Moyenne", risk: 4 },
    { name: "ETF Small Cap Europe", ticker: "SMC", cat: "ETF", r10: 7.5, r5: 9.3, vol: "Élevée", risk: 5 },
    { name: "Livret A", ticker: null, cat: "Livrets", r10: 1.8, r5: 2.6, vol: "Nulle", risk: 1 },
    { name: "LDDS", ticker: null, cat: "Livrets", r10: 1.8, r5: 2.6, vol: "Nulle", risk: 1 },
    { name: "LEP", ticker: null, cat: "Livrets", r10: 2.4, r5: 3.5, vol: "Nulle", risk: 1 },
    { name: "Fonds euros performant", ticker: null, cat: "Fonds euros", r10: 3.1, r5: 3.0, vol: "Très faible", risk: 2 },
    { name: "Fonds euros (marché moyen)", ticker: null, cat: "Fonds euros", r10: 2.3, r5: 2.0, vol: "Très faible", risk: 2 },
    { name: "OAT France 10 ans", ticker: "OAT10", cat: "Obligations", r10: 2.1, r5: 1.8, vol: "Faible", risk: 2 },
  ];

  // ── Banks (compare drawer) ────────────────────────────────────────────────
  const banks = [
    { id: "bourso", name: "BoursoBank", type: "Banque en ligne", rating: 4.5,
      pea: "0 €", cto: "0,99 €", av: "0,75 %/an", per: "—", livret: "3 %",
      pros: ["Zéro frais de tenue de compte", "N°1 satisfaction client", "Cashback carte"],
      cons: ["Pas d'agence physique", "Pas de PER"] },
    { id: "fortuneo", name: "Fortuneo", type: "Banque en ligne", rating: 4.2,
      pea: "0 €", cto: "1,00 €", av: "0,75 %/an", per: "0,75 %/an", livret: "3 %",
      pros: ["Carte Gold gratuite", "ETF sans frais", "PER disponible"],
      cons: ["Moins connue", "App moins intuitive"] },
    { id: "hello", name: "Hello Bank!", type: "Banque en ligne", rating: 3.8,
      pea: "1,00 €", cto: "1,00 €", av: "0,80 %/an", per: "—", livret: "3 %",
      pros: ["Filiale BNP (solidité)", "Bourse dès 1 €"],
      cons: ["Innovation plus lente", "Courtage plus élevé"] },
    { id: "trade", name: "Trade Republic", type: "Courtier", rating: 4.1,
      pea: "—", cto: "1,00 €", av: "—", per: "—", livret: "—",
      pros: ["Plans d'investissement gratuits", "Interface mobile soignée", "Intérêts sur cash"],
      cons: ["Pas de PEA (statut allemand)", "Pas de livrets FR"] },
    { id: "monabanq", name: "Monabanq", type: "Banque en ligne", rating: 3.8,
      pea: "—", cto: "—", av: "0,75 %/an", per: "0,60 %/an", livret: "3 %",
      pros: ["Service client reconnu", "PER compétitif"],
      cons: ["Pas de PEA", "Pas de CTO"] },
  ];

  // ── Economic regimes ──────────────────────────────────────────────────────
  const regimes = [
    { key: "expansion", label: "Expansion", desc: "Croissance soutenue, marchés haussiers", prob: 52, color: "#4cb782" },
    { key: "overheat", label: "Surchauffe", desc: "Inflation élevée, fin de cycle", prob: 18, color: "#e2b550" },
    { key: "recession", label: "Récession", desc: "Contraction économique", prob: 22, color: "#e0795a" },
    { key: "crisis", label: "Crise", desc: "Choc systémique", prob: 8, color: "#6b7280" },
  ];

  // regime distribution over time (stacked bars, sampled years)
  const regimeDist = [0, 4, 8, 12, 16, 20].map((y) => {
    const t = y / 20;
    return {
      year: y,
      expansion: Math.round(52 - 6 * t),
      overheat: Math.round(18 + 2 * t),
      recession: Math.round(22 + 2 * t),
      crisis: Math.round(8 + 2 * t),
    };
  });

  // ── Optimizer result (allocation before/after) ────────────────────────────
  const optimized = [
    { name: "ETF MSCI World", env: "PEA", cls: "Actions", before: 30.3, after: 34.0, net: 7.1 },
    { name: "ETF S&P 500", env: "PEA", cls: "Actions", before: 13.8, after: 16.5, net: 7.8 },
    { name: "ETF Nasdaq 100", env: "CTO", cls: "Actions", before: 9.6, after: 12.0, net: 8.4 },
    { name: "Fonds euros performant", env: "AV", cls: "Fonds euros", before: 11.4, after: 9.0, net: 2.6 },
    { name: "OAT France 10 ans", env: "CTO", cls: "Obligations", before: 4.8, after: 6.5, net: 1.9 },
    { name: "ETF Europe", env: "PEA", cls: "Actions", before: 11.0, after: 8.5, net: 5.9 },
    { name: "ETF Marchés Émergents", env: "CTO", cls: "Actions", before: 4.8, after: 3.5, net: 4.4 },
    { name: "Livret A + LDDS", env: "Livrets", cls: "Livret", before: 14.3, after: 10.0, net: 2.4 },
  ];

  const locationSuggestions = [
    { asset: "ETF MSCI World", from: "Assurance-vie", to: "PEA", reason: "Exonération PS après 5 ans vs UC taxées", saving: 2400 },
    { asset: "OAT France 10 ans", from: "CTO", to: "Assurance-vie", reason: "Coupons abrités de la flat tax", saving: 860 },
  ];

  window.DATA = {
    eur, eurk,
    proj, last, mc, mcLast,
    envelopes, totalCapital, effort,
    allocation, milestones, activity, alerts,
    catalog, banks, regimes, regimeDist, optimized, locationSuggestions,
    profile: { name: "Alexandre", initials: "AL", color: "#5e6ad2", age: 25, salary: 2500, horizon: 20, ageRetraite: 45, scenario: "Scénario central" },
    profiles: [
      { id: "alex", name: "Alexandre", initials: "AL", color: "#5e6ad2", sims: 3, active: true },
      { id: "marie", name: "Marie", initials: "MD", color: "#4cb782", sims: 1, active: false },
      { id: "couple", name: "Foyer Dupont", initials: "FD", color: "#e0795a", sims: 2, active: false },
    ],
    sims: [
      { id: "central", name: "Scénario central", meta: "20 ans · 500 €/mois", active: true },
      { id: "fire", name: "Variante FIRE", meta: "15 ans · 900 €/mois", active: false },
      { id: "prudent", name: "Profil prudent", meta: "25 ans · 400 €/mois", active: false },
    ],
  };
})();
