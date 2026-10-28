/* Founder pop-up. All text, timing and on/off switch come from the admin panel
   (Supabase table popup_settings). Messages are saved to popup_submissions.
   Add ?popup=preview to the site address to force it open (used by the admin Preview button). */
(function () {
  if (!window.RFDB) return;
  var KEY = "rf_popup_seen", preview = /[?&]popup=preview/.test(location.search);

  function seenRecently(days) {
    if (preview || !days) return false;
    try { var t = +localStorage.getItem(KEY) || 0; return Date.now() - t < days * 864e5; } catch (e) { return false; }
  }
  function markSeen() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function field(label, input) { var l = el("label", null, label); l.appendChild(input); return l; }

  function build(s) {
    var ov = el("div", "fp-overlay"), box = el("div", "fp-box"), last = document.activeElement;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "fp-title");
    var close = el("button", "fp-close", "×"); close.type = "button"; close.setAttribute("aria-label", "Close");
    var head = el("div", "fp-head"), h = el("h2", null, s.title); h.id = "fp-title";
    head.appendChild(el("span", "fp-brand", s.brand)); head.appendChild(h);
    if (s.subtitle) head.appendChild(el("p", null, s.subtitle));

    var form = el("form", "fp-form"); form.noValidate = true;
    var name = el("input"); name.name = "name"; name.type = "text"; name.autocomplete = "name"; name.maxLength = 120; name.required = true;
    var email = el("input"); email.name = "email"; email.type = "email"; email.autocomplete = "email"; email.maxLength = 254; email.required = true;
    var msg = el("textarea"); msg.name = "message"; msg.maxLength = 2000;
    var hp = el("div", "fp-hp"), hpi = el("input"); hpi.name = "website"; hpi.tabIndex = -1; hpi.autocomplete = "off"; hpi.setAttribute("aria-hidden", "true"); hp.appendChild(hpi);
    var btn = el("button", "btn", s.button_text); btn.type = "submit";
    var note = el("p", "fp-msg"); note.setAttribute("role", "status"); note.setAttribute("aria-live", "polite");
    [field(s.name_label, name), field(s.email_label, email), field(s.message_label, msg), hp, btn, note].forEach(function (n) { form.appendChild(n); });

    box.appendChild(close); box.appendChild(head); box.appendChild(form);
    if (s.footer_text) box.appendChild(el("p", "fp-foot", s.footer_text));
    ov.appendChild(box); document.body.appendChild(ov);
    (window.dataLayer = window.dataLayer || []).push({ event: "popup_open" });

    function shut() {
      (window.dataLayer = window.dataLayer || []).push({ event: "popup_close" });
      ov.classList.remove("open"); markSeen(); document.removeEventListener("keydown", key);
      setTimeout(function () { ov.remove(); }, 350);
      if (last && last.focus) try { last.focus(); } catch (e) {}
    }
    function key(e) {
      if (e.key === "Escape") { shut(); return; }
      if (e.key === "Tab") { /* keep focus inside the dialog */
        var f = box.querySelectorAll("button,input:not([tabindex='-1']),textarea"); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    }
    close.onclick = shut;
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) shut(); });
    document.addEventListener("keydown", key);

    form.addEventListener("submit", function (e) {
      e.preventDefault(); note.className = "fp-msg";
      var n = name.value.trim(), em = email.value.trim();
      if (!n) { note.textContent = "Please enter your name."; note.className = "fp-msg err"; name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { note.textContent = "Please enter a valid email address."; note.className = "fp-msg err"; email.focus(); return; }
      var done = function () { note.textContent = s.success_text; note.className = "fp-msg ok"; form.reset(); markSeen(); setTimeout(shut, 2600); };
      if (hpi.value) { done(); return; } /* bots fill the hidden field */
      btn.disabled = true; note.textContent = "Sending…";
      RFDB.insert("popup_submissions", { name: n, email: em, message: msg.value.trim() })
        .then(function (st) { if (st >= 200 && st < 300) { (window.dataLayer = window.dataLayer || []).push({ event: "popup_submit", form_name: "founder_popup" }); done(); } else throw 0; })
        .catch(function () { note.textContent = "Something went wrong. Please try again."; note.className = "fp-msg err"; btn.disabled = false; });
    });

    requestAnimationFrame(function () { ov.classList.add("open"); setTimeout(function () { name.focus(); }, 380); });
  }

  /* ---- settings: from the admin panel, with safe defaults if Supabase is unreachable ---- */
  var DEFAULTS = { enabled: true, brand: "RAJA FOUNDER", title: "Share your founder story",
    subtitle: "Know a founder who deserves to be featured? Tell us and we will get back to you.",
    name_label: "Your name", email_label: "Email address", message_label: "Your message", button_text: "Send",
    success_text: "Thank you! We will be in touch soon.", footer_text: "We read every message.", delay_seconds: 4 };
  var MAX_DELAY = 5;      /* the pop-up always appears within 5 seconds of arriving */
  var opened = false, settingsP = null;
  function getSettings() {
    if (!settingsP) settingsP = RFDB.select("popup_settings", "select=*&id=eq.1")
      .then(function (rows) { var s = rows && rows[0]; if (!s) return DEFAULTS; for (var k in DEFAULTS) if (s[k] == null) s[k] = DEFAULTS[k]; return s; })
      .catch(function () { return DEFAULTS; });
    return settingsP;
  }
  function openPopup() {
    if (opened || document.querySelector(".fp-overlay")) return;
    opened = true;
    getSettings().then(function (s) { build(s); setTimeout(function () { opened = false; }, 500); });
  }
  window.RFPopup = { open: openPopup };

  /* any link/button with data-popup or class "js-write" (e.g. the footer "Write to us") opens it */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-popup],.js-write");
    if (t) { e.preventDefault(); openPopup(); }
  });

  /* automatic pop-up on every visit (set window.RF_POPUP_AUTO = false on a page to skip it) */
  if (window.RF_POPUP_AUTO !== false) {
    getSettings().then(function (s) {
      if (!s.enabled && !preview) return;
      var d = preview ? 0.3 : Math.min(MAX_DELAY, Math.max(0, +s.delay_seconds || 0));
      setTimeout(openPopup, d * 1000);
    });
  }
})();
