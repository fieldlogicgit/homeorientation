const sectionContent = {
  users: {
    title: "Users",
    action: "Add User",
    icon: "user-plus",
    subtitle: "Create Admin and Foreman logins for this customer app.",
    search: "Search users",
    columns: ["Name", "Email", "Role", "Action"]
  },
  projects: {
    title: "Projects",
    action: "Add Project",
    icon: "folder-kanban",
    subtitle: "Create project groups for sites and client-specific work.",
    search: "Search projects",
    columns: ["Project", "Sites", "Foreman", "Action"]
  },
  items: {
    title: "Open Items",
    action: "Add Item",
    icon: "clipboard-plus",
    subtitle: "Review every open punch item across assigned sites.",
    search: "Search open items",
    columns: ["Item", "Crew", "Site", "Action"]
  },
  completedItems: {
    title: "Completed Items",
    action: "View Open",
    icon: "clipboard-list",
    subtitle: "Review completed work in seven-business-day pages.",
    search: "Search completed items",
    columns: ["Item", "Crew", "Site", "Action"]
  },
  reports: {
    title: "Reports",
    action: "Generate Report",
    icon: "file-chart-column",
    subtitle: "Create live site, crew, project, and all-project report links.",
    search: "Search reports",
    columns: ["Report", "Scope", "Crew", "Action"]
  },
  sites: {
    title: "Sites",
    action: "Add Site",
    icon: "building-2",
    subtitle: "Add sites, import spreadsheet fields later, and control visibility.",
    search: "Search sites",
    columns: ["Site", "Project", "Users", "Action"]
  },
  documents: {
    title: "Documents",
    action: "Add Document",
    icon: "doc-paper",
    subtitle: "Upload, label, assign, and manage documents for every site.",
    search: "Search documents",
    columns: ["Document", "Site", "Details", "Action"]
  },
  contacts: {
    title: "Contacts",
    action: "Add Contact",
    icon: "contact-round",
    subtitle: "Manage shared contacts across the company.",
    search: "Search contacts",
    columns: ["Name", "Company", "Job Desc", "Action"]
  },
  archive: {
    title: "Archive",
    action: "Archive",
    icon: "archive",
    subtitle: "Search archived projects, sites, and their punch-list items.",
    search: "Search archived projects, sites, and items",
    columns: ["Name", "Type", "Project", "Action"]
  },
  settings: {
    title: "Settings",
    action: "Add Setting",
    icon: "sliders-horizontal",
    subtitle: "Maintain global locations, crews, and item dropdowns.",
    search: "Search settings",
    columns: ["Setting", "Type", "Applies To", "Action"]
  }
};

const adminTitle = document.querySelector("#adminTitle");
const adminSubtitle = document.querySelector("#adminSubtitle");
const adminActionButton = document.querySelector("#adminActionButton");
const adminPanel = document.querySelector("#adminPanel");
const adminAuthScreen = document.querySelector("#adminAuthScreen");
const adminEmailInput = document.querySelector("#adminEmailInput");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminLoginButton = document.querySelector("#adminLoginButton");
const adminAuthError = document.querySelector("#adminAuthError");
const adminForgotPasswordButton = document.querySelector("#adminForgotPasswordButton");
const adminPasswordResetScreen = document.querySelector("#adminPasswordResetScreen");
const adminNewPasswordInput = document.querySelector("#adminNewPasswordInput");
const adminConfirmPasswordInput = document.querySelector("#adminConfirmPasswordInput");
const adminSaveNewPasswordButton = document.querySelector("#adminSaveNewPasswordButton");
const adminPasswordResetError = document.querySelector("#adminPasswordResetError");
const adminSignOutButton = document.querySelector("#adminSignOutButton");
const adminThemeButton = document.querySelector("#adminThemeButton");
const notificationButton = document.querySelector("#notificationButton");
const notificationPanel = document.querySelector("#notificationPanel");
const notificationCount = document.querySelector("#notificationCount");
const metricItems = document.querySelector("#metricItems");

const supabaseConfig = window.FIELD_DRIVE_SUPABASE || {};
const configuredStarterType = String(supabaseConfig.starterType || "builder").trim().toLowerCase();
const isTradeClient = configuredStarterType === "trade";
const hasSupabaseConfig =
  supabaseConfig.url &&
  supabaseConfig.publishableKey &&
  !supabaseConfig.url.includes("your-project") &&
  !supabaseConfig.publishableKey.includes("your-publishable");
const fieldDriveSupabase =
  hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey)
    : null;
const organizationScopedTables = new Set(["profiles", "projects", "sites", "site_documents", "trade_settings", "location_settings", "item_settings", "contacts", "punch_items", "item_photos"]);
const adminThemeStorageKey = "punchLogic.admin.theme";
const adminNotificationStorageKey = "punchLogic.admin.notifications";
const adminNotificationPreferenceStorageKey = "punchLogic.admin.notificationPreferences";
const adminSettingsCollapseStorageKey = "punchLogic.admin.settings.collapsed.v1";
const defaultAdminNotificationPreferences = Object.freeze({
  crewCompletion: true,
  completionPhotos: true,
  crewNotes: true,
  itemAdded: true,
  itemChanges: true,
  projectsSites: true,
  users: true,
  documentsContacts: true,
  settings: true
});
const mainAppStorageKey = "fieldDriveStarter.trade.v1";
const sharedSettingsMarkerName = "__punchlogic_shared_settings_v1__";
const dashboardAutoRefreshMs = 15000;
const siteDocumentBucket = "site-documents";
const itemPhotoBucket = "item-photos";
const uploadSecurity = window.PUNCH_LOGIC_UPLOAD_SECURITY;
const maxSiteDocumentBytes = uploadSecurity?.maxDocumentBytes || 25 * 1024 * 1024;
const allowedSiteDocumentTypes = uploadSecurity?.documentTypes || new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const defaultItemViewState = {
  sortBy: "date",
  sortDir: "desc",
  trade: "",
  project: "",
  site: "",
  siteId: "",
  user: ""
};

let activeSection = "items";
let currentProfile = null;
let formSection = "";
let nextSectionAfterSubmit = "";
let recentChanges = loadRecentChanges();
let collapsedAdminSettingsSections = loadCollapsedAdminSettingsSections();
let notificationPreferences = loadAdminNotificationPreferences();
let itemViewState = { ...defaultItemViewState };
let closeItemFilterOnOutsideClick = null;
let lastDashboardFocusRefresh = 0;
let isDashboardLoading = false;
let selectedSettingsTrade = "";
let documentSiteFilter = "";
let siteProjectFilter = "";
let archiveTypeFilter = "";
let archiveProjectFilter = "";
let completedItemsPage = 0;
let projectAccessRows = [];
let userSiteAccessRows = [];
const selectedSiteIds = new Set();
let rowsBySection = {
  users: [],
  items: [],
  completedItems: [],
  reports: [],
  projects: [],
  sites: [],
  documents: [],
  contacts: [],
  archive: [],
  settings: []
};

function appCopy(value) {
  const text = String(value ?? "");
  return text
    .replace(/\bTrades\b/g, "Crews")
    .replace(/\btrades\b/g, "crews")
    .replace(/\bTrade\b/g, "Crew")
    .replace(/\btrade\b/g, "crew");
}

function isCrewSettingType(value) {
  return value === "Crew" || value === "Trade";
}

const nativePrompt = window.prompt.bind(window);
const nativeAlert = window.alert.bind(window);
const nativeConfirm = window.confirm.bind(window);
window.prompt = (message, defaultValue) => nativePrompt(appCopy(message), defaultValue);
window.alert = (message) => nativeAlert(appCopy(message));
window.confirm = (message) => nativeConfirm(appCopy(message));

function applyStarterCopy(root = document) {
  if (!root) return;
  const scope = root.body || root;
  document.title = appCopy(document.title);
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEMPLATE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return /\b[Tt]rades?\b/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    node.nodeValue = appCopy(node.nodeValue);
  });
  scope.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
    ["placeholder", "aria-label", "title"].forEach((attribute) => {
      if (element.hasAttribute(attribute)) element.setAttribute(attribute, appCopy(element.getAttribute(attribute)));
    });
  });
}

function getConfiguredOrganizationId() {
  const value = String(supabaseConfig.organizationId || "").trim();
  if (!value || value.includes("client-organization") || value.includes("your-organization")) return "";
  return value;
}

function getActiveOrganizationId() {
  return getConfiguredOrganizationId() || currentProfile?.organization_id || "";
}

function requireActiveOrganizationId() {
  const organizationId = getActiveOrganizationId();
  if (!organizationId) throw new Error("This app needs an organization ID before dashboard data can load.");
  return organizationId;
}

const adminButtonTooltipDescriptions = {
  adminLoginButton: "Sign in to open the admin dashboard.",
  adminForgotPasswordButton: "Send a password reset link to the email address entered above.",
  adminSaveNewPasswordButton: "Save the new password for this account.",
  adminSignOutButton: "Sign out of the admin dashboard on this device.",
  notificationButton: "View recent work updates and crew activity.",
  adminThemeButton: "Switch between the light and dark dashboard themes.",
  adminActionButton: "Create a new record in the current dashboard section.",
  refreshDashboardButton: "Reload the latest dashboard information.",
  itemFilterButton: "Open sorting and filtering options for open items.",
  clearItemFiltersButton: "Clear all open-item filters and restore the default sort.",
  selectAllShownSitesButton: "Select every site currently shown in the filtered list.",
  clearSelectedSitesButton: "Clear all selected sites.",
  deleteSelectedSitesButton: "Delete all selected sites after confirmation.",
  cancelInlineFormButton: "Close this form without saving.",
  importAdminSitesButton: "Add sites from an XLSX, XLS, or CSV spreadsheet.",
  exportAdminSitesButton: "Download the current site list as an XLSX spreadsheet.",
  addSiteCustomFieldButton: "Add another custom field to the new site.",
  importAdminContactsButton: "Add contacts from an XLSX, XLS, or CSV spreadsheet.",
  exportAdminContactsButton: "Download the contact directory as an XLSX spreadsheet.",
  addContactCustomFieldButton: "Add another custom field to the new contact.",
  chooseAdminItemPhotoButton: "Choose an issue photo to attach to this item.",
  clearNotificationsButton: "Clear the recent notification list."
};

const adminSectionTooltipDescriptions = {
  items: "Open the list of active punch-list items.",
  completedItems: "Review completed items in seven-business-day pages.",
  reports: "Generate site, crew, project, and all-project reports.",
  users: "Manage users, roles, and project or site access.",
  projects: "Manage projects and assigned foremen.",
  sites: "Manage sites, assignments, fields, and site documents.",
  documents: "Upload and manage documents assigned to sites.",
  contacts: "Manage the shared company contact directory.",
  archive: "Search archived projects, sites, and punch-list items.",
  settings: "Manage shared crews, locations, item choices, and notification settings."
};

function getAdminButtonTooltip(button) {
  if (!(button instanceof HTMLButtonElement)) return "";

  if (adminButtonTooltipDescriptions[button.id]) {
    if (button.id === "adminActionButton") {
      return `Add a new ${sectionContent[activeSection]?.title?.replace(/^Completed /, "").replace(/s$/, "").toLowerCase() || "record"}.`;
    }
    return adminButtonTooltipDescriptions[button.id];
  }

  const sectionName = button.dataset.adminSection;
  if (sectionName) return adminSectionTooltipDescriptions[sectionName] || "Open this dashboard section.";

  const action = button.dataset.action || "";
  if (action.startsWith("edit")) return "Edit this record.";
  if (action.startsWith("delete")) return "Delete this record after confirmation.";
  if (action === "viewSiteItems") return "Show the punch-list items assigned to this site.";
  if (action === "viewSiteDocuments") return "Show documents assigned to this site.";
  if (action === "openDocument") return "Open this document in a new browser tab.";
  if (action === "assignSite") return "Assign users to this site.";
  if (action === "revokeUserSessions") return "Sign this user out on every device.";
  if (action === "toggleUserAccess") return "Pause or resume this user's access.";
  if (action === "completeItem") return "Mark this punch-list item complete.";

  if (button.dataset.userSave) return "Save this user's name, role, password, and assignments.";
  if (button.dataset.projectSave) return "Save this project's name and foreman assignments.";
  if (button.dataset.projectCancel) return "Cancel project editing without saving.";
  if (button.dataset.siteSave) return "Save this site's name, project, address, and custom fields.";
  if (button.dataset.siteCancel) return "Cancel site editing without saving.";
  if (button.dataset.documentSave) return "Save this document's label, type, site, and quick-access setting.";
  if (button.dataset.contactSave) return "Save this contact's information and custom fields.";
  if (button.dataset.contactCancel) return "Cancel contact editing without saving.";
  if (button.dataset.itemSave) return "Save the changes made to this punch-list item.";
  if (button.dataset.itemNotesSave) return "Save the item notes and the shared notes visible to the crew.";
  if (button.dataset.itemEdit) return "Edit this punch-list item.";
  if (button.dataset.itemDelete) return "Delete this punch-list item after confirmation.";
  if (button.dataset.itemComplete) return "Mark this punch-list item complete.";
  if (button.dataset.itemUncomplete) return "Move this item back to open items.";
  if (button.dataset.photoSrc) return "Open this photo in the larger photo viewer.";
  if (button.hasAttribute("data-close-admin-photo")) return "Close the photo viewer.";
  if (button.dataset.notificationId) return "Open the dashboard record connected to this notification.";
  if (button.dataset.addSetting) return "Add a reusable setting to this section.";
  if (button.dataset.editSetting) return "Rename this shared setting.";
  if (button.dataset.deleteSetting || button.dataset.deleteMainSetting) return "Delete this shared setting after confirmation.";
  if (button.dataset.toggleAdminSettings) return "Expand or collapse this settings section.";
  if (button.dataset.addTradeItem) return "Add an item choice for this crew.";
  if (button.dataset.addSiteEditField) return "Add another custom field to this site.";
  if (button.dataset.addContactEditField) return "Add another custom field to this contact.";
  if (button.dataset.quickAdd === "trade") return "Add a crew without leaving the item form.";
  if (/^open.*ReportButton$/.test(button.id)) return "Open this live report in a new browser tab.";
  if (/^pdf.*ReportButton$/.test(button.id)) return "Open a printable PDF version of this report.";
  if (/^share.*ReportButton$/.test(button.id)) return "Share this secure report link or copy it to the clipboard.";
  if (/^refresh.*ReportButton$/.test(button.id)) return "Revoke existing links for this report and create a replacement link.";
  if (button.dataset.quickAdd === "item") return "Add an item choice without leaving the item form.";
  if (button.hasAttribute("data-remove-custom-field")) return "Remove this custom field from the form.";

  const label = String(button.getAttribute("aria-label") || button.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return "Use this dashboard action.";

  const normalized = label.toLowerCase();
  if (normalized.startsWith("save")) return "Save the information entered in this form.";
  if (normalized === "cancel") return "Close this form without saving.";
  if (normalized === "complete") return "Mark this punch-list item complete.";
  if (normalized === "uncomplete") return "Move this item back to open items.";
  if (normalized === "remove") return "Remove this field from the form.";
  if (normalized.startsWith("add ")) return `${label}.`;
  return `${label}.`;
}

function installAdminButtonTooltips() {
  const tooltip = document.createElement("div");
  tooltip.className = "admin-button-tooltip";
  tooltip.id = "adminButtonTooltip";
  tooltip.setAttribute("role", "tooltip");
  document.body.appendChild(tooltip);

  let activeButton = null;

  const refreshButtons = (root = document) => {
    root.querySelectorAll("button").forEach((button) => {
      const description = appCopy(getAdminButtonTooltip(button));
      if (!description) return;
      button.dataset.tooltip = description;
      button.setAttribute("aria-describedby", tooltip.id);
      if (button.hasAttribute("title")) button.removeAttribute("title");
    });
  };

  const hideTooltip = () => {
    activeButton = null;
    tooltip.classList.remove("visible");
    tooltip.removeAttribute("data-placement");
  };

  const showTooltip = (button) => {
    const description = appCopy(getAdminButtonTooltip(button));
    if (!description || button.disabled) return;
    activeButton = button;
    button.dataset.tooltip = description;
    tooltip.textContent = description;
    tooltip.classList.add("visible");

    window.requestAnimationFrame(() => {
      if (activeButton !== button) return;
      const buttonRect = button.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const gutter = 10;
      const viewportPadding = 8;
      let left = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding));
      let top = buttonRect.top - tooltipRect.height - gutter;
      let placement = "top";
      if (top < viewportPadding) {
        top = buttonRect.bottom + gutter;
        placement = "bottom";
      }
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.dataset.placement = placement;
    });
  };

  document.addEventListener("pointerover", (event) => {
    const button = event.target.closest?.("button");
    if (!button || button.contains(event.relatedTarget)) return;
    showTooltip(button);
  });
  document.addEventListener("pointerout", (event) => {
    const button = event.target.closest?.("button");
    if (!button || button.contains(event.relatedTarget)) return;
    hideTooltip();
  });
  document.addEventListener("focusin", (event) => {
    const button = event.target.closest?.("button");
    if (button) showTooltip(button);
  });
  document.addEventListener("focusout", (event) => {
    if (event.target.closest?.("button")) hideTooltip();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTooltip();
  });
  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);

  const tooltipObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches("button")) refreshButtons(node.parentElement || document);
        else refreshButtons(node);
      });
    });
  });
  tooltipObserver.observe(document.body, { childList: true, subtree: true });
  refreshButtons();
}

document.querySelectorAll("[data-admin-section]").forEach((button) => {
  button.addEventListener("click", () => showAdminSection(button));
});
adminActionButton.addEventListener("click", () => handlePrimaryAction(activeSection));
adminLoginButton.addEventListener("click", signIn);
adminForgotPasswordButton.addEventListener("click", requestAdminPasswordReset);
adminSaveNewPasswordButton.addEventListener("click", completeAdminPasswordReset);
adminPasswordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") signIn();
});
adminSignOutButton.addEventListener("click", signOut);
adminThemeButton.addEventListener("click", toggleAdminTheme);
notificationButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleNotifications();
});
notificationPanel.addEventListener("click", (event) => event.stopPropagation());
document.addEventListener("click", closeAdminNotificationsOnOutsideClick);
window.addEventListener("focus", refreshDashboardOnFocus);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshDashboardOnFocus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAdminPhoto();
    closeAdminNotifications();
  }
});
window.setInterval(refreshDashboardInBackground, dashboardAutoRefreshMs);

applyAdminTheme();
installAdminButtonTooltips();
renderNotifications();
renderIcons();
applyStarterCopy();
boot();

async function boot() {
  renderSection("items", true);

  if (!fieldDriveSupabase) {
    showAuthError("The dashboard connection is not configured.");
    return;
  }

  const { data } = await fieldDriveSupabase.auth.getSession();
  if (!data.session) {
    adminAuthScreen.classList.add("visible");
    return;
  }

  adminAuthScreen.classList.remove("visible");
  await loadDashboard();
}

async function signIn() {
  if (!fieldDriveSupabase) {
    showAuthError("The dashboard connection is not configured.");
    return;
  }

  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value;
  if (!email || !password) {
    showAuthError("Enter email and password.");
    return;
  }

  adminLoginButton.disabled = true;
  adminLoginButton.textContent = "Signing in...";
  showAuthError("");

  const { error } = await fieldDriveSupabase.auth.signInWithPassword({ email, password });
  adminLoginButton.disabled = false;
  adminLoginButton.textContent = "Sign in";

  if (error) {
    showAuthError(error.status === 429 ? "Too many sign-in attempts. Wait a minute and try again." : "Incorrect email or password.");
    return;
  }

  adminPasswordInput.value = "";
  adminAuthScreen.classList.remove("visible");
  await loadDashboard();
}

async function requestAdminPasswordReset() {
  const email = adminEmailInput.value.trim();
  if (!email) {
    showAuthError("Enter your email address first.");
    adminEmailInput.focus();
    return;
  }
  adminForgotPasswordButton.disabled = true;
  showAuthError("Sending password reset email...");
  try {
    const redirectTo = new URL(window.location.pathname, window.location.origin).toString();
    const { error } = await fieldDriveSupabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showAuthError("Check your email for the password reset link.");
    window.setTimeout(() => { adminForgotPasswordButton.disabled = false; }, 60000);
  } catch (error) {
    adminForgotPasswordButton.disabled = false;
    showAuthError(error.message || "Password reset email could not be sent.");
  }
}

async function completeAdminPasswordReset() {
  const password = adminNewPasswordInput.value;
  const confirmation = adminConfirmPasswordInput.value;
  adminPasswordResetError.textContent = "";
  if (password.length < 8) {
    adminPasswordResetError.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (password !== confirmation) {
    adminPasswordResetError.textContent = "Passwords do not match.";
    return;
  }
  adminSaveNewPasswordButton.disabled = true;
  try {
    const { error } = await fieldDriveSupabase.auth.updateUser({ password });
    if (error) throw error;
    await fieldDriveSupabase.auth.signOut({ scope: "others" });
    adminPasswordResetScreen.classList.remove("visible");
    adminAuthScreen.classList.remove("visible");
    adminNewPasswordInput.value = "";
    adminConfirmPasswordInput.value = "";
    await loadDashboard();
  } catch (error) {
    adminPasswordResetError.textContent = error.message || "Password could not be updated.";
  } finally {
    adminSaveNewPasswordButton.disabled = false;
  }
}

if (fieldDriveSupabase) {
  fieldDriveSupabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") adminPasswordResetScreen.classList.add("visible");
  });
}

async function signOut() {
  if (fieldDriveSupabase) await fieldDriveSupabase.auth.signOut();
  currentProfile = null;
  projectAccessRows = [];
  userSiteAccessRows = [];
  rowsBySection = { users: [], items: [], completedItems: [], reports: [], projects: [], sites: [], documents: [], contacts: [], archive: [], settings: [] };
  updateMetrics();
  renderSection(activeSection);
  adminAuthScreen.classList.add("visible");
}

async function getFunctionHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (!fieldDriveSupabase) return headers;

  try {
    const { data } = await fieldDriveSupabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch {
    return headers;
  }

  return headers;
}

async function loadDashboard(options = {}) {
  if (isDashboardLoading) return;
  isDashboardLoading = true;
  if (!options.silent && !options.rowsOnly) setPanelMessage("Loading dashboard...");

  try {
    const { data: userData } = await fieldDriveSupabase.auth.getUser();
    if (!userData.user) {
      adminAuthScreen.classList.add("visible");
      return;
    }

    loadAdminNotificationPreferencesForUser(userData.user);
    currentProfile = await fetchCurrentProfile(userData.user.id);
    if (!currentProfile?.organization_id) {
      setPanelMessage("This login exists, but it does not have a dashboard profile yet.");
      return;
    }
    const configuredOrganizationId = getConfiguredOrganizationId();
    if (configuredOrganizationId && currentProfile.organization_id !== configuredOrganizationId) {
      setPanelMessage("This login belongs to a different organization than this client app.");
      return;
    }
    const organizationId = requireActiveOrganizationId();

    const [profiles, projects, sites, access, projectAccess, contacts, punchItems, completedPunchItems, itemPhotos, siteDocuments, trades, locations, settingsItems] = await Promise.all([
      selectTable("profiles", "id, display_name, role, organization_id, is_active, sessions_valid_after, created_at", { organization_id: organizationId }),
      selectProjects(),
      selectSites(),
      selectTable("user_site_access", "user_id, site_id"),
      safeSelectTable("project_user_access", "user_id, project_id"),
      selectContacts(),
      selectItems(false),
      selectItems(true),
      safeSelectTable("item_photos", "id, item_id, storage_path, file_name, content_type, completion_proof, created_at"),
      selectAdminSiteDocuments(),
      selectTable("trade_settings", "id, name, sort_order"),
      selectTable("location_settings", "id, name, sort_order"),
      selectTable("item_settings", "id, name, sort_order, trade_id, trade_settings(name)")
    ]);

    await hydrateAdminPhotoSignedUrls(itemPhotos);
    const authUsers = await fetchManagedUsers();
    const authUserMap = new Map(authUsers.map((user) => [user.id, user]));
    const profilesWithAuth = profiles.map((profile) => ({
      ...profile,
      email: authUserMap.get(profile.id)?.email || profile.email || ""
    }));
    const mainAppState = loadMainAppState();
    const sharedSettingsInitialized = locations.some((location) => location.name === sharedSettingsMarkerName);
    projectAccessRows = projectAccess;
    userSiteAccessRows = access;
    const archivedProjectIds = new Set(projects.filter((project) => project.archived_at).map((project) => project.id));
    const archivedSiteIds = new Set(sites
      .filter((site) => site.archived_at || archivedProjectIds.has(site.project_id))
      .map((site) => site.id));
    const archivedPunchItems = await selectArchivedItems([...archivedSiteIds]);
    const activeProjects = projects.filter((project) => !project.archived_at);
    const activeSites = sites.filter((site) => !site.archived_at && !archivedProjectIds.has(site.project_id));
    const activeSiteIds = new Set(activeSites.map((site) => site.id));
    const activePunchItems = punchItems.filter((item) => activeSiteIds.has(item.site_id));
    const activeCompletedItems = completedPunchItems.filter((item) => activeSiteIds.has(item.site_id));
    const activeDocuments = siteDocuments.filter((documentRow) => activeSiteIds.has(documentRow.site_id));

    rowsBySection = {
      users: buildUserRows(profilesWithAuth, access, projectAccess),
      projects: buildProjectRows(activeProjects, activeSites, projectAccess, profilesWithAuth),
      items: dedupeRowsById([
        ...buildItemRows(activePunchItems, itemPhotos, activeProjects),
        ...buildMainAppItemRows(mainAppState, punchItems).filter((row) => activeSiteIds.has(row.siteId))
      ]),
      completedItems: dedupeRowsById([
        ...buildItemRows(activeCompletedItems, itemPhotos, activeProjects),
        ...buildMainAppItemRows(mainAppState, completedPunchItems, { completed: true }).filter((row) => activeSiteIds.has(row.siteId))
      ]),
      reports: [],
      sites: buildSiteRows(activeSites, access, activeProjects, profilesWithAuth, activeDocuments),
      documents: buildDocumentRows(activeDocuments, activeSites, activeProjects, profilesWithAuth),
      contacts: dedupeRowsById([...buildContactRows(contacts), ...buildMainAppContactRows(mainAppState, contacts)]),
      archive: buildArchiveRows(projects, sites, archivedPunchItems, itemPhotos),
      settings: dedupeRowsById([
        ...buildSettingRows(trades, locations, settingsItems),
        ...(sharedSettingsInitialized ? [] : buildMainAppSettingRows(mainAppState, trades, locations, settingsItems))
      ])
    };
    if (siteProjectFilter && siteProjectFilter !== "__unassigned__" && !activeProjects.some((project) => project.id === siteProjectFilter)) {
      siteProjectFilter = "";
    }

    mergeLoadedActivity({ profiles, projects, sites, contacts, punchItems, completedPunchItems, itemPhotos });
    updateMetrics();
    if (options.rowsOnly && document.querySelector("#adminRows")) {
      renderFilteredRows(activeSection, document.querySelector("#adminSearchInput")?.value || "");
    } else {
      renderSection(activeSection);
    }
  } catch (error) {
    if (options.silent) {
      console.warn("Dashboard could not auto-refresh.", error);
    } else {
      setPanelMessage(error.message || "Dashboard could not load.");
    }
  } finally {
    isDashboardLoading = false;
  }
}

async function refreshDashboardOnFocus() {
  if (!fieldDriveSupabase || adminAuthScreen.classList.contains("visible")) return;
  if (hasUnsavedAdminWork()) return;
  if (Date.now() - lastDashboardFocusRefresh < 5000) return;
  lastDashboardFocusRefresh = Date.now();
  await loadDashboard({ silent: true, rowsOnly: true });
}

async function refreshDashboardInBackground() {
  if (document.hidden) return;
  if (!fieldDriveSupabase || adminAuthScreen.classList.contains("visible")) return;
  if (hasUnsavedAdminWork()) return;
  await loadDashboard({ silent: true, rowsOnly: true });
}

async function refreshDashboardRows() {
  await loadDashboard({ silent: true, rowsOnly: true });
}

function hasUnsavedAdminWork() {
  if (formSection) return true;
  if (adminPanel.querySelector("#adminInlineForm")) return true;
  if (adminPanel.querySelector(".admin-row-edit:not(.hidden), .admin-item-fields:not(.hidden)")) return true;
  if (adminPanel.querySelector("[data-item-card][data-notes-dirty='true']")) return true;

  const activeElement = document.activeElement;
  if (activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName)) return true;

  return Array.from(adminPanel.querySelectorAll("input, textarea, select")).some((field) => {
    if (field.type === "hidden") return false;
    if (field.matches("[data-item-shared-note]")) return false;
    if (["adminSearchInput", "siteProjectFilter", "documentSiteFilter"].includes(field.id)) return false;
    return String(field.value || "").trim() !== "";
  });
}

