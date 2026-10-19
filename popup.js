/* Founder story popup
   - Opens automatically once per browser session after OPEN_DELAY ms.
   - Also opens from any element with the data-popup-open attribute,
     e.g. <a class="btn" href="#contact" data-popup-open>Submit a founder</a>
   - Put your form service URL (Formspree, Getform, etc.) in ENDPOINT below. */
(function () {
  "use strict";

  var ENDPOINT = "";          // e.g. "https://formspree.io/f/xxxxxxx"
  var OPEN_DELAY = 4000;      // ms before auto-open. Set to 0 to disable auto-open.
  var SESSION_KEY = "fp-seen";

  var overlay, box, lastFocus, built = false;

  function build() {
    if (built) return;
    built = true;

    overlay = document.createElement("div");
    overlay.className = "fp-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "fp-title");
    overlay.innerHTML =
      '<div class="fp-box">' +
        '<button type="button" class="fp-close" aria-label="Close">&times;</button>' +
        '<div class="fp-head">' +
          '<span class="fp-brand">RAJA FOUNDER</span>' +
          '<h2 id="fp-title">Share your founder story</h2>' +
          '<p>Every great company starts with one bold decision. Tell us yours and we may feature it.</p>' +
        '</div>' +
        '<form class="fp-form" novalidate>' +
          '<label>Your name<input type="text" name="name" autocomplete="name" required></label>' +
          '<label>Email address<input type="email" name="email" autocomplete="email" required></label>' +
          '<label>Your story<textarea name="story" required></textarea></label>' +
          '<div class="fp-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          '<button type="submit" class="btn">Submit my story</button>' +
          '<p class="fp-msg" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<p class="fp-foot">Your story could inspire the next generation of founders.</p>' +
      '</div>';
    document.body.appendChild(overlay);

    box = overlay.querySelector(".fp-box");
    overlay.querySelector(".fp-close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", trapTab);
    overlay.querySelector("form").addEventListener("submit", submit);
  }

  function focusables() {
    return [].slice.call(overlay.querySelectorAll("button, input, textarea, a[href]"))
      .filter(function (el) { return !el.disabled && el.tabIndex !== -1 && el.offsetParent !== null; });
  }

  function trapTab(e) {
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onKey(e) { if (e.key === "Escape") close(); }

  function open() {
    build();
    if (overlay.classList.contains("open")) return;
    lastFocus = document.activeElement;
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch (e) {}
    setTimeout(function () { var i = overlay.querySelector("input"); if (i) i.focus(); }, 50);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function submit(e) {
    e.preventDefault();
    var f = e.target, msg = f.querySelector(".fp-msg"), btn = f.querySelector(".btn");
    msg.className = "fp-msg";

    if (f.website.value) return;                       // honeypot: bots fill this in

    var name = f.name.value.trim(), email = f.email.value.trim(), story = f.story.value.trim();
    if (!name) return fail("Please enter your name.", f.name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email address.", f.email);
    if (story.length < 20) return fail("Please tell us a little more about your story.", f.story);

    if (!ENDPOINT) return fail("Submissions are not connected yet. Please check back soon.");

    btn.disabled = true;
    fetch(ENDPOINT, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw 0;
        msg.textContent = "Thank you! Your story has been received.";
        msg.className = "fp-msg ok";
        f.reset();
        setTimeout(close, 2500);
      })
      .catch(function () { fail("Something went wrong. Please try again."); })
      .then(function () { btn.disabled = false; });

    function fail(text, field) {
      msg.textContent = text;
      msg.className = "fp-msg err";
      if (field) field.focus();
    }
  }

  function init() {
    // Manual triggers
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-popup-open]") : null;
      if (t) { e.preventDefault(); open(); }
    });

    // Auto-open once per session
    var seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "1"; } catch (e) {}
    if (OPEN_DELAY > 0 && !seen) setTimeout(open, OPEN_DELAY);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
