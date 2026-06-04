/* Envelopes — Linear "project + issues" view. window.EnvelopesScreen */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const D = window.DATA;
  const eur = D.eur;

  const typeBadge = (t) => ({ PEA: "PEA", CTO: "CTO", AV: "AV", Livret: "Livret" }[t] || t);

  function RiskDots({ n }) {
    return React.createElement("span", { className: "risk" }, [1, 2, 3, 4, 5].map((i) =>
      React.createElement("i", { key: i, className: i <= n ? "f" : "" })));
  }

  function AssetRow({ a, hue, onOpen }) {
    return React.createElement("div", { className: "lrow", onClick: onOpen, style: { paddingLeft: 44, height: 42 } },
      React.createElement("span", { className: "dot", style: { width: 6, height: 6, background: hue, flex: "none" } }),
      React.createElement("div", { style: { minWidth: 0, width: 240, display: "flex", alignItems: "baseline", gap: 8 } },
        React.createElement("span", { className: "subhead", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, a.name),
        a.ticker && React.createElement("span", { className: "mono caption", style: { fontSize: 11 } }, a.ticker)),
      React.createElement("span", { className: "badge", style: { flex: "none" } }, a.cls),
      React.createElement("div", { className: "grow row gap8", style: { maxWidth: 220 } },
        React.createElement("div", { className: "meter grow", style: { maxWidth: 120 } }, React.createElement("i", { style: { width: a.alloc + "%", background: hue } })),
        React.createElement("span", { className: "mono small", style: { width: 40, textAlign: "right" } }, a.alloc + " %")),
      React.createElement(RiskDots, { n: a.risk }),
      React.createElement("span", { className: "mono small pos", style: { width: 56, textAlign: "right" } }, a.ret.toFixed(1) + " %"));
  }

  function Group({ env, open, toggle, onOpenEnv, selected }) {
    const pct = Math.round((env.contribution / D.effort) * 100);
    return React.createElement("div", { style: { border: "1px solid var(--hairline)", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: 10, background: "var(--canvas)" } },
      React.createElement("div", { className: "group-head" + (selected ? " " : ""), onClick: toggle, style: selected ? { background: "var(--surface-2)" } : null },
        React.createElement(I.chevron, { s: 13, className: "chevron" + (open ? " open" : "") }),
        React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: env.hue, flex: "none" } }),
        React.createElement("span", { className: "title", style: { fontSize: 14.5 } }, env.label),
        React.createElement("span", { className: "badge" }, typeBadge(env.type)),
        React.createElement("span", { className: "caption", style: { fontSize: 11.5 } }, env.assets.length + " actif" + (env.assets.length > 1 ? "s" : "")),
        React.createElement("div", { className: "grow" }),
        React.createElement("span", { className: "mono small muted", title: "Capital actuel" }, eur(env.capital)),
        React.createElement("div", { className: "row gap6", style: { width: 150 } },
          React.createElement("div", { className: "meter grow" }, React.createElement("i", { style: { width: pct + "%", background: env.hue } })),
          React.createElement("span", { className: "mono small", style: { width: 64, textAlign: "right" } }, eur(env.contribution) + "/m")),
        React.createElement("span", { className: "mono small pos", style: { width: 54, textAlign: "right" } }, env.ret.toFixed(1) + " %"),
        React.createElement("button", { className: "btn btn-ghost btn-icon btn-sm", onClick: (e) => { e.stopPropagation(); onOpenEnv(env.id); }, title: "Paramètres" },
          React.createElement(I.sliders, { s: 15 }))),
      open && React.createElement("div", { className: "fade-in", style: { background: "var(--canvas)" } },
        env.assets.map((a) => React.createElement(AssetRow, { key: a.id, a, hue: env.hue, onOpen: () => onOpenEnv(env.id) })),
        React.createElement("div", { className: "lrow", onClick: () => onOpenEnv(env.id), style: { paddingLeft: 44, height: 38, color: "var(--ink-tertiary)", borderBottom: "none" } },
          React.createElement(I.plus, { s: 13 }),
          React.createElement("span", { className: "small" }, "Ajouter un actif"))));
  }

  // ── Detail panel ──────────────────────────────────────────────────────────
  function DetailPanel({ env, close, openData }) {
    const pct = Math.round((env.contribution / D.effort) * 100);
    return React.createElement("aside", { className: "detail-panel" },
      React.createElement("div", { className: "spread", style: { height: 52, padding: "0 16px", borderBottom: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("div", { className: "row gap8" },
          React.createElement("span", { style: { width: 9, height: 9, borderRadius: 3, background: env.hue } }),
          React.createElement("span", { className: "title" }, env.label),
          React.createElement("span", { className: "badge" }, typeBadge(env.type))),
        React.createElement("button", { className: "btn btn-ghost btn-icon btn-sm", onClick: close }, React.createElement(I.close, { s: 15 }))),

      React.createElement("div", { className: "scroll", style: { flex: 1, padding: 18 } },
        // contribution
        React.createElement("div", { className: "eyebrow", style: { marginBottom: 8 } }, "Versement mensuel"),
        React.createElement("div", { className: "row gap8", style: { marginBottom: 6 } },
          React.createElement("div", { className: "input mono", style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: 130 } },
            React.createElement("span", null, env.contribution), React.createElement("span", { className: "tertiary" }, "€")),
          React.createElement("div", { className: "grow" }),
          React.createElement("span", { className: "caption" }, pct + " % de l'effort")),
        React.createElement("div", { className: "meter", style: { marginBottom: 20 } }, React.createElement("i", { style: { width: pct + "%", background: env.hue } })),

        // fiscalité
        React.createElement("div", { className: "eyebrow", style: { marginBottom: 8 } }, "Fiscalité"),
        React.createElement("div", { className: "panel", style: { padding: 12, marginBottom: 20 } },
          React.createElement("div", { className: "spread" },
            React.createElement("span", { className: "small muted" }, "Imposition des gains"),
            React.createElement("span", { className: "subhead mono" }, env.tax)),
          React.createElement("div", { className: "caption", style: { marginTop: 4 } }, env.taxNote)),

        // banque
        React.createElement("div", { className: "spread", style: { marginBottom: 8 } },
          React.createElement("div", { className: "eyebrow" }, "Banque & frais"),
          React.createElement("button", { className: "btn btn-ghost btn-sm", onClick: openData }, React.createElement(I.import, { s: 13 }), "Importer")),
        React.createElement("div", { className: "panel", style: { padding: 12, marginBottom: 20 } },
          React.createElement("div", { className: "row gap8", style: { marginBottom: 6 } },
            React.createElement(I.bank, { s: 15, className: "muted" }),
            React.createElement("span", { className: "subhead" }, env.bank)),
          React.createElement("div", { className: "caption mono" }, env.fees)),

        // allocation
        React.createElement("div", { className: "spread", style: { marginBottom: 10 } },
          React.createElement("div", { className: "eyebrow" }, "Allocation d'actifs"),
          React.createElement("span", { className: "caption mono" }, env.assets.length + " · 100 %")),
        React.createElement("div", { className: "col gap10" }, env.assets.map((a) =>
          React.createElement("div", { key: a.id, style: { padding: "9px 11px", border: "1px solid var(--hairline)", borderRadius: "var(--r-md)", background: "var(--surface-2)" } },
            React.createElement("div", { className: "spread", style: { marginBottom: 7 } },
              React.createElement("div", { className: "row gap6", style: { minWidth: 0 } },
                React.createElement("span", { className: "subhead", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, a.name),
                a.ticker && React.createElement("span", { className: "mono caption", style: { fontSize: 10.5 } }, a.ticker)),
              React.createElement("span", { className: "mono small", style: { flex: "none" } }, a.alloc + " %")),
            React.createElement("div", { className: "meter" }, React.createElement("i", { style: { width: a.alloc + "%", background: env.hue } }))))),
        React.createElement("button", { className: "btn btn-secondary btn-sm", style: { width: "100%", marginTop: 12, justifyContent: "center" } },
          React.createElement(I.plus, { s: 14 }), "Ajouter un actif")),

      React.createElement("div", { className: "row gap8", style: { padding: 14, borderTop: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("button", { className: "btn btn-ghost btn-sm neg", style: { color: "var(--danger)" } }, "Supprimer"),
        React.createElement("div", { className: "grow" }),
        React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: close }, "Fermer"),
        React.createElement("button", { className: "btn btn-primary btn-sm" }, "Enregistrer")));
  }

  function FilterChip({ icon, label, value }) {
    return React.createElement("div", { className: "chip" },
      React.createElement(window.Icons[icon], { s: 14, className: "tertiary" }),
      React.createElement("span", { className: "muted", style: { fontSize: 12 } }, label),
      React.createElement("span", { className: "ink", style: { fontSize: 12, fontWeight: 500 } }, value));
  }

  function EnvelopesScreen({ openData, runSim, isRunning }) {
    const [openIds, setOpenIds] = useState(() => new Set(["pea", "cto"]));
    const [selId, setSelId] = useState(null);
    const sel = D.envelopes.find((e) => e.id === selId);
    const toggle = (id) => setOpenIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    return React.createElement("div", { style: { flex: 1, display: "flex", minWidth: 0 } },
      React.createElement("div", { className: "content", style: { borderRight: sel ? "none" : "none" } },
        // subheader
        React.createElement("div", { className: "subhead-bar" },
          React.createElement("h1", { className: "title", style: { fontSize: 15 } }, "Enveloppes"),
          React.createElement("span", { className: "badge" }, D.envelopes.length),
          React.createElement("div", { className: "grow" }),
          React.createElement("button", { className: "btn btn-secondary btn-sm" }, React.createElement(I.plus, { s: 14 }), "Enveloppe"),
          React.createElement("button", { className: "btn btn-primary btn-sm", onClick: runSim, disabled: isRunning },
            isRunning ? React.createElement(React.Fragment, null, React.createElement(I.refresh, { s: 14, className: "spin" }), "Calcul…") : React.createElement(React.Fragment, null, React.createElement(I.play, { s: 13 }), "Lancer la simulation"))),

        // filter bar (global params)
        React.createElement("div", { className: "row gap8", style: { padding: "10px 20px", borderBottom: "1px solid var(--hairline)", flexWrap: "wrap" } },
          React.createElement(FilterChip, { icon: "clock", label: "Horizon", value: D.profile.horizon + " ans" }),
          React.createElement(FilterChip, { icon: "user", label: "Âge", value: D.profile.age + " ans" }),
          React.createElement(FilterChip, { icon: "calendar", label: "Retraite", value: D.profile.ageRetraite + " ans" }),
          React.createElement(FilterChip, { icon: "target", label: "Scénario", value: "Central" }),
          React.createElement("div", { className: "grow" }),
          React.createElement("div", { className: "chip", style: { cursor: "default" } },
            React.createElement(I.coins, { s: 14, className: "tertiary" }),
            React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "Effort total"),
            React.createElement("span", { className: "mono ink", style: { fontSize: 12.5, fontWeight: 500 } }, eur(D.effort) + "/mois"))),

        // list
        React.createElement("div", { className: "scroll", style: { flex: 1, padding: "16px 20px 40px" } },
          React.createElement("div", { className: "row", style: { padding: "0 14px 8px", gap: 12 } },
            React.createElement("span", { className: "eyebrow grow" }, D.envelopes.length + " enveloppes · " + D.envelopes.reduce((s, e) => s + e.assets.length, 0) + " actifs"),
            React.createElement("span", { className: "eyebrow", style: { width: 150, textAlign: "right" } }, "Versement"),
            React.createElement("span", { className: "eyebrow", style: { width: 54, textAlign: "right" } }, "Rdt.")),
          D.envelopes.map((env) => React.createElement(Group, { key: env.id, env, open: openIds.has(env.id), toggle: () => toggle(env.id), onOpenEnv: setSelId, selected: selId === env.id })),
          React.createElement("button", { className: "lrow", onClick: () => {}, style: { width: "100%", border: "1px dashed var(--hairline-strong)", borderRadius: "var(--r-lg)", background: "transparent", color: "var(--ink-subtle)", height: 44, marginTop: 4, justifyContent: "center" } },
            React.createElement(I.plus, { s: 15 }), React.createElement("span", { className: "subhead" }, "Ajouter une enveloppe")))),

      sel && React.createElement(DetailPanel, { env: sel, close: () => setSelId(null), openData }));
  }

  window.EnvelopesScreen = EnvelopesScreen;
})();
