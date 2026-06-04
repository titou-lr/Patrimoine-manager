/* Optimizer — Linear "analytics" view. window.OptimizerScreen */
(function () {
  const { useState, useRef } = React;
  const I = window.Icons;
  const D = window.DATA;
  const C = window.Charts;
  const eur = D.eur;

  function StatInline({ label, value, tone, note }) {
    return React.createElement("div", { className: "kpi", style: { padding: "2px 20px" } },
      React.createElement("div", { className: "kpi-label" }, label),
      React.createElement("div", { className: "kpi-value", style: { fontSize: 22, color: tone ? `var(--${tone})` : "var(--ink)" } }, value),
      note && React.createElement("div", { className: "caption", style: { fontSize: 11 } }, note));
  }

  function RegimeCard({ r, on, onClick }) {
    return React.createElement("button", { className: "scard", onClick, style: on ? { borderColor: r.color, background: "color-mix(in srgb, " + r.color + " 12%, transparent)", padding: 11 } : { padding: 11 } },
      React.createElement("div", { className: "row gap6", style: { marginBottom: 4 } },
        React.createElement("span", { className: "dot", style: { background: r.color } }),
        React.createElement("span", { className: "subhead", style: { fontSize: 12.5 } }, r.label),
        React.createElement("span", { className: "grow" }),
        React.createElement("span", { className: "mono caption", style: { fontSize: 11 } }, r.prob + " %")),
      React.createElement("div", { className: "caption", style: { fontSize: 10.5, lineHeight: 1.35 } }, r.desc));
  }

  function SettingsRail({ regime, setRegime, risk, setRisk, target, setTarget, nSim, setNSim, run, running }) {
    return React.createElement("aside", { style: { width: 332, flex: "none", borderLeft: "1px solid var(--hairline)", display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-1)" } },
      React.createElement("div", { className: "row gap8", style: { height: 48, padding: "0 18px", borderBottom: "1px solid var(--hairline)", flex: "none" } },
        React.createElement(I.settings, { s: 15, className: "muted" }),
        React.createElement("span", { className: "title", style: { fontSize: 14 } }, "Paramètres")),
      React.createElement("div", { className: "scroll", style: { flex: 1, padding: 18 } },
        React.createElement("div", { className: "eyebrow", style: { marginBottom: 4 } }, "Régime économique"),
        React.createElement("div", { className: "caption", style: { marginBottom: 11, fontSize: 11.5 } }, "Vide = probabilités historiques (recommandé)"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
          D.regimes.map((r) => React.createElement(RegimeCard, { key: r.key, r, on: regime === r.key, onClick: () => setRegime(regime === r.key ? null : r.key) }))),
        regime && React.createElement("button", { className: "btn btn-ghost btn-sm", style: { marginTop: 8 }, onClick: () => setRegime(null) }, React.createElement(I.refresh, { s: 13 }), "Réinitialiser"),

        React.createElement("div", { className: "divider", style: { margin: "18px 0" } }),

        React.createElement("div", { className: "eyebrow", style: { marginBottom: 8 } }, "Rendement cible net"),
        React.createElement("div", { className: "row gap8", style: { marginBottom: 18 } },
          React.createElement("div", { className: "input mono", style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: 100 } },
            React.createElement("span", null, target.toFixed(1)), React.createElement("span", { className: "tertiary" }, "%")),
          React.createElement("div", { className: "row gap4" },
            React.createElement("button", { className: "btn btn-secondary btn-icon btn-sm", onClick: () => setTarget((t) => Math.max(0, t - 0.5)) }, "−"),
            React.createElement("button", { className: "btn btn-secondary btn-icon btn-sm", onClick: () => setTarget((t) => t + 0.5) }, "+")),
          React.createElement("span", { className: "caption grow", style: { textAlign: "right" } }, "/an")),

        React.createElement("div", { className: "eyebrow", style: { marginBottom: 8 } }, "Tolérance au risque"),
        React.createElement("div", { className: "seg", style: { width: "100%", marginBottom: 6 } },
          [["prudent", "Prudent"], ["balanced", "Équilibré"], ["dynamic", "Dynamique"]].map(([k, l]) =>
            React.createElement("button", { key: k, className: (risk === k ? "on" : "") + " grow", onClick: () => setRisk(k) }, l))),
        React.createElement("div", { className: "caption", style: { marginBottom: 18, fontSize: 11.5 } },
          risk === "prudent" ? "Contrainte CVaR 95 % ≥ −10 %" : risk === "balanced" ? "Contrainte CVaR 95 % ≥ −20 %" : "Aucune contrainte CVaR"),

        React.createElement("div", { className: "eyebrow", style: { marginBottom: 8 } }, "Simulations Monte-Carlo"),
        React.createElement("div", { className: "row gap8", style: { marginBottom: 6 } },
          [500, 1000, 5000].map((n) => React.createElement("button", { key: n, className: "chip" + (nSim === n ? " chip-active" : ""), onClick: () => setNSim(n), style: { flex: 1, justifyContent: "center" } },
            React.createElement("span", { className: "mono", style: { fontSize: 12 } }, n.toLocaleString("fr-FR"))))),
        React.createElement("div", { className: "caption", style: { fontSize: 11.5 } }, "1 000 recommandé · 5 000 ≈ 10 s pour plus de précision"),

        React.createElement("div", { className: "divider", style: { margin: "18px 0" } }),
        React.createElement("div", { className: "spread", style: { marginBottom: 8 } },
          React.createElement("div", { className: "eyebrow" }, "Vues de marché"),
          React.createElement("span", { className: "caption", style: { fontSize: 11 } }, "Optionnel")),
        React.createElement("div", { className: "panel", style: { padding: "10px 12px", marginBottom: 8 } },
          React.createElement("div", { className: "row gap8 small" },
            React.createElement("span", { className: "ink" }, "ETF Nasdaq 100"),
            React.createElement("span", { className: "muted" }, "surperforme de"),
            React.createElement("span", { className: "mono accent" }, "+2,0 %"),
            React.createElement("span", { className: "grow" }),
            React.createElement("span", { className: "caption" }, "conf. 60 %"))),
        React.createElement("button", { className: "btn btn-ghost btn-sm" }, React.createElement(I.plus, { s: 13 }), "Ajouter une vue")),

      React.createElement("div", { style: { padding: 14, borderTop: "1px solid var(--hairline)", flex: "none" } },
        React.createElement("button", { className: "btn btn-primary", onClick: run, disabled: running, style: { width: "100%", justifyContent: "center", height: 36 } },
          running ? React.createElement(React.Fragment, null, React.createElement(I.refresh, { s: 15, className: "spin" }), "Optimisation…") : React.createElement(React.Fragment, null, React.createElement(I.spark, { s: 15 }), "Optimiser le portefeuille"))));
  }

  function OptimizerScreen() {
    const [regime, setRegime] = useState(null);
    const [risk, setRisk] = useState("balanced");
    const [target, setTarget] = useState(5);
    const [nSim, setNSim] = useState(1000);
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [hasResult, setHasResult] = useState(true);
    const timer = useRef(null);

    const run = () => {
      if (running) return;
      setRunning(true); setProgress(0); setHasResult(false);
      clearInterval(timer.current);
      timer.current = setInterval(() => {
        setProgress((p) => {
          const np = p + Math.random() * 16 + 6;
          if (np >= 100) { clearInterval(timer.current); setRunning(false); setHasResult(true); return 100; }
          return np;
        });
      }, 130);
    };

    return React.createElement("div", { style: { flex: 1, display: "flex", minWidth: 0 } },
      React.createElement("div", { className: "content" },
        React.createElement("div", { className: "subhead-bar" },
          React.createElement("h1", { className: "title", style: { fontSize: 15 } }, "Optimiseur de portefeuille"),
          React.createElement("span", { className: "badge badge-accent" }, "Black-Litterman + Monte-Carlo"),
          React.createElement("div", { className: "grow" }),
          hasResult && React.createElement("button", { className: "btn btn-secondary btn-sm" }, React.createElement(I.import, { s: 14 }), "Comparer"),
          hasResult && React.createElement("button", { className: "btn btn-primary btn-sm" }, React.createElement(I.check, { s: 14 }), "Appliquer l'allocation")),

        React.createElement("div", { className: "scroll", style: { flex: 1, padding: "22px 26px 50px" } },
          // KPI row
          (hasResult || running) && React.createElement("div", { className: "kpi-row", style: { padding: "0 0 20px", marginBottom: 20, borderBottom: "1px solid var(--hairline)", opacity: running ? 0.5 : 1, transition: "opacity .3s" } },
            React.createElement(StatInline, { label: "Rendement espéré net", value: "6,42 %/an", tone: "primary-hover", note: "vs 5,51 % actuel" }),
            React.createElement(StatInline, { label: "CVaR 95 %", value: "−18,4 %", tone: "danger", note: "perte en scénario adverse" }),
            React.createElement(StatInline, { label: "Ratio de Sharpe", value: "1,38", note: "> 1 = bon" }),
            React.createElement(StatInline, { label: "Amélioration", value: "+0,91 %", tone: "success", note: "de rendement net" })),

          // Monte Carlo hero
          React.createElement("div", { className: "panel", style: { padding: "16px 20px 12px", marginBottom: 22 } },
            React.createElement("div", { className: "spread", style: { marginBottom: 8 } },
              React.createElement("div", null,
                React.createElement("div", { className: "title" }, "Simulation Monte-Carlo"),
                React.createElement("div", { className: "row gap16", style: { marginTop: 7 } },
                  React.createElement("span", { className: "row gap6 caption" }, React.createElement("span", { style: { width: 14, borderTop: "1.5px dashed #4cb782" } }), "Favorable (P90)"),
                  React.createElement("span", { className: "row gap6 caption" }, React.createElement("span", { style: { width: 14, height: 2.5, background: "#828fff", borderRadius: 9 } }), "Médian (P50)"),
                  React.createElement("span", { className: "row gap6 caption" }, React.createElement("span", { style: { width: 14, borderTop: "1.5px dashed #e0795a" } }), "Défavorable (P10)"))),
              React.createElement("span", { className: "badge mono" }, nSim.toLocaleString("fr-FR") + " trajectoires")),
            running
              ? React.createElement("div", { style: { height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 } },
                  React.createElement(I.spark, { s: 26, className: "accent spin" }),
                  React.createElement("div", { className: "mono", style: { fontSize: 14 } }, Math.round(progress) + " %"),
                  React.createElement("div", { style: { width: 220, height: 4, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" } },
                    React.createElement("div", { style: { width: progress + "%", height: "100%", background: "var(--primary)", transition: "width .13s linear" } })),
                  React.createElement("div", { className: "caption" }, Math.round((progress / 100) * nSim).toLocaleString("fr-FR") + " / " + nSim.toLocaleString("fr-FR") + " trajectoires"))
              : React.createElement(React.Fragment, null,
                  React.createElement(C.MonteCarlo, { height: 320 }),
                  React.createElement("div", { className: "row", style: { justifyContent: "space-between", marginTop: 8, padding: "0 6px" } },
                    React.createElement("span", { className: "small neg" }, "Défavorable · " + eur(D.mcLast.p10)),
                    React.createElement("span", { className: "small accent", style: { fontWeight: 500 } }, "Médian · " + eur(D.mcLast.p50)),
                    React.createElement("span", { className: "small pos" }, "Favorable · " + eur(D.mcLast.p90))))),

          hasResult && React.createElement(React.Fragment, null,
            // Allocation table
            React.createElement("div", { className: "panel", style: { padding: 0, marginBottom: 22, overflow: "hidden" } },
              React.createElement("div", { className: "row gap8", style: { padding: "14px 18px", borderBottom: "1px solid var(--hairline)" } },
                React.createElement(I.grid, { s: 15, className: "muted" }),
                React.createElement("span", { className: "title" }, "Allocation optimisée")),
              React.createElement("table", { className: "tbl" },
                React.createElement("thead", null, React.createElement("tr", null,
                  ["Actif", "Enveloppe", "Avant", "Après", "Δ", "Rdt. net"].map((h, i) =>
                    React.createElement("th", { key: i, style: { background: "var(--surface-1)", position: "static", textAlign: i >= 2 ? "right" : "left" } }, h)))),
                React.createElement("tbody", null, D.optimized.map((o, i) => {
                  const delta = o.after - o.before;
                  return React.createElement("tr", { key: i },
                    React.createElement("td", null, React.createElement("span", { className: "subhead" }, o.name)),
                    React.createElement("td", { className: "muted" }, o.env),
                    React.createElement("td", { className: "num muted" }, o.before.toFixed(1) + " %"),
                    React.createElement("td", { className: "num accent", style: { fontWeight: 500 } }, o.after.toFixed(1) + " %"),
                    React.createElement("td", { className: "num", style: { color: delta >= 0 ? "var(--success)" : "var(--danger)" } }, (delta >= 0 ? "+" : "") + delta.toFixed(1)),
                    React.createElement("td", { className: "num pos" }, o.net.toFixed(1) + " %"));
                })))),

            // Regime distribution + fiscal
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 } },
              React.createElement("div", { className: "panel", style: { padding: "16px 18px" } },
                React.createElement("div", { className: "title", style: { marginBottom: 4 } }, "Distribution des régimes"),
                React.createElement("div", { className: "caption", style: { marginBottom: 8 } }, "Part simulée par horizon"),
                React.createElement(C.RegimeBars, { height: 188 }),
                React.createElement("div", { className: "row gap12", style: { flexWrap: "wrap", marginTop: 8 } },
                  D.regimes.map((r) => React.createElement("span", { key: r.key, className: "row gap6 caption" },
                    React.createElement("span", { className: "dot", style: { background: r.color, width: 7, height: 7 } }), r.label)))),
              React.createElement("div", { className: "panel", style: { padding: "16px 18px" } },
                React.createElement("div", { className: "title", style: { marginBottom: 4 } }, "Optimisation fiscale"),
                React.createElement("div", { className: "caption", style: { marginBottom: 12 } }, "Placement inter-enveloppes"),
                React.createElement("div", { className: "col gap10" }, D.locationSuggestions.map((s, i) =>
                  React.createElement("div", { key: i, style: { padding: 12, border: "1px solid var(--hairline)", borderRadius: "var(--r-md)", background: "var(--surface-2)" } },
                    React.createElement("div", { className: "row gap6", style: { marginBottom: 5 } },
                      React.createElement("span", { className: "subhead" }, s.asset),
                      React.createElement(I.arrowRight, { s: 13, className: "tertiary" }),
                      React.createElement("span", { className: "subhead accent" }, s.to)),
                    React.createElement("div", { className: "caption", style: { marginBottom: 9 } }, s.reason),
                    React.createElement("div", { className: "spread" },
                      React.createElement("span", { className: "mono pos", style: { fontSize: 13 } }, "+" + eur(s.saving) + " économisés"),
                      React.createElement("button", { className: "btn btn-secondary btn-sm" }, "Appliquer")))))))))),

      React.createElement(SettingsRail, { regime, setRegime, risk, setRisk, target, setTarget, nSim, setNSim, run, running }));
  }

  window.OptimizerScreen = OptimizerScreen;
})();
