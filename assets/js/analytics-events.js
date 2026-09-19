/* Classify and send site clicks to GA4 as `site_click` events.
   Reports: Events → site_click, then break down by click_type / link_text / link_url. */
(function (root) {
  var SOCIAL_HOSTS = [
    "github.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "scholar.google.",
    "youtube.com",
    "youtu.be",
    "orcid.org",
    "researchgate.net",
    "bsky.app",
    "stackoverflow.com",
  ];

  function sectionFromPath(path) {
    path = String(path || "/").split("?")[0].split("#")[0];
    if (path.length > 1) path = path.replace(/\/+$/, "");
    if (path === "/" || path === "") return "home";
    if (path.indexOf("/publication") === 0) return "publication";
    if (path.indexOf("/portfolio") === 0) return "portfolio";
    if (path.indexOf("/talk") === 0) return "talk";
    if (path.indexOf("/teaching") === 0) return "teaching";
    if (path.indexOf("/service") === 0) return "service";
    if (path.indexOf("/cv") === 0) return "cv";
    return "other";
  }

  function hostMatches(host, needles) {
    host = String(host || "").toLowerCase();
    for (var i = 0; i < needles.length; i++) {
      if (host.indexOf(needles[i]) !== -1) return true;
    }
    return false;
  }

  function isFile(path) {
    return /\.(pdf|bib|pptx?|docx?|zip|csv|txt)$/i.test(path);
  }

  function fallbackText(text, path, href) {
    text = String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    if (text) return text;
    var name = String(path || "").split("/").pop();
    return decodeURIComponent(name || href || "");
  }

  function classify(opts) {
    opts = opts || {};
    var href = opts.href || "";
    if (!href || href.indexOf("javascript:") === 0) return null;
    if (opts.inThemeToggle) return null;

    var origin = opts.origin || "https://example.com";
    var url;
    try {
      url = new URL(href, origin);
    } catch (e) {
      return null;
    }

    var path = url.pathname;
    var text = fallbackText(opts.text, path, href);
    var pageSection = sectionFromPath(opts.pagePath || "/");
    var destSection = sectionFromPath(path);
    var sameOrigin = url.origin === new URL(origin).origin;

    if (url.protocol === "mailto:") {
      return { click_type: "email", link_url: href, link_text: text };
    }
    if (url.protocol === "tel:") {
      return { click_type: "phone", link_url: href, link_text: text };
    }
    if (opts.inNav) {
      return { click_type: "navigation", link_url: url.href, link_text: text };
    }
    if (opts.inSidebar) {
      return { click_type: "social", link_url: url.href, link_text: text };
    }

    if (isFile(path) || path.indexOf("/files/") === 0) {
      var fileSection = "file";
      var haystack = (text + " " + path).toLowerCase();
      if (
        /paper/.test(haystack) ||
        /slide/.test(haystack) ||
        /bibtex/.test(haystack) ||
        /\.bib$/i.test(path)
      ) {
        fileSection = "publication";
      } else if (pageSection !== "home" && pageSection !== "other") {
        fileSection = pageSection;
      }
      return { click_type: fileSection, link_url: url.href, link_text: text };
    }

    if (sameOrigin && destSection !== "home" && destSection !== "other") {
      return { click_type: destSection, link_url: url.href, link_text: text };
    }

    if (!sameOrigin) {
      if (
        pageSection === "publication" ||
        pageSection === "portfolio" ||
        pageSection === "talk"
      ) {
        return { click_type: pageSection, link_url: url.href, link_text: text };
      }
      if (hostMatches(url.hostname, SOCIAL_HOSTS)) {
        return { click_type: "social", link_url: url.href, link_text: text };
      }
      return { click_type: "outbound", link_url: url.href, link_text: text };
    }

    return { click_type: "internal", link_url: url.href, link_text: text };
  }

  function bind(doc, gtagFn) {
    if (!doc || typeof gtagFn !== "function" || !doc.addEventListener) return;
    doc.addEventListener(
      "click",
      function (e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var a = target.closest("a[href]");
        if (!a) return;
        var payload = classify({
          href: a.getAttribute("href"),
          text: a.textContent,
          pagePath: (root.location && root.location.pathname) || "/",
          origin: (root.location && root.location.origin) || undefined,
          inNav: !!a.closest("#site-nav"),
          inSidebar: !!a.closest(".author__urls"),
          inThemeToggle: !!a.closest("#theme-toggle"),
        });
        if (!payload) return;
        gtagFn("event", "site_click", {
          click_type: payload.click_type,
          link_text: payload.link_text,
          link_url: payload.link_url,
          transport_type: "beacon",
        });
      },
      true
    );
  }

  var api = { classify: classify, sectionFromPath: sectionFromPath, bind: bind };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.SiteAnalytics = api;
    var start = function () {
      if (typeof root.gtag === "function") bind(root.document, root.gtag);
    };
    if (root.document) {
      if (root.document.readyState === "loading") {
        root.document.addEventListener("DOMContentLoaded", start);
      } else {
        start();
      }
    }
  }

  // ponytail: assert-based self-check; run with `node assets/js/analytics-events.js`
  if (typeof require !== "undefined" && require.main === module) {
    var assert = require("assert");
    var origin = "https://coreyyangsmith.github.io";
    function c(partial) {
      partial.origin = partial.origin || origin;
      partial.pagePath = partial.pagePath || "/";
      return classify(partial);
    }
    assert.strictEqual(c({ href: "mailto:a@b.com", text: "Email" }).click_type, "email");
    assert.strictEqual(
      c({ href: "/publications/", text: "Publications", inNav: true }).click_type,
      "navigation"
    );
    assert.strictEqual(
      c({ href: "https://github.com/coreyyangsmith", text: "GitHub", inSidebar: true }).click_type,
      "social"
    );
    assert.strictEqual(
      c({ href: "https://github.com/coreyyangsmith", text: "GitHub" }).click_type,
      "social"
    );
    assert.strictEqual(
      c({
        href: "/publication/2026-07-05-LLMTrust-2026",
        text: "Fairness in Multi-Agent Systems",
      }).click_type,
      "publication"
    );
    assert.strictEqual(
      c({
        href: "/files/2026-07-05-LLMTrust-2026-Paper.pdf",
        text: "Download Paper",
        pagePath: "/publication/2026-07-05-LLMTrust-2026",
      }).click_type,
      "publication"
    );
    assert.strictEqual(
      c({
        href: "/files/2026-07-05-LLMTrust-2026.bib",
        text: "Download Bibtex",
      }).click_type,
      "publication"
    );
    assert.strictEqual(
      c({
        href: "http://icelens-production.up.railway.app",
        text: "Live Demo",
        pagePath: "/portfolio/1_IceLens/",
      }).click_type,
      "portfolio"
    );
    assert.strictEqual(
      c({ href: "/talks/2026-09-11-TALK-From-Chatbots-to-MAS", text: "Talk" }).click_type,
      "talk"
    );
    assert.strictEqual(c({ href: "#theme-toggle", inThemeToggle: true }), null);
    console.log("analytics-events.js ok");
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