async function fetchCurrentProfile(userId) {
  const { data: sessionValid, error: sessionError } = await fieldDriveSupabase.rpc("session_is_valid");
  if (sessionError) throw sessionError;
  if (!sessionValid) return null;
  const { data, error } = await fieldDriveSupabase
    .from("profiles")
    .select("id, organization_id, display_name, role, is_active, sessions_valid_after, organizations(access_paused)")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  const organization = Array.isArray(data?.organizations) ? data.organizations[0] : data?.organizations;
  if (data?.is_active === false || organization?.access_paused === true) {
    await fieldDriveSupabase.auth.signOut({ scope: "local" });
    adminAuthScreen.classList.add("visible");
    showAuthError("This account or client access is currently paused.");
    return null;
  }
  return data;
}

async function selectTable(table, columns, filters = {}) {
  let query = fieldDriveSupabase.from(table).select(columns);
  if (organizationScopedTables.has(table) && !hasOwn(filters, "organization_id")) {
    query = query.eq("organization_id", requireActiveOrganizationId());
  }
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function safeSelectTable(table, columns, filters = {}) {
  try {
    return await selectTable(table, columns, filters);
  } catch (error) {
    if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)) return [];
    throw error;
  }
}

async function selectAdminSiteDocuments() {
  try {
    return await selectTable("site_documents", "id, site_id, title, category, description, document_date, quick_access, storage_path, file_name, content_type, size_bytes, uploaded_by, created_at, updated_at");
  } catch (error) {
    if (!["42703", "PGRST204"].includes(error.code)) {
      if (["42P01", "PGRST205"].includes(error.code)) return [];
      throw error;
    }
    return safeSelectTable("site_documents", "id, site_id, title, category, description, document_date, storage_path, file_name, content_type, size_bytes, uploaded_by, created_at, updated_at");
  }
}

async function selectContacts() {
  try {
    return await selectTable("contacts", "id, contact_name, trade, vendor, job_desc, email, phone, alternate_contact, fields, created_at");
  } catch (error) {
    if (!["42703", "PGRST200", "PGRST204"].includes(error.code)) throw error;
    return selectTable("contacts", "id, contact_name, trade, vendor, job_desc, email, phone, alternate_contact, created_at");
  }
}

async function fetchManagedUsers() {
  try {
    const response = await fetch("/.netlify/functions/manage-users", {
      method: "GET",
      credentials: "same-origin",
      headers: await getFunctionHeaders()
    });
    if (!response.ok) return [];
    const result = await response.json();
    return result.users || [];
  } catch {
    return [];
  }
}

async function selectSites() {
  try {
    return await selectTable("sites", "id, name, fields, project_id, created_at, archived_at, projects(name, archived_at)");
  } catch (error) {
    if (["42703", "PGRST200", "PGRST204"].includes(error.code)) {
      return selectTable("sites", "id, name, fields, project_id, created_at, projects(name)");
    }
    throw error;
  }
}

async function selectProjects() {
  try {
    return await selectTable("projects", "id, name, created_at, archived_at");
  } catch (error) {
    if (!["42703", "PGRST204"].includes(error.code)) throw error;
    return selectTable("projects", "id, name, created_at");
  }
}

async function selectItems(completed = false) {
  const fullSelect = [
    "id",
    "item",
    "trade",
    "location",
    "location_area",
    "location_detail",
    "notes",
    "shared_note",
    "shared_note_updated_at",
    "shared_note_source",
    "updated_at",
    "completed",
    "completed_at",
    "trade_completed",
    "trade_completed_at",
    "created_by",
    "site_id",
    "created_at",
    "sites(id, name, fields, project_id, archived_at, projects(name, archived_at))",
    "profiles(display_name)"
  ].join(", ");

  const runQuery = async (columns) => {
    let query = fieldDriveSupabase
      .from("punch_items")
      .select(columns)
      .eq("organization_id", requireActiveOrganizationId())
      .eq("completed", completed);
    if (completed) {
      const window = getCompletedBusinessWindow(completedItemsPage);
      query = query.gte("completed_at", window.start.toISOString()).lt("completed_at", window.end.toISOString());
    }
    const { data, error } = await query.order(completed ? "completed_at" : "created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  };

  try {
    return await runQuery(fullSelect);
  } catch (error) {
    if (!["42703", "PGRST200", "PGRST201", "PGRST204"].includes(error.code)) throw error;
    return runQuery("id, item, trade, location, location_area, location_detail, notes, shared_note, completed, completed_at, trade_completed, trade_completed_at, created_by, site_id, created_at, sites(id, name, fields, project_id)");
  }
}

async function selectArchivedItems(siteIds = []) {
  const ids = [...new Set(siteIds.map(String).filter(Boolean))];
  if (!ids.length) return [];
  const fullSelect = [
    "id",
    "item",
    "trade",
    "location",
    "location_area",
    "location_detail",
    "notes",
    "shared_note",
    "shared_note_updated_at",
    "shared_note_source",
    "updated_at",
    "completed",
    "completed_at",
    "trade_completed",
    "trade_completed_at",
    "created_by",
    "site_id",
    "created_at",
    "sites(id, name, fields, project_id, archived_at, projects(name, archived_at))",
    "profiles(display_name)"
  ].join(", ");
  const fallbackSelect = "id, item, trade, location, location_area, location_detail, notes, shared_note, completed, completed_at, trade_completed, trade_completed_at, created_by, site_id, created_at, sites(id, name, fields, project_id)";

  async function runQuery(columns, chunk) {
    const { data, error } = await fieldDriveSupabase
      .from("punch_items")
      .select(columns)
      .eq("organization_id", requireActiveOrganizationId())
      .in("site_id", chunk)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  const rows = [];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    try {
      rows.push(...await runQuery(fullSelect, chunk));
    } catch (error) {
      if (!["42703", "PGRST200", "PGRST201", "PGRST204"].includes(error.code)) throw error;
      rows.push(...await runQuery(fallbackSelect, chunk));
    }
  }
  return rows;
}

function getCompletedBusinessWindow(page = 0) {
  let end = new Date();
  end.setHours(24, 0, 0, 0);
  for (let index = 0; index < Math.max(0, page); index += 1) {
    end = subtractBusinessDays(end, 7);
  }
  return { start: subtractBusinessDays(end, 7), end };
}

function subtractBusinessDays(value, count) {
  const date = new Date(value);
  let remaining = count;
  while (remaining > 0) {
    date.setDate(date.getDate() - 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
  }
  return date;
}

function showAdminSection(button) {
  document.querySelectorAll("[data-admin-section]").forEach((navButton) => {
    navButton.classList.toggle("active", navButton === button);
  });

  activeSection = button.dataset.adminSection || "users";
  renderSection(activeSection);
}

function renderSection(sectionName, loading = false) {
  activeSection = sectionName;
  if (formSection && formSection !== sectionName) formSection = "";
  const section = sectionContent[sectionName] || sectionContent.users;
  const rows = rowsBySection[sectionName] || [];
  adminTitle.textContent = section.title;
  adminSubtitle.textContent = section.subtitle;
  adminActionButton.innerHTML = `${renderAdminIcon(section.icon)}<span>${escapeHtml(section.action)}</span>`;
  adminActionButton.classList.toggle("hidden", ["completedItems", "reports", "archive"].includes(sectionName));

  if (loading) {
    setPanelMessage("Loading dashboard...");
    renderIcons();
    return;
  }

  if (sectionName === "reports") {
    adminPanel.innerHTML = renderReportsWorkspace();
    bindReportsWorkspace();
    renderIcons();
    applyStarterCopy(adminPanel);
    return;
  }

  adminPanel.innerHTML = `
    <div id="adminFormSlot">${formSection === sectionName ? renderInlineForm(sectionName) : ""}</div>
    <div class="panel-toolbar ${isItemSection(sectionName) ? "items-toolbar" : ["documents", "sites"].includes(sectionName) ? "filter-toolbar" : ""}">
      <input id="adminSearchInput" type="search" placeholder="${section.search}" aria-label="${section.search}" />
      <button class="secondary-button" id="refreshDashboardButton" type="button"><i data-lucide="refresh-cw"></i><span>Refresh</span></button>
      ${isItemSection(sectionName) ? renderItemFilterButton(rows) : ""}
      ${sectionName === "documents" ? renderDocumentSiteFilter() : ""}
      ${sectionName === "sites" ? renderSiteProjectFilter() : ""}
      ${sectionName === "archive" ? renderArchiveFilters() : ""}
    </div>
    ${sectionName === "sites" ? `<div class="site-bulk-toolbar" id="siteBulkToolbar">${renderSiteBulkToolbar(getVisibleRows(sectionName, rows, ""))}</div>` : ""}
    ${sectionName === "completedItems" ? renderCompletedItemsPager() : ""}
    ${renderSectionRows(sectionName, section, getVisibleRows(sectionName, rows, ""))}
    <p class="empty-state ${getVisibleRows(sectionName, rows, "").length ? "hidden" : ""}" id="adminEmptyState">
      No ${section.title.toLowerCase()} found yet.
    </p>
  `;

  document.querySelector("#refreshDashboardButton").addEventListener("click", refreshDashboardRows);
  document.querySelector("#adminSearchInput").addEventListener("input", (event) => {
    renderFilteredRows(sectionName, event.target.value);
  });
  const inlineForm = document.querySelector("#adminInlineForm");
  if (inlineForm) {
    inlineForm.addEventListener("submit", submitInlineForm);
    wireInlineFormControls(inlineForm);
  }
  const cancelFormButton = document.querySelector("#cancelInlineFormButton");
  if (cancelFormButton) cancelFormButton.addEventListener("click", hideInlineForm);
  bindItemFilterControls();
  bindDocumentFilterControl();
  bindSiteProjectFilterControl();
  bindArchiveFilterControls();
  bindCompletedItemsPager();
  bindRowActions();
  bindSiteBulkActions(getVisibleRows(sectionName, rows, ""));
  bindItemCardActions();
  bindSettingsManagerActions();
  renderIcons();
  applyStarterCopy();
}

function renderReportsWorkspace() {
  const projects = rowsBySection.projects || [];
  const sites = rowsBySection.sites || [];
  const crews = [...new Set((rowsBySection.items || []).map((row) => row.trade).filter(Boolean))]
    .sort(compareAdminText);
  return `
    <section class="reports-workspace">
      <div class="reports-scope-grid">
        <label><span>Project</span><select id="reportProjectSelect"><option value="">All projects</option>${projects.map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.primary)}</option>`).join("")}</select></label>
        <label><span>Site</span><select id="reportSiteSelect"><option value="">Choose a site</option>${sites.map((site) => `<option value="${escapeHtml(site.id)}" data-project-id="${escapeHtml(site.projectId || "")}">${escapeHtml(site.primary)}</option>`).join("")}</select></label>
        <label><span>Crew</span><select id="reportCrewSelect"><option value="">All crews</option>${crews.map((crew) => `<option value="${escapeHtml(crew)}">${escapeHtml(crew)}</option>`).join("")}</select></label>
      </div>
      <div class="report-action-grid">
        <article class="report-action-card">
          <i data-lucide="building-2"></i>
          <div><strong>Site report</strong><span>All open items for one site.</span></div>
          <div class="report-action-buttons">
            <button class="primary-button" id="openSiteReportButton" type="button">Open report</button>
            <button class="secondary-button" id="pdfSiteReportButton" type="button"><i data-lucide="file-text"></i><span>PDF</span></button>
            <button class="secondary-button" id="shareSiteReportButton" type="button"><i data-lucide="share-2"></i><span>Share</span></button>
            <button class="secondary-button report-refresh-button" id="refreshSiteReportButton" type="button"><i data-lucide="refresh-cw"></i><span>Revoke + Refresh</span></button>
          </div>
        </article>
        <article class="report-action-card">
          <i data-lucide="hard-hat"></i>
          <div><strong>Site crew report</strong><span>One crew's open items at one site.</span></div>
          <div class="report-action-buttons">
            <button class="primary-button" id="openSiteCrewReportButton" type="button">Open report</button>
            <button class="secondary-button" id="pdfSiteCrewReportButton" type="button"><i data-lucide="file-text"></i><span>PDF</span></button>
            <button class="secondary-button" id="shareSiteCrewReportButton" type="button"><i data-lucide="share-2"></i><span>Share</span></button>
            <button class="secondary-button report-refresh-button" id="refreshSiteCrewReportButton" type="button"><i data-lucide="refresh-cw"></i><span>Revoke + Refresh</span></button>
          </div>
        </article>
        <article class="report-action-card">
          <i data-lucide="folder-kanban"></i>
          <div><strong>Project / all-projects report</strong><span>All open items in the selected project scope.</span></div>
          <div class="report-action-buttons">
            <button class="primary-button" id="openAllItemsReportButton" type="button">Open report</button>
            <button class="secondary-button" id="pdfAllItemsReportButton" type="button"><i data-lucide="file-text"></i><span>PDF</span></button>
            <button class="secondary-button" id="shareAllItemsReportButton" type="button"><i data-lucide="share-2"></i><span>Share</span></button>
            <button class="secondary-button report-refresh-button" id="refreshAllItemsReportButton" type="button"><i data-lucide="refresh-cw"></i><span>Revoke + Refresh</span></button>
          </div>
        </article>
        <article class="report-action-card">
          <i data-lucide="users"></i>
          <div><strong>Crew scope report</strong><span>One crew across the selected project or all projects.</span></div>
          <div class="report-action-buttons">
            <button class="primary-button" id="openCrewScopeReportButton" type="button">Open report</button>
            <button class="secondary-button" id="pdfCrewScopeReportButton" type="button"><i data-lucide="file-text"></i><span>PDF</span></button>
            <button class="secondary-button" id="shareCrewScopeReportButton" type="button"><i data-lucide="share-2"></i><span>Share</span></button>
            <button class="secondary-button report-refresh-button" id="refreshCrewScopeReportButton" type="button"><i data-lucide="refresh-cw"></i><span>Revoke + Refresh</span></button>
          </div>
        </article>
      </div>
      <p class="report-workspace-status" id="reportWorkspaceStatus">Choose a scope, then open a report.</p>
    </section>
  `;
}

function bindReportsWorkspace() {
  const projectSelect = document.querySelector("#reportProjectSelect");
  const siteSelect = document.querySelector("#reportSiteSelect");
  const crewSelect = document.querySelector("#reportCrewSelect");
  projectSelect?.addEventListener("change", () => {
    const projectId = projectSelect.value;
    Array.from(siteSelect.options).forEach((option) => {
      if (!option.value) return;
      option.hidden = Boolean(projectId && option.dataset.projectId !== projectId);
    });
    if (siteSelect.selectedOptions[0]?.hidden) siteSelect.value = "";
  });
  document.querySelector("#openSiteReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value) throw new Error("Choose a site first.");
    return createDashboardSiteReport(siteSelect.value);
  }));
  document.querySelector("#pdfSiteReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value) throw new Error("Choose a site first.");
    return createDashboardSiteReport(siteSelect.value);
  }, { pdf: true }));
  document.querySelector("#shareSiteReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value) throw new Error("Choose a site first.");
    return createDashboardSiteReport(siteSelect.value);
  }, { share: true, title: "Punch Logic site report" }));
  document.querySelector("#refreshSiteReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value) throw new Error("Choose a site first.");
    return createDashboardSiteReport(siteSelect.value);
  }, {
    refresh: true,
    revoke: () => revokeDashboardSiteReport(siteSelect.value)
  }));
  document.querySelector("#openSiteCrewReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value || !crewSelect.value) throw new Error("Choose a site and crew first.");
    return createDashboardSiteReport(siteSelect.value, crewSelect.value);
  }));
  document.querySelector("#pdfSiteCrewReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value || !crewSelect.value) throw new Error("Choose a site and crew first.");
    return createDashboardSiteReport(siteSelect.value, crewSelect.value);
  }, { pdf: true }));
  document.querySelector("#shareSiteCrewReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value || !crewSelect.value) throw new Error("Choose a site and crew first.");
    return createDashboardSiteReport(siteSelect.value, crewSelect.value);
  }, { share: true, title: "Punch Logic crew report" }));
  document.querySelector("#refreshSiteCrewReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!siteSelect.value || !crewSelect.value) throw new Error("Choose a site and crew first.");
    return createDashboardSiteReport(siteSelect.value, crewSelect.value);
  }, {
    refresh: true,
    revoke: () => revokeDashboardSiteReport(siteSelect.value, crewSelect.value)
  }));
  document.querySelector("#openAllItemsReportButton")?.addEventListener("click", () => runDashboardReportAction(
    () => createDashboardScopeReport(projectSelect.value)
  ));
  document.querySelector("#pdfAllItemsReportButton")?.addEventListener("click", () => runDashboardReportAction(
    () => createDashboardScopeReport(projectSelect.value),
    { pdf: true }
  ));
  document.querySelector("#shareAllItemsReportButton")?.addEventListener("click", () => runDashboardReportAction(
    () => createDashboardScopeReport(projectSelect.value),
    { share: true, title: "Punch Logic project report" }
  ));
  document.querySelector("#refreshAllItemsReportButton")?.addEventListener("click", () => runDashboardReportAction(
    () => createDashboardScopeReport(projectSelect.value),
    {
      refresh: true,
      revoke: () => revokeDashboardScopeReport(projectSelect.value)
    }
  ));
  document.querySelector("#openCrewScopeReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!crewSelect.value) throw new Error("Choose a crew first.");
    return createDashboardScopeReport(projectSelect.value, crewSelect.value);
  }));
  document.querySelector("#pdfCrewScopeReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!crewSelect.value) throw new Error("Choose a crew first.");
    return createDashboardScopeReport(projectSelect.value, crewSelect.value);
  }, { pdf: true }));
  document.querySelector("#shareCrewScopeReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!crewSelect.value) throw new Error("Choose a crew first.");
    return createDashboardScopeReport(projectSelect.value, crewSelect.value);
  }, { share: true, title: "Punch Logic crew report" }));
  document.querySelector("#refreshCrewScopeReportButton")?.addEventListener("click", () => runDashboardReportAction(async () => {
    if (!crewSelect.value) throw new Error("Choose a crew first.");
    return createDashboardScopeReport(projectSelect.value, crewSelect.value);
  }, {
    refresh: true,
    revoke: () => revokeDashboardScopeReport(projectSelect.value, crewSelect.value)
  }));
}

async function runDashboardReportAction(createUrl, options = {}) {
  const status = document.querySelector("#reportWorkspaceStatus");
  if (status) status.textContent = options.refresh
    ? "Revoking the old link and creating a replacement..."
    : options.pdf
      ? "Preparing PDF..."
      : options.share
        ? "Preparing a secure link..."
        : "Generating secure report...";
  try {
    if (options.refresh && typeof options.revoke === "function") await options.revoke();
    const reportUrl = await createUrl();
    const url = new URL(reportUrl, window.location.href);
    if (options.pdf) url.searchParams.set("pdf", "1");
    if (options.share) {
      const shared = await shareDashboardReportUrl(url.toString(), options.title || "Punch Logic report");
      if (status) status.textContent = shared ? "Report shared." : "Report link copied.";
      return;
    }
    if (options.refresh) {
      await copyDashboardReportUrl(url.toString());
      if (status) status.textContent = "Old link revoked. Replacement link copied.";
      return;
    }
    const reportLink = document.createElement("a");
    reportLink.href = url.toString();
    reportLink.target = "_blank";
    reportLink.rel = "noopener noreferrer";
    reportLink.hidden = true;
    document.body.append(reportLink);
    reportLink.click();
    reportLink.remove();
    if (status) status.textContent = options.pdf
      ? "PDF opened in a new tab."
      : "Report opened in a new tab.";
  } catch (error) {
    if (status) status.textContent = error.message || (options.pdf
      ? "The PDF could not be prepared."
      : "The report could not be generated.");
  }
}

async function shareDashboardReportUrl(url, title) {
  if (navigator.share) {
    await navigator.share({ title, url });
    return true;
  }
  await copyDashboardReportUrl(url);
  return false;
}

async function copyDashboardReportUrl(url) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }
  const input = document.createElement("textarea");
  input.value = url;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("The report link was created, but it could not be copied.");
}

function revokeDashboardSiteReport(siteId, crew = "") {
  if (!siteId) throw new Error("Choose a site first.");
  return revokeDashboardReport("/.netlify/functions/shared-report", {
    reportId: `site-${siteId}`,
    reportKind: crew ? "trade" : "site",
    tradeName: crew || ""
  });
}

function revokeDashboardScopeReport(projectId = "", crew = "") {
  return revokeDashboardReport("/.netlify/functions/all-report", {
    reportId: projectId ? `project-open-items:${projectId}` : "all-open-items",
    reportKind: crew ? "all_trade" : "all_items",
    tradeName: crew || ""
  });
}

async function revokeDashboardReport(endpoint, details) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify({ action: "revokeReportAccess", ...details })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The existing report link could not be revoked.");
  return result;
}

async function createDashboardSiteReport(siteId, crew = "") {
  const site = (rowsBySection.sites || []).find((row) => row.id === siteId);
  if (!site) throw new Error("The selected site is no longer available.");
  const issues = (rowsBySection.items || []).filter((row) => row.siteId === siteId);
  const reportId = `site-${siteId}`;
  const crews = [...new Set(issues.map((row) => row.trade).filter(Boolean))];
  const tradeKeys = Object.fromEntries(crews.map((name) => [createAdminReportToken(), name]));
  const accessByCrew = Object.fromEntries(crews.map((name) => [name, createAdminReportAccessBundle()]));
  const payload = {
    id: reportId,
    organizationId: requireActiveOrganizationId(),
    clientName: supabaseConfig.clientName || "",
    starterType: supabaseConfig.starterType || "builder",
    community: site.secondary || "No project",
    tradeKeys,
    _access: { site: createAdminReportAccessBundle(), trades: accessByCrew },
    homesite: {
      id: site.id,
      name: site.name || site.primary,
      fields: site.fields || [],
      address: getSiteFieldValue(site.fields || [], "Address")
    },
    issues: issues.map(mapAdminRowToSiteReportIssue)
  };
  const result = await postDashboardReport("/.netlify/functions/shared-report", payload);
  const url = new URL(crew ? "trade-report.html" : "home-report.html", window.location.href);
  url.searchParams.set("r", reportId);
  if (crew) {
    const key = Object.entries(tradeKeys).find(([, name]) => name === crew)?.[0];
    if (!key || !result.access?.trades?.[crew]) throw new Error("That crew has no open items at the selected site.");
    url.searchParams.set("trade", key);
    url.searchParams.set("access", result.access.trades[crew].update);
  } else {
    url.searchParams.set("access", result.access.site.update);
  }
  return shortenDashboardReportUrl(url.toString());
}

async function createDashboardScopeReport(projectId = "", crew = "") {
  const scopeRows = (rowsBySection.items || []).filter((row) => !projectId || row.projectId === projectId);
  if (!scopeRows.length) throw new Error("There are no open items in that report scope.");
  const project = (rowsBySection.projects || []).find((row) => row.id === projectId);
  const reportId = projectId ? `project-open-items:${projectId}` : "all-open-items";
  const crews = crew ? [crew] : [...new Set(scopeRows.map((row) => row.trade).filter(Boolean))];
  const tradeKeys = Object.fromEntries(crews.map((name) => [createAdminReportToken(), name]));
  const payload = {
    id: reportId,
    projectId,
    projectName: project?.primary || "",
    organizationId: requireActiveOrganizationId(),
    clientName: supabaseConfig.clientName || "",
    starterType: supabaseConfig.starterType || "builder",
    siteIds: [...new Set(scopeRows.map((row) => row.siteId).filter(Boolean))],
    tradeKeys,
    _access: crew
      ? { trades: { [crew]: createAdminReportAccessBundle() } }
      : { allItems: createAdminReportAccessBundle() },
    issues: scopeRows.map(mapAdminRowToAllReportIssue)
  };
  const result = await postDashboardReport("/.netlify/functions/all-report", payload);
  const url = new URL("all-trade-report.html", window.location.href);
  url.searchParams.set("r", reportId);
  if (crew) {
    const key = Object.entries(tradeKeys).find(([, name]) => name === crew)?.[0];
    if (!key || !result.access?.trades?.[crew]) throw new Error("That crew has no open items in the selected scope.");
    url.searchParams.set("trade", key);
    url.searchParams.set("tradeName", crew);
    url.searchParams.set("access", result.access.trades[crew].update);
  } else {
    url.searchParams.set("access", result.access?.allItems?.read || "");
  }
  return shortenDashboardReportUrl(url.toString());
}

function mapAdminRowToSiteReportIssue(row) {
  return {
    id: row.id,
    room: row.location,
    locationArea: row.locationArea,
    locationDetail: row.locationDetail,
    trade: row.trade,
    issue: row.item,
    notes: row.notes,
    photos: (row.photos || []).map((photo) => ({
      id: photo.storage_path || photo.id || "",
      name: photo.file_name || photo.name || "item-photo.jpg",
      type: photo.content_type || photo.type || "image/jpeg",
      completionProof: Boolean(photo.completionProof ?? photo.completion_proof),
      createdAt: photo.created_at || photo.createdAt || ""
    })),
    createdAt: row.createdAt,
    sharedNote: row.comment,
    tradeCompleted: row.tradeCompleted,
    tradeCompletedAt: row.tradeCompletedAt,
    completed: row.completed,
    completedAt: row.completedAt
  };
}

function mapAdminRowToAllReportIssue(row) {
  const site = (rowsBySection.sites || []).find((candidate) => candidate.id === row.siteId);
  return {
    ...mapAdminRowToSiteReportIssue(row),
    communityId: row.projectId,
    community: row.project,
    homesiteId: row.siteId,
    homesiteName: row.site,
    address: getSiteFieldValue(site?.fields || [], "Address"),
    siteFields: site?.fields || []
  };
}

async function postDashboardReport(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The secure report could not be generated.");
  return result;
}

async function shortenDashboardReportUrl(reportUrl) {
  const response = await fetch("/.netlify/functions/report-link", {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify({ url: reportUrl })
  });
  if (!response.ok) return reportUrl;
  const result = await response.json().catch(() => ({}));
  return result.path ? new URL(result.path, window.location.origin).toString() : result.url || reportUrl;
}

function createAdminReportToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function createAdminReportAccessBundle() {
  return {
    read: createAdminReportToken(),
    update: createAdminReportToken(),
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString()
  };
}

function renderFilteredRows(sectionName, searchValue) {
  const rows = getVisibleRows(sectionName, rowsBySection[sectionName] || [], searchValue);
  document.querySelector("#adminRows").innerHTML = isItemSection(sectionName)
    ? renderItemCards(rows)
    : sectionName === "archive"
      ? renderArchiveWorkspace(rows)
    : sectionName === "settings"
      ? renderSettingsManager(rows)
      : renderRows(rows, sectionName);
  document.querySelector("#adminEmptyState").classList.toggle("hidden", rows.length > 0);
  updateSiteBulkToolbar(sectionName, rows);
  bindRowActions();
  bindItemCardActions();
  bindSettingsManagerActions();
  renderIcons();
  applyStarterCopy(adminPanel);
}

function renderItemFilterButton(rows) {
  const active = hasActiveItemFilters();
  return `
    <button class="secondary-button item-filter-button ${active ? "active" : ""}" id="itemFilterButton" type="button" aria-label="Sort and filter open items">
      <i data-lucide="sliders-horizontal"></i><span>Filter</span>
    </button>
    <div class="item-filter-popover hidden" id="itemFilterPopover">
      <label><span>Sort by</span>${renderSimpleSelect("itemSortBy", [
        ["date", "Date added"],
        ["trade", "Crew"],
        ["project", "Project"],
        ["site", "Site"]
      ], itemViewState.sortBy)}</label>
      <label><span>Order</span>${renderSimpleSelect("itemSortDir", [["asc", "Ascending"], ["desc", "Descending"]], itemViewState.sortDir)}</label>
      <label><span>Crew</span>${renderSimpleSelect("itemTradeFilter", [["", "All crews"], ...getUniqueRowOptions(rows, "trade")], itemViewState.trade)}</label>
      <label><span>Project</span>${renderSimpleSelect("itemProjectFilter", [["", "All projects"], ...getUniqueRowOptions(rows, "project")], itemViewState.project)}</label>
      <label><span>Site</span>${renderSimpleSelect("itemSiteFilter", [["", "All sites"], ...getUniqueRowOptions(rows, "site")], itemViewState.site)}</label>
      <label><span>User</span>${renderSimpleSelect("itemUserFilter", [["", "All users"], ...getUniqueRowOptions(rows, "addedByName")], itemViewState.user)}</label>
      <button class="row-action-button" id="clearItemFiltersButton" type="button"><i data-lucide="x"></i><span>Clear</span></button>
    </div>
  `;
}

function renderSimpleSelect(id, options, selectedValue) {
  return `<select id="${escapeHtml(id)}">${options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selectedValue ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
}

function renderDocumentSiteFilter() {
  const options = [["", "All sites"], ...(rowsBySection.sites || []).map((site) => [site.id, site.primary])];
  return `<label class="toolbar-select"><span>Site</span>${renderSimpleSelect("documentSiteFilter", options, documentSiteFilter)}</label>`;
}

function renderSiteProjectFilter() {
  const projects = (rowsBySection.projects || [])
    .map((project) => [project.id, project.primary])
    .sort((a, b) => compareAdminText(a[1], b[1]));
  const hasUnassignedSites = (rowsBySection.sites || []).some((site) => !site.projectId);
  const options = [["", "All projects"], ...projects];
  if (hasUnassignedSites) options.push(["__unassigned__", "No project"]);
  return `<label class="toolbar-select"><span>Project</span>${renderSimpleSelect("siteProjectFilter", options, siteProjectFilter)}</label>`;
}

function renderArchiveFilters() {
  const projects = [...new Map((rowsBySection.archive || [])
    .filter((row) => row.projectId)
    .map((row) => [row.projectId, row.project || row.tertiary]))
    .entries()]
    .sort((a, b) => compareAdminText(a[1], b[1]));
  return `
    <label class="toolbar-select"><span>Type</span>${renderSimpleSelect("archiveTypeFilter", [["", "All types"], ["Project", "Projects"], ["Site", "Sites"], ["Item", "Items"]], archiveTypeFilter)}</label>
    <label class="toolbar-select"><span>Project</span>${renderSimpleSelect("archiveProjectFilter", [["", "All projects"], ...projects], archiveProjectFilter)}</label>
  `;
}

function renderCompletedItemsPager() {
  const window = getCompletedBusinessWindow(completedItemsPage);
  const start = new Date(window.start);
  const end = new Date(window.end);
  end.setDate(end.getDate() - 1);
  const label = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  return `
    <div class="completed-pager" aria-label="Completed item date pages">
      <button class="secondary-button" id="newerCompletedPageButton" type="button"${completedItemsPage === 0 ? " disabled" : ""}><i data-lucide="chevron-left"></i><span>Newer</span></button>
      <strong>Page ${completedItemsPage + 1}</strong>
      <span>${escapeHtml(label)}</span>
      <button class="secondary-button" id="olderCompletedPageButton" type="button"${completedItemsPage > 0 && !(rowsBySection.completedItems || []).length ? " disabled" : ""}><span>Older</span><i data-lucide="chevron-right"></i></button>
    </div>
  `;
}

function bindDocumentFilterControl() {
  const select = document.querySelector("#documentSiteFilter");
  if (!select) return;
  select.addEventListener("change", () => {
    documentSiteFilter = select.value;
    renderFilteredRows("documents", document.querySelector("#adminSearchInput")?.value || "");
  });
}

function bindSiteProjectFilterControl() {
  const select = document.querySelector("#siteProjectFilter");
  if (!select) return;
  select.addEventListener("change", () => {
    siteProjectFilter = select.value;
    renderFilteredRows("sites", document.querySelector("#adminSearchInput")?.value || "");
  });
}

function bindItemFilterControls() {
  const button = document.querySelector("#itemFilterButton");
  const popover = document.querySelector("#itemFilterPopover");
  if (!button || !popover) return;

  button.addEventListener("click", () => {
    popover.classList.toggle("hidden");
  });

  if (closeItemFilterOnOutsideClick) {
    document.removeEventListener("click", closeItemFilterOnOutsideClick);
  }

  closeItemFilterOnOutsideClick = (event) => {
    if (popover.classList.contains("hidden")) return;
    if (button.contains(event.target) || popover.contains(event.target)) return;
    popover.classList.add("hidden");
  };
  document.addEventListener("click", closeItemFilterOnOutsideClick);

  const update = () => {
    itemViewState = {
      sortBy: document.querySelector("#itemSortBy")?.value || defaultItemViewState.sortBy,
      sortDir: document.querySelector("#itemSortDir")?.value || defaultItemViewState.sortDir,
      trade: document.querySelector("#itemTradeFilter")?.value || "",
      project: document.querySelector("#itemProjectFilter")?.value || "",
      site: document.querySelector("#itemSiteFilter")?.value || "",
      siteId: "",
      user: document.querySelector("#itemUserFilter")?.value || ""
    };
    updateItemFilterButtonState();
    renderFilteredRows(activeSection, document.querySelector("#adminSearchInput")?.value || "");
  };

  ["#itemSortBy", "#itemSortDir", "#itemTradeFilter", "#itemProjectFilter", "#itemSiteFilter", "#itemUserFilter"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("change", update);
  });

  document.querySelector("#clearItemFiltersButton")?.addEventListener("click", () => {
    itemViewState = { ...defaultItemViewState };
    renderSection(activeSection);
  });
}

function updateItemFilterButtonState() {
  const button = document.querySelector("#itemFilterButton");
  if (!button) return;
  button.classList.toggle("active", hasActiveItemFilters());
}

function hasActiveItemFilters() {
  return Object.entries(defaultItemViewState).some(([key, value]) => itemViewState[key] !== value);
}

function getVisibleRows(sectionName, rows, searchValue = "") {
  const query = searchValue.trim().toLowerCase();
  let visible = rows.filter((row) => row.search.includes(query));
  if (sectionName === "contacts") {
    return visible.sort((a, b) => compareAdminText(a.contactName || a.primary, b.contactName || b.primary) || compareAdminText(a.vendor, b.vendor));
  }
  if (sectionName === "documents") {
    return visible.filter((row) => !documentSiteFilter || row.siteId === documentSiteFilter);
  }
  if (sectionName === "sites") {
    return visible.filter((row) => {
      if (!siteProjectFilter) return true;
      if (siteProjectFilter === "__unassigned__") return !row.projectId;
      return row.projectId === siteProjectFilter;
    });
  }
  if (sectionName === "archive") {
    return visible.filter((row) => {
      if (archiveTypeFilter && row.entityType !== archiveTypeFilter) return false;
      if (archiveProjectFilter && row.projectId !== archiveProjectFilter) return false;
      return true;
    });
  }
  if (!isItemSection(sectionName)) return visible;

  visible = visible
    .filter((row) => !itemViewState.trade || row.trade === itemViewState.trade)
    .filter((row) => !itemViewState.project || row.project === itemViewState.project)
    .filter((row) => !itemViewState.site || row.site === itemViewState.site)
    .filter((row) => !itemViewState.siteId || row.siteId === itemViewState.siteId)
    .filter((row) => !itemViewState.user || row.addedByName === itemViewState.user);

  return sortItemRows(visible);
}

function sortItemRows(rows) {
  const sorted = [...rows].sort((a, b) => {
    if (itemViewState.sortBy === "trade") return compareAdminText(a.trade, b.trade) || compareAdminDate(a, b);
    if (itemViewState.sortBy === "project") return compareAdminText(a.project, b.project) || compareAdminDate(a, b);
    if (itemViewState.sortBy === "site") return compareAdminText(a.site, b.site) || compareAdminDate(a, b);
    return compareAdminDate(a, b);
  });

  return itemViewState.sortDir === "desc" ? sorted.reverse() : sorted;
}

function compareAdminText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function compareAdminDate(a, b) {
  return new Date(a.completedAt || a.createdAt || 0) - new Date(b.completedAt || b.createdAt || 0);
}

function getRecentlyCompletedRows(rows) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    if (!row.completed) return false;
    const completedTime = new Date(row.completedAt || row.createdAt || 0).getTime();
    return completedTime && completedTime >= cutoff;
  });
}

function getUniqueRowOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => [value, value]);
}

function renderSectionRows(sectionName, section, rows) {
  if (isItemSection(sectionName)) {
    return `
      <div class="item-worklist">
        <div id="adminRows">${renderItemCards(rows)}</div>
      </div>
    `;
  }

  if (sectionName === "settings") {
    return `<div id="adminRows">${renderSettingsManager(rows)}</div>`;
  }

  if (sectionName === "archive") {
    return `<div id="adminRows">${renderArchiveWorkspace(rows)}</div>`;
  }

  return `
    <div class="admin-table">
      <div class="admin-row header">
        ${section.columns.map((column) => `<span>${escapeHtml(column)}</span>`).join("")}
      </div>
      <div id="adminRows">${renderRows(rows, sectionName)}</div>
    </div>
  `;
}

function renderSettingsManager(rows) {
  const locations = rows.filter((row) => row.secondary === "Location");
  const trades = rows.filter((row) => isCrewSettingType(row.secondary));
  const itemsByTrade = new Map();
  trades.forEach((trade) => itemsByTrade.set(trade.primary, []));
  rows.filter((row) => row.secondary === "Item").forEach((row) => {
    const trade = row.tertiary || "All crews";
    if (!itemsByTrade.has(trade)) itemsByTrade.set(trade, []);
    itemsByTrade.get(trade).push(row);
  });
  const tradeNames = trades.map((trade) => trade.primary).filter(Boolean);
  if (tradeNames.length && !tradeNames.includes(selectedSettingsTrade)) selectedSettingsTrade = tradeNames[0];
  if (!tradeNames.length) selectedSettingsTrade = "";
  const selectedItems = selectedSettingsTrade ? itemsByTrade.get(selectedSettingsTrade) || [] : [];

  return `
    <div class="settings-manager">
      ${renderNotificationSettings()}
      ${renderSettingsGroup("Locations", "Add Location", "location", locations)}
      ${renderSettingsGroup("Crews", "Add Crew", "trade", trades)}
      <section class="settings-manager-panel wide${collapsedAdminSettingsSections.has("items") ? " is-collapsed" : ""}" data-admin-settings-section="items">
        <div class="settings-manager-header">
          ${renderAdminSettingsCollapseToggle("items", "Items For Crews", "Add or delete item dropdown choices for each crew.")}
        </div>
        <div class="settings-manager-content"${collapsedAdminSettingsSections.has("items") ? " hidden" : ""}>
          <div class="trade-item-groups">
            ${tradeNames.length ? renderTradeItemSelector(tradeNames, selectedSettingsTrade) + renderTradeItemGroup(selectedSettingsTrade, selectedItems) : `<p class="settings-empty">Add a crew before adding item dropdowns.</p>`}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderNotificationSettings() {
  const options = [
    ["crewCompletion", "Crew marked complete", "Crew completion updates."],
    ["completionPhotos", "Completion photos", "Completion photos uploaded from crew reports."],
    ["crewNotes", "Crew report notes", "Shared notes saved from crew reports."],
    ["itemAdded", "New items", "New punch-list items."],
    ["itemChanges", "Item changes", "Item edits, office completions, reopenings, and deletions."],
    ["projectsSites", "Projects and sites", "New or changed projects and sites."],
    ["users", "Users", "New users and user changes."],
    ["documentsContacts", "Documents and contacts", "Document and contact activity."],
    ["settings", "Shared settings", "Crew, location, and item-setting changes."]
  ];
  return `
    <section class="settings-manager-panel wide notification-settings-panel${collapsedAdminSettingsSections.has("notifications") ? " is-collapsed" : ""}" data-admin-settings-section="notifications">
      <div class="settings-manager-header">
        ${renderAdminSettingsCollapseToggle("notifications", "Notification Settings", "Choose which alert types appear in this dashboard.")}
      </div>
      <div class="settings-manager-content"${collapsedAdminSettingsSections.has("notifications") ? " hidden" : ""}>
        <div class="notification-toggle-list">
          ${options.map(([key, title, description]) => `
            <label class="notification-toggle-row">
              <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span>
              <input type="checkbox" data-notification-preference="${escapeHtml(key)}"${notificationPreferences[key] !== false ? " checked" : ""} />
            </label>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderSettingsGroup(title, actionLabel, type, rows) {
  const collapsed = collapsedAdminSettingsSections.has(type);
  return `
    <section class="settings-manager-panel${collapsed ? " is-collapsed" : ""}" data-admin-settings-section="${escapeHtml(type)}">
      <div class="settings-manager-header">
        ${renderAdminSettingsCollapseToggle(type, title, `${rows.length} saved`)}
        <button class="secondary-button" type="button" data-add-setting="${escapeHtml(type)}"><i data-lucide="plus"></i><span>${escapeHtml(actionLabel)}</span></button>
      </div>
      <div class="settings-manager-content"${collapsed ? " hidden" : ""}>
        <div class="settings-chip-list">
          ${rows.map(renderSettingChip).join("") || `<p class="settings-empty">None added yet.</p>`}
        </div>
      </div>
    </section>
  `;
}

function renderAdminSettingsCollapseToggle(key, title, summary) {
  const expanded = !collapsedAdminSettingsSections.has(key);
  return `
    <button class="settings-manager-collapse-toggle" type="button" data-toggle-admin-settings="${escapeHtml(key)}" aria-expanded="${expanded}">
      <span class="settings-manager-collapse-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(summary)}</span></span>
      <span class="settings-manager-collapse-chevron" aria-hidden="true"></span>
    </button>
  `;
}

function renderTradeItemGroup(trade, items) {
  return `
    <div class="trade-item-group">
      <div class="settings-manager-header compact">
        <div><strong>${escapeHtml(trade)}</strong><span>${items.length} items</span></div>
        <button class="secondary-button" type="button" data-add-trade-item="${escapeHtml(trade)}"><i data-lucide="plus"></i><span>Add Item</span></button>
      </div>
      <div class="settings-chip-list">
        ${items.map(renderSettingChip).join("") || `<p class="settings-empty">No items for this crew.</p>`}
      </div>
    </div>
  `;
}

function renderTradeItemSelector(tradeNames, selectedTrade) {
  return `
    <label class="settings-trade-select">
      <span>Crew</span>
      <select id="settingsTradeSelect">
        ${tradeNames.map((trade) => `<option value="${escapeHtml(trade)}"${trade === selectedTrade ? " selected" : ""}>${escapeHtml(trade)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderSettingChip(row) {
  const canDelete = row.action?.startsWith("deleteSetting:");
  return `
    <div class="settings-chip" data-setting-chip="${escapeHtml(row.id)}">
      <span>${escapeHtml(row.primary)}</span>
      <div class="settings-chip-actions">
        <button class="row-action-button icon-only" type="button" data-edit-setting="${escapeHtml(row.id)}" aria-label="Edit ${escapeHtml(row.primary)}" title="Edit"><i data-lucide="pencil"></i></button>
        ${canDelete ? `<button class="row-action-button danger icon-only" type="button" data-delete-setting="${escapeHtml(row.action.split(":")[1])}" data-id="${escapeHtml(row.id)}" aria-label="Delete ${escapeHtml(row.primary)}" title="Delete"><i data-lucide="trash-2"></i></button>` : `<button class="row-action-button danger icon-only" type="button" data-delete-main-setting="${escapeHtml(row.id)}" aria-label="Delete ${escapeHtml(row.primary)}" title="Delete"><i data-lucide="trash-2"></i></button>`}
      </div>
    </div>
  `;
}

function isItemSection(sectionName) {
  return sectionName === "items" || sectionName === "completedItems";
}

function renderRows(rows, sectionName = "") {
  return rows.map((row) => {
    const editPanel = sectionName === "users" ? renderUserEditPanel(row) : sectionName === "projects" ? renderProjectEditPanel(row) : sectionName === "sites" ? renderSiteEditPanel(row) : sectionName === "documents" ? renderDocumentEditPanel(row) : sectionName === "contacts" ? renderContactEditPanel(row) : "";
    const details = row.details?.length ? renderRowDetails(row.details) : "";
    const inlineEditType = sectionName === "projects" ? "project" : sectionName === "sites" ? "site" : sectionName === "contacts" ? "contact" : "";
    const inlineDisplayAttribute = inlineEditType ? ` data-${inlineEditType}-display` : "";
    return `
      <article class="admin-row-card" data-row-card="${escapeHtml(row.id)}">
        <div class="admin-row"${inlineDisplayAttribute}>
          <strong class="${sectionName === "sites" ? "site-row-name" : ""}">
            ${sectionName === "sites" ? `<input type="checkbox" data-site-select="${escapeHtml(row.id)}" aria-label="Select ${escapeHtml(row.name || row.primary)}"${selectedSiteIds.has(row.id) ? " checked" : ""} />` : ""}
            <span>${escapeHtml(row.primary)}</span>
          </strong>
          <span>${escapeHtml(row.secondary)}</span>
          <small>${escapeHtml(row.tertiary)}</small>
          ${renderAction(row)}
        </div>
        ${inlineEditType && details ? `<div${inlineDisplayAttribute}>${details}</div>` : details}
        ${editPanel}
      </article>
    `;
  }).join("");
}

function renderSiteBulkToolbar(visibleRows = []) {
  const validIds = new Set((rowsBySection.sites || []).map((row) => row.id).filter(Boolean));
  [...selectedSiteIds].forEach((id) => {
    if (!validIds.has(id)) selectedSiteIds.delete(id);
  });
  const visibleIds = visibleRows.map((row) => row.id).filter(Boolean);
  const selectedCount = selectedSiteIds.size;
  const allShownSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSiteIds.has(id));
  return `
    <button class="secondary-button" id="selectAllShownSitesButton" type="button"${allShownSelected || !visibleIds.length ? " disabled" : ""}>
      <i data-lucide="list-checks"></i><span>${allShownSelected ? "All shown selected" : "Select all shown"}</span>
    </button>
    <button class="secondary-button" id="clearSelectedSitesButton" type="button"${selectedCount ? "" : " disabled"}>
      <i data-lucide="x"></i><span>Clear</span>
    </button>
    <span class="site-selection-count">${selectedCount} selected</span>
    <button class="danger-button" id="deleteSelectedSitesButton" type="button"${selectedCount ? "" : " disabled"}>
      <i data-lucide="trash-2"></i><span>Delete selected</span>
    </button>
  `;
}

function updateSiteBulkToolbar(sectionName, visibleRows = []) {
  if (sectionName !== "sites") return;
  const toolbar = document.querySelector("#siteBulkToolbar");
  if (!toolbar) return;
  toolbar.innerHTML = renderSiteBulkToolbar(visibleRows);
  bindSiteBulkActions(visibleRows);
  renderIcons();
}

function bindSiteBulkActions(visibleRows = []) {
  const toolbar = document.querySelector("#siteBulkToolbar");
  if (!toolbar) return;

  toolbar.querySelector("#selectAllShownSitesButton")?.addEventListener("click", () => {
    visibleRows.forEach((row) => {
      if (row.id) selectedSiteIds.add(row.id);
    });
    renderFilteredRows("sites", document.querySelector("#adminSearchInput")?.value || "");
  });

  toolbar.querySelector("#clearSelectedSitesButton")?.addEventListener("click", () => {
    selectedSiteIds.clear();
    renderFilteredRows("sites", document.querySelector("#adminSearchInput")?.value || "");
  });

  toolbar.querySelector("#deleteSelectedSitesButton")?.addEventListener("click", deleteSelectedSites);
}

function renderRowDetails(details = []) {
  return `
    <div class="admin-row-details">
      ${details.map((detail) => `<div><strong>${escapeHtml(detail.label)}</strong><span>${escapeHtml(detail.value)}</span></div>`).join("")}
    </div>
  `;
}

function renderAction(row) {
  if (row.actions?.length) {
    return `<div class="row-action-group">${row.actions.map((action) => renderActionButton(action, row.id)).join("")}</div>`;
  }
  if (!row.action) return `<span class="status-pill">${escapeHtml(row.status || "Ready")}</span>`;
  return renderActionButton({ action: row.action, label: row.actionLabel || "" }, row.id);
}

function renderActionButton(actionConfig, id) {
  const action = actionConfig.action || "";
  const label = actionConfig.label || "";
  const dangerClass = action.startsWith("delete") ? " danger" : "";
  return `<button class="row-action-button ${label ? "" : "icon-only"}${dangerClass}" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}" aria-label="${escapeHtml(getActionLabel(action))}" title="${escapeHtml(getActionLabel(action))}">${renderAdminIcon(getActionIcon(action))}${label ? `<span>${escapeHtml(label)}</span>` : ""}</button>`;
}

function renderUserEditPanel(row) {
  return `
    <div class="admin-row-edit hidden" data-user-edit="${escapeHtml(row.id)}">
      <label><span>Display name</span><input name="display_name" value="${escapeHtml(row.primary)}" placeholder="Name shown in app" /></label>
      <label><span>Email</span><input name="email" type="email" value="${escapeHtml(row.email || "")}" placeholder="user@example.com" /></label>
      <label><span>Role</span><select name="role"><option value="foreman"${row.role === "foreman" ? " selected" : ""}>Foreman</option><option value="admin"${row.role === "admin" ? " selected" : ""}>Admin</option></select></label>
      <label><span>New password</span><input name="password" type="password" minlength="8" placeholder="Leave blank to keep current" /></label>
      <label class="wide"><span>Assigned projects</span>${renderProjectMultiSelect(row.projectIds || [])}</label>
      <label class="wide"><span>Assigned sites</span>${renderSiteMultiSelect(row.siteIds || [])}</label>
      <div class="edit-actions wide">
        <button class="primary-button" type="button" data-user-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
      </div>
    </div>
  `;
}

function renderProjectEditPanel(row) {
  return `
    <div class="admin-row-edit project-inline-edit hidden" data-project-edit="${escapeHtml(row.id)}">
      <label><span>Project name</span><input name="name" value="${escapeHtml(row.primary)}" placeholder="Project name" /></label>
      <label class="wide"><span>Foremen</span>${renderForemanMultiSelect(row.foremanIds || [])}</label>
      <div class="edit-actions wide">
        <button class="secondary-button" type="button" data-project-cancel="${escapeHtml(row.id)}"><i data-lucide="x"></i><span>Cancel</span></button>
        <button class="primary-button" type="button" data-project-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
      </div>
    </div>
  `;
}

function renderSiteEditPanel(row) {
  const address = getDetailValue(row.details, "Address");
  const permit = getDetailValue(row.details, "Permit");
  const customFields = (row.details || []).filter((detail) => !["Project", "User", "Name", "Address", "Permit", "Documents"].includes(detail.label));
  return `
    <div class="admin-row-edit site-inline-edit hidden" data-site-edit="${escapeHtml(row.id)}">
      <label><span>Site name</span><input name="name" value="${escapeHtml(row.name || row.primary)}" placeholder="Site name" /></label>
      <label><span>Project</span>${renderProjectSelect(row.projectId || "", "project_id", true)}</label>
      <label class="wide"><span>Foremen</span>${renderForemanMultiSelect(row.foremanIds || [])}</label>
      <label><span>Address</span><input name="address" value="${escapeHtml(address)}" placeholder="Street address or site address" /></label>
      <label><span>Permit</span><input name="permit" value="${escapeHtml(permit)}" placeholder="Permit number" /></label>
      <label class="wide"><span>Custom fields</span><div class="custom-field-list" data-site-custom-fields>${(customFields.length ? customFields : [{ label: "", value: "" }]).map((field) => renderCustomFieldRow(field.label, field.value)).join("")}</div></label>
      <div class="inline-add-row wide">
        <button class="secondary-button" data-add-site-edit-field="${escapeHtml(row.id)}" type="button"><i data-lucide="plus"></i><span>Add field</span></button>
      </div>
      <div class="edit-actions wide">
        <button class="secondary-button" type="button" data-site-cancel="${escapeHtml(row.id)}"><i data-lucide="x"></i><span>Cancel</span></button>
        <button class="primary-button" type="button" data-site-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
      </div>
    </div>
  `;
}

function renderDocumentEditPanel(row) {
  return `
    <div class="admin-row-edit hidden" data-document-edit="${escapeHtml(row.id)}">
      <label><span>Document name</span><input name="title" value="${escapeHtml(row.primary)}" maxlength="160" /></label>
      <label><span>Site</span>${renderSiteSelect(row.siteId, "site_id", true)}</label>
      <label><span>Document Type</span><input name="category" value="${escapeHtml(row.category || "")}" required maxlength="100" placeholder="Example: Permit or Blueprint" /></label>
      <label><span>Document date</span><input name="document_date" type="date" value="${escapeHtml(row.documentDate || "")}" /></label>
      <label class="admin-checkbox-field wide"><input name="quick_access" type="checkbox"${row.quickAccess ? " checked" : ""} /><span>Quick Access</span><small>Show a direct button on the site card.</small></label>
      <label class="wide"><span>Description</span><textarea name="description" maxlength="1000">${escapeHtml(row.description || "")}</textarea></label>
      <div class="edit-actions wide">
        <button class="primary-button" type="button" data-document-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
      </div>
    </div>
  `;
}

function renderContactEditPanel(row) {
  return `
    <div class="admin-row-edit contact-inline-edit hidden" data-contact-edit="${escapeHtml(row.id)}">
      <label><span>Name</span><input name="contact_name" value="${escapeHtml(row.contactName || row.primary)}" placeholder="Name" /></label>
      <label><span>Company</span><input name="vendor" value="${escapeHtml(row.vendor || "")}" placeholder="Company" /></label>
      <label><span>Job Desc</span><input name="job_desc" value="${escapeHtml(row.jobDesc || "")}" placeholder="Job description" /></label>
      <label><span>Email</span><input name="email" type="email" value="${escapeHtml(row.email || "")}" placeholder="Email" /></label>
      <label><span>Phone</span><input name="phone" value="${escapeHtml(row.phone || "")}" placeholder="Phone" /></label>
      <label><span>Alternative contact</span><input name="alternate_contact" value="${escapeHtml(row.alternateContact || "")}" placeholder="Alternative contact" /></label>
      <label class="wide"><span>Custom fields</span><div class="custom-field-list" data-contact-custom-fields>${(row.fields?.length ? row.fields : [{ label: "", value: "" }]).map((field) => renderCustomFieldRow(field.label, field.value)).join("")}</div></label>
      <div class="inline-add-row wide">
        <button class="secondary-button" data-add-contact-edit-field="${escapeHtml(row.id)}" type="button"><i data-lucide="plus"></i><span>Add field</span></button>
      </div>
      <div class="edit-actions wide">
        <button class="secondary-button" type="button" data-contact-cancel="${escapeHtml(row.id)}"><i data-lucide="x"></i><span>Cancel</span></button>
        <button class="primary-button" type="button" data-contact-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
      </div>
    </div>
  `;
}

function getDetailValue(details = [], label = "") {
  const target = String(label || "").toLowerCase();
  return details.find((detail) => String(detail.label || "").toLowerCase() === target)?.value || "";
}

function renderItemCards(rows, options = {}) {
  return rows.map((row) => {
    const archived = Boolean(options.archived || row.archived);
    return `
      <article class="admin-item-card ${archived ? "archived-item" : row.completed ? "office-done" : row.tradeCompleted ? "trade-done" : "trade-open"}" data-item-card="${escapeHtml(row.id)}" data-item-source="${escapeHtml(row.source || "Supabase")}" data-item-archived="${String(archived)}">
        <div class="admin-item-topline">
          <div>
            <span>${escapeHtml(row.project || "No project")}</span>
            <strong>${escapeHtml(row.siteLabel || row.site || "No site")}</strong>
            <small>${escapeHtml([row.location, row.trade, row.item, row.completedAt ? `Completed ${formatDate(row.completedAt)}` : "", row.addedByName ? `Added by ${row.addedByName}` : "", `Date Added - ${formatTimestamp(row.createdAt)}`].filter(Boolean).join(" | "))}</small>
          </div>
          <div class="item-card-actions">
            ${archived ? `<span class="status-pill">Archived</span>` : `
              ${renderAgeBadge(row.createdAt)}
              <span class="trade-status-pill ${row.tradeCompleted ? "done" : "open"}">${row.tradeCompleted ? "Crew Complete" : "Crew Not Complete"}</span>
              ${row.tradeCompleted && !row.completed ? `<button class="secondary-button crew-reject-button" type="button" data-item-reject-crew="${escapeHtml(row.id)}"><i data-lucide="x-circle"></i><span>Not complete</span></button>` : ""}
              ${row.completed ? `<button class="secondary-button" type="button" data-item-uncomplete="${escapeHtml(row.id)}"><i data-lucide="rotate-ccw"></i><span>Uncomplete</span></button>` : `<button class="secondary-button" type="button" data-item-complete="${escapeHtml(row.id)}"><i data-lucide="check-circle-2"></i><span>Complete</span></button>`}
              <button class="row-action-button icon-only" type="button" data-item-edit="${escapeHtml(row.id)}" aria-label="Edit item" title="Edit item"><i data-lucide="pencil"></i></button>
            `}
            <button class="row-action-button danger icon-only" type="button" data-item-delete="${escapeHtml(row.id)}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </div>

        <div class="admin-item-notes">
          <div class="admin-item-original-note">
            <span>Item notes</span>
            <p>${escapeHtml(row.notes || "No item notes.")}</p>
          </div>
          <label>
            <span>Shared notes for crew</span>
            <textarea data-item-shared-note maxlength="4000" placeholder="Add notes the crew can see">${escapeHtml(row.comment || "")}</textarea>
          </label>
          <div class="admin-item-note-actions">
            <button class="primary-button" type="button" data-item-shared-note-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save shared note</span></button>
            <span data-item-notes-status role="status" aria-live="polite"></span>
          </div>
        </div>

        ${archived ? "" : `
          <div class="admin-item-fields hidden">
            <label><span>Project</span>${renderProjectSelect(row.projectId, "project_id")}</label>
            <label><span>Site</span>${renderSiteSelect(row.siteId, "site_id")}</label>
            <label><span>Location</span>${renderLocationSelect(row.locationArea || row.location, "location_area")}</label>
            <label><span>Location detail</span><input name="location_detail" value="${escapeHtml(row.locationDetail || "")}" placeholder="Location detail" /></label>
            <label><span>Crew</span>${renderTradeSelect(row.trade)}</label>
            <label><span>Item</span>${renderItemSelect(row.trade, row.item)}</label>
            <div class="item-edit-actions wide">
              <button class="primary-button" type="button" data-item-save="${escapeHtml(row.id)}"><i data-lucide="save"></i><span>Save changes</span></button>
            </div>
          </div>
        `}

        <div class="item-photo-strip">
          ${renderItemPhotos(row.photos)}
        </div>
      </article>
    `;
  }).join("");
}

function renderAgeBadge(createdAt) {
  const days = getDaysAgo(createdAt);
  const tone = days >= 5 ? "old" : days >= 3 ? "warn" : "fresh";
  return `<span class="item-age-badge ${tone}"><b>${days}</b><span>${days === 1 ? "day" : "days"} ago</span></span>`;
}

function getDaysAgo(createdAt) {
  const date = new Date(createdAt || Date.now());
  if (!Number.isFinite(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function renderItemPhotos(photos = []) {
  if (!photos.length) return `<span class="item-photo-empty">No photos</span>`;
  const orderedPhotos = [...photos].sort((a, b) => Number(isCompletionPhoto(a)) - Number(isCompletionPhoto(b)));
  return orderedPhotos.map((photo, index) => {
    const src = getItemPhotoUrl(photo);
    const photoLabel = isCompletionPhoto(photo) ? "Completion Photo" : "Item Photo";
    return `
      <button class="item-photo-link" type="button" data-photo-src="${escapeHtml(src)}" data-photo-label="${escapeHtml(photoLabel)}" title="Open ${escapeHtml(photoLabel.toLowerCase())} ${index + 1}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(photoLabel)}" />
        <span>${escapeHtml(photoLabel)}</span>
      </button>
    `;
  }).join("");
}

function isCompletionPhoto(photo) {
  return Boolean(photo?.completionProof ?? photo?.completion_proof);
}

function getItemPhotoUrl(photo) {
  if (photo.dataUrl) return photo.dataUrl;
  if (String(photo.storage_path || "").startsWith("data:image/")) return photo.storage_path;
  if (photo.signed_url) return photo.signed_url;
  if (/^https?:\/\//i.test(photo.storage_path || "")) return photo.storage_path;
  if (photo.storage_path) return `/.netlify/functions/photo?id=${encodeURIComponent(photo.storage_path)}`;
  if (photo.id) return `/.netlify/functions/photo?id=${encodeURIComponent(photo.id)}`;
  return "";
}

function bindArchiveFilterControls() {
  document.querySelector("#archiveTypeFilter")?.addEventListener("change", (event) => {
    archiveTypeFilter = event.target.value;
    renderFilteredRows("archive", document.querySelector("#adminSearchInput")?.value || "");
  });
  document.querySelector("#archiveProjectFilter")?.addEventListener("change", (event) => {
    archiveProjectFilter = event.target.value;
    renderFilteredRows("archive", document.querySelector("#adminSearchInput")?.value || "");
  });
}

function bindCompletedItemsPager() {
  document.querySelector("#newerCompletedPageButton")?.addEventListener("click", async () => {
    if (completedItemsPage === 0) return;
    completedItemsPage -= 1;
    await refreshDashboardRows();
    renderSection("completedItems");
  });
  document.querySelector("#olderCompletedPageButton")?.addEventListener("click", async () => {
    completedItemsPage += 1;
    await refreshDashboardRows();
    renderSection("completedItems");
  });
}

async function hydrateAdminPhotoSignedUrls(photoRows) {
  const paths = [...new Set((photoRows || [])
    .map((photo) => String(photo.storage_path || ""))
    .filter((path) => path && !path.startsWith("data:image/") && !/^https?:\/\//i.test(path)))];
  if (!paths.length) return;

  const { data, error } = await fieldDriveSupabase.storage.from(itemPhotoBucket).createSignedUrls(paths, 900);
  if (error) {
    console.warn("Secure photo links could not be created.", error);
    return;
  }
  const urlsByPath = new Map((data || []).map((entry) => [entry.path, entry.signedUrl]));
  (photoRows || []).forEach((photo) => {
    photo.signed_url = urlsByPath.get(photo.storage_path) || "";
  });
}

function bindRowActions(root = adminPanel) {
  bindForemanSelects(root);
  bindNoAssignmentSelects(root);
  bindProjectSiteAssignmentControls(root);

  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.busy === "true") return;
      button.dataset.busy = "true";
      button.disabled = true;
      try {
        await handleRowAction(button.dataset.action, button.dataset.id);
      } catch (error) {
        console.error("Dashboard action failed.", error);
        alert(error.message || "The dashboard action could not be completed. Refresh and try again.");
      } finally {
        button.dataset.busy = "false";
        if (button.isConnected) button.disabled = false;
      }
    });
  });

  root.querySelectorAll("[data-site-select]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedSiteIds.add(checkbox.dataset.siteSelect);
      else selectedSiteIds.delete(checkbox.dataset.siteSelect);
      const search = document.querySelector("#adminSearchInput")?.value || "";
      updateSiteBulkToolbar("sites", getVisibleRows("sites", rowsBySection.sites || [], search));
    });
  });

  root.querySelectorAll("[data-project-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.busy === "true") return;
      button.dataset.busy = "true";
      setDashboardButtonBusy(button, true, "Saving...");
      try {
        await saveProjectEdit(button.dataset.projectSave);
      } catch (error) {
        console.error("Project save failed.", error);
        if (!error?.dashboardAlerted) alert(getDashboardRequestError(error, "The project could not be saved."));
      } finally {
        button.dataset.busy = "false";
        if (button.isConnected) setDashboardButtonBusy(button, false);
      }
    });
  });

  root.querySelectorAll("[data-project-cancel]").forEach((button) => {
    button.addEventListener("click", () => toggleRowEdit("project", button.dataset.projectCancel, false));
  });

  root.querySelectorAll("[data-user-save]").forEach((button) => {
    button.addEventListener("click", () => saveUserEdit(button.dataset.userSave));
  });

  root.querySelectorAll("[data-site-save]").forEach((button) => {
    button.addEventListener("click", () => saveSiteEdit(button.dataset.siteSave));
  });

  root.querySelectorAll("[data-site-cancel]").forEach((button) => {
    button.addEventListener("click", () => toggleRowEdit("site", button.dataset.siteCancel, false));
  });

  root.querySelectorAll("[data-document-save]").forEach((button) => {
    button.addEventListener("click", () => saveDocumentEdit(button.dataset.documentSave));
  });

  root.querySelectorAll("[data-contact-save]").forEach((button) => {
    button.addEventListener("click", () => saveContactEdit(button.dataset.contactSave));
  });

  root.querySelectorAll("[data-contact-cancel]").forEach((button) => {
    button.addEventListener("click", () => toggleRowEdit("contact", button.dataset.contactCancel, false));
  });

  root.querySelectorAll("[data-add-contact-edit-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest(".admin-row-edit");
      panel?.querySelector("[data-contact-custom-fields]")?.insertAdjacentHTML("beforeend", renderCustomFieldRow());
      if (window.lucide) window.lucide.createIcons();
    });
  });

  root.querySelectorAll("[data-contact-edit]").forEach((panel) => {
    panel.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-custom-field]");
      if (!removeButton) return;
      handleCustomFieldRemove(panel, removeButton);
    });
  });

  root.querySelectorAll("[data-add-site-edit-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.closest(".admin-row-edit");
      panel?.querySelector("[data-site-custom-fields]")?.insertAdjacentHTML("beforeend", renderCustomFieldRow());
      if (window.lucide) window.lucide.createIcons();
    });
  });

  root.querySelectorAll("[data-site-edit]").forEach((panel) => {
    panel.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-custom-field]");
      if (!removeButton) return;
      handleCustomFieldRemove(panel, removeButton);
    });
  });
}

