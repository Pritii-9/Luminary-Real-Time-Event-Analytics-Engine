/**
 * Luminary Analytics — Lightweight Privacy-Friendly Tracker
 * Embed: <script src="http://YOUR_HOST/tracker.js?site=PUBLIC_TOKEN" defer></script>
 */
(function () {
  "use strict";

  // --- Bot detection ---
  if (navigator.webdriver) return;
  var ua = navigator.userAgent || "";
  if (/bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer/i.test(ua)) return;

  // --- Read public_token / site_id from the script tag ---
  var scripts = document.getElementsByTagName("script");
  var token = "";
  var apiBase = "";

  for (var i = 0; i < scripts.length; i++) {
    var s = scripts[i];
    var src = s.src || "";
    if (src.indexOf("tracker") !== -1 || src.indexOf("script.js") !== -1) {
      token = s.getAttribute("data-site-id") || s.getAttribute("data-site") || "";
      if (!token) {
        var match = src.match(/[?&](site|site_id|token)=([^&]+)/);
        if (match) token = decodeURIComponent(match[2]);
      }
      try {
        var url = new URL(src);
        apiBase = url.origin;
      } catch (e) {}
      if (token) break;
    }
  }

  if (!token) {
    console.warn("[Luminary] No site ID or token found in tracker script tag.");
    return;
  }

  var COLLECT_URL = (apiBase || window.location.origin) + "/api/v1/collect";


  // --- Visitor / Session IDs (no cookies) ---
  function uid() {
    return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
      return ((Math.random() * 16) | 0).toString(16);
    });
  }

  var visitorId = localStorage.getItem("lum_vid");
  if (!visitorId) {
    visitorId = "v_" + uid();
    localStorage.setItem("lum_vid", visitorId);
  }

  var sessionId = sessionStorage.getItem("lum_sid");
  if (!sessionId) {
    sessionId = "s_" + uid();
    sessionStorage.setItem("lum_sid", sessionId);
  }

  // --- Extract UTM params ---
  function getUtm() {
    var params = {};
    try {
      var sp = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
        function (k) {
          var v = sp.get(k);
          if (v) params[k] = v;
        }
      );
    } catch (e) {}
    return params;
  }

  // --- Send event ---
  function send(overrides) {
    var utm = getUtm();
    var payload = {
      public_token: token,
      site_id: token,
      event_type: "pageview",

      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || "",
      session_id: sessionId,
      visitor_id: visitorId,
      screen: screen.width + "x" + screen.height,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    };

    // Merge UTMs
    for (var k in utm) payload[k] = utm[k];
    // Merge overrides
    if (overrides) for (var o in overrides) payload[o] = overrides[o];

    var data = JSON.stringify(payload);

    // Use sendBeacon if available, else fetch with keepalive
    if (navigator.sendBeacon) {
      navigator.sendBeacon(COLLECT_URL, new Blob([data], { type: "application/json" }));
    } else {
      fetch(COLLECT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(function () {});
    }
  }

  // --- Track initial pageview ---
  var lastPath = window.location.pathname;
  send();

  // --- SPA: Intercept pushState / replaceState ---
  function wrapHistory(method) {
    var orig = history[method];
    history[method] = function () {
      var result = orig.apply(this, arguments);
      var newPath = window.location.pathname;
      if (newPath !== lastPath) {
        lastPath = newPath;
        // Small delay so the DOM has updated
        setTimeout(function () {
          send();
        }, 50);
      }
      return result;
    };
  }
  wrapHistory("pushState");
  wrapHistory("replaceState");

  // --- SPA: popstate (back/forward) ---
  window.addEventListener("popstate", function () {
    var newPath = window.location.pathname;
    if (newPath !== lastPath) {
      lastPath = newPath;
      send();
    }
  });

  // --- Expose global track function ---
  window.luminary = window.luminary || {};
  window.luminary.track = function (eventName, data) {
    send({
      event_type: "custom",
      path: eventName,
      screen: data ? JSON.stringify(data) : (screen.width + "x" + screen.height),
    });
  };
})();
