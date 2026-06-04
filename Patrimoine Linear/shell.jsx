/* App shell — Sidebar, TopBar, CommandPalette. window.Shell */
(function () {
  const { useState, useEffect, useRef } = React;
  const I = window.Icons;
  const D = window.DATA;

  const NAV = [
    { id: "dashboard", label: "Tableau de bord", icon: "home" },
    { id: "envelopes", label: "Enveloppes", icon: "layers" },
    { id: "optimizer", label: "Optimiseur", icon: "spark" },
  ];

  function Avatar({ initials, color, size = 22, radius }) {
    return React.createElement("div", { className: "avatar", style: { width: size, height: size, background: color, fontSize: size * 0.42, borderRadius: radius || 6 } }, initials);
  }

  function WorkspaceSwitch({ onOpen }) {
    return React.createElement("div", { className: "ws-switch", onClick: onOpen },
      React.createElement(Avatar, { initials: D.profile.initials, color: D.profile.color, size: 26, radius: 7 }),
      React.createElement("div", { className: "col grow", style: { gap: 0 } },
        React.createElement("div", { className: "subhead", style: { lineHeight: 1.25 } }, D.profile.name),
        React.createElement("div", { className: "caption", style: { fontSize: 11 } }, "Espace personnel")),
      React.createElement(I.chevronDown, { s: 13, className: "tertiary" }));
  }

  function Sidebar({ route, go, openData, openProfile, openPalette, dirty }) {
    return React.createElement("aside", { className: "sidebar" },
      React.createElement(WorkspaceSwitch, { onOpen: openProfile }),
      React.createElement("div", { onClick: openPalette, className: "cmdk", style: { margin: "0 8px 6px" } },
        React.createElement(I.search, { s: 13 }),
        React.createElement("span", { className: "grow" }, "Rechercher…"),
        React.createElement("span", { className: "kbd" }, "⌘K")),
      React.createElement("nav", { className: "col", style: { gap: 1, marginTop: 4 } },
        NAV.map((n) => React.createElement("div", { key: n.id, className: "nav-item" + (route === n.id ? " on" : ""), onClick: () => go(n.id) },
          React.createElement(I[n.icon], { s: 16 }),
          React.createElement("span", { className: "grow" }, n.label),
          n.id === "envelopes" && dirty && React.createElement("span", { className: "dot", style: { background: "var(--primary)", width: 6, height: 6 } })))),
      React.createElement("div", { className: "nav-item", onClick: openData, style: { marginTop: 1 } },
        React.createElement(I.database, { s: 16 }),
        React.createElement("span", { className: "grow" }, "Banque de données"),
        React.createElement("span", { className: "live-dot dot", style: { background: "var(--success)", width: 6, height: 6 } })),

      React.createElement("div", { className: "eyebrow", style: { padding: "18px 18px 6px" } }, "Simulations"),
      React.createElement("div", { className: "col", style: { gap: 1 } },
        D.sims.map((s) => React.createElement("div", { key: s.id, className: "nav-item" + (s.active ? " on" : ""), title: s.meta },
          React.createElement("span", { className: "dot", style: { background: s.active ? "var(--primary-hover)" : "var(--hairline-strong)" } }),
          React.createElement("span", { className: "grow", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.name)))),

      React.createElement("div", { className: "grow" }),
      React.createElement("div", { className: "divider", style: { margin: "0 12px" } }),
      React.createElement("div", { className: "ws-switch", onClick: openProfile, style: { margin: 8 } },
        React.createElement(Avatar, { initials: D.profile.initials, color: D.profile.color, size: 24, radius: 99 }),
        React.createElement("div", { className: "grow subhead" }, D.profile.name),
        React.createElement(I.settings, { s: 14, className: "tertiary" })));
  }

  function TopBar({ route, go, openData, openProfile, openPalette }) {
    return React.createElement("header", { className: "topbar" },
      React.createElement("div", { className: "row gap8", style: { cursor: "pointer" }, onClick: openProfile },
        React.createElement(Avatar, { initials: D.profile.initials, color: D.profile.color, size: 24, radius: 7 }),
        React.createElement("span", { className: "subhead" }, D.profile.name),
        React.createElement(I.chevronDown, { s: 13, className: "tertiary" })),
      React.createElement("div", { className: "vdivider", style: { height: 20 } }),
      React.createElement("nav", { className: "row gap4" },
        NAV.map((n) => React.createElement("div", { key: n.id, className: "topbar-link" + (route === n.id ? " on" : ""), onClick: () => go(n.id) },
          React.createElement(I[n.icon], { s: 15 }), n.label))),
      React.createElement("div", { className: "grow" }),
      React.createElement("div", { onClick: openPalette, className: "cmdk" },
        React.createElement(I.search, { s: 13 }),
        React.createElement("span", { className: "grow" }, "Rechercher ou exécuter…"),
        React.createElement("span", { className: "kbd" }, "⌘K")),
      React.createElement("button", { className: "btn btn-ghost btn-icon", onClick: openData, title: "Banque de données" },
        React.createElement(I.database, { s: 16 })),
      React.createElement("button", { className: "btn btn-secondary btn-sm" },
        React.createElement(I.refresh, { s: 14 }), "Actualiser"));
  }

  // ── Command palette ─────────────────────────────────────────────────────
  function CommandPalette({ close, go, openData, openProfile, openOnboarding }) {
    const [q, setQ] = useState("");
    const [sel, setSel] = useState(0);
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

    const cmds = [
      { group: "Navigation", icon: "home", label: "Aller au tableau de bord", kbd: "G D", run: () => go("dashboard") },
      { group: "Navigation", icon: "layers", label: "Aller aux enveloppes", kbd: "G E", run: () => go("envelopes") },
      { group: "Navigation", icon: "spark", label: "Aller à l'optimiseur", kbd: "G O", run: () => go("optimizer") },
      { group: "Actions", icon: "play", label: "Lancer la simulation", kbd: "⌘ ↵", run: () => go("envelopes") },
      { group: "Actions", icon: "plus", label: "Ajouter une enveloppe", run: () => go("envelopes") },
      { group: "Actions", icon: "database", label: "Ouvrir la banque de données", run: openData },
      { group: "Actions", icon: "spark", label: "Optimiser le portefeuille", run: () => go("optimizer") },
      { group: "Actions", icon: "user", label: "Refaire la configuration", run: openOnboarding },
      { group: "Espace", icon: "grid", label: "Changer d'espace de travail", run: openProfile },
      { group: "Simulations", icon: "target", label: "Scénario central", run: () => go("dashboard") },
      { group: "Simulations", icon: "flag", label: "Variante FIRE", run: () => go("dashboard") },
    ];
    const filtered = cmds.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));
    useEffect(() => { setSel(0); }, [q]);

    const fire = (c) => { c && c.run(); close(); };
    const onKey = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); fire(filtered[sel]); }
      else if (e.key === "Escape") close();
    };

    let lastGroup = null;
    return React.createElement("div", { className: "scrim", onMouseDown: close, style: { zIndex: 100 } },
      React.createElement("div", { className: "palette", onMouseDown: (e) => e.stopPropagation(), onKeyDown: onKey },
        React.createElement("div", { className: "palette-input" },
          React.createElement(I.search, { s: 17, className: "muted" }),
          React.createElement("input", { ref: inputRef, value: q, onChange: (e) => setQ(e.target.value), placeholder: "Tapez une commande ou recherchez…" }),
          React.createElement("span", { className: "kbd" }, "Esc")),
        React.createElement("div", { className: "scroll", style: { overflowY: "auto", padding: "6px 0 10px" } },
          filtered.length === 0 && React.createElement("div", { className: "muted", style: { padding: "24px", textAlign: "center", fontSize: 13 } }, "Aucun résultat pour « " + q + " »"),
          filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup; lastGroup = c.group;
            return React.createElement(React.Fragment, { key: i },
              showGroup && React.createElement("div", { className: "cmd-section" }, c.group),
              React.createElement("div", { className: "cmd-row" + (i === sel ? " on" : ""), onMouseEnter: () => setSel(i), onClick: () => fire(c) },
                React.createElement("span", { className: "ci row" }, React.createElement(window.Icons[c.icon], { s: 16 })),
                React.createElement("span", { className: "grow" }, c.label),
                c.kbd && React.createElement("span", { className: "kbd" }, c.kbd)));
          }))));
  }

  window.Shell = { Sidebar, TopBar, CommandPalette, Avatar, NAV };
})();