function bindItemCardActions() {
  adminPanel.querySelectorAll("[data-item-card] [data-trade-select]").forEach((tradeSelect) => {
    tradeSelect.addEventListener("change", () => {
      const card = tradeSelect.closest("[data-item-card]");
      const itemSelect = card?.querySelector("[data-item-select]");
      if (itemSelect) itemSelect.outerHTML = renderItemSelect(tradeSelect.value);
    });
  });

  adminPanel.querySelectorAll("[data-item-edit]").forEach((button) => {
    button.addEventListener("click", () => toggleItemEdit(button.dataset.itemEdit));
  });

  adminPanel.querySelectorAll("[data-item-save]").forEach((button) => {
    button.addEventListener("click", () => saveItemCard(button.dataset.itemSave));
  });

  adminPanel.querySelectorAll("[data-item-shared-note-save]").forEach((button) => {
    button.addEventListener("click", () => saveItemSharedNote(button.dataset.itemSharedNoteSave, button));
  });

  adminPanel.querySelectorAll("[data-item-shared-note]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      const card = textarea.closest("[data-item-card]");
      if (card) card.dataset.notesDirty = "true";
      const status = card?.querySelector("[data-item-notes-status]");
      if (status) status.textContent = "";
    });
  });

  adminPanel.querySelectorAll("[data-item-complete]").forEach((button) => {
    button.addEventListener("click", () => completeItemCard(button.dataset.itemComplete));
  });

  adminPanel.querySelectorAll("[data-item-uncomplete]").forEach((button) => {
    button.addEventListener("click", () => uncompleteItemCard(button.dataset.itemUncomplete));
  });

  adminPanel.querySelectorAll("[data-item-reject-crew]").forEach((button) => {
    button.addEventListener("click", () => rejectCrewCompletion(button.dataset.itemRejectCrew));
  });

  adminPanel.querySelectorAll("[data-item-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await deleteItemCard(button.dataset.itemDelete);
      } catch (error) {
        console.error("Item delete failed.", error);
        alert(error.message || "The item could not be deleted. Refresh and try again.");
      }
    });
  });

  adminPanel.querySelectorAll("[data-photo-src]").forEach((button) => {
    button.addEventListener("click", () => openItemPhoto(button.dataset.photoSrc, button.dataset.photoLabel));
  });
}

function bindSettingsManagerActions() {
  adminPanel.querySelector("#settingsTradeSelect")?.addEventListener("change", (event) => {
    selectedSettingsTrade = event.target.value;
    renderSection("settings");
  });

  adminPanel.querySelectorAll("[data-toggle-admin-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggleAdminSettings;
      const section = button.closest("[data-admin-settings-section]");
      const content = section?.querySelector(".settings-manager-content");
      if (!key || !section || !content) return;
      const collapsed = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", collapsed);
      content.hidden = collapsed;
      button.setAttribute("aria-expanded", String(!collapsed));
      if (collapsed) collapsedAdminSettingsSections.add(key);
      else collapsedAdminSettingsSections.delete(key);
      localStorage.setItem(adminSettingsCollapseStorageKey, JSON.stringify([...collapsedAdminSettingsSections]));
    });
  });

  adminPanel.querySelectorAll("[data-notification-preference]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.notificationPreference;
      if (!hasOwn(defaultAdminNotificationPreferences, key)) return;
      notificationPreferences = { ...notificationPreferences, [key]: input.checked };
      saveAdminNotificationPreferences();
      renderNotifications();
    });
  });

  adminPanel.querySelectorAll("[data-add-setting]").forEach((button) => {
    button.addEventListener("click", () => addDashboardSetting(button.dataset.addSetting));
  });

  adminPanel.querySelectorAll("[data-add-trade-item]").forEach((button) => {
    button.addEventListener("click", () => addDashboardTradeItem(button.dataset.addTradeItem));
  });

  adminPanel.querySelectorAll("[data-delete-setting]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteDashboardSetting(button.dataset.deleteSetting, button.dataset.id);
    });
  });

  adminPanel.querySelectorAll("[data-delete-main-setting]").forEach((button) => {
    button.addEventListener("click", async () => {
      deleteMainAppSetting(button.dataset.deleteMainSetting);
      await refreshDashboardRows();
    });
  });

  adminPanel.querySelectorAll("[data-edit-setting]").forEach((button) => {
    button.addEventListener("click", async () => {
      await editDashboardSetting(button.dataset.editSetting);
    });
  });
}

function handleCustomFieldRemove(container, removeButton) {
  const rows = container.querySelectorAll(".custom-field-row");
  if (rows.length > 1) {
    removeButton.closest(".custom-field-row")?.remove();
    return;
  }
  removeButton.closest(".custom-field-row")?.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
}

async function addDashboardSetting(type) {
  const label = type === "location" ? "Location" : "Crew";
  const name = prompt(`${label} name`);
  if (!name?.trim()) return;
  const table = type === "location" ? "location_settings" : "trade_settings";
  await insertRow(table, { organization_id: requireActiveOrganizationId(), name: name.trim() });
  if (type === "trade") selectedSettingsTrade = name.trim();
  addRecentChange(`${label} added`, name.trim(), "settings");
  await refreshDashboardRows();
}

async function addDashboardTradeItem(tradeName) {
  const name = prompt(`New item for ${tradeName}`);
  if (!name?.trim()) return;
  const tradeId = getTradeSettingId(tradeName);
  selectedSettingsTrade = tradeName;
  await insertRow("item_settings", {
    organization_id: requireActiveOrganizationId(),
    trade_id: tradeId || null,
    name: name.trim()
  });
  addRecentChange("Item added", name.trim(), "settings");
  await refreshDashboardRows();
}

