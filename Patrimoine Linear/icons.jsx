/* Icon set — Linear-style 1.5px line icons. window.Icons */
(function () {
  const S = ({ d, s = 16, sw = 1.5, fill = "none", children, ...p }) =>
    React.createElement("svg", { width: s, height: s, viewBox: "0 0 16 16", fill, stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", ...p },
      children || React.createElement("path", { d }));

  const Icons = {
    home: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M2.5 7.2 8 2.8l5.5 4.4" }),
      React.createElement("path", { key: 2, d: "M3.7 6.6V13h8.6V6.6", fill: "none" }),
    ] }),
    layers: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M8 2.2 14 5 8 7.8 2 5z" }),
      React.createElement("path", { key: 2, d: "M2.4 8 8 10.6 13.6 8" }),
      React.createElement("path", { key: 3, d: "M2.4 11 8 13.6 13.6 11" }),
    ] }),
    spark: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M2.5 11 6 6.5l2.6 2.2L13.5 3" }),
      React.createElement("path", { key: 2, d: "M10.4 3h3.1v3.1" }),
    ] }),
    database: (p) => S({ ...p, children: [
      React.createElement("ellipse", { key: 1, cx: 8, cy: 3.6, rx: 5, ry: 1.8 }),
      React.createElement("path", { key: 2, d: "M3 3.6v8.8c0 1 2.24 1.8 5 1.8s5-.8 5-1.8V3.6" }),
      React.createElement("path", { key: 3, d: "M3 8c0 1 2.24 1.8 5 1.8s5-.8 5-1.8" }),
    ] }),
    search: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 7, cy: 7, r: 4.3 }),
      React.createElement("path", { key: 2, d: "m10.4 10.4 3 3" }),
    ] }),
    chevron: (p) => S({ ...p, d: "M6 3.5 10.5 8 6 12.5" }),
    chevronDown: (p) => S({ ...p, d: "M3.5 6 8 10.5 12.5 6" }),
    plus: (p) => S({ ...p, d: "M8 3.2v9.6M3.2 8h9.6" }),
    close: (p) => S({ ...p, d: "M4 4l8 8M12 4l-8 8" }),
    check: (p) => S({ ...p, d: "M3.2 8.4 6.4 11.6 12.8 4.6" }),
    play: (p) => S({ ...p, fill: "currentColor", stroke: "none", children: React.createElement("path", { d: "M5 3.5v9l7.5-4.5z" }) }),
    refresh: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M13 8a5 5 0 1 1-1.6-3.6" }),
      React.createElement("path", { key: 2, d: "M13.2 2.6v2.6h-2.6" }),
    ] }),
    edit: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M10.5 2.8 13.2 5.5 5.7 13H3v-2.7z" }),
      React.createElement("path", { key: 2, d: "M9.3 4 12 6.7" }),
    ] }),
    sliders: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M3 5h6M11.5 5h1.5M3 11h1.5M7 11h6" }),
      React.createElement("circle", { key: 2, cx: 10, cy: 5, r: 1.6 }),
      React.createElement("circle", { key: 3, cx: 4.5, cy: 11, r: 1.6 }),
    ] }),
    import: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M8 2.5v6.5M5.4 6.6 8 9.2l2.6-2.6" }),
      React.createElement("path", { key: 2, d: "M3 11v1.5h10V11" }),
    ] }),
    bank: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M2.5 6 8 2.6 13.5 6" }),
      React.createElement("path", { key: 2, d: "M3.5 6.5v5M6.2 6.5v5M9.8 6.5v5M12.5 6.5v5M2.6 12.5h10.8" }),
    ] }),
    clock: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 5.3 }),
      React.createElement("path", { key: 2, d: "M8 5.2V8l2 1.4" }),
    ] }),
    flag: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M4 13.5V2.6" }),
      React.createElement("path", { key: 2, d: "M4 3.2h7l-1.4 2.2L11 7.6H4" }),
    ] }),
    target: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 5.3 }),
      React.createElement("circle", { key: 2, cx: 8, cy: 8, r: 2.4 }),
    ] }),
    warn: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M8 2.5 14 12.5H2z" }),
      React.createElement("path", { key: 2, d: "M8 6.6v3M8 11.2v.6" }),
    ] }),
    info: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 5.3 }),
      React.createElement("path", { key: 2, d: "M8 7.3v3.2M8 5.4v.5" }),
    ] }),
    arrowUp: (p) => S({ ...p, d: "M8 12.5V3.5M4.5 7 8 3.5 11.5 7" }),
    arrowRight: (p) => S({ ...p, d: "M3 8h9.5M9 4.5 12.5 8 9 11.5" }),
    grid: (p) => S({ ...p, children: [
      React.createElement("rect", { key: 1, x: 2.6, y: 2.6, width: 4.4, height: 4.4, rx: 1 }),
      React.createElement("rect", { key: 2, x: 9, y: 2.6, width: 4.4, height: 4.4, rx: 1 }),
      React.createElement("rect", { key: 3, x: 2.6, y: 9, width: 4.4, height: 4.4, rx: 1 }),
      React.createElement("rect", { key: 4, x: 9, y: 9, width: 4.4, height: 4.4, rx: 1 }),
    ] }),
    settings: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 2 }),
      React.createElement("path", { key: 2, d: "M8 1.5v1.7M8 12.8v1.7M14.5 8h-1.7M3.2 8H1.5M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2M12.6 12.6l-1.2-1.2M4.6 4.6 3.4 3.4" }),
    ] }),
    user: (p) => S({ ...p, children: [
      React.createElement("circle", { key: 1, cx: 8, cy: 5.5, r: 2.6 }),
      React.createElement("path", { key: 2, d: "M3.2 13.2a4.8 4.8 0 0 1 9.6 0" }),
    ] }),
    calendar: (p) => S({ ...p, children: [
      React.createElement("rect", { key: 1, x: 2.6, y: 3.2, width: 10.8, height: 10.2, rx: 1.6 }),
      React.createElement("path", { key: 2, d: "M2.6 6.3h10.8M5.4 2v2.4M10.6 2v2.4" }),
    ] }),
    coins: (p) => S({ ...p, children: [
      React.createElement("ellipse", { key: 1, cx: 6, cy: 5, rx: 3.6, ry: 1.6 }),
      React.createElement("path", { key: 2, d: "M2.4 5v3c0 .9 1.6 1.6 3.6 1.6" }),
      React.createElement("ellipse", { key: 3, cx: 10, cy: 9, rx: 3.6, ry: 1.6 }),
      React.createElement("path", { key: 4, d: "M6.4 9v3c0 .9 1.6 1.6 3.6 1.6s3.6-.7 3.6-1.6V9" }),
    ] }),
    shield: (p) => S({ ...p, children: [
      React.createElement("path", { key: 1, d: "M8 2.2 13 4v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V4z" }),
    ] }),
  };

  window.Icons = Icons;
})();
