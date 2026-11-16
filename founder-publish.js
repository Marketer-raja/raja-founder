/* ============================================================
   FOUNDER PUBLISHING (used by the admin panel)
   Talks to the GitHub API with the token you saved in the admin panel.
   Every publish is ONE commit that contains all of:
     founders.json, <name>.html (the ready-made History page uploaded in the admin panel, saved as is),
     script.js + index.html (History button list), sitemap.xml, and the photo.
   Either everything is published or nothing is.
   ============================================================ */
(function (root) {
  var P = (typeof module !== "undefined" && module.exports) ? require("./founder-pages.js") : root.RFPages;

  function create(cfg, fetchFn) {
    fetchFn = fetchFn || function () { return root.fetch.apply(root, arguments); };

    function enc(path) { return path.split("/").map(encodeURIComponent).join("/"); }

    async function gh(path, opt) {
      opt = opt || {};
      var headers = { Authorization: "Bearer " + cfg.token, Accept: "application/vnd.github+json" };
      if (opt.body) headers["Content-Type"] = "application/json";
      var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timer = ctl ? setTimeout(function () { ctl.abort(); }, 60000) : null;
      var r;
      try {
        r = await fetchFn("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, {
          method: opt.method || "GET", headers: headers, cache: "no-store", signal: ctl ? ctl.signal : undefined,
          body: opt.body ? JSON.stringify(opt.body) : undefined
        });
      } catch (err) {
        throw fail(err && err.name === "AbortError" ? "GitHub did not answer within a minute. Check your internet connection and try again."
          : "Could not reach GitHub. Check your internet connection and try again.");
      } finally { if (timer) clearTimeout(timer); }
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) { var e = new Error(j.message || String(r.status)); e.status = r.status; throw e; }
      return j;
    }

    function b64utf8(s) {
      var bin = atob(String(s).replace(/\s/g, ""));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }

    async function head() {
      var r = await gh("/git/ref/heads/" + enc(cfg.branch) + "?t=" + Date.now());
      var c = await gh("/git/commits/" + r.object.sha);
      return { sha: r.object.sha, tree: c.tree.sha };
    }

    /* text of a file at a commit, or null if it does not exist */
    async function readText(path, ref) {
      try {
        var j = await gh("/contents/" + enc(path) + "?ref=" + ref + "&t=" + Date.now());
        if (j.content) return b64utf8(j.content);
        var b = await gh("/git/blobs/" + j.sha);
        return b64utf8(b.content);
      } catch (e) { if (e.status === 404) return null; throw e; }
    }

    async function exists(path, ref) { return (await readText(path, ref)) !== null; }

    async function commitAll(base, changes, message) {
      var tree = await Promise.all(changes.map(async function (ch) {
        if (ch.del) return { path: ch.path, mode: "100644", type: "blob", sha: null };
        var b = await gh("/git/blobs", { method: "POST", body: ch.b64 ? { content: ch.b64, encoding: "base64" } : { content: ch.text, encoding: "utf-8" } });
        return { path: ch.path, mode: "100644", type: "blob", sha: b.sha };
      }));
      var t = await gh("/git/trees", { method: "POST", body: { base_tree: base.tree, tree: tree } });
      var c = await gh("/git/commits", { method: "POST", body: { message: message, tree: t.sha, parents: [base.sha] } });
      await gh("/git/refs/heads/" + enc(cfg.branch), { method: "PATCH", body: { sha: c.sha, force: false } });
      return c.sha;
    }

    function isOwnedPhoto(p) { return !!p && p.indexOf("photos/") === 0 && !/^photos\/s\d\.jpg$/.test(p); }

    function fail(msg, status) { var e = new Error(msg); e.status = status || 0; e.friendly = true; return e; }

    /* ---------- public API ---------- */
    async function load() {
      var base = await head();
      var raw = await readText("founders.json", base.sha);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    }

    /* name -> page file, from the HISTORY list in script.js */
    async function historyMap() {
      var base = await head();
      var js = await readText("script.js", base.sha);
      try { return js === null ? {} : P.readHistory(js); } catch (e) { return {}; }
    }

    async function readPageSource(slug) {
      var base = await head();
      var raw = await readText("page-src/" + slug + ".json", base.sha);
      return raw ? JSON.parse(raw) : null;
    }

    async function getTemplate() {
      var base = await head();
      var t = await readText("founder-template.html", base.sha);
      if (t === null) throw fail("founder-template.html is missing from the repository. Upload it next to index.html first.");
      return t;
    }

    /* o: {n,co,c,ind,yr,role,web,li,bio,story}; opts: {editingId, photoData, page:{make,slug,born,known,source}} */
    async function publish(o, opts) {
      opts = opts || {};
      var page = opts.page || { make: false };
      var base = await head();
      var raw = await readText("founders.json", base.sha);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      var cur = null;
      if (opts.editingId) {
        cur = list.filter(function (f) { return f.id === opts.editingId; })[0] || null;
        if (!cur) throw fail("This founder no longer exists on the site. Reload the list and try again.", 409);
      }
      var id = cur ? cur.id : "f" + Date.now();
      var photo = cur ? cur.photo : null;
      var changes = [];
      if (opts.photoData) {
        photo = "photos/" + id + "-" + Date.now() + ".jpg";
        changes.push({ path: photo, b64: opts.photoData.split(",")[1] });
      }
      if (!photo) throw fail("Choose a photo for the new founder.");

      var rec = Object.assign({}, cur || {}, {
        id: id, n: o.n, co: o.co, c: o.c, ind: o.ind, yr: parseInt(o.yr, 10) || "", role: o.role || "Founder",
        bio: o.bio, story: o.story, photo: photo, web: o.web, li: o.li
      });

      if (typeof page.label === "string") { if (page.label.trim()) rec.historyLabel = page.label.trim().slice(0, 30); else delete rec.historyLabel; }

      var js = await readText("script.js", base.sha);
      var idx = await readText("index.html", base.sha);
      if (js === null || idx === null) throw fail("script.js or index.html was not found in the repository.");
      var hist = P.readHistory(js);
      P.readHistory(idx); // make sure index.html has the list too, before changing anything
      var oldFile = cur ? (cur.history || hist[cur.n] || null) : null;
      var date = P.today();
      var sm = null, touchedHistory = false;
      async function sitemap() { if (sm === null) { sm = await readText("sitemap.xml", base.sha); if (sm === null) throw fail("sitemap.xml was not found in the repository."); } return sm; }

      if (page.make) {
        var slug = page.slug, file = slug + ".html";
        if (!P.validSlug(slug)) throw fail("The page address may only use lowercase letters, numbers and hyphens.");
        if (file !== oldFile) {
          var taken = list.some(function (f) { return f.id !== id && f.history === file; }) ||
            Object.keys(hist).some(function (k) { return k !== (cur && cur.n) && hist[k] === file; }) ||
            await exists(file, base.sha);
          if (taken) throw fail("A page called " + file + " already exists. Choose a different page address.");
        }
        if (typeof page.html !== "string" || !/<html[\s>]|<!doctype\s+html/i.test(page.html)) throw fail("The History page file is missing or is not a web page (.html).");
        /* the uploaded page is saved exactly as it was made; nothing is rewritten */
        changes.push({ path: file, text: page.html });
        rec.history = file; rec.pageAuto = true;
        js = P.updateHistory(js, rec.n, file, cur && cur.n);
        idx = P.updateHistory(idx, rec.n, file, cur && cur.n);
        touchedHistory = true;
        sm = P.updateSitemap(await sitemap(), slug, date);
        if (oldFile && oldFile !== file && cur.pageAuto) {
          var oldSlug = oldFile.replace(/\.html$/, "");
          if (await exists(oldFile, base.sha)) changes.push({ path: oldFile, del: true });
          if (await exists("page-src/" + oldSlug + ".json", base.sha)) changes.push({ path: "page-src/" + oldSlug + ".json", del: true });
          sm = P.updateSitemap(sm, oldSlug, date, true);
        }
      } else if (cur && oldFile && rec.n !== cur.n) {
        /* name changed but page left as it is: keep the History button working under the new name */
        js = P.updateHistory(js, rec.n, oldFile, cur.n);
        idx = P.updateHistory(idx, rec.n, oldFile, cur.n);
        touchedHistory = true;
      }

      if (touchedHistory) {
        changes.push({ path: "script.js", text: js });
        changes.push({ path: "index.html", text: P.bumpScriptVersion(idx) });
      }
      if (sm !== null) changes.push({ path: "sitemap.xml", text: sm });

      /* replaced photo: remove the old file, unless a page that is not being rebuilt still shows it */
      if (opts.photoData && cur && isOwnedPhoto(cur.photo) && cur.photo !== photo && !(oldFile && !page.make)) {
        if (await exists(cur.photo, base.sha)) changes.push({ path: cur.photo, del: true });
      }

      if (cur) list[list.indexOf(cur)] = rec; else list.push(rec);
      changes.push({ path: "founders.json", text: JSON.stringify(list, null, 2) });

      await commitAll(base, changes, (cur ? "Update founder " : "Add founder ") + o.n);
      return { list: list, record: rec, pageFile: page.make ? rec.history : null };
    }

    async function remove(id) {
      var base = await head();
      var raw = await readText("founders.json", base.sha);
      var list = raw ? JSON.parse(raw) : [];
      var f = list.filter(function (x) { return x.id === id; })[0];
      if (!f) throw fail("This founder was already removed. Reload the list.", 409);
      var changes = [];
      var js = await readText("script.js", base.sha), idx = await readText("index.html", base.sha);
      var hist = (js !== null && idx !== null) ? P.readHistory(js) : {};
      var file = f.history || hist[f.n] || null;
      var keptPage = false;

      if (js !== null && idx !== null && hist[f.n]) {
        changes.push({ path: "script.js", text: P.updateHistory(js, f.n, null) });
        changes.push({ path: "index.html", text: P.bumpScriptVersion(P.updateHistory(idx, f.n, null)) });
      }
      if (file && f.pageAuto) {
        var slug = file.replace(/\.html$/, "");
        if (await exists(file, base.sha)) changes.push({ path: file, del: true });
        if (await exists("page-src/" + slug + ".json", base.sha)) changes.push({ path: "page-src/" + slug + ".json", del: true });
        var sm = await readText("sitemap.xml", base.sha);
        if (sm !== null) changes.push({ path: "sitemap.xml", text: P.updateSitemap(sm, slug, P.today(), true) });
      } else if (file) { keptPage = true; }

      if (isOwnedPhoto(f.photo) && !keptPage && await exists(f.photo, base.sha)) changes.push({ path: f.photo, del: true });

      list = list.filter(function (x) { return x.id !== id; });
      changes.push({ path: "founders.json", text: JSON.stringify(list, null, 2) });
      await commitAll(base, changes, "Delete founder " + f.n);
      return { list: list, keptPage: keptPage ? file : null };
    }

    return { load: load, publish: publish, remove: remove, readPageSource: readPageSource, getTemplate: getTemplate, historyMap: historyMap };
  }

  var api = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RFPublish = api;
})(typeof window !== "undefined" ? window : this);