function openItemPhoto(src, label = "Item photo") {
  if (!src) return;
  let viewer = document.querySelector("#adminPhotoViewer");
  if (!viewer) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="admin-photo-viewer hidden" id="adminPhotoViewer" role="dialog" aria-modal="true" aria-label="Photo viewer">
        <button class="admin-photo-viewer-close" type="button" data-close-admin-photo aria-label="Close photo"><i data-lucide="x"></i></button>
        <img alt="" />
        <strong></strong>
      </div>
    `);
    viewer = document.querySelector("#adminPhotoViewer");
    viewer.addEventListener("click", (event) => {
      if (event.target === viewer || event.target.closest("[data-close-admin-photo]")) closeAdminPhoto();
    });
  }
  const image = viewer.querySelector("img");
  image.src = src;
  image.alt = label || "Item photo";
  viewer.querySelector("strong").textContent = label || "Item photo";
  viewer.classList.remove("hidden");
  document.body.classList.add("admin-photo-open");
  renderIcons();
}

function closeAdminPhoto() {
  const viewer = document.querySelector("#adminPhotoViewer");
  if (!viewer) return;
  viewer.classList.add("hidden");
  viewer.querySelector("img")?.removeAttribute("src");
  document.body.classList.remove("admin-photo-open");
}

function toggleItemEdit(id) {
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  const fields = card?.querySelector(".admin-item-fields");
  if (!fields) return;
  fields.classList.toggle("hidden");
}

async function handlePrimaryAction(sectionName) {
  if (!currentProfile?.organization_id) {
    alert("Sign in with an admin profile first.");
    return;
  }

  formSection = formSection === sectionName ? "" : sectionName;
  renderSection(sectionName);
}

function hideInlineForm() {
  formSection = "";
  renderSection(activeSection);
}

function renderInlineForm(sectionName) {
  const formMap = {
    users: renderUserForm,
    projects: renderProjectForm,
    sites: renderSiteForm,
    documents: renderDocumentForm,
    contacts: renderContactForm,
    items: renderItemForm,
    settings: renderSettingForm
  };
  const render = formMap[sectionName] || renderItemForm;
  return `
    <form class="admin-inline-form" id="adminInlineForm" data-form-section="${escapeHtml(sectionName)}">
      ${render()}
      <p class="form-hint">${escapeHtml(getFormHint(sectionName))}</p>
      <div class="form-actions">
        <button class="secondary-button" id="cancelInlineFormButton" type="button"><i data-lucide="x"></i><span>Cancel</span></button>
        <button class="primary-button" type="submit"><i data-lucide="save"></i><span>Save</span></button>
      </div>
    </form>
  `;
}

function wireInlineFormControls(form) {
  bindForemanSelects(form);
  bindNoAssignmentSelects(form);
  bindProjectSiteAssignmentControls(form);

  form.querySelector("#addSiteCustomFieldButton")?.addEventListener("click", () => {
    form.querySelector("#siteCustomFieldList")?.insertAdjacentHTML("beforeend", renderCustomFieldRow());
  });

  form.querySelector("#addContactCustomFieldButton")?.addEventListener("click", () => {
    form.querySelector("#contactCustomFieldList")?.insertAdjacentHTML("beforeend", renderCustomFieldRow());
  });

  form.querySelector("#importAdminSitesButton")?.addEventListener("click", () => {
    form.querySelector("#adminSitesImportInput")?.click();
  });
  form.querySelector("#adminSitesImportInput")?.addEventListener("change", importAdminSitesFromSpreadsheet);
  form.querySelector("#exportAdminSitesButton")?.addEventListener("click", exportAdminSitesToSpreadsheet);

  form.querySelector("#importAdminContactsButton")?.addEventListener("click", () => {
    form.querySelector("#adminContactsImportInput")?.click();
  });
  form.querySelector("#adminContactsImportInput")?.addEventListener("change", importAdminContactsFromSpreadsheet);
  form.querySelector("#exportAdminContactsButton")?.addEventListener("click", exportAdminContactsToSpreadsheet);

  const documentFile = form.querySelector("[name='document_file']");
  documentFile?.addEventListener("change", () => {
    const titleInput = form.querySelector("[name='title']");
    const file = documentFile.files?.[0];
    if (file && titleInput && !titleInput.value.trim()) {
      titleInput.value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    }
  });

  const itemPhotoInput = form.querySelector("#adminItemPhotoInput");
  const itemPhotoName = form.querySelector("#adminItemPhotoName");
  const itemPhotoPreview = form.querySelector("#adminItemPhotoPreview");
  form.querySelector("#chooseAdminItemPhotoButton")?.addEventListener("click", () => itemPhotoInput?.click());
  itemPhotoInput?.addEventListener("change", () => {
    const file = itemPhotoInput.files?.[0];
    if (itemPhotoName) itemPhotoName.textContent = file?.name || "No photo chosen";
    if (!itemPhotoPreview) return;
    if (!file) {
      itemPhotoPreview.classList.add("hidden");
      itemPhotoPreview.removeAttribute("src");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      itemPhotoPreview.src = reader.result;
      itemPhotoPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-custom-field]");
    if (removeButton) removeButton.closest(".custom-field-row")?.remove();
  });

  const tradeSelect = form.querySelector("[data-trade-select]");
  const itemSelect = form.querySelector("[data-item-select]");
  tradeSelect?.addEventListener("change", () => {
    itemSelect.outerHTML = renderItemSelect(tradeSelect.value);
  });

  form.querySelector("[data-quick-add='trade']")?.addEventListener("click", async () => {
    const name = prompt("New crew name");
    if (!name?.trim()) return;
    await insertRow("trade_settings", { organization_id: requireActiveOrganizationId(), name: name.trim() });
    addRecentChange("Crew added", name.trim(), "settings");
    await refreshDashboardRows();
    formSection = "items";
    const nextTradeSelect = form.querySelector("[data-trade-select]");
    if (nextTradeSelect) {
      if (!Array.from(nextTradeSelect.options).some((option) => option.value === name.trim())) {
        nextTradeSelect.add(new Option(name.trim(), name.trim()));
      }
      nextTradeSelect.value = name.trim();
      nextTradeSelect.dispatchEvent(new Event("change"));
    }
  });

  form.querySelector("[data-quick-add='item']")?.addEventListener("click", async () => {
    const tradeName = form.querySelector("[data-trade-select]")?.value || "";
    if (!tradeName) {
      alert("Choose a crew before adding an item.");
      return;
    }
    const name = prompt(`New item for ${tradeName}`);
    if (!name?.trim()) return;
    const tradeId = getTradeSettingId(tradeName);
    await insertRow("item_settings", {
      organization_id: requireActiveOrganizationId(),
      trade_id: tradeId || null,
      name: name.trim()
    });
    addRecentChange("Item added", name.trim(), "settings");
    await refreshDashboardRows();
    formSection = "items";
    const nextTradeSelect = form.querySelector("[data-trade-select]");
    if (nextTradeSelect) {
      nextTradeSelect.value = tradeName;
    }
    const refreshedItemSelect = form.querySelector("[data-item-select]");
    if (refreshedItemSelect) {
      if (!Array.from(refreshedItemSelect.options).some((option) => option.value === name.trim())) {
        refreshedItemSelect.add(new Option(name.trim(), name.trim()));
      }
      refreshedItemSelect.value = name.trim();
    }
  });
}

function getFormHint(sectionName) {
  if (sectionName === "users") return "Selecting a project assigns every site in that project. You can also select individual sites.";
  if (sectionName === "projects") return "After saving a project, the site form opens so you can add sites to it.";
  if (sectionName === "sites") return "After saving a site, the open item form opens so you can add work to that site.";
  if (sectionName === "documents") return "Files are private and available only to users who can access the assigned site.";
  if (sectionName === "items") return "Choose a saved site first; newly added sites appear here after the dashboard refreshes.";
  return "";
}

function renderUserForm() {
  return `
    <label><span>Display name</span><input name="display_name" required placeholder="Name shown in app" /></label>
    <label><span>Email</span><input name="email" type="email" required placeholder="user@example.com" /></label>
    <label><span>Temporary password</span><input name="password" type="password" required minlength="8" placeholder="At least 8 characters" /></label>
    <label><span>Role</span><select name="role"><option value="foreman">Foreman</option><option value="admin">Admin</option></select></label>
    <label class="wide"><span>Assigned projects</span>${renderProjectMultiSelect()}</label>
    <label class="wide"><span>Assigned sites</span>${renderSiteMultiSelect()}</label>
  `;
}

function renderProjectForm() {
  return `
    <label><span>Project name</span><input name="name" required placeholder="Project name" /></label>
    <label class="wide"><span>Foremen</span>${renderForemanMultiSelect()}</label>
  `;
}

function renderSiteForm() {
  return `
    <label><span>Site name</span><input name="name" required placeholder="Site name" /></label>
    <label><span>Project</span>${renderProjectSelect("", "project_id", true)}</label>
    <div class="inline-add-row wide">
      <input class="admin-import-input" id="adminSitesImportInput" type="file" accept=".xlsx,.xls,.csv" />
      <button class="secondary-button" id="importAdminSitesButton" type="button"><i data-lucide="file-spreadsheet"></i><span>Import from .XLSX</span></button>
      <button class="secondary-button" id="exportAdminSitesButton" type="button"><i data-lucide="download"></i><span>Export to .XLSX</span></button>
    </div>
    <label class="wide"><span>Foremen</span>${renderForemanMultiSelect()}</label>
    <label><span>Address</span><input name="address" placeholder="Street address or site address" /></label>
    <label><span>Permit</span><input name="permit" placeholder="Permit number" /></label>
    <label class="wide"><span>Custom fields</span><div class="custom-field-list" id="siteCustomFieldList">${renderCustomFieldRow()}</div></label>
    <div class="inline-add-row wide">
      <button class="secondary-button" id="addSiteCustomFieldButton" type="button"><i data-lucide="plus"></i><span>Add field</span></button>
    </div>
  `;
}

function renderDocumentForm() {
  return `
    <label class="wide"><span>File</span><input name="document_file" type="file" accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/jpeg,image/png,image/webp" required /><small>PDF, DOCX, XLSX, CSV, JPG, PNG, or WebP. Maximum 25 MB.</small></label>
    <label><span>Document name</span><input name="title" required maxlength="160" placeholder="Example: Electrical Floor Plan" /></label>
    <label><span>Site</span>${renderSiteSelect(documentSiteFilter, "site_id", true)}</label>
    <label><span>Document Type</span><input name="category" required maxlength="100" placeholder="Example: Permit or Blueprint" /></label>
    <label><span>Document date</span><input name="document_date" type="date" /></label>
    <label class="admin-checkbox-field wide"><input name="quick_access" type="checkbox" /><span>Quick Access</span><small>Show a direct button on the site card.</small></label>
    <label class="wide"><span>Description</span><textarea name="description" maxlength="1000" placeholder="Optional document notes"></textarea></label>
  `;
}

function renderContactForm() {
  return `
    <div class="inline-add-row wide">
      <input class="admin-import-input" id="adminContactsImportInput" type="file" accept=".xlsx,.xls,.csv" />
      <button class="secondary-button" id="importAdminContactsButton" type="button"><i data-lucide="file-spreadsheet"></i><span>Import from .XLSX</span></button>
      <button class="secondary-button" id="exportAdminContactsButton" type="button"><i data-lucide="download"></i><span>Export to .XLSX</span></button>
    </div>
    <label><span>Name</span><input name="contact_name" required placeholder="Name" /></label>
    <label><span>Company</span><input name="vendor" placeholder="Company" /></label>
    <label><span>Job Desc</span><input name="job_desc" placeholder="Job description" /></label>
    <label><span>Email</span><input name="email" type="email" placeholder="Email" /></label>
    <label><span>Phone</span><input name="phone" placeholder="Phone" /></label>
    <label><span>Alternative contact</span><input name="alternate_contact" placeholder="Alternative contact" /></label>
    <label class="wide"><span>Custom fields</span><div class="custom-field-list" id="contactCustomFieldList">${renderCustomFieldRow()}</div></label>
    <div class="inline-add-row wide">
      <button class="secondary-button" id="addContactCustomFieldButton" type="button"><i data-lucide="plus"></i><span>Add field</span></button>
    </div>
  `;
}

async function importAdminSitesFromSpreadsheet(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!window.XLSX) {
    alert("Excel import is still loading. Try again in a moment.");
    return;
  }

  const button = document.querySelector("#importAdminSitesButton");
  setAdminImportButtonBusy(button, true, "Importing sites...");
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const form = document.querySelector("#adminInlineForm");
    const fallbackProjectId = form?.querySelector("[name='project_id']")?.value || "";
    const importedRows = parseAdminSiteWorkbook(workbook, fallbackProjectId);
    if (!importedRows.length) {
      alert("No sites were found. Include a Site, Site Name, Homesite, Lot, Block, or Address column.");
      return;
    }

    const organizationId = requireActiveOrganizationId();
    const [projectRows, siteRows] = await Promise.all([
      selectTable("projects", "id, name, created_at"),
      selectSites()
    ]);
    const projectsByName = new Map(projectRows.map((project) => [normalizeImportKey(project.name), project]));
    const sitesByProjectAndName = new Map(siteRows.map((site) => [adminImportedSiteKey(site.project_id, site.name), site]));
    let added = 0;
    let skipped = 0;

    for (const imported of importedRows) {
      let projectId = imported.projectId || "";
      if (imported.projectName) {
        const projectKey = normalizeImportKey(imported.projectName);
        let project = projectsByName.get(projectKey);
        if (!project) {
          const inserted = await createAdminProject(imported.projectName);
          project = { id: inserted.id, name: imported.projectName };
          projectsByName.set(projectKey, project);
        }
        projectId = project.id;
      }

      const siteKey = adminImportedSiteKey(projectId, imported.name);
      const existing = sitesByProjectAndName.get(siteKey);
      if (existing) {
        skipped += 1;
        continue;
      }

      const site = await createAdminSite({
        organization_id: organizationId,
        project_id: projectId || null,
        name: imported.name,
        fields: imported.fields
      });
      sitesByProjectAndName.set(siteKey, { id: site.id, project_id: projectId || null, name: imported.name, fields: imported.fields });
      added += 1;
    }

    addRecentChange("Sites imported", `${added} added, ${skipped} skipped`, "sites");
    formSection = "";
    activeSection = "sites";
    document.querySelector("#adminFormSlot")?.replaceChildren();
    await refreshDashboardRows();
    alert(`Site import complete. ${added} added and ${skipped} duplicates skipped. Existing sites were not changed.`);
  } catch (error) {
    alert(`Site import failed. ${error.message || "Check the spreadsheet and try again."}`);
  } finally {
    setAdminImportButtonBusy(button, false);
  }
}

async function importAdminContactsFromSpreadsheet(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!window.XLSX) {
    alert("Excel import is still loading. Try again in a moment.");
    return;
  }

  const button = document.querySelector("#importAdminContactsButton");
  setAdminImportButtonBusy(button, true, "Importing contacts...");
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const importedRows = parseAdminContactWorkbook(workbook);
    if (!importedRows.length) {
      alert("No contacts were found. Include a Name or Contact Name column.");
      return;
    }

    const organizationId = requireActiveOrganizationId();
    const existingContacts = await selectContacts();
    const existingKeys = new Set(existingContacts.map(adminImportedContactKey));
    let added = 0;
    let skipped = 0;

    for (const contact of importedRows) {
      const key = adminImportedContactKey(contact);
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }
      await insertContactRow({
        organization_id: organizationId,
        contact_name: contact.contact_name,
        trade: "",
        vendor: contact.vendor,
        job_desc: contact.job_desc,
        email: contact.email,
        phone: contact.phone,
        alternate_contact: contact.alternate_contact,
        fields: contact.fields
      });
      existingKeys.add(key);
      added += 1;
    }

    addRecentChange("Contacts imported", `${added} added, ${skipped} skipped`, "contacts");
    formSection = "";
    activeSection = "contacts";
    document.querySelector("#adminFormSlot")?.replaceChildren();
    await refreshDashboardRows();
    alert(`Contact import complete. ${added} added and ${skipped} duplicates skipped. Existing contacts were not changed.`);
  } catch (error) {
    alert(`Contact import failed. ${error.message || "Check the spreadsheet and try again."}`);
  } finally {
    setAdminImportButtonBusy(button, false);
  }
}

function exportAdminSitesToSpreadsheet() {
  const sites = [...(rowsBySection.sites || [])].sort((a, b) =>
    compareAdminText(a.secondary, b.secondary) || compareAdminText(a.name || a.primary, b.name || b.primary)
  );
  if (!sites.length) {
    alert("There are no sites to export.");
    return;
  }

  const reservedLabels = new Set(["project", "user", "name", "documents"]);
  const customLabels = getAdminExportFieldLabels(
    sites.flatMap((site) => (site.details || []).filter((field) => !reservedLabels.has(normalizeImportKey(field.label))))
  );
  const rows = sites.map((site) => {
    const fields = new Map((site.details || []).map((field) => [normalizeImportKey(field.label), field.value]));
    const row = {
      Project: site.secondary === "No project" ? "" : site.secondary || "",
      Site: site.name || site.primary || ""
    };
    customLabels.forEach((label) => {
      row[label] = fields.get(normalizeImportKey(label)) || "";
    });
    return row;
  });
  writeAdminSpreadsheet(rows, "Sites", "punch-logic-sites");
}

function exportAdminContactsToSpreadsheet() {
  const contacts = [...(rowsBySection.contacts || [])].sort((a, b) =>
    compareAdminText(a.contactName || a.primary, b.contactName || b.primary) || compareAdminText(a.vendor, b.vendor)
  );
  if (!contacts.length) {
    alert("There are no contacts to export.");
    return;
  }

  const customLabels = getAdminExportFieldLabels(contacts.flatMap((contact) => normalizeContactFields(contact.fields)));
  const rows = contacts.map((contact) => {
    const customFields = new Map(normalizeContactFields(contact.fields).map((field) => [normalizeImportKey(field.label), field.value]));
    const row = {
      Name: contact.contactName || contact.primary || "",
      Company: contact.vendor || "",
      "Job Desc": contact.jobDesc || "",
      Email: contact.email || "",
      Phone: contact.phone || "",
      "Alternative Contact": contact.alternateContact || ""
    };
    customLabels.forEach((label) => {
      row[label] = customFields.get(normalizeImportKey(label)) || "";
    });
    return row;
  });
  writeAdminSpreadsheet(rows, "Contacts", "punch-logic-contacts");
}

function getAdminExportFieldLabels(fields = []) {
  const labels = new Map();
  fields.forEach((field) => {
    const label = String(field?.label || "").trim();
    if (label) labels.set(normalizeImportKey(label), label);
  });
  return [...labels.values()].sort(compareAdminText);
}

function writeAdminSpreadsheet(rows, sheetName, fileName) {
  if (!window.XLSX) {
    alert("Excel export is still loading. Try again in a moment.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const columns = Object.keys(rows[0] || {});
  worksheet["!cols"] = columns.map((column) => ({
    wch: Math.min(44, Math.max(14, column.length + 2, ...rows.map((row) => String(row[column] || "").length + 2)))
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function parseAdminSiteWorkbook(workbook, fallbackProjectId = "") {
  const fallbackProject = (rowsBySection.projects || []).find((project) => project.id === fallbackProjectId);
  return workbook.SheetNames.flatMap((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    return rows.map((row) => {
      const normalized = normalizeAdminImportRow(row);
      const projectName = getAdminImportValue(normalized, ["project", "community"])
        || fallbackProject?.primary
        || (isGenericImportSheetName(sheetName) ? "" : sheetName.trim());
      const projectId = projectName ? "" : fallbackProjectId;
      const block = getAdminImportValue(normalized, ["block"]);
      const lot = getAdminImportValue(normalized, ["lot"]);
      const address = getAdminImportValue(normalized, ["address"]);
      const explicitName = getAdminImportValue(normalized, ["site", "sitename", "homesite", "home"]);
      const fields = getAdminImportedCustomFields(row, new Set(["project", "community", "site", "sitename", "homesite", "home"]));
      const fallbackField = fields[0]?.value || "";
      const name = explicitName || buildAdminImportedSiteName(block, lot, address, fallbackField);
      if (!name) return null;
      return {
        name,
        projectName,
        projectId,
        fields
      };
    }).filter(Boolean);
  });
}

function parseAdminContactWorkbook(workbook) {
  const reservedColumns = new Set([
    "name", "contactname", "company", "vendor", "jobdesc", "jobdescription", "email", "emailaddress",
    "phone", "phonenumber", "alternativecontact", "alternatecontact", "altcontact"
  ]);
  return workbook.SheetNames.flatMap((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    return rows.map((row) => {
      const normalized = normalizeAdminImportRow(row);
      const contactName = getAdminImportValue(normalized, ["name", "contactname"]);
      if (!contactName) return null;
      return {
        contact_name: contactName,
        vendor: getAdminImportValue(normalized, ["company", "vendor"]),
        job_desc: getAdminImportValue(normalized, ["jobdesc", "jobdescription"]),
        email: getAdminImportValue(normalized, ["email", "emailaddress"]),
        phone: getAdminImportValue(normalized, ["phone", "phonenumber"]),
        alternate_contact: getAdminImportValue(normalized, ["alternativecontact", "alternatecontact", "altcontact"]),
        fields: getAdminImportedCustomFields(row, reservedColumns)
      };
    }).filter(Boolean);
  });
}

function normalizeAdminImportRow(row) {
  return Object.fromEntries(Object.entries(row).map(([label, value]) => [normalizeImportKey(label), String(value ?? "").trim()]));
}

function getAdminImportValue(normalizedRow, names) {
  for (const name of names) {
    const value = normalizedRow[normalizeImportKey(name)];
    if (value) return value;
  }
  return "";
}

function getAdminImportedCustomFields(row, reservedColumns) {
  return Object.entries(row)
    .map(([label, value]) => ({ label: String(label || "").trim(), value: String(value ?? "").trim() }))
    .filter((field) => field.label && field.value && !reservedColumns.has(normalizeImportKey(field.label)));
}

function mergeImportedFields(existingFields, importedFields) {
  const fieldsByLabel = new Map(normalizeSiteFields(existingFields).map((field) => [normalizeImportKey(field.label), field]));
  normalizeSiteFields(importedFields).forEach((field) => fieldsByLabel.set(normalizeImportKey(field.label), field));
  return [...fieldsByLabel.values()];
}

function buildAdminImportedSiteName(block, lot, address, fallback = "") {
  if (block && lot) return `${block}${String(lot).padStart(2, "0")}`;
  return lot || block || address || fallback;
}

function adminImportedSiteKey(projectId, name) {
  return `${projectId || ""}|${normalizeImportKey(name)}`;
}

function adminImportedContactKey(contact) {
  return [
    contact.contact_name || contact.trade || "",
    contact.vendor || "",
    contact.email || "",
    contact.phone || ""
  ].map(normalizeImportKey).join("|");
}

function normalizeImportKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isGenericImportSheetName(value) {
  return /^(sheet\d*|sites?|contacts?)$/i.test(String(value || "").trim());
}

function setAdminImportButtonBusy(button, busy, busyLabel = "Importing...") {
  if (!button) return;
  if (!button.dataset.defaultContent) button.dataset.defaultContent = button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? `<i data-lucide="loader-circle"></i><span>${escapeHtml(busyLabel)}</span>` : button.dataset.defaultContent;
  renderIcons();
}

function setDashboardButtonBusy(button, busy, busyLabel = "Saving...") {
  if (!button) return;
  if (!button.dataset.defaultContent) button.dataset.defaultContent = button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? `<i data-lucide="loader-circle"></i><span>${escapeHtml(busyLabel)}</span>` : button.dataset.defaultContent;
  renderIcons();
}

function getDashboardRequestError(error, fallback) {
  const message = String(error?.message || "");
  if (error?.name === "AbortError" || /aborted|timeout/i.test(message)) {
    return "The project save timed out. Check your connection and try again.";
  }
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) {
    return "Punch Logic could not reach Supabase. Check your connection, then try saving again.";
  }
  return message || fallback;
}

function renderItemForm() {
  return `
    <label><span>Site</span>${renderSiteSelect()}</label>
    <label><span>Location</span>${renderLocationSelect("", "location_area")}</label>
    <label><span>Location Detail</span><input name="location_detail" placeholder="Exact area, floor, grid, or note" /></label>
    <label><span>Crew</span><div class="field-with-action">${renderTradeSelect()}<button class="secondary-button compact-button" data-quick-add="trade" type="button"><i data-lucide="plus"></i><span>Add</span></button></div></label>
    <label><span>Item</span><div class="field-with-action">${renderItemSelect()}<button class="secondary-button compact-button" data-quick-add="item" type="button"><i data-lucide="plus"></i><span>Add</span></button></div></label>
    <label class="wide"><span>Notes</span><textarea name="notes" placeholder="Notes"></textarea></label>
    <div class="wide admin-item-photo-field">
      <span class="admin-item-photo-label">Photo</span>
      <div class="admin-item-photo-picker">
        <input class="admin-item-photo-input" id="adminItemPhotoInput" name="item_photo" type="file" accept="image/*" />
        <button class="secondary-button" id="chooseAdminItemPhotoButton" type="button"><i data-lucide="image-plus"></i><span>Choose Photo</span></button>
        <span class="admin-item-photo-name" id="adminItemPhotoName">No photo chosen</span>
      </div>
      <img class="admin-item-photo-preview hidden" id="adminItemPhotoPreview" alt="Selected item photo preview" />
    </div>
  `;
}

function renderArchiveWorkspace(rows = []) {
  const records = rows.filter((row) => row.entityType !== "Item");
  const items = rows.filter((row) => row.entityType === "Item");
  return `
    <div class="archive-workspace">
      ${records.length ? `
        <section class="archive-records-section">
          <div class="archive-section-heading">
            <h3>Archived projects and sites</h3>
            <span>${records.length}</span>
          </div>
          <div class="admin-table">
            <div class="admin-row header"><span>Name</span><span>Type</span><span>Project</span><span>Action</span></div>
            <div>${renderRows(records, "archive")}</div>
          </div>
        </section>
      ` : ""}
      ${items.length ? `
        <section class="archive-items-section">
          <div class="archive-section-heading">
            <h3>Archived items</h3>
            <span>${items.length}</span>
          </div>
          <div class="item-worklist">${renderItemCards(items, { archived: true })}</div>
        </section>
      ` : ""}
    </div>
  `;
}

function renderSettingForm() {
  return `
    <label><span>Setting type</span><select name="type"><option value="location">Location</option><option value="trade">Crew</option><option value="item">Item</option></select></label>
    <label><span>Name</span><input name="name" required placeholder="Setting name" /></label>
  `;
}

function renderSiteSelect(selectedSiteId = "", fieldName = "site_id", required = true) {
  const sites = rowsBySection.sites || [];
  return `<select name="${escapeHtml(fieldName)}"${required ? " required" : ""}><option value="">Choose site</option>${sites.map((site) => `<option value="${escapeHtml(site.id)}"${site.id === selectedSiteId ? " selected" : ""}>${escapeHtml(site.primary)}</option>`).join("")}</select>`;
}

function renderProjectSelect(selectedProjectId = "", fieldName = "project_id", markForSiteDefaults = false) {
  const projects = rowsBySection.projects || [];
  const defaultAttribute = markForSiteDefaults ? " data-project-default-foremen" : "";
  return `<select name="${escapeHtml(fieldName)}"${defaultAttribute}><option value="">No project</option>${projects.map((project) => `<option value="${escapeHtml(project.id)}"${project.id === selectedProjectId ? " selected" : ""}>${escapeHtml(project.primary)}</option>`).join("")}</select>`;
}

function renderSiteMultiSelect(selectedSiteIds = [], fieldName = "site_ids") {
  const selected = new Set(selectedSiteIds.filter(Boolean));
  const sites = rowsBySection.sites || [];
  const projects = rowsBySection.projects || [];
  if (!sites.length) {
    return `<div class="assignment-checklist empty" data-site-assignment-list><span>No sites available</span></div>`;
  }

  const renderSiteCheck = (site) => `<label class="assignment-check-option child"><input type="checkbox" name="${escapeHtml(fieldName)}" value="${escapeHtml(site.id)}" data-project-id="${escapeHtml(site.projectId || "")}"${selected.has(site.id) ? " checked" : ""} /><span>${escapeHtml(site.primary)}</span></label>`;
  const knownProjectIds = new Set(projects.map((project) => project.id));
  const unassignedSites = sites.filter((site) => !site.projectId || !knownProjectIds.has(site.projectId));

  return `
    <div class="assignment-checklist grouped" data-site-assignment-list>
      ${projects.map((project) => {
        const projectSites = sites.filter((site) => site.projectId === project.id);
        if (!projectSites.length) return "";
        return `<section class="assignment-project-group"><label class="assignment-check-option group"><input type="checkbox" data-site-project-toggle="${escapeHtml(project.id)}" /><span>${escapeHtml(project.primary)} (all sites)</span></label>${projectSites.map(renderSiteCheck).join("")}</section>`;
      }).join("")}
      ${unassignedSites.length ? `<section class="assignment-project-group"><strong>No project</strong>${unassignedSites.map(renderSiteCheck).join("")}</section>` : ""}
    </div>
  `;
}

function renderProjectMultiSelect(selectedProjectIds = [], fieldName = "project_ids") {
  const selected = new Set(selectedProjectIds.filter(Boolean));
  const projects = rowsBySection.projects || [];
  if (!projects.length) {
    return `<div class="assignment-checklist empty" data-project-assignment-list><span>No projects available</span></div>`;
  }

  return `
    <div class="assignment-checklist" data-project-assignment-list>
      ${projects.map((project) => `<label class="assignment-check-option"><input type="checkbox" name="${escapeHtml(fieldName)}" value="${escapeHtml(project.id)}" data-project-assignment="${escapeHtml(project.id)}"${selected.has(project.id) ? " checked" : ""} /><span>${escapeHtml(project.primary)}</span></label>`).join("")}
    </div>
  `;
}

function renderForemanMultiSelect(selectedIds = [], fieldName = "foreman_ids") {
  const selected = new Set(selectedIds.filter(Boolean));
  const foremen = getForemanOptions();
  if (!foremen.length) {
    return `<div class="foreman-checklist empty" data-foreman-checklist><span>No foremen available</span></div>`;
  }

  return `
    <div class="foreman-checklist" data-foreman-checklist>
      ${foremen.map((foreman) => `
        <label class="foreman-check-option">
          <input type="checkbox" name="${escapeHtml(fieldName)}" value="${escapeHtml(foreman.id)}"${selected.has(foreman.id) ? " checked" : ""} />
          <span>${escapeHtml(foreman.name)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function getForemanOptions() {
  return (rowsBySection.users || [])
    .filter((user) => user.role === "foreman" || user.secondary === "Foreman")
    .map((user) => ({ id: user.id, name: user.primary }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getProjectForemanIds(projectId) {
  return projectAccessRows
    .filter((entry) => entry.project_id === projectId)
    .map((entry) => entry.user_id)
    .filter(Boolean);
}

function renderLocationSelect(selectedLocation = "", fieldName = "location_area") {
  const locations = getLocationSettingOptions(selectedLocation);
  return `<select name="${escapeHtml(fieldName)}"><option value="">Choose location</option>${locations.map((location) => `<option value="${escapeHtml(location)}"${location === selectedLocation ? " selected" : ""}>${escapeHtml(location)}</option>`).join("")}</select>`;
}

function renderTradeSelect(selectedTrade = "") {
  const trades = getTradeSettingOptions();
  return `<select name="trade" required data-trade-select><option value="">Choose crew</option>${trades.map((trade) => `<option value="${escapeHtml(trade)}"${trade === selectedTrade ? " selected" : ""}>${escapeHtml(trade)}</option>`).join("")}</select>`;
}

function renderItemSelect(selectedTrade = "", selectedItem = "") {
  const items = getItemSettingOptions(selectedTrade);
  const emptyLabel = selectedTrade ? "Choose item" : "Choose crew first";
  return `<select name="item" required data-item-select><option value="">${emptyLabel}</option>${items.map((item) => `<option value="${escapeHtml(item)}"${item === selectedItem ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}</select>`;
}

function getLocationSettingOptions(selectedLocation = "") {
  const locations = (rowsBySection.settings || [])
    .filter((row) => row.secondary === "Location")
    .map((row) => row.primary)
    .filter(Boolean);
  if (selectedLocation) locations.push(selectedLocation);
  return [...new Set(locations)].sort((a, b) => a.localeCompare(b));
}

function getTradeSettingOptions() {
  const trades = (rowsBySection.settings || [])
    .filter((row) => isCrewSettingType(row.secondary))
    .map((row) => row.primary)
    .filter(Boolean);
  return [...new Set(trades)].sort((a, b) => a.localeCompare(b));
}

function getItemSettingOptions(tradeName = "") {
  if (!tradeName) return [];
  const items = (rowsBySection.settings || [])
    .filter((row) => row.secondary === "Item")
    .filter((row) => !tradeName || row.tertiary === tradeName || row.tertiary === "All crews")
    .map((row) => row.primary)
    .filter(Boolean);
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function getTradeSettingId(tradeName) {
  const id = (rowsBySection.settings || []).find((row) => isCrewSettingType(row.secondary) && row.primary === tradeName)?.id || "";
  return id.startsWith("main-trade-") ? "" : id;
}

function renderCustomFieldRow(label = "", value = "") {
  return `
    <div class="custom-field-row">
      <input name="custom_field_label[]" placeholder="Field name" value="${escapeHtml(label)}" />
      <input name="custom_field_value[]" placeholder="Value" value="${escapeHtml(value)}" />
      <button class="row-action-button" data-remove-custom-field type="button">Remove</button>
    </div>
  `;
}

async function submitInlineForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const sectionName = form.dataset.formSection;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());
  values.customFields = collectCustomFields(formData);
  values.foreman_ids = formData.getAll("foreman_ids")
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "__none__");
  values.site_ids = formData.getAll("site_ids").map((value) => String(value || "").trim()).filter((value) => value && value !== "__none__" && !value.startsWith("__project__:"));
  values.project_ids = formData.getAll("project_ids").map((value) => String(value || "").trim()).filter((value) => value && value !== "__none__");
  values.document_file = formData.get("document_file");
  values.item_photo = formData.get("item_photo");

  if (sectionName === "users") await saveProfileForm(values);
  if (sectionName === "projects") await saveProjectForm(values);
  if (sectionName === "sites") await saveSiteForm(values);
  if (sectionName === "documents") await saveDocumentForm(values);
  if (sectionName === "contacts") await saveContactForm(values);
  if (sectionName === "items") await saveItemForm(values);
  if (sectionName === "settings") await saveSettingForm(values);

  if (nextSectionAfterSubmit) {
    activeSection = nextSectionAfterSubmit;
    formSection = nextSectionAfterSubmit;
    nextSectionAfterSubmit = "";
    syncActiveAdminNav();
  } else {
    activeSection = sectionName;
    formSection = "";
    syncActiveAdminNav();
  }
  document.querySelector("#adminFormSlot")?.replaceChildren();
  await refreshDashboardRows();
}

function syncActiveAdminNav() {
  document.querySelectorAll("[data-admin-section]").forEach((navButton) => {
    navButton.classList.toggle("active", navButton.dataset.adminSection === activeSection);
  });
}

function collectCustomFields(formData) {
  const labels = formData.getAll("custom_field_label[]").map((value) => String(value || "").trim());
  const values = formData.getAll("custom_field_value[]").map((value) => String(value || "").trim());
  return labels
    .map((label, index) => ({ label, value: values[index] || "" }))
    .filter((field) => field.label && field.value);
}

function collectCustomFieldsFromContainer(container) {
  const labels = Array.from(container.querySelectorAll("[name='custom_field_label[]']")).map((input) => input.value.trim());
  const values = Array.from(container.querySelectorAll("[name='custom_field_value[]']")).map((input) => input.value.trim());
  return labels
    .map((label, index) => ({ label, value: values[index] || "" }))
    .filter((field) => field.label && field.value);
}

async function handleRowAction(action, id) {
  if (action === "editUser") {
    toggleRowEdit("user", id);
    return;
  }
  if (action === "editProject") {
    toggleRowEdit("project", id);
    return;
  }
  if (action === "editSite") {
    toggleRowEdit("site", id);
    return;
  }
  if (action === "editDocument") {
    toggleRowEdit("document", id);
    return;
  }
  if (action === "editContact") {
    toggleRowEdit("contact", id);
    return;
  }
  if (action === "viewSiteItems") {
    viewItemsForSite(id);
    return;
  }
  if (action === "viewSiteDocuments") {
    documentSiteFilter = id;
    activeSection = "documents";
    syncActiveAdminNav();
    renderSection("documents");
    return;
  }
  if (action === "openDocument") {
    await openAdminDocument(id);
    return;
  }
  if (action === "deleteDocument") {
    await deleteAdminDocument(id);
    return;
  }
  if (action === "completeItem") {
    await updateById("punch_items", id, { completed: true, completed_at: new Date().toISOString() });
  }
  if (action === "assignSite") await assignSiteToUser(id);
  if (action === "deleteUser") {
    await deleteUserAccount(id);
    await refreshDashboardRows();
    return;
  }
  if (action === "archiveProject" || action === "archiveSite" || action === "unarchiveProject" || action === "unarchiveSite") {
    const archived = action.startsWith("archive");
    const table = action.endsWith("Project") ? "projects" : "sites";
    await setArchivedState(table, id, archived);
    return;
  }
  if (action === "deleteArchivedProject" || action === "deleteArchivedSite") {
    const archivedRow = (rowsBySection.archive || []).find((row) => row.id === id);
    if (!archivedRow) return;
    if (action === "deleteArchivedProject") await deleteProjectEverywhere(archivedRow.entityId);
    else await deleteSiteEverywhere(archivedRow.entityId);
    await loadDashboard({ rowsOnly: true, silent: true });
    return;
  }
  if (action === "revokeUserSessions") {
    await revokeUserSessions(id);
    await refreshDashboardRows();
    return;
  }
  if (action === "toggleUserAccess") {
    await toggleUserAccess(id);
    await refreshDashboardRows();
    return;
  }
  if (action === "deleteProject") {
    if (await deleteProjectEverywhere(id)) removeDashboardRow("projects", id);
    return;
  }
  if (action === "deleteSite") {
    if (await deleteSiteEverywhere(id)) removeDashboardRow("sites", id);
    return;
  }
  if (action === "deleteContact") {
    if (id.startsWith("main-contact-")) {
      if (deleteMainAppContact(id)) removeDashboardRow("contacts", id);
    } else {
      if (await deleteById("contacts", id)) removeDashboardRow("contacts", id);
    }
    return;
  }
  if (action.startsWith("deleteSetting:")) {
    await deleteDashboardSetting(action.split(":")[1], id);
    return;
  }
  await refreshDashboardRows();
}

function viewItemsForSite(siteId) {
  const site = (rowsBySection.sites || []).find((candidate) => candidate.id === siteId);
  itemViewState = {
    ...defaultItemViewState,
    site: site?.name || "",
    siteId
  };
  activeSection = "items";
  syncActiveAdminNav();
  renderSection("items");
}

function toggleRowEdit(type, id, forceOpen) {
  const panel = adminPanel.querySelector(`[data-${type}-edit="${cssEscape(id)}"]`);
  if (!panel) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !shouldOpen);
  if (type === "project" || type === "site" || type === "contact") {
    const card = panel.closest("[data-row-card]");
    card?.querySelectorAll(`[data-${type}-display]`).forEach((element) => {
      element.classList.toggle("hidden", shouldOpen);
    });
    if (shouldOpen) {
      panel.querySelector(type === "contact" ? "[name='contact_name']" : "[name='name']")?.focus();
    }
  }
}

async function saveUserEdit(id) {
  const panel = adminPanel.querySelector(`[data-user-edit="${cssEscape(id)}"]`);
  if (!panel) return;
  const displayName = panel.querySelector("[name='display_name']")?.value.trim() || "";
  const email = panel.querySelector("[name='email']")?.value.trim() || "";
  const role = panel.querySelector("[name='role']")?.value || "foreman";
  const password = panel.querySelector("[name='password']")?.value || "";

  if (!displayName) {
    alert("Enter a display name.");
    return;
  }
  if (!email || !email.includes("@")) {
    alert("Enter a valid email.");
    return;
  }
  if (password && password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  const result = await manageUserAccount("PUT", {
    id,
    display_name: displayName,
    email,
    role,
    password,
    site_ids: getSelectedValues(panel, "site_ids"),
    project_ids: getSelectedValues(panel, "project_ids")
  });
  if (!result) return;
  addRecentChange("User updated", displayName, "users");
  await refreshDashboardRows();
}

async function saveProjectEdit(id) {
  const panel = adminPanel.querySelector(`[data-project-edit="${cssEscape(id)}"]`);
  const card = panel?.closest("[data-row-card]");
  const row = (rowsBySection.projects || []).find((project) => project.id === id);
  if (!panel || !card || !row) return;
  const name = panel.querySelector("[name='name']")?.value.trim() || "";
  if (!name) {
    alert("Enter a project name.");
    return;
  }

  const foremanIds = getSelectedForemanIds(panel);
  const assignmentsChanged = !sameIdSet(foremanIds, row.foremanIds || []);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    await updateById("projects", id, { name }, controller.signal);
    if (assignmentsChanged) await syncProjectForemen(id, foremanIds, controller.signal);
  } finally {
    window.clearTimeout(timeout);
  }

  const oldName = row.primary;
  const profileNames = new Map((rowsBySection.users || []).map((profile) => [profile.id, profile.primary]));
  const foremanNames = foremanIds.map((foremanId) => profileNames.get(foremanId)).filter(Boolean);
  Object.assign(row, {
    primary: name,
    tertiary: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned",
    foremanIds
  });
  row.search = getSearchText(row);

  if (assignmentsChanged) {
    projectAccessRows = [
      ...projectAccessRows.filter((entry) => entry.project_id !== id),
      ...foremanIds.map((userId) => ({ project_id: id, user_id: userId }))
    ];
  }
  updateProjectNameInDashboardState(id, oldName, name);
  updateMainAppProjectName(id, oldName, name);
  addRecentChange("Project updated", name, "projects");
  replaceDashboardRowCard(card, row, "projects");
}

function sameIdSet(left = [], right = []) {
  const leftSet = new Set(left.filter(Boolean));
  const rightSet = new Set(right.filter(Boolean));
  return leftSet.size === rightSet.size && [...leftSet].every((value) => rightSet.has(value));
}

function updateProjectNameInDashboardState(projectId, oldName, nextName) {
  (rowsBySection.sites || []).forEach((site) => {
    if (site.projectId !== projectId) return;
    site.secondary = nextName;
    (site.details || []).forEach((detail) => {
      if (detail.label === "Project") detail.value = nextName;
    });
    site.search = getSearchText(site);
  });
  ["items", "completedItems"].forEach((sectionName) => {
    (rowsBySection[sectionName] || []).forEach((item) => {
      if (item.projectId !== projectId && item.project !== oldName) return;
      item.project = nextName;
      item.search = getSearchText(item);
    });
  });
  (rowsBySection.documents || []).forEach((documentRow) => {
    if (documentRow.projectId !== projectId && documentRow.project !== oldName) return;
    documentRow.project = nextName;
    documentRow.search = getSearchText(documentRow);
  });
}

async function saveSiteEdit(id) {
  const panel = adminPanel.querySelector(`[data-site-edit="${cssEscape(id)}"]`);
  if (!panel) return;
  const card = panel.closest("[data-row-card]");
  const row = (rowsBySection.sites || []).find((candidate) => candidate.id === id);
  const name = panel.querySelector("[name='name']")?.value.trim() || "";
  if (!name) {
    alert("Enter a site name.");
    return;
  }

  const projectId = panel.querySelector("[name='project_id']")?.value || "";
  const fields = [
    { label: "Address", value: panel.querySelector("[name='address']")?.value.trim() || "" },
    { label: "Permit", value: panel.querySelector("[name='permit']")?.value.trim() || "" },
    ...collectCustomFieldsFromContainer(panel)
  ].filter((field) => field.label && field.value);

  await updateById("sites", id, { name, project_id: projectId || null, fields });
  const foremanIds = getSelectedForemanIds(panel);
  await syncSiteForemen(id, foremanIds);
  addRecentChange("Site updated", name, "sites");
  if (!row || !card) return;

  const projectName = (rowsBySection.projects || []).find((project) => project.id === projectId)?.primary || "No project";
  const profileNames = new Map((rowsBySection.users || []).map((profile) => [profile.id, profile.primary]));
  const foremanNames = foremanIds.map((foremanId) => profileNames.get(foremanId)).filter(Boolean);
  const address = fields.find((field) => field.label === "Address")?.value || "";
  const permit = fields.find((field) => field.label === "Permit")?.value || "";
  const documentCount = getDetailValue(row.details, "Documents") || "0";
  const customFields = fields.filter((field) => !["Address", "Permit"].includes(field.label));

  Object.assign(row, {
    name,
    primary: formatSiteLabel(name, address),
    secondary: projectName,
    tertiary: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned",
    projectId,
    foremanIds,
    details: [
      { label: "Project", value: projectName },
      { label: "User", value: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned" },
      { label: "Address", value: address },
      { label: "Name", value: name },
      { label: "Permit", value: permit },
      { label: "Documents", value: documentCount },
      ...customFields
    ].filter((detail) => detail.label && detail.value)
  });
  row.search = getSearchText(row);
  replaceSiteRowCard(card, row);
}

function replaceSiteRowCard(card, row) {
  replaceDashboardRowCard(card, row, "sites");
}

function replaceDashboardRowCard(card, row, sectionName) {
  const previousTop = card.getBoundingClientRect().top;
  card.insertAdjacentHTML("afterend", renderRows([row], sectionName));
  const nextCard = card.nextElementSibling;
  card.remove();
  if (!nextCard) return;
  bindRowActions(nextCard);
  renderIcons();
  const positionChange = nextCard.getBoundingClientRect().top - previousTop;
  if (Math.abs(positionChange) > 1) window.scrollBy(0, positionChange);
}

async function saveDocumentEdit(id) {
  const panel = adminPanel.querySelector(`[data-document-edit="${cssEscape(id)}"]`);
  const row = (rowsBySection.documents || []).find((documentRow) => documentRow.id === id);
  if (!panel || !row) return;

  const title = panel.querySelector("[name='title']")?.value.trim() || "";
  const nextSiteId = panel.querySelector("[name='site_id']")?.value || "";
  const documentType = panel.querySelector("[name='category']")?.value.trim() || "";
  if (!title || !documentType || !nextSiteId) {
    alert("Enter a document name and document type, then choose a site.");
    return;
  }

  let storagePath = row.storagePath;
  let movedFrom = "";
  if (nextSiteId !== row.siteId) {
    movedFrom = storagePath;
    storagePath = `${requireActiveOrganizationId()}/${nextSiteId}/${storagePath.split("/").pop()}`;
    const move = await fieldDriveSupabase.storage.from(siteDocumentBucket).move(movedFrom, storagePath);
    if (move.error) throwError(move.error);
  }

  try {
    await updateById("site_documents", id, {
      site_id: nextSiteId,
      title,
      category: documentType,
      description: panel.querySelector("[name='description']")?.value.trim() || null,
      document_date: panel.querySelector("[name='document_date']")?.value || null,
      quick_access: Boolean(panel.querySelector("[name='quick_access']")?.checked),
      storage_path: storagePath,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    if (movedFrom) await fieldDriveSupabase.storage.from(siteDocumentBucket).move(storagePath, movedFrom);
    throw error;
  }

  addRecentChange("Document updated", title, "documents");
  await refreshDashboardRows();
}

async function saveContactEdit(id) {
  const panel = adminPanel.querySelector(`[data-contact-edit="${cssEscape(id)}"]`);
  if (!panel) return;
  const contactName = panel.querySelector("[name='contact_name']")?.value.trim() || "";
  if (!contactName) {
    alert("Enter a contact name.");
    return;
  }

  const values = {
    contact_name: contactName,
    trade: "",
    vendor: panel.querySelector("[name='vendor']")?.value.trim() || "",
    job_desc: panel.querySelector("[name='job_desc']")?.value.trim() || "",
    email: panel.querySelector("[name='email']")?.value.trim() || "",
    phone: panel.querySelector("[name='phone']")?.value.trim() || "",
    alternate_contact: panel.querySelector("[name='alternate_contact']")?.value.trim() || "",
    fields: collectCustomFieldsFromContainer(panel)
  };

  if (id.startsWith("main-contact-")) {
    updateMainAppContact(id, values);
    addRecentChange("Contact updated", contactName, "contacts");
    updateContactRowInPlace(id, values, panel);
    return;
  }

  await updateContactRow(id, {
    ...values,
    updated_at: new Date().toISOString()
  });
  addRecentChange("Contact updated", contactName, "contacts");
  updateContactRowInPlace(id, values, panel);
}

function updateContactRowInPlace(id, values, panel) {
  const row = (rowsBySection.contacts || []).find((contact) => contact.id === id);
  const card = panel.closest("[data-row-card]");
  if (!row || !card) return;
  const fields = values.fields || [];
  Object.assign(row, {
    primary: values.contact_name || "Unnamed contact",
    secondary: values.vendor || "No company",
    tertiary: values.job_desc || values.phone || "No job desc",
    contactName: values.contact_name || "",
    vendor: values.vendor || "",
    jobDesc: values.job_desc || "",
    email: values.email || "",
    phone: values.phone || "",
    alternateContact: values.alternate_contact || "",
    fields,
    details: [
      { label: "Name", value: values.contact_name || "" },
      { label: "Company", value: values.vendor || "" },
      { label: "Job Desc", value: values.job_desc || "" },
      { label: "Email", value: values.email || "" },
      { label: "Phone", value: values.phone || "" },
      { label: "Alternative contact", value: values.alternate_contact || "" },
      ...fields
    ].filter((detail) => detail.label && detail.value)
  });
  row.search = getSearchText(row);
  replaceDashboardRowCard(card, row, "contacts");
}

function getSelectedForemanIds(container) {
  return [...new Set(Array.from(container.querySelectorAll("[data-foreman-checklist] input[type='checkbox']:checked"))
    .map((input) => input.value)
    .filter(Boolean))];
}

function bindForemanSelects(root) {
  root.querySelectorAll("[data-foreman-checklist]").forEach((list) => {
    if (list.dataset.foremanBound === "true") return;
    list.dataset.foremanBound = "true";
  });
}

function bindNoAssignmentSelects(root) {
  root.querySelectorAll("[data-no-assignment-select]").forEach((select) => {
    if (select.dataset.noAssignmentBound === "true") return;
    select.dataset.noAssignmentBound = "true";
    select.dataset.previousAssignments = JSON.stringify(Array.from(select.selectedOptions).map((option) => option.value));
    select.addEventListener("change", () => {
      const previous = new Set(JSON.parse(select.dataset.previousAssignments || "[]"));
      const selected = new Set(Array.from(select.selectedOptions).map((option) => option.value));
      const noneOption = select.querySelector("option[value='__none__']");
      if (selected.has("__none__") && selected.size > 1) {
        if (!previous.has("__none__")) {
          Array.from(select.options).forEach((option) => {
            option.selected = option.value === "__none__";
          });
        } else {
          noneOption.selected = false;
        }
      } else if (!selected.size && noneOption) {
        noneOption.selected = true;
      }
      select.dataset.previousAssignments = JSON.stringify(Array.from(select.selectedOptions).map((option) => option.value));
    });
  });
}

function bindProjectSiteAssignmentControls(root) {
  const updateGroupState = (container, projectId) => {
    const group = container?.querySelector(`[data-site-project-toggle="${cssEscape(projectId)}"]`);
    const sites = Array.from(container?.querySelectorAll(`[name='site_ids'][data-project-id="${cssEscape(projectId)}"]`) || []);
    if (!group || !sites.length) return;
    group.checked = sites.every((input) => input.checked);
    group.indeterminate = !group.checked && sites.some((input) => input.checked);
  };

  root.querySelectorAll("[data-project-assignment]").forEach((projectInput) => {
    if (projectInput.dataset.assignmentBound === "true") return;
    projectInput.dataset.assignmentBound = "true";
    const container = projectInput.closest(".admin-row-edit, .admin-inline-form");
    const projectId = projectInput.dataset.projectAssignment;
    if (projectInput.checked) {
      container?.querySelectorAll(`[name='site_ids'][data-project-id="${cssEscape(projectId)}"]`).forEach((siteInput) => {
        siteInput.checked = true;
      });
    }
    projectInput.addEventListener("change", () => {
      container?.querySelectorAll(`[name='site_ids'][data-project-id="${cssEscape(projectId)}"]`).forEach((siteInput) => {
        siteInput.checked = projectInput.checked;
      });
      updateGroupState(container, projectId);
    });
  });

  root.querySelectorAll("[data-site-project-toggle]").forEach((groupInput) => {
    if (groupInput.dataset.assignmentBound === "true") return;
    groupInput.dataset.assignmentBound = "true";
    const container = groupInput.closest(".admin-row-edit, .admin-inline-form");
    const projectId = groupInput.dataset.siteProjectToggle;
    updateGroupState(container, projectId);
    groupInput.addEventListener("change", () => {
      container?.querySelectorAll(`[name='site_ids'][data-project-id="${cssEscape(projectId)}"]`).forEach((siteInput) => {
        siteInput.checked = groupInput.checked;
      });
      groupInput.indeterminate = false;
    });
  });

  root.querySelectorAll("[name='site_ids'][data-project-id]").forEach((siteInput) => {
    if (siteInput.dataset.assignmentBound === "true") return;
    siteInput.dataset.assignmentBound = "true";
    const container = siteInput.closest(".admin-row-edit, .admin-inline-form");
    siteInput.addEventListener("change", () => updateGroupState(container, siteInput.dataset.projectId));
  });
}

function getRealSelectedOptionValues(select) {
  return [...new Set(Array.from(select.selectedOptions)
    .map((option) => option.value)
    .filter((value) => value && value !== "__none__" && !value.startsWith("__project__:")))];
}

function setSitesForProjects(siteSelect, projectIds, selected) {
  const projectIdSet = new Set(projectIds.filter(Boolean));
  if (!projectIdSet.size) return;
  Array.from(siteSelect.options).forEach((option) => {
    if (option.dataset.projectId && projectIdSet.has(option.dataset.projectId)) {
      option.selected = selected;
    }
  });
}

function updateProjectSiteGroupSelections(siteSelect) {
  Array.from(siteSelect.querySelectorAll("[data-project-group]")).forEach((groupOption) => {
    const siteOptions = Array.from(siteSelect.querySelectorAll(`[data-project-id="${cssEscape(groupOption.dataset.projectGroup)}"]`));
    groupOption.selected = siteOptions.length > 0 && siteOptions.every((option) => option.selected);
  });

  const noneOption = siteSelect.querySelector("option[value='__none__']");
  const hasAssignment = Array.from(siteSelect.selectedOptions).some((option) => option.value !== "__none__");
  if (noneOption) noneOption.selected = !hasAssignment;
  siteSelect.dataset.previousSiteAssignments = JSON.stringify(Array.from(siteSelect.selectedOptions).map((option) => option.value));
}

function getSelectedValues(container, fieldName) {
  return [...new Set(Array.from(container.querySelectorAll(`[name='${fieldName}']`))
    .filter((input) => input.matches("input") ? input.checked : input.selected)
    .map((input) => input.value)
    .filter((value) => value && value !== "__none__" && !value.startsWith("__project__:")))];
}

async function syncProjectForemen(projectId, foremanIds = [], signal) {
  let deleteQuery = fieldDriveSupabase.from("project_user_access").delete().eq("project_id", projectId);
  if (signal) deleteQuery = deleteQuery.abortSignal(signal);
  const deleteResult = await deleteQuery;
  if (signal?.aborted) throw createDashboardTimeoutError();
  if (deleteResult.error) throwProjectAccessError(deleteResult.error);
  if (!foremanIds.length) return;

  const rows = foremanIds.map((userId) => ({ project_id: projectId, user_id: userId }));
  let upsertQuery = fieldDriveSupabase.from("project_user_access").upsert(rows);
  if (signal) upsertQuery = upsertQuery.abortSignal(signal);
  const { error } = await upsertQuery;
  if (signal?.aborted) throw createDashboardTimeoutError();
  if (error) throwProjectAccessError(error);
}

function createDashboardTimeoutError() {
  const error = new Error("The request timed out.");
  error.name = "AbortError";
  return error;
}

async function syncSiteForemen(siteId, foremanIds = []) {
  const { error: deleteError } = await fieldDriveSupabase.from("user_site_access").delete().eq("site_id", siteId);
  if (deleteError) throwError(deleteError);
  if (!foremanIds.length) return;

  const rows = foremanIds.map((userId) => ({ site_id: siteId, user_id: userId }));
  const { error } = await fieldDriveSupabase.from("user_site_access").upsert(rows);
  if (error) throwError(error);
}

function throwProjectAccessError(error) {
  if (["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code)) {
    throwError({ message: "Project foreman assignments need the new database table before they can save." });
    return;
  }
  throwError(error);
}

async function saveItemCard(id) {
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  if (!card) return;
  const values = getItemCardValues(card);
  const notificationOptions = getItemChangeNotificationOptions(id);

  if (card.dataset.itemSource === "Main app") {
    updateMainAppItem(id, values);
    addRecentChange("Open item updated", values.item, "items", notificationOptions);
    await refreshDashboardRows();
    return;
  }

  await updateById("punch_items", id, {
    site_id: values.site_id,
    location: values.location,
    location_area: values.location_area,
    location_detail: values.location_detail,
    trade: values.trade,
    item: values.item
  });
  await updateItemSiteProject(values.site_id, values.project_id);
  addRecentChange("Open item updated", values.item, "items", notificationOptions);
  await refreshDashboardRows();
}

async function completeItemCard(id) {
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  const itemRow = (rowsBySection.items || []).find((row) => row.id === id);
  const notificationOptions = getItemChangeNotificationOptions(id, itemRow);
  if (card?.dataset.itemSource === "Main app") {
    updateMainAppItem(id, { completed: true, completedAt: new Date().toISOString() });
    addRecentChange("Open item completed", itemRow?.item || "Main app item", "completedItems", notificationOptions);
    moveDashboardItemRow(id, "items", "completedItems", { completed: true, completedAt: new Date().toISOString() });
    return;
  }

  const completedAt = new Date().toISOString();
  await updateById("punch_items", id, { completed: true, completed_at: completedAt });
  updateMainAppItem(id, { completed: true, completedAt });
  addRecentChange("Open item completed", itemRow?.item || "Item closed", "completedItems", notificationOptions);
  moveDashboardItemRow(id, "items", "completedItems", { completed: true, completedAt });
}

async function uncompleteItemCard(id) {
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  const itemRow = (rowsBySection.completedItems || []).find((row) => row.id === id);
  const notificationOptions = getItemChangeNotificationOptions(id, itemRow);
  if (card?.dataset.itemSource === "Main app") {
    updateMainAppItem(id, { completed: false, completedAt: "" });
    addRecentChange("Completed item reopened", itemRow?.item || "Main app item", "items", notificationOptions);
    moveDashboardItemRow(id, "completedItems", "items", { completed: false, completedAt: "" });
    return;
  }

  await updateById("punch_items", id, { completed: false, completed_at: null });
  updateMainAppItem(id, { completed: false, completedAt: "" });
  addRecentChange("Completed item reopened", itemRow?.item || "Item reopened", "items", notificationOptions);
  moveDashboardItemRow(id, "completedItems", "items", { completed: false, completedAt: "" });
}

async function saveItemSharedNote(id, button) {
  if (button?.dataset.busy === "true") return;
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  if (!card) return;
  const sharedNote = card.querySelector("[data-item-shared-note]")?.value.trim() || "";
  const status = card.querySelector("[data-item-notes-status]");
  const row = ["items", "completedItems", "archive"]
    .flatMap((sectionName) => rowsBySection[sectionName] || [])
    .find((candidate) => candidate.id === id);
  const sharedNoteUpdatedAt = new Date().toISOString();

  if (button) {
    button.dataset.busy = "true";
    setDashboardButtonBusy(button, true, "Saving...");
  }
  if (status) status.textContent = "Saving...";

  try {
    if (card.dataset.itemSource === "Main app") {
      updateMainAppItem(id, {
        shared_note: sharedNote,
        shared_note_updated_at: sharedNoteUpdatedAt
      });
    } else {
      try {
        await updateById("punch_items", id, {
          shared_note: sharedNote,
          shared_note_updated_at: sharedNoteUpdatedAt,
          shared_note_source: "admin_dashboard"
        });
      } catch (error) {
        if (!["42703", "PGRST204"].includes(error.code)) throw error;
        await updateById("punch_items", id, { shared_note: sharedNote });
      }
      updateMainAppItem(id, {
        shared_note: sharedNote,
        shared_note_updated_at: sharedNoteUpdatedAt
      });
    }

    for (const sectionName of ["items", "completedItems", "archive"]) {
      (rowsBySection[sectionName] || []).forEach((candidate) => {
        if (candidate.id !== id) return;
        candidate.comment = sharedNote;
        candidate.search = getSearchText(candidate);
      });
    }
    delete card.dataset.notesDirty;
    addRecentChange("Shared crew note updated", row?.item || "Punch-list item", activeSection, getItemChangeNotificationOptions(id, row));
    if (status) status.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  } catch (error) {
    console.error("Shared note save failed.", error);
    if (status) status.textContent = error.message || "The shared note was not saved.";
  } finally {
    if (button) {
      button.dataset.busy = "false";
      setDashboardButtonBusy(button, false);
    }
  }
}

async function rejectCrewCompletion(id) {
  const row = (rowsBySection.items || []).find((candidate) => candidate.id === id);
  if (!row || !confirm(`Mark ${row.item || "this item"} as crew not complete?`)) return;
  if (row.source === "Main app") {
    updateMainAppItem(id, { tradeCompleted: false, tradeCompletedAt: "" });
  } else {
    await updateById("punch_items", id, { trade_completed: false, trade_completed_at: null });
    updateMainAppItem(id, { tradeCompleted: false, tradeCompletedAt: "" });
  }
  row.tradeCompleted = false;
  row.tradeCompletedAt = "";
  addRecentChange("Crew completion rejected", row.item || "Item", "items", getItemChangeNotificationOptions(id, row));
  renderFilteredRows("items", document.querySelector("#adminSearchInput")?.value || "");
}

function getItemChangeNotificationOptions(id, row = null) {
  const item = row
    || (rowsBySection.items || []).find((candidate) => candidate.id === id)
    || (rowsBySection.completedItems || []).find((candidate) => candidate.id === id)
    || (rowsBySection.archive || []).find((candidate) => candidate.id === id);
  return {
    targetId: id,
    detail: item?.addedByName ? `Added by ${item.addedByName}` : "",
    context: `Project: ${item?.project || "No project"} | Site: ${item?.site || "Unknown site"}`
  };
}

async function deleteItemCard(id) {
  if (!confirm("Delete this item?")) return;
  const card = adminPanel.querySelector(`[data-item-card="${cssEscape(id)}"]`);
  if (card?.dataset.itemSource === "Main app") {
    deleteMainAppItem(id);
    addRecentChange("Open item deleted", "Main app item", "items");
    removeDashboardRow(activeSection, id);
    return;
  }

  const { error } = await fieldDriveSupabase.from("punch_items").delete().eq("id", id).eq("organization_id", requireActiveOrganizationId());
  if (error) throwError(error);
  addRecentChange("Open item deleted", "Item removed", "items");
  removeDashboardRow(activeSection, id);
}

async function setArchivedState(table, rowId, archived) {
  const archiveRow = (rowsBySection.archive || []).find((row) => row.id === rowId);
  const id = archiveRow?.entityId || rowId;
  if (!archived && table === "sites" && archiveRow?.projectId && (rowsBySection.archive || []).some((row) => row.entityType === "Project" && row.entityId === archiveRow.projectId)) {
    alert("Restore the parent project before restoring this site.");
    return;
  }
  const label = archiveRow?.primary
    || (table === "projects" ? rowsBySection.projects : rowsBySection.sites).find((row) => row.id === id)?.primary
    || (table === "projects" ? "this project" : "this site");
  const verb = archived ? "Archive" : "Restore";
  if (!confirm(`${verb} ${label}? ${archived ? "It will be hidden from active Field App and dashboard work views." : "It will return to active work views."}`)) return;
  await updateById(table, id, { archived_at: archived ? new Date().toISOString() : null });
  addRecentChange(archived ? `${table === "projects" ? "Project" : "Site"} archived` : `${table === "projects" ? "Project" : "Site"} restored`, label, "archive");
  await loadDashboard({ rowsOnly: true, silent: true });
}

async function deleteProjectEverywhere(id) {
  const activeProject = (rowsBySection.projects || []).find((row) => row.id === id);
  const archivedProject = (rowsBySection.archive || []).find((row) => row.entityType === "Project" && row.entityId === id);
  const name = activeProject?.primary || archivedProject?.primary || "this project";
  const organizationId = requireActiveOrganizationId();
  const { data: projectSites, error: siteLookupError } = await fieldDriveSupabase
    .from("sites")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("project_id", id);
  if (siteLookupError) throwError(siteLookupError);
  const siteIds = (projectSites || []).map((site) => site.id).filter(Boolean);
  let itemCount = 0;
  if (siteIds.length) {
    const { count, error: itemCountError } = await fieldDriveSupabase
      .from("punch_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("site_id", siteIds);
    if (itemCountError) throwError(itemCountError);
    itemCount = count || 0;
  }
  const warning = `This will permanently delete ${name}, ${siteIds.length} ${siteIds.length === 1 ? "site" : "sites"}, and ${itemCount} punch ${itemCount === 1 ? "item" : "items"}. This cannot be undone.`;
  if (!confirm(warning)) return false;
  if (prompt(`Type DELETE to permanently delete ${name}.`) !== "DELETE") {
    alert("Project deletion cancelled.");
    return false;
  }

  if (siteIds.length) {
    await deleteSiteDocumentsForSites(siteIds);
    await deleteSupabaseItemsForSites(siteIds);
    await deleteSupabaseAccessForSites(siteIds);
    await deleteSupabaseSites(siteIds);
  }

  await deleteSupabaseProjectAccess(id);
  await deleteByIdWithoutConfirm("projects", id);
  deleteMainAppProject(id, name);
  addRecentChange("Project deleted", name, "projects");
  return true;
}

async function deleteSiteEverywhere(id) {
  const site = (rowsBySection.sites || []).find((row) => row.id === id);
  const archivedSite = (rowsBySection.archive || []).find((row) => row.entityType === "Site" && row.entityId === id);
  const name = site?.name || site?.primary || archivedSite?.primary || "this site";
  if (!confirm(`Delete ${name} and its items?`)) return false;

  await deleteSiteDocumentsForSites([id]);
  await deleteSupabaseItemsForSites([id]);
  await deleteSupabaseAccessForSites([id]);
  await deleteByIdWithoutConfirm("sites", id);
  deleteMainAppSite(id, name);
  addRecentChange("Site deleted", name, "sites");
  return true;
}

function removeDashboardRow(sectionName, id) {
  let removedSiteIds = [];
  if (sectionName === "sites") {
    removedSiteIds = [id];
    selectedSiteIds.delete(id);
  } else if (sectionName === "projects") {
    removedSiteIds = (rowsBySection.sites || [])
      .filter((site) => site.projectId === id)
      .map((site) => site.id)
      .filter(Boolean);
    rowsBySection.sites = (rowsBySection.sites || []).filter((site) => site.projectId !== id);
    removedSiteIds.forEach((siteId) => selectedSiteIds.delete(siteId));
  }
  rowsBySection[sectionName] = (rowsBySection[sectionName] || []).filter((row) => row.id !== id);
  if (sectionName === "archive") {
    renderFilteredRows("archive", document.querySelector("#adminSearchInput")?.value || "");
    updateMetrics();
    return;
  }
  if (removedSiteIds.length) {
    const removedSet = new Set(removedSiteIds);
    rowsBySection.documents = (rowsBySection.documents || []).filter((row) => !removedSet.has(row.siteId));
    rowsBySection.items = (rowsBySection.items || []).filter((row) => !removedSet.has(row.siteId));
    rowsBySection.completedItems = (rowsBySection.completedItems || []).filter((row) => !removedSet.has(row.siteId));
  }

  const cardSelector = isItemSection(sectionName)
    ? `[data-item-card="${cssEscape(id)}"]`
    : `[data-row-card="${cssEscape(id)}"]`;
  adminPanel.querySelector(cardSelector)?.remove();

  const remainingRows = getVisibleRows(
    sectionName,
    rowsBySection[sectionName] || [],
    document.querySelector("#adminSearchInput")?.value || ""
  );
  document.querySelector("#adminEmptyState")?.classList.toggle("hidden", remainingRows.length > 0);
  if (sectionName === "sites") updateSiteBulkToolbar("sites", remainingRows);
  updateMetrics();
}

function moveDashboardItemRow(id, fromSection, toSection, patch = {}) {
  const row = (rowsBySection[fromSection] || []).find((candidate) => candidate.id === id);
  if (row) {
    Object.assign(row, patch);
    rowsBySection[toSection] = [
      row,
      ...(rowsBySection[toSection] || []).filter((candidate) => candidate.id !== id)
    ];
  }
  removeDashboardRow(fromSection, id);
}

async function deleteSelectedSites() {
  const selectedSites = (rowsBySection.sites || []).filter((site) => selectedSiteIds.has(site.id));
  if (!selectedSites.length) return;

  const names = selectedSites.map((site) => site.name || site.primary || "Unnamed site");
  const preview = names.slice(0, 8).map((name) => `- ${name}`).join("\n");
  const remainder = names.length > 8 ? `\n- and ${names.length - 8} more` : "";
  const confirmed = confirm(`Delete ${selectedSites.length} selected ${selectedSites.length === 1 ? "site" : "sites"} and all associated items?\n\n${preview}${remainder}`);
  if (!confirmed) return;

  if (selectedSites.length >= 10 && prompt(`Type DELETE to permanently remove ${selectedSites.length} sites.`) !== "DELETE") {
    alert("Bulk delete cancelled.");
    return;
  }

  const ids = selectedSites.map((site) => site.id).filter(Boolean);
  try {
    await deleteSiteDocumentsForSites(ids);
    await deleteSupabaseItemsForSites(ids);
    await deleteSupabaseAccessForSites(ids);
    await deleteSupabaseSites(ids);
    deleteMainAppSites(ids);
    selectedSiteIds.clear();
    addRecentChange("Sites deleted", `${selectedSites.length} sites removed`, "sites");
    ids.forEach((id) => removeDashboardRow("sites", id));
  } catch (error) {
    alert(error.message || "The selected sites could not be deleted. Refresh and try again.");
  }
}

async function deleteSupabaseItemsForSites(siteIds = []) {
  const ids = [...new Set(siteIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await fieldDriveSupabase
    .from("punch_items")
    .delete()
    .eq("organization_id", requireActiveOrganizationId())
    .in("site_id", ids);
  if (error) throwError(error);
}

async function deleteSiteDocumentsForSites(siteIds = []) {
  const ids = [...new Set(siteIds.filter(Boolean))];
  if (!ids.length) return;
  const organizationId = requireActiveOrganizationId();
  const { data, error } = await fieldDriveSupabase
    .from("site_documents")
    .select("id, storage_path")
    .eq("organization_id", organizationId)
    .in("site_id", ids);
  if (error && !["42P01", "PGRST205"].includes(error.code)) throwError(error);
  const paths = (data || []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length) {
    const storageDelete = await fieldDriveSupabase.storage.from(siteDocumentBucket).remove(paths);
    if (storageDelete.error) throwError(storageDelete.error);
  }
  if (data?.length) {
    const { error: deleteError } = await fieldDriveSupabase
      .from("site_documents")
      .delete()
      .eq("organization_id", organizationId)
      .in("site_id", ids);
    if (deleteError) throwError(deleteError);
  }
}

async function deleteSupabaseSites(siteIds = []) {
  const ids = [...new Set(siteIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await fieldDriveSupabase
    .from("sites")
    .delete()
    .eq("organization_id", requireActiveOrganizationId())
    .in("id", ids);
  if (error) throwError(error);
}

async function deleteSupabaseAccessForSites(siteIds = []) {
  const ids = [...new Set(siteIds.filter(Boolean))];
  if (!ids.length) return;
  const { error } = await fieldDriveSupabase.from("user_site_access").delete().in("site_id", ids);
  if (error) throwError(error);
}

async function deleteSupabaseProjectAccess(projectId) {
  if (!projectId) return;
  const { error } = await fieldDriveSupabase.from("project_user_access").delete().eq("project_id", projectId);
  if (error) throwProjectAccessError(error);
}

function getItemCardValues(card) {
  const locationArea = card.querySelector("[name='location_area']")?.value.trim() || "";
  const locationDetail = card.querySelector("[name='location_detail']")?.value.trim() || "";
  return {
    project_id: card.querySelector("[name='project_id']")?.value || "",
    site_id: card.querySelector("[name='site_id']")?.value || "",
    location: [locationArea, locationDetail].filter(Boolean).join(" - "),
    location_area: locationArea,
    location_detail: locationDetail,
    trade: card.querySelector("[name='trade']")?.value.trim() || "",
    item: card.querySelector("[name='item']")?.value.trim() || ""
  };
}

async function updateItemSiteProject(siteId, projectId) {
  if (!siteId) return;
  try {
    await updateById("sites", siteId, { project_id: projectId || null });
  } catch (error) {
    if (!["42703", "PGRST204"].includes(error.code)) throw error;
  }
}

async function assignSiteToUser(userId) {
  const sites = rowsBySection.sites || [];
  if (!sites.length) {
    alert("Add a site first.");
    return;
  }

  const siteName = prompt(`Assign which site?\n${sites.map((site) => site.primary).join("\n")}`);
  const site = sites.find((candidate) => candidate.primary.toLowerCase() === String(siteName || "").trim().toLowerCase());
  if (!site) return;

  const { error } = await fieldDriveSupabase
    .from("user_site_access")
    .upsert({ user_id: userId, site_id: site.id });
  if (error) throwError(error);
}

async function manageUserAccount(method, body) {
  let response;
  try {
    response = await fetch("/.netlify/functions/manage-users", {
      method,
      credentials: "same-origin",
      headers: await getFunctionHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throwError({ message: "The manage-users function could not be reached. Redeploy Netlify, then try again." });
    return null;
  }

  const rawResult = await response.text();
  let result = {};
  try {
    result = rawResult ? JSON.parse(rawResult) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    throwError({ message: result.error || rawResult.slice(0, 180) || "User could not be updated." });
    return null;
  }
  return result;
}

async function deleteUserAccount(id) {
  const row = (rowsBySection.users || []).find((user) => user.id === id);
  if (!confirm(`Delete ${row?.primary || "this user"}?`)) return;
  const result = await manageUserAccount("DELETE", { id });
  if (!result) return;
  addRecentChange("User deleted", row?.primary || "User", "users");
}

async function revokeUserSessions(id) {
  const row = (rowsBySection.users || []).find((user) => user.id === id);
  if (!confirm(`Sign ${row?.primary || "this user"} out on every device?`)) return;
  const result = await manageUserAccount("POST", { id, action: "revokeSessions" });
  if (!result) return;
  addRecentChange("Sessions revoked", row?.primary || "User", "users");
}

async function toggleUserAccess(id) {
  const row = (rowsBySection.users || []).find((user) => user.id === id);
  const nextActive = row?.isActive === false;
  if (!confirm(`${nextActive ? "Resume" : "Pause"} access for ${row?.primary || "this user"}?`)) return;
  const result = await manageUserAccount("POST", { id, action: "setActive", is_active: nextActive });
  if (!result) return;
  addRecentChange(nextActive ? "User resumed" : "User paused", row?.primary || "User", "users");
}

async function saveProfileForm(values) {
  let response;
  try {
    response = await fetch("/.netlify/functions/create-user", {
      method: "POST",
      credentials: "same-origin",
      headers: await getFunctionHeaders(),
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        display_name: values.display_name,
        role: values.role,
        site_ids: values.site_ids || [],
        project_ids: values.project_ids || []
      })
    });
  } catch {
    throwError({ message: "The create-user function could not be reached. Make sure this is running on the deployed Netlify site, not opened as a local file." });
  }

  const rawResult = await response.text();
  let result = {};
  try {
    result = rawResult ? JSON.parse(rawResult) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    const fallback = response.status === 404
      ? "The create-user Netlify function was not found. Commit netlify/functions/create-user.js and trigger a fresh deploy."
      : rawResult.slice(0, 180) || "User could not be created.";
    throwError({ message: result.error || fallback });
  }
  addRecentChange("User added", values.display_name.trim(), "users");
}

async function saveProjectForm(values) {
  const project = await createAdminProject(values.name);
  if (values.foreman_ids?.length) await syncProjectForemen(project.id, values.foreman_ids);
  addRecentChange("Project added", values.name.trim(), "projects");
}

async function saveSiteForm(values) {
  const fields = [
    { label: "Address", value: String(values.address || "").trim() },
    { label: "Permit", value: String(values.permit || "").trim() },
    ...(values.customFields || [])
  ].filter((field) => field.label && field.value);

  const row = {
    organization_id: requireActiveOrganizationId(),
    name: values.name.trim(),
    fields
  };
  if (values.project_id) row.project_id = values.project_id;
  try {
    const site = await createAdminSite(row);
    const foremanIds = values.foreman_ids || [];
    if (foremanIds.length) await syncSiteForemen(site.id, foremanIds);
  } catch (error) {
    if (!["42703", "PGRST204"].includes(error.code)) throw error;
    delete row.project_id;
    const site = await insertRowReturning("sites", row);
    if (values.foreman_ids?.length) await syncSiteForemen(site.id, values.foreman_ids);
  }
  addRecentChange("Site added", values.name.trim(), "sites");
}

async function saveDocumentForm(values) {
  const file = values.document_file;
  const title = String(values.title || "").trim();
  const siteId = String(values.site_id || "").trim();
  const documentType = String(values.category || "").trim();
  if (!file?.name || !title || !documentType || !siteId) {
    alert("Choose a file, enter a document name and document type, then select a site.");
    throw new Error("Document information is incomplete.");
  }

  const verifiedFile = uploadSecurity
    ? await uploadSecurity.validateDocument(file)
    : { contentType: getAdminDocumentContentType(file), safeName: file.name };
  const contentType = verifiedFile.contentType;
  if (!allowedSiteDocumentTypes.has(contentType) || file.size > maxSiteDocumentBytes) throw new Error("Unsupported document type or size.");

  const organizationId = requireActiveOrganizationId();
  const storagePath = `${organizationId}/${siteId}/${createAdminId()}-${sanitizeAdminDocumentFileName(verifiedFile.safeName)}`;
  const upload = await fieldDriveSupabase.storage.from(siteDocumentBucket).upload(storagePath, file, { contentType, upsert: false });
  if (upload.error) throwError(upload.error);

  const { error } = await fieldDriveSupabase.from("site_documents").insert({
    organization_id: organizationId,
    site_id: siteId,
    title,
    category: documentType,
    description: String(values.description || "").trim() || null,
    document_date: values.document_date || null,
    quick_access: values.quick_access === "on",
    storage_path: storagePath,
    file_name: verifiedFile.safeName,
    content_type: contentType,
    size_bytes: file.size,
    uploaded_by: currentProfile.id
  });

  if (error) {
    await fieldDriveSupabase.storage.from(siteDocumentBucket).remove([storagePath]);
    throwError(error);
  }
  documentSiteFilter = siteId;
  addRecentChange("Document added", title, "documents");
}

async function openAdminDocument(id) {
  const row = (rowsBySection.documents || []).find((documentRow) => documentRow.id === id);
  if (!row?.storagePath) return;
  const viewer = window.open("about:blank", "_blank");
  if (viewer) viewer.opener = null;
  const { data, error } = await fieldDriveSupabase.storage.from(siteDocumentBucket).download(row.storagePath);
  if (error) {
    if (viewer) viewer.close();
    throwError(error);
  }
  const documentUrl = URL.createObjectURL(data);
  if (viewer) viewer.location.replace(documentUrl);
  else window.location.href = documentUrl;
  setTimeout(() => URL.revokeObjectURL(documentUrl), 300000);
}

async function deleteAdminDocument(id) {
  const row = (rowsBySection.documents || []).find((documentRow) => documentRow.id === id);
  if (!row || !confirm(`Delete ${row.primary}?`)) return;
  await deleteByIdWithoutConfirm("site_documents", id);
  const storageDelete = await fieldDriveSupabase.storage.from(siteDocumentBucket).remove([row.storagePath]);
  if (storageDelete.error) console.warn("Document file cleanup failed.", storageDelete.error);
  addRecentChange("Document deleted", row.primary, "documents");
  removeDashboardRow("documents", id);
}

function getAdminDocumentContentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type) return type;
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" })[extension] || "";
}

function sanitizeAdminDocumentFileName(name) {
  return String(name || "document").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-140);
}

function createAdminId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function saveContactForm(values) {
  await insertContactRow({
    organization_id: requireActiveOrganizationId(),
    contact_name: values.contact_name.trim(),
    trade: "",
    vendor: String(values.vendor || "").trim(),
    job_desc: String(values.job_desc || "").trim(),
    email: String(values.email || "").trim(),
    phone: String(values.phone || "").trim(),
    alternate_contact: String(values.alternate_contact || "").trim(),
    fields: values.customFields || []
  });
  addRecentChange("Contact added", values.contact_name.trim(), "contacts");
}

async function saveItemForm(values) {
  const organizationId = requireActiveOrganizationId();
  const locationArea = String(values.location_area || "").trim();
  const locationDetail = String(values.location_detail || "").trim();
  const item = await insertRowReturning("punch_items", {
    organization_id: organizationId,
    site_id: values.site_id,
    location: [locationArea, locationDetail].filter(Boolean).join(" - "),
    location_area: locationArea,
    location_detail: locationDetail,
    trade: values.trade.trim(),
    item: values.item.trim(),
    notes: String(values.notes || "").trim(),
    completed: false,
    created_by: currentProfile.id
  });

  try {
    if (values.item_photo?.name) await saveAdminItemPhoto(item.id, values.item_photo, organizationId);
  } catch (error) {
    await fieldDriveSupabase
      .from("punch_items")
      .delete()
      .eq("id", item.id)
      .eq("organization_id", organizationId);
    throw error;
  }

  const site = (rowsBySection.sites || []).find((row) => row.id === values.site_id);
  addRecentChange("Item added", [values.trade, values.item].filter(Boolean).join(" - "), "items", {
    id: `items-${item.id}`,
    targetId: item.id,
    detail: `Added by ${currentProfile.display_name || currentProfile.email || "Unknown user"}`,
    context: `Project: ${site?.secondary || "No project"} | Site: ${site?.name || site?.primary || "Unknown site"}`
  });
}

async function saveAdminItemPhoto(itemId, file, organizationId) {
  const photo = await prepareAdminItemPhoto(file);
  if (photo.dataUrl.length > 900000) throw new Error("The photo is still too large after resizing. Choose a different photo and try again.");

  const response = await fetch("/.netlify/functions/photo", {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify({ ...photo, organizationId, itemId })
  });
  let result = {};
  try { result = await response.json(); } catch { /* Use the status message below. */ }
  if (!response.ok) throw new Error(result.error || `Photo upload failed with status ${response.status}.`);

  const { error } = await fieldDriveSupabase.from("item_photos").insert({
    organization_id: organizationId,
    item_id: itemId,
    storage_path: result.id,
    file_name: result.name || photo.name || "item-photo.jpg",
    content_type: result.type || photo.type || "image/jpeg",
    completion_proof: false
  });
  if (!error) return;

  if (result.id) await fieldDriveSupabase.storage.from(itemPhotoBucket).remove([result.id]);
  throwError(error);
}

async function prepareAdminItemPhoto(file) {
  if (uploadSecurity) await uploadSecurity.validateSourcePhoto(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 640;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          name: file.name,
          type: "image/jpeg",
          dataUrl: canvas.toDataURL("image/jpeg", 0.55)
        });
      };
      image.onerror = () => reject(new Error("The selected photo could not be opened."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("The selected photo could not be read."));
    reader.readAsDataURL(file);
  });
}

async function saveSettingForm(values) {
  if (values.type === "location") {
    await insertRow("location_settings", { organization_id: requireActiveOrganizationId(), name: values.name.trim() });
  } else if (values.type === "trade") {
    await insertRow("trade_settings", { organization_id: requireActiveOrganizationId(), name: values.name.trim() });
  } else if (values.type === "item") {
    await insertRow("item_settings", { organization_id: requireActiveOrganizationId(), name: values.name.trim() });
  }
  addRecentChange("Setting added", values.name.trim(), "settings");
}

async function insertRow(table, row) {
  const nextRow = { ...row };
  if (organizationScopedTables.has(table) && !nextRow.organization_id) nextRow.organization_id = requireActiveOrganizationId();
  const { error } = await fieldDriveSupabase.from(table).insert(nextRow);
  if (error) throwError(error);
}

async function insertRowReturning(table, row) {
  const nextRow = { ...row };
  if (organizationScopedTables.has(table) && !nextRow.organization_id) nextRow.organization_id = requireActiveOrganizationId();
  const { data, error } = await fieldDriveSupabase.from(table).insert(nextRow).select("id").single();
  if (error) throwError(error);
  return data;
}

async function createAdminSite(row) {
  if (!row.project_id) {
    throwError({ message: "Select a project for every imported site before saving." });
  }

  const { data, error } = await fieldDriveSupabase.rpc("create_site_for_current_user", {
    p_project_id: row.project_id,
    p_name: row.name,
    p_fields: row.fields || []
  });

  if (!error) {
    const site = Array.isArray(data) ? data[0] : data;
    if (site?.id) return site;
    throwError({ message: "The site was created but could not be loaded." });
  }

  const rpcIsUnavailable = ["PGRST202", "42883"].includes(error.code)
    || /create_site_for_current_user|schema cache/i.test(error.message || "");
  if (rpcIsUnavailable) return insertRowReturning("sites", row);

  throwError(error);
}

async function createAdminProject(name) {
  const projectName = String(name || "").trim();
  if (!projectName) throwError({ message: "Project name is required." });

  const { data, error } = await fieldDriveSupabase.rpc("create_project_for_current_user", {
    project_name: projectName
  });

  if (!error) {
    const project = Array.isArray(data) ? data[0] : data;
    if (project?.id) return project;
    throwError({ message: "The project was created but could not be loaded." });
  }

  const rpcIsUnavailable = ["PGRST202", "42883"].includes(error.code)
    || /create_project_for_current_user|schema cache/i.test(error.message || "");
  if (rpcIsUnavailable) {
    return insertRowReturning("projects", {
      organization_id: requireActiveOrganizationId(),
      name: projectName
    });
  }

  throwError(error);
}

async function updateById(table, id, row, signal) {
  let query = fieldDriveSupabase.from(table).update(row).eq("id", id);
  if (organizationScopedTables.has(table)) query = query.eq("organization_id", requireActiveOrganizationId());
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.select("id");
  if (signal?.aborted) throw createDashboardTimeoutError();
  if (error) throwError(error);
  if (!data?.length) throwError({ message: "The change was not saved. Refresh and check this user's access, then try again." });
}

async function insertContactRow(row) {
  const nextRow = { ...row, organization_id: row.organization_id || requireActiveOrganizationId() };
  const { error } = await fieldDriveSupabase.from("contacts").insert(nextRow);
  if (error && ["42703", "PGRST204"].includes(error.code) && hasOwn(row, "fields")) {
    const fallback = { ...nextRow };
    delete fallback.fields;
    const retry = await fieldDriveSupabase.from("contacts").insert(fallback);
    if (retry.error) throwError(retry.error);
    return;
  }
  if (error) throwError(error);
}

async function updateContactRow(id, row) {
  const organizationId = requireActiveOrganizationId();
  const { error } = await fieldDriveSupabase.from("contacts").update(row).eq("id", id).eq("organization_id", organizationId);
  if (error && ["42703", "PGRST204"].includes(error.code) && hasOwn(row, "fields")) {
    const fallback = { ...row };
    delete fallback.fields;
    const retry = await fieldDriveSupabase.from("contacts").update(fallback).eq("id", id).eq("organization_id", organizationId);
    if (retry.error) throwError(retry.error);
    return;
  }
  if (error) throwError(error);
}

async function deleteById(table, id) {
  if (!confirm("Delete this record?")) return false;
  await deleteByIdWithoutConfirm(table, id);
  return true;
}

async function deleteByIdWithoutConfirm(table, id) {
  let query = fieldDriveSupabase.from(table).delete().eq("id", id);
  if (organizationScopedTables.has(table)) query = query.eq("organization_id", requireActiveOrganizationId());
  const { error } = await query;
  if (error) throwError(error);
}

function buildUserRows(profiles, access, projectAccess = []) {
  return profiles.map((profile) => {
    const siteIds = access.filter((entry) => entry.user_id === profile.id).map((entry) => entry.site_id).filter(Boolean);
    const projectIds = projectAccess.filter((entry) => entry.user_id === profile.id).map((entry) => entry.project_id).filter(Boolean);
    const row = {
      id: profile.id,
      primary: profile.display_name || profile.id,
      secondary: profile.email || "No email",
      role: profile.role || "foreman",
      email: profile.email || "",
      isActive: profile.is_active !== false,
      tertiary: `${formatRoleLabel(profile.role)} | ${profile.is_active === false ? "Paused" : "Active"}`,
      siteIds,
      projectIds,
      actions: [
        { action: "editUser", label: "" },
        { action: "revokeUserSessions", label: "" },
        { action: "toggleUserAccess", label: "" },
        { action: "deleteUser", label: "" }
      ],
      createdAt: profile.created_at
    };
    row.search = getSearchText(row);
    return row;
  });
}

function formatRoleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "foreman") return "Foreman";
  return role || "Foreman";
}

function buildSiteRows(sites, access, projects = [], profiles = [], documents = []) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name || profile.id]));
  return sites.map((site) => {
    const foremanIds = access.filter((entry) => entry.site_id === site.id).map((entry) => entry.user_id).filter(Boolean);
    const foremanNames = foremanIds.map((id) => profileNames.get(id)).filter(Boolean);
    const projectName = site.projects?.name || projectNames.get(site.project_id) || "No project";
    const siteFields = normalizeSiteFields(site.fields);
    const siteName = site.name || "Unnamed site";
    const address = getSiteFieldValue(siteFields, "Address");
    const documentCount = documents.filter((documentRow) => documentRow.site_id === site.id).length;
    const row = {
      id: site.id,
      primary: formatSiteLabel(siteName, address),
      name: siteName,
      secondary: projectName,
      tertiary: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned",
      details: [
        { label: "Project", value: projectName },
        { label: "User", value: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned" },
        { label: "Address", value: address },
        { label: "Name", value: siteName },
        { label: "Permit", value: getSiteFieldValue(siteFields, "Permit") },
        { label: "Documents", value: String(documentCount) },
        ...siteFields.filter((field) => !["Address", "Permit"].includes(field.label))
      ].filter((detail) => detail.label && detail.value),
      projectId: site.project_id || "",
      fields: siteFields,
      foremanIds,
      actions: [
        { action: "viewSiteItems", label: "" },
        { action: "viewSiteDocuments", label: "" },
        { action: "editSite", label: "" },
        { action: "archiveSite", label: "" },
        { action: "deleteSite", label: "" }
      ],
      createdAt: site.created_at
    };
    row.search = getSearchText(row);
    return row;
  }).sort((a, b) => compareAdminText(a.name || a.primary, b.name || b.primary));
}

