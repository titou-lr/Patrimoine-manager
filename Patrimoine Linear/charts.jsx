/* SVG charts — hand-built, Linear aesthetic. window.Charts */
(function () {
  const { useState, useRef, useEffect } = React;
  const eur = (v) => window.DATA.eur(v);
  const GRID = "#1b1c1f";
  const AXIS = "#62666d";

  function useWidth() {
    const ref = useRef(null);
    const [w, setW] = useState(720);
    useEffect(() => {
      if (!ref.current) return;
      const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
      ro.observe(ref.current);
      setW(ref.current.clientWidth);
      return () => ro.disconnect();
    }, []);
    return [ref, w];
  }

  const path = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = (pts, base) => path(pts) + ` L${pts[pts.length-1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`;

  // ── Projection area chart (contrib base + gain fill, capital line) ─────────
  function AreaProjection({ height = 300 }) {
    const [ref, w] = useWidth();
    const [hi, setHi] = useState(null);
    const D = window.DATA.proj;
    const PL = 8, PR = 12, PT = 16, PB = 26;
    const iw = Math.max(50, w - PL - PR), ih = height - PT - PB;
    const maxY = D[D.length - 1].capital * 1.06;
    const x = (i) => PL + (i / (D.length - 1)) * iw;
    const y = (v) => PT + ih - (v / maxY) * ih;

    const capPts = D.map((d, i) => [x(i), y(d.capital)]);
    const contribPts = D.map((d, i) => [x(i), y(d.contrib)]);
    const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => maxY * t);

    const onMove = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - r.left;
      let idx = Math.round(((px - PL) / iw) * (D.length - 1));
      idx = Math.max(0, Math.min(D.length - 1, idx));
      setHi(idx);
    };

    return React.createElement("div", { ref, style: { position: "relative", width: "100%" } },
      React.createElement("svg", { width: w, height, onMouseMove: onMove, onMouseLeave: () => setHi(null), style: { display: "block" } },
        React.createElement("defs", null,
          React.createElement("linearGradient", { id: "gGain", x1: 0, y1: 0, x2: 0, y2: 1 },
            React.createElement("stop", { offset: "0%", stopColor: "#5e6ad2", stopOpacity: 0.30 }),
            React.createElement("stop", { offset: "100%", stopColor: "#5e6ad2", stopOpacity: 0.02 })),
          React.createElement("linearGradient", { id: "gContrib", x1: 0, y1: 0, x2: 0, y2: 1 },
            React.createElement("stop", { offset: "0%", stopColor: "#6b7280", stopOpacity: 0.16 }),
            React.createElement("stop", { offset: "100%", stopColor: "#6b7280", stopOpacity: 0.02 }))),
        gridY.map((gv, i) => React.createElement("g", { key: i },
          React.createElement("line", { x1: PL, x2: PL + iw, y1: y(gv), y2: y(gv), stroke: GRID }),
          React.createElement("text", { x: PL, y: y(gv) - 4, fill: AXIS, fontSize: 10, fontFamily: "Geist Mono" }, window.DATA.eurk(gv) + " €"))),
        // capital area (gain on top of contrib visually -> fill whole under capital with gain grad)
        React.createElement("path", { d: area(capPts, PT + ih), fill: "url(#gGain)" }),
        React.createElement("path", { d: area(contribPts, PT + ih), fill: "url(#gContrib)" }),
        React.createElement("path", { d: path(contribPts), fill: "none", stroke: "#6b7280", strokeWidth: 1.4, strokeDasharray: "3 3", opacity: 0.7 }),
        React.createElement("path", { d: path(capPts), fill: "none", stroke: "#828fff", strokeWidth: 2.4 }),
        // x labels every 5 yrs
        D.filter((d) => d.year % 5 === 0).map((d) => React.createElement("text", { key: d.year, x: x(d.year), y: height - 8, fill: AXIS, fontSize: 10, textAnchor: "middle", fontFamily: "Geist Mono" }, "An " + d.year)),
        hi != null && React.createElement("g", null,
          React.createElement("line", { x1: x(hi), x2: x(hi), y1: PT, y2: PT + ih, stroke: "#34343a" }),
          React.createElement("circle", { cx: x(hi), cy: y(D[hi].capital), r: 4, fill: "#828fff", stroke: "#010102", strokeWidth: 2 }),
          React.createElement("circle", { cx: x(hi), cy: y(D[hi].contrib), r: 3, fill: "#6b7280", stroke: "#010102", strokeWidth: 2 }))),
      hi != null && React.createElement("div", { className: "chart-tip", style: { left: x(hi), top: y(D[hi].capital) } },
        React.createElement("div", { className: "caption", style: { marginBottom: 5 } }, "An " + D[hi].year + " · " + D[hi].age + " ans"),
        React.createElement("div", { className: "row spread gap16", style: { marginBottom: 3 } },
          React.createElement("span", { className: "accent", style: { fontSize: 12 } }, "Capital"),
          React.createElement("span", { className: "mono ink", style: { fontSize: 12.5, fontWeight: 500 } }, eur(D[hi].capital))),
        React.createElement("div", { className: "row spread gap16", style: { marginBottom: 3 } },
          React.createElement("span", { className: "muted", style: { fontSize: 12 } }, "Versé"),
          React.createElement("span", { className: "mono muted", style: { fontSize: 12 } }, eur(D[hi].contrib))),
        React.createElement("div", { className: "row spread gap16" },
          React.createElement("span", { className: "pos", style: { fontSize: 12 } }, "Plus-value"),
          React.createElement("span", { className: "mono pos", style: { fontSize: 12 } }, "+" + eur(D[hi].gain)))));
  }

  // ── Monte Carlo band chart ────────────────────────────────────────────────
  function MonteCarlo({ height = 320 }) {
    const [ref, w] = useWidth();
    const [hi, setHi] = useState(null);
    const D = window.DATA.mc;
    const PL = 10, PR = 14, PT = 16, PB = 26;
    const iw = Math.max(50, w - PL - PR), ih = height - PT - PB;
    const maxY = D[D.length - 1].p90 * 1.05;
    const x = (i) => PL + (i / (D.length - 1)) * iw;
    const y = (v) => PT + ih - (v / maxY) * ih;
    const p90 = D.map((d, i) => [x(i), y(d.p90)]);
    const p10 = D.map((d, i) => [x(i), y(d.p10)]);
    const p50 = D.map((d, i) => [x(i), y(d.p50)]);
    const band = path(p90) + " " + p10.slice().reverse().map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + " Z";
    const gridY = [0, 0.25, 0.5, 0.75, 1].map((t) => maxY * t);
    const onMove = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      let idx = Math.round((((e.clientX - r.left) - PL) / iw) * (D.length - 1));
      setHi(Math.max(0, Math.min(D.length - 1, idx)));
    };
    return React.createElement("div", { ref, style: { position: "relative", width: "100%" } },
      React.createElement("svg", { width: w, height, onMouseMove: onMove, onMouseLeave: () => setHi(null), style: { display: "block" } },
        gridY.map((gv, i) => React.createElement("g", { key: i },
          React.createElement("line", { x1: PL, x2: PL + iw, y1: y(gv), y2: y(gv), stroke: GRID }),
          React.createElement("text", { x: PL, y: y(gv) - 4, fill: AXIS, fontSize: 10, fontFamily: "Geist Mono" }, window.DATA.eurk(gv) + " €"))),
        React.createElement("path", { d: band, fill: "#5e6ad2", fillOpacity: 0.13 }),
        React.createElement("path", { d: path(p90), fill: "none", stroke: "#4cb782", strokeWidth: 1.3, strokeDasharray: "4 3" }),
        React.createElement("path", { d: path(p10), fill: "none", stroke: "#e0795a", strokeWidth: 1.3, strokeDasharray: "4 3" }),
        React.createElement("path", { d: path(p50), fill: "none", stroke: "#828fff", strokeWidth: 2.4 }),
        D.filter((d) => d.year % 5 === 0).map((d) => React.createElement("text", { key: d.year, x: x(d.year), y: height - 8, fill: AXIS, fontSize: 10, textAnchor: "middle", fontFamily: "Geist Mono" }, "An " + d.year)),
        hi != null && React.createElement("g", null,
          React.createElement("line", { x1: x(hi), x2: x(hi), y1: PT, y2: PT + ih, stroke: "#34343a" }),
          React.createElement("circle", { cx: x(hi), cy: y(D[hi].p50), r: 4, fill: "#828fff", stroke: "#010102", strokeWidth: 2 }))),
      hi != null && React.createElement("div", { className: "chart-tip", style: { left: x(hi), top: y(D[hi].p90) } },
        React.createElement("div", { className: "caption", style: { marginBottom: 5 } }, "An " + D[hi].year),
        [["Favorable", D[hi].p90, "pos"], ["Médian", D[hi].p50, "accent"], ["Défavorable", D[hi].p10, "neg"]].map((r, i) =>
          React.createElement("div", { key: i, className: "row spread gap16", style: { marginBottom: i < 2 ? 3 : 0 } },
            React.createElement("span", { className: r[2], style: { fontSize: 12 } }, r[0]),
            React.createElement("span", { className: "mono ink", style: { fontSize: 12 } }, eur(r[1]))))));
  }

  // ── Stacked regime bars ───────────────────────────────────────────────────
  function RegimeBars({ height = 200 }) {
    const [ref, w] = useWidth();
    const D = window.DATA.regimeDist;
    const PL = 10, PR = 10, PT = 10, PB = 24;
    const iw = Math.max(50, w - PL - PR), ih = height - PT - PB;
    const bw = Math.min(46, (iw / D.length) * 0.5);
    const keys = [["expansion", "#4cb782"], ["overheat", "#e2b550"], ["recession", "#e0795a"], ["crisis", "#6b7280"]];
    return React.createElement("div", { ref, style: { width: "100%" } },
      React.createElement("svg", { width: w, height, style: { display: "block" } },
        D.map((d, i) => {
          const cx = PL + (i + 0.5) * (iw / D.length);
          let acc = 0;
          return React.createElement("g", { key: i },
            keys.map(([k, c]) => {
              const h = (d[k] / 100) * ih;
              const yy = PT + ih - acc - h;
              acc += h;
              return React.createElement("rect", { key: k, x: cx - bw / 2, y: yy, width: bw, height: Math.max(0, h - 1), fill: c, rx: 1 });
            }),
            React.createElement("text", { x: cx, y: height - 7, fill: AXIS, fontSize: 10, textAnchor: "middle", fontFamily: "Geist Mono" }, "An " + d.year));
        })));
  }

  // ── Donut ─────────────────────────────────────────────────────────────────
  function Donut({ size = 150, data, stroke = 18 }) {
    const R = (size - stroke) / 2, C = size / 2, circ = 2 * Math.PI * R;
    let off = 0;
    return React.createElement("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
      React.createElement("g", { transform: `rotate(-90 ${C} ${C})` },
        data.map((d, i) => {
          const len = (d.pct / 100) * circ;
          const el = React.createElement("circle", {
            key: i, cx: C, cy: C, r: R, fill: "none", stroke: d.color, strokeWidth: stroke,
            strokeDasharray: `${len} ${circ - len}`, strokeDashoffset: -off,
          });
          off += len;
          return el;
        })));
  }

  window.Charts = { AreaProjection, MonteCarlo, RegimeBars, Donut };
})();
