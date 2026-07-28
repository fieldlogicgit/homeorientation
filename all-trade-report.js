const params = new URLSearchParams(window.location.search);
const reportId = params.get("r") || "all-open-items";
const tradeKey = params.get("trade") || "";
const tradeNameParam = params.get("tradeName") || "";
const reportAccessToken = params.get("access") || tradeKey;
const isAllItemsReport = !tradeKey;
const shortReportCode = params.get("short") || "";
if (/^[A-Za-z0-9_-]{12}$/.test(shortReportCode)) {
  window.history.replaceState(null, "", `/r/${encodeURIComponent(shortReportCode)}`);
}
const communityFilter = document.querySelector("#communityFilter");
const homesiteFilter = document.querySelector("#homesiteFilter");
const sortSelect = document.querySelector("#sortSelect");
const reportTitle = document.querySelector("#reportTitle");
const reportMeta = document.querySelector("#reportMeta");
const reportDetails = document.querySelector("#reportDetails");
const issueList = document.querySelector("#issueList");
const supabaseConfig = window.FIELD_DRIVE_SUPABASE || {};
const allTradeReportSupabase =
  supabaseConfig.url &&
  supabaseConfig.publishableKey &&
  window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
    : null;
let report;
let reportSyncClient;
const reportLanguage = window.PUNCH_LOGIC_REPORT_LANGUAGE;

communityFilter.addEventListener("change", () => {
  populateHomesiteFilter();
  renderIssues();
});
homesiteFilter.addEventListener("change", renderIssues);
sortSelect.addEventListener("change", renderIssues);
window.addEventListener("punchlogiclanguagechange", () => {
  if (report) renderReport();
});
loadReport();