function buildArchiveRows(projects = [], sites = [], items = [], itemPhotos = []) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name || "Unnamed project"]));
  const projectArchivedAt = new Map(projects.map((project) => [project.id, project.archived_at || ""]));
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  const projectRows = projects.filter((project) => project.archived_at).map((project) => {
    const siteCount = sites.filter((site) => site.project_id === project.id).length;
    const row = {
      id: `project:${project.id}`,
      entityId: project.id,
      entityType: "Project",
      primary: project.name || "Unnamed project",
      secondary: "Project",
      tertiary: `${siteCount} ${siteCount === 1 ? "site" : "sites"}`,
      projectId: project.id,
      project: project.name || "Unnamed project",
      archivedAt: project.archived_at,
      actions: [
        { action: "unarchiveProject", label: "Restore" },
        { action: "deleteArchivedProject", label: "" }
      ]
    };
    row.search = getSearchText(row);
    return row;
  });
  const siteRows = sites.filter((site) => site.archived_at).map((site) => {
    const row = {
      id: `site:${site.id}`,
      entityId: site.id,
      entityType: "Site",
      primary: site.name || "Unnamed site",
      secondary: "Site",
      tertiary: projectNames.get(site.project_id) || "No project",
      projectId: site.project_id || "",
      project: projectNames.get(site.project_id) || "No project",
      archivedAt: site.archived_at,
      actions: [
        { action: "unarchiveSite", label: "Restore" },
        { action: "deleteArchivedSite", label: "" }
      ]
    };
    row.search = getSearchText(row);
    return row;
  });
  const itemRows = buildItemRows(items, itemPhotos, projects).map((row) => {
    const site = siteMap.get(row.siteId) || {};
    const archivedAt = site.archived_at || projectArchivedAt.get(row.projectId) || "";
    const archivedRow = {
      ...row,
      entityType: "Item",
      archived: true,
      archivedAt
    };
    archivedRow.search = getSearchText(archivedRow);
    return archivedRow;
  });
  return [...projectRows, ...siteRows, ...itemRows]
    .sort((a, b) => new Date(b.archivedAt || 0) - new Date(a.archivedAt || 0));
}

