const params = new URLSearchParams(window.location.search);
const reportId = params.get("r") || "";
const tradeKey = params.get("trade") || "";
const reportAccessToken = params.get("access") || tradeKey;
const shortReportCode = params.get("short") || "";
if (/^[A-Za-z0-9_-]{12}$/.test(shortReportCode)) {
  window.history.replaceState(null, "", `/r/${encodeURIComponent(shortReportCode)}`);
}
const sortSelect = document.querySelector("#sortSelect");
const reportTitle = document.querySelector("#reportTitle");
const reportMeta = document.querySelector("#reportMeta");
const homeDetails = document.querySelector("#homeDetails");
const issueList = document.querySelector("#issueList");
const supabaseConfig = window.FIELD_DRIVE_SUPABASE || {};
const tradeReportSupabase =
  supabaseConfig.url &&
  supabaseConfig.publishableKey &&
  window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
    : null;
let report;
let reportSyncClient;
const reportLanguage = window.PUNCH_LOGIC_REPORT_LANGUAGE;

sortSelect.addEventListener("change", renderIssues);
window.addEventListener("punchlogiclanguagechange", () => {
  if (report) renderReport();
});
loadReport();

async function loadReport() {
  if (!reportId || !tradeKey) {
    showEmpty("Missing crew report link.");
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/shared-report?id=${encodeURIComponent(reportId)}&trade=${encodeURIComponent(tradeKey)}&access=${encodeURIComponent(reportAccessToken)}`, {
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
    for (const community of state.communities || []) {
      for (const homesite of community.homesites || []) {
        if (homesite.reportId === reportId) {
          const selectedTrade = Object.entries(homesite.tradeReportKeys || {}).find(([, key]) => key === tradeKey)?.[0];
          if (!selectedTrade) return null;
          return {
            id: reportId,
            community: community.name,
            homesite,
            trade: selectedTrade,
            issues: (homesite.issues || []).filter((issue) => issue.trade === selectedTrade),
            updatedAt: new Date().toISOString()
          };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
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
  const home = report.homesite || {};
  const tradeIssues = getTradeIssues();
  const siteFields = getSiteFields(home);
  const siteLabel = formatSiteLabel(home.name || "Site", getSiteFieldValue(home, "Address") || home.address);
  reportTitle.textContent = `${report.trade || "Crew"} Items`;
  reportMeta.textContent = [
    report.community,
    siteLabel,
    report.updatedAt ? `Updated ${new Date(report.updatedAt).toLocaleString(reportLanguage?.locale())}` : ""
  ].filter(Boolean).join(" | ");

  homeDetails.innerHTML = `
    <div class="detail-grid">
      <div><strong>Project</strong><span>${escapeHtml(report.community || "-")}</span></div>
      <div><strong>Site</strong><span>${escapeHtml(siteLabel)}</span></div>
      <div><strong>Crew</strong><span>${escapeHtml(report.trade || "-")}</span></div>
      <div><strong>Open Issues</strong><span>${tradeIssues.length}</span></div>
      ${siteFields.map((field) => `<div><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(field.value)}</span></div>`).join("")}
    </div>
  `;

  renderIssues();
  window.dispatchEvent(new CustomEvent("punchlogicreportready", {
    detail: { report, reportId, reportAccessToken, reportKind: "trade", tradeKey }
  }));
}

function ensureReportOfflineSync() {
  if (!report || reportSyncClient || !window.PUNCH_LOGIC_REPORT_OFFLINE_SYNC) return reportSyncClient;
  reportSyncClient = window.PUNCH_LOGIC_REPORT_OFFLINE_SYNC.createClient({
    scope: `trade-report:${reportId}:${tradeKey}`,
    endpoint: "/.netlify/functions/shared-report",
    getReport: () => report,
    render: renderReport
  });
  return reportSyncClient;
}

function renderIssues() {
  const issues = getTradeIssues();
  const sortBy = sortSelect.value;

  issues.sort((a, b) => {
    if (sortBy === "trade") return compareText(a.trade, b.trade) || compareDate(a, b);
    if (sortBy === "location") return compareText(a.room, b.room) || compareDate(a, b);
    if (sortBy === "tradeCompleted") return Number(a.tradeCompleted) - Number(b.tradeCompleted) || compareDate(a, b);
    return compareDate(a, b);
  });

  issueList.innerHTML = "";
  if (!issues.length) {
    showEmpty(`No ${report?.trade || "crew"} items have been added to this site.`);
    return;
  }

  issues.forEach((issue, index) => {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.classList.toggle("trade-complete", Boolean(issue.tradeCompleted));
    card.classList.toggle("completed", Boolean(issue.tradeCompleted || issue.completed));
    const photos = renderReportPhotos(issue.photos || []);

    card.innerHTML = `
      <div class="issue-meta">${escapeHtml(issue.room || "-")} | Date Added - ${escapeHtml(formatDateAdded(issue.createdAt))}${issue.tradeCompleted ? " | Crew marked complete" : ""}${issue.completed ? " | Office complete" : ""}</div>
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
    issueList.append(card);
  });
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
    await client.enqueueMutation({ action: "addCompletionPhoto", id: reportId, issueId, photo, accessToken: reportAccessToken, reportKind: "trade", tradeKey }, issue);
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
    await client.enqueueMutation({ action: "setTradeCompleted", id: reportId, issueId, completed, accessToken: reportAccessToken, reportKind: "trade", tradeKey }, issue);
  } catch (error) {
    if (button) button.disabled = false;
    alert(error.message || "This update could not be saved on this device.");
  }
}

async function applyTradeCompletedResult(issueId, completed, completedAt, resultIssue = {}) {
  const issue = (report.issues || []).find((item) => item.id === issueId);
  if (issue) {
    issue.tradeCompleted = completed;
    issue.tradeCompletedAt = completedAt || "";
    issue.completed = Boolean(resultIssue.completed);
    issue.completedAt = resultIssue.completedAt || "";
  }
  await syncTradeCompletedToSupabase(issueId, completed, completedAt || "");
  report.updatedAt = new Date().toISOString();
  renderReport();
}

async function syncTradeCompletedToSupabase(issueId, completed, completedAt) {
  if (!tradeReportSupabase) return;

  try {
    await tradeReportSupabase
      .from("punch_items")
      .update({
        trade_completed: completed,
        trade_completed_at: completed ? completedAt || new Date().toISOString() : null
      })
      .eq("id", issueId);
  } catch {
    // The shared report already updated; Supabase sync can retry on the next report action.
  }
}

async function saveIssueNote(issueId, sharedNote, button) {
  button.disabled = true;
  try {
    const issue = (report.issues || []).find((item) => item.id === issueId);
    const client = ensureReportOfflineSync();
    await client.ready;
    await client.enqueueMutation({ action: "updateIssueNote", id: reportId, issueId, sharedNote, accessToken: reportAccessToken, reportKind: "trade", tradeKey }, issue);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Save note";
    alert(error.message || "This note could not be saved on this device.");
  }
}

function getTradeIssues() {
  return [...(report?.issues || [])];
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
    reportKind: "trade"
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
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
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
      value: String(field?.value ?? "").trim()
    }))
    .filter((field) => field.label && field.value);
}

function formatSiteLabel(name, address) {
  return [name || "Site", address].filter(Boolean).join(" - ");
}

function normalizeColumnName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