async function loadReport() {
  if (!reportAccessToken) {
    showEmpty("Missing report link.");
    return;
  }

  try {
    const tradeQuery = tradeKey ? `&trade=${encodeURIComponent(tradeKey)}&tradeName=${encodeURIComponent(tradeNameParam)}` : "";
    const response = await fetch(`/.netlify/functions/all-report?id=${encodeURIComponent(reportId)}${tradeQuery}&access=${encodeURIComponent(reportAccessToken)}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        const result = await response.json().catch(() => ({}));
        report = null;
        showEmpty(result.error || "This report link is invalid, expired, or revoked.");
        return;
      }
      report = loadLocalReport();
      if (report) {
        renderReport();
        return;
      }
      showEmpty("Report not found.");
      return;
    }

    report = await response.json();
    renderReport();
  } catch {
    report = loadLocalReport();
    if (report) {
      renderReport();
      return;
    }
    showEmpty("Report could not be loaded.");
  }
}

function loadLocalReport() {
  try {
    const state = loadLocalAppState();
    const keys = JSON.parse(localStorage.getItem("constructionIssueReport.allTradeReportKeys.v1") || "{}");
    const matchedScopeKey = Object.entries(keys).find(([, key]) => key === tradeKey)?.[0] || "";
    const selectedTrade = tradeNameParam || (matchedScopeKey.includes("::") ? matchedScopeKey.split("::").slice(1).join("::") : matchedScopeKey);
    if (!selectedTrade) return null;
    const projectId = reportId.startsWith("project-open-items:") ? reportId.slice("project-open-items:".length) : "";

    const issues = [];
    for (const community of state.communities || []) {
      if (projectId && getLocalProjectScopeId(community) !== projectId) continue;
      for (const homesite of community.homesites || []) {
        for (const issue of homesite.issues || []) {
          if (issue.completed || issue.trade !== selectedTrade) continue;
          issues.push({
            id: issue.id,
            community: community.name,
            homesiteName: homesite.name,
            address: getSiteFieldValue(homesite, "Address") || homesite.address || "",
            siteFields: getSiteFields(homesite),
            room: issue.room,
            trade: issue.trade,
            issue: issue.issue,
            notes: issue.notes || "",
            photos: issue.photos || [],
            createdAt: issue.createdAt,
            sharedNote: issue.sharedNote || "",
            sharedNoteUpdatedAt: issue.sharedNoteUpdatedAt || "",
            tradeCompleted: Boolean(issue.tradeCompleted),
            tradeCompletedAt: issue.tradeCompletedAt || ""
          });
        }
      }
    }

    return {
      trade: selectedTrade,
      projectId,
      projectName: projectId ? (state.communities || []).find((community) => getLocalProjectScopeId(community) === projectId)?.name || "" : "",
      issues,
      updatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function getLocalProjectScopeId(community) {
  if (community?.id) return String(community.id);
  const slug = String(community?.name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28) || "project";
  return `legacy-${slug}`;
}

function loadLocalAppState() {
  const storageKeys = ["fieldDriveStarter.trade.v1", "constructionIssueReport.v1"];
  for (const key of storageKeys) {
    try {
      const state = JSON.parse(localStorage.getItem(key) || "{}");
      if (state?.communities?.length) return state;
    } catch {
      // Try the next known local storage key.
    }
  }
  return {};
}

function renderReport() {
  ensureReportOfflineSync();
  const issues = report.issues || [];
  reportTitle.textContent = isAllItemsReport
    ? `${report.projectName || "All Projects"} - All Open Items`
    : `${report.trade || "Crew"} - ${report.projectName || "All Projects"}`;
  reportMeta.textContent = [
    `${issues.length} open item${issues.length === 1 ? "" : "s"}`,
    report.updatedAt ? `Updated ${new Date(report.updatedAt).toLocaleString(reportLanguage?.locale())}` : ""
  ].filter(Boolean).join(" | ");

  reportDetails.innerHTML = `
    <div class="detail-grid">
      <div><strong>Crew</strong><span>${escapeHtml(isAllItemsReport ? "All crews" : report.trade || "-")}</span></div>
      <div><strong>Open Items</strong><span>${issues.length}</span></div>
      <div><strong>Projects</strong><span>${new Set(issues.map((issue) => issue.community).filter(Boolean)).size}</span></div>
      <div><strong>Sites</strong><span>${new Set(issues.map((issue) => `${issue.community}|${issue.homesiteName}`).filter(Boolean)).size}</span></div>
    </div>
  `;

  populateCommunityFilter();
  populateHomesiteFilter();
  renderIssues();
  window.dispatchEvent(new CustomEvent("punchlogicreportready", {
    detail: {
      report,
      reportId,
      reportAccessToken,
      reportKind: isAllItemsReport ? "all_items" : "all_trade",
      tradeKey
    }
  }));
}

function ensureReportOfflineSync() {
  if (isAllItemsReport || !report || reportSyncClient || !window.PUNCH_LOGIC_REPORT_OFFLINE_SYNC) return reportSyncClient;
  reportSyncClient = window.PUNCH_LOGIC_REPORT_OFFLINE_SYNC.createClient({
    scope: `all-trade-report:${reportId}:${tradeKey}`,
    endpoint: "/.netlify/functions/all-report",
    getReport: () => report,
    render: renderReport
  });
  return reportSyncClient;
}

function populateCommunityFilter() {
  populateFilter(communityFilter, (report.issues || []).map((issue) => issue.community), "All projects", communityFilter.value);
}

function populateHomesiteFilter() {
  const scopedIssues = communityFilter.value
    ? (report.issues || []).filter((issue) => issue.community === communityFilter.value)
    : report.issues || [];
  populateFilter(homesiteFilter, scopedIssues.map((issue) => issue.homesiteName), "All sites", homesiteFilter.value);
}

function populateFilter(select, values, allLabel, currentValue) {
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.append(allOption);

  [...new Set(values.filter(Boolean))].sort(compareText).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = [...select.options].some((option) => option.value === currentValue) ? currentValue : "";
}

function renderIssues() {
  const issues = (report.issues || [])
    .filter((issue) => !communityFilter.value || issue.community === communityFilter.value)
    .filter((issue) => !homesiteFilter.value || issue.homesiteName === homesiteFilter.value);

  issues.sort((a, b) => {
    if (sortSelect.value === "location") return compareText(a.room, b.room) || compareDate(a, b);
    if (sortSelect.value === "community") return compareText(a.community, b.community) || compareText(a.homesiteName, b.homesiteName) || compareDate(a, b);
    if (sortSelect.value === "tradeCompleted") return Number(a.tradeCompleted) - Number(b.tradeCompleted) || compareDate(a, b);
    return compareDate(a, b);
  });

  issueList.innerHTML = "";
  if (!issues.length) {
    showEmpty("No open crew items match those filters.");
    return;
  }

  groupIssuesByHomesite(issues).forEach((group) => {
    const section = document.createElement("section");
    section.className = "home-issue-group";
    section.append(createHomeIssueGroupHeader(group));
    group.issues.forEach((issue, index) => {
      section.append(renderIssueCard(issue, index));
    });
    issueList.append(section);
  });
}

function groupIssuesByHomesite(issues) {
  const groups = new Map();
  issues.forEach((issue) => {
    const key = `${issue.community || ""}|${issue.homesiteName || ""}`;
    if (!groups.has(key)) {
      groups.set(key, {
        community: issue.community || "",
        homesiteName: issue.homesiteName || "",
        address: issue.address || "",
        siteLabel: formatSiteLabel(issue.homesiteName || "Site", issue.address || getIssueSiteFields(issue).find((field) => normalizeColumnName(field.label) === "address")?.value || ""),
        siteFields: getIssueSiteFields(issue),
        issues: []
      });
    }
    groups.get(key).issues.push(issue);
  });
  return [...groups.values()];
}

function createHomeIssueGroupHeader(group) {
  const header = document.createElement("div");
  header.className = "home-group-header";
  const siteFields = normalizeSiteFields(group.siteFields);
  const siteSummary = [
    group.community,
    ...siteFields.map((field) => `${field.label}: ${field.value}`)
  ].filter(Boolean).join(" | ");
  header.innerHTML = `
    <div>
      <strong>${escapeHtml(group.siteLabel || group.homesiteName || "Site")}</strong>
      <span>${escapeHtml(siteSummary || "Site details")}</span>
    </div>
    <b>${group.issues.length}</b>
  `;
  return header;
}

function renderIssueCard(issue, index) {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.classList.toggle("trade-complete", Boolean(issue.tradeCompleted));
    const photos = renderReportPhotos(issue.photos || []);

    card.innerHTML = `
      <div class="issue-meta">${escapeHtml(getIssueMeta(issue))} | Date Added - ${escapeHtml(formatDateAdded(issue.createdAt))}${issue.tradeCompleted ? " | Crew marked complete" : ""}</div>
      <h2>${index + 1}. ${escapeHtml(issue.issue || "Issue")}</h2>
      <p>${escapeHtml(issue.notes || "No notes added.")}</p>
      ${photos ? `<div class="photos">${photos}</div>` : ""}
    `;
    bindReportPhotoViewer(card);
    if (report.accessPermission !== "read") {
      card.append(createSharedNoteField(issue));
      card.append(createCompletionPhotoField(issue));
      card.append(createCompleteButton(issue));
    }
    return card;
}

function getIssueMeta(issue) {
  return [
    issue.community,
    formatSiteLabel(issue.homesiteName || "Site", issue.address || getIssueSiteFields(issue).find((field) => normalizeColumnName(field.label) === "address")?.value || ""),
    ...getIssueSiteFields(issue).map((field) => `${field.label}: ${field.value}`),
    issue.room
  ].filter(Boolean).join(" | ");
}

function getIssueSiteFields(issue) {
  const fields = normalizeSiteFields(issue?.siteFields);
  if (fields.length) return fields;
  return normalizeSiteFields([
    { label: "Address", value: issue?.address || "" },
    { label: "Permit", value: issue?.permitNumber || "" },
    { label: "Block", value: issue?.block || "" },
    { label: "Lot", value: issue?.lot || "" },
    { label: "Model", value: issue?.model || "" },
    { label: "Elevation", value: issue?.elevation || "" },
    { label: "Garage", value: issue?.garageSwing || "" },
    { label: "Structural Option", value: issue?.structuralOption || "" }
  ]);
}

function getSiteFields(site) {
  return normalizeSiteFields(site?.fields);
}

function getSiteFieldValue(site, label) {
  const normalizedLabel = normalizeColumnName(label);
  return getSiteFields(site).find((field) => normalizeColumnName(field.label) === normalizedLabel)?.value || "";
}

function normalizeSiteFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => ({
      label: String(field?.label || "").trim(),
      value: String(field?.value || "").trim()
    }))
    .filter((field) => field.label && field.value);
}

function normalizeColumnName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatSiteLabel(name, address) {
  return [name || "Site", address].filter(Boolean).join(" - ");
}

function createSharedNoteField(issue) {
  const wrapper = document.createElement("label");
  wrapper.className = "shared-note-field";

  const label = document.createElement("span");
  label.textContent = "Shared notes";

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = "Add notes for this item";
  textarea.value = issue.sharedNote || "";

  const button = document.createElement("button");
  button.className = "note-save-button";
  button.type = "button";
  button.textContent = "Save note";
  button.addEventListener("click", () => saveIssueNote(issue.id, textarea.value, button));

  wrapper.append(label, textarea, button);
  return wrapper;
}

function createCompleteButton(issue) {
  const button = document.createElement("button");
  button.className = issue.tradeCompleted ? "complete-button undo" : "complete-button";
  button.type = "button";
  button.textContent = issue.tradeCompleted ? "Undo Crew Complete" : "Mark Complete";
  button.addEventListener("click", () => setTradeCompleted(issue.id, !issue.tradeCompleted, button));
  return button;
}

function createCompletionPhotoField(issue) {
  const wrapper = document.createElement("section");
  wrapper.className = "completion-photo-field";
  wrapper.innerHTML = `<strong>Completion photo</strong><div class="completion-photo-preview"></div>`;

  const cameraInput = document.createElement("input");
  cameraInput.type = "file";
  cameraInput.accept = "image/*";
  cameraInput.capture = "environment";
  cameraInput.className = "completion-photo-input";

  const chooseInput = document.createElement("input");
  chooseInput.type = "file";
  chooseInput.accept = "image/*";
  chooseInput.className = "completion-photo-input";

  const controls = document.createElement("div");
  controls.className = "completion-photo-actions";
  const takeButton = createPhotoChoiceButton("Take photo", cameraInput);
  const chooseButton = createPhotoChoiceButton("Choose photo", chooseInput);
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "save-photo-button";
  saveButton.textContent = "Save photo";
  saveButton.disabled = true;
  controls.append(takeButton, chooseButton, saveButton);

  let selectedPhoto = null;
  const selectPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      selectedPhoto = await prepareCompletionPhoto(file);
      wrapper.querySelector(".completion-photo-preview").innerHTML = `<img src="${selectedPhoto.dataUrl}" alt="Selected completion photo" />`;
      saveButton.disabled = false;
    } catch {
      alert("That photo could not be prepared. Choose another photo.");
    }
  };
  cameraInput.addEventListener("change", selectPhoto);
  chooseInput.addEventListener("change", selectPhoto);
  saveButton.addEventListener("click", () => saveCompletionPhoto(issue.id, selectedPhoto, saveButton));
  wrapper.append(cameraInput, chooseInput, controls);
  return wrapper;
}

function createPhotoChoiceButton(label, input) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "photo-choice-button";
  button.textContent = label;
  button.addEventListener("click", () => input.click());
  return button;
}

async function saveCompletionPhoto(issueId, photo, button) {
  if (!photo) return;
  try {
    const issue = (report.issues || []).find((item) => item.id === issueId);
    const client = ensureReportOfflineSync();
    await client.ready;
    await client.enqueueMutation({ action: "addCompletionPhoto", reportId, issueId, photo, accessToken: reportAccessToken, reportKind: "all_trade", tradeKey }, issue);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Save photo";
    alert(error.message || "This photo could not be saved on this device.");
  }
}

async function prepareCompletionPhoto(file) {
  if (window.PUNCH_LOGIC_UPLOAD_SECURITY) await window.PUNCH_LOGIC_UPLOAD_SECURITY.validateSourcePhoto(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name || "completion-photo.jpg", type: "image/jpeg", dataUrl: canvas.toDataURL("image/jpeg", 0.65) });
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function setTradeCompleted(issueId, completed, button) {
  try {
    const issue = (report.issues || []).find((item) => item.id === issueId);
    const client = ensureReportOfflineSync();
    await client.ready;
    await client.enqueueMutation({ action: "setTradeCompleted", reportId, issueId, completed, accessToken: reportAccessToken, reportKind: "all_trade", tradeKey }, issue);
  } catch (error) {
    if (button) button.disabled = false;
    alert(error.message || "This update could not be saved on this device.");
  }
}

async function applyTradeCompletedResult(issueId, completed, completedAt) {
  const issue = (report.issues || []).find((item) => item.id === issueId);
  if (issue) {
    issue.tradeCompleted = completed;
    issue.tradeCompletedAt = completedAt || "";
  }
  await syncTradeCompletedToSupabase(issueId, completed, completedAt || "");
  report.updatedAt = new Date().toISOString();
  renderReport();
}

async function syncTradeCompletedToSupabase(issueId, completed, completedAt) {
  if (!allTradeReportSupabase) return;

  const { error } = await allTradeReportSupabase
    .from("punch_items")
    .update({
      trade_completed: completed,
      trade_completed_at: completed ? completedAt || new Date().toISOString() : null
    })
    .eq("id", issueId);
  if (error) throw error;
}

async function saveIssueNote(issueId, sharedNote, button) {
  button.disabled = true;
  try {
    const issue = (report.issues || []).find((item) => item.id === issueId);
    const client = ensureReportOfflineSync();
    await client.ready;
    await client.enqueueMutation({ action: "updateIssueNote", reportId, issueId, sharedNote, accessToken: reportAccessToken, reportKind: "all_trade", tradeKey }, issue);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Save note";
    alert(error.message || "This note could not be saved on this device.");
  }
}

function getPhotoSource(photo) {
  if (photo.dataUrl) return photo.dataUrl;
  if (photo.id) return buildReportPhotoUrl(photo.id);
  return "";
}

function buildReportPhotoUrl(photoId) {
  const query = new URLSearchParams({
    id: photoId,
    access: reportAccessToken,
    reportId,
    reportKind: isAllItemsReport ? "all_items" : "all_trade"
  });
  return `/.netlify/functions/photo?${query.toString()}`;
}

function renderReportPhotos(photos) {
  const orderedPhotos = [...photos].sort((a, b) => Number(Boolean(a.completionProof)) - Number(Boolean(b.completionProof)));
  return orderedPhotos.map((photo, index) => {
    const completionProof = Boolean(photo.completionProof);
    const alt = completionProof ? "Completion Photo" : `Item Photo ${index + 1}`;
    const photoLabel = completionProof ? "Completion Photo" : "Item Photo";
    return `
      <button class="report-photo-button" type="button" data-completion-photo="${completionProof}" aria-label="View ${escapeHtml(alt)} larger">
        <img src="${escapeHtml(getPhotoSource(photo))}" alt="${escapeHtml(alt)}" />
        <span class="report-photo-caption">${photoLabel}</span>
      </button>
    `;
  }).join("");
}

function bindReportPhotoViewer(container) {
  container.querySelectorAll(".report-photo-button").forEach((button) => {
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      openReportPhoto(image.src, image.alt, button.dataset.completionPhoto === "true");
    });
  });
}

function openReportPhoto(source, alt, completionProof) {
  document.querySelector(".report-photo-lightbox")?.remove();
  const viewer = document.createElement("div");
  viewer.className = "report-photo-lightbox";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  const closeButton = document.createElement("button");
  closeButton.className = "report-photo-lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close photo");
  closeButton.textContent = "×";
  const image = document.createElement("img");
  image.src = source;
  image.alt = alt;
  const label = document.createElement("div");
  label.className = "report-photo-lightbox-label";
  label.textContent = completionProof ? "Completion Photo" : "Item Photo";
  viewer.append(label);
  viewer.append(closeButton, image);
  let historyEntryAdded = false;
  let closing = false;
  const cleanup = () => {
    viewer.remove();
    document.body.classList.remove("report-photo-viewer-open");
  };
  const handleHistoryBack = () => {
    historyEntryAdded = false;
    cleanup();
  };
  const close = () => {
    if (historyEntryAdded && !closing) {
      closing = true;
      history.back();
      return;
    }
    cleanup();
  };
  closeButton.addEventListener("click", close);
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) close();
  });
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.body.append(viewer);
  document.body.classList.add("report-photo-viewer-open");
  try {
    history.pushState({ punchLogicPhotoViewer: true }, "");
    historyEntryAdded = true;
    window.addEventListener("popstate", handleHistoryBack, { once: true });
  } catch {
    historyEntryAdded = false;
  }
  closeButton.focus();
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function compareDate(a, b) {
  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
}

function formatDateAdded(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return date.toLocaleDateString(reportLanguage?.locale(), { year: "numeric", month: "short", day: "numeric" });
}

function showEmpty(message) {
  issueList.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
