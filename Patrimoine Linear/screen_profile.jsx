/* Profile switcher + Onboarding flow. window.ProfileScreen, window.OnboardingModal */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const D = window.DATA;
  const eur = D.eur;

  const { Avatar } = window.Shell;

  // ── Profile / Workspace Switcher ──────────────────────────────────────────
  function ProfileScreen({ close, startOnboarding }) {
    const [hov, setHov] = useState(null);

    return React.createElement("div", { className: "scrim", onMouseDown: close, style: { alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 54, paddingLeft: 8 } },
      React.createElement("div", { onMouseDown: (e) => e.stopPropagation(), style: { width: 296, background: "var(--surface-2)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)", overflow: "hidden", animation: "pop .18s var(--ease)" } },
        // current profile header
        React.createElement("div", { style: { padding: "14px 14px 12px", borderBottom: "1px solid var(--hairline)" } },
          React.createElement("div", { className: "row gap10", style: { marginBottom: 8 } },
            React.createElement(Avatar, { initials: D.profile.initials, color: D.profile.color, size: 36, radius: 10 }),
            React.createElement("div", null,
              React.createElement("div", { className: "title" }, D.profile.name),
              React.createElement("div", { className: "caption" }, "Espace personnel · 3 simulations"))),
          React.createElement("div", { className: "row gap6", style: { flexWrap: "wrap" } },
            React.createElement("span", { className: "badge" }, D.profile.age + " ans"),
            React.createElement("span", { className: "badge" }, "Horizon " + D.profile.horizon + " ans"),
            React.createElement("span", { className: "badge badge-accent" }, D.profile.scenario))),

        // other profiles
        React.createElement("div", { style: { padding: "6px 0" } },
          React.createElement("div", { className: "cmd-section" }, "Espaces de travail"),
          D.profiles.map((p, i) =>
            React.createElement("div", { key: p.id, className: "cmd-row" + (p.active ? " on" : ""), onMouseEnter: () => setHov(p.id), onMouseLeave: () => setHov(null), onClick: close, style: { justifyContent: "flex-start", margin: "1px 6px", borderRadius: "var(--r-sm)", padding: "0 10px" } },
              React.createElement(Avatar, { initials: p.initials, color: p.color, size: 22, radius: 6 }),
              React.createElement("div", { className: "grow" },
                React.createElement("div", { className: "subhead", style: { fontSize: 13 } }, p.name),
                React.createElement("div", { className: "caption", style: { fontSize: 11 } }, p.sims + " simulation" + (p.sims > 1 ? "s" : ""))),
              p.active && React.createElement("span", { className: "badge badge-accent" }, "Actif"),
              !p.active && hov === p.id && React.createElement("span", { className: "caption", style: { fontSize: 11.5 } }, "Basculer")))),

        // actions
        React.createElement("div", { style: { borderTop: "1px solid var(--hairline)", padding: "6px 0" } },
          React.createElement("div", { className: "cmd-row", onClick: () => { startOnboarding(); close(); }, style: { margin: "1px 6px" } },
            React.createElement("span", { className: "ci" }, React.createElement(I.plus, { s: 15 })),
            React.createElement("span", null, "Créer un espace")),
          React.createElement("div", { className: "cmd-row", onClick: () => { startOnboarding(); close(); }, style: { margin: "1px 6px" } },
            React.createElement("span", { className: "ci" }, React.createElement(I.user, { s: 15 })),
            React.createElement("span", null, "Reconfigurer le profil")),
          React.createElement("div", { className: "cmd-row", style: { margin: "1px 6px", color: "var(--danger)" } },
            React.createElement("span", { className: "ci", style: { color: "var(--danger)" } }, React.createElement(I.close, { s: 15 })),
            React.createElement("span", null, "Déconnexion")))));
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  const STEPS = [
    { id: "welcome", title: null },
    { id: "profile", title: "Parlez-nous de vous" },
    { id: "objective", title: "Votre objectif financier" },
    { id: "envelopes", title: "Vos enveloppes actuelles" },
    { id: "done", title: null },
  ];

  function StepDots({ cur }) {
    return React.createElement("div", { className: "row gap6", style: { width: 200 } },
      STEPS.map((s, i) => React.createElement("div", { key: s.id, className: "step-dot" + (i < cur ? " done" : i === cur ? " cur" : "") })));
  }

  function ChoiceCard({ label, sub, icon, on, onClick }) {
    return React.createElement("button", { className: "scard" + (on ? " on" : ""), onClick, style: { display: "flex", flexDirection: "column", gap: 6, flex: 1 } },
      icon && React.createElement("span", { style: { fontSize: 22 } }, icon),
      React.createElement("div", { className: "subhead" }, label),
      sub && React.createElement("div", { className: "caption", style: { fontWeight: 400 } }, sub));
  }

  function EnvRow({ env, on, toggle }) {
    return React.createElement("div", { className: "row gap12", style: { padding: "12px 14px", border: "1px solid " + (on ? "var(--primary)" : "var(--hairline)"), borderRadius: "var(--r-md)", background: on ? "var(--primary-tint)" : "var(--surface-1)", cursor: "pointer", marginBottom: 6, transition: "all .14s" }, onClick: toggle },
      React.createElement("span", { style: { width: 10, height: 10, borderRadius: 3, background: env.hue, flex: "none" } }),
      React.createElement("div", { className: "grow" },
        React.createElement("div", { className: "subhead" }, env.label),
        React.createElement("div", { className: "caption" }, env.type)),
      on && React.createElement(I.check, { s: 15, className: "accent" }));
  }

  function OnboardingModal({ close }) {
    const [step, setStep] = useState(0);
    const [age, setAge] = useState(25);
    const [salary, setSalary] = useState(2500);
    const [monthly, setMonthly] = useState(500);
    const [horizon, setHorizon] = useState(20);
    const [goal, setGoal] = useState(null);
    const [selEnvs, setSelEnvs] = useState(new Set(["pea"]));
    const toggleEnv = (id) => setSelEnvs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const next = () => { if (step < STEPS.length - 1) setStep(s => s + 1); else close(); };
    const back = () => { if (step > 0) setStep(s => s - 1); };

    const GOALS = [
      { id: "retraite", label: "Retraite anticipée", sub: "FIRE · liberté financière", icon: "🏖️" },
      { id: "immo", label: "Acquisition immobilière", sub: "Apport + remboursement", icon: "🏡" },
      { id: "capital", label: "Constituer un capital", sub: "Croissance long terme", icon: "📈" },
      { id: "complémentaire", label: "Revenu complémentaire", sub: "Dividendes & coupons", icon: "💸" },
    ];

    const body = () => {
      if (step === 0) return React.createElement("div", { className: "col", style: { alignItems: "center", textAlign: "center", gap: 24, padding: "16px 0" } },
        React.createElement("div", { style: { width: 60, height: 60, borderRadius: 18, background: "var(--primary-tint)", display: "flex", alignItems: "center", justifyContent: "center" } },
          React.createElement(I.spark, { s: 30, className: "accent" })),
        React.createElement("div", null,
          React.createElement("h2", { className: "display", style: { marginBottom: 10 } }, "Bienvenue dans Patrimoine"),
          React.createElement("p", { className: "muted", style: { fontSize: 15, lineHeight: 1.6, maxWidth: 380 } }, "Un simulateur de patrimoine pensé comme un outil de travail. Rapide, précis, sans fioritures.")),
        React.createElement("div", { className: "row gap24", style: { marginTop: 8 } },
          [["Simulation Monte-Carlo", I.spark], ["Optimisation fiscale", I.shield], ["Multi-enveloppes", I.layers]].map(([l, Icon], i) =>
            React.createElement("div", { key: i, className: "col", style: { alignItems: "center", gap: 7 } },
              React.createElement("div", { style: { width: 36, height: 36, borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center" } },
                React.createElement(Icon, { s: 17, className: "muted" })),
              React.createElement("span", { className: "caption", style: { fontSize: 12 } }, l)))));

      if (step === 1) return React.createElement("div", { className: "col", style: { gap: 20 } },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } },
          [["Votre âge", age, setAge, 18, 60, "ans"], ["Salaire net / mois", salary, setSalary, 1000, 10000, "€"]].map(([label, val, set, min, max, unit]) =>
            React.createElement("div", { key: label },
              React.createElement("label", { className: "eyebrow", style: { display: "block", marginBottom: 7 } }, label),
              React.createElement("div", { className: "row gap8" },
                React.createElement("input", { type: "range", min, max, value: val, onChange: (e) => set(+e.target.value), style: { flex: 1, accentColor: "var(--primary)" } }),
                React.createElement("span", { className: "mono subhead", style: { width: 80, textAlign: "right" } }, val.toLocaleString("fr-FR") + " " + unit))))),
        React.createElement("div", null,
          React.createElement("label", { className: "eyebrow", style: { display: "block", marginBottom: 7 } }, "Versement mensuel souhaité"),
          React.createElement("div", { className: "row gap8" },
            React.createElement("input", { type: "range", min: 50, max: 3000, step: 50, value: monthly, onChange: (e) => setMonthly(+e.target.value), style: { flex: 1, accentColor: "var(--primary)" } }),
            React.createElement("span", { className: "mono subhead", style: { width: 80, textAlign: "right" } }, monthly.toLocaleString("fr-FR") + " €"))),
        React.createElement("div", null,
          React.createElement("label", { className: "eyebrow", style: { display: "block", marginBottom: 7 } }, "Horizon de simulation"),
          React.createElement("div", { className: "row gap8" },
            React.createElement("input", { type: "range", min: 5, max: 40, step: 5, value: horizon, onChange: (e) => setHorizon(+e.target.value), style: { flex: 1, accentColor: "var(--primary)" } }),
            React.createElement("span", { className: "mono subhead", style: { width: 80, textAlign: "right" } }, horizon + " ans"))),
        React.createElement("div", { className: "panel", style: { padding: 12, marginTop: 4 } },
          React.createElement("div", { className: "row gap24" },
            [["Taux d'épargne", (monthly / salary * 100).toFixed(0) + " %"], ["Retraite visée", (age + horizon) + " ans"], ["Effort annuel", eur(monthly * 12)]].map(([k, v]) =>
              React.createElement("div", { key: k },
                React.createElement("div", { className: "eyebrow" }, k),
                React.createElement("div", { className: "mono subhead" }, v))))));

      if (step === 2) return React.createElement("div", { className: "col", style: { gap: 14 } },
        React.createElement("div", { className: "caption", style: { marginBottom: 4 } }, "Quel est votre objectif principal ? Vous pourrez en ajouter d'autres plus tard."),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          GOALS.map((g) => React.createElement(ChoiceCard, { key: g.id, label: g.label, sub: g.sub, icon: g.icon, on: goal === g.id, onClick: () => setGoal(g.id) }))));

      if (step === 3) return React.createElement("div", { className: "col", style: { gap: 4 } },
        React.createElement("div", { className: "caption", style: { marginBottom: 10 } }, "Cochez les enveloppes que vous utilisez déjà ou souhaitez activer."),
        D.envelopes.map((e) => React.createElement(EnvRow, { key: e.id, env: e, on: selEnvs.has(e.id), toggle: () => toggleEnv(e.id) })));

      if (step === 4) return React.createElement("div", { className: "col", style: { alignItems: "center", textAlign: "center", gap: 20, padding: "12px 0" } },
        React.createElement("div", { style: { width: 60, height: 60, borderRadius: 99, background: "var(--success-dim)", display: "flex", alignItems: "center", justifyContent: "center" } },
          React.createElement(I.check, { s: 28, style: { color: "var(--success)" } })),
        React.createElement("div", null,
          React.createElement("h2", { className: "headline", style: { marginBottom: 8 } }, "Votre espace est prêt"),
          React.createElement("p", { className: "muted", style: { fontSize: 14, lineHeight: 1.6, maxWidth: 360 } }, selEnvs.size + " enveloppe" + (selEnvs.size > 1 ? "s" : "") + " configurée" + (selEnvs.size > 1 ? "s" : "") + " · " + horizon + " ans d'horizon · objectif " + (GOALS.find(g => g.id === goal)?.label || "long terme"))),
        React.createElement("div", { className: "col", style: { gap: 8, width: "100%", maxWidth: 320, marginTop: 8 } },
          [["Revenu mensuel versé", eur(monthly) + "/mois", "primary-hover"], ["Horizon", horizon + " ans", "ink"], ["Retraite visée", (age + horizon) + " ans", "ink"]].map(([k, v, tone]) =>
            React.createElement("div", { key: k, className: "spread panel", style: { padding: "10px 14px" } },
              React.createElement("span", { className: "caption" }, k),
              React.createElement("span", { className: "mono subhead", style: { color: `var(--${tone})` } }, v)))));
    };

    return React.createElement("div", { className: "scrim", style: { alignItems: "flex-start", justifyContent: "center", paddingTop: "6vh" } },
      React.createElement("div", { className: "fade-in", style: { width: 540, background: "var(--surface-2)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-pop)", overflow: "hidden" },
        onMouseDown: (e) => e.stopPropagation() },
        // header
        React.createElement("div", { className: "row gap12", style: { padding: "18px 20px", borderBottom: "1px solid var(--hairline)" } },
          React.createElement("div", { className: "col grow", style: { gap: 4 } },
            step > 0 && step < STEPS.length - 1 && React.createElement("div", { className: "eyebrow" }, "Étape " + step + " / " + (STEPS.length - 2)),
            React.createElement("div", { className: "title", style: { fontSize: step === 0 || step === 4 ? 14 : 15 } }, STEPS[step].title || (step === 0 ? "Configuration" : "Terminé"))),
          React.createElement("button", { className: "btn btn-ghost btn-icon btn-sm", onClick: close }, React.createElement(I.close, { s: 15 }))),

        // step dots
        React.createElement("div", { style: { padding: "12px 20px 0" } }, React.createElement(StepDots, { cur: step })),

        // body
        React.createElement("div", { className: "scroll", style: { padding: "18px 20px", maxHeight: "55vh", overflowY: "auto" } }, body()),

        // footer
        React.createElement("div", { className: "spread", style: { padding: "14px 20px", borderTop: "1px solid var(--hairline)" } },
          step > 0 && step < STEPS.length - 1
            ? React.createElement("button", { className: "btn btn-ghost btn-sm", onClick: back }, React.createElement(I.chevron, { s: 13, style: { transform: "rotate(180deg)" } }), "Retour")
            : React.createElement("div"),
          React.createElement("button", { className: "btn btn-primary", onClick: next, style: { minWidth: 120 } },
            step === 0 ? "Commencer" : step === STEPS.length - 1 ? React.createElement(React.Fragment, null, React.createElement(I.play, { s: 14 }), "Lancer la simulation") : step === STEPS.length - 2 ? React.createElement(React.Fragment, null, React.createElement(I.check, { s: 14 }), "Confirmer") : React.createElement(React.Fragment, null, "Suivant ", React.createElement(I.chevron, { s: 13 }))))));
  }

  window.ProfileScreen = ProfileScreen;
  window.OnboardingModal = OnboardingModal;
})();
