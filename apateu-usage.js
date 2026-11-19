/* Apateu "People using it" chart. Numbers read from the production database on 2026-11-19.
   To refresh: replace `data` (new sign-ups per month) and the four figures in index.html. */
(function () {
  var host = document.getElementById("usage-chart");
  if (!host) return;
  var data = [["2025-05",6],["2025-06",61],["2025-07",68],["2025-08",18],["2025-09",65],["2025-10",47],["2025-11",78],["2025-12",109],["2026-01",40],["2026-02",36],["2026-03",29],["2026-04",136],["2026-05",149],["2026-06",83],["2026-07",62],["2026-08",47],["2026-09",27],["2026-10",52],["2026-11",51]];
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var run = 0;
  var rows = data.map(function (d) {
    run += d[1];
    var y = +d[0].slice(0, 4), m = +d[0].slice(5) - 1;
    return { y: y, m: m, n: d[1], total: run, label: MON[m] + " " + y };
  });
  var fmt = function (v) { return v.toLocaleString("en-US"); };
  var NS = "http://www.w3.org/2000/svg";
  var W = 760, L = 44, R = 58, T1 = 26, H1 = 200, GAP = 46, H2 = 78, B = 26;
  var H = T1 + H1 + GAP + H2 + B;
  var n = rows.length, step = (W - L - R) / (n - 1);
  var x = function (i) { return L + i * step; };
  var MAX1 = 1200, MAX2 = 150;
  var y1 = function (v) { return T1 + H1 - (v / MAX1) * H1; };
  var top2 = T1 + H1 + GAP;
  var y2 = function (v) { return top2 + H2 - (v / MAX2) * H2; };
  var css = getComputedStyle(host);
  var c = function (k) { return css.getPropertyValue(k).trim(); };
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    svg.appendChild(e);
    return e;
  }
  // panel titles
  el("text", { x: L, y: 12, "class": "ptitle" }, "Total registered users");
  el("text", { x: L, y: top2 - 14, "class": "ptitle" }, "New sign-ups each month");
  // grid, top panel
  [0, 400, 800, 1200].forEach(function (v) {
    el("line", { x1: L, x2: W - R, y1: y1(v), y2: y1(v), stroke: c("--line-soft"), "stroke-width": 1 });
    el("text", { x: L - 8, y: y1(v) + 4, "text-anchor": "end" }, fmt(v));
  });
  // grid, bottom panel
  [0, 150].forEach(function (v) {
    el("line", { x1: L, x2: W - R, y1: y2(v), y2: y2(v), stroke: c("--line-soft"), "stroke-width": 1 });
    el("text", { x: L - 8, y: y2(v) + 4, "text-anchor": "end" }, fmt(v));
  });
  // App Store launch marker (Sept 2025 = index 4)
  el("line", { x1: x(4), x2: x(4), y1: T1 + 34, y2: T1 + H1, stroke: c("--line"), "stroke-width": 1, "stroke-dasharray": "3 3" });
  el("text", { x: x(4), y: T1 + 26, "text-anchor": "middle" }, "App Store launch");
  // area + line
  var pts = rows.map(function (r, i) { return x(i) + "," + y1(r.total); });
  el("path", { d: "M" + x(0) + "," + y1(0) + " L" + pts.join(" L") + " L" + x(n - 1) + "," + y1(0) + " Z", fill: c("--clay-wash") });
  el("path", { d: "M" + pts.join(" L"), fill: "none", stroke: c("--clay"), "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" });
  el("circle", { cx: x(n - 1), cy: y1(rows[n - 1].total), r: 4.5, fill: c("--clay"), stroke: c("--ivory"), "stroke-width": 2 });
  el("text", { x: x(n - 1) + 9, y: y1(rows[n - 1].total) + 4, "class": "lbl-strong" }, fmt(rows[n - 1].total));
  // bars
  var bw = Math.min(22, step - 6);
  rows.forEach(function (r, i) {
    var h = (r.n / MAX2) * H2, last = i === n - 1;
    el("rect", { x: x(i) - bw / 2, y: y2(r.n), width: bw, height: h, rx: 3, fill: c("--clay"), "fill-opacity": last ? 0.45 : 1 });
  });
  el("text", { x: x(12), y: y2(149) - 6, "text-anchor": "middle" }, "149");
  // x labels
  rows.forEach(function (r, i) {
    if (i % 3 !== 0) return;
    el("text", { x: x(i), y: H - 6, "text-anchor": "middle" }, (i === 0 || r.m < 3) ? MON[r.m] + " " + r.y : MON[r.m]);
  });
  // hover layer
  var cross = el("line", { y1: T1, y2: top2 + H2, stroke: c("--ink-2"), "stroke-width": 1, opacity: 0 });
  var dot = el("circle", { r: 4.5, fill: c("--clay-deep"), stroke: c("--ivory"), "stroke-width": 2, opacity: 0 });
  var hit = el("rect", { x: L - step / 2, y: 0, width: W - L - R + step, height: H, fill: "transparent" });
  host.appendChild(svg);
  var tip = document.createElement("div");
  tip.className = "usage-tip"; tip.hidden = true; host.appendChild(tip);
  function show(evt) {
    var box = svg.getBoundingClientRect(), k = box.width / W;
    var px = (evt.clientX - box.left) / k;
    var i = Math.max(0, Math.min(n - 1, Math.round((px - L) / step)));
    var r = rows[i];
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 0.35);
    dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y1(r.total)); dot.setAttribute("opacity", 1);
    tip.innerHTML = "<b>" + r.label + (i === n - 1 ? " (so far)" : "") + "</b><br>" + fmt(r.n) + " new · " + fmt(r.total) + " total";
    tip.hidden = false;
    var tx = Math.max(80, Math.min(box.width - 80, x(i) * k));
    tip.style.left = tx + "px";
    tip.style.top = (y1(r.total) * k - 10) + "px";
  }
  function hide() { cross.setAttribute("opacity", 0); dot.setAttribute("opacity", 0); tip.hidden = true; }
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", hide);
  // table view
  var t = "<table><thead><tr><th>Month</th><th>New sign-ups</th><th>Total</th></tr></thead><tbody>";
  rows.forEach(function (r) { t += "<tr><td>" + r.label + "</td><td>" + fmt(r.n) + "</td><td>" + fmt(r.total) + "</td></tr>"; });
  document.getElementById("usage-tbl").innerHTML = t + "</tbody></table>";
})();
