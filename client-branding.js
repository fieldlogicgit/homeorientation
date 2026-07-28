(function () {
  "use strict";

  var branding = window.PUNCH_LOGIC_BRANDING || {};
  if (!branding.removePunchLogicBranding) return;

  var logoUrl = String(branding.logoUrl || "").trim();
  var clientName = String(branding.clientName || "").trim() || "Client";
  var manifestUrl = String(branding.manifestUrl || "").trim();
  var logoImages = document.querySelectorAll('img[src*="punch-logic-combined-logo"]');

  logoImages.forEach(function (image) {
    var link = image.closest(".brand-home-link");
    if (!logoUrl) {
      if (link) link.remove();
      else image.remove();
      return;
    }

    image.src = logoUrl;
    image.alt = clientName;
    image.classList.add("client-brand-logo");
    if (link) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.setAttribute("aria-label", clientName);
      link.style.cursor = "default";
    }
  });

  document.querySelectorAll(".app-brand, .brand-block, .report-brand").forEach(function (container) {
    if (!container.querySelector("img")) container.classList.add("client-branding-empty");
  });

  document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
    if (!logoUrl) link.remove();
    else link.href = logoUrl;
  });

  if (manifestUrl) {
    var manifest = document.querySelector('link[rel="manifest"]');
    if (manifest) manifest.href = manifestUrl;
  }

  if (clientName && document.title) {
    document.title = document.title.replace(/Punch Logic/gi, clientName);
  }
})();