function buildDocumentRows(documents = [], sites = [], projects = [], profiles = []) {
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile.display_name || profile.email || profile.id]));
  return documents.map((documentRow) => {
    const site = siteMap.get(documentRow.site_id);
    const siteName = site?.name || "Unknown site";
    const projectName = site?.projects?.name || projectMap.get(site?.project_id) || "No project";
    const category = documentRow.category || "Document";
    const row = {
      id: documentRow.id,
      primary: documentRow.title || documentRow.file_name || "Document",
      secondary: siteName,
      tertiary: category,
      siteId: documentRow.site_id || "",
      site: siteName,
      project: projectName,
      category,
      description: documentRow.description || "",
      documentDate: documentRow.document_date || "",
      quickAccess: Boolean(documentRow.quick_access),
      storagePath: documentRow.storage_path || "",
      fileName: documentRow.file_name || "document",
      contentType: documentRow.content_type || "application/octet-stream",
      sizeBytes: Number(documentRow.size_bytes || 0),
      uploadedBy: documentRow.uploaded_by || "",
      details: [
        { label: "Project", value: projectName },
        { label: "Original file", value: documentRow.file_name || "" },
        { label: "Document Type", value: category },
        { label: "Document date", value: documentRow.document_date || "" },
        { label: "Quick Access", value: documentRow.quick_access ? "Yes" : "" },
        { label: "Size", value: formatAdminFileSize(documentRow.size_bytes) },
        { label: "Uploaded by", value: profileMap.get(documentRow.uploaded_by) || "" },
        { label: "Description", value: documentRow.description || "" }
      ].filter((detail) => detail.value),
      actions: [
        { action: "openDocument", label: "" },
        { action: "editDocument", label: "" },
        { action: "deleteDocument", label: "" }
      ],
      createdAt: documentRow.created_at
    };
    row.search = getSearchText(row);
    return row;
  }).sort((a, b) => compareAdminText(a.site, b.site) || compareAdminText(a.primary, b.primary));
}

function formatAdminFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSiteLabel(name, address) {
  return [name || "Unnamed site", address].filter(Boolean).join(" - ");
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

function normalizeContactFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => ({
      label: String(field?.label || "").trim(),
      value: String(field?.value || "").trim()
    }))
    .filter((field) => field.label && field.value);
}

function getSiteFieldValue(fields = [], label = "") {
  const target = String(label || "").toLowerCase();
  return fields.find((field) => String(field.label || "").toLowerCase() === target)?.value || "";
}

function buildProjectRows(projects, sites, projectAccess = [], profiles = []) {
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name || profile.id]));
  return projects.map((project) => {
    const siteCount = sites.filter((site) => site.project_id === project.id).length;
    const foremanIds = projectAccess.filter((entry) => entry.project_id === project.id).map((entry) => entry.user_id).filter(Boolean);
    const foremanNames = foremanIds.map((id) => profileNames.get(id)).filter(Boolean);
    const row = {
      id: project.id,
      primary: project.name || "Unnamed project",
      secondary: `${siteCount} ${siteCount === 1 ? "site" : "sites"}`,
      tertiary: foremanNames.length ? foremanNames.join(", ") : "No foremen assigned",
      foremanIds,
      actions: [
        { action: "editProject", label: "" },
        { action: "archiveProject", label: "" },
        { action: "deleteProject", label: "" }
      ],
      createdAt: project.created_at
    };
    row.search = getSearchText(row);
    return row;
  });
}

function buildItemRows(items, itemPhotos = [], projects = []) {
  const photosByItem = groupPhotosByItem(itemPhotos);
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  return items.map((item) => {
    const site = item.sites || {};
    const projectName = site.projects?.name || projectNames.get(site.project_id) || "No project";
    const location = item.location || [item.location_area, item.location_detail].filter(Boolean).join(" - ");
    const siteName = site.name || "No site";
    const siteFields = normalizeSiteFields(site.fields);
    const address = getSiteFieldValue(siteFields, "Address");
    const row = {
      id: item.id,
      primary: item.item || "Untitled item",
      secondary: item.trade || "Crew",
      tertiary: siteName,
      project: projectName,
      projectId: site.project_id || "",
      site: siteName,
      siteLabel: formatSiteLabel(siteName, address),
      siteId: item.site_id || site.id || "",
      location,
      locationArea: item.location_area || item.location || "",
      locationDetail: item.location_detail || "",
      trade: item.trade || "",
      item: item.item || "",
      notes: item.notes || "",
      comment: item.shared_note || "",
      photos: photosByItem.get(item.id) || [],
      completed: Boolean(item.completed),
      completedAt: item.completed_at || "",
      tradeCompleted: Boolean(item.trade_completed),
      tradeCompletedAt: item.trade_completed_at || "",
      addedByName: item.profiles?.display_name || item.created_by || "",
      source: "Supabase",
      action: "completeItem",
      actionLabel: "Close",
      createdAt: item.created_at
    };
    row.search = getSearchText(row);
    return row;
  });
}

function buildMainAppItemRows(mainAppState, supabaseItems = [], options = {}) {
  const includeCompleted = Boolean(options.completed);
  const supabaseIds = new Set(supabaseItems.map((item) => item.id).filter(Boolean));
  return (mainAppState.communities || []).flatMap((project) =>
    (project.homesites || []).flatMap((site) =>
      (site.issues || [])
        .filter((issue) => Boolean(issue.completed) === includeCompleted && !supabaseIds.has(issue.id))
        .map((issue) => {
          const siteName = site.name || "No site";
          const siteFields = normalizeSiteFields(site.fields);
          const address = getSiteFieldValue(siteFields, "Address");
          const row = {
            id: issue.id || `local-item-${slugId(`${project.name}-${site.name}-${issue.trade}-${issue.issue}`)}`,
            primary: issue.issue || "Untitled item",
            secondary: issue.trade || "Crew",
            tertiary: siteName,
            project: project.name || "No project",
            projectId: project.id || "",
            site: siteName,
            siteLabel: formatSiteLabel(siteName, address),
            siteId: site.id || "",
            location: issue.room || [issue.locationArea, issue.locationDetail].filter(Boolean).join(" - "),
            locationArea: issue.locationArea || issue.room || "",
            locationDetail: issue.locationDetail || "",
            trade: issue.trade || "",
            item: issue.issue || "",
            notes: issue.notes || "",
            comment: issue.sharedNote || "",
            photos: issue.photos || [],
            completed: Boolean(issue.completed),
            completedAt: issue.completedAt || "",
            tradeCompleted: Boolean(issue.tradeCompleted),
            tradeCompletedAt: issue.tradeCompletedAt || "",
            addedByName: issue.addedByName || issue.createdByName || issue.createdBy || "",
            source: "Main app",
            status: "Main app",
            createdAt: issue.createdAt
          };
          row.search = getSearchText(row);
          return row;
        })
    )
  );
}

function buildContactRows(contacts) {
  return contacts.map((contact) => {
    const fields = normalizeContactFields(contact.fields);
    const row = {
      id: contact.id,
      primary: contact.contact_name || contact.email || "Unnamed contact",
      secondary: contact.vendor || "No company",
      tertiary: contact.job_desc || contact.phone || "No job desc",
      contactName: contact.contact_name || "",
      trade: contact.trade || "",
      vendor: contact.vendor || "",
      jobDesc: contact.job_desc || "",
      email: contact.email || "",
      phone: contact.phone || "",
      alternateContact: contact.alternate_contact || "",
      fields,
      details: [
        { label: "Name", value: contact.contact_name || "" },
        { label: "Company", value: contact.vendor || "" },
        { label: "Job Desc", value: contact.job_desc || "" },
        { label: "Email", value: contact.email || "" },
        { label: "Phone", value: contact.phone || "" },
        { label: "Alternative contact", value: contact.alternate_contact || "" },
        ...fields
      ].filter((detail) => detail.label && detail.value),
      actions: [
        { action: "editContact", label: "" },
        { action: "deleteContact", label: "" }
      ],
      createdAt: contact.created_at
    };
    row.search = getSearchText(row);
    return row;
  });
}

function buildMainAppContactRows(mainAppState, supabaseContacts = []) {
  const existing = new Set(supabaseContacts.map((contact) => [
    contact.contact_name,
    contact.vendor,
    contact.email,
    contact.phone
  ].join("|").toLowerCase()));

  return (mainAppState.customContacts || [])
    .filter((contact) => contact.source !== "Supabase")
    .map((contact, index) => {
      const name = contact.tradeType || contact.contactName || "";
      const key = [name, contact.vendor, contact.contactEmail, contact.contactPhone].join("|").toLowerCase();
      if (existing.has(key)) return null;
      const fields = normalizeContactFields(contact.fields);
      const row = {
        id: getMainAppContactRowId(contact, index),
        primary: name || contact.contactEmail || "Unnamed contact",
        secondary: contact.vendor || "No company",
        tertiary: contact.jobDesc || contact.contactPhone || "Main app",
        contactName: name,
        trade: "",
        vendor: contact.vendor || "",
        jobDesc: contact.jobDesc || "",
        email: contact.contactEmail || "",
        phone: contact.contactPhone || "",
        alternateContact: contact.alternateContact || "",
        fields,
        source: "Main app",
        details: [
          { label: "Name", value: name },
          { label: "Company", value: contact.vendor || "" },
          { label: "Job Desc", value: contact.jobDesc || "" },
          { label: "Email", value: contact.contactEmail || "" },
          { label: "Phone", value: contact.contactPhone || "" },
          { label: "Alternative contact", value: contact.alternateContact || "" },
          ...fields
        ].filter((detail) => detail.label && detail.value),
        actions: [
          { action: "editContact", label: "" },
          { action: "deleteContact", label: "" }
        ],
        createdAt: contact.createdAt || ""
      };
      row.search = getSearchText(row);
      return row;
    })
    .filter(Boolean);
}

