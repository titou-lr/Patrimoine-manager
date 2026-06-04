/* Dashboard — Linear "home". window.DashboardScreen */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const D = window.DATA;
  const C = window.Charts;
  const eur = D.eur;

  function KPI({ label, value, sub, hero, tone }) {
    return React.createElement("div", { className: "kpi" },
      React.createElement("div", { className: "kpi-label" }, label),
      React.createElement("div", { className: "kpi-value" + (hero ? " hero" : ""), style: tone ? { color: `var(--${tone})` } : null }, value),
      sub && React.createElement("div", { className: "caption row gap4", style: { fontSize: 11.5 } }, sub));
  }

  function Alert({ a }) {
    const warn = a.kind === "warn";
    return React.createElement("div", { className: "row gap12", style: { padding: "11px 14px", borderRadius: "var(--r-md)", background: "var(--surface-1)", border: "1px solid var(--hairline)", alignItems: "flex-start" } },
      React.createElement("span", { style: { color: warn ? "var(--warning)" : "var(--primary-hover)", marginTop: 1 } }, React.createElement(warn ? I.warn : I.info, { s: 16 })),
      React.createElement("div", { className: "grow" },
        React.createElement("div", { className: "subhead" }, a.title),
        React.createElement("div", { className: "caption", style: { marginTop: 2 } }, a.body)),
      React.createElement("button", { className: "btn btn-ghost btn-sm" }, "Voir"));
  }

  function Milestone({ m }) {
    return React.createElement("div", { className: "row gap12", style: { padding: "10px 0", borderBottom: "1px solid var(--hairline-soft)" } },
      React.createElement("span", { style: { display: "flex", width: 22, height: 22, borderRadius: 99, alignItems: "center", justifyContent: "center", flex: "none",
        background: m.done ? "var(--success-dim)" : "var(--surface-3)", color: m.done ? "var(--success)" : "var(--ink-tertiary)", border: m.done ? "none" : "1px solid var(--hairline)" } },
        m.done ? React.createElement(I.check, { s: 13 }) : React.createElement(I.flag, { s: 12 })),
      React.createElement("div", { className: "grow" },
        React.createElement("div", { className: "subhead", style: { color: m.done ? "var(--ink)" : "var(--ink-muted)" } }, m.label),
        React.createElement("div", { className: "caption", style: { fontSize: 11.5 } }, "An " + m.year + " · " + m.age + " ans")),
      React.createElement("span", { className: "mono", style: { fontSize: 13, color: m.done ? "var(--ink)" : "var(--ink-subtle)" } }, eur(m.amount)));
  }

  function ActivityRow({ a }) {
    return React.createElement("div", { className: "row gap12", style: { padding: "9px 0", alignItems: "flex-start" } },
      React.createElement("div", { className: "avatar", style: { width: 22, height: 22, borderRadius: 99, background: a.color, fontSize: 9.5, flex: "none", marginTop: 1 } }, a.who),
      React.createElement("div", { className: "grow", style: { fontSize: 13 } },
        React.createElement("span", { className: "ink" }, D.profile.name), " ",
        React.createElement("span", { className: "muted" }, a.text),
        React.createElement("div", { className: "caption mono", style: { fontSize: 11.5, marginTop: 1 } }, a.meta)),
      React.createElement("span", { className: "caption", style: { fontSize: 11.5, whiteSpace: "nowrap" } }, a.time));
  }

  function DashboardScreen({ go }) {
    const [range, setRange] = useState("max");
    const gainPct = ((D.last.gain / D.last.contrib) * 100).toFixed(0);

    return React.createElement("div", { className: "scroll fade-in", style: { flex: 1, padding: "26px 32px 60px" } },
      React.createElement("div", { style: { maxWidth: 1180, margin: "0 auto" } },

        // Header
        React.createElement("div", { className: "spread", style: { marginBottom: 22 } },
          React.createElement("div", null,
            React.createElement("div", { className: "row gap8", style: { marginBottom: 4 } },
              React.createElement("h1", { className: "headline" }, "Tableau de bord"),
              React.createElement("span", { className: "badge badge-accent" }, D.profile.scenario)),
            React.createElement("div", { className: "caption" }, "Projection sur " + D.profile.horizon + " ans · retraite visée à " + D.profile.ageRetraite + " ans · profil équilibré")),
          React.createElement("div", { className: "row gap8" },
            React.createElement("button", { className: "btn btn-secondary btn-sm" }, React.createElement(I.import, { s: 14 }), "Exporter"),
            React.createElement("button", { className: "btn btn-primary btn-sm", onClick: () => go("envelopes") }, React.createElement(I.play, { s: 13 }), "Relancer"))),

        // KPI inline row
        React.createElement("div", { className: "kpi-row", style: { padding: "16px 0 22px", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", marginBottom: 24, flexWrap: "wrap", rowGap: 16 } },
          React.createElement(KPI, { label: "Capital à terme", value: eur(D.last.capital), hero: true, sub: React.createElement(React.Fragment, null, React.createElement("span", { className: "pos row gap4" }, React.createElement(I.arrowUp, { s: 11 }), "+" + gainPct + "%"), React.createElement("span", { className: "tertiary" }, "vs versé")) }),
          React.createElement(KPI, { label: "Plus-values", value: "+" + eur(D.last.gain), tone: "success" }),
          React.createElement(KPI, { label: "Total versé", value: eur(D.last.contrib) }),
          React.createElement(KPI, { label: "Effort mensuel", value: eur(D.effort) + "/mois" }),
          React.createElement(KPI, { label: "Rendement net", value: "5,5 %/an" }),
          React.createElement(KPI, { label: "Patrimoine actuel", value: eur(D.totalCapital) })),

        // Alerts
        D.alerts.length > 0 && React.createElement("div", { className: "col gap8", style: { marginBottom: 24 } }, D.alerts.map((a, i) => React.createElement(Alert, { key: i, a }))),

        // Hero chart
        React.createElement("div", { className: "panel", style: { padding: "18px 20px 14px", marginBottom: 24 } },
          React.createElement("div", { className: "spread", style: { marginBottom: 10 } },
            React.createElement("div", null,
              React.createElement("div", { className: "title" }, "Projection du patrimoine"),
              React.createElement("div", { className: "row gap16", style: { marginTop: 7 } },
                React.createElement("span", { className: "row gap6 caption" }, React.createElement("span", { style: { width: 14, height: 2.5, borderRadius: 9, background: "#828fff" } }), "Capital total"),
                React.createElement("span", { className: "row gap6 caption" }, React.createElement("span", { style: { width: 14, height: 0, borderTop: "1.6px dashed #6b7280" } }), "Versements cumulés"))),
            React.createElement("div", { className: "seg" },
              [["10a", "10 ans"], ["max", "Tout l'horizon"]].map(([k, l]) =>
                React.createElement("button", { key: k, className: range === k ? "on" : "", onClick: () => setRange(k) }, l)))),
          React.createElement(C.AreaProjection, { height: 304 })),

        // Milestones + Allocation
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 24, marginBottom: 24 } },
          React.createElement("div", { className: "panel", style: { padding: "16px 20px" } },
            React.createElement("div", { className: "spread", style: { marginBottom: 6 } },
              React.createElement("div", { className: "title" }, "Jalons"),
              React.createElement("span", { className: "caption" }, "2 atteints · 2 à venir")),
            D.milestones.map((m, i) => React.createElement(Milestone, { key: i, m }))),
          React.createElement("div", { className: "panel", style: { padding: "16px 20px" } },
            React.createElement("div", { className: "title", style: { marginBottom: 14 } }, "Répartition par classe"),
            React.createElement("div", { className: "row gap24", style: { justifyContent: "center" } },
              React.createElement("div", { style: { position: "relative" } },
                React.createElement(C.Donut, { size: 134, data: D.allocation, stroke: 16 }),
                React.createElement("div", { style: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } },
                  React.createElement("div", { className: "mono", style: { fontSize: 18, fontWeight: 500 } }, "58 %"),
                  React.createElement("div", { className: "caption", style: { fontSize: 10.5 } }, "actions"))),
              React.createElement("div", { className: "col gap8", style: { minWidth: 130 } },
                D.allocation.map((a, i) => React.createElement("div", { key: i, className: "row gap8" },
                  React.createElement("span", { className: "dot", style: { background: a.color } }),
                  React.createElement("span", { className: "grow small" }, a.label),
                  React.createElement("span", { className: "mono small muted" }, a.pct + " %")))))),

        // Activity
        React.createElement("div", { className: "panel", style: { padding: "16px 20px" } },
          React.createElement("div", { className: "spread", style: { marginBottom: 6 } },
            React.createElement("div", { className: "title" }, "Activité récente"),
            React.createElement("button", { className: "btn btn-ghost btn-sm" }, "Tout l'historique", React.createElement(I.chevron, { s: 13 }))),
          D.activity.map((a, i) => React.createElement(ActivityRow, { key: i, a }))))));
  }

  window.DashboardScreen = DashboardScreen;
})();
