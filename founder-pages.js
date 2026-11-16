/* ============================================================
   FOUNDER PAGE HELPERS (used by the admin panel)
   Pure functions only: no network, no page access. They
     - turn the admin form into a finished life-story page,
     - add/remove a founder in the HISTORY list (script.js + index.html),
     - add/remove the page in sitemap.xml.
   ============================================================ */
(function (root) {
  var SITE = "https://rajafounder.com";
  var RESERVED = ["index", "admin", "about", "contact", "privacy", "terms", "founder-template", "config", "supa", "auth", "popup", "featured", "script", "style"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function slugify(name) {
    return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "");
  }

  function validSlug(s) {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 60 && RESERVED.indexOf(s) < 0;
  }

  function today() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  /* ---------- text -> html ---------- */
  /* Inline: [text](https://link) becomes a link, **bold** becomes bold. Everything else is escaped. */
  function inline(s) {
    var t = esc(s);
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, a, u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + a + "</a>";
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    return t;
  }

  /* Paragraphs (blank-line separated) and bullet lists (lines starting with "- ") */
  function blocks(lines) {
    var out = [], para = [], list = [];
    function flushP() { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } }
    function flushL() {
      if (list.length) {
        out.push("<ul>\n" + list.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("\n") + "\n</ul>");
        list = [];
      }
    }
    lines.forEach(function (l) {
      var t = l.trim();
      if (!t) { flushP(); flushL(); return; }
      var m = /^[-\u2022]\s+(.*)$/.exec(t);
      if (m) { flushP(); list.push(m[1]); } else { flushL(); para.push(t); }
    });
    flushP(); flushL();
    return out.join("\n");
  }

  /* Timeline lines look like:  2013 | Founded the company */
  function timeline(lines) {
    var items = [];
    lines.forEach(function (l) {
      var t = l.trim().replace(/^[-\u2022]\s*/, "");
      if (!t) return;
      var i = t.indexOf("|");
      if (i > 0) items.push("<li><b>" + inline(t.slice(0, i).trim()) + "</b>" + inline(t.slice(i + 1).trim()) + "</li>");
      else items.push("<li>" + inline(t) + "</li>");
    });
    return items.length ? '<ul class="tl">\n' + items.join("\n") + "\n</ul>" : "";
  }

  /* The page content box: sections start with "## Heading". */
  function renderBody(source) {
    var lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    var secs = [{ title: "", lines: [] }];
    lines.forEach(function (l) {
      var m = /^##\s+(.+?)\s*$/.exec(l);
      if (m) secs.push({ title: m[1], lines: [] }); else secs[secs.length - 1].lines.push(l);
    });
    var parts = [], sources = "";
    secs.forEach(function (sec) {
      var key = sec.title.toLowerCase().replace(/[:\s]+$/, "");
      if (!sec.title) { var intro = blocks(sec.lines); if (intro) parts.push(intro); return; }
      if (key === "sources") {
        var sb = blocks(sec.lines).replace(/^<p>/, '<p class="src">');
        sources = "<h2>Sources</h2>\n" + sb;
        return;
      }
      if (key === "takeaway" || key === "the takeaway") {
        var txt = sec.lines.join(" ").replace(/\s+/g, " ").trim().replace(/^the takeaway:\s*/i, "");
        if (txt) parts.push('<div class="take"><b>The takeaway:</b> ' + inline(txt) + "</div>");
        return;
      }
      if (key === "timeline") {
        var tl = timeline(sec.lines);
        if (tl) parts.push("<h2>" + esc(sec.title) + "</h2>\n" + tl);
        return;
      }
      var body = blocks(sec.lines);
      parts.push("<h2>" + esc(sec.title) + "</h2>" + (body ? "\n" + body : ""));
    });
    parts.push('<p style="margin-top:24px"><a class="btn" href="index.html#directory">Back to the directory</a></p>');
    if (sources) parts.push(sources);
    return parts.join("\n\n");
  }

  /* Facts box: up to four of Born / Country / Known for / Industry / Role */
  function renderFacts(f, born, known) {
    var items = [];
    if (born) items.push(["Born", born]);
    items.push(["Country", f.c]);
    items.push(["Known for", known || f.co]);
    items.push(["Industry", f.ind]);
    if (f.role) items.push(["Role", f.role]);
    return items.filter(function (x) { return x[1]; }).slice(0, 4).map(function (x) {
      return "<div><dt>" + esc(x[0]) + "</dt><dd>" + inline(x[1]) + "</dd></div>";
    }).join("\n");
  }

  function metaDesc(f) {
    var d = "The life story of " + f.n + ": " + String(f.bio || "").replace(/\s+/g, " ").trim();
    if (d.length > 160) { d = d.slice(0, 157); d = d.replace(/\s+\S*$/, "") + "..."; }
    return d;
  }

  /* Fill the template. f = founder record, o = {slug, born, known, source, date} */
  function buildPage(template, f, o) {
    var date = o.date || today();
    var url = SITE + "/" + o.slug + ".html";
    var title = f.n + ": Life Story \u2013 Raja Founder";
    var desc = metaDesc(f);
    var image = SITE + "/" + f.photo;
    var ld = {
      "@context": "https://schema.org", "@type": "Article", headline: f.n + ": Life Story", description: desc,
      image: image, dateModified: date, mainEntityOfPage: url, about: { "@type": "Person", name: f.n },
      author: { "@type": "Organization", name: "Raja Founder", url: SITE + "/" },
      publisher: { "@type": "Organization", name: "Raja Founder", url: SITE + "/" }
    };
    var map = {
      TITLE: esc(title), DESC: esc(desc), URL: esc(url), IMAGE: esc(image), PHOTO: esc(f.photo), NAME: esc(f.n),
      LEAD: inline(f.bio || ""), FACTS: renderFacts(f, o.born, o.known), BODY: renderBody(o.source),
      JSONLD: JSON.stringify(ld).replace(/</g, "\\u003c")
    };
    var html = String(template).replace(/<!--NOINDEX-->[\s\S]*?<!--\/NOINDEX-->\s*/g, "");
    Object.keys(map).forEach(function (k) { html = html.split("{{" + k + "}}").join(map[k]); });
    return html;
  }

  /* ---------- HISTORY list (script.js and index.html) ---------- */
  var HRE = /var HISTORY=(\{[^}]*\})/;

  function readHistory(text) {
    var m = HRE.exec(text);
    if (!m) throw new Error("Could not find the HISTORY list.");
    return JSON.parse(m[1]);
  }

  /* Add/replace (name -> file) and drop dropName if given. file === null only removes. */
  function updateHistory(text, name, file, dropName) {
    var m = HRE.exec(text);
    if (!m) throw new Error("Could not find the HISTORY list in the file.");
    var obj = JSON.parse(m[1]);
    if (dropName && dropName !== name) delete obj[dropName];
    if (file) obj[name] = file; else delete obj[name];
    var json = JSON.stringify(obj);
    return text.replace(HRE, function () { return "var HISTORY=" + json; });
  }

  /* index.html loads script.js?v=N. Raise N so browsers fetch the new script.js. */
  function bumpScriptVersion(html) {
    return html.replace(/script\.js\?v=(\d+)/, function (m, n) { return "script.js?v=" + (parseInt(n, 10) + 1); });
  }

  /* ---------- sitemap.xml ---------- */
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function updateSitemap(text, slug, date, remove) {
    var loc = SITE + "/" + slug + ".html";
    var block = new RegExp("[ \\t]*<url>\\s*<loc>" + reEsc(loc) + "</loc>[\\s\\S]*?</url>[ \\t]*\\r?\\n?");
    var has = block.test(text);
    if (remove) return has ? text.replace(block, "") : text;
    if (has) {
      return text.replace(block, function (b) {
        return /<lastmod>/.test(b) ? b.replace(/<lastmod>[^<]*<\/lastmod>/, "<lastmod>" + date + "</lastmod>") : b;
      });
    }
    var entry = "  <url>\n    <loc>" + loc + "</loc>\n    <lastmod>" + date + "</lastmod>\n    <priority>0.7</priority>\n  </url>\n";
    if (!/<\/urlset>/.test(text)) throw new Error("sitemap.xml has no closing </urlset> tag.");
    return text.replace(/\s*<\/urlset>/, "\n" + entry + "</urlset>");
  }

  /* The text shown by "Insert example layout" in the admin form */
  var EXAMPLE = [
    "## Early life",
    "Where and when they were born, family background and education.",
    "",
    "## The idea behind the company",
    "What problem they saw and how the first version began.",
    "",
    "## Growth",
    "Funding, milestones and key decisions. You can add [links](https://example.com) and **bold** words.",
    "",
    "## Timeline",
    "2010 | Starts the first venture",
    "2014 | Launches the company",
    "2020 | Reaches an important milestone",
    "",
    "## Recognition",
    "- Award or list name (year)",
    "- Another recognition",
    "",
    "## Leadership lessons",
    "- First lesson from their journey",
    "- Second lesson",
    "",
    "## The takeaway",
    "One or two sentences that sum up what readers can learn.",
    "",
    "## Sources",
    "Written from public information, including [Wikipedia](https://en.wikipedia.org/wiki/Example)."
  ].join("\n");

  var api = {
    SITE: SITE, esc: esc, slugify: slugify, validSlug: validSlug, today: today, inline: inline,
    renderBody: renderBody, renderFacts: renderFacts, metaDesc: metaDesc, buildPage: buildPage,
    readHistory: readHistory, updateHistory: updateHistory, bumpScriptVersion: bumpScriptVersion,
    updateSitemap: updateSitemap, EXAMPLE: EXAMPLE
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RFPages = api;
})(typeof window !== "undefined" ? window : this);
