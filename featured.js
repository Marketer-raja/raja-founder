/* ============================================================
   FEATURED FOUNDERS (circles section) - AUTOMATIC
   Reads founders.json, so it updates whenever a founder is added.
   Each circle shows: photo, company name, and Founder / Co-founder.
   ============================================================ */
(function () {
  var TOP_COUNT = 14;   /* big circles with company + role */
  var MORE_COUNT = 20;  /* small overlapping circles       */
  var SIL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="24" r="11"/><path d="M10 64c1-14 10-22 22-22s21 8 22 22z"/></svg>';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function avatar(cls, photo, alt) {
    var a = el("span", cls);
    if (photo) { var i = new Image(); i.src = photo; i.alt = alt || ""; i.loading = "lazy"; a.appendChild(i); } else a.innerHTML = SIL;
    return a;
  }
  /* "Co-founder", "Co - founder", "Co-Founder & CEO" -> Co-founder ; everything else -> Founder */
  function roleLabel(role) { return /co\s*-?\s*founder/i.test(role || "") ? "Co-founder" : "Founder"; }

  var head = document.getElementById("ff-headline"), top = document.getElementById("ff-top"), more = document.getElementById("ff-more");
  if (!head || !top || !more) return;

  function render(list) {
    top.innerHTML = ""; more.innerHTML = "";
    head.textContent = list.length + (list.length === 1 ? " founder" : " founders") + " on file";
    list.slice(0, TOP_COUNT).forEach(function (f) {
      var it = el("div", "ff-item");
      it.title = f.n || "";
      it.appendChild(avatar("ff-av", f.photo, f.n));
      var p = el("span", "ff-pill");
      p.appendChild(document.createTextNode(f.co || ""));
      var b = el("b"); b.textContent = roleLabel(f.role); p.appendChild(b);
      it.appendChild(p); top.appendChild(it);
    });
    list.slice(TOP_COUNT, TOP_COUNT + MORE_COUNT).forEach(function (f) { more.appendChild(avatar("ff-sm", f.photo, f.n)); });
    var rest = list.length - TOP_COUNT - MORE_COUNT;
    if (rest > 0) more.appendChild(el("span", "ff-count", "+" + rest));
  }

  fetch("founders.json?v=" + Date.now())
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) { if (Array.isArray(j)) render(j); })
    .catch(function () { head.textContent = ""; });
})();
