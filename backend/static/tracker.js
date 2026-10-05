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

  // --- Read public_token / site_id and API host from script tag or window config ---
  var token = "";
  var apiBase = "";

  function inspectScript(s) {
    if (!s) return;
    var src = s.src || "";
    var foundToken = s.getAttribute("data-site-id") || s.getAttribute("data-site") || "";
    if (!foundToken && src) {
      var match = src.match(/[?&](site|site_id|token)=([^&]+)/);
      if (match) foundToken = decodeURIComponent(match[2]);
    }
    var customHost = s.getAttribute("data-api-host") || s.getAttribute("data-api") || s.getAttribute("data-host");
    var foundOrigin = "";
    if (customHost) {
      foundOrigin = customHost.replace(/\/$/, "");
    } else if (src) {
      try {
        var parsedUrl = new URL(src, window.location.href);
        foundOrigin = parsedUrl.origin;
      } catch (e) {}
    }
    if (foundToken && !token) token = foundToken;
    if (foundOrigin && !apiBase) apiBase = foundOrigin;
  }

  // 1. Check document.currentScript (standard modern browser API)
  if (document.currentScript) {
    inspectScript(document.currentScript);
  }

  // 2. Check global configuration object if available
  if (!token || !apiBase) {
    var globalCfg = window.LUMINARY_CONFIG || window.luminaryConfig;
    if (globalCfg) {
      token = token || globalCfg.siteId || globalCfg.token || globalCfg.site;
      apiBase = apiBase || globalCfg.apiHost || globalCfg.host || globalCfg.endpoint;
    }
  }

  // 3. Fallback: scan all script tags
  if (!token || !apiBase) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i];
      var src = s.src || "";
      if (src.indexOf("tracker") !== -1 || src.indexOf("script.js") !== -1 || s.getAttribute("data-site-id") || s.getAttribute("data-site")) {
        inspectScript(s);
        if (token && apiBase) break;
      }
    }
  }

  if (!token) {
    console.warn("[Luminary] No site ID or token found in tracker script tag.");
    return;
  }

  var COLLECT_URL = (apiBase || window.location.origin) + "/api/v1/collect";


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

  function getVisitorId() {
    try {
      var vid = localStorage.getItem("_lum_vid");
      if (!vid) {
        vid = "vis_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        localStorage.setItem("_lum_vid", vid);
      }
      return vid;
    } catch (e) {
      return "vis_" + Math.random().toString(36).substring(2, 11);
    }
  }

  function getSessionId() {
    try {
      var sid = sessionStorage.getItem("_lum_sid");
      if (!sid) {
        sid = "ses_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        sessionStorage.setItem("_lum_sid", sid);
      }
      return sid;
    } catch (e) {
      return "ses_" + Math.random().toString(36).substring(2, 11);
    }
  }

  // --- Send event ---
  function send(overrides) {
    var utm = getUtm();
    var payload = {
      public_token: token,
      site_id: token.startsWith("site_") ? token : undefined,
      event_type: "pageview",
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || "",
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      screen: screen.width + "x" + screen.height,
      language: navigator.language || "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    };


    // Merge UTMs
    for (var k in utm) payload[k] = utm[k];
    // Merge overrides
    if (overrides) for (var o in overrides) payload[o] = overrides[o];

    var data = JSON.stringify(payload);

    // Send telemetry via fetch with keepalive
    fetch(COLLECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data,
      keepalive: true,
    }).catch(function () {});


  }

  // --- Track initial pageview ---
  var lastPath = window.location.pathname;
  send();

  function extractPath(urlArg) {
    try {
      if (typeof urlArg === "string" && urlArg) {
        var a = document.createElement("a");
        a.href = urlArg;
        return a.pathname;
      }
    } catch (e) {}
    return window.location.pathname;
  }

  // --- SPA: Intercept pushState / replaceState ---
  function wrapHistory(method) {
    var orig = history[method];
    if (typeof orig !== "function") return;
    history[method] = function () {
      var result = orig.apply(this, arguments);
      var targetPath = extractPath(arguments[2]) || window.location.pathname;
      if (targetPath !== lastPath) {
        lastPath = targetPath;
        setTimeout(function () {
          send();
        }, 100);
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
      setTimeout(function () {
        send();
      }, 100);
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

  // --- Session Replay Capture ---
  var coords = [];
  var lastX = 0;
  var lastY = 0;
  var isTracking = true;

  document.addEventListener("mousemove", function (e) {
    if (!isTracking) return;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  document.addEventListener("click", function (e) {
    if (!isTracking) return;
    coords.push({
      x: e.clientX,
      y: e.clientY,
      t: Date.now(),
      type: "click"
    });
  });

  var intervalId = setInterval(function () {
    if (!isTracking) return;
    var w = window.innerWidth || document.documentElement.clientWidth || 1;
    var h = window.innerHeight || document.documentElement.clientHeight || 1;
    coords.push({
      x: Number((lastX / w).toFixed(4)),
      y: Number((lastY / h).toFixed(4)),
      t: Date.now(),
      type: "move"
    });
  }, 100);

  function flushReplay() {
    if (!isTracking) return;
    isTracking = false;
    clearInterval(intervalId);
    if (coords.length === 0) return;

    var payload = {
      site_id: token,
      public_token: token,
      session_id: token + "_" + Date.now(),
      path: window.location.pathname,
      coordinates: coords
    };

    var REPLAY_URL = (apiBase || window.location.origin) + "/api/session-replay";
    var payloadStr = JSON.stringify(payload);
    var sent = false;

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([payloadStr], { type: "text/plain" });
        sent = navigator.sendBeacon(REPLAY_URL, blob);
      } catch (e) {
        sent = false;
      }
    }

    if (!sent) {
      fetch(REPLAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
        keepalive: true,
      }).catch(function () {});
    }
  }

  window.addEventListener("pagehide", flushReplay);
  window.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flushReplay();
    }
  });
})();

