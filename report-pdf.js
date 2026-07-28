(function initializeReportPdfMode(global) {
  const params = new URLSearchParams(global.location.search);
  if (params.get("pdf") !== "1") return;

  document.documentElement.classList.add("report-pdf-mode");
  let generationStarted = false;

  function loadScript(source, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-report-library="${source}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = source;
      script.dataset.reportLibrary = source;
      script.onload = resolve;
      script.onerror = () => reject(new Error("The PDF library could not be loaded."));
      document.head.append(script);
    });
  }

  function reportGroups(report) {
    if (report.homesite) {
      return [{
        projectName: report.community || report.projectName || "-",
        homesite: report.homesite,
        trade: report.trade || "",
        issues: report.issues || []
      }];
    }

    const groups = new Map();
    for (const issue of report.issues || []) {
      const siteId = issue.homesiteId || issue.siteId || issue.homesiteName || issue.site || "site";
      if (!groups.has(siteId)) {
        const fields = Array.isArray(issue.siteFields) ? [...issue.siteFields] : [];
        if (issue.address && !fields.some((field) => String(field.label || "").toLowerCase() === "address")) {
          fields.push({ label: "Address", value: issue.address });
        }
        groups.set(siteId, {
          projectName: issue.community || report.projectName || "All projects",
          homesite: { id: siteId, name: issue.homesiteName || issue.site || "Site", fields },
          trade: report.trade || "",
          issues: []
        });
      }
      groups.get(siteId).issues.push(issue);
    }
    return [...groups.values()].sort((a, b) =>
      String(a.projectName).localeCompare(String(b.projectName)) ||
      String(a.homesite.name).localeCompare(String(b.homesite.name))
    );
  }

  function photoSource(photo, detail) {
    if (photo.dataUrl) return photo.dataUrl;
    const query = new URLSearchParams({
      id: photo.id || photo.storage_path || "",
      access: detail.reportAccessToken || "",
      reportId: detail.reportId || "",
      reportKind: detail.reportKind || "site"
    });
    return `/.netlify/functions/photo?${query.toString()}`;
  }

  async function generate(event) {
    if (generationStarted) return;
    generationStarted = true;
    const detail = event.detail || {};
    const report = detail.report;
    if (!report) return;

    try {
      await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", () => Boolean(global.jspdf?.jsPDF));
      await loadScript("vendor/qrcode.js", () => Boolean(global.QRCode?.toDataURL));
      const { jsPDF } = global.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const groups = reportGroups(report);
      const reportUrl = new URL(global.location.href);
      reportUrl.searchParams.delete("pdf");
      const scopeName = report.trade || report.projectName || report.community || groups[0]?.homesite?.name || "Punch Logic";
      await global.PUNCH_LOGIC_PDF.buildIssuePdf(doc, {
        title: report.trade ? `${report.trade} Item Report` : "Crew Punch List",
        groups,
        trade: report.trade || "",
        reportUrl: reportUrl.toString(),
        getPhotoSource: (photo) => photoSource(photo, detail)
      });
      doc.save(`${scopeName}-open-items.pdf`.replace(/[^a-z0-9.-]+/gi, "-"));
    } catch (error) {
      console.error("Dashboard report PDF failed.", error);
      global.alert(error?.message || "The PDF could not be created.");
    }
  }

  global.addEventListener("punchlogicreportready", generate, { once: true });
})(window);
