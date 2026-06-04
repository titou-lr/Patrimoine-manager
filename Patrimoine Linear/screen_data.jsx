/* Data Modal — command-palette style, full-screen. window.DataModal */
(function () {
  const { useState, useEffect, useRef } = React;
  const I = window.Icons;
  const D = window.DATA;
  const eur = D.eur;

  const CATS = ["Tous", "ETF", "Fonds euros", "Obligations", "Livrets"];

  function RiskDots({ n }) {
    return React.createElement("span", { className: "risk" },
      [1,2,3,4,5].map((i) => React.createElement("i", { key: i, className: i <= n ? "f" : "" })));
  }

  // ── Asset Table ────────────────────────────────────────────────────────────
  function AssetTable({ q, cat }) {
    const filtered = D.catalog.filter((a) =>
      (cat === "Tous" || a.cat === cat) &&
      (a.name.toLowerCase().includes(q.toLowerCase()) || (a.ticker || "").toLowerCase().includes(q.toLowerCase())));

    if (filtered.length === 0)
      return React.createElement("div", { className: "col", style: { alignItems: "center", justifyContent: "center", height: 180, gap: 8 } },
        React.createElement(I.search, { s: 26, className: "tertiary" }),
        React.createElement("div", { className: "muted" }, "Aucun résultat pour « " + q + " »"),
        React.createElement("div", { className: "caption" }, "Essayez « ETF » ou « Livret »"));

    return React.createElement("table", { className: "tbl", style: { width: "100%" } },
      React.createElement("thead", null, React.createElement("tr", null,
        [["Actif", "auto"], ["Cat.", "90px"], ["Rdt. 10 ans", "120px"], ["Rdt. 5 ans", "110px"], ["Volatilité", "110px"], ["Risque", "90px"], ["", "80px"]].map(([h, w], i) =>
          React.createElement("th", { key: i, style: { width: w, textAlign: i >= 2 ? "right" : "left" } }, h)))),
      React.createElement("tbody", null, filtered.map((a, i) =>
        React.createElement("tr", { key: i },
          React.createElement("td", null,
            React.createElement("div", { className: "row gap8" },
              React.createElement("div", null,
                React.createElement("div", { className: "subhead" }, a.name),
                a.ticker && React.createElement("div", { className: "caption mono", style: { fontSize: 11 } }, a.ticker)))),
          React.createElement("td", null, React.createElement("span", { className: "badge" }, a.cat)),
          React.createElement("td", { className: "num pos", style: { fontWeight: 500 } }, a.r10.toFixed(1) + " %"),
          React.createElement("td", { className: "num pos" }, a.r5.toFixed(1) + " %"),
          React.createElement("td", { className: "num muted", style: { textAlign: "right" } }, a.vol),
          React.createElement("td", { style: { textAlign: "right" } }, React.createElement(RiskDots, { n: a.risk })),
          React.createElement("td", { style: { textAlign: "right" } },
            React.createElement("button", { className: "btn btn-secondary btn-sm" }, "Ajouter"))))));
  }

  // ── Bank Compare Drawer ────────────────────────────────────────────────────
  function BankDrawer({ banks, close }) {
    const [sel, setSel] = useState(banks.map((b) => b.id));
    const visible = D.banks.filter((b) => sel.includes(b.id));
    const rows = [
      ["PEA", "pea"], ["CTO", "cto"], ["Assurance-vie", "av"], ["PER", "per"], ["Livret A", "livret"],
    ];

    return React.createElement("div", { className: "fade-in", style: { position: "absolute", inset: 0, background: "var(--canvas)", display: "flex", flexDirection: "column", zIndex: 2 } },
      React.createElement("div", { className: "row gap12", style: { height: 52, padding: "0 20px", borderBottom: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("button", { className: "btn btn-ghost btn-icon btn-sm", onClick: close }, React.createElement(I.chevron, { s: 15, style: { transform: "rotate(180deg)" } })),
        React.createElement("span", { className: "title" }, "Comparer les courtiers"),
        React.createElement("span", { className: "badge" }, D.banks.length + " établissements"),
        React.createElement("div", { className: "grow" }),
        React.createElement("button", { className: "btn btn-primary btn-sm" }, React.createElement(I.import, { s: 14 }), "Importer la sélection")),

      // bank selectors
      React.createElement("div", { className: "row gap8", style: { padding: "14px 20px", borderBottom: "1px solid var(--hairline)", flexWrap: "wrap", flex: "none" } },
        D.banks.map((b) =>
          React.createElement("div", { key: b.id, className: "chip" + (sel.includes(b.id) ? " chip-active" : ""), onClick: () => setSel((s) => s.includes(b.id) ? s.filter((x) => x !== b.id) : [...s, b.id]) },
            React.createElement("span", { className: "mono", style: { fontSize: 11 } }, b.name),
            sel.includes(b.id) && React.createElement(I.check, { s: 12, className: "accent" })))),

      React.createElement("div", { className: "scroll", style: { flex: 1, padding: "0 20px 40px" } },
        // header row
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "160px " + visible.map(() => "1fr").join(" "), gap: 0, paddingTop: 20, marginBottom: 4 } },
          React.createElement("div"),
          visible.map((b) =>
            React.createElement("div", { key: b.id, style: { padding: "0 12px 12px", borderBottom: "2px solid var(--primary)" } },
              React.createElement("div", { className: "title", style: { fontSize: 14 } }, b.name),
              React.createElement("div", { className: "caption" }, b.type)))),

        // fee rows
        rows.map(([label, key], ri) =>
          React.createElement("div", { key: key, style: { display: "grid", gridTemplateColumns: "160px " + visible.map(() => "1fr").join(" "), background: ri % 2 === 0 ? "var(--surface-1)" : "transparent", borderRadius: "var(--r-sm)" } },
            React.createElement("div", { className: "eyebrow", style: { padding: "12px 0 12px 2px", display: "flex", alignItems: "center" } }, label),
            visible.map((b) =>
              React.createElement("div", { key: b.id, style: { padding: "12px", display: "flex", alignItems: "center" } },
                React.createElement("span", { className: "mono subhead", style: { fontSize: 13, color: b[key] === "—" ? "var(--ink-tertiary)" : "var(--ink)" } }, b[key]))))),

        // pros/cons
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "160px " + visible.map(() => "1fr").join(" "), gap: 0, marginTop: 16 } },
          React.createElement("div"),
          visible.map((b) =>
            React.createElement("div", { key: b.id, style: { padding: "12px" } },
              b.pros.map((p, i) => React.createElement("div", { key: i, className: "row gap6 small", style: { marginBottom: 4, color: "var(--success)" } }, React.createElement(I.check, { s: 12 }), p)),
              b.cons.map((c, i) => React.createElement("div", { key: i, className: "row gap6 small", style: { marginBottom: 4, color: "var(--ink-subtle)" } }, React.createElement(I.close, { s: 12 }), c)))))));
  }

  // ── Main Data Modal ────────────────────────────────────────────────────────
  function DataModal({ close }) {
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("Tous");
    const [tab, setTab] = useState("assets"); // "assets" | "banks"
    const [bankDrawer, setBankDrawer] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
      inputRef.current && inputRef.current.focus();
      const onKey = (e) => { if (e.key === "Escape") close(); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

    return React.createElement("div", { className: "modal-full" },
      // top bar
      React.createElement("div", { className: "row gap12", style: { height: 52, padding: "0 20px", borderBottom: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("button", { className: "btn btn-ghost btn-icon btn-sm", onClick: close }, React.createElement(I.close, { s: 15 })),
        React.createElement("div", { className: "vdivider", style: { height: 20 } }),
        React.createElement("span", { className: "title", style: { fontSize: 15 } }, "Banque de données"),
        React.createElement("span", { className: "live-dot dot", style: { background: "var(--success)", width: 6, height: 6 } }),
        React.createElement("span", { className: "caption" }, "Données mises à jour"),
        React.createElement("div", { className: "grow" }),
        React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setBankDrawer(true) },
          React.createElement(I.bank, { s: 14 }), "Comparer les courtiers"),
        React.createElement("button", { className: "btn btn-ghost btn-sm" },
          React.createElement(I.refresh, { s: 14 }), "Actualiser")),

      // search row
      React.createElement("div", { className: "row gap12", style: { padding: "12px 20px", borderBottom: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("div", { className: "row gap10", style: { flex: 1, height: 36, padding: "0 12px", background: "var(--surface-2)", border: "1px solid var(--hairline)", borderRadius: "var(--r-md)" } },
          React.createElement(I.search, { s: 16, className: "muted" }),
          React.createElement("input", { ref: inputRef, className: "input", style: { border: "none", background: "transparent", height: "100%", padding: 0, flex: 1 }, value: q, onChange: (e) => setQ(e.target.value), placeholder: "Rechercher un actif, un ticker, une catégorie…" })),
        React.createElement("div", { className: "seg" },
          CATS.map((c) => React.createElement("button", { key: c, className: cat === c ? "on" : "", onClick: () => setCat(c) }, c))),
        React.createElement("div", { className: "seg" },
          [["assets", React.createElement(I.layers, { s: 14 })], ["banks", React.createElement(I.bank, { s: 14 })]].map(([k, icon]) =>
            React.createElement("button", { key: k, className: tab === k ? "on" : "", onClick: () => setTab(k), style: { gap: 6, display: "flex", alignItems: "center" } }, icon, k === "assets" ? "Actifs" : "Courtiers")))),

      // results
      React.createElement("div", { className: "scroll", style: { flex: 1, position: "relative" } },
        React.createElement("div", { style: { padding: "0 20px 60px" } },
          tab === "assets"
            ? React.createElement(AssetTable, { q, cat })
            : React.createElement("div", { className: "col", style: { gap: 14, paddingTop: 20 } },
                D.banks.map((b, i) =>
                  React.createElement("div", { key: i, className: "panel", style: { padding: "14px 18px" } },
                    React.createElement("div", { className: "spread" },
                      React.createElement("div", null,
                        React.createElement("div", { className: "title" }, b.name),
                        React.createElement("div", { className: "caption", style: { marginTop: 3 } }, b.type)),
                      React.createElement("div", { className: "row gap8" },
                        React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setBankDrawer(true) }, "Comparer"),
                        React.createElement("button", { className: "btn btn-primary btn-sm" }, React.createElement(I.import, { s: 13 }), "Importer"))),
                    React.createElement("div", { className: "row gap16", style: { marginTop: 12, flexWrap: "wrap" } },
                      [["PEA", b.pea], ["CTO", b.cto], ["AV", b.av], ["PER", b.per], ["Livret A", b.livret]].map(([k, v]) =>
                        React.createElement("div", { key: k, className: "col", style: { gap: 1 } },
                          React.createElement("div", { className: "eyebrow" }, k),
                          React.createElement("div", { className: "mono subhead", style: { fontSize: 13, color: v === "—" ? "var(--ink-tertiary)" : "var(--ink)" } }, v))))))))),

      bankDrawer && React.createElement(BankDrawer, { banks: D.banks, close: () => setBankDrawer(false) }));
  }

  window.DataModal = DataModal;
})();
