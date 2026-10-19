/* Tiny Supabase REST helper for the public website (no library needed). */
(function () {
  var C = window.RF_SUPABASE || {};
  var base = String(C.url || "").replace(/\/+$/, "");
  function ready() { return /^(https:\/\/|http:\/\/localhost)/.test(base) && !!C.anonKey && !/YOUR_/.test(C.anonKey); }
  function headers(extra) {
    var h = { apikey: C.anonKey };
    if (/^eyJ/.test(C.anonKey)) h.Authorization = "Bearer " + C.anonKey; // legacy JWT keys only
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  window.RFDB = {
    ready: ready,
    select: function (table, query) {
      if (!ready()) return Promise.reject(new Error("Supabase not configured"));
      return fetch(base + "/rest/v1/" + table + "?" + (query || "select=*"), { headers: headers() })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    },
    /* resolves with the HTTP status (201 = saved, 409 = duplicate) */
    insert: function (table, row) {
      if (!ready()) return Promise.reject(new Error("Supabase not configured"));
      return fetch(base + "/rest/v1/" + table, {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(row)
      }).then(function (r) { return r.status; });
    }
  };
})();
