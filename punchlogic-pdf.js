(function initializePunchLogicPdf(global) {
  const colors = {
    blue: [18, 94, 168],
    orange: [255, 87, 34],
    green: [24, 135, 95],
    ink: [23, 35, 45],
    muted: [100, 113, 124],
    line: [217, 224, 229],
    soft: [245, 247, 248]
  };

  async function buildIssuePdf(doc, options = {}) {
    const page = {
      width: doc.internal.pageSize.getWidth(),
      height: doc.internal.pageSize.getHeight(),
      margin: 42
    };
    const groups = normalizeGroups(options);
    const branding = options.branding || await getBranding();
    let renderedGroups = 0;

    for (const group of groups) {
      const issues = (group.issues || []).filter((issue) => !issue.completed);
      if (!issues.length) continue;
      if (renderedGroups) doc.addPage();
      renderedGroups += 1;
      let y = addReportHeader(doc, page, group, branding);
      y = addTableHeader(doc, page, y + 14);

      for (const [index, issue] of issues.entries()) {
        const photoChunks = getPhotoChunks(issue);
        for (const [chunkIndex, photos] of photoChunks.entries()) {
          const continuation = chunkIndex > 0;
          const rowHeight = getRowHeight(doc, issue, photos, continuation);
          if (y + rowHeight > page.height - page.margin - 18) {
            doc.addPage();
            y = addHeader(doc, page, options.title || "Crew Punch List", group, true, branding);
            y = addTableHeader(doc, page, y + 10);
          }
          y = await addIssueRow(doc, page, issue, index + 1, photos, continuation, y, rowHeight, options.getPhotoSource);
        }
      }
    }

    if (!renderedGroups) throw new Error("There are no open items in this report.");
    if (options.reportUrl && !options.trade) await addQrPage(doc, page, options.reportUrl);
    addPageNumbers(doc, page);
  }

  function normalizeGroups(options) {
    if (Array.isArray(options.groups) && options.groups.length) {
      return options.groups.map((group) => ({
        projectName: group.projectName || options.projectName || "-",
        homesite: normalizeHomesite(group.homesite),
        trade: group.trade || options.trade || "",
        issues: group.issues || []
      }));
    }
    return [{
      projectName: options.projectName || "-",
      homesite: normalizeHomesite(options.homesite),
      trade: options.trade || "",
      issues: options.issues || []
    }];
  }

  function normalizeHomesite(homesite = {}) {
    const fields = Array.isArray(homesite.fields)
      ? homesite.fields
      : Object.entries(homesite.fields || {}).map(([label, value]) => ({ label, value }));
    return {
      ...homesite,
      name: homesite.name || homesite.homesiteName || "Site",
      fields: fields
        .map((field) => ({ label: String(field.label || "").trim(), value: String(field.value ?? "").trim() }))
        .filter((field) => field.label && field.value)
    };
  }

  function addHeader(doc, page, title, group, continuation, branding) {
    const top = page.margin;
    if (branding.logoDataUrl) {
      const properties = doc.getImageProperties(branding.logoDataUrl);
      const scale = Math.min(105 / properties.width, 28 / properties.height);
      doc.addImage(branding.logoDataUrl, imageFormat(branding.logoDataUrl), page.margin, top, properties.width * scale, properties.height * scale);
    } else if (!branding.removed) {
      doc.setFillColor(...colors.blue);
      doc.roundedRect(page.margin, top, 28, 28, 4, 4, "F");
      doc.setFillColor(...colors.orange);
      doc.rect(page.margin + 21, top, 7, 7, "F");
      doc.link(page.margin, top, 28, 28, { url: "http://punchlogic.app" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text("P", page.margin + 14, top + 19, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(...colors.blue);
      doc.text("punch", page.margin + 36, top + 18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.orange);
      doc.text("logic", page.margin + 75, top + 18);
    }

    return top + 48;
  }

  function addReportHeader(doc, page, group, branding) {
    const top = page.margin;
    addHeader(doc, page, "", group, false, branding);
    const logoBottom = top + 28;
    const logoColumnWidth = branding.removed && !branding.logoDataUrl ? 0 : 124;
    const summaryLeft = page.margin + logoColumnWidth;
    const summaryWidth = page.width - page.margin * 2 - logoColumnWidth;
    const summaryBottom = addSiteSummary(doc, page, group, top, summaryLeft, summaryWidth);
    return Math.max(logoBottom, summaryBottom);
  }

  function addSiteSummary(doc, page, group, topY, left = page.margin, width = page.width - page.margin * 2) {
    const details = [
      ["Project", group.projectName || "-"],
      ["Site", group.homesite?.name || "-"],
      ...(group.homesite?.fields || []).map((field) => [field.label, field.value])
    ];
    if (group.trade) details.push(["Crew", group.trade]);
    const columnCount = 3;
    const columnWidth = width / columnCount;
    const valueWidth = columnWidth - 24;
    const rows = [];
    for (let index = 0; index < details.length; index += columnCount) {
      const cells = details.slice(index, index + columnCount).map(([label, value]) => ({
        label: String(label || "Field"),
        lines: doc.splitTextToSize(String(value || "-"), valueWidth)
      }));
      rows.push({ cells, height: 18 + Math.max(1, ...cells.map((cell) => cell.lines.length)) * 9 });
    }
    const boxHeight = rows.reduce((sum, row) => sum + row.height, 0) + 12;
    doc.setFillColor(...colors.soft);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(left, topY, width, boxHeight, 4, 4, "FD");
    let rowTop = topY + 10;
    rows.forEach((row) => {
      row.cells.forEach((cell, columnIndex) => {
        const x = left + 12 + columnIndex * columnWidth;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.3);
        doc.setTextColor(...colors.blue);
        doc.text(cell.label.toUpperCase(), x, rowTop);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.1);
        doc.setTextColor(...colors.ink);
        doc.text(cell.lines, x, rowTop + 11, { lineHeightFactor: 1.05 });
      });
      rowTop += row.height;
    });
    return topY + boxHeight;
  }

  function getColumns(page) {
    const left = page.margin;
    const right = page.width - page.margin;
    return {
      left,
      right,
      number: { x: left + 8, width: 26 },
      crew: { x: left + 40, width: 65 },
      location: { x: left + 113, width: 76 },
      item: { x: left + 197, width: 118 },
      photos: { x: left + 323, width: right - left - 331 }
    };
  }

  function addTableHeader(doc, page, topY) {
    const columns = getColumns(page);
    doc.setFillColor(...colors.ink);
    doc.rect(columns.left, topY, columns.right - columns.left, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(255, 255, 255);
    doc.text("#", columns.number.x, topY + 15);
    doc.text("CREW", columns.crew.x, topY + 15);
    doc.text("LOCATION", columns.location.x, topY + 15);
    doc.text("ITEM / NOTES", columns.item.x, topY + 15);
    doc.text("PHOTO", columns.photos.x, topY + 15);
    return topY + 24;
  }

  function getPhotoChunks(issue) {
    const photos = [...(issue.photos || [])].sort((a, b) =>
      Number(Boolean(a.completionProof ?? a.completion_proof)) - Number(Boolean(b.completionProof ?? b.completion_proof))
    );
    if (!photos.length) return [[]];
    const chunks = [];
    for (let index = 0; index < photos.length; index += 4) chunks.push(photos.slice(index, index + 4));
    return chunks;
  }

  function getRowHeight(doc, issue, photos, continuation) {
    const page = { width: doc.internal.pageSize.getWidth(), margin: 42 };
    const columns = getColumns(page);
    const itemLines = doc.splitTextToSize(continuation ? "Additional photos for this item" : issue.issue || issue.item || "Item", columns.item.width).length;
    const noteLines = continuation ? 0 : doc.splitTextToSize(issue.notes || issue.sharedNote || "No notes added.", columns.item.width).length;
    const textHeight = continuation ? 76 : 66 + itemLines * 10 + noteLines * 8;
    return Math.max(116, textHeight, 18 + Math.max(photos.length, 1) * 124);
  }

  async function addIssueRow(doc, page, issue, number, photos, continuation, topY, rowHeight, getPhotoSource) {
    const columns = getColumns(page);
    const bottom = topY + rowHeight;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...colors.line);
    doc.rect(columns.left, topY, columns.right - columns.left, rowHeight, "FD");
    [columns.crew.x - 8, columns.location.x - 8, columns.item.x - 8, columns.photos.x - 8].forEach((x) => doc.line(x, bottom, x, topY));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.blue);
    doc.text(String(number).padStart(2, "0"), columns.number.x, topY + 20);
    doc.setFontSize(5.4);
    doc.setTextColor(...(issue.tradeCompleted || issue.trade_completed ? colors.green : colors.orange));
    doc.text(issue.tradeCompleted || issue.trade_completed ? ["CREW", "COMPLETED"] : "OPEN", columns.number.x, topY + 37, { lineHeightFactor: 1.05 });
    if (continuation) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(...colors.muted);
      doc.text("CONT.", columns.number.x, topY + 58);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(...colors.ink);
    doc.text(doc.splitTextToSize(issue.trade || issue.crew || "-", columns.crew.width), columns.crew.x, topY + 18);
    const location = issue.locationArea || issue.location_area || issue.room || issue.location || "-";
    doc.text(doc.splitTextToSize(location, columns.location.width), columns.location.x, topY + 18);
    const detail = issue.locationDetail || issue.location_detail || "";
    if (detail) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.4);
      doc.setTextColor(...colors.muted);
      doc.text(doc.splitTextToSize(detail, columns.location.width), columns.location.x, topY + 46);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colors.ink);
    const itemText = continuation ? `Additional photos for item ${number}` : issue.issue || issue.item || "Item";
    const itemLines = doc.splitTextToSize(itemText, columns.item.width);
    doc.text(itemLines, columns.item.x, topY + 17, { lineHeightFactor: 1.08 });
    if (!continuation) {
      const notesY = topY + 29 + itemLines.length * 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.7);
      doc.setTextColor(...colors.muted);
      doc.text("NOTES", columns.item.x, notesY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(doc.splitTextToSize(issue.notes || issue.sharedNote || "No notes added.", columns.item.width), columns.item.x, notesY + 11, { lineHeightFactor: 1.08 });
      doc.setFontSize(5.7);
      doc.setTextColor(...colors.muted);
      doc.text(`Added by ${issue.addedByName || issue.createdBy || issue.added_by || "-"}`, columns.item.x, bottom - 20, { maxWidth: columns.item.width });
      doc.text(`Date Added ${formatDate(issue.createdAt || issue.created_at)}`, columns.item.x, bottom - 10, { maxWidth: columns.item.width });
    }

    if (!photos.length) {
      addPhotoPlaceholder(doc, columns.photos.x, topY + 10, columns.photos.width, 110, "No photo");
    } else {
      for (const [index, photo] of photos.entries()) {
        const x = columns.photos.x;
        const imageY = topY + 10 + index * 124;
        doc.setFillColor(...colors.soft);
        doc.setDrawColor(...colors.line);
        doc.rect(x, imageY, columns.photos.width, 110, "FD");
        try {
          const source = typeof getPhotoSource === "function" ? getPhotoSource(photo) : photo.dataUrl || photo.url || photo.src || "";
          const dataUrl = await toDataUrl(source);
          addContainedImage(doc, dataUrl, x + 2, imageY + 2, columns.photos.width - 4, 106);
        } catch {
          addPhotoPlaceholder(doc, x, imageY, columns.photos.width, 110, "Unavailable");
        }
        if (photo.completionProof ?? photo.completion_proof) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(...colors.ink);
          doc.text("COMPLETION PHOTO", x, imageY + 119, { maxWidth: columns.photos.width });
        }
      }
    }
    return bottom;
  }

  function addContainedImage(doc, dataUrl, x, y, boxWidth, boxHeight) {
    const properties = doc.getImageProperties(dataUrl);
    const scale = Math.min(boxWidth / properties.width, boxHeight / properties.height);
    const width = properties.width * scale;
    const height = properties.height * scale;
    doc.addImage(dataUrl, imageFormat(dataUrl), x + (boxWidth - width) / 2, y + (boxHeight - height) / 2, width, height);
  }

  function addPhotoPlaceholder(doc, x, y, width, height, text) {
    doc.setFillColor(...colors.soft);
    doc.rect(x + 2, y + 2, width - 4, height - 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    doc.text(text, x + width / 2, y + height / 2 + 2, { align: "center" });
  }

  async function addQrPage(doc, page, reportUrl) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...colors.ink);
    doc.text("View this report in browser", page.width / 2, 120, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...colors.muted);
    doc.text("Scan this QR code.", page.width / 2, 145, { align: "center" });
    doc.setDrawColor(...colors.blue);
    doc.line(page.width / 2 - 130, 164, page.width / 2 + 130, 164);
    try {
      doc.addImage(await qrDataUrl(reportUrl), "PNG", page.width / 2 - 105, 190, 210, 210);
    } catch {
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(reportUrl, page.width - page.margin * 2), page.margin, 210);
    }
  }

  function addPageNumbers(doc, page) {
    const total = doc.getNumberOfPages();
    for (let number = 1; number <= total; number += 1) {
      doc.setPage(number);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(`Page ${number} of ${total}`, page.width - page.margin, page.height - 24, { align: "right" });
    }
  }

  async function getBranding() {
    const branding = global.PUNCH_LOGIC_BRANDING || {};
    if (!branding.removePunchLogicBranding) return { removed: false, logoDataUrl: "" };
    if (!String(branding.logoUrl || "").trim()) return { removed: true, logoDataUrl: "" };
    try {
      return { removed: true, logoDataUrl: await toDataUrl(branding.logoUrl) };
    } catch {
      return { removed: true, logoDataUrl: "" };
    }
  }

  async function toDataUrl(source) {
    if (!source) throw new Error("Photo unavailable");
    if (String(source).startsWith("data:")) return source;
    const response = await fetch(source, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Photo unavailable");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function qrDataUrl(value) {
    if (!global.QRCode?.toDataURL) return Promise.reject(new Error("QR unavailable"));
    return new Promise((resolve, reject) => {
      global.QRCode.toDataURL(value, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 360,
        color: { dark: "#17232dff", light: "#ffffffff" }
      }, (error, dataUrl) => error ? reject(error) : resolve(dataUrl));
    });
  }

  function imageFormat(dataUrl) {
    const value = String(dataUrl || "").slice(0, 40).toLowerCase();
    if (value.includes("png")) return "PNG";
    if (value.includes("webp")) return "WEBP";
    return "JPEG";
  }

  function formatDate(value) {
    const date = new Date(value || "");
    if (!Number.isFinite(date.getTime())) return "-";
    return date.toLocaleDateString();
  }

  global.PUNCH_LOGIC_PDF = { buildIssuePdf };
})(window);
