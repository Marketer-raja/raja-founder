/* ============================================================
   FEATURED FOUNDERS  (the circles + revenue section)
   Edit ONLY this file to feed the data. Nothing else needs to change.

   headline : the sentence shown at the top-left of the card
   top      : big circles with a pill underneath
              name     -> shown as the tooltip / screen-reader label
              company  -> shown in the pill
              revenue  -> shown in bold after the company, e.g. "$12B" or "$4B/yr"
              photo    -> image file or URL, e.g. "photos/emma.jpg" ("" = placeholder)
              link     -> optional, e.g. "https://company.com" (makes the circle clickable)
   more     : small overlapping circles (photo only, "" = placeholder)
   total    : total founders on file. The "+N" bubble = total - top - more
   ============================================================ */
window.FEATURED = {
  headline: "0 founders on file, $0 in tracked annual revenue, $0 in exits",
  total: 0,
  top: [
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" },
    { name: "Founder Name", company: "Company", revenue: "$0M/yr", photo: "", link: "" }
  ],
  more: [
    { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" },
    { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" },
    { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" },
    { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }
  ]
};

/* ---------- renderer (no need to edit below) ---------- */
(function () {
  var D = window.FEATURED, SIL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="11"/><path d="M10 64c1-14 10-22 22-22s21 8 22 22z"/></svg>';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function avatar(cls, photo, alt) {
    var a = el("span", cls);
    if (photo) { var i = new Image(); i.src = photo; i.alt = alt || ""; i.loading = "lazy"; a.appendChild(i); } else a.innerHTML = SIL;
    return a;
  }
  var head = document.getElementById("ff-headline"), top = document.getElementById("ff-top"), more = document.getElementById("ff-more");
  if (!head || !top || !more) return;
  head.textContent = D.headline || "";
  (D.top || []).forEach(function (f) {
    var it = el(f.link ? "a" : "div", "ff-item");
    if (f.link) { it.href = f.link; it.target = "_blank"; it.rel = "noopener"; }
    it.title = f.name || "";
    it.appendChild(avatar("ff-av", f.photo, f.name));
    var p = el("span", "ff-pill"); p.appendChild(document.createTextNode(f.company || ""));
    var b = el("b"); b.textContent = f.revenue || ""; p.appendChild(b);
    it.appendChild(p); top.appendChild(it);
  });
  (D.more || []).forEach(function (f) { more.appendChild(avatar("ff-sm", f.photo, "")); });
  var rest = (D.total || 0) - (D.top || []).length - (D.more || []).length;
  if (rest > 0) more.appendChild(el("span", "ff-count", "+" + rest));
})();