function buildSettingRows(trades, locations, items) {
  const rows = [
    ...locations.filter((location) => location.name !== sharedSettingsMarkerName).map((location) => settingRow(location, "Location", "Punch form", "location_settings")),
    ...trades.map((trade) => settingRow(trade, "Crew", "Assignments", "trade_settings")),
    ...items.map((item) => settingRow(item, "Item", item.trade_settings?.name || "All crews", "item_settings"))
  ];
  rows.forEach((row) => row.search = getSearchText(row));
  return rows;
}

function buildMainAppSettingRows(mainAppState, supabaseTrades = [], supabaseLocations = [], supabaseItems = []) {
  const existingTrades = new Set(supabaseTrades.map((trade) => trade.name).filter(Boolean));
  const existingItems = new Set(supabaseItems.map((item) => `${item.trade_settings?.name || "All crews"}:${item.name}`));
  const existingLocations = new Set(supabaseLocations.map((location) => location.name).filter(Boolean));
  const rows = [];

  (mainAppState.rooms || []).forEach((location) => {
    if (!location || existingLocations.has(location)) return;
    rows.push({
      id: `main-location-${slugId(location)}`,
      primary: location,
      secondary: "Location",
      tertiary: "Main app",
      status: "Main app"
    });
  });

  Object.entries(mainAppState.tradeIssues || {}).forEach(([trade, items]) => {
    if (!existingTrades.has(trade)) {
      rows.push({
        id: `main-trade-${slugId(trade)}`,
        primary: trade,
        secondary: "Crew",
        tertiary: "Main app",
        status: "Main app"
      });
    }

    (items || []).forEach((item) => {
      const key = `${trade}:${item}`;
      if (existingItems.has(key)) return;
      rows.push({
        id: `main-item-${slugId(`${trade}-${item}`)}`,
        primary: item,
        secondary: "Item",
        tertiary: trade,
        status: "Main app"
      });
    });
  });

  rows.forEach((row) => row.search = getSearchText(row));
  return rows;
}

function settingRow(record, type, appliesTo, table) {
  return {
    id: record.id,
    primary: record.name || "Unnamed setting",
    secondary: type,
    tertiary: appliesTo,
    action: `deleteSetting:${table}`,
    actionLabel: "Delete"
  };
}

function loadMainAppState() {
  try {
    const state = JSON.parse(localStorage.getItem(mainAppStorageKey) || "{}");
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}

function saveMainAppState(state) {
  localStorage.setItem(mainAppStorageKey, JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString()
  }));
}

function updateMainAppProjectName(projectId, oldName, nextName) {
  const state = loadMainAppState();
  const targetName = String(oldName || "").trim().toLowerCase();
  const project = (state.communities || []).find((candidate) => {
    if (candidate.id === projectId) return true;
    return targetName && String(candidate.name || "").trim().toLowerCase() === targetName;
  });
  if (!project) return;
  project.name = nextName;
  saveMainAppState(state);
}

function deleteMainAppProject(projectId, projectName = "") {
  const state = loadMainAppState();
  const targetName = String(projectName || "").trim().toLowerCase();
  state.communities = (state.communities || []).filter((project) => {
    if (project.id === projectId) return false;
    if (targetName && String(project.name || "").trim().toLowerCase() === targetName) return false;
    return true;
  });

  if (!state.communities.some((project) => project.id === state.currentCommunityId)) {
    state.currentCommunityId = state.communities[0]?.id || "";
  }
  const currentProject = (state.communities || []).find((project) => project.id === state.currentCommunityId);
  if (!currentProject?.homesites?.some((site) => site.id === state.currentHomesiteId)) {
    state.currentHomesiteId = currentProject?.homesites?.[0]?.id || "";
  }
  saveMainAppState(state);
}

function deleteMainAppSite(siteId, siteName = "") {
  const state = loadMainAppState();
  const targetName = String(siteName || "").trim().toLowerCase();
  (state.communities || []).forEach((project) => {
    project.homesites = (project.homesites || []).filter((site) => {
      if (site.id === siteId) return false;
      if (targetName && String(site.name || "").trim().toLowerCase() === targetName) return false;
      return true;
    });
  });

  const currentProject = (state.communities || []).find((project) => project.id === state.currentCommunityId) || state.communities?.[0];
  state.currentCommunityId = currentProject?.id || "";
  if (!currentProject?.homesites?.some((site) => site.id === state.currentHomesiteId)) {
    state.currentHomesiteId = currentProject?.homesites?.[0]?.id || "";
  }
  saveMainAppState(state);
}

function deleteMainAppSites(siteIds = []) {
  const selectedIds = new Set(siteIds.filter(Boolean));
  if (!selectedIds.size) return;

  const state = loadMainAppState();
  (state.communities || []).forEach((project) => {
    project.homesites = (project.homesites || []).filter((site) => !selectedIds.has(site.id));
  });

  const currentProject = (state.communities || []).find((project) => project.id === state.currentCommunityId) || state.communities?.[0];
  state.currentCommunityId = currentProject?.id || "";
  if (!currentProject?.homesites?.some((site) => site.id === state.currentHomesiteId)) {
    state.currentHomesiteId = currentProject?.homesites?.[0]?.id || "";
  }
  saveMainAppState(state);
}

async function editDashboardSetting(id) {
  const row = (rowsBySection.settings || []).find((setting) => setting.id === id);
  if (!row) return;
  const name = prompt(`${row.secondary} name`, row.primary);
  if (!name?.trim() || name.trim() === row.primary) return;

  if (id.startsWith("main-")) {
    updateMainAppSetting(id, name.trim());
    addRecentChange(`${row.secondary} updated`, name.trim(), "settings");
    await refreshDashboardRows();
    return;
  }

  const table = row.action?.split(":")[1];
  if (!table) return;
  await updateById(table, id, { name: name.trim() });
  updateMainAppSettingRow(row, name.trim());
  addRecentChange(`${row.secondary} updated`, name.trim(), "settings");
  await refreshDashboardRows();
}

function updateMainAppSetting(id, nextName) {
  const row = (rowsBySection.settings || []).find((setting) => setting.id === id);
  if (!row) return;
  updateMainAppSettingRow(row, nextName);
}

function updateMainAppSettingRow(row, nextName) {
  const state = loadMainAppState();
  if (!String(row.id || "").startsWith("main-")) state.sharedSettingsInitialized = true;
  state.sharedSettingIds = normalizeMainAppSettingIds(state.sharedSettingIds);
  if (row.secondary === "Location") {
    state.rooms = (state.rooms || []).map((location) => location === row.primary ? nextName : location);
    if (!state.rooms.includes(nextName)) state.rooms.push(nextName);
    moveMainAppSettingId(state, "locations", row.primary, nextName);
    if (row.id) state.sharedSettingIds.locations[nextName] = row.id;
  } else if (isCrewSettingType(row.secondary)) {
    state.tradeIssues ||= {};
    const dashboardItems = (rowsBySection.settings || [])
      .filter((setting) => setting.secondary === "Item" && setting.tertiary === row.primary)
      .map((setting) => setting.primary);
    state.tradeIssues[nextName] = state.tradeIssues[row.primary] || dashboardItems;
    delete state.tradeIssues[row.primary];
    if (state.tradeEmails?.[row.primary]) state.tradeEmails[nextName] = state.tradeEmails[row.primary];
    delete state.tradeEmails?.[row.primary];
    moveMainAppSettingId(state, "trades", row.primary, nextName);
    if (row.id) state.sharedSettingIds.trades[nextName] = row.id;
    state.sharedSettingIds.items[nextName] = state.sharedSettingIds.items[row.primary] || {};
    delete state.sharedSettingIds.items[row.primary];
  } else if (row.secondary === "Item") {
    const trade = row.tertiary || "";
    state.tradeIssues ||= {};
    state.tradeIssues[trade] = (state.tradeIssues[trade] || []).map((item) => item === row.primary ? nextName : item);
    if (!state.tradeIssues[trade].includes(nextName)) state.tradeIssues[trade].push(nextName);
    state.sharedSettingIds.items[trade] ||= {};
    const itemId = state.sharedSettingIds.items[trade][row.primary];
    if (itemId || row.id) state.sharedSettingIds.items[trade][nextName] = itemId || row.id;
    delete state.sharedSettingIds.items[trade][row.primary];
  }
  saveMainAppState(state);
}

function deleteMainAppSetting(id) {
  const row = (rowsBySection.settings || []).find((setting) => setting.id === id);
  if (!row || !confirm(`Delete ${row.primary}?`)) return;
  deleteMainAppSettingRow(row);
}

function deleteMainAppSettingRow(row) {
  const state = loadMainAppState();
  if (!String(row.id || "").startsWith("main-")) state.sharedSettingsInitialized = true;
  state.sharedSettingIds = normalizeMainAppSettingIds(state.sharedSettingIds);
  if (row.secondary === "Location") {
    state.rooms = (state.rooms || []).filter((location) => location !== row.primary);
    if (!state.rooms.length) state.rooms = ["Other"];
    delete state.sharedSettingIds.locations[row.primary];
  } else if (isCrewSettingType(row.secondary)) {
    delete state.tradeIssues?.[row.primary];
    delete state.tradeEmails?.[row.primary];
    delete state.sharedSettingIds.trades[row.primary];
    delete state.sharedSettingIds.items[row.primary];
  } else if (row.secondary === "Item") {
    const trade = row.tertiary || "";
    state.tradeIssues ||= {};
    state.tradeIssues[trade] = (state.tradeIssues[trade] || []).filter((item) => item !== row.primary);
    if (!state.tradeIssues[trade]?.length) state.tradeIssues[trade] = ["Other"];
    delete state.sharedSettingIds.items?.[trade]?.[row.primary];
  }
  saveMainAppState(state);
  addRecentChange(`${row.secondary} deleted`, row.primary, "settings");
}

async function deleteDashboardSetting(table, id) {
  const row = (rowsBySection.settings || []).find((setting) => setting.id === id);
  if (!row || !confirm(`Delete ${row.primary}?`)) return;
  await deleteByIdWithoutConfirm(table, id);
  deleteMainAppSettingRow(row);
  removeDashboardRow("settings", id);
  renderFilteredRows("settings", document.querySelector("#adminSearchInput")?.value || "");
}

function normalizeMainAppSettingIds(value = {}) {
  return {
    locations: value?.locations && typeof value.locations === "object" ? { ...value.locations } : {},
    trades: value?.trades && typeof value.trades === "object" ? { ...value.trades } : {},
    items: value?.items && typeof value.items === "object"
      ? Object.fromEntries(Object.entries(value.items).map(([trade, items]) => [trade, items && typeof items === "object" ? { ...items } : {}]))
      : {}
  };
}

function moveMainAppSettingId(state, collection, oldName, nextName) {
  const id = state.sharedSettingIds[collection][oldName];
  if (id) state.sharedSettingIds[collection][nextName] = id;
  delete state.sharedSettingIds[collection][oldName];
}

function updateMainAppContact(id, values) {
  const state = loadMainAppState();
  const contacts = state.customContacts || [];
  const contact = findMainAppContact(contacts, id);
  if (!contact) return;
  contact.tradeType = values.contact_name || "";
  contact.contactName = values.contact_name || "";
  contact.vendor = values.vendor || "";
  contact.jobDesc = values.job_desc || "";
  contact.contactEmail = values.email || "";
  contact.contactPhone = values.phone || "";
  contact.alternateContact = values.alternate_contact || "";
  contact.fields = values.fields || [];
  state.customContacts = contacts;
  saveMainAppState(state);
}

function deleteMainAppContact(id) {
  if (!confirm("Delete this contact?")) return false;
  const state = loadMainAppState();
  state.customContacts = (state.customContacts || []).filter((contact, index) => getMainAppContactRowId(contact, index) !== id);
  saveMainAppState(state);
  addRecentChange("Contact deleted", "Main app contact", "contacts");
  return true;
}

function findMainAppContact(contacts, id) {
  return contacts.find((contact, index) => getMainAppContactRowId(contact, index) === id);
}

function getMainAppContactRowId(contact, index) {
  const name = contact.tradeType || contact.contactName || "";
  return `main-contact-${contact.id || slugId(`${name}-${contact.vendor}-${index}`)}`;
}

function updateMainAppItem(id, values) {
  const state = loadMainAppState();
  const match = findMainAppIssue(state, id);
  if (!match) return false;

  const issue = match.issue;
  if (hasOwn(values, "site_id") && values.site_id && values.site_id !== match.site.id) {
    const target = findMainAppSite(state, values.site_id);
    if (target) {
      match.site.issues = (match.site.issues || []).filter((candidate) => candidate.id !== id);
      target.site.issues ||= [];
      target.site.issues.unshift(issue);
    }
  }
  if (hasOwn(values, "project_id") && values.project_id) {
    moveMainAppSiteToProject(state, values.site_id || match.site.id, values.project_id);
  }
  if (hasOwn(values, "location")) {
    issue.room = values.location;
    issue.locationArea = values.location_area || values.location;
    issue.locationDetail = values.location_detail || "";
  }
  if (hasOwn(values, "trade")) issue.trade = values.trade;
  if (hasOwn(values, "item")) issue.issue = values.item;
  if (hasOwn(values, "notes")) issue.notes = values.notes;
  if (hasOwn(values, "shared_note")) issue.sharedNote = values.shared_note;
  if (hasOwn(values, "shared_note_updated_at")) issue.sharedNoteUpdatedAt = values.shared_note_updated_at;
  if (hasOwn(values, "completed")) issue.completed = values.completed;
  if (hasOwn(values, "completedAt")) issue.completedAt = values.completedAt;
  saveMainAppState(state);
  return true;
}

function deleteMainAppItem(id) {
  const state = loadMainAppState();
  const match = findMainAppIssue(state, id);
  if (!match) return;
  match.site.issues = (match.site.issues || []).filter((issue) => issue.id !== id);
  saveMainAppState(state);
}

function findMainAppIssue(state, id) {
  for (const project of state.communities || []) {
    for (const site of project.homesites || []) {
      const issue = (site.issues || []).find((candidate) => candidate.id === id);
      if (issue) return { project, site, issue };
    }
  }
  return null;
}

function findMainAppSite(state, siteId) {
  for (const project of state.communities || []) {
    for (const site of project.homesites || []) {
      if (site.id === siteId) return { project, site };
    }
  }
  return null;
}

function moveMainAppSiteToProject(state, siteId, projectId) {
  if (!siteId || !projectId) return;
  const current = findMainAppSite(state, siteId);
  const targetProject = (state.communities || []).find((project) => project.id === projectId);
  if (!current || !targetProject || current.project.id === targetProject.id) return;

  current.project.homesites = (current.project.homesites || []).filter((site) => site.id !== siteId);
  targetProject.homesites ||= [];
  if (!targetProject.homesites.some((site) => site.id === siteId)) {
    targetProject.homesites.push(current.site);
  }
}

function groupPhotosByItem(photos = []) {
  return photos.reduce((groups, photo) => {
    if (!photo.item_id) return groups;
    if (!groups.has(photo.item_id)) groups.set(photo.item_id, []);
    groups.get(photo.item_id).push(photo);
    return groups;
  }, new Map());
}

function dedupeRowsById(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function slugId(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

function updateMetrics() {
  metricItems.textContent = rowsBySection.items.length;
}

function toggleNotifications() {
  const willOpen = notificationPanel.classList.contains("hidden");
  notificationPanel.classList.toggle("hidden", !willOpen);
  notificationButton.setAttribute("aria-expanded", String(willOpen));
  renderNotifications();
}

function closeAdminNotifications() {
  notificationPanel.classList.add("hidden");
  notificationButton.setAttribute("aria-expanded", "false");
}

function closeAdminNotificationsOnOutsideClick(event) {
  if (notificationPanel.classList.contains("hidden")) return;
  if (notificationPanel.contains(event.target) || notificationButton.contains(event.target)) return;
  closeAdminNotifications();
}

function renderNotifications() {
  const changes = recentChanges.filter(isAdminNotificationEnabled).slice(0, 12);
  notificationCount.textContent = String(changes.length);
  notificationPanel.innerHTML = `
    <div class="notification-header">
      <strong>Recent Changes</strong>
      <button class="row-action-button" id="clearNotificationsButton" type="button"><i data-lucide="trash-2"></i><span>Clear</span></button>
    </div>
    <div class="notification-list">
      ${changes.length ? changes.map(renderNotification).join("") : `<p class="empty-state">No recent changes yet.</p>`}
    </div>
  `;
  const clearButton = document.querySelector("#clearNotificationsButton");
  if (clearButton) clearButton.addEventListener("click", clearNotifications);
  notificationPanel.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.addEventListener("click", () => openNotification(button.dataset.notificationId));
  });
  renderIcons();
}

function renderNotification(change) {
  return `
    <button class="notification-item" type="button" data-notification-id="${escapeHtml(change.id)}" aria-label="Open ${escapeHtml(change.type)}">
      <span>${escapeHtml(change.type)}</span>
      <strong>${escapeHtml(change.label)}</strong>
      ${change.detail ? `<small class="notification-detail">${escapeHtml(change.detail)}</small>` : ""}
      ${change.context ? `<small class="notification-context">${escapeHtml(change.context)}</small>` : ""}
      <small class="notification-time">${escapeHtml(formatTimestamp(change.createdAt))}</small>
    </button>
  `;
}

function openNotification(notificationId) {
  const change = recentChanges.find((candidate) => candidate.id === notificationId);
  if (!change) return;

  let section = change.section || "items";
  if (change.targetId) {
    if ((rowsBySection.items || []).some((row) => row.id === change.targetId)) section = "items";
    if ((rowsBySection.completedItems || []).some((row) => row.id === change.targetId)) section = "completedItems";
  }
  if (!sectionContent[section]) section = "items";

  if (isItemSection(section)) itemViewState = { ...defaultItemViewState };
  activeSection = section;
  formSection = "";
  closeAdminNotifications();
  syncActiveAdminNav();
  renderSection(section);

  if (!change.targetId) return;
  requestAnimationFrame(() => {
    const selector = isItemSection(section)
      ? `[data-item-card="${cssEscape(change.targetId)}"]`
      : `[data-row-card="${cssEscape(change.targetId)}"]`;
    const target = adminPanel.querySelector(selector);
    if (!target) return;
    target.classList.add("notification-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.classList.remove("notification-target"), 2200);
  });
}

function clearNotifications() {
  recentChanges = [];
  saveRecentChanges();
  renderNotifications();
}

function addRecentChange(type, label, section, options = {}) {
  recentChanges = dedupeChanges([
    {
      id: options.id || `${section}-${label}-${Date.now()}`,
      type,
      label,
      section,
      targetId: options.targetId || "",
      detail: options.detail || "",
      context: options.context || "",
      createdAt: new Date().toISOString()
    },
    ...recentChanges
  ]);
  saveRecentChanges();
  renderNotifications();
}

function mergeLoadedActivity(groups) {
  const itemRows = [...(groups.punchItems || []), ...(groups.completedPunchItems || [])];
  const loaded = [
    ...itemAddedActivityFromRows(itemRows, groups),
    ...tradeCompletionActivityFromRows(itemRows, groups),
    ...completionPhotoActivityFromRows(groups.itemPhotos || [], itemRows, groups),
    ...crewNoteActivityFromRows(itemRows, groups),
    ...activityFromRows(groups.profiles, "User added", "display_name", "users"),
    ...activityFromRows(groups.projects, "Project added", "name", "projects"),
    ...activityFromRows(groups.sites, "Site added", "name", "sites"),
    ...activityFromRows(groups.contacts, "Contact added", "contact_name", "contacts")
  ];
  recentChanges = dedupeChanges([...loaded, ...recentChanges])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);
  saveRecentChanges();
  renderNotifications();
}

function itemAddedActivityFromRows(rows = [], groups = {}) {
  return rows
    .filter((row) => row.created_at)
    .map((row) => {
      const activity = getItemActivityContext(row, groups);
      return {
        id: `items-${row.id}`,
        type: "Item added",
        label: [row.trade, row.item].filter(Boolean).join(" - ") || row.id || "Item",
        detail: `Added by ${activity.userName}`,
        context: `Project: ${activity.projectName} | Site: ${activity.siteName}`,
        section: row.completed ? "completedItems" : "items",
        targetId: row.id,
        createdAt: row.created_at
      };
    });
}

function tradeCompletionActivityFromRows(rows = [], groups = {}) {
  return rows
    .filter((row) => row.trade_completed && row.trade_completed_at)
    .map((row) => {
      const activity = getItemActivityContext(row, groups);
      return {
        id: `items-trade-complete-${row.id}-${row.trade_completed_at}`,
        type: "Crew completed",
        label: [row.trade, row.item].filter(Boolean).join(" - ") || row.id || "Item",
        detail: `Item added by ${activity.userName}`,
        context: `Project: ${activity.projectName} | Site: ${activity.siteName}`,
        section: row.completed ? "completedItems" : "items",
        targetId: row.id,
        createdAt: row.trade_completed_at
      };
    });
}

function completionPhotoActivityFromRows(photos = [], itemRows = [], groups = {}) {
  const items = new Map(itemRows.map((item) => [item.id, item]));
  return photos
    .filter((photo) => photo.completion_proof && photo.created_at && items.has(photo.item_id))
    .map((photo) => {
      const row = items.get(photo.item_id);
      const activity = getItemActivityContext(row, groups);
      return {
        id: `items-completion-photo-${photo.id || photo.storage_path}-${photo.created_at}`,
        type: "Completion photo uploaded",
        label: [row.trade, row.item].filter(Boolean).join(" - ") || row.id || "Item",
        detail: "Uploaded from a crew report",
        context: `Project: ${activity.projectName} | Site: ${activity.siteLabel}`,
        section: row.completed ? "completedItems" : "items",
        targetId: row.id,
        createdAt: photo.created_at
      };
    });
}

function crewNoteActivityFromRows(rows = [], groups = {}) {
  return rows
    .filter((row) => row.shared_note && row.shared_note_source === "crew_report" && row.shared_note_updated_at)
    .map((row) => {
      const activity = getItemActivityContext(row, groups);
      return {
        id: `items-crew-note-${row.id}-${row.shared_note_updated_at}`,
        type: "Crew note added",
        label: [row.trade, row.item].filter(Boolean).join(" - ") || row.id || "Item",
        detail: row.shared_note,
        context: `Project: ${activity.projectName} | Site: ${activity.siteLabel}`,
        section: row.completed ? "completedItems" : "items",
        targetId: row.id,
        createdAt: row.shared_note_updated_at
      };
    });
}

function getItemActivityContext(row, groups = {}) {
  const site = row.sites || (groups.sites || []).find((candidate) => candidate.id === row.site_id) || {};
  const project = site.projects || (groups.projects || []).find((candidate) => candidate.id === site.project_id) || {};
  const profile = row.profiles || (groups.profiles || []).find((candidate) => candidate.id === row.created_by) || {};
  return {
    userName: profile.display_name || "Unknown user",
    siteName: site.name || "Unknown site",
    siteLabel: formatSiteLabel(site.name || "Unknown site", getSiteFieldValue(normalizeSiteFields(site.fields), "Address")),
    projectName: project.name || "No project"
  };
}

function activityFromRows(rows = [], type, labelKey, section) {
  return rows
    .filter((row) => row.created_at)
    .map((row) => ({
      id: `${section}-${row.id}`,
      type,
      label: row[labelKey] || row.email || row.id || "Record",
      section,
      targetId: row.id || "",
      createdAt: row.created_at
    }));
}

function dedupeChanges(changes) {
  const seen = new Set();
  return changes.filter((change) => {
    if (!change.id || seen.has(change.id)) return false;
    seen.add(change.id);
    return true;
  });
}

function getAdminNotificationCategory(change) {
  const type = String(change?.type || "").toLowerCase();
  const section = String(change?.section || "");
  if (type.includes("crew completed") || type.includes("crew marked complete")) return "crewCompletion";
  if (type.includes("completion photo")) return "completionPhotos";
  if (type.includes("crew note")) return "crewNotes";
  if (type === "item added") return "itemAdded";
  if (["items", "completedItems"].includes(section)) return "itemChanges";
  if (["projects", "sites"].includes(section)) return "projectsSites";
  if (section === "users") return "users";
  if (["documents", "contacts"].includes(section)) return "documentsContacts";
  if (section === "settings") return "settings";
  return "itemChanges";
}

function isAdminNotificationEnabled(change) {
  return notificationPreferences[getAdminNotificationCategory(change)] !== false;
}

function loadCollapsedAdminSettingsSections() {
  try {
    const saved = JSON.parse(localStorage.getItem(adminSettingsCollapseStorageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function loadAdminNotificationPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(adminNotificationPreferenceStorageKey) || "{}");
    return { ...defaultAdminNotificationPreferences, ...(saved && typeof saved === "object" ? saved : {}) };
  } catch {
    return { ...defaultAdminNotificationPreferences };
  }
}

function loadAdminNotificationPreferencesForUser(user) {
  const remote = user?.user_metadata?.punch_logic_notification_preferences;
  if (!remote || typeof remote !== "object") return;
  notificationPreferences = { ...defaultAdminNotificationPreferences, ...remote };
  localStorage.setItem(adminNotificationPreferenceStorageKey, JSON.stringify(notificationPreferences));
  renderNotifications();
}

function saveAdminNotificationPreferences() {
  localStorage.setItem(adminNotificationPreferenceStorageKey, JSON.stringify(notificationPreferences));
  if (!fieldDriveSupabase) return;
  fieldDriveSupabase.auth.updateUser({
    data: { punch_logic_notification_preferences: notificationPreferences }
  }).then(({ error }) => {
    if (error) console.warn("Notification settings could not be synced to this account.", error);
  }).catch((error) => {
    console.warn("Notification settings could not be synced to this account.", error);
  });
}

function loadRecentChanges() {
  try {
    const saved = JSON.parse(localStorage.getItem(adminNotificationStorageKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveRecentChanges() {
  localStorage.setItem(adminNotificationStorageKey, JSON.stringify(recentChanges.slice(0, 30)));
}

function setPanelMessage(message) {
  adminPanel.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function getActionIcon(action) {
  if (action.startsWith("edit")) return "pencil";
  if (action === "viewSiteItems") return "list-checks";
  if (action === "viewSiteDocuments") return "doc-paper";
  if (action === "openDocument") return "external-link";
  if (action === "assignSite") return "user-check";
  if (action === "revokeUserSessions") return "log-out";
  if (action === "toggleUserAccess") return "power";
  if (action === "completeItem") return "check-circle-2";
  if (action.startsWith("archive")) return "archive";
  if (action.startsWith("unarchive")) return "archive-restore";
  if (action.startsWith("delete")) return "trash-2";
  return "circle";
}

function renderAdminIcon(iconName) {
  if (iconName === "doc-paper") {
    return `
      <svg class="doc-paper-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path class="doc-paper-sheet" d="M6 2.5h8l4 4v15H6z"></path>
        <path class="doc-paper-fold" d="M14 2.5v4h4"></path>
        <text class="doc-paper-label" x="12" y="16.3" text-anchor="middle">DOC</text>
      </svg>
    `;
  }
  return `<i data-lucide="${escapeHtml(iconName)}"></i>`;
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2.2
      }
    });
  }
}

function showAuthError(message) {
  adminAuthError.textContent = message;
}

function applyAdminTheme() {
  const savedTheme = localStorage.getItem(adminThemeStorageKey) || "dark";
  document.body.dataset.theme = savedTheme === "light" ? "light" : "dark";
  updateThemeButton();
}

function toggleAdminTheme() {
  const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem(adminThemeStorageKey, nextTheme);
  document.body.dataset.theme = nextTheme;
  updateThemeButton();
  renderIcons();
}

function updateThemeButton() {
  const isLight = document.body.dataset.theme === "light";
  adminThemeButton.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  adminThemeButton.innerHTML = `<i data-lucide="${isLight ? "moon" : "sun"}"></i>`;
}

function getActionLabel(action) {
  if (action.startsWith("edit")) return "Edit";
  if (action === "viewSiteItems") return "View items";
  if (action === "viewSiteDocuments") return "View documents";
  if (action === "openDocument") return "Open document";
  if (action.startsWith("delete")) return "Delete";
  if (action.startsWith("archive")) return "Archive";
  if (action.startsWith("unarchive")) return "Restore";
  if (action === "completeItem") return "Complete";
  if (action === "assignSite") return "Assign";
  if (action === "revokeUserSessions") return "Sign out all devices";
  if (action === "toggleUserAccess") return "Pause or resume access";
  return "Action";
}

function throwError(error) {
  alert(error.message || "Dashboard request failed.");
  if (error && typeof error === "object") error.dashboardAlerted = true;
  throw error;
}

function getSearchText(row) {
  return [
    row.primary,
    row.secondary,
    row.tertiary,
    row.status,
    row.project,
    row.site,
    row.location,
    row.trade,
    row.item,
    row.notes,
    row.comment,
    ...(row.details || []).flatMap((detail) => [detail.label, detail.value])
  ].join(" ").toLowerCase();
}

function formatDate(value) {
  if (!value) return "New";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "New";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDateAdded(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatTimestamp(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}
