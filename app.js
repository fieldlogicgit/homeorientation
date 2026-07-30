const rooms = [
  "Other",
  "Lobby",
  "Reception",
  "Open Office",
  "Private Office",
  "Conference Room",
  "Break Room",
  "Restroom",
  "Corridor",
  "Stairwell",
  "Elevator Lobby",
  "Mechanical Room",
  "Electrical Room",
  "IT / Server Room",
  "Storage Room",
  "Warehouse",
  "Loading Dock",
  "Roof",
  "Parking Area",
  "Sidewalk",
  "Building Exterior",
  "Site Perimeter"
];

const retiredRoomOptions = new Set([
  "Exterior",
  "Hallway",
  "Kitchen",
  "Living Room",
  "Half Bath",
  "Garage",
  "Stairway",
  "Upstairs Hallway",
  "Primary Bedroom",
  "Primary Bathroom",
  "Bedroom",
  "Hall Bathroom",
  "Loft"
]);

const genericTradeDeficiencies = [
  "Work incomplete",
  "Missing material or component",
  "Damaged material or finish",
  "Incorrect material or product",
  "Poor workmanship",
  "Out of alignment or not level",
  "Not per plans or specifications",
  "Code or inspection correction",
  "Access or clearance issue",
  "Sealant, caulk, or firestop needed",
  "Touch-up or finish repair",
  "Cleanup needed",
  "Other"
];

const buyerAcceptanceTerms = [
  {
    id: "orientation-items",
    title: "Completion of Prior New Home Orientation Items",
    body: "All items and punch-list discrepancies noted during the initial home orientation walkthrough have been completed satisfactorily by the Builder, unless explicitly noted otherwise in the exceptions section of this document below."
  },
  {
    id: "builder-warranty",
    title: "Builder Warranty Acceptance",
    body: "The Buyer has been provided with, has received, and fully understands the official builder warranty. No additional, written, verbal, or implied warranties have been offered, promised, or guaranteed by any builder employee, sales agent, or representative."
  },
  {
    id: "cosmetic-items",
    title: "Cosmetic Items Post-Closing",
    body: "The Buyer understands that any cosmetic items, flaws, or damages discovered after the closing date are not covered by the builder warranty. It is the Buyer's responsibility to identify cosmetic issues prior to or during this final walkthrough."
  },
  {
    id: "utility-transfers",
    title: "Utility Transfers and Billing",
    body: "It is the sole responsibility of the Buyer to ensure that all household utilities (water, electricity, gas, trash, etc.) are transferred into the Buyer’s name. The Buyer is responsible for any and all utility bills incurred after the closing date."
  },
  {
    id: "landscaping",
    title: "Landscaping, Sod, and Irrigation — Landscape and Sod",
    body: "The Buyer understands that landscaping, plants, trees, and sod are living elements and are not covered by the builder warranty."
  },
  {
    id: "irrigation-timer",
    title: "Irrigation Timer",
    body: "The Buyer understands they must set the lawn irrigation system timer to comply with local municipal-specified watering times. Failure to do so may result in unexpected, larger water bills, which remain the sole responsibility of the Buyer."
  }
];

const tradeIssues = {
  "Framing": [...genericTradeDeficiencies],
  "Roofing": [...genericTradeDeficiencies],
  "Glazing": [...genericTradeDeficiencies],
  "Masonry": [...genericTradeDeficiencies],
  "Electric": [...genericTradeDeficiencies],
  "Plumbing": [...genericTradeDeficiencies],
  "Gas": [...genericTradeDeficiencies],
  "HVAC": [...genericTradeDeficiencies],
  "Fire Suppression": [...genericTradeDeficiencies],
  "Drywall": [...genericTradeDeficiencies],
  "Tile": [...genericTradeDeficiencies],
  "Flooring": [...genericTradeDeficiencies],
  "Carpentry": [...genericTradeDeficiencies],
  "Specialty trim": [...genericTradeDeficiencies],
  "Low Voltage": [...genericTradeDeficiencies],
  "Landscape": [...genericTradeDeficiencies]
};

const retiredTradeOptions = new Set();

const defaultTradeEmails = Object.fromEntries(Object.keys(tradeIssues).map((trade) => [trade, ""]));

const storageKey = "punchLogic.homeAcceptance.state.v1";
const pinStorageKey = "punchLogic.homeAcceptance.pin.v1";
const unlockedSessionKey = "punchLogic.homeAcceptance.unlocked";
const themeStorageKey = "punchLogic.homeAcceptance.theme";
const languageStorageKey = "punchLogic.homeAcceptance.language";
const settingsCollapseStorageKey = "punchLogic.homeAcceptance.settings.collapsed.v1";
const reportIdStorageKey = "punchLogic.homeAcceptance.reportIds.v1";
const allTradeReportKeyStorageKey = "punchLogic.homeAcceptance.allTradeReportKeys.v1";
const allTradeReportAccessStorageKey = "punchLogic.homeAcceptance.allTradeReportAccess.v1";
const cachedProfileStorageKey = "punchLogic.homeAcceptance.cachedProfile.v1";
const fieldNotificationSeenStorageKey = "punchLogic.homeAcceptance.fieldNotifications.seen.v1";
const fieldNotificationRefreshMs = 30000;
const allOpenReportId = "all-open-items";
const projectOpenReportPrefix = "project-open-items:";
const sharedSettingsMarkerName = "__punchlogic_shared_settings_v1__";
let state = normalizeState(loadState());
const collapsedSettingsSections = loadCollapsedSettingsSections();
let isHydratingFromCloud = false;
let fieldNotificationRefreshInFlight = false;
let cloudSaveTimer;
let lastLocalChangeAt = 0;
let sharedSettingsInitializationPromise = null;
let mainOfflineSync = null;
let mainOfflineSyncReady = Promise.resolve();
const cloudHydrateQuietMs = 120000;

const authScreen = document.querySelector("#authScreen");
const authUsernameInput = document.querySelector("#authUsernameInput");
const authPasswordInput = document.querySelector("#authPasswordInput");
const authLoginButton = document.querySelector("#authLoginButton");
const authError = document.querySelector("#authError");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const passwordResetScreen = document.querySelector("#passwordResetScreen");
const newPasswordInput = document.querySelector("#newPasswordInput");
const confirmPasswordInput = document.querySelector("#confirmPasswordInput");
const saveNewPasswordButton = document.querySelector("#saveNewPasswordButton");
const passwordResetError = document.querySelector("#passwordResetError");
const lockScreen = document.querySelector("#lockScreen");
const pinTitle = document.querySelector("#pinTitle");
const pinHelper = document.querySelector("#pinHelper");
const pinInput = document.querySelector("#pinInput");
const pinSubmitButton = document.querySelector("#pinSubmitButton");
const pinError = document.querySelector("#pinError");
const browserReportPanel = document.querySelector("#browserReportPanel");
const browserReportOptions = document.querySelector("#browserReportOptions");
const fieldNotificationButton = document.querySelector("#fieldNotificationButton");
const fieldNotificationCount = document.querySelector("#fieldNotificationCount");
const fieldNotificationPanel = document.querySelector("#fieldNotificationPanel");
const fieldNotificationList = document.querySelector("#fieldNotificationList");
const fieldNotificationClose = document.querySelector("#fieldNotificationClose");
const themeToggleButton = document.querySelector("#themeToggleButton");
const languageToggleButton = document.querySelector("#languageToggleButton");
const changePasswordButton = document.querySelector("#changePasswordButton");
const changePasswordModal = document.querySelector("#changePasswordModal");
const changePasswordForm = document.querySelector("#changePasswordForm");
const currentPasswordInput = document.querySelector("#currentPasswordInput");
const settingsNewPasswordInput = document.querySelector("#settingsNewPasswordInput");
const settingsConfirmPasswordInput = document.querySelector("#settingsConfirmPasswordInput");
const changePasswordError = document.querySelector("#changePasswordError");
const closeChangePasswordButton = document.querySelector("#closeChangePasswordButton");
const cancelChangePasswordButton = document.querySelector("#cancelChangePasswordButton");
const saveChangedPasswordButton = document.querySelector("#saveChangedPasswordButton");
const settingsAccountStatus = document.querySelector("#settingsAccountStatus");
const changePinButton = document.querySelector("#changePinButton");
const lockAppButton = document.querySelector("#lockAppButton");
const signOutButton = document.querySelector("#signOutButton");
const settingsLocationList = document.querySelector("#settingsLocationList");
const settingsTradeList = document.querySelector("#settingsTradeList");
const settingsItemTradeSelect = document.querySelector("#settingsItemTradeSelect");
const settingsItemList = document.querySelector("#settingsItemList");
const bottomNav = document.querySelector(".bottom-nav");
const pageButtons = document.querySelectorAll("[data-page-target]");
const punchPageButton = document.querySelector('[data-page-target="punchListPage"]');
const appPages = document.querySelectorAll(".app-page");
const communitySelect = document.querySelector("#communitySelect");
const communityDetails = document.querySelector("#communityDetails");
const homesiteSelect = document.querySelector("#homesiteSelect");
const homesiteDetails = document.querySelector("#homesiteDetails");
const siteDocumentsModal = document.querySelector("#siteDocumentsModal");
const siteDocumentsTitle = document.querySelector("#siteDocumentsTitle");
const closeSiteDocumentsButton = document.querySelector("#closeSiteDocumentsButton");
const siteDocumentSearch = document.querySelector("#siteDocumentSearch");
const showDocumentUploadButton = document.querySelector("#showDocumentUploadButton");
const siteDocumentForm = document.querySelector("#siteDocumentForm");
const siteDocumentId = document.querySelector("#siteDocumentId");
const siteDocumentFileField = document.querySelector("#siteDocumentFileField");
const siteDocumentFile = document.querySelector("#siteDocumentFile");
const siteDocumentName = document.querySelector("#siteDocumentName");
const siteDocumentCategory = document.querySelector("#siteDocumentCategory");
const siteDocumentDate = document.querySelector("#siteDocumentDate");
const siteDocumentQuickAccess = document.querySelector("#siteDocumentQuickAccess");
const siteDocumentDescription = document.querySelector("#siteDocumentDescription");
const cancelSiteDocumentButton = document.querySelector("#cancelSiteDocumentButton");
const saveSiteDocumentButton = document.querySelector("#saveSiteDocumentButton");
const siteDocumentStatus = document.querySelector("#siteDocumentStatus");
const siteDocumentList = document.querySelector("#siteDocumentList");
const homesiteImportInput = document.querySelector("#homesiteImportInput");
const inlineSiteForm = document.querySelector("#inlineSiteForm");
const newSiteNameInput = document.querySelector("#newSiteNameInput");
const newSiteProjectSelect = document.querySelector("#newSiteProjectSelect");
const newSiteAddressInput = document.querySelector("#newSiteAddressInput");
const newSitePermitInput = document.querySelector("#newSitePermitInput");
const newSiteCustomFields = document.querySelector("#newSiteCustomFields");
const addSiteFieldButton = document.querySelector("#addSiteFieldButton");
const cancelSiteFormButton = document.querySelector("#cancelSiteFormButton");
const saveSiteFormButton = document.querySelector("#saveSiteFormButton");
const roomSelect = document.querySelector("#roomSelect");
const locationDetailInput = document.querySelector("#locationDetailInput");
const tradeSelect = document.querySelector("#tradeSelect");
const issueSelect = document.querySelector("#issueSelect");
const quickAddTradeButton = document.querySelector("#quickAddTradeButton");
const quickAddIssueButton = document.querySelector("#quickAddIssueButton");
const notesInput = document.querySelector("#notesInput");
const cameraInput = document.querySelector("#cameraInput");
const photoInput = document.querySelector("#photoInput");
const photoPreview = document.querySelector("#photoPreview");
const issueEntryForm = document.querySelector("#issueEntryForm");
const issueSubmitButton = document.querySelector("#addIssueButton");
const issueList = document.querySelector("#issueList");
const issueSortSelect = document.querySelector("#issueSortSelect");
const emailActions = document.querySelector("#emailActions");
const issueTemplate = document.querySelector("#issueTemplate");
const issueCount = document.querySelector("#issueCount");
const tradeCount = document.querySelector("#tradeCount");
const completedSection = document.querySelector("#completedSection");
const completedIssueList = document.querySelector("#completedIssueList");
const completedCount = document.querySelector("#completedCount");
const toggleCompletedButton = document.querySelector("#toggleCompletedButton");
const homeCommunityInput = document.querySelector("#homeCommunityInput");
const homeAddressInput = document.querySelector("#homeAddressInput");
const homebuyer1NameInput = document.querySelector("#homebuyer1NameInput");
const homebuyer1EmailInput = document.querySelector("#homebuyer1EmailInput");
const homebuyer2NameInput = document.querySelector("#homebuyer2NameInput");
const homebuyer2EmailInput = document.querySelector("#homebuyer2EmailInput");
const homeDetailsSaveStatus = document.querySelector("#homeDetailsSaveStatus");
const startNewHomeButton = document.querySelector("#startNewHomeButton");
const activeHomeList = document.querySelector("#activeHomeList");
const archivedHomeList = document.querySelector("#archivedHomeList");
const archivedHomeCount = document.querySelector("#archivedHomeCount");
const signoffCommunity = document.querySelector("#signoffCommunity");
const signoffAddress = document.querySelector("#signoffAddress");
const signoffBuyer1 = document.querySelector("#signoffBuyer1");
const signoffBuyer2 = document.querySelector("#signoffBuyer2");
const signoffCompletedCount = document.querySelector("#signoffCompletedCount");
const signoffOpenCount = document.querySelector("#signoffOpenCount");
const signoffCompletedItems = document.querySelector("#signoffCompletedItems");
const signoffOpenItems = document.querySelector("#signoffOpenItems");
const signoffStatus = document.querySelector("#signoffStatus");
const signatureBuyer1Name = document.querySelector("#signatureBuyer1Name");
const signatureBuyer1Email = document.querySelector("#signatureBuyer1Email");
const signatureBuyer1Image = document.querySelector("#signatureBuyer1Image");
const signatureBuyer2Name = document.querySelector("#signatureBuyer2Name");
const signatureBuyer2Email = document.querySelector("#signatureBuyer2Email");
const signatureBuyer2Image = document.querySelector("#signatureBuyer2Image");
const adoptBuyer1SignatureButton = document.querySelector("#adoptBuyer1SignatureButton");
const adoptBuyer2SignatureButton = document.querySelector("#adoptBuyer2SignatureButton");
const buyerTermsList = document.querySelector("#buyerTermsList");
const signatureModal = document.querySelector("#signatureModal");
const signatureModalTitle = document.querySelector("#signatureModalTitle");
const signatureCanvas = document.querySelector("#signatureCanvas");
const initialsCanvas = document.querySelector("#initialsCanvas");
const closeSignatureButton = document.querySelector("#closeSignatureButton");
const clearSignatureButton = document.querySelector("#clearSignatureButton");
const clearInitialsButton = document.querySelector("#clearInitialsButton");
const acceptSignatureButton = document.querySelector("#acceptSignatureButton");
const acceptHomeButton = document.querySelector("#acceptHomeButton");
const archiveHomeButton = document.querySelector("#archiveHomeButton");
const acceptanceNote = document.querySelector("#acceptanceNote");
const nhoCommunity = document.querySelector("#nhoCommunity");
const nhoAddress = document.querySelector("#nhoAddress");
const nhoBuyer1 = document.querySelector("#nhoBuyer1");
const nhoBuyer2 = document.querySelector("#nhoBuyer2");
const nhoItemCount = document.querySelector("#nhoItemCount");
const nhoItemList = document.querySelector("#nhoItemList");
const nhoSignoffStatus = document.querySelector("#nhoSignoffStatus");
const nhoSignatureBuyer1Name = document.querySelector("#nhoSignatureBuyer1Name");
const nhoSignatureBuyer1Email = document.querySelector("#nhoSignatureBuyer1Email");
const nhoSignatureBuyer1Image = document.querySelector("#nhoSignatureBuyer1Image");
const nhoSignatureBuyer2Name = document.querySelector("#nhoSignatureBuyer2Name");
const nhoSignatureBuyer2Email = document.querySelector("#nhoSignatureBuyer2Email");
const nhoSignatureBuyer2Image = document.querySelector("#nhoSignatureBuyer2Image");
const acceptNhoButton = document.querySelector("#acceptNhoButton");
const nhoAcceptanceNote = document.querySelector("#nhoAcceptanceNote");
const contactSearch = document.querySelector("#contactSearch");
const contactTradeFilter = document.querySelector("#contactTradeFilter");
const contactList = document.querySelector("#contactList");
const contactCount = document.querySelector("#contactCount");
const contactFormPanel = document.querySelector("#contactFormPanel");
const contactForm = document.querySelector("#contactForm");
const contactTradeTypeInput = document.querySelector("#contactTradeTypeInput");
const contactVendorInput = document.querySelector("#contactVendorInput");
const contactJobDescInput = document.querySelector("#contactJobDescInput");
const contactNameInput = document.querySelector("#contactNameInput");
const contactEmailInput = document.querySelector("#contactEmailInput");
const contactPhoneInput = document.querySelector("#contactPhoneInput");
const contactAlternateInput = document.querySelector("#contactAlternateInput");
const infoSearch = document.querySelector("#infoSearch");
const infoCommunityFilter = document.querySelector("#infoCommunityFilter");
const homesiteInfoList = document.querySelector("#homesiteInfoList");
const infoCount = document.querySelector("#infoCount");
const allCommunityFilter = document.querySelector("#allCommunityFilter");
const allSiteFilter = document.querySelector("#allSiteFilter");
const allTradeFilter = document.querySelector("#allTradeFilter");
const allReportsCount = document.querySelector("#allReportsCount");
const allTradeReportLinkActions = document.querySelector("#allTradeReportLinkActions");
const allReportIssueList = document.querySelector("#allReportIssueList");
let selectedPhotos = [];
let editingIssueId = "";
let activeSignatureBuyer = 0;
let activeSignatureLineType = "";
let activeSignatureTermId = "";
let activeSignatureDocument = "final";
let signatureDrawingCanvas = null;
let signatureHasInk = false;
let initialsHaveInk = false;
let homeDetailsSyncTimer;
let siteDocumentFilter = "";
const siteDocumentBucket = "site-documents";
const itemPhotoBucket = "item-photos";
const uploadSecurity = window.PUNCH_LOGIC_UPLOAD_SECURITY;
const maxSiteDocumentBytes = uploadSecurity?.maxDocumentBytes || 25 * 1024 * 1024;
const allowedSiteDocumentTypes = uploadSecurity?.documentTypes || new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
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
let currentSupabaseProfile = null;
let currentProfileAccessError = "";
let currentLanguage = "en";
let languageObserver = null;
let localizedDialogsInstalled = false;
const languageTextSources = new WeakMap();
const languageAttributeSources = new WeakMap();

function appCopy(value) {
  const text = String(value ?? "");
  return text
    .replace(/\bTrades\b/g, "Crews")
    .replace(/\btrades\b/g, "crews")
    .replace(/\bTrade\b/g, "Crew")
    .replace(/\btrade\b/g, "crew");
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

const spanishUiText = Object.freeze({
  "Secure Access": "Acceso seguro",
  "Secure Login": "Inicio de sesión seguro",
  "Website login": "Inicio de sesión web",
  "PIN security": "Seguridad con PIN",
  "App navigation": "Navegación de la aplicación",
  "Open Punch Logic website": "Abrir el sitio web de Punch Logic",
  "Enter your email and password to open the app.": "Ingresa tu correo electrónico y contraseña para abrir la aplicación.",
  "Email": "Correo electrónico",
  "Password": "Contraseña",
  "Show password": "Mostrar contraseña",
  "Hide password": "Ocultar contraseña",
  "Sign in": "Iniciar sesión",
  "Signing in...": "Iniciando sesión...",
  "Sign Out": "Cerrar sesión",
  "Change Password": "Cambiar contraseña",
  "Account Security": "Seguridad de la cuenta",
  "Enter your current password and choose a new password.": "Ingresa tu contraseña actual y elige una nueva contraseña.",
  "Current password": "Contraseña actual",
  "New password": "Nueva contraseña",
  "Confirm password": "Confirmar contraseña",
  "Save password": "Guardar contraseña",
  "Close change password": "Cerrar cambio de contraseña",
  "Your password was changed.": "Tu contraseña fue cambiada.",
  "Enter your current password.": "Ingresa tu contraseña actual.",
  "Password must be at least 8 characters.": "La contraseña debe tener al menos 8 caracteres.",
  "Passwords do not match.": "Las contraseñas no coinciden.",
  "New password must be different from current password.": "La nueva contraseña debe ser diferente de la contraseña actual.",
  "Incorrect current password.": "La contraseña actual es incorrecta.",
  "Password change is not available right now.": "El cambio de contraseña no está disponible en este momento.",
  "Create PIN": "Crear PIN",
  "Enter PIN": "Ingresar PIN",
  "Choose a PIN for this app on this device.": "Elige un PIN para esta aplicación en este dispositivo.",
  "Enter your PIN to open the app.": "Ingresa tu PIN para abrir la aplicación.",
  "Save PIN": "Guardar PIN",
  "Unlock": "Desbloquear",
  "Change PIN": "Cambiar PIN",
  "Lock App": "Bloquear aplicación",
  "Light Mode": "Modo claro",
  "Dark Mode": "Modo oscuro",
  "Site Punch List": "Lista de pendientes del sitio",
  "Punch": "Pendientes",
  "Dashboard": "Panel",
  "Settings": "Configuración",
  "Project": "Proyecto",
  "Projects": "Proyectos",
  "Site": "Sitio",
  "Sites": "Sitios",
  "Site name": "Nombre del sitio",
  "Site address": "Dirección del sitio",
  "Add site form": "Formulario para agregar sitio",
  "Site summary": "Resumen del sitio",
  "Add": "Agregar",
  "Add field": "Agregar campo",
  "Add item": "Agregar pendiente",
  "Save item edits": "Guardar cambios del pendiente",
  "Saving item edits...": "Guardando cambios del pendiente...",
  "Add contact": "Agregar contacto",
  "Add document": "Agregar documento",
  "Rename": "Editar",
  "Cancel": "Cancelar",
  "Clear": "Borrar",
  "Save": "Guardar",
  "Saving...": "Guardando...",
  "Saving photos...": "Guardando fotos...",
  "Save site": "Guardar sitio",
  "Save contact": "Guardar contacto",
  "Save changes": "Guardar cambios",
  "Save note": "Guardar nota",
  "Import .XLSX": "Importar .XLSX",
  "Download .XLSX": "Descargar .XLSX",
  "Location": "Ubicación",
  "Locations": "Ubicaciones",
  "Location detail": "Detalle de ubicación",
  "Exact area, floor, grid, or note": "Área exacta, piso, cuadrícula o nota",
  "Crew": "Cuadrilla",
  "Crews": "Cuadrillas",
  "Item": "Pendiente",
  "Issue": "Pendiente",
  "Items": "Pendientes",
  "Edit item": "Editar pendiente",
  "Edit Issue": "Editar pendiente",
  "Issue notes": "Notas del pendiente",
  "Items Dashboard": "Panel de pendientes",
  "Open Items": "Pendientes abiertos",
  "open items": "pendientes abiertos",
  "Completed Items": "Pendientes completados",
  "Completed items": "Pendientes completados",
  "Item list": "Lista de pendientes",
  "Manage items": "Administrar pendientes",
  "Manage locations": "Administrar ubicaciones",
  "Manage crews": "Administrar cuadrillas",
  "Sort": "Ordenar",
  "Sort items": "Ordenar pendientes",
  "Added": "Agregado",
  "Added by -": "Agregado por -",
  "Date Added -": "Fecha agregada -",
  "Notes": "Notas",
  "Notes:": "Notas:",
  "No notes added.": "No se agregaron notas.",
  "Shared notes": "Notas compartidas",
  "Add notes for this item": "Agregar notas para este pendiente",
  "Not recorded": "No registrado",
  "Not assigned": "No asignado",
  "Not provided": "No proporcionado",
  "Mark Complete": "Marcar como completado",
  "Uncomplete": "Reabrir",
  "Mark complete": "Marcar como completado",
  "Crew marked complete": "Cuadrilla marcada como completada",
  "Notifications": "Notificaciones",
  "Crew report notifications": "Notificaciones de reportes de cuadrilla",
  "Completion photo uploaded": "Foto de finalización subida",
  "Crew note added": "Nota de cuadrilla agregada",
  "No crew report notifications yet.": "Aún no hay notificaciones de reportes de cuadrilla.",
  "Crew done": "Cuadrilla terminada",
  "crews assigned": "cuadrillas asignadas",
  "Show": "Mostrar",
  "Hide": "Ocultar",
  "Filter": "Filtro",
  "Contacts": "Contactos",
  "Search contacts": "Buscar contactos",
  "All contacts": "Todos los contactos",
  "No contacts found.": "No se encontraron contactos.",
  "Name": "Nombre",
  "Company": "Empresa",
  "Job Desc": "Descripción del trabajo",
  "Phone": "Teléfono",
  "Alternative contact": "Contacto alternativo",
  "Alternative": "Alternativo",
  "Address": "Dirección",
  "Permit": "Permiso",
  "Permit number": "Número de permiso",
  "Site Info": "Información del sitio",
  "Site info filters": "Filtros de información del sitio",
  "Search site, address, permit": "Buscar sitio, dirección o permiso",
  "Documents": "Documentos",
  "Site documents": "Documentos del sitio",
  "Search documents": "Buscar documentos",
  "Close documents": "Cerrar documentos",
  "File": "Archivo",
  "Document name": "Nombre del documento",
  "Document Type": "Tipo de documento",
  "Document date": "Fecha del documento",
  "Quick Access": "Acceso rápido",
  "Show a direct button on the site card.": "Mostrar un botón directo en la tarjeta del sitio.",
  "Description": "Descripción",
  "Optional document notes": "Notas opcionales del documento",
  "Upload document": "Subir documento",
  "Saving document details...": "Guardando detalles del documento...",
  "Uploading document...": "Subiendo documento...",
  "Uploading...": "Subiendo...",
  "Document uploaded.": "Documento subido.",
  "Document details saved.": "Detalles del documento guardados.",
  "Document deleted.": "Documento eliminado.",
  "Open document": "Abrir documento",
  "Edit document": "Editar documento",
  "Delete document": "Eliminar documento",
  "PDF, JPG, PNG, or WebP. Maximum 25 MB.": "PDF, JPG, PNG o WebP. Máximo 25 MB.",
  "Example: Electrical Floor Plan": "Ejemplo: Plano eléctrico",
  "Example: Permit or Blueprint": "Ejemplo: Permiso o plano",
  "Pictures": "Fotos",
  "Take photo": "Tomar foto",
  "Choose pictures": "Elegir fotos",
  "Preparing pictures...": "Preparando fotos...",
  "Item Photo": "Foto del pendiente",
  "Completion Photo": "Foto de finalización",
  "Site Reports": "Reportes del sitio",
  "Site reports": "Reportes del sitio",
  "Share PDF": "Compartir PDF",
  "Share Site PDF": "Compartir PDF del sitio",
  "DL PDF": "Descargar PDF",
  "Download PDF": "Descargar PDF",
  "Web Report": "Reporte web",
  "Open Browser Report": "Abrir reporte web",
  "Send by crew": "Enviar por cuadrilla",
  "Send items to crews": "Enviar pendientes a las cuadrillas",
  "Creates one message for this site with only the selected crew's items.": "Crea un mensaje para este sitio solamente con los pendientes de la cuadrilla seleccionada.",
  "Crew Punch List": "Lista de pendientes por cuadrilla",
  "All projects": "Todos los proyectos",
  "All sites": "Todos los sitios",
  "All crews": "Todas las cuadrillas",
  "No projects loaded": "No hay proyectos cargados",
  "No sites loaded": "No hay sitios cargados",
  "No sites match those filters.": "Ningún sitio coincide con esos filtros.",
  "No open issues match those filters.": "Ningún pendiente abierto coincide con esos filtros.",
  "No documents added to this site yet.": "Todavía no hay documentos agregados a este sitio.",
  "No items added for this site yet.": "Todavía no hay pendientes agregados a este sitio.",
  "All items for this site are complete.": "Todos los pendientes de este sitio están completados.",
  "Add a project site or load sites from Excel.": "Agrega un sitio al proyecto o carga sitios desde Excel.",
  "Select a site first.": "Primero selecciona un sitio.",
  "Add items to create crew reports.": "Agrega pendientes para crear reportes por cuadrilla.",
  "Add open items to create crew report links.": "Agrega pendientes abiertos para crear enlaces de reportes por cuadrilla.",
  "Add items to send crew reports": "Agrega pendientes para enviar reportes por cuadrilla",
  "Other": "Otro",
  "Lobby": "Vestíbulo",
  "Reception": "Recepción",
  "Open Office": "Oficina abierta",
  "Private Office": "Oficina privada",
  "Conference Room": "Sala de conferencias",
  "Break Room": "Sala de descanso",
  "Restroom": "Baño",
  "Corridor": "Pasillo",
  "Stairwell": "Escalera",
  "Elevator Lobby": "Vestíbulo de elevadores",
  "Mechanical Room": "Cuarto mecánico",
  "Electrical Room": "Cuarto eléctrico",
  "IT / Server Room": "Cuarto de TI / servidores",
  "Storage Room": "Almacén",
  "Warehouse": "Bodega",
  "Loading Dock": "Muelle de carga",
  "Roof": "Techo",
  "Parking Area": "Estacionamiento",
  "Sidewalk": "Acera",
  "Building Exterior": "Exterior del edificio",
  "Site Perimeter": "Perímetro del sitio",
  "Framing": "Estructura",
  "Roofing": "Techos",
  "Glazing": "Vidrios",
  "Masonry": "Mampostería",
  "Electric": "Electricidad",
  "Plumbing": "Plomería",
  "Fire Suppression": "Sistema contra incendios",
  "Drywall": "Paneles de yeso",
  "Tile": "Azulejos",
  "Flooring": "Pisos",
  "Carpentry": "Carpintería",
  "Specialty trim": "Acabados especiales",
  "Low Voltage": "Bajo voltaje",
  "Landscape": "Paisajismo",
  "Work incomplete": "Trabajo incompleto",
  "Missing material or component": "Falta material o componente",
  "Damaged material or finish": "Material o acabado dañado",
  "Incorrect material or product": "Material o producto incorrecto",
  "Poor workmanship": "Trabajo de mala calidad",
  "Out of alignment or not level": "Desalineado o fuera de nivel",
  "Not per plans or specifications": "No cumple con los planos o especificaciones",
  "Code or inspection correction": "Corrección de código o inspección",
  "Access or clearance issue": "Problema de acceso o espacio libre",
  "Sealant, caulk, or firestop needed": "Se necesita sellador, calafateo o cortafuego",
  "Touch-up or finish repair": "Retoque o reparación de acabado",
  "Cleanup needed": "Se necesita limpieza",
  "Supabase login is not configured.": "El inicio de sesión de Supabase no está configurado.",
  "Login is not available right now.": "El inicio de sesión no está disponible en este momento.",
  "Enter email and password.": "Ingresa el correo electrónico y la contraseña.",
  "Incorrect email or password.": "El correo electrónico o la contraseña son incorrectos.",
  "Use at least 4 numbers.": "Usa al menos 4 números.",
  "Incorrect PIN.": "El PIN es incorrecto.",
  "PIN updated.": "PIN actualizado.",
  "Enter current PIN": "Ingresa el PIN actual",
  "Enter new PIN": "Ingresa el nuevo PIN",
  "New location name": "Nombre de la nueva ubicación",
  "New crew name": "Nombre de la nueva cuadrilla",
  "Project name": "Nombre del proyecto",
  "Rename project": "Renombrar proyecto",
  "Rename site": "Renombrar sitio",
  "Location name": "Nombre de la ubicación",
  "Crew name": "Nombre de la cuadrilla",
  "Copy report link": "Copiar enlace del reporte",
  "Field Name": "Nombre del campo",
  "Value": "Valor",
  "Add details or photo reference": "Agrega detalles o una foto de referencia",
  "Remove": "Eliminar",
  "Delete": "Eliminar",
  "Edit": "Editar",
  "Open": "Abrir"
});

function initializeLanguage() {
  currentLanguage = localStorage.getItem(languageStorageKey) === "es" ? "es" : "en";
  installLocalizedDialogs();
  refreshLanguageDom();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "es" ? "en" : "es";
  localStorage.setItem(languageStorageKey, currentLanguage);
  refreshLanguageDom();
}

function refreshLanguageDom() {
  languageObserver?.disconnect();
  document.documentElement.lang = currentLanguage === "es" ? "es-419" : "en";
  translateLanguageTree(document.body, false);
  languageToggleButton.textContent = currentLanguage === "es" ? "English" : "Español";
  const languageAction = currentLanguage === "es" ? "Cambiar a inglés" : "Switch to Spanish";
  languageToggleButton.setAttribute("aria-label", languageAction);
  languageToggleButton.title = languageAction;
  observeLanguageChanges();
}

function observeLanguageChanges() {
  if (!languageObserver) languageObserver = new MutationObserver(handleLanguageMutations);
  languageObserver.takeRecords();
  languageObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "aria-label", "title"]
  });
}

function handleLanguageMutations(records) {
  languageObserver?.disconnect();
  records.forEach((record) => {
    if (record.type === "characterData") translateLanguageTextNode(record.target, true);
    if (record.type === "attributes") translateLanguageAttributes(record.target, true, [record.attributeName]);
    record.addedNodes?.forEach((node) => translateLanguageTree(node, true));
  });
  observeLanguageChanges();
}

function translateLanguageTree(root, sourceIsCurrent = false) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateLanguageTextNode(root, sourceIsCurrent);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest?.("[data-i18n-skip]")) return;

  translateLanguageAttributes(root, sourceIsCurrent);
  root.querySelectorAll?.("[placeholder], [aria-label], [title]").forEach((element) => {
    if (!element.closest("[data-i18n-skip]")) translateLanguageAttributes(element, sourceIsCurrent);
  });

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEMPLATE"].includes(parent.tagName) || parent.closest("[data-i18n-skip]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) translateLanguageTextNode(walker.currentNode, sourceIsCurrent);
}

function translateLanguageTextNode(node, sourceIsCurrent = false) {
  if (!node?.nodeValue || node.parentElement?.closest("[data-i18n-skip]")) return;
  if (sourceIsCurrent || !languageTextSources.has(node)) languageTextSources.set(node, node.nodeValue);
  node.nodeValue = translateUiText(languageTextSources.get(node));
}

function translateLanguageAttributes(element, sourceIsCurrent = false, attributes = ["placeholder", "aria-label", "title"]) {
  if (!element?.hasAttribute || element.closest("[data-i18n-skip]")) return;
  const sources = languageAttributeSources.get(element) || {};
  attributes.forEach((attribute) => {
    if (!attribute || !element.hasAttribute(attribute)) return;
    if (sourceIsCurrent || !Object.prototype.hasOwnProperty.call(sources, attribute)) {
      sources[attribute] = element.getAttribute(attribute);
    }
    element.setAttribute(attribute, translateUiText(sources[attribute]));
  });
  languageAttributeSources.set(element, sources);
}

function translateUiText(value) {
  const source = String(value ?? "");
  if (currentLanguage !== "es") return source;
  const trimmed = source.trim();
  if (!trimmed) return source;
  const translated = spanishUiText[trimmed]
    || window.PUNCH_LOGIC_SETTING_TRANSLATIONS?.[trimmed]
    || translateSpanishPattern(trimmed);
  return translated === trimmed ? source : source.replace(trimmed, translated);
}

function translateSpanishPattern(value) {
  const actionMatch = /^(Edit|Delete|Open|Remove) (.+)$/.exec(value);
  if (actionMatch) {
    const action = spanishUiText[actionMatch[1]] || actionMatch[1];
    const target = spanishUiText[actionMatch[2]] || window.PUNCH_LOGIC_SETTING_TRANSLATIONS?.[actionMatch[2]] || actionMatch[2];
    return `${action} ${target}`;
  }
  const patterns = [
    [/^(\d+) sites loaded$/, "$1 sitios cargados"],
    [/^Permit \((\d+)\)$/, "Permiso ($1)"],
    [/^Blueprints \((\d+)\)$/, "Planos ($1)"],
    [/^Documents \((\d+)\)$/, "Documentos ($1)"],
    [/^(.+) all sites$/, "$1 - todos los sitios"],
    [/^(.+) documents$/, "$1 - documentos"],
    [/^No (.+) documents found\.$/, "No se encontraron documentos de $1."],
    [/^New issue option for (.+)$/, "Nueva opción de pendiente para $1"],
    [/^Item name for (.+)$/, "Nombre del pendiente para $1"],
    [/^Delete location \"(.+)\"\?$/, "¿Eliminar la ubicación \"$1\"?"],
    [/^Delete trade \"(.+)\"\?$/, "¿Eliminar la especialidad \"$1\"?"],
    [/^Delete crew \"(.+)\"\?$/, "¿Eliminar la cuadrilla \"$1\"?"],
    [/^Delete item \"(.+)\" from (.+)\?$/, "¿Eliminar el pendiente \"$1\" de $2?"],
    [/^Clear all items for (.+)\?$/, "¿Borrar todos los pendientes de $1?"],
    [/^Delete this item from (.+)\?$/, "¿Eliminar este pendiente de $1?"],
    [/^Selected item photo (\d+)$/, "Foto seleccionada del pendiente $1"],
    [/^Imported (\d+) sites from (.+)\.$/, "Se importaron $1 sitios desde $2."],
    [/^(.+) documents found\.$/, "Documentos encontrados: $1."],
    [/^Add or import a site before adding items\.$/, "Agrega o importa un sitio antes de agregar pendientes."],
    [/^There are no open items for this (trade|crew)\.$/, "No hay pendientes abiertos para esta especialidad o cuadrilla."],
    [/^There are no open items for this site\.$/, "No hay pendientes abiertos para este sitio."],
    [/^Add items to this site before creating a site PDF\.$/, "Agrega pendientes a este sitio antes de crear el PDF."],
    [/^Delete (.+)\?$/, "¿Eliminar $1?"]
  ];
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  return value;
}

function installLocalizedDialogs() {
  if (localizedDialogsInstalled) return;
  localizedDialogsInstalled = true;
  const nativePrompt = window.prompt.bind(window);
  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  window.prompt = (message, defaultValue) => nativePrompt(translateUiText(message), defaultValue);
  window.alert = (message) => nativeAlert(translateUiText(message));
  window.confirm = (message) => nativeConfirm(translateUiText(message));
}

function getConfiguredOrganizationId() {
  const value = String(supabaseConfig.organizationId || "").trim();
  if (!value || value.includes("client-organization") || value.includes("your-organization")) return "";
  return value;
}

function getActiveOrganizationId(profile = currentSupabaseProfile) {
  const configuredOrganizationId = getConfiguredOrganizationId();
  const profileOrganizationId = String(profile?.organization_id || "").trim();
  if (configuredOrganizationId && profileOrganizationId && configuredOrganizationId !== profileOrganizationId) return "";
  return configuredOrganizationId || profileOrganizationId;
}

function profileMatchesConfiguredOrganization(profile) {
  const configuredOrganizationId = getConfiguredOrganizationId();
  return !configuredOrganizationId || !profile?.organization_id || configuredOrganizationId === profile.organization_id;
}

function createSyncError(error, fallback) {
  const syncError = new Error(error?.message || fallback || "Sync failed.");
  syncError.code = /SYNC_CONFLICT/i.test(syncError.message) ? "SYNC_CONFLICT" : error?.code;
  syncError.retryable = !["42501", "P0002"].includes(error?.code) && syncError.code !== "SYNC_CONFLICT";
  return syncError;
}

function cacheSupabaseProfile(profile) {
  if (!profile?.id) return;
  try { localStorage.setItem(cachedProfileStorageKey, JSON.stringify(profile)); } catch { /* Offline access still works for this page. */ }
}

function loadCachedSupabaseProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(cachedProfileStorageKey) || "null");
    return profile?.id ? profile : null;
  } catch {
    return null;
  }
}

function initializeMainOfflineSync() {
  if (!fieldDriveSupabase || !window.PUNCH_LOGIC_OFFLINE_SYNC || mainOfflineSync) return mainOfflineSyncReady;
  mainOfflineSync = window.PUNCH_LOGIC_OFFLINE_SYNC;
  const scopeId = getConfiguredOrganizationId() || supabaseConfig.clientName || "client";
  mainOfflineSyncReady = mainOfflineSync.initialize({
    scope: `main:${scopeId}`,
    handlers: {
      "item.create": syncQueuedItemCreate,
      "item.patch": syncQueuedItemPatch,
      "photo.upload": syncQueuedPhotoUpload,
      "document.create": syncQueuedDocumentCreate,
      "document.patch": syncQueuedDocumentPatch
    }
  }).then(restorePendingMainOperations);
  return mainOfflineSyncReady;
}

async function syncQueuedItemCreate(operation) {
  const { error } = await fieldDriveSupabase.from("punch_items").insert(operation.payload.row);
  if (error && error.code !== "23505") throw createSyncError(error, "Item upload failed.");
  const record = findIssueRecord(operation.entityId);
  if (record?.issue) {
    record.issue.source = "Supabase";
    record.issue.updatedAt ||= operation.clientUpdatedAt;
    saveState();
  }
  return { id: operation.entityId };
}

async function syncQueuedItemPatch(operation) {
  const { data, error } = await fieldDriveSupabase.rpc("apply_punch_item_patch", {
    p_organization_id: operation.payload.organizationId,
    p_mutation_id: operation.id,
    p_item_id: operation.entityId,
    p_patch: operation.payload.patch,
    p_base_updated_at: operation.baseUpdatedAt || null,
    p_client_updated_at: operation.clientUpdatedAt
  });
  if (error) throw createSyncError(error, "Item update failed.");
  const record = findIssueRecord(operation.entityId);
  if (record?.issue) record.issue.updatedAt = data?.updated_at || operation.clientUpdatedAt;
  return data;
}

async function syncQueuedPhotoUpload(operation) {
  const payload = operation.payload;
  const response = await fetch("/.netlify/functions/photo", {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify({ ...payload.photo, photoId: operation.id, organizationId: payload.organizationId, itemId: payload.itemId })
  });
  let result = {};
  try { result = await response.json(); } catch { /* Use the status message below. */ }
  if (!response.ok) {
    const error = new Error(result.error || `Photo upload failed with status ${response.status}.`);
    error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
    throw error;
  }

  const { error } = await fieldDriveSupabase.from("item_photos").upsert({
    id: operation.id,
    organization_id: payload.organizationId,
    item_id: payload.itemId,
    storage_path: result.id,
    file_name: result.name || payload.photo.name || "photo.jpg",
    content_type: result.type || payload.photo.type || "image/jpeg",
    completion_proof: Boolean(payload.completionProof)
  }, { onConflict: "id" });
  if (error) throw createSyncError(error, "Photo details could not be saved.");

  const record = findIssueRecord(payload.itemId);
  const localPhoto = record?.issue?.photos?.find((photo) => photo.localOperationId === operation.id);
  if (localPhoto) Object.assign(localPhoto, result, { dataUrl: "", localOperationId: "", completionProof: Boolean(payload.completionProof) });
  saveState();
  render();
  return result;
}

async function syncQueuedDocumentCreate(operation) {
  const payload = operation.payload;
  const upload = await fieldDriveSupabase.storage.from(siteDocumentBucket).upload(payload.storagePath, payload.file, {
    contentType: payload.row.content_type,
    upsert: true
  });
  if (upload.error) throw createSyncError(upload.error, "Document upload failed.");
  const { data, error } = await fieldDriveSupabase
    .from("site_documents")
    .upsert(payload.row, { onConflict: "id" })
    .select("id, site_id, title, category, description, document_date, quick_access, storage_path, file_name, content_type, size_bytes, uploaded_by, created_at, updated_at")
    .single();
  if (error) throw createSyncError(error, "Document details could not be saved.");
  replaceLocalDocument(operation.entityId, normalizeSiteDocument(data));
  return data;
}

async function syncQueuedDocumentPatch(operation) {
  const { data, error } = await fieldDriveSupabase.rpc("apply_site_document_patch", {
    p_organization_id: operation.payload.organizationId,
    p_mutation_id: operation.id,
    p_document_id: operation.entityId,
    p_patch: operation.payload.patch,
    p_base_updated_at: operation.baseUpdatedAt || null,
    p_client_updated_at: operation.clientUpdatedAt
  });
  if (error) throw createSyncError(error, "Document update failed.");
  replaceLocalDocument(operation.entityId, normalizeSiteDocument(data));
  return data;
}

function replaceLocalDocument(documentId, documentRow) {
  for (const community of state.communities || []) {
    for (const homesite of community.homesites || []) {
      const index = (homesite.documents || []).findIndex((document) => document.id === documentId);
      if (index < 0) continue;
      homesite.documents[index] = documentRow;
      saveState();
      if (homesite.id === state.currentHomesiteId) renderHomesiteDetails(homesite);
      return;
    }
  }
}

async function restorePendingMainOperations() {
  if (!mainOfflineSync) return;
  const operations = await mainOfflineSync.getOperations({ pendingOnly: true });
  operations.forEach((operation) => {
    if (operation.kind === "photo.upload") {
      const record = findIssueRecord(operation.payload.itemId);
      if (record?.issue && !(record.issue.photos || []).some((photo) => photo.localOperationId === operation.id)) {
        record.issue.photos = [...(record.issue.photos || []), { ...operation.payload.photo, id: `local:${operation.id}`, localOperationId: operation.id, completionProof: Boolean(operation.payload.completionProof) }];
      }
    }
    if (operation.kind === "item.patch") applyQueuedItemPatchLocally(operation);
    if (operation.kind === "document.create") {
      const homesite = findHomesiteById(operation.payload.row.site_id);
      if (homesite && !(homesite.documents || []).some((document) => document.id === operation.id)) {
        homesite.documents ||= [];
        homesite.documents.unshift(normalizeSiteDocument({ ...operation.payload.row, created_at: operation.createdAt, updated_at: operation.clientUpdatedAt }));
      }
    }
  });
  if (operations.length) {
    saveState();
    render();
  }
}

function applyQueuedItemPatchLocally(operation) {
  const issue = findIssueRecord(operation.entityId)?.issue;
  if (!issue) return;
  const patch = operation.payload.patch || {};
  if ("location" in patch) issue.room = patch.location;
  if ("location_area" in patch) issue.locationArea = patch.location_area;
  if ("location_detail" in patch) issue.locationDetail = patch.location_detail;
  if ("trade" in patch) issue.trade = patch.trade;
  if ("item" in patch) issue.issue = patch.item;
  if ("notes" in patch) issue.notes = patch.notes;
  if ("shared_note" in patch) issue.sharedNote = patch.shared_note;
  if ("completed" in patch) issue.completed = Boolean(patch.completed);
  if ("completed_at" in patch) issue.completedAt = patch.completed_at || "";
  if ("trade_completed" in patch) issue.tradeCompleted = Boolean(patch.trade_completed);
  if ("trade_completed_at" in patch) issue.tradeCompletedAt = patch.trade_completed_at || "";
  issue.updatedAt = operation.clientUpdatedAt;
}

function findHomesiteById(siteId) {
  for (const community of state.communities || []) {
    const homesite = (community.homesites || []).find((site) => site.id === siteId);
    if (homesite) return homesite;
  }
  return null;
}

async function queueItemPatch(record, patch, baseUpdatedAt = record.issue.updatedAt || record.issue.createdAt || "") {
  await initializeMainOfflineSync();
  const organizationId = getActiveOrganizationId(await getCurrentSupabaseProfile());
  if (!organizationId) throw new Error("This login needs a profile before changes can sync.");
  const itemOperations = await mainOfflineSync.getOperations({ entityId: record.issue.id, pendingOnly: true });
  const createOperation = itemOperations.find((operation) => operation.kind === "item.create");
  return mainOfflineSync.enqueue({
    kind: "item.patch",
    entityType: "punch_item",
    entityId: record.issue.id,
    coalesceKey: `item.patch:${record.issue.id}`,
    dependsOn: createOperation ? [createOperation.id] : [],
    baseUpdatedAt: baseUpdatedAt || record.issue.createdAt || "",
    clientUpdatedAt: record.issue.updatedAt || new Date().toISOString(),
    payload: { organizationId, patch }
  });
}

authLoginButton.addEventListener("click", loginWithPassword);
forgotPasswordButton.addEventListener("click", requestPasswordReset);
saveNewPasswordButton.addEventListener("click", completePasswordReset);
authPasswordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginWithPassword();
});
pinSubmitButton.addEventListener("click", submitPin);
pinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") submitPin();
});
themeToggleButton.addEventListener("click", toggleTheme);
languageToggleButton.addEventListener("click", toggleLanguage);
fieldNotificationButton.addEventListener("click", toggleFieldNotifications);
fieldNotificationClose.addEventListener("click", closeFieldNotifications);
fieldNotificationList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-field-notification-id]");
  if (button) openFieldNotification(button.dataset.fieldNotificationId);
});
document.addEventListener("click", closeTransientPanelsOnOutsideClick);
changePasswordButton.addEventListener("click", openChangePassword);
changePasswordForm.addEventListener("submit", changeAccountPassword);
closeChangePasswordButton.addEventListener("click", closeChangePassword);
cancelChangePasswordButton.addEventListener("click", closeChangePassword);
changePasswordModal.addEventListener("click", (event) => {
  if (event.target === changePasswordModal) closeChangePassword();
});
signOutButton.addEventListener("click", signOutPassword);
pageButtons.forEach((button) => button.addEventListener("click", () => handlePageButtonClick(button)));
[homeCommunityInput, homeAddressInput, homebuyer1NameInput, homebuyer1EmailInput, homebuyer2NameInput, homebuyer2EmailInput]
  .forEach((input) => input.addEventListener("input", saveHomeDetailsFromForm));
startNewHomeButton.addEventListener("click", startNewHome);
activeHomeList.addEventListener("click", handleActiveHomeListClick);
archivedHomeList.addEventListener("click", handleArchivedHomeListClick);
document.querySelectorAll("[data-adopt-signature-for]").forEach((button) => {
  button.addEventListener("click", () => openSignatureTool(Number(button.dataset.adoptSignatureFor)));
});
document.querySelectorAll("[data-apply-mark-for]").forEach((button) => {
  button.addEventListener("click", () => applyAdoptedMark(
    Number(button.dataset.applyMarkFor),
    button.dataset.markType,
    "",
    button.dataset.signatureDocument || "final"
  ));
});
buyerTermsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-term-initial-for]");
  if (!button) return;
  applyAdoptedMark(Number(button.dataset.termInitialFor), "initials", button.dataset.termId);
});
closeSignatureButton.addEventListener("click", closeSignatureTool);
clearSignatureButton.addEventListener("click", clearSignatureCanvas);
clearInitialsButton.addEventListener("click", clearInitialsCanvas);
acceptSignatureButton.addEventListener("click", acceptDrawnSignature);
signatureModal.addEventListener("click", (event) => {
  if (event.target === signatureModal) closeSignatureTool();
});
installDrawingCanvasEvents(signatureCanvas);
installDrawingCanvasEvents(initialsCanvas);
window.addEventListener("resize", resizeSignatureCanvas);
acceptHomeButton.addEventListener("click", acceptHomeAndCreatePdf);
acceptNhoButton.addEventListener("click", acceptNhoAndCreatePdf);
archiveHomeButton.addEventListener("click", archiveAcceptedHome);
changePinButton.addEventListener("click", changePin);
lockAppButton.addEventListener("click", lockApp);
document.querySelector("#addCommunityButton").addEventListener("click", addCommunity);
document.querySelector("#renameCommunityButton").addEventListener("click", renameCommunity);
document.querySelector("#addHomesiteButton").addEventListener("click", addHomesite);
addSiteFieldButton.addEventListener("click", () => addSiteCustomFieldRow());
cancelSiteFormButton.addEventListener("click", closeInlineSiteForm);
saveSiteFormButton.addEventListener("click", saveInlineSiteForm);
newSiteCustomFields.addEventListener("click", removeSiteCustomFieldRow);
document.querySelector("#importHomesitesButton").addEventListener("click", () => homesiteImportInput.click());
homesiteImportInput.addEventListener("change", importHomesitesFromSpreadsheet);
document.querySelector("#downloadHomesitesButton").addEventListener("click", downloadHomesitesXlsx);
document.querySelector("#renameHomesiteButton").addEventListener("click", renameHomesite);
closeSiteDocumentsButton.addEventListener("click", closeSiteDocuments);
showDocumentUploadButton.addEventListener("click", () => showSiteDocumentForm());
cancelSiteDocumentButton.addEventListener("click", hideSiteDocumentForm);
siteDocumentForm.addEventListener("submit", saveSiteDocument);
siteDocumentSearch.addEventListener("input", renderSiteDocuments);
siteDocumentFile.addEventListener("change", suggestSiteDocumentName);
siteDocumentList.addEventListener("click", handleSiteDocumentAction);
siteDocumentsModal.addEventListener("click", (event) => {
  if (event.target === siteDocumentsModal) closeSiteDocuments();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !siteDocumentsModal.classList.contains("hidden")) closeSiteDocuments();
  if (event.key === "Escape" && !changePasswordModal.classList.contains("hidden")) closeChangePassword();
  if (event.key === "Escape" && !fieldNotificationPanel.classList.contains("hidden")) closeFieldNotifications();
  if (event.key === "Escape" && browserReportPanel.classList.contains("open")) closeReportPopups();
});
document.querySelector("#addRoomButton").addEventListener("click", addRoomOption);
document.querySelector("#addTradeButton").addEventListener("click", addTradeOption);
document.querySelector("#addSavedIssueButton").addEventListener("click", addIssueOption);
issueSubmitButton.addEventListener("click", addIssue);
quickAddTradeButton.addEventListener("click", addTradeOption);
quickAddIssueButton.addEventListener("click", () => addIssueOption(tradeSelect.value));
document.querySelector("#clearHomesiteButton").addEventListener("click", clearCurrentHomesite);
document.querySelector("#homePdfButton").addEventListener("click", (event) => {
  runPdfButtonAction(event.currentTarget, () => createHomePdf(false));
});
document.querySelector("#openHomeReportButton").addEventListener("click", openHomeReport);
document.querySelector("#downloadHomePdfButton").addEventListener("click", (event) => {
  runPdfButtonAction(event.currentTarget, () => createHomePdf(true));
});
document.querySelector("#addContactButton").addEventListener("click", openContactForm);
document.querySelector("#cancelContactButton").addEventListener("click", closeContactForm);
contactForm.addEventListener("submit", saveContactFromForm);
document.querySelector("#saveContactsButton").addEventListener("click", saveContactsXlsx);
toggleCompletedButton.addEventListener("click", toggleCompletedIssues);
issueSortSelect.addEventListener("change", renderIssues);
cameraInput.addEventListener("click", markLocalActivity);
photoInput.addEventListener("click", markLocalActivity);
cameraInput.addEventListener("change", handlePhotoSelection);
photoInput.addEventListener("change", handlePhotoSelection);
communitySelect.addEventListener("change", () => {
  state.currentCommunityId = communitySelect.value;
  const community = getCurrentCommunity();
  state.currentHomesiteId = community.homesites[0]?.id || "";
  saveState();
  render();
});
homesiteSelect.addEventListener("change", () => {
  state.currentHomesiteId = homesiteSelect.value;
  saveState();
  render();
});
tradeSelect.addEventListener("change", populateIssueOptions);
contactSearch.addEventListener("input", renderContacts);
contactTradeFilter.addEventListener("change", renderContacts);
infoSearch.addEventListener("input", renderHomesiteInfo);
infoCommunityFilter.addEventListener("change", () => {
  populateHomesiteInfoFilters();
  renderHomesiteInfo();
});
allCommunityFilter.addEventListener("change", () => {
  populateAllReportFilters();
  renderAllReports();
});
allSiteFilter.addEventListener("change", () => {
  populateAllReportFilters();
  renderAllReports();
});
allTradeFilter.addEventListener("change", renderAllReports);
settingsItemTradeSelect.addEventListener("change", renderSettingsLists);
initializeSettingsCollapse();
let lastBottomNavScrollY = window.scrollY;
window.addEventListener("scroll", handleBottomNavScroll, { passive: true });
window.addEventListener("focus", verifyActiveSupabaseSession);
window.setInterval(verifyActiveSupabaseSession, 60000);
window.setInterval(refreshFieldNotificationsInBackground, fieldNotificationRefreshMs);
window.addEventListener("focus", () => {
  if (fieldDriveSupabase && !authScreen.classList.contains("visible") && Date.now() - lastLocalChangeAt > cloudHydrateQuietMs) {
    hydrateSupabaseAppData();
  }
  if (shouldUseNetlifyCloudState() && !authScreen.classList.contains("visible") && Date.now() - lastLocalChangeAt > cloudHydrateQuietMs) hydrateCloudState();
});

function handleBottomNavScroll() {
  if (!bottomNav) return;
  const currentY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
  const delta = currentY - lastBottomNavScrollY;
  if (Math.abs(delta) < 8) return;

  bottomNav.classList.toggle("is-hidden", delta > 0 && currentY > 80);
  lastBottomNavScrollY = currentY;
}

init();

function init() {
  applySavedTheme();
  applyStarterCopy();
  initializeLanguage();
  setupAccessGate();
  populateSelect(roomSelect, state.rooms);
  populateSelect(tradeSelect, Object.keys(state.tradeIssues));
  populateIssueOptions();
  populateContactTradeFilter();
  populateHomesiteInfoFilters();
  populateAllReportFilters();
  renderContacts();
  renderHomesiteInfo();
  renderAllReports();
  renderSettingsLists();
  render();
  refreshLanguageDom();
}

async function setupAccessGate() {
  if (!fieldDriveSupabase && isLocalPreview()) {
    authScreen.classList.remove("visible");
    signOutButton.classList.add("hidden");
    changePasswordButton.classList.add("hidden");
    changePinButton.classList.remove("hidden");
    lockAppButton.classList.remove("hidden");
    setupPinLock();
    hydrateCloudState();
    return;
  }

  lockScreen.classList.remove("visible");
  changePinButton.classList.add("hidden");
  lockAppButton.classList.add("hidden");
  signOutButton.classList.remove("hidden");
  changePasswordButton.classList.toggle("hidden", !fieldDriveSupabase);
  authScreen.classList.add("visible");

  if (!fieldDriveSupabase) {
    authError.textContent = "Supabase login is not configured.";
    return;
  }

  try {
    const { data, error } = await fieldDriveSupabase.auth.getSession();

    if (!error && data.session) {
      const profile = await getCurrentSupabaseProfile();
      if (profile) {
        authScreen.classList.remove("visible");
        await initializeMainOfflineSync();
        hydrateSupabaseAppData();
      } else {
        await fieldDriveSupabase.auth.signOut({ scope: "local" });
        authError.textContent = currentProfileAccessError || "This account or client access is currently paused.";
      }
    }
  } catch {
    const cachedProfile = loadCachedSupabaseProfile();
    if (navigator.onLine === false && cachedProfile && profileMatchesConfiguredOrganization(cachedProfile)) {
      currentSupabaseProfile = cachedProfile;
      authScreen.classList.remove("visible");
      authError.textContent = "";
      await initializeMainOfflineSync();
      return;
    }
    authError.textContent = "Login is not available right now.";
  }
}

function isLocalPreview() {
  return ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
}

async function loginWithPassword() {
  const email = authUsernameInput.value.trim();
  const password = authPasswordInput.value;
  authError.textContent = "";

  if (!email || !password) {
    authError.textContent = "Enter email and password.";
    return;
  }

  if (!fieldDriveSupabase) {
    authError.textContent = "Supabase login is not configured.";
    return;
  }

  authLoginButton.disabled = true;
  authLoginButton.textContent = "Signing in...";

  try {
    const { error } = await fieldDriveSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      authError.textContent = error.status === 429 ? "Too many sign-in attempts. Wait a minute and try again." : "Incorrect email or password.";
      return;
    }

    currentSupabaseProfile = null;
    const profile = await getCurrentSupabaseProfile();
    if (!profile) {
      await fieldDriveSupabase.auth.signOut({ scope: "local" });
      authError.textContent = currentProfileAccessError || "This account or client access is currently paused.";
      return;
    }
    authPasswordInput.value = "";
    authScreen.classList.remove("visible");
    await initializeMainOfflineSync();
    hydrateSupabaseAppData();
  } catch {
    authError.textContent = "Login is not available right now.";
  } finally {
    authLoginButton.disabled = false;
    authLoginButton.textContent = "Sign in";
  }
}

async function requestPasswordReset() {
  const email = authUsernameInput.value.trim();
  if (!email) {
    authError.textContent = "Enter your email address first.";
    authUsernameInput.focus();
    return;
  }
  forgotPasswordButton.disabled = true;
  authError.textContent = "Sending password reset email...";
  try {
    const redirectTo = new URL(window.location.pathname, window.location.origin).toString();
    const { error } = await fieldDriveSupabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    authError.textContent = "Check your email for the password reset link.";
    window.setTimeout(() => { forgotPasswordButton.disabled = false; }, 60000);
  } catch (error) {
    forgotPasswordButton.disabled = false;
    authError.textContent = error.message || "Password reset email could not be sent.";
  }
}

async function completePasswordReset() {
  const password = newPasswordInput.value;
  const confirmation = confirmPasswordInput.value;
  passwordResetError.textContent = "";
  if (password.length < 8) {
    passwordResetError.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (password !== confirmation) {
    passwordResetError.textContent = "Passwords do not match.";
    return;
  }
  saveNewPasswordButton.disabled = true;
  try {
    const { error } = await fieldDriveSupabase.auth.updateUser({ password });
    if (error) throw error;
    await fieldDriveSupabase.auth.signOut({ scope: "others" });
    passwordResetScreen.classList.remove("visible");
    authScreen.classList.remove("visible");
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    hydrateSupabaseAppData();
  } catch (error) {
    passwordResetError.textContent = error.message || "Password could not be updated.";
  } finally {
    saveNewPasswordButton.disabled = false;
  }
}

function openChangePassword() {
  if (!fieldDriveSupabase) return;
  changePasswordForm.reset();
  changePasswordError.textContent = "";
  settingsAccountStatus.textContent = "";
  changePasswordModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  window.setTimeout(() => currentPasswordInput.focus(), 0);
}

function closeChangePassword() {
  changePasswordModal.classList.add("hidden");
  changePasswordForm.reset();
  changePasswordError.textContent = "";
  if (siteDocumentsModal.classList.contains("hidden")) document.body.classList.remove("modal-open");
}

async function changeAccountPassword(event) {
  event.preventDefault();
  const currentPassword = currentPasswordInput.value;
  const password = settingsNewPasswordInput.value;
  const confirmation = settingsConfirmPasswordInput.value;
  changePasswordError.textContent = "";

  if (!currentPassword) {
    changePasswordError.textContent = "Enter your current password.";
    currentPasswordInput.focus();
    return;
  }
  if (password.length < 8) {
    changePasswordError.textContent = "Password must be at least 8 characters.";
    settingsNewPasswordInput.focus();
    return;
  }
  if (password !== confirmation) {
    changePasswordError.textContent = "Passwords do not match.";
    settingsConfirmPasswordInput.focus();
    return;
  }
  if (password === currentPassword) {
    changePasswordError.textContent = "New password must be different from current password.";
    settingsNewPasswordInput.focus();
    return;
  }

  saveChangedPasswordButton.disabled = true;
  saveChangedPasswordButton.textContent = "Saving...";
  try {
    const { data: userData, error: userError } = await fieldDriveSupabase.auth.getUser();
    const email = userData?.user?.email;
    if (userError || !email) throw new Error("Password change is not available right now.");

    const { error: verificationError } = await fieldDriveSupabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verificationError) {
      if (verificationError.status === 429) throw new Error("Too many attempts. Wait a minute and try again.");
      throw new Error("Incorrect current password.");
    }

    const { error: updateError } = await fieldDriveSupabase.auth.updateUser({ password });
    if (updateError) throw updateError;
    await fieldDriveSupabase.auth.signOut({ scope: "others" });
    closeChangePassword();
    settingsAccountStatus.textContent = "Your password was changed.";
    refreshLanguageDom();
  } catch (error) {
    changePasswordError.textContent = error.message || "Password could not be updated.";
  } finally {
    saveChangedPasswordButton.disabled = false;
    saveChangedPasswordButton.textContent = "Save password";
  }
}

if (fieldDriveSupabase) {
  fieldDriveSupabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") passwordResetScreen.classList.add("visible");
  });
}

async function signOutPassword() {
  try {
    if (fieldDriveSupabase) await fieldDriveSupabase.auth.signOut();
  } catch {
    // Showing the login screen is still the safest visible result.
  }

  currentSupabaseProfile = null;
  authScreen.classList.add("visible");
}

let activeSessionCheckInFlight = false;

async function verifyActiveSupabaseSession() {
  if (!fieldDriveSupabase || authScreen.classList.contains("visible") || activeSessionCheckInFlight || navigator.onLine === false) return;
  activeSessionCheckInFlight = true;
  try {
    const { data: sessionValid, error: sessionError } = await fieldDriveSupabase.rpc("session_is_valid");
    if (sessionError || sessionValid !== false) return;

    // A token refresh can briefly leave an otherwise valid request without auth.
    // Require a second explicit denial before treating the account as paused.
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    if (navigator.onLine === false) return;
    const { data: confirmedInvalid, error: confirmationError } = await fieldDriveSupabase.rpc("session_is_valid");
    if (confirmationError || confirmedInvalid !== false) return;
  } catch {
    return;
  } finally {
    activeSessionCheckInFlight = false;
  }
  currentSupabaseProfile = null;
  await fieldDriveSupabase.auth.signOut({ scope: "local" }).catch(() => {});
  authScreen.classList.add("visible");
  authError.textContent = "This account or client access is currently paused.";
}

function applySavedTheme() {
  const theme = localStorage.getItem(themeStorageKey) || "light";
  document.body.dataset.theme = theme;
  themeToggleButton.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeStorageKey, nextTheme);
  document.body.dataset.theme = nextTheme;
  themeToggleButton.textContent = nextTheme === "dark" ? "Light Mode" : "Dark Mode";
}

function setupPinLock() {
  const hasPin = Boolean(localStorage.getItem(pinStorageKey));
  const isUnlocked = sessionStorage.getItem(unlockedSessionKey) === "true";

  if (!hasPin) {
    lockScreen.classList.add("visible");
    pinTitle.textContent = "Create PIN";
    pinHelper.textContent = "Choose a PIN for this app on this device.";
    pinSubmitButton.textContent = "Save PIN";
    return;
  }

  if (!isUnlocked) {
    lockScreen.classList.add("visible");
    pinTitle.textContent = "Enter PIN";
    pinHelper.textContent = "Enter your PIN to open the app.";
    pinSubmitButton.textContent = "Unlock";
    return;
  }

  lockScreen.classList.remove("visible");
}

async function submitPin() {
  const pin = pinInput.value.trim();
  pinError.textContent = "";

  if (pin.length < 4) {
    pinError.textContent = "Use at least 4 numbers.";
    return;
  }

  const savedPin = localStorage.getItem(pinStorageKey);

  if (!savedPin) {
    localStorage.setItem(pinStorageKey, await hashPin(pin));
    sessionStorage.setItem(unlockedSessionKey, "true");
    pinInput.value = "";
    lockScreen.classList.remove("visible");
    return;
  }

  if ((await hashPin(pin)) === savedPin) {
    sessionStorage.setItem(unlockedSessionKey, "true");
    pinInput.value = "";
    lockScreen.classList.remove("visible");
  } else {
    pinError.textContent = "Incorrect PIN.";
  }
}

async function hashPin(pin) {
  const data = new TextEncoder().encode(`construction-report:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function changePin() {
  const currentPin = prompt("Enter current PIN");
  if (!currentPin) return;

  if ((await hashPin(currentPin.trim())) !== localStorage.getItem(pinStorageKey)) {
    alert("Incorrect PIN.");
    return;
  }

  const newPin = prompt("Enter new PIN");
  if (!newPin || newPin.trim().length < 4) {
    alert("Use at least 4 numbers.");
    return;
  }

  localStorage.setItem(pinStorageKey, await hashPin(newPin.trim()));
  alert("PIN updated.");
}

function lockApp() {
  sessionStorage.removeItem(unlockedSessionKey);
  pinInput.value = "";
  setupPinLock();
}

function toggleBrowserReports() {
  renderBrowserReportOptions();
  browserReportPanel.classList.toggle("open");
}

function closeTransientPanelsOnOutsideClick(event) {
  const target = event.target;

  if (
    !fieldNotificationPanel.classList.contains("hidden")
    && !fieldNotificationPanel.contains(target)
    && !fieldNotificationButton.contains(target)
  ) {
    closeFieldNotifications();
  }

  if (
    browserReportPanel.classList.contains("open")
    && !browserReportPanel.contains(target)
    && !punchPageButton?.contains(target)
  ) {
    closeReportPopups();
  }
}

function handlePageButtonClick(button) {
  const pageId = button.dataset.pageTarget;
  const isCurrentPage = document.querySelector(".app-page.active")?.id === pageId;

  if (pageId === "punchListPage" && isCurrentPage) {
    toggleBrowserReports();
    return;
  }

  showPage(pageId);
}

function showPage(pageId) {
  appPages.forEach((page) => page.classList.toggle("active", page.id === pageId));
  pageButtons.forEach((button) => button.classList.toggle("active", button.dataset.pageTarget === pageId));
  browserReportPanel.classList.remove("open");
  if (pageId === "selectHomePage") renderActiveHomeList();
  if (pageId === "nhoSignoffPage") renderNhoSignoff();
  if (pageId === "homeownerSignoffPage") renderHomeownerSignoff();
  if (pageId === "homeArchivePage") renderArchivedHomeList();
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return {};
}

function normalizeState(savedState) {
  if (shouldResetPunchlist2State(savedState)) return createFreshPunchlist2State();

  normalizeProjectSiteNames(savedState);
  const preloadedCommunities = isPunchlist2Site() ? [] : normalizePreloadedCommunities(window.preloadedCommunities || []);
  savedState.sharedSettingsInitialized = Boolean(savedState.sharedSettingsInitialized);
  savedState.sharedSettingIds = normalizeSharedSettingIds(savedState.sharedSettingIds);
  savedState.rooms = mergeLocationOptions(savedState.rooms || [], !savedState.sharedSettingsInitialized);
  savedState.tradeIssues = mergeTradeIssueOptions(tradeIssues, savedState.tradeIssues || {}, !savedState.sharedSettingsInitialized);
  savedState.customContacts ||= [];

  if (savedState.communities?.length) {
    savedState.tradeEmails ||= { ...defaultTradeEmails };
    mergePreloadedCommunities(savedState.communities, preloadedCommunities);
    if (preloadedCommunities.length) {
      savedState.communities = savedState.communities.filter((community) => !["Default Community", "Default Project"].includes(community.name));
    }
    if (!savedState.communities.some((community) => community.id === savedState.currentCommunityId)) {
      savedState.currentCommunityId = savedState.communities[0]?.id || "";
    }
    savedState.communities.forEach((community) => {
      community.homesites ||= [];
      community.homesites.forEach((home) => {
        home.issues ||= [];
        home.documents ||= [];
        home.fields = getSiteFields(home);
        home.archivedAt ||= "";
        home.structuralOption ||= "";
      });
    });
    savedState.currentHomesiteId ||= getFirstHomeId(savedState.communities);
    return savedState;
  }

  if (preloadedCommunities.length) {
    const savedCommunities = savedState.communities || [];
    mergePreloadedCommunities(savedCommunities, preloadedCommunities);
    return {
      currentCommunityId: savedCommunities[0].id,
      currentHomesiteId: savedCommunities[0].homesites[0]?.id || "",
      tradeEmails: savedState.tradeEmails || { ...defaultTradeEmails },
      rooms: savedState.rooms,
      tradeIssues: savedState.tradeIssues,
      sharedSettingsInitialized: savedState.sharedSettingsInitialized,
      sharedSettingIds: savedState.sharedSettingIds,
      customContacts: savedState.customContacts,
      communities: savedCommunities
    };
  }

  return {
    currentCommunityId: "",
    currentHomesiteId: "",
    tradeEmails: savedState.tradeEmails || { ...defaultTradeEmails },
    rooms: savedState.rooms,
    tradeIssues: savedState.tradeIssues,
    sharedSettingsInitialized: savedState.sharedSettingsInitialized,
    sharedSettingIds: savedState.sharedSettingIds,
    customContacts: savedState.customContacts,
    communities: []
  };
}

function normalizeProjectSiteNames(candidateState) {
  if (!candidateState) return;

  (candidateState.communities || []).forEach((community) => {
    if (community.name === "Default Community") community.name = "Default Project";
    (community.homesites || []).forEach((home) => {
      if (home.name === "Homesite 101") home.name = "Site 101";
    });
  });

  (candidateState.homesites || []).forEach((home) => {
    if (home.name === "Homesite 101") home.name = "Site 101";
  });
}

function isPunchlist2Site() {
  return window.location.hostname.toLowerCase().includes("punchlist2");
}

function shouldResetPunchlist2State(candidateState) {
  return isPunchlist2Site() && candidateState?.freshStartSite !== "punchlist2";
}

function createFreshPunchlist2State() {
  return {
    freshStartSite: "punchlist2",
    freshStartedAt: new Date().toISOString(),
    currentCommunityId: "",
    currentHomesiteId: "",
    tradeEmails: { ...defaultTradeEmails },
    rooms: [...rooms],
    tradeIssues: mergeTradeIssueOptions(tradeIssues, {}),
    sharedSettingsInitialized: false,
    sharedSettingIds: normalizeSharedSettingIds(),
    customContacts: [],
    communities: []
  };
}

function normalizeSharedSettingIds(value = {}) {
  return {
    locations: value?.locations && typeof value.locations === "object" ? { ...value.locations } : {},
    trades: value?.trades && typeof value.trades === "object" ? { ...value.trades } : {},
    items: value?.items && typeof value.items === "object"
      ? Object.fromEntries(Object.entries(value.items).map(([trade, items]) => [trade, items && typeof items === "object" ? { ...items } : {}]))
      : {}
  };
}

function mergeUnique(defaultValues, savedValues) {
  const values = [...defaultValues, ...savedValues].map((value) => String(value).trim()).filter(Boolean);
  return [...new Set(values)];
}

function mergeLocationOptions(savedValues, includeDefaults = true) {
  const customValues = includeDefaults
    ? (savedValues || []).filter((value) => !retiredRoomOptions.has(String(value).trim()))
    : (savedValues || []);
  return mergeUnique(includeDefaults ? rooms : [], customValues);
}

function mergeTradeIssueOptions(defaultOptions, savedOptions, includeDefaults = true) {
  const baselineOptions = includeDefaults ? defaultOptions : {};
  const merged = {};
  const trades = [...new Set([...Object.keys(baselineOptions), ...Object.keys(savedOptions)])];

  trades.forEach((trade) => {
    if (retiredTradeOptions.has(trade)) return;
    merged[trade] = mergeUnique(baselineOptions[trade] || [], savedOptions[trade] || []);
    if (includeDefaults && !merged[trade].includes("Other")) merged[trade].push("Other");
  });

  return merged;
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

function getSiteFields(site) {
  const existingFields = normalizeSiteFields(site?.fields);
  if (existingFields.length) return existingFields;

  const legacyFields = [
    ["Address", site?.address],
    ["Block", site?.block],
    ["Lot", site?.lot],
    ["Model", site?.model],
    ["Elevation", site?.elevation],
    ["Permit", site?.permitNumber],
    ["Garage", site?.garageSwing || site?.garage],
    ["Structural Option", site?.structuralOption]
  ];

  return normalizeSiteFields(legacyFields.map(([label, value]) => ({ label, value })));
}

function getSiteFieldValue(site, label) {
  const normalizedLabel = normalizeColumnName(label);
  return getSiteFields(site).find((field) => normalizeColumnName(field.label) === normalizedLabel)?.value || "";
}

function normalizePreloadedCommunities(communities) {
  return communities
    .filter((community) => community?.name)
    .map((community) => ({
      id: community.id || stableId(`community:${community.name}`),
      name: community.name,
      homesites: dedupeHomesites(community.homesites || []).map((home) => normalizePreloadedHomesite(community.name, home))
    }));
}

function dedupeHomesites(homesites) {
  const seen = new Set();
  return homesites.filter((home) => {
    const name = typeof home === "string" ? home : home.name;
    const key = String(name || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePreloadedHomesite(communityName, home) {
  const source = typeof home === "string" ? { name: home } : home;
  const fields = getSiteFields(source);
  return {
    id: source.id || stableId(`home:${communityName}:${source.name}`),
    name: String(source.name),
    block: source.block || "",
    lot: source.lot || "",
    address: source.address || "",
    model: source.model || "",
    elevation: source.elevation || "",
    permitNumber: source.permitNumber || "",
    garageSwing: source.garageSwing || "",
    structuralOption: source.structuralOption || "",
    fields,
    issues: source.issues || [],
    documents: source.documents || [],
    archivedAt: source.archivedAt || ""
  };
}

function mergePreloadedCommunities(currentCommunities, preloadedCommunities) {
  const existingByCommunity = new Map(currentCommunities.map((community) => [community.name, community]));
  const preloadedNames = new Set(preloadedCommunities.map((community) => community.name));

  currentCommunities.splice(
    0,
    currentCommunities.length,
    ...preloadedCommunities.map((preloadedCommunity) => {
      const existingCommunity = existingByCommunity.get(preloadedCommunity.name);
      const existingByName = new Map((existingCommunity?.homesites || []).map((home) => [home.name.toLowerCase(), home]));
      const preloadedHomeNames = new Set(preloadedCommunity.homesites.map((home) => home.name.toLowerCase()));
      const homesites = preloadedCommunity.homesites.map((preloadedHome) => {
        const existingHome = existingByName.get(preloadedHome.name.toLowerCase());
        return {
          ...preloadedHome,
          reportId: existingHome?.reportId || preloadedHome.reportId || "",
          tradeReportKeys: existingHome?.tradeReportKeys || preloadedHome.tradeReportKeys || {},
          reportAccess: existingHome?.reportAccess || preloadedHome.reportAccess || {},
          issues: existingHome?.issues || [],
          documents: existingHome?.documents || []
        };
      });
      const extraHomesites = (existingCommunity?.homesites || []).filter((home) => !preloadedHomeNames.has(home.name.toLowerCase()));

      return {
        ...preloadedCommunity,
        homesites: [...homesites, ...extraHomesites]
      };
    }),
    ...currentCommunities.filter((community) => !preloadedNames.has(community.name) && !["Default Community", "Default Project"].includes(community.name))
  );
}

function stableId(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `id-${Math.abs(hash)}`;
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function getFirstHomeId(communities) {
  for (const community of communities || []) {
    const home = (community.homesites || []).find((candidate) => !isHomeArchived(candidate));
    if (home) return home.id;
  }
  return "";
}

function isHomeArchived(homesite) {
  return Boolean(homesite?.archivedAt);
}

function getHomeRecords({ archived = false, meaningfulOnly = false } = {}) {
  return (state.communities || [])
    .flatMap((community) => (community.homesites || []).map((homesite) => ({ community, homesite })))
    .filter(({ homesite }) => isHomeArchived(homesite) === archived)
    .filter(({ community, homesite }) => !meaningfulOnly || hasMeaningfulHomeDetails(community, homesite));
}

function hasMeaningfulHomeDetails(community, homesite) {
  if (!homesite) return false;
  const acceptance = homesite.acceptance || {};
  const communityName = String(community?.name || "").trim();
  const address = getSiteFieldValue(homesite, "Address") || (homesite.name === "Home" ? "" : homesite.name);
  return Boolean(
    (communityName && !["Community", "Project"].includes(communityName))
    || address
    || acceptance.buyer1?.name
    || acceptance.buyer1?.email
    || acceptance.buyer2?.name
    || acceptance.buyer2?.email
    || (homesite.issues || []).length
  );
}

function markLocalActivity() {
  lastLocalChangeAt = Date.now();
}

function saveState() {
  if (!isHydratingFromCloud) {
    markLocalActivity();
    state.updatedAt = new Date().toISOString();
  }
  state.tradeEmails ||= { ...defaultTradeEmails };
  retiredTradeOptions.forEach((trade) => delete state.tradeEmails[trade]);
  state.rooms = mergeLocationOptions(state.rooms || [], !state.sharedSettingsInitialized);
  state.tradeIssues = mergeTradeIssueOptions(tradeIssues, state.tradeIssues || {}, !state.sharedSettingsInitialized);
  state.customContacts ||= [];
  try {
    localStorage.setItem(storageKey, JSON.stringify(state, function omitQueuedFileData(key, value) {
      if (key === "dataUrl" && this?.localOperationId) return undefined;
      return value;
    }));
  } catch {
    alert("This device could not save the latest changes locally. If you are on the live website, check your internet connection and sign in again.");
  }
  if (!isHydratingFromCloud) scheduleCloudSave();
}

async function hydrateCloudState() {
  if (!shouldUseNetlifyCloudState()) return;

  try {
    const response = await fetch("/.netlify/functions/app-state", {
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) return;

    const cloudState = await response.json();
    if (shouldResetPunchlist2State(cloudState)) {
      state = createFreshPunchlist2State();
      saveState();
      populateSelect(roomSelect, state.rooms);
      populateSelect(tradeSelect, Object.keys(state.tradeIssues));
      populateIssueOptions();
      populateContactTradeFilter();
      populateHomesiteInfoFilters();
      populateAllReportFilters();
      renderContacts();
      renderHomesiteInfo();
      renderAllReports();
      render();
      return;
    }
    if (!cloudState?.communities?.length) return;
    if (shouldKeepLocalState(cloudState)) return;

    isHydratingFromCloud = true;
    state = normalizeState(cloudState);
    saveState();
    isHydratingFromCloud = false;
    populateSelect(roomSelect, state.rooms);
    populateSelect(tradeSelect, Object.keys(state.tradeIssues));
    populateIssueOptions();
    populateContactTradeFilter();
    populateHomesiteInfoFilters();
    populateAllReportFilters();
    renderContacts();
    renderHomesiteInfo();
    renderAllReports();
    render();
  } catch {
    isHydratingFromCloud = false;
  }
}

async function hydrateSupabaseAppData() {
  if (!fieldDriveSupabase) return;
  const localChangeAtStart = lastLocalChangeAt;

  try {
    const profile = await getCurrentSupabaseProfile();
    const organizationId = getActiveOrganizationId(profile);
    if (!organizationId) throw new Error("This login is not connected to the configured Punch Logic company.");

    const [
      { data: projects, error: projectError },
      { data: sites, error: siteError },
      { data: contacts, error: contactError },
      { data: punchItems, error: itemError },
      { data: itemPhotos, error: photoError },
      { data: siteDocuments, error: siteDocumentError },
      { data: homeAcceptances, error: homeAcceptanceError },
      { data: trades, error: tradeSettingError },
      { data: locations, error: locationSettingError },
      { data: itemSettings, error: itemSettingError }
    ] = await Promise.all([
      selectSupabaseProjectsForApp(organizationId),
      selectSupabaseSitesForApp(organizationId),
      selectSupabaseContactsForApp(organizationId),
      selectSupabaseItemsForApp(organizationId),
      fieldDriveSupabase
        .from("item_photos")
        .select("id, item_id, storage_path, file_name, content_type, completion_proof, created_at")
        .eq("organization_id", organizationId),
      selectSupabaseSiteDocuments(organizationId),
      fieldDriveSupabase
        .from("home_acceptances")
        .select("site_id, homeowner_1_name, homeowner_1_email, homeowner_1_signature, homeowner_1_signed_at, homeowner_2_name, homeowner_2_email, homeowner_2_signature, homeowner_2_signed_at, accepted_at, document_snapshot")
        .eq("organization_id", organizationId),
      fieldDriveSupabase.from("trade_settings").select("id, name, sort_order").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      fieldDriveSupabase.from("location_settings").select("id, name, sort_order").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      fieldDriveSupabase.from("item_settings").select("id, name, sort_order, trade_id, trade_settings(name)").eq("organization_id", organizationId).order("sort_order", { ascending: true }).order("name", { ascending: true })
    ]);

    if (projectError) console.warn("Projects could not be loaded.", projectError);
    if (siteError) console.warn("Sites could not be loaded.", siteError);
    if (contactError) console.warn("Contacts could not be loaded.", contactError);
    if (itemError) console.warn("Items could not be loaded.", itemError);
    if (photoError && !["42P01", "42501"].includes(photoError.code)) console.warn("Photos could not be loaded.", photoError);
    if (siteDocumentError && !["42P01", "42501", "PGRST205"].includes(siteDocumentError.code)) console.warn("Site documents could not be loaded.", siteDocumentError);
    if (homeAcceptanceError && !["42P01", "42501", "PGRST205"].includes(homeAcceptanceError.code)) console.warn("Home acceptances could not be loaded.", homeAcceptanceError);
    if (tradeSettingError && !["42P01", "42501"].includes(tradeSettingError.code)) console.warn("Crews could not be loaded.", tradeSettingError);
    if (locationSettingError && !["42P01", "42501"].includes(locationSettingError.code)) console.warn("Locations could not be loaded.", locationSettingError);
    if (itemSettingError && !["42P01", "42501"].includes(itemSettingError.code)) console.warn("Items could not be loaded.", itemSettingError);

    const criticalLoadError = projectError || siteError || itemError;
    if (criticalLoadError) {
      throw new Error(criticalLoadError.message || "Projects, sites, or items could not be loaded.");
    }

    let sharedSettings = {
      tradeRows: trades || [],
      locationRows: locations || [],
      itemRows: itemSettings || []
    };
    if (!tradeSettingError && !locationSettingError && !itemSettingError) {
      try {
        sharedSettings = await ensureSharedSettingsInitialized(profile, organizationId, sharedSettings);
      } catch (error) {
        console.warn("Shared settings could not be initialized.", error);
      }
    }

    const activeProjectIds = new Set((projects || []).map((project) => project.id));
    const activeSites = (sites || []).filter((site) => activeProjectIds.has(site.project_id));
    const activeSiteIds = new Set(activeSites.map((site) => site.id));
    const activeItems = (punchItems || []).filter((item) => activeSiteIds.has(item.site_id));
    const activeItemIds = new Set(activeItems.map((item) => item.id));
    const activePhotos = (itemPhotos || []).filter((photo) => activeItemIds.has(photo.item_id));
    const activeDocuments = (siteDocuments || []).filter((documentRow) => activeSiteIds.has(documentRow.site_id));

    await hydrateItemPhotoSignedUrls(activePhotos);

    // A prompt or edit may finish while these requests are in flight. Never let
    // an older response replace newer local state that is already being saved.
    if (lastLocalChangeAt !== localChangeAtStart) return;

    isHydratingFromCloud = true;
    mergeSupabaseProjectsAndSites(projects || [], activeSites, activeItems, activePhotos, activeDocuments);
    if (!homeAcceptanceError) mergeSupabaseHomeAcceptances(homeAcceptances || []);
    mergeAcceptanceDrafts(await loadAcceptanceDraftsFromServer());
    await restorePendingMainOperations();
    mergeSupabaseContacts(contacts || []);
    mergeSupabaseSettings(sharedSettings.tradeRows, sharedSettings.locationRows, sharedSettings.itemRows);
    await syncLocalStateToSupabase(profile, organizationId);
    saveState();
    isHydratingFromCloud = false;
    refreshAfterStateChange();
  } catch (error) {
    isHydratingFromCloud = false;
    console.error("Punch Logic cloud data could not be loaded. Existing device data was preserved.", error);
    showCloudDataLoadFailure(error);
  }
}

function showCloudDataLoadFailure(error) {
  const message = String(error?.message || "Projects, sites, and items could not be loaded.");
  document.querySelectorAll("[data-sync-control]").forEach((control) => {
    control.dataset.syncState = "failed";
    control.title = message;
  });
  document.querySelectorAll("[data-sync-status]").forEach((element) => {
    element.textContent = "Data load failed";
  });
  document.querySelectorAll("[data-sync-last]").forEach((element) => {
    element.textContent = message;
  });
}

async function syncLocalStateToSupabase(profile = currentSupabaseProfile, organizationId = getActiveOrganizationId(profile)) {
  if (!organizationId) return false;

  let changed = false;
  for (const community of state.communities || []) {
    const projectChanged = await ensureSupabaseProject(community, profile, organizationId);
    changed = changed || projectChanged;

    for (const homesite of community.homesites || []) {
      const siteChanged = await ensureSupabaseSite(community, homesite, profile, organizationId);
      changed = changed || siteChanged;

      for (const issue of homesite.issues || []) {
        if (["Supabase", "Pending"].includes(issue.source)) continue;
        try {
          const savedProfile = await saveIssueToSupabase(homesite, issue);
          issue.source = "Supabase";
          issue.createdBy = savedProfile?.id || "";
          issue.addedByName = savedProfile?.display_name || "";
          changed = true;
        } catch (error) {
          console.warn("Local item could not be synced to Supabase.", error);
        }
      }
    }
  }

  if (changed) saveState();
  return changed;
}

async function ensureSupabaseProject(community, profile, organizationId = getActiveOrganizationId(profile)) {
  if (community.source === "Supabase") return false;
  if (!organizationId) return false;

  const projectName = (community.name || "Project").trim();
  const existing = await findSupabaseProjectByName(organizationId, projectName);
  const project = existing || await createSupabaseProject(organizationId, projectName);
  if (!project?.id) return false;

  const oldId = community.id;
  community.id = project.id;
  community.name = project.name || projectName;
  community.source = "Supabase";
  const matchingCommunity = (state.communities || []).find((candidate) => candidate !== community && candidate.id === project.id);
  if (matchingCommunity) {
    matchingCommunity.homesites ||= [];
    (community.homesites || []).forEach((homesite) => {
      if (!matchingCommunity.homesites.some((candidate) => candidate === homesite || candidate.id === homesite.id)) {
        matchingCommunity.homesites.push(homesite);
      }
    });
    state.communities = state.communities.filter((candidate) => candidate !== community);
    state.currentCommunityId = matchingCommunity.id;
  } else if (state.currentCommunityId === oldId) {
    state.currentCommunityId = project.id;
  }
  return true;
}

async function findSupabaseProjectByName(organizationId, name) {
  const { data, error } = await fieldDriveSupabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createSupabaseProject(organizationId, name, options = {}) {
  let { data, error } = await fieldDriveSupabase
    .rpc("create_project_for_current_user", { project_name: name });

  if (!error) {
    const project = Array.isArray(data) ? data[0] : data;
    if (project?.id) return project;
    throw new Error("The project was created but could not be loaded.");
  }

  const rpcIsUnavailable = ["PGRST202", "42883"].includes(error.code)
    || /create_project_for_current_user|schema cache/i.test(error.message || "");

  if (rpcIsUnavailable) {
    ({ data, error } = await fieldDriveSupabase
      .from("projects")
      .insert({ organization_id: organizationId, name })
      .select("id, name")
      .single());
  }

  if (!error) return data;
  if (isSupabasePermissionError(error) && !options.sessionRetried) {
    const refreshedOrganizationId = await refreshSupabaseSessionForRetry();
    if (refreshedOrganizationId === organizationId) {
      return createSupabaseProject(organizationId, name, { sessionRetried: true });
    }
  }
  if (error.code === "23505") {
    const existing = await findSupabaseProjectByName(organizationId, name);
    if (existing) return existing;
    throw new Error("A project with this name already exists. Ask an administrator to assign it to you.");
  }
  throw error;
}

async function refreshSupabaseSessionForRetry() {
  if (!fieldDriveSupabase || navigator.onLine === false) return "";
  try {
    const { data, error } = await fieldDriveSupabase.auth.refreshSession();
    if (error || !data?.session) return "";
    currentSupabaseProfile = null;
    const profile = await getCurrentSupabaseProfile();
    return getActiveOrganizationId(profile);
  } catch {
    return "";
  }
}

function isSupabasePermissionError(error) {
  return error?.code === "42501" || /row-level security|permission denied/i.test(String(error?.message || ""));
}

async function getProjectSiteSyncMessage(error, resource) {
  if (!isSupabasePermissionError(error)) return error?.message || `The ${resource} could not be saved.`;
  const { data: sessionValid } = await fieldDriveSupabase.rpc("session_is_valid").catch(() => ({ data: null }));
  if (sessionValid === false) return "Your login session has expired. Sign out, sign back in, and try again.";
  if (resource === "site") return "You can only add or rename sites in projects assigned to you.";
  return "This user does not have permission to add a project for this client. Apply the latest Supabase migration and try again.";
}

async function ensureSupabaseSite(community, homesite, profile, organizationId = getActiveOrganizationId(profile)) {
  if (homesite.source === "Supabase") return false;
  if (!organizationId) return false;

  const siteName = (homesite.name || "Site").trim();
  const fields = getSiteFields(homesite);
  const existing = await findSupabaseSiteByName(organizationId, community.id, siteName);
  const site = existing || await createSupabaseSite(organizationId, community.id, siteName, fields);
  if (!site?.id) return false;

  const oldId = homesite.id;
  homesite.id = site.id;
  homesite.fields = normalizeSiteFields(site.fields || fields);
  homesite.source = "Supabase";
  if (state.currentHomesiteId === oldId) state.currentHomesiteId = site.id;
  return true;
}

async function findSupabaseSiteByName(organizationId, projectId, name) {
  let query = fieldDriveSupabase
    .from("sites")
    .select("id, name, fields, project_id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .limit(1);

  query = projectId ? query.eq("project_id", projectId) : query.is("project_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function createSupabaseSite(organizationId, projectId, name, fields) {
  if (!projectId) throw new Error("Select a project for every site before saving.");

  const normalizedFields = normalizeSiteFields(fields);
  let { data, error } = await fieldDriveSupabase.rpc("create_site_for_current_user", {
    p_project_id: projectId,
    p_name: name,
    p_fields: normalizedFields
  });

  if (!error) {
    const site = Array.isArray(data) ? data[0] : data;
    if (site?.id) return site;
    throw new Error("The site was created but could not be loaded.");
  }

  const rpcIsUnavailable = ["PGRST202", "42883"].includes(error.code)
    || /create_site_for_current_user|schema cache/i.test(error.message || "");

  if (rpcIsUnavailable) {
    ({ data, error } = await fieldDriveSupabase
      .from("sites")
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        name,
        fields: normalizedFields
      })
      .select("id, name, fields, project_id")
      .single());
  }

  if (error) throw error;
  return data;
}

async function selectSupabaseSitesForApp(organizationId) {
  const withProject = await fieldDriveSupabase
    .from("sites")
    .select("id, name, fields, project_id, created_at, archived_at, projects(id, name, archived_at)")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (!withProject.error) return withProject;
  if (!["42703", "PGRST200", "PGRST201", "PGRST204"].includes(withProject.error.code)) return withProject;

  return fieldDriveSupabase
    .from("sites")
    .select("id, name, fields, project_id, created_at, projects(id, name)")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
}

async function selectSupabaseItemsForApp(organizationId) {
  const withCreator = await fieldDriveSupabase
    .from("punch_items")
    .select("id, site_id, location, location_area, location_detail, trade, item, notes, shared_note, shared_note_updated_at, shared_note_source, completed, completed_at, trade_completed, trade_completed_at, created_by, created_at, updated_at, profiles(display_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!withCreator.error) return withCreator;
  if (!["42703", "PGRST200", "PGRST201", "PGRST204"].includes(withCreator.error.code)) return withCreator;

  return fieldDriveSupabase
    .from("punch_items")
    .select("id, site_id, location, location_area, location_detail, trade, item, notes, shared_note, completed, completed_at, trade_completed, trade_completed_at, created_by, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
}

async function selectSupabaseContactsForApp(organizationId) {
  const withFields = await fieldDriveSupabase
    .from("contacts")
    .select("id, trade, vendor, job_desc, contact_name, email, phone, alternate_contact, fields, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!withFields.error) return withFields;
  if (!["42703", "PGRST200", "PGRST204"].includes(withFields.error.code)) return withFields;

  return fieldDriveSupabase
    .from("contacts")
    .select("id, trade, vendor, job_desc, contact_name, email, phone, alternate_contact, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
}

async function selectSupabaseSiteDocuments(organizationId, siteId = "") {
  const buildQuery = (columns) => {
    let query = fieldDriveSupabase
      .from("site_documents")
      .select(columns)
      .eq("organization_id", organizationId);
    if (siteId) query = query.eq("site_id", siteId);
    return query.order("created_at", { ascending: false });
  };
  const result = await buildQuery("id, site_id, title, category, description, document_date, quick_access, storage_path, file_name, content_type, size_bytes, uploaded_by, created_at, updated_at");
  if (!result.error || !["42703", "PGRST204"].includes(result.error.code)) return result;
  return buildQuery("id, site_id, title, category, description, document_date, storage_path, file_name, content_type, size_bytes, uploaded_by, created_at, updated_at");
}

function mergeSupabaseProjectsAndSites(projectRows, siteRows, itemRows = [], photoRows = [], documentRows = []) {
  const projectNames = new Map(projectRows.map((project) => [project.id, project.name]));
  const homesiteIssuesById = new Map();
  const photosByItem = groupSupabasePhotosByItem(photoRows);
  const supabaseIssuesBySiteId = groupSupabaseItemsBySite(itemRows, photosByItem);
  const documentsBySiteId = groupSiteDocumentsBySite(documentRows);

  (state.communities || []).forEach((community) => {
    (community.homesites || []).forEach((homesite) => {
      homesiteIssuesById.set(homesite.id, {
        issues: homesite.issues || [],
        reportId: homesite.reportId || "",
        tradeReportKeys: homesite.tradeReportKeys || {},
        reportAccess: homesite.reportAccess || {}
      });
    });
  });

  const communitiesById = new Map();
  projectRows.forEach((project) => {
    communitiesById.set(project.id, {
      id: project.id,
      name: project.name || "Project",
      homesites: [],
      source: "Supabase"
    });
  });

  siteRows.forEach((site) => {
    const projectId = site.project_id || site.projects?.id || `supabase-unassigned`;
    const projectName = site.projects?.name || projectNames.get(site.project_id) || "Unassigned Sites";
    if (!communitiesById.has(projectId)) {
      communitiesById.set(projectId, {
        id: projectId,
        name: projectName,
        homesites: [],
        source: "Supabase"
      });
    }

    const existing = homesiteIssuesById.get(site.id);
    const existingLocalIssues = (existing?.issues || []).filter((issue) => issue.source !== "Supabase");
    communitiesById.get(projectId).homesites.push({
      id: site.id,
      name: site.name || "Site",
      fields: normalizeSiteFields(site.fields),
      issues: [...(supabaseIssuesBySiteId.get(site.id) || []), ...existingLocalIssues],
      documents: documentsBySiteId.get(site.id) || [],
      reportId: existing?.reportId || "",
      tradeReportKeys: existing?.tradeReportKeys || {},
      reportAccess: existing?.reportAccess || {},
      archivedAt: site.archived_at || "",
      source: "Supabase"
    });
  });

  const supabaseCommunities = [...communitiesById.values()]
    .map((community) => ({
      ...community,
      homesites: dedupeHomesites(community.homesites)
    }))
    .filter((community) => community.homesites.length || projectRows.some((project) => project.id === community.id));

  const supabaseIds = new Set(supabaseCommunities.map((community) => community.id));
  const localOnly = (state.communities || []).filter((community) => !supabaseIds.has(community.id) && hasLocalUnsyncedCommunityData(community));
  state.communities = [...supabaseCommunities, ...localOnly];

  if (!state.communities.some((community) => community.id === state.currentCommunityId)) {
    state.currentCommunityId = state.communities.find((community) => community.homesites.length)?.id || state.communities[0]?.id || "";
  }

  const currentCommunity = getCurrentCommunity();
  if (!currentCommunity?.homesites?.some((homesite) => homesite.id === state.currentHomesiteId && !isHomeArchived(homesite))) {
    state.currentHomesiteId = currentCommunity?.homesites?.find((homesite) => !isHomeArchived(homesite))?.id || getFirstHomeId(state.communities);
  }
}

function groupSiteDocumentsBySite(rows = []) {
  return rows.reduce((groups, row) => {
    if (!row.site_id) return groups;
    if (!groups.has(row.site_id)) groups.set(row.site_id, []);
    groups.get(row.site_id).push({
      id: row.id,
      siteId: row.site_id,
      title: row.title || row.file_name || "Document",
      category: row.category || "Other",
      description: row.description || "",
      documentDate: row.document_date || "",
      quickAccess: Boolean(row.quick_access),
      storagePath: row.storage_path || "",
      fileName: row.file_name || "document",
      contentType: row.content_type || "application/octet-stream",
      sizeBytes: Number(row.size_bytes || 0),
      uploadedBy: row.uploaded_by || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    });
    return groups;
  }, new Map());
}

function hasLocalUnsyncedCommunityData(community) {
  if (community?.source === "Supabase") return false;
  const homesites = community?.homesites || [];
  if (!homesites.length) return false;
  return homesites.some((homesite) => {
    if (homesite.source !== "Supabase") return true;
    return (homesite.issues || []).some((issue) => issue.source !== "Supabase");
  });
}

function groupSupabaseItemsBySite(itemRows, photosByItem = new Map()) {
  const grouped = new Map();
  itemRows.forEach((item) => {
    if (!item.site_id) return;
    if (!grouped.has(item.site_id)) grouped.set(item.site_id, []);
    grouped.get(item.site_id).push(mapSupabaseItemToIssue(item, photosByItem.get(item.id) || []));
  });
  return grouped;
}

function mapSupabaseItemToIssue(item, photos = []) {
  return {
    id: item.id,
    room: item.location || [item.location_area, item.location_detail].filter(Boolean).join(" - "),
    locationArea: item.location_area || item.location || "",
    locationDetail: item.location_detail || "",
    trade: item.trade || "",
    issue: item.item || "",
    notes: item.notes || "",
    sharedNote: item.shared_note || "",
    sharedNoteUpdatedAt: item.shared_note_updated_at || "",
    sharedNoteSource: item.shared_note_source || "",
    completed: Boolean(item.completed),
    completedAt: item.completed_at || "",
    tradeCompleted: Boolean(item.trade_completed),
    tradeCompletedAt: item.trade_completed_at || "",
    createdBy: item.created_by || "",
    addedByName: item.profiles?.display_name || "",
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || item.created_at || "",
    photos: photos.map(mapSupabasePhotoToAppPhoto),
    source: "Supabase"
  };
}

function groupSupabasePhotosByItem(photoRows = []) {
  return photoRows.reduce((groups, photo) => {
    if (!photo.item_id) return groups;
    if (!groups.has(photo.item_id)) groups.set(photo.item_id, []);
    groups.get(photo.item_id).push(photo);
    return groups;
  }, new Map());
}

function mapSupabasePhotoToAppPhoto(photo) {
  if (String(photo.storage_path || "").startsWith("data:image/")) {
    return {
      dataUrl: photo.storage_path,
      name: photo.file_name || "issue-photo.jpg",
      type: photo.content_type || "image/jpeg",
      completionProof: Boolean(photo.completion_proof),
      createdAt: photo.created_at || ""
    };
  }

  return {
    id: photo.storage_path || photo.id,
    signedUrl: photo.signed_url || "",
    name: photo.file_name || "issue-photo.jpg",
    type: photo.content_type || "image/jpeg",
    completionProof: Boolean(photo.completion_proof),
    createdAt: photo.created_at || ""
  };
}

function mergeSupabaseContacts(contactRows) {
  const localContacts = (state.customContacts || []).filter((contact) => contact.source !== "Supabase");
  const supabaseContacts = contactRows.map((contact) => ({
    id: contact.id,
    tradeType: contact.contact_name || contact.trade || "",
    vendor: contact.vendor || "",
    jobDesc: contact.job_desc || "",
    contactName: contact.contact_name || contact.trade || "",
    contactEmail: contact.email || "",
    contactPhone: contact.phone || "",
    alternateContact: contact.alternate_contact || "",
    fields: normalizeContactFields(contact.fields),
    source: "Supabase"
  }));

  state.customContacts = [...supabaseContacts, ...localContacts];
}

function mergeSupabaseSettings(tradeRows = [], locationRows = [], itemRows = []) {
  const sharedSettingsInitialized = locationRows.some((location) => location.name === sharedSettingsMarkerName);
  const locations = locationRows
    .filter((location) => location.name !== sharedSettingsMarkerName)
    .map((location) => location.name)
    .filter(Boolean);
  const tradeIssuesFromSettings = {};
  tradeRows.forEach((trade) => {
    if (!trade.name) return;
    tradeIssuesFromSettings[trade.name] = sharedSettingsInitialized ? [] : ["Other"];
  });
  itemRows.forEach((item) => {
    const tradeName = item.trade_settings?.name || "";
    if (!tradeName || !item.name) return;
    tradeIssuesFromSettings[tradeName] ||= sharedSettingsInitialized ? [] : ["Other"];
    tradeIssuesFromSettings[tradeName] = mergeUnique(tradeIssuesFromSettings[tradeName], [item.name]);
  });

  state.sharedSettingsInitialized = sharedSettingsInitialized;
  state.sharedSettingIds = {
    locations: Object.fromEntries(
      locationRows
        .filter((location) => location.name && location.name !== sharedSettingsMarkerName)
        .map((location) => [location.name, location.id])
    ),
    trades: Object.fromEntries(tradeRows.filter((trade) => trade.name).map((trade) => [trade.name, trade.id])),
    items: itemRows.reduce((itemsByTrade, item) => {
      const tradeName = item.trade_settings?.name || "";
      if (!tradeName || !item.name) return itemsByTrade;
      itemsByTrade[tradeName] ||= {};
      itemsByTrade[tradeName][item.name] = item.id;
      return itemsByTrade;
    }, {})
  };
  if (sharedSettingsInitialized) {
    state.rooms = locations.length ? mergeUnique([], locations) : ["Other"];
  } else if (locations.length) {
    state.rooms = mergeUnique(["Other"], locations);
  }
  if (Object.keys(tradeIssuesFromSettings).length) {
    const nextTradeIssues = Object.fromEntries(
      Object.entries(tradeIssuesFromSettings).map(([trade, items]) => [
        trade,
        mergeUnique(sharedSettingsInitialized ? [] : ["Other"], items)
      ])
    );
    state.tradeIssues = sharedSettingsInitialized
      ? nextTradeIssues
      : mergeTradeIssueOptions(tradeIssues, nextTradeIssues);
  }
}

async function fetchSharedSettingRows(organizationId) {
  const [tradeResult, locationResult, itemResult] = await Promise.all([
    fieldDriveSupabase
      .from("trade_settings")
      .select("id, name, sort_order")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    fieldDriveSupabase
      .from("location_settings")
      .select("id, name, sort_order")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    fieldDriveSupabase
      .from("item_settings")
      .select("id, name, sort_order, trade_id, trade_settings(name)")
      .eq("organization_id", organizationId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
  ]);

  if (tradeResult.error) throw tradeResult.error;
  if (locationResult.error) throw locationResult.error;
  if (itemResult.error) throw itemResult.error;
  return {
    tradeRows: tradeResult.data || [],
    locationRows: locationResult.data || [],
    itemRows: itemResult.data || []
  };
}

async function ensureSharedSettingsInitialized(profile, organizationId, initialRows = null) {
  const existingRows = initialRows || await fetchSharedSettingRows(organizationId);
  if (existingRows.locationRows.some((location) => location.name === sharedSettingsMarkerName)) {
    return existingRows;
  }
  if (profile?.role !== "admin") return existingRows;
  if (sharedSettingsInitializationPromise) return sharedSettingsInitializationPromise;

  sharedSettingsInitializationPromise = (async () => {
    const locationNames = mergeUnique(
      state.rooms || [],
      existingRows.locationRows.filter((location) => location.name !== sharedSettingsMarkerName).map((location) => location.name)
    );
    const locationSeedRows = [
      { organization_id: organizationId, name: sharedSettingsMarkerName, sort_order: -1 },
      ...locationNames.map((name, index) => ({ organization_id: organizationId, name, sort_order: index }))
    ];
    const locationSeed = await fieldDriveSupabase
      .from("location_settings")
      .upsert(locationSeedRows, { onConflict: "organization_id,name" });
    if (locationSeed.error) throw locationSeed.error;

    const tradeNames = mergeUnique(
      Object.keys(state.tradeIssues || {}),
      existingRows.tradeRows.map((trade) => trade.name)
    );
    const tradeSeed = await fieldDriveSupabase
      .from("trade_settings")
      .upsert(
        tradeNames.map((name, index) => ({ organization_id: organizationId, name, sort_order: index })),
        { onConflict: "organization_id,name" }
      );
    if (tradeSeed.error) throw tradeSeed.error;

    const tradeResult = await fieldDriveSupabase
      .from("trade_settings")
      .select("id, name, sort_order")
      .eq("organization_id", organizationId);
    if (tradeResult.error) throw tradeResult.error;

    const existingItemsByTrade = {};
    existingRows.itemRows.forEach((item) => {
      const tradeName = item.trade_settings?.name || "";
      if (!tradeName || !item.name) return;
      existingItemsByTrade[tradeName] ||= [];
      existingItemsByTrade[tradeName].push(item.name);
    });
    const itemSeedRows = (tradeResult.data || []).flatMap((trade) => {
      const names = mergeUnique(state.tradeIssues?.[trade.name] || [], existingItemsByTrade[trade.name] || []);
      return names.map((name, index) => ({
        organization_id: organizationId,
        trade_id: trade.id,
        name,
        sort_order: index
      }));
    });
    if (itemSeedRows.length) {
      const itemSeed = await fieldDriveSupabase
        .from("item_settings")
        .upsert(itemSeedRows, { onConflict: "organization_id,trade_id,name" });
      if (itemSeed.error) throw itemSeed.error;
    }

    return fetchSharedSettingRows(organizationId);
  })();

  try {
    return await sharedSettingsInitializationPromise;
  } finally {
    sharedSettingsInitializationPromise = null;
  }
}

async function ensureSharedSettingsReadyForEdit() {
  if (!fieldDriveSupabase) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login is not connected to the client organization.");
  if (profile?.role !== "admin") throw new Error("Only an administrator can rename shared settings.");
  const rows = await ensureSharedSettingsInitialized(profile, organizationId);
  if (!rows.locationRows.some((location) => location.name === sharedSettingsMarkerName)) {
    throw new Error("Shared settings could not be prepared. Refresh and try again.");
  }
  mergeSupabaseSettings(rows.tradeRows, rows.locationRows, rows.itemRows);
}

function refreshAfterStateChange() {
  populateSelect(roomSelect, state.rooms);
  populateSelect(tradeSelect, Object.keys(state.tradeIssues));
  populateIssueOptions();
  populateContactTradeFilter();
  populateHomesiteInfoFilters();
  populateAllReportFilters();
  renderContacts();
  renderHomesiteInfo();
  renderAllReports();
  renderSettingsLists();
  render();
}

function shouldKeepLocalState(cloudState) {
  const localState = loadState();
  if (!localState?.updatedAt) return false;
  if (!cloudState?.updatedAt) return hasAnyIssue(localState) || Date.now() - lastLocalChangeAt < cloudHydrateQuietMs;

  const localUpdated = new Date(localState.updatedAt).getTime();
  const cloudUpdated = new Date(cloudState.updatedAt).getTime();
  return Number.isFinite(localUpdated) && Number.isFinite(cloudUpdated) && localUpdated > cloudUpdated;
}

function hasAnyIssue(candidateState) {
  return (candidateState.communities || []).some((community) =>
    (community.homesites || []).some((homesite) => (homesite.issues || []).length)
  );
}

function scheduleCloudSave() {
  if (!shouldUseNetlifyCloudState()) return;

  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloudState, 800);
}

async function saveCloudState() {
  if (!shouldUseNetlifyCloudState()) return;

  try {
    const cloudState = await prepareStateForCloud();
    await fetch("/.netlify/functions/app-state", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cloudState)
    });
    await saveCurrentSharedReport();
    await saveAllSharedReport();
  } catch {
    // Local storage remains the offline fallback when Netlify Functions are unavailable.
  }
}

function shouldUseNetlifyCloudState() {
  return !fieldDriveSupabase && !isLocalPreview();
}

async function prepareStateForCloud() {
  if (isLocalPreview()) return state;

  let changed = false;
  for (const community of state.communities || []) {
    for (const homesite of community.homesites || []) {
      if (!homesite.reportId) {
        getHomesiteReportId(community, homesite);
        changed = true;
      }
      const beforeTradeKeys = JSON.stringify(homesite.tradeReportKeys || {});
      buildTradeReportKeys(homesite);
      if (beforeTradeKeys !== JSON.stringify(homesite.tradeReportKeys || {})) changed = true;
      for (const issue of homesite.issues || []) {
        if ((issue.photos || []).some((photo) => photo.dataUrl && !photo.id)) {
          issue.photos = await persistSelectedPhotos(issue.photos);
          changed = true;
        }
      }
    }
  }

  if (changed) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Cloud storage will hold the smaller state even if this device is out of space.
    }
  }

  return state;
}

async function saveCurrentSharedReport() {
  if (isLocalPreview()) return;

  const community = getCurrentCommunity();
  const homesite = getCurrentHomesite();
  const report = buildHomesiteSharedReport(community, homesite);
  if (!report) return;

  await saveHomesiteSharedReport(report);
}

async function saveHomesiteSharedReport(report) {
  const response = await fetch("/.netlify/functions/shared-report", {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(report)
  });
  if (!response.ok) throw new Error("Report could not be refreshed.");
}

async function saveAllSharedReport(scope = getSelectedAllReportScope()) {
  if (isLocalPreview()) return;
  if (!scope) return;

  const response = await fetch("/.netlify/functions/all-report", {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify(buildAllSharedReport(scope))
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "All-sites report links could not be secured.");
  }
}

async function selectSupabaseProjectsForApp(organizationId) {
  const withArchive = await fieldDriveSupabase
    .from("projects")
    .select("id, name, created_at, archived_at")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (!withArchive.error) return withArchive;
  if (!["42703", "PGRST204"].includes(withArchive.error.code)) return withArchive;
  return fieldDriveSupabase
    .from("projects")
    .select("id, name, created_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
}

function buildAllSharedReport(scope = getSelectedAllReportScope()) {
  if (!scope) return null;
  const scopedRows = getAllIssueRows(true).filter((row) => !scope.projectId || getCommunityReportScopeId(row.community) === scope.projectId);
  const tradeKeys = buildAllTradeReportKeys(scope.reportId, scopedRows);
  return {
    id: scope.reportId,
    projectId: scope.projectId,
    projectName: scope.projectName,
    organizationId: getActiveOrganizationId(),
    siteIds: scope.siteIds,
    clientName: supabaseConfig.clientName || "",
    starterType: supabaseConfig.starterType || "builder",
    builderMarket: supabaseConfig.builderMarket || "",
    tradeKeys,
    _access: {
      trades: Object.fromEntries(Object.values(tradeKeys).map((trade) => [trade, getAllTradeReportAccess(trade, scope.reportId)]))
    },
    issues: scopedRows.map((row) => ({
      id: row.issue.id,
      communityId: row.community.id,
      community: row.community.name,
      homesiteId: row.homesite.id,
      reportId: row.homesite.reportId || getHomesiteReportId(row.community, row.homesite),
      homesiteName: row.homesite.name,
      siteFields: getSiteFields(row.homesite),
      block: row.homesite.block || "",
      lot: row.homesite.lot || "",
      address: getSiteFieldValue(row.homesite, "Address") || row.homesite.address || "",
      model: row.homesite.model || "",
      elevation: row.homesite.elevation || "",
      permitNumber: getSiteFieldValue(row.homesite, "Permit") || row.homesite.permitNumber || "",
      garageSwing: row.homesite.garageSwing || "",
      structuralOption: row.homesite.structuralOption || "",
      room: row.issue.room,
      trade: row.issue.trade,
      issue: row.issue.issue,
      notes: row.issue.notes || "",
      photos: row.issue.photos || [],
      createdAt: row.issue.createdAt,
      sharedNote: row.issue.sharedNote || "",
      sharedNoteUpdatedAt: row.issue.sharedNoteUpdatedAt || "",
      tradeCompleted: Boolean(row.issue.tradeCompleted),
      tradeCompletedAt: row.issue.tradeCompletedAt || "",
      completed: Boolean(row.issue.completed),
      completedAt: row.issue.completedAt || "",
      updatedAt: row.issue.updatedAt || row.issue.createdAt || ""
    }))
  };
}

function buildCurrentSharedReport() {
  const community = getCurrentCommunity();
  const homesite = getCurrentHomesite();
  return buildHomesiteSharedReport(community, homesite);
}

function buildHomesiteSharedReport(community, homesite) {
  if (!community || !homesite) return null;
  const tradeKeys = buildTradeReportKeys(homesite);

  return {
    id: getHomesiteReportId(community, homesite),
    organizationId: getActiveOrganizationId(),
    clientName: supabaseConfig.clientName || "",
    starterType: supabaseConfig.starterType || "builder",
    builderMarket: supabaseConfig.builderMarket || "",
    community: community.name,
    tradeKeys,
    _access: {
      site: getHomesiteReportAccess(homesite),
      trades: Object.fromEntries(Object.values(tradeKeys).map((trade) => [trade, getHomesiteReportAccess(homesite, trade)]))
    },
    homesite: {
      id: homesite.id,
      name: homesite.name,
      fields: getSiteFields(homesite),
      block: homesite.block || "",
      lot: homesite.lot || "",
      address: homesite.address || "",
      model: homesite.model || "",
      elevation: homesite.elevation || "",
      permitNumber: homesite.permitNumber || "",
      garageSwing: homesite.garageSwing || "",
      structuralOption: homesite.structuralOption || ""
    },
    issues: (homesite.issues || []).map((issue) => ({
      id: issue.id,
      room: issue.room,
      trade: issue.trade,
      issue: issue.issue,
      notes: issue.notes || "",
      photos: issue.photos || [],
      createdAt: issue.createdAt,
      sharedNote: issue.sharedNote || "",
      sharedNoteUpdatedAt: issue.sharedNoteUpdatedAt || "",
      sharedNoteSource: issue.sharedNoteSource || "",
      tradeCompleted: Boolean(issue.tradeCompleted),
      tradeCompletedAt: issue.tradeCompletedAt || "",
      completed: Boolean(issue.completed),
      completedAt: issue.completedAt || "",
      updatedAt: issue.updatedAt || issue.createdAt || ""
    }))
  };
}

function getHomesiteReportId(community, homesite) {
  if (homesite.reportId) return homesite.reportId;

  const key = `${community.id}:${homesite.id}`;
  const savedIds = loadReportIds();
  if (!savedIds[key]) {
    savedIds[key] = `${slugify(homesite.name || homesite.address || "home")}-${randomReportToken()}`;
    localStorage.setItem(reportIdStorageKey, JSON.stringify(savedIds));
  }
  homesite.reportId = savedIds[key];
  return homesite.reportId;
}

function loadReportIds() {
  try {
    return JSON.parse(localStorage.getItem(reportIdStorageKey) || "{}");
  } catch {
    return {};
  }
}

function randomReportToken() {
  if (crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function createReportAccessBundle() {
  return {
    read: randomReportToken(),
    update: randomReportToken(),
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    revoked: false
  };
}

function normalizeReportAccessBundle(value) {
  if (!value?.read || !value?.update || !value?.expiresAt) return createReportAccessBundle();
  if (!value.revoked && new Date(value.expiresAt).getTime() <= Date.now()) return createReportAccessBundle();
  return value;
}

function getHomesiteReportAccess(homesite, trade = "") {
  homesite.reportAccess ||= { site: null, trades: {} };
  homesite.reportAccess.trades ||= {};
  if (trade) {
    homesite.reportAccess.trades[trade] = normalizeReportAccessBundle(homesite.reportAccess.trades[trade]);
    return homesite.reportAccess.trades[trade];
  }
  homesite.reportAccess.site = normalizeReportAccessBundle(homesite.reportAccess.site);
  return homesite.reportAccess.site;
}

function loadAllTradeReportAccess() {
  try {
    return JSON.parse(localStorage.getItem(allTradeReportAccessStorageKey) || "{}");
  } catch {
    return {};
  }
}

function getAllTradeReportAccess(trade, reportId = getSelectedAllReportScope()?.reportId || allOpenReportId) {
  const access = loadAllTradeReportAccess();
  const scopeKey = getAllTradeReportScopeKey(reportId, trade);
  const legacyAccess = reportId === allOpenReportId ? access[trade] : null;
  access[scopeKey] = normalizeReportAccessBundle(access[scopeKey] || legacyAccess);
  if (reportId === allOpenReportId && access[trade]) delete access[trade];
  localStorage.setItem(allTradeReportAccessStorageKey, JSON.stringify(access));
  return access[scopeKey];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28) || "home";
}

function getHomeReportUrl(permission = "update") {
  const community = getCurrentCommunity();
  const homesite = getCurrentHomesite();
  if (!community || !homesite) return "";

  const url = new URL("home-report.html", window.location.href);
  url.searchParams.set("r", getHomesiteReportId(community, homesite));
  url.searchParams.set("access", getHomesiteReportAccess(homesite)[permission]);
  return url.toString();
}

function getTradeReportUrl(trade, permission = "update") {
  const community = getCurrentCommunity();
  const homesite = getCurrentHomesite();
  if (!community || !homesite) return "";

  const url = new URL("trade-report.html", window.location.href);
  url.searchParams.set("r", getHomesiteReportId(community, homesite));
  url.searchParams.set("trade", getTradeReportKey(homesite, trade));
  url.searchParams.set("access", getHomesiteReportAccess(homesite, trade)[permission]);
  return url.toString();
}

function buildTradeReportKeys(homesite) {
  const keys = {};
  [...new Set((homesite.issues || []).map((issue) => issue.trade).filter(Boolean))].forEach((trade) => {
    keys[getTradeReportKey(homesite, trade)] = trade;
  });
  return keys;
}

function getTradeReportKey(homesite, trade) {
  homesite.tradeReportKeys ||= {};
  if (!homesite.tradeReportKeys[trade]) {
    homesite.tradeReportKeys[trade] = `${slugify(trade)}-${randomReportToken()}`;
  }
  return homesite.tradeReportKeys[trade];
}

function buildAllTradeReportKeys(reportId = getSelectedAllReportScope()?.reportId || allOpenReportId, rows = getAllOpenIssues()) {
  const keys = {};
  rows.forEach((row) => {
    const trade = row.issue.trade;
    if (trade) keys[getAllTradeReportKey(trade, reportId)] = trade;
  });
  return keys;
}

function getAllTradeReportKey(trade, reportId = getSelectedAllReportScope()?.reportId || allOpenReportId) {
  const keys = loadAllTradeReportKeys();
  const scopeKey = getAllTradeReportScopeKey(reportId, trade);
  const legacyKey = reportId === allOpenReportId ? keys[trade] : "";
  if (!keys[scopeKey]) {
    keys[scopeKey] = legacyKey || `${slugify(trade)}-${randomReportToken()}-${randomReportToken()}`;
    localStorage.setItem(allTradeReportKeyStorageKey, JSON.stringify(keys));
  }
  if (reportId === allOpenReportId && keys[trade]) {
    delete keys[trade];
    localStorage.setItem(allTradeReportKeyStorageKey, JSON.stringify(keys));
  }
  return keys[scopeKey];
}

function loadAllTradeReportKeys() {
  try {
    return JSON.parse(localStorage.getItem(allTradeReportKeyStorageKey) || "{}");
  } catch {
    return {};
  }
}

function getAllTradeReportScopeKey(reportId, trade) {
  return `${reportId}::${trade}`;
}

function getProjectOpenReportId(projectId) {
  return projectId ? `${projectOpenReportPrefix}${projectId}` : allOpenReportId;
}

function getCommunityReportScopeId(community) {
  return String(community?.id || `legacy-${slugify(community?.name || "project")}`);
}

function getSelectedAllReportProjectId() {
  const selectedProjectId = String(allCommunityFilter?.value || "");
  if ((state.communities || []).some((community) => getCommunityReportScopeId(community) === selectedProjectId)) return selectedProjectId;
  return "";
}

function getAllReportScope(projectId = getSelectedAllReportProjectId()) {
  const normalizedProjectId = String(projectId || "");
  const project = (state.communities || []).find((community) => getCommunityReportScopeId(community) === normalizedProjectId) || null;
  if (normalizedProjectId && !project) return null;
  const projects = project ? [project] : state.communities || [];
  return {
    reportId: getProjectOpenReportId(project?.id || ""),
    projectId: project?.id || "",
    projectName: project?.name || "",
    siteIds: projects.flatMap((community) => (community.homesites || []).map((homesite) => homesite.id)).filter(Boolean)
  };
}

function getSelectedAllReportScope() {
  return getAllReportScope(getSelectedAllReportProjectId());
}

function getAllTradeReportUrl(trade, permission = "update", scope = getSelectedAllReportScope()) {
  if (!trade || !scope) return "";
  const url = new URL("all-trade-report.html", window.location.href);
  url.searchParams.set("r", scope.reportId);
  url.searchParams.set("trade", getAllTradeReportKey(trade, scope.reportId));
  url.searchParams.set("tradeName", trade);
  url.searchParams.set("access", getAllTradeReportAccess(trade, scope.reportId)[permission]);
  return url.toString();
}

async function getShortReportUrl(reportUrl) {
  if (!reportUrl || isLocalPreview()) return reportUrl;
  try {
    const response = await fetch("/.netlify/functions/report-link", {
      method: "POST",
      credentials: "same-origin",
      headers: await getFunctionHeaders(),
      body: JSON.stringify({ url: reportUrl })
    });
    if (!response.ok) return reportUrl;
    const result = await response.json();
    if (result.path) return new URL(result.path, window.location.origin).toString();
    return result.url || reportUrl;
  } catch {
    return reportUrl;
  }
}

async function openHomeReport() {
  const longUrl = getHomeReportUrl();
  if (!longUrl) return;
  let reportUrl = longUrl;

  try {
    await saveCurrentSharedReport();
    reportUrl = await getShortReportUrl(longUrl);
  } catch {
    console.warn("The site report could not be refreshed before opening.");
  }
  openExternalReportUrl(reportUrl);
}

async function openTradeReport(trade) {
  const longUrl = getTradeReportUrl(trade);
  if (!longUrl) return;
  let reportUrl = longUrl;

  try {
    await saveCurrentSharedReport();
    reportUrl = await getShortReportUrl(longUrl);
  } catch {
    console.warn("The crew report could not be refreshed before opening.");
  }
  openExternalReportUrl(reportUrl);
}

function renderBrowserReportOptions() {
  const homesite = getCurrentHomesite();
  browserReportOptions.innerHTML = "";

  if (!homesite) {
    const empty = document.createElement("div");
    empty.className = "popup-empty";
    empty.textContent = "Select a site first.";
    browserReportOptions.append(empty);
    return;
  }

  const siteAccess = getHomesiteReportAccess(homesite);
  browserReportOptions.append(createReportOption("Site report", getHomeReportUrl(), openHomeReport, {
    readUrl: getHomeReportUrl("read"),
    access: siteAccess,
    onRegenerate: () => regenerateHomesiteReportAccess(homesite),
    onRevoke: () => revokeHomesiteReportAccess(homesite)
  }));

  const trades = [...new Set((homesite.issues || []).map((issue) => issue.trade).filter(Boolean))].sort();
  if (!trades.length) {
    const empty = document.createElement("div");
    empty.className = "popup-empty";
    empty.textContent = "Add items to create crew reports.";
    browserReportOptions.append(empty);
    return;
  }

  trades.forEach((trade) => {
    const access = getHomesiteReportAccess(homesite, trade);
    browserReportOptions.append(createReportOption(`${trade} report`, getTradeReportUrl(trade), () => openTradeReport(trade), {
      readUrl: getTradeReportUrl(trade, "read"),
      access,
      crewNameButton: true,
      onRegenerate: () => regenerateHomesiteReportAccess(homesite, trade),
      onRevoke: () => revokeHomesiteReportAccess(homesite, trade)
    }));
  });
}

function createReportOption(label, url, openReport, options = {}) {
  const row = document.createElement("div");
  row.className = "report-option-row";

  const openButton = document.createElement("button");
  openButton.className = options.crewNameButton
    ? "menu-item report-open-button crew-report-button"
    : "menu-item report-open-button";
  openButton.type = "button";
  openButton.textContent = label;
  openButton.disabled = Boolean(options.access?.revoked);
  openButton.addEventListener("click", async () => {
    closeReportPopups();
    await openReport();
  });

  const copyButton = document.createElement("button");
  copyButton.className = "menu-item copy-report-button";
  copyButton.type = "button";
  copyButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `;
  copyButton.setAttribute("aria-label", `Copy ${label} link`);
  copyButton.title = "Copy link";
  copyButton.addEventListener("click", async () => {
    await copyReportUrl(url, copyButton);
  });
  copyButton.disabled = Boolean(options.access?.revoked);

  row.append(openButton, copyButton);
  if (options.readUrl) {
    const readButton = createActionIcon("eye", `Copy view-only ${label} link`);
    readButton.disabled = Boolean(options.access?.revoked);
    readButton.addEventListener("click", () => copyReportUrl(options.readUrl, readButton));
    row.append(readButton);
  }
  if (options.onRegenerate) {
    const regenerateButton = createActionIcon("refresh", `Regenerate ${label} links`);
    regenerateButton.addEventListener("click", options.onRegenerate);
    row.append(regenerateButton);
  }
  if (options.onRevoke) {
    const revokeButton = createActionIcon("ban", `Revoke ${label} links`);
    revokeButton.disabled = Boolean(options.access?.revoked);
    revokeButton.addEventListener("click", options.onRevoke);
    row.append(revokeButton);
  }
  if (options.access?.expiresAt) row.title = options.access.revoked ? "Links revoked" : `Links expire ${new Date(options.access.expiresAt).toLocaleDateString()}`;
  return row;
}

async function revokeReportAccessTokens(endpoint, tokens, scope = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: await getFunctionHeaders(),
    body: JSON.stringify({ action: "revokeReportAccess", tokens, ...scope })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Report links could not be revoked.");
  }
}

async function revokeHomesiteReportAccess(homesite, trade = "") {
  const access = getHomesiteReportAccess(homesite, trade);
  if (!confirm(`Revoke the ${trade ? `${trade} report` : "site report"} links?`)) return;
  const reportId = homesite.reportId || getHomesiteReportId(getCurrentCommunity(), homesite);
  const legacyToken = trade ? getTradeReportKey(homesite, trade) : reportId;
  await revokeReportAccessTokens("/.netlify/functions/shared-report", [access.read, access.update, legacyToken], {
    reportId,
    reportKind: trade ? "trade" : "site",
    tradeName: trade || null
  });
  access.revoked = true;
  saveState();
  renderBrowserReportOptions();
}

async function regenerateHomesiteReportAccess(homesite, trade = "") {
  const oldAccess = getHomesiteReportAccess(homesite, trade);
  const reportId = homesite.reportId || getHomesiteReportId(getCurrentCommunity(), homesite);
  const legacyToken = trade ? getTradeReportKey(homesite, trade) : reportId;
  await revokeReportAccessTokens("/.netlify/functions/shared-report", [oldAccess.read, oldAccess.update, legacyToken], {
    reportId,
    reportKind: trade ? "trade" : "site",
    tradeName: trade || null
  }).catch(() => {});
  const nextAccess = createReportAccessBundle();
  if (trade) homesite.reportAccess.trades[trade] = nextAccess;
  else homesite.reportAccess.site = nextAccess;
  saveState();
  await saveHomesiteSharedReport(buildHomesiteSharedReport(getCurrentCommunity(), homesite));
  renderBrowserReportOptions();
}

function closeReportPopups() {
  browserReportPanel.classList.remove("open");
}

async function copyReportUrl(url, button) {
  let reportUrl = url;
  try {
    await Promise.allSettled([saveCurrentSharedReport(), saveAllSharedReport()]);
    reportUrl = await getShortReportUrl(url);
    await navigator.clipboard.writeText(reportUrl);
    button.classList.add("copied");
    setTimeout(() => {
      button.classList.remove("copied");
    }, 1400);
  } catch {
    prompt("Copy report link", reportUrl);
  }
}

function openExternalReportUrl(url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}

function getCurrentCommunity() {
  return state.communities.find((community) => community.id === state.currentCommunityId) || state.communities[0];
}

function getCurrentHomesite() {
  const community = getCurrentCommunity();
  if (!community) return null;
  const activeHomes = (community.homesites || []).filter((home) => !isHomeArchived(home));
  return activeHomes.find((home) => home.id === state.currentHomesiteId) || activeHomes[0] || null;
}

function populateSelect(select, values) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function populateIssueOptions() {
  populateSelect(issueSelect, state.tradeIssues[tradeSelect.value] || ["Other"]);
}

function syncDropdownEditors() {
  populateSelect(roomSelect, state.rooms);
  populateSelect(tradeSelect, Object.keys(state.tradeIssues));
  populateIssueOptions();
  renderSettingsLists();
}

function getIssueFormSelection() {
  return {
    room: roomSelect.value,
    locationDetail: locationDetailInput.value,
    trade: tradeSelect.value,
    issue: issueSelect.value
  };
}

function restoreIssueFormSelection(selection) {
  if (!selection) return;

  if ([...roomSelect.options].some((option) => option.value === selection.room)) {
    roomSelect.value = selection.room;
  }
  locationDetailInput.value = selection.locationDetail || "";

  if ([...tradeSelect.options].some((option) => option.value === selection.trade)) {
    tradeSelect.value = selection.trade;
  }

  populateIssueOptions();

  if ([...issueSelect.options].some((option) => option.value === selection.issue)) {
    issueSelect.value = selection.issue;
  }
}

function getLocationValue() {
  const area = roomSelect.value.trim();
  const detail = locationDetailInput.value.trim();
  if (!detail) return area;
  if (!area || area === "Other") return detail;
  return `${area} - ${detail}`;
}

function getIssueLocation(issue) {
  return issue?.room || [issue?.locationArea, issue?.locationDetail].filter(Boolean).join(" - ");
}

function addRoomOption() {
  const room = prompt("New location name");
  if (!room || !room.trim()) return;

  state.rooms = mergeUnique(state.rooms, [room.trim()]);
  roomSelect.value = room.trim();
  syncDropdownEditors();
  roomSelect.value = room.trim();
  addSupabaseSetting("location_settings", room.trim());
  saveState();
}

function addTradeOption() {
  const trade = prompt("New crew name");
  if (!trade || !trade.trim()) return;

  const tradeName = trade.trim();
  state.tradeIssues[tradeName] ||= ["Other"];
  if (!state.tradeIssues[tradeName].includes("Other")) state.tradeIssues[tradeName].push("Other");
  state.tradeEmails[tradeName] ||= "";

  tradeSelect.value = tradeName;
  syncDropdownEditors();
  tradeSelect.value = tradeName;
  settingsItemTradeSelect.value = tradeName;
  populateIssueOptions();
  renderSettingsItemList();
  addSupabaseSetting("trade_settings", tradeName);
  saveState();
}

function addIssueOption(targetTrade = "") {
  const trade = typeof targetTrade === "string" && targetTrade ? targetTrade : settingsItemTradeSelect.value || tradeSelect.value;
  const issue = prompt(`New issue option for ${trade}`);
  if (!issue || !issue.trim()) return;

  state.tradeIssues[trade] = mergeUnique(state.tradeIssues[trade] || [], [issue.trim()]);
  if (!state.tradeIssues[trade].includes("Other")) state.tradeIssues[trade].push("Other");
  syncDropdownEditors();
  tradeSelect.value = trade;
  settingsItemTradeSelect.value = trade;
  populateIssueOptions();
  issueSelect.value = issue.trim();
  renderSettingsItemList();
  addSupabaseItemSetting(trade, issue.trim());
  saveState();
}

async function addSupabaseSetting(table, name) {
  if (!fieldDriveSupabase || !name) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) return;
  const { error } = await fieldDriveSupabase.from(table).upsert({ organization_id: organizationId, name }, { onConflict: "organization_id,name" });
  if (error) console.warn("Setting could not be added to Supabase.", error);
}

async function addSupabaseItemSetting(tradeName, name) {
  if (!fieldDriveSupabase || !tradeName || !name) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) return;
  let tradeId = await findSupabaseTradeSettingId(tradeName);
  if (!tradeId) {
    await addSupabaseSetting("trade_settings", tradeName);
    tradeId = await findSupabaseTradeSettingId(tradeName);
  }
  const { error } = await fieldDriveSupabase
    .from("item_settings")
    .upsert({ organization_id: organizationId, trade_id: tradeId || null, name }, { onConflict: "organization_id,trade_id,name" });
  if (error) console.warn("Item could not be added to Supabase.", error);
}

function renderSettingsLists() {
  renderSettingsLocationList();
  renderSettingsTradeList();
  renderSettingsItemTradeSelect();
  renderSettingsItemList();
}

function loadCollapsedSettingsSections() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsCollapseStorageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function initializeSettingsCollapse() {
  document.querySelectorAll("[data-settings-section]").forEach((section) => {
    const key = section.dataset.settingsSection;
    const toggle = section.querySelector("[data-settings-collapse-toggle]");
    const content = toggle?.getAttribute("aria-controls")
      ? document.getElementById(toggle.getAttribute("aria-controls"))
      : null;
    if (!key || !toggle || !content) return;

    setSettingsSectionCollapsed(section, toggle, content, collapsedSettingsSections.has(key));
    toggle.addEventListener("click", () => {
      const collapsed = !section.classList.contains("is-collapsed");
      if (collapsed) collapsedSettingsSections.add(key);
      else collapsedSettingsSections.delete(key);
      localStorage.setItem(settingsCollapseStorageKey, JSON.stringify([...collapsedSettingsSections]));
      setSettingsSectionCollapsed(section, toggle, content, collapsed);
    });
  });
}

function setSettingsSectionCollapsed(section, toggle, content, collapsed) {
  section.classList.toggle("is-collapsed", collapsed);
  toggle.setAttribute("aria-expanded", String(!collapsed));
  content.hidden = collapsed;
}

function renderSettingsLocationList() {
  settingsLocationList.innerHTML = "";
  state.rooms.forEach((location) => {
    settingsLocationList.append(createSettingsRow(location, () => renameLocationOption(location), () => deleteLocationOption(location)));
  });
}

function renderSettingsTradeList() {
  settingsTradeList.innerHTML = "";
  Object.keys(state.tradeIssues).forEach((trade) => {
    settingsTradeList.append(createSettingsRow(trade, () => renameTradeOption(trade), () => deleteTradeOption(trade)));
  });
}

function renderSettingsItemTradeSelect() {
  const currentValue = settingsItemTradeSelect.value || tradeSelect.value;
  populateSelect(settingsItemTradeSelect, Object.keys(state.tradeIssues));
  if ([...settingsItemTradeSelect.options].some((option) => option.value === currentValue)) {
    settingsItemTradeSelect.value = currentValue;
  }
}

function renderSettingsItemList() {
  settingsItemList.innerHTML = "";
  const trade = settingsItemTradeSelect.value;
  (state.tradeIssues[trade] || []).forEach((item) => {
    settingsItemList.append(createSettingsRow(item, () => renameIssueOption(trade, item), () => deleteIssueOption(trade, item)));
  });
}

function createSettingsRow(label, editHandler, deleteHandler) {
  const row = document.createElement("div");
  row.className = "settings-row";

  const name = document.createElement("span");
  name.textContent = label;

  const editButton = document.createElement("button");
  editButton.className = "settings-icon-button";
  editButton.type = "button";
  editButton.setAttribute("aria-label", `Edit ${label}`);
  editButton.title = "Edit";
  editButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
  editButton.addEventListener("click", async () => {
    editButton.disabled = true;
    try {
      await editHandler();
    } catch (error) {
      alert(error.message || `The change to ${label} could not be saved.`);
    } finally {
      editButton.disabled = false;
    }
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "settings-icon-button danger";
  deleteButton.type = "button";
  deleteButton.setAttribute("aria-label", `Delete ${label}`);
  deleteButton.title = "Delete";
  deleteButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>`;
  deleteButton.addEventListener("click", async () => {
    deleteButton.disabled = true;
    try {
      await deleteHandler();
    } catch (error) {
      alert(error.message || `The deletion of ${label} could not be saved.`);
    } finally {
      deleteButton.disabled = false;
    }
  });

  const actions = document.createElement("div");
  actions.className = "settings-row-actions";
  actions.append(editButton, deleteButton);
  row.append(name, actions);
  return row;
}

async function renameLocationOption(location) {
  const next = prompt("Location name", location);
  if (!next?.trim() || next.trim() === location) return;
  const nextName = next.trim();
  await ensureSharedSettingsReadyForEdit();
  markLocalActivity();
  await renameSupabaseSetting("location_settings", location, nextName);
  state.rooms = state.rooms.map((item) => item === location ? nextName : item);
  moveSharedSettingId("locations", location, nextName);
  syncDropdownEditors();
  saveState();
}

async function renameTradeOption(trade) {
  const next = prompt("Crew name", trade);
  if (!next?.trim() || next.trim() === trade) return;
  const nextName = next.trim();
  await ensureSharedSettingsReadyForEdit();
  markLocalActivity();
  await renameSupabaseSetting("trade_settings", trade, nextName);
  state.tradeIssues[nextName] = state.tradeIssues[trade] || ["Other"];
  delete state.tradeIssues[trade];
  if (state.tradeEmails?.[trade]) state.tradeEmails[nextName] = state.tradeEmails[trade];
  delete state.tradeEmails?.[trade];
  moveSharedSettingId("trades", trade, nextName);
  state.sharedSettingIds.items[nextName] = state.sharedSettingIds.items[trade] || {};
  delete state.sharedSettingIds.items[trade];
  syncDropdownEditors();
  tradeSelect.value = nextName;
  settingsItemTradeSelect.value = nextName;
  saveState();
}

async function renameIssueOption(trade, item) {
  const next = prompt(`Item name for ${trade}`, item);
  if (!next?.trim() || next.trim() === item) return;
  const nextName = next.trim();
  await ensureSharedSettingsReadyForEdit();
  markLocalActivity();
  await renameSupabaseItemSetting(trade, item, nextName);
  state.tradeIssues[trade] = (state.tradeIssues[trade] || []).map((option) => option === item ? nextName : option);
  moveSharedItemSettingId(trade, item, nextName);
  syncDropdownEditors();
  settingsItemTradeSelect.value = trade;
  renderSettingsItemList();
  saveState();
}

async function deleteLocationOption(location) {
  if (!confirm(`Delete location "${location}"?`)) return;
  await ensureSharedSettingsReadyForEdit();
  await deleteSupabaseSetting("location_settings", location);
  state.rooms = state.rooms.filter((item) => item !== location);
  if (!state.rooms.length) state.rooms = ["Other"];
  delete state.sharedSettingIds.locations[location];
  syncDropdownEditors();
  saveState();
}

async function deleteTradeOption(trade) {
  if (Object.keys(state.tradeIssues).length <= 1) {
    alert("Keep at least one crew.");
    return;
  }
  if (!confirm(`Delete crew "${trade}"?`)) return;
  await ensureSharedSettingsReadyForEdit();
  await deleteSupabaseSetting("trade_settings", trade);
  delete state.tradeIssues[trade];
  delete state.tradeEmails[trade];
  delete state.sharedSettingIds.trades[trade];
  delete state.sharedSettingIds.items[trade];
  syncDropdownEditors();
  saveState();
}

async function deleteIssueOption(trade, item) {
  if ((state.tradeIssues[trade] || []).length <= 1) {
    alert("Keep at least one item for this crew.");
    return;
  }
  if (!confirm(`Delete item "${item}" from ${trade}?`)) return;
  await ensureSharedSettingsReadyForEdit();
  await deleteSupabaseItemSetting(trade, item);
  state.tradeIssues[trade] = (state.tradeIssues[trade] || []).filter((option) => option !== item);
  if (!state.tradeIssues[trade].length) state.tradeIssues[trade] = ["Other"];
  delete state.sharedSettingIds.items?.[trade]?.[item];
  syncDropdownEditors();
  settingsItemTradeSelect.value = trade;
  renderSettingsItemList();
  saveState();
}

async function renameSupabaseSetting(table, oldName, newName) {
  if (!fieldDriveSupabase) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login is not connected to the client organization.");
  const id = await resolveSupabaseSettingId(table, oldName, organizationId);
  if (!id) throw new Error("The setting was not found. Refresh and try again.");
  const { data, error } = await fieldDriveSupabase
    .from(table)
    .update({ name: newName })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The setting was not renamed. Refresh and try again.");
}

async function deleteSupabaseSetting(table, name) {
  if (!fieldDriveSupabase) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login is not connected to the client organization.");
  const id = await resolveSupabaseSettingId(table, name, organizationId);
  if (!id) throw new Error("The setting was not found. Refresh and try again.");
  const { data, error } = await fieldDriveSupabase.from(table).delete().eq("organization_id", organizationId).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The setting was not deleted. Refresh and try again.");
}

async function renameSupabaseItemSetting(tradeName, oldName, newName) {
  if (!fieldDriveSupabase) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login is not connected to the client organization.");
  const id = await resolveSupabaseItemSettingId(tradeName, oldName, organizationId);
  if (!id) throw new Error("The item was not found. Refresh and try again.");
  const { data, error } = await fieldDriveSupabase
    .from("item_settings")
    .update({ name: newName })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The item was not renamed. Refresh and try again.");
}

async function deleteSupabaseItemSetting(tradeName, name) {
  if (!fieldDriveSupabase) return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login is not connected to the client organization.");
  const id = await resolveSupabaseItemSettingId(tradeName, name, organizationId);
  if (!id) throw new Error("The item was not found. Refresh and try again.");
  const { data, error } = await fieldDriveSupabase.from("item_settings").delete().eq("organization_id", organizationId).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The item was not deleted. Refresh and try again.");
}

async function resolveSupabaseSettingId(table, name, organizationId) {
  const collection = table === "location_settings" ? "locations" : "trades";
  const knownId = state.sharedSettingIds?.[collection]?.[name] || "";
  if (knownId) return knownId;
  const { data, error } = await fieldDriveSupabase
    .from(table)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) {
    state.sharedSettingIds ||= normalizeSharedSettingIds();
    state.sharedSettingIds[collection][name] = data.id;
  }
  return data?.id || "";
}

async function resolveSupabaseItemSettingId(tradeName, name, organizationId) {
  const knownId = state.sharedSettingIds?.items?.[tradeName]?.[name] || "";
  if (knownId) return knownId;
  const tradeId = await resolveSupabaseSettingId("trade_settings", tradeName, organizationId);
  if (!tradeId) return "";
  const { data, error } = await fieldDriveSupabase
    .from("item_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("trade_id", tradeId)
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) {
    state.sharedSettingIds ||= normalizeSharedSettingIds();
    state.sharedSettingIds.items[tradeName] ||= {};
    state.sharedSettingIds.items[tradeName][name] = data.id;
  }
  return data?.id || "";
}

function moveSharedSettingId(collection, oldName, newName) {
  state.sharedSettingIds ||= normalizeSharedSettingIds();
  const id = state.sharedSettingIds[collection][oldName];
  if (id) state.sharedSettingIds[collection][newName] = id;
  delete state.sharedSettingIds[collection][oldName];
}

function moveSharedItemSettingId(tradeName, oldName, newName) {
  state.sharedSettingIds ||= normalizeSharedSettingIds();
  state.sharedSettingIds.items[tradeName] ||= {};
  const id = state.sharedSettingIds.items[tradeName][oldName];
  if (id) state.sharedSettingIds.items[tradeName][newName] = id;
  delete state.sharedSettingIds.items[tradeName][oldName];
}

async function findSupabaseTradeSettingId(tradeName) {
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId || !tradeName) return "";
  const { data, error } = await fieldDriveSupabase
    .from("trade_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", tradeName)
    .maybeSingle();
  if (error) {
    console.warn("Crew setting could not be found.", error);
    return "";
  }
  return data?.id || "";
}

async function addCommunity() {
  const name = prompt("Project name");
  if (!name || !name.trim()) return;

  const community = {
    id: createId(),
    name: name.trim(),
    homesites: []
  };
  const previousCommunityId = state.currentCommunityId;
  const previousHomesiteId = state.currentHomesiteId;

  state.communities.push(community);
  state.currentCommunityId = community.id;
  state.currentHomesiteId = "";
  saveState();
  render();
  if (fieldDriveSupabase) {
    try {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId) throw new Error("This login needs an organization profile before projects can sync.");
      await ensureSupabaseProject(community, profile, organizationId);
    } catch (error) {
      state.communities = state.communities.filter((candidate) => candidate !== community);
      state.currentCommunityId = state.communities.some((candidate) => candidate.id === previousCommunityId)
        ? previousCommunityId
        : state.communities[0]?.id || "";
      state.currentHomesiteId = previousHomesiteId;
      saveState();
      render();
      alert(await getProjectSiteSyncMessage(error, "project"));
      return;
    }
  }
  saveState();
  render();
}

async function renameCommunity() {
  const community = getCurrentCommunity();
  if (!community) {
    alert("Add a project first.");
    return;
  }
  markLocalActivity();
  const name = prompt("Rename project", community.name);
  if (!name || !name.trim()) return;

  const nextName = name.trim();
  if (nextName === community.name) return;

  if (fieldDriveSupabase) {
    try {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId) throw new Error("This login needs a profile before project changes can sync.");

      await ensureSupabaseProject(community, profile, organizationId);
      const { data, error } = await fieldDriveSupabase
        .from("projects")
        .update({ name: nextName })
        .eq("id", community.id)
        .eq("organization_id", organizationId)
        .select("id, name")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("The shared project record was not updated.");
    } catch (error) {
      alert(isSupabasePermissionError(error)
        ? "You can only rename projects assigned to you."
        : error.message || "The project could not be renamed. Check your connection and try again.");
      return;
    }
  }

  const previousName = community.name;
  community.name = nextName;
  community.source = fieldDriveSupabase ? "Supabase" : community.source;
  saveState();
  refreshProjectAndSiteDropdowns({ previousProjectName: previousName });
}

function addHomesite() {
  const community = ensureCurrentCommunity();
  populateNewSiteProjectSelect(community.id);
  inlineSiteForm.classList.remove("hidden");
  newSiteNameInput.focus();
}

function populateNewSiteProjectSelect(selectedProjectId = state.currentCommunityId) {
  newSiteProjectSelect.innerHTML = "";
  (state.communities || []).forEach((community) => {
    const option = document.createElement("option");
    option.value = community.id;
    option.textContent = community.name;
    newSiteProjectSelect.append(option);
  });
  if ([...newSiteProjectSelect.options].some((option) => option.value === selectedProjectId)) {
    newSiteProjectSelect.value = selectedProjectId;
  }
}

function refreshProjectAndSiteDropdowns({ previousProjectName = "", previousSiteName = "" } = {}) {
  const selectedProjectId = state.currentCommunityId;
  const selectedSiteId = state.currentHomesiteId;
  const currentProject = getCurrentCommunity();
  const currentSite = getCurrentHomesite();

  replaceSelectedFilterValue(infoCommunityFilter, previousProjectName, currentProject?.name || "");
  replaceSelectedFilterValue(allCommunityFilter, previousProjectName, currentProject?.name || "");
  replaceSelectedFilterValue(allSiteFilter, previousSiteName, currentSite?.name || "");

  renderCommunities();
  renderHomesites();
  communitySelect.value = selectedProjectId;
  homesiteSelect.value = selectedSiteId;
  populateNewSiteProjectSelect(state.currentCommunityId);
  refreshAfterStateChange();
}

function replaceSelectedFilterValue(select, previousValue, nextValue) {
  if (!previousValue || !nextValue || select.value !== previousValue) return;
  const option = [...select.options].find((candidate) => candidate.value === previousValue);
  if (option) {
    option.value = nextValue;
    option.textContent = nextValue;
  }
  select.value = nextValue;
}

function closeInlineSiteForm() {
  inlineSiteForm.classList.add("hidden");
  newSiteNameInput.value = "";
  newSiteAddressInput.value = "";
  newSitePermitInput.value = "";
  newSiteCustomFields.innerHTML = "";
}

function addSiteCustomFieldRow(label = "", value = "") {
  const row = document.createElement("div");
  row.className = "site-custom-field-row";
  row.innerHTML = `
    <input class="site-custom-field-label" type="text" autocomplete="off" placeholder="Field Name" value="${escapeHtml(label)}" />
    <input class="site-custom-field-value" type="text" autocomplete="off" placeholder="Value" value="${escapeHtml(value)}" />
    <button class="mini-button danger" data-remove-site-field type="button">Remove</button>
  `;
  newSiteCustomFields.append(row);
}

function removeSiteCustomFieldRow(event) {
  const button = event.target.closest("[data-remove-site-field]");
  if (!button) return;
  button.closest(".site-custom-field-row")?.remove();
}

function collectSiteCustomFields() {
  return [...newSiteCustomFields.querySelectorAll(".site-custom-field-row")]
    .map((row) => ({
      label: row.querySelector(".site-custom-field-label")?.value.trim() || "",
      value: row.querySelector(".site-custom-field-value")?.value.trim() || ""
    }))
    .filter((field) => field.label && field.value);
}

async function saveInlineSiteForm() {
  const name = newSiteNameInput.value.trim();
  if (!name) {
    alert("Add a site name.");
    newSiteNameInput.focus();
    return;
  }
  markLocalActivity();

  let community = state.communities.find((candidate) => candidate.id === newSiteProjectSelect.value);
  if (!community) community = ensureCurrentCommunity();

  const fields = [
    { label: "Address", value: newSiteAddressInput.value.trim() },
    { label: "Permit", value: newSitePermitInput.value.trim() },
    ...collectSiteCustomFields()
  ].filter((field) => field.label && field.value);
  const homesite = createHomesite(name);
  const previousHomesiteId = state.currentHomesiteId;
  homesite.fields = fields;
  community.homesites.push(homesite);
  state.currentCommunityId = community.id;
  state.currentHomesiteId = homesite.id;
  if (fieldDriveSupabase) {
    saveSiteFormButton.disabled = true;
    saveSiteFormButton.textContent = "Saving...";
    try {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId) throw new Error("This login needs an organization profile before sites can sync.");
      await ensureSupabaseProject(community, profile, organizationId);
      await ensureSupabaseSite(community, homesite, profile, organizationId);
    } catch (error) {
      community.homesites = community.homesites.filter((candidate) => candidate !== homesite);
      state.currentCommunityId = community.id;
      state.currentHomesiteId = community.homesites.some((candidate) => candidate.id === previousHomesiteId)
        ? previousHomesiteId
        : community.homesites[0]?.id || "";
      saveState();
      render();
      populateNewSiteProjectSelect(community.id);
      alert(await getProjectSiteSyncMessage(error, "site"));
      return;
    } finally {
      saveSiteFormButton.disabled = false;
      saveSiteFormButton.textContent = "Save site";
    }
  }
  saveState();
  closeInlineSiteForm();
  render();
}

function ensureCurrentCommunity() {
  const existingCommunity = getCurrentCommunity();
  if (existingCommunity) return existingCommunity;

  const community = {
    id: createId(),
    name: "Project",
    homesites: []
  };
  state.communities.push(community);
  state.currentCommunityId = community.id;
  return community;
}

function createHomesite(name) {
  return {
    id: createId(),
    name,
    fields: [],
    issues: [],
    documents: [],
    archivedAt: ""
  };
}

async function importHomesitesFromSpreadsheet(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  if (!window.XLSX) {
    alert("Excel import is still loading. Try again in a moment.");
    return;
  }

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const importedCommunities = parseHomesiteWorkbook(workbook);

    if (!importedCommunities.length) {
      alert("No sites were found. Make sure the sheet has at least one identifying column for each site.");
      return;
    }

    const importSummary = mergeImportedCommunities(importedCommunities);
    let syncWarning = "";
    if (fieldDriveSupabase && importSummary.addedCommunities.length) {
      try {
        await syncImportedCommunitiesToSupabase(importSummary.addedCommunities);
      } catch (error) {
        syncWarning = `\n\nThe sites were added on this device, but some could not sync yet: ${await getProjectSiteSyncMessage(error, "site")}`;
      }
    }
    const selectedCommunity = state.communities.find((community) =>
      normalizeSpreadsheetEntityKey(community.name) === normalizeSpreadsheetEntityKey(importedCommunities[0].name)
    ) || importedCommunities[0];
    const selectedHomesite = selectedCommunity.homesites.find((home) => normalizeSpreadsheetEntityKey(home.name) === normalizeSpreadsheetEntityKey(importedCommunities[0].homesites[0]?.name)) || selectedCommunity.homesites[0];
    state.currentCommunityId = selectedCommunity.id;
    state.currentHomesiteId = selectedHomesite?.id || "";
    saveState();
    render();
    alert(`Site import complete. ${importSummary.added} added and ${importSummary.skipped} duplicates skipped. Existing sites were not changed.${syncWarning}`);
  } catch (error) {
    alert(`Site import failed. ${error.message || "Check the spreadsheet format and try again."}`);
  }
}

async function syncImportedCommunitiesToSupabase(importedCommunities) {
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login needs an organization profile before sites can sync.");

  for (const importedCommunity of importedCommunities) {
    const community = (state.communities || []).find((candidate) =>
      normalizeSpreadsheetEntityKey(candidate.name) === normalizeSpreadsheetEntityKey(importedCommunity.name)
    );
    if (!community) continue;
    await ensureSupabaseProject(community, profile, organizationId);

    const importedSiteNames = new Set((importedCommunity.homesites || []).map((homesite) => normalizeSpreadsheetEntityKey(homesite.name)));
    for (const homesite of community.homesites || []) {
      if (!importedSiteNames.has(normalizeSpreadsheetEntityKey(homesite.name))) continue;
      if (homesite.source === "Supabase" && homesite.id) {
        const { data, error } = await fieldDriveSupabase
          .from("sites")
          .update({ fields: getSiteFields(homesite), project_id: community.id || null })
          .eq("organization_id", organizationId)
          .eq("id", homesite.id)
          .select("id");
        if (error) throw error;
        if (!data?.length) throw new Error(`The imported changes for ${homesite.name} were not saved.`);
      } else {
        await ensureSupabaseSite(community, homesite, profile, organizationId);
      }
    }
  }
}

function parseHomesiteWorkbook(workbook) {
  const communitiesByName = new Map();

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    rows.forEach((row) => {
      const normalizedRow = normalizeSpreadsheetRow(row);
      const communityName = normalizedRow.community || sheetName;
      const block = normalizedRow.block;
      const lot = normalizedRow.lot;
      const address = normalizedRow.address;
      const explicitSite = normalizedRow.site;
      const fallbackSite = normalizedRow.fields[0]?.value || "";

      if (!communityName || (!explicitSite && !block && !lot && !address && !fallbackSite)) return;

      const homesiteName = explicitSite || buildHomesiteName(block, lot, address, fallbackSite);
      if (!homesiteName) return;

      if (!communitiesByName.has(communityName)) {
        communitiesByName.set(communityName, {
          id: stableId(`community:${communityName}`),
          name: communityName,
          homesites: []
        });
      }

      communitiesByName.get(communityName).homesites.push(
        normalizePreloadedHomesite(communityName, {
          name: homesiteName,
          block,
          lot,
          address,
          model: normalizedRow.model,
          elevation: normalizedRow.elevation,
          permitNumber: normalizedRow.permitNumber,
          garageSwing: normalizedRow.garageSwing,
          structuralOption: normalizedRow.structuralOption,
          fields: normalizedRow.fields
        })
      );
    });
  });

  return [...communitiesByName.values()].map((community) => ({
    ...community,
    homesites: dedupeHomesites(community.homesites)
  })).filter((community) => community.homesites.length);
}

function normalizeSpreadsheetRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeColumnName(key)] = String(value ?? "").trim();
  });

  const fields = getSpreadsheetRowFields(row);

  return {
    community: normalized.project || normalized.community || "",
    site: normalized.site || normalized.sitename || normalized.homesite || normalized.home || "",
    block: normalized.block || "",
    lot: normalized.lot || "",
    address: normalized.address || "",
    model: normalized.model || "",
    elevation: normalized.elevation || normalized.elev || "",
    permitNumber: normalized.permitnumber || normalized.permit || "",
    garageSwing: normalized.garageswing || normalized.garage || "",
    structuralOption: getNormalizedColumnValue(normalized, ["structuraloption", "structuraloptions", "structualoption", "structualoptions"]),
    fields
  };
}

function getSpreadsheetRowFields(row) {
  const identifyingColumns = new Set(["project", "community", "site", "sitename", "homesite", "home"]);

  return Object.entries(row)
    .map(([label, value]) => ({
      label: String(label || "").trim(),
      value: String(value ?? "").trim()
    }))
    .filter((field) => field.label && field.value && !identifyingColumns.has(normalizeColumnName(field.label)));
}

function normalizeColumnName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeSpreadsheetEntityKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getNormalizedColumnValue(normalized, candidates) {
  for (const candidate of candidates) {
    if (normalized[candidate]) return normalized[candidate];
  }

  const matchingKey = Object.keys(normalized).find((key) => candidates.some((candidate) => key.startsWith(candidate)));
  return matchingKey ? normalized[matchingKey] : "";
}

function buildHomesiteName(block, lot, address, fallback = "") {
  if (block && lot) return `${block}${String(lot).padStart(2, "0")}`;
  if (lot) return lot;
  if (block) return block;
  return address || fallback;
}

function mergeImportedCommunities(importedCommunities) {
  const existingByCommunity = new Map(state.communities.map((community) => [normalizeSpreadsheetEntityKey(community.name), community]));
  const addedCommunities = [];
  let added = 0;
  let skipped = 0;

  importedCommunities.forEach((importedCommunity) => {
    const communityKey = normalizeSpreadsheetEntityKey(importedCommunity.name);
    const existingCommunity = existingByCommunity.get(communityKey);
    if (!existingCommunity) {
      state.communities.push(importedCommunity);
      existingByCommunity.set(communityKey, importedCommunity);
      addedCommunities.push(importedCommunity);
      added += importedCommunity.homesites.length;
      return;
    }

    const existingByName = new Map(existingCommunity.homesites.map((home) => [normalizeSpreadsheetEntityKey(home.name), home]));
    const addedHomesites = [];
    importedCommunity.homesites.forEach((importedHome) => {
      const homeKey = normalizeSpreadsheetEntityKey(importedHome.name);
      const existingHome = existingByName.get(homeKey);
      if (existingHome) {
        skipped += 1;
        return;
      }

      existingCommunity.homesites.push(importedHome);
      existingByName.set(homeKey, importedHome);
      addedHomesites.push(importedHome);
      added += 1;
    });
    if (addedHomesites.length) {
      addedCommunities.push({
        ...importedCommunity,
        id: existingCommunity.id,
        name: existingCommunity.name,
        homesites: addedHomesites
      });
    }
  });

  return { added, skipped, addedCommunities };
}

function downloadHomesitesXlsx() {
  if (!window.XLSX) {
    alert("Excel export is still loading. Try again in a moment.");
    return;
  }

  const community = getCurrentCommunity();
  const rows = (community?.homesites || []).map((homesite) => {
    const row = {
      Project: community.name || "",
      Site: homesite.name || ""
    };
    getSiteFields(homesite).forEach((field) => {
      row[field.label] = field.value;
    });
    return row;
  });

  if (!rows.length) {
    alert("There are no sites to download for this project.");
    return;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sites");
  XLSX.writeFile(workbook, `${slugify(community.name || "sites")}-sites-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function renameHomesite() {
  const homesite = getCurrentHomesite();
  if (!homesite) return;

  markLocalActivity();
  const name = prompt("Rename site", homesite.name);
  if (!name || !name.trim()) return;

  const nextName = name.trim();
  if (nextName === homesite.name) return;

  if (fieldDriveSupabase) {
    try {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId) throw new Error("This login needs a profile before site changes can sync.");

      const community = getCurrentCommunity();
      if (!community) throw new Error("The project for this site could not be found.");
      await ensureSupabaseProject(community, profile, organizationId);
      await ensureSupabaseSite(community, homesite, profile, organizationId);

      const { data, error } = await fieldDriveSupabase
        .from("sites")
        .update({ name: nextName })
        .eq("id", homesite.id)
        .eq("organization_id", organizationId)
        .select("id, name")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error("The shared site record was not updated.");
    } catch (error) {
      alert(isSupabasePermissionError(error)
        ? "You can only rename sites in projects assigned to you."
        : error.message || "The site could not be renamed. Check your connection and try again.");
      return;
    }
  }

  const previousName = homesite.name;
  homesite.name = nextName;
  homesite.source = fieldDriveSupabase ? "Supabase" : homesite.source;
  saveState();
  refreshProjectAndSiteDropdowns({ previousSiteName: previousName });
}

async function handlePhotoSelection(event) {
  markLocalActivity();
  const homesite = getCurrentHomesite();
  if (!homesite || (fieldDriveSupabase && homesite.source !== "Supabase")) {
    event.target.value = "";
    alert("Select a synced home on the Select Home tab before adding photos.");
    return;
  }

  photoPreview.innerHTML = "";

  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  photoPreview.textContent = "Preparing pictures...";
  const preparedPhotos = await Promise.all(files.map(preparePhoto));
  selectedPhotos = [...selectedPhotos, ...preparedPhotos];
  renderPhotoPreview();
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  selectedPhotos.forEach((photo, index) => {
    const entry = document.createElement("div");
    entry.className = "preview-photo-entry";
    const preview = document.createElement("div");
    preview.className = "preview-photo";
    const image = document.createElement("img");
    image.src = getPhotoSource(photo);
    image.alt = `Selected item photo ${index + 1}`;
    const number = document.createElement("span");
    number.textContent = String(index + 1);
    preview.append(image, number);
    const caption = document.createElement("span");
    caption.className = "issue-photo-caption";
    caption.textContent = photo.completionProof ? "Completion Photo" : "Item Photo";
    entry.append(preview, caption);
    photoPreview.append(entry);
  });
}

async function addIssue() {
  markLocalActivity();
  if (editingIssueId) {
    await saveIssueEditsFromForm();
    return;
  }

  const previousSelection = getIssueFormSelection();
  const homesite = getCurrentHomesite();
  if (!homesite) {
    alert("Add or import a site before adding items.");
    return;
  }
  if (selectedPhotos.length && fieldDriveSupabase && homesite.source !== "Supabase") {
    alert("Select a synced home on the Select Home tab before adding photos.");
    return;
  }

  issueSubmitButton.disabled = true;
  issueSubmitButton.textContent = selectedPhotos.length ? "Saving photos..." : "Saving...";

  const issue = {
    id: createId(),
    room: getLocationValue(),
    locationArea: roomSelect.value,
    locationDetail: locationDetailInput.value.trim(),
    trade: tradeSelect.value,
    issue: issueSelect.value,
    notes: notesInput.value.trim(),
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const queuedOperationIds = [];

  try {
    if (fieldDriveSupabase && homesite.source === "Supabase") {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId || !profile?.id) throw new Error("This login needs a profile before items can sync to the dashboard.");
      issue.source = "Pending";
      issue.createdBy = profile?.id || "";
      issue.addedByName = profile?.display_name || "";
      homesite.issues.unshift(issue);
      await initializeMainOfflineSync();
      const createOperation = await mainOfflineSync.enqueue({
        kind: "item.create",
        entityType: "punch_item",
        entityId: issue.id,
        clientUpdatedAt: issue.updatedAt,
        deferSync: true,
        payload: { row: {
          id: issue.id,
          organization_id: organizationId,
          site_id: homesite.id,
          location: issue.room || "",
          location_area: issue.locationArea || "",
          location_detail: issue.locationDetail || "",
          trade: issue.trade || "",
          item: issue.issue || "",
          notes: issue.notes || "",
          completed: false,
          trade_completed: false,
          created_by: profile.id,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt
        } }
      });
      queuedOperationIds.push(createOperation.id);
      for (const photo of selectedPhotos) {
        const photoOperation = await mainOfflineSync.enqueue({
          kind: "photo.upload",
          entityType: "item_photo",
          entityId: issue.id,
          dependsOn: [createOperation.id],
          deferSync: true,
          payload: { organizationId, itemId: issue.id, photo, completionProof: false }
        });
        queuedOperationIds.push(photoOperation.id);
        issue.photos.push({ ...photo, id: `local:${photoOperation.id}`, localOperationId: photoOperation.id, completionProof: false });
      }
    } else {
      issue.photos = await persistSelectedPhotos(selectedPhotos, { itemId: issue.id });
      homesite.issues.unshift(issue);
    }
  } catch (error) {
    if (queuedOperationIds.length && mainOfflineSync) await mainOfflineSync.discard(queuedOperationIds).catch(() => {});
    const issueIndex = homesite.issues.indexOf(issue);
    if (issueIndex >= 0) homesite.issues.splice(issueIndex, 1);
    alert(error.message || "The item could not be saved on this device.");
    issueSubmitButton.disabled = false;
    issueSubmitButton.textContent = "Add item";
    return;
  }

  notesInput.value = "";
  locationDetailInput.value = "";
  cameraInput.value = "";
  photoInput.value = "";
  selectedPhotos = [];
  photoPreview.innerHTML = "";
  saveState();
  render();
  if (queuedOperationIds.length && navigator.onLine !== false) queueMicrotask(() => mainOfflineSync.syncNow());
  restoreIssueFormSelection(previousSelection);
  issueSubmitButton.disabled = false;
  issueSubmitButton.textContent = "Add item";
}

async function saveIssueToSupabase(homesite, issue, knownProfile = null) {
  const profile = knownProfile || await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) {
    throw new Error("This login needs a profile before items can sync to the dashboard.");
  }

  const { error } = await fieldDriveSupabase.from("punch_items").insert({
    id: issue.id,
    organization_id: organizationId,
    site_id: homesite.id,
    location: issue.room || "",
    location_area: issue.locationArea || "",
    location_detail: issue.locationDetail || "",
    trade: issue.trade || "",
    item: issue.issue || "",
    notes: issue.notes || "",
    completed: false,
    trade_completed: false,
    created_by: profile.id
  });

  if (error) throw error;

  await saveIssuePhotosToSupabase(organizationId, issue);
  return profile;
}

async function saveIssuePhotosToSupabase(organizationId, issue) {
  const photoRows = (issue.photos || [])
    .map((photo) => ({
      organization_id: organizationId,
      item_id: issue.id,
      storage_path: photo.id || photo.dataUrl || "",
      file_name: photo.name || "",
      content_type: photo.type || "",
      completion_proof: Boolean(photo.completionProof)
    }))
    .filter((photo) => photo.storage_path);

  if (!photoRows.length) return;

  const { error } = await fieldDriveSupabase.from("item_photos").insert(photoRows);
  if (error && !["42P01", "42501"].includes(error.code)) throw error;
}

async function getCurrentSupabaseProfile() {
  if (currentSupabaseProfile) return currentSupabaseProfile;

  if (navigator.onLine === false) {
    currentSupabaseProfile = loadCachedSupabaseProfile();
    if (!profileMatchesConfiguredOrganization(currentSupabaseProfile)) {
      currentProfileAccessError = "This login belongs to a different Punch Logic company.";
      currentSupabaseProfile = null;
    }
    return currentSupabaseProfile;
  }

  const { data: userData, error: userError } = await fieldDriveSupabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data: sessionValid, error: sessionError } = await fieldDriveSupabase.rpc("session_is_valid");
  if (sessionError) throw sessionError;
  if (!sessionValid) return null;

  const { data, error } = await fieldDriveSupabase
    .from("profiles")
    .select("id, organization_id, display_name, role, is_active, sessions_valid_after, organizations(access_paused)")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  const organization = Array.isArray(data?.organizations) ? data.organizations[0] : data?.organizations;
  if (data?.is_active === false || organization?.access_paused === true) return null;
  if (!profileMatchesConfiguredOrganization(data)) {
    currentProfileAccessError = "This login belongs to a different Punch Logic company.";
    return null;
  }
  currentProfileAccessError = "";
  currentSupabaseProfile = data;
  cacheSupabaseProfile(data);
  return currentSupabaseProfile;
}

async function persistSelectedPhotos(photos, context = {}) {
  if (!photos.length || isLocalPreview()) return photos;

  const uploaded = [];
  for (const photo of photos) {
    if (photo.id) {
      uploaded.push(photo);
      continue;
    }

    if (photo.dataUrl.length > 900000) {
      throw new Error("Photo is still too large after resizing. Try taking the photo from a little farther away or choose fewer photos.");
    }

    const response = await fetch("/.netlify/functions/photo", {
      method: "POST",
      credentials: "same-origin",
      headers: await getFunctionHeaders(),
      body: JSON.stringify({
        ...photo,
        organizationId: context.organizationId || "",
        itemId: context.itemId || ""
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        uploaded.push({
          ...photo,
          storedLocally: true
        });
        continue;
      }
      let message = `Photo upload failed with status ${response.status}.`;
      try {
        const details = await response.json();
        if (details?.error) message = `Photo upload failed with status ${response.status}: ${details.error}`;
        if (details?.message) message = `Photo upload failed with status ${response.status}: ${details.message}`;
      } catch {
        message = `Photo upload failed with status ${response.status}.`;
      }
      throw new Error(message);
    }
    uploaded.push(await response.json());
  }

  return uploaded;
}

async function getFunctionHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (!fieldDriveSupabase) return headers;

  try {
    const { data } = await fieldDriveSupabase.auth.getSession();
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // The function will return unauthorized if the session is not available.
  }

  return headers;
}

function removeIssue(issueId) {
  return removeIssueEverywhere(issueId);
}

function getFieldNotificationStorageKey() {
  const organizationId = getActiveOrganizationId() || getConfiguredOrganizationId() || "client";
  const userId = currentSupabaseProfile?.id || "device";
  return `${fieldNotificationSeenStorageKey}:${organizationId}:${userId}`;
}

function loadSeenFieldNotificationIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(getFieldNotificationStorageKey()) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function getFieldNotifications() {
  const notifications = [];
  getAllIssueRows(true).forEach(({ community, homesite, issue }) => {
    if (issue.completed) return;
    const context = {
      issueId: issue.id,
      project: community.name || "Project",
      site: homesite.name || "Site",
      address: getSiteFieldValue(homesite, "Address") || homesite.address || "No address provided",
      crew: issue.trade || "Unassigned crew",
      item: issue.issue || "Item"
    };
    if (issue.tradeCompleted && issue.tradeCompletedAt) {
      notifications.push({
        ...context,
        id: `complete:${issue.id}:${issue.tradeCompletedAt}`,
        title: "Crew marked complete",
        createdAt: issue.tradeCompletedAt
      });
    }
    if (issue.sharedNote && issue.sharedNoteSource === "crew_report" && issue.sharedNoteUpdatedAt) {
      notifications.push({
        ...context,
        id: `note:${issue.id}:${issue.sharedNoteUpdatedAt}`,
        title: "Crew note added",
        createdAt: issue.sharedNoteUpdatedAt
      });
    }
    (issue.photos || []).filter((photo) => photo.completionProof && photo.createdAt).forEach((photo) => {
      notifications.push({
        ...context,
        id: `photo:${issue.id}:${photo.id || photo.createdAt}`,
        title: "Completion photo uploaded",
        createdAt: photo.createdAt
      });
    });
  });
  return notifications
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);
}

function renderFieldNotifications() {
  const notifications = getFieldNotifications();
  const seen = loadSeenFieldNotificationIds();
  const unreadCount = notifications.filter((notification) => !seen.has(notification.id)).length;
  fieldNotificationCount.textContent = unreadCount ? String(unreadCount) : "";
  fieldNotificationButton.classList.toggle("has-notifications", unreadCount > 0);
  fieldNotificationList.innerHTML = notifications.length
    ? notifications.map((notification) => `
        <button class="field-notification-item${seen.has(notification.id) ? "" : " unread"}" type="button" data-field-notification-id="${escapeHtml(notification.id)}">
          <strong>${escapeHtml(notification.title)}</strong>
          <span>${escapeHtml(notification.crew)} - ${escapeHtml(notification.item)}</span>
          <small>${escapeHtml(notification.site)} - ${escapeHtml(notification.address)}</small>
          <small class="field-notification-time">${escapeHtml(formatTimestamp(notification.createdAt))}</small>
        </button>
      `).join("")
    : `<p class="field-notification-empty">No crew report notifications yet.</p>`;
}

function toggleFieldNotifications() {
  const willOpen = fieldNotificationPanel.classList.contains("hidden");
  fieldNotificationPanel.classList.toggle("hidden", !willOpen);
  fieldNotificationButton.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) markFieldNotificationsRead();
}

function closeFieldNotifications() {
  fieldNotificationPanel.classList.add("hidden");
  fieldNotificationButton.setAttribute("aria-expanded", "false");
}

function markFieldNotificationsRead() {
  const ids = getFieldNotifications().map((notification) => notification.id);
  localStorage.setItem(getFieldNotificationStorageKey(), JSON.stringify(ids.slice(0, 100)));
  renderFieldNotifications();
}

async function refreshFieldNotificationsInBackground() {
  if (
    document.hidden
    || navigator.onLine === false
    || !fieldDriveSupabase
    || authScreen.classList.contains("visible")
    || fieldNotificationRefreshInFlight
    || Date.now() - lastLocalChangeAt < cloudHydrateQuietMs
    || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
  ) return;

  fieldNotificationRefreshInFlight = true;
  try {
    await hydrateSupabaseAppData();
  } finally {
    fieldNotificationRefreshInFlight = false;
  }
}

function openFieldNotification(notificationId) {
  const notification = getFieldNotifications().find((candidate) => candidate.id === notificationId);
  if (!notification) return;
  closeFieldNotifications();
  showPage("allReportsPage");
  allCommunityFilter.value = notification.project;
  populateAllReportFilters();
  allCommunityFilter.value = notification.project;
  allSiteFilter.value = notification.site;
  populateAllReportFilters();
  allCommunityFilter.value = notification.project;
  allSiteFilter.value = notification.site;
  allTradeFilter.value = notification.crew;
  renderAllReports();
  requestAnimationFrame(() => {
    const target = Array.from(allReportIssueList.querySelectorAll("[data-dashboard-item-id]"))
      .find((element) => element.dataset.dashboardItemId === notification.issueId);
    if (!target) return;
    target.classList.add("field-notification-target");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => target.classList.remove("field-notification-target"), 2200);
  });
}

function clearCurrentHomesite() {
  const homesite = getCurrentHomesite();
  if (!homesite?.issues.length) return;
  if (!confirm(`Clear all items for ${homesite.name}?`)) return;

  homesite.issues = [];
  saveState();
  render();
}

function ensureHomeAcceptanceRecord() {
  let community = getCurrentCommunity();
  if (!community) {
    community = { id: createId(), name: "Community", homesites: [] };
    state.communities.push(community);
    state.currentCommunityId = community.id;
  }

  let homesite = getCurrentHomesite();
  if (!homesite) {
    homesite = createHomesite("Home");
    community.homesites.push(homesite);
    state.currentHomesiteId = homesite.id;
  }

  homesite.fields ||= [];
  homesite.issues ||= [];
  homesite.documents ||= [];
  const existing = homesite.acceptance || {};
  homesite.acceptance = {
    buyer1: {
      name: existing.buyer1?.name || getSiteFieldValue(homesite, "Homebuyer 1 Name"),
      email: existing.buyer1?.email || getSiteFieldValue(homesite, "Homebuyer 1 Email")
    },
    buyer2: {
      name: existing.buyer2?.name || getSiteFieldValue(homesite, "Homebuyer 2 Name"),
      email: existing.buyer2?.email || getSiteFieldValue(homesite, "Homebuyer 2 Email")
    },
    signatures: {
      buyer1: existing.signatures?.buyer1 || null,
      buyer2: existing.signatures?.buyer2 || null
    },
    adoptedMarks: {
      buyer1: existing.adoptedMarks?.buyer1 || null,
      buyer2: existing.adoptedMarks?.buyer2 || null
    },
    termInitials: existing.termInitials || {},
    nhoSignatures: {
      buyer1: existing.nhoSignatures?.buyer1 || null,
      buyer2: existing.nhoSignatures?.buyer2 || null
    },
    nhoAcceptedAt: existing.nhoAcceptedAt || "",
    acceptedAt: existing.acceptedAt || ""
  };
  return { community, homesite, acceptance: homesite.acceptance };
}

function setHomeAcceptanceField(homesite, label, value) {
  const fields = getSiteFields(homesite).filter((field) => normalizeColumnName(field.label) !== normalizeColumnName(label));
  const trimmedValue = String(value || "").trim();
  if (trimmedValue) fields.push({ label, value: trimmedValue });
  homesite.fields = fields;
}

function moveHomeToCommunityName(currentCommunity, homesite, requestedName) {
  const nextName = String(requestedName || "").trim() || "Community";
  if (normalizeColumnName(currentCommunity.name) === normalizeColumnName(nextName)) {
    currentCommunity.name = nextName;
    return currentCommunity;
  }

  const siblingHomes = (currentCommunity.homesites || []).filter((candidate) => candidate !== homesite);
  if (!siblingHomes.length) {
    currentCommunity.name = nextName;
    return currentCommunity;
  }

  let targetCommunity = (state.communities || []).find((candidate) =>
    candidate !== currentCommunity && normalizeColumnName(candidate.name) === normalizeColumnName(nextName)
  );
  if (!targetCommunity) {
    targetCommunity = { id: createId(), name: nextName, homesites: [] };
    state.communities.push(targetCommunity);
  }

  currentCommunity.homesites = currentCommunity.homesites.filter((candidate) => candidate !== homesite);
  targetCommunity.homesites ||= [];
  if (!targetCommunity.homesites.includes(homesite)) targetCommunity.homesites.push(homesite);
  state.currentCommunityId = targetCommunity.id;
  state.currentHomesiteId = homesite.id;
  return targetCommunity;
}

function renderHomeDetailsForm() {
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const address = getSiteFieldValue(homesite, "Address") || (homesite.name === "Home" ? "" : homesite.name);
  if (document.activeElement !== homeCommunityInput) homeCommunityInput.value = community.name === "Community" ? "" : community.name;
  if (document.activeElement !== homeAddressInput) homeAddressInput.value = address;
  if (document.activeElement !== homebuyer1NameInput) homebuyer1NameInput.value = acceptance.buyer1.name || "";
  if (document.activeElement !== homebuyer1EmailInput) homebuyer1EmailInput.value = acceptance.buyer1.email || "";
  if (document.activeElement !== homebuyer2NameInput) homebuyer2NameInput.value = acceptance.buyer2.name || "";
  if (document.activeElement !== homebuyer2EmailInput) homebuyer2EmailInput.value = acceptance.buyer2.email || "";
  renderAdoptSignatureButtons(acceptance);
}

function renderAdoptSignatureButtons(acceptance) {
  document.querySelectorAll("[data-adopt-signature-for]").forEach((button) => {
    const buyerNumber = Number(button.dataset.adoptSignatureFor);
    const buyerKey = `buyer${buyerNumber}`;
    const name = acceptance[buyerKey].name || `Homeowner ${buyerNumber}`;
    const adopted = Boolean(acceptance.adoptedMarks[buyerKey]?.signatureDataUrl && acceptance.adoptedMarks[buyerKey]?.initialsDataUrl);
    button.textContent = `${adopted ? "Update" : "Adopt"} signature for ${name}`;
    button.classList.toggle("adopted", adopted);
  });
}

function renderBuyerAcceptanceTerms(acceptance) {
  buyerTermsList.innerHTML = "";
  buyerAcceptanceTerms.forEach((term, termIndex) => {
    const card = document.createElement("article");
    card.className = "buyer-term-card";

    const heading = document.createElement("h3");
    heading.textContent = `${termIndex + 1}. ${term.title}`;
    const copy = document.createElement("p");
    copy.textContent = term.body;
    const initialsGrid = document.createElement("div");
    initialsGrid.className = "term-initials-grid";

    [1, 2].forEach((buyerNumber) => {
      const buyerKey = `buyer${buyerNumber}`;
      const entry = document.createElement("div");
      entry.className = "term-initial-entry";
      const name = document.createElement("strong");
      name.textContent = acceptance[buyerKey].name || `Homeowner ${buyerNumber}`;
      const signingArea = document.createElement("div");
      signingArea.className = "signature-signing-area term-initial-signing-area";
      const button = document.createElement("button");
      button.className = "signature-button";
      button.type = "button";
      button.dataset.termInitialFor = String(buyerNumber);
      button.dataset.termId = term.id;
      button.setAttribute("aria-label", `Confirm ${term.title} with initials for ${name.textContent}`);
      button.title = "Apply adopted initials";
      button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
      const line = document.createElement("div");
      line.className = "signature-line term-initial-line";
      const image = document.createElement("img");
      image.alt = `${name.textContent} initials for ${term.title}`;
      const appliedInitials = acceptance.termInitials[term.id]?.[buyerKey];
      image.classList.toggle("signed", Boolean(appliedInitials?.dataUrl));
      image.src = appliedInitials?.dataUrl || "";
      line.append(image);
      signingArea.append(button, line);
      entry.append(name, signingArea);
      initialsGrid.append(entry);
    });

    card.append(heading, copy, initialsGrid);
    buyerTermsList.append(card);
  });
}

function saveHomeDetailsFromForm() {
  let { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const previousDetails = JSON.stringify({
    community: community.name,
    address: getSiteFieldValue(homesite, "Address"),
    buyer1: acceptance.buyer1,
    buyer2: acceptance.buyer2
  });

  const communityName = homeCommunityInput.value.trim();
  const address = homeAddressInput.value.trim();
  community = moveHomeToCommunityName(community, homesite, communityName);
  homesite.name = address || "Home";
  acceptance.buyer1 = { name: homebuyer1NameInput.value.trim(), email: homebuyer1EmailInput.value.trim() };
  acceptance.buyer2 = { name: homebuyer2NameInput.value.trim(), email: homebuyer2EmailInput.value.trim() };
  setHomeAcceptanceField(homesite, "Address", address);
  setHomeAcceptanceField(homesite, "Homebuyer 1 Name", acceptance.buyer1.name);
  setHomeAcceptanceField(homesite, "Homebuyer 1 Email", acceptance.buyer1.email);
  setHomeAcceptanceField(homesite, "Homebuyer 2 Name", acceptance.buyer2.name);
  setHomeAcceptanceField(homesite, "Homebuyer 2 Email", acceptance.buyer2.email);

  const nextDetails = JSON.stringify({
    community: community.name,
    address,
    buyer1: acceptance.buyer1,
    buyer2: acceptance.buyer2
  });
  if (previousDetails !== nextDetails && (
    acceptance.signatures.buyer1 ||
    acceptance.signatures.buyer2 ||
    acceptance.adoptedMarks.buyer1 ||
    acceptance.adoptedMarks.buyer2 ||
    acceptance.nhoSignatures.buyer1 ||
    acceptance.nhoSignatures.buyer2 ||
    Object.keys(acceptance.termInitials).length
  )) {
    acceptance.signatures = { buyer1: null, buyer2: null };
    acceptance.adoptedMarks = { buyer1: null, buyer2: null };
    acceptance.termInitials = {};
    acceptance.nhoSignatures = { buyer1: null, buyer2: null };
    acceptance.nhoAcceptedAt = "";
    acceptance.acceptedAt = "";
  }

  homeDetailsSaveStatus.textContent = "Saving…";
  saveState();
  renderActiveHomeList();
  renderArchivedHomeList();
  renderAdoptSignatureButtons(acceptance);
  renderHomeownerSignoff();
  clearTimeout(homeDetailsSyncTimer);
  homeDetailsSyncTimer = setTimeout(async () => {
    try {
      await syncHomeDetailsToSupabase();
      await saveAcceptanceDraftToServer();
      homeDetailsSaveStatus.textContent = "Saved";
    } catch (error) {
      homeDetailsSaveStatus.textContent = navigator.onLine === false ? "Saved offline" : "Needs sync";
      console.warn("Home details could not be synced yet.", error);
    }
  }, 700);
}

async function syncHomeDetailsToSupabase() {
  if (!fieldDriveSupabase) return;
  const { community, homesite } = ensureHomeAcceptanceRecord();
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login needs an organization profile.");
  await ensureSupabaseProject(community, profile, organizationId);
  await ensureSupabaseSite(community, homesite, profile, organizationId);

  const projectResult = await fieldDriveSupabase
    .from("projects")
    .update({ name: community.name || "Community" })
    .eq("id", community.id)
    .eq("organization_id", organizationId);
  if (projectResult.error) throw projectResult.error;

  const siteResult = await fieldDriveSupabase
    .from("sites")
    .update({ name: homesite.name || "Home", fields: getSiteFields(homesite) })
    .eq("id", homesite.id)
    .eq("organization_id", organizationId);
  if (siteResult.error) throw siteResult.error;
  saveState();
  renderActiveHomeList();
}

function startNewHome() {
  const reusableDraft = getHomeRecords().find(({ community, homesite }) => !hasMeaningfulHomeDetails(community, homesite));
  if (reusableDraft) {
    selectActiveHome(reusableDraft.community.id, reusableDraft.homesite.id);
    homeCommunityInput.focus();
    return;
  }

  const homesite = createHomesite("Home");
  const community = { id: createId(), name: "Community", homesites: [homesite] };
  state.communities.push(community);
  state.currentCommunityId = community.id;
  state.currentHomesiteId = homesite.id;
  saveState();
  render();
  showPage("punchListPage");
  homeCommunityInput.focus();
}

function handleActiveHomeListClick(event) {
  const button = event.target.closest("[data-home-action='open']");
  if (!button) return;
  selectActiveHome(button.dataset.communityId, button.dataset.homeId);
}

function handleArchivedHomeListClick(event) {
  const button = event.target.closest("[data-home-action='restore']");
  if (!button) return;
  restoreArchivedHome(button.dataset.communityId, button.dataset.homeId);
}

function findHomeRecord(communityId, homeId) {
  const community = (state.communities || []).find((candidate) => candidate.id === communityId);
  const homesite = (community?.homesites || []).find((candidate) => candidate.id === homeId);
  return community && homesite ? { community, homesite } : null;
}

function selectActiveHome(communityId, homeId) {
  const record = findHomeRecord(communityId, homeId);
  if (!record || isHomeArchived(record.homesite)) return;
  state.currentCommunityId = record.community.id;
  state.currentHomesiteId = record.homesite.id;
  saveState();
  render();
  showPage("punchListPage");
}

function renderActiveHomeList() {
  const records = getHomeRecords({ meaningfulOnly: true })
    .sort(compareHomeRecords);
  renderHomeRecordCollection(activeHomeList, records, { archived: false });
}

function renderArchivedHomeList() {
  const records = getHomeRecords({ archived: true })
    .sort((a, b) => String(b.homesite.archivedAt || "").localeCompare(String(a.homesite.archivedAt || "")));
  archivedHomeCount.textContent = records.length;
  renderHomeRecordCollection(archivedHomeList, records, { archived: true });
}

function compareHomeRecords(a, b) {
  const communityComparison = String(a.community.name || "").localeCompare(String(b.community.name || ""));
  if (communityComparison) return communityComparison;
  return getHomeAddress(a.homesite).localeCompare(getHomeAddress(b.homesite));
}

function getHomeAddress(homesite) {
  return getSiteFieldValue(homesite, "Address") || (homesite?.name === "Home" ? "" : String(homesite?.name || ""));
}

function getHomeBuyerSummary(homesite) {
  const acceptance = homesite.acceptance || {};
  return [
    acceptance.buyer1?.name || getSiteFieldValue(homesite, "Homebuyer 1 Name"),
    acceptance.buyer2?.name || getSiteFieldValue(homesite, "Homebuyer 2 Name")
  ].filter(Boolean).join(" & ");
}

function renderHomeRecordCollection(container, records, { archived }) {
  container.innerHTML = "";
  if (!records.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = archived
      ? "No homes have been archived yet."
      : "No active homes yet. Select Start new home, then enter the home details on the Items tab.";
    container.append(empty);
    return;
  }

  records.forEach(({ community, homesite }) => {
    const card = document.createElement("article");
    card.className = `home-record-card${archived ? " archived" : ""}`;

    const main = document.createElement("div");
    main.className = "home-record-main";
    const title = document.createElement("h2");
    title.textContent = getHomeAddress(homesite) || "Address being entered";
    const communityLine = document.createElement("p");
    communityLine.className = "home-record-community";
    communityLine.textContent = community.name === "Community" ? "Community being entered" : community.name;
    const buyers = document.createElement("p");
    buyers.className = "home-record-buyers";
    buyers.textContent = getHomeBuyerSummary(homesite) || "Homebuyer names not entered";
    const status = document.createElement("p");
    status.className = "home-record-status";
    const openCount = (homesite.issues || []).filter((issue) => !issue.completed).length;
    const completeCount = (homesite.issues || []).filter((issue) => issue.completed).length;
    const acceptanceDate = homesite.acceptance?.acceptedAt || "";
    status.append(
      createHomeStatusValue(`${openCount} open`),
      createHomeStatusValue(`${completeCount} complete`),
      createHomeStatusValue(
        archived
          ? `Archived ${formatTimestamp(homesite.archivedAt)}`
          : acceptanceDate
            ? `Signed ${formatTimestamp(acceptanceDate)}`
            : "In progress"
      )
    );
    main.append(title, communityLine, buyers, status);

    const actions = document.createElement("div");
    actions.className = "home-record-actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = `home-record-button${archived ? " secondary" : ""}`;
    button.dataset.homeAction = archived ? "restore" : "open";
    button.dataset.communityId = community.id;
    button.dataset.homeId = homesite.id;
    button.textContent = archived ? "Restore home" : "Open home";
    actions.append(button);
    card.append(main, actions);
    container.append(card);
  });
}

function createHomeStatusValue(text) {
  const value = document.createElement("strong");
  value.textContent = text;
  return value;
}

async function archiveAcceptedHome() {
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  if (!acceptance.acceptedAt) {
    alert("Accept the signed home before moving it to the archive.");
    return;
  }

  archiveHomeButton.disabled = true;
  archiveHomeButton.textContent = "Archiving…";
  const archivedAt = new Date().toISOString();
  try {
    if (fieldDriveSupabase && homesite.source !== "Supabase") await syncHomeDetailsToSupabase();
    homesite.archivedAt = archivedAt;
    await syncHomeArchivedStatus(homesite, archivedAt);
    state.currentHomesiteId = getFirstHomeId(state.communities);
    const nextRecord = getHomeRecords().find(({ homesite: candidate }) => candidate.id === state.currentHomesiteId);
    if (nextRecord) state.currentCommunityId = nextRecord.community.id;
    saveState();
    render();
    showPage("homeArchivePage");
  } catch (error) {
    homesite.archivedAt = "";
    saveState();
    alert(error.message || "The home could not be archived. Please try again.");
  } finally {
    archiveHomeButton.textContent = "Move to archive";
    renderHomeownerSignoff();
  }
}

async function restoreArchivedHome(communityId, homeId) {
  const record = findHomeRecord(communityId, homeId);
  if (!record || !isHomeArchived(record.homesite)) return;
  const previousArchivedAt = record.homesite.archivedAt;
  record.homesite.archivedAt = "";
  try {
    await syncHomeArchivedStatus(record.homesite, null);
    state.currentCommunityId = record.community.id;
    state.currentHomesiteId = record.homesite.id;
    saveState();
    render();
    showPage("punchListPage");
  } catch (error) {
    record.homesite.archivedAt = previousArchivedAt;
    saveState();
    renderArchivedHomeList();
    alert(error.message || "The home could not be restored. Please try again.");
  }
}

async function syncHomeArchivedStatus(homesite, archivedAt) {
  if (!fieldDriveSupabase || homesite.source !== "Supabase") return;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login needs an organization profile.");
  const { data, error } = await fieldDriveSupabase
    .from("sites")
    .update({ archived_at: archivedAt })
    .eq("id", homesite.id)
    .eq("organization_id", organizationId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The home archive status was not saved.");
}

function renderNhoSignoff() {
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const address = getSiteFieldValue(homesite, "Address") || (homesite.name === "Home" ? "" : homesite.name);
  const issues = homesite.issues || [];

  nhoCommunity.textContent = community.name === "Community" ? "—" : community.name;
  nhoAddress.textContent = address || "—";
  nhoBuyer1.textContent = acceptance.buyer1.name || "—";
  nhoBuyer2.textContent = acceptance.buyer2.name || "—";
  nhoItemCount.textContent = issues.length;
  renderSignoffItemList(nhoItemList, issues, false, { allItems: true });

  nhoSignatureBuyer1Name.textContent = acceptance.buyer1.name || "Homeowner 1";
  nhoSignatureBuyer1Email.textContent = acceptance.buyer1.email || "Email not entered";
  nhoSignatureBuyer2Name.textContent = acceptance.buyer2.name || "Homeowner 2";
  nhoSignatureBuyer2Email.textContent = acceptance.buyer2.email || "Email not entered";
  renderAcceptedSignature(nhoSignatureBuyer1Image, acceptance.nhoSignatures.buyer1);
  renderAcceptedSignature(nhoSignatureBuyer2Image, acceptance.nhoSignatures.buyer2);
  renderAdoptSignatureButtons(acceptance);

  const readiness = getNhoSignoffReadiness();
  acceptNhoButton.disabled = !readiness.ready;
  nhoAcceptanceNote.textContent = readiness.message;
  nhoSignoffStatus.textContent = acceptance.nhoAcceptedAt
    ? `Signed ${formatTimestamp(acceptance.nhoAcceptedAt)}`
    : readiness.ready
      ? "Ready to complete"
      : "Awaiting signatures";
}

function getNhoSignoffReadiness() {
  const { homesite, acceptance } = ensureHomeAcceptanceRecord();
  const missingDetails = [];
  if (!acceptance.buyer1.name) missingDetails.push("homeowner 1 name");
  if (!isValidEmail(acceptance.buyer1.email)) missingDetails.push("homeowner 1 email");
  if (!acceptance.buyer2.name) missingDetails.push("homeowner 2 name");
  if (!isValidEmail(acceptance.buyer2.email)) missingDetails.push("homeowner 2 email");
  if (missingDetails.length) return { ready: false, message: `Enter ${missingDetails.join(", ")}.` };
  if (!(homesite.issues || []).length) return { ready: false, message: "Add at least one orientation item before signing." };
  if (!acceptance.nhoSignatures.buyer1?.dataUrl || !acceptance.nhoSignatures.buyer2?.dataUrl) {
    return { ready: false, message: "Both homeowner signatures are required." };
  }
  return { ready: true, message: "Both homeowners have signed the new home orientation." };
}

function renderHomeownerSignoff() {
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const address = getSiteFieldValue(homesite, "Address") || (homesite.name === "Home" ? "" : homesite.name);
  const completed = (homesite.issues || []).filter((issue) => issue.completed);
  const open = (homesite.issues || []).filter((issue) => !issue.completed);

  signoffCommunity.textContent = community.name === "Community" ? "—" : community.name;
  signoffAddress.textContent = address || "—";
  signoffBuyer1.textContent = acceptance.buyer1.name || "—";
  signoffBuyer2.textContent = acceptance.buyer2.name || "—";
  signoffCompletedCount.textContent = completed.length;
  signoffOpenCount.textContent = open.length;
  renderSignoffItemList(signoffCompletedItems, completed, true);
  renderSignoffItemList(signoffOpenItems, open, false);

  signatureBuyer1Name.textContent = acceptance.buyer1.name || "Homeowner 1";
  signatureBuyer1Email.textContent = acceptance.buyer1.email || "Email not entered";
  signatureBuyer2Name.textContent = acceptance.buyer2.name || "Homeowner 2";
  signatureBuyer2Email.textContent = acceptance.buyer2.email || "Email not entered";
  renderAcceptedSignature(signatureBuyer1Image, acceptance.signatures.buyer1);
  renderAcceptedSignature(signatureBuyer2Image, acceptance.signatures.buyer2);
  renderAdoptSignatureButtons(acceptance);
  renderBuyerAcceptanceTerms(acceptance);

  const readiness = getHomeAcceptanceReadiness();
  acceptHomeButton.disabled = !readiness.ready;
  archiveHomeButton.disabled = !acceptance.acceptedAt;
  acceptanceNote.textContent = readiness.message;
  signoffStatus.textContent = acceptance.acceptedAt
    ? `Accepted ${formatTimestamp(acceptance.acceptedAt)}`
    : readiness.ready
      ? "Ready to accept"
      : "Awaiting signatures";
}

function renderSignoffItemList(container, issues, completed, options = {}) {
  container.innerHTML = "";
  if (!issues.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = options.allItems ? "No orientation items entered yet." : completed ? "No completed items yet." : "No exceptions.";
    container.append(empty);
    return;
  }

  issues.forEach((issue, index) => {
    const isComplete = options.allItems ? Boolean(issue.completed) : completed;
    const card = document.createElement("article");
    card.className = `signoff-item${isComplete ? " complete" : ""}`;
    const number = document.createElement("span");
    number.className = "signoff-item-number";
    number.textContent = String(index + 1);
    const main = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = issue.issue || "Punch item";
    const meta = document.createElement("p");
    meta.className = "signoff-item-meta";
    meta.textContent = [
      getIssueLocation(issue) || "Location not entered",
      issue.trade ? `Crew: ${issue.trade}` : "",
      `Added: ${formatDateAdded(issue.createdAt)}`,
      isComplete && issue.completedAt ? `Completed: ${formatDateAdded(issue.completedAt)}` : ""
    ].filter(Boolean).join(" • ");
    const notes = document.createElement("p");
    notes.className = "signoff-item-notes";
    notes.textContent = issue.notes || "No additional notes.";
    main.append(title, meta, notes);
    const photos = document.createElement("div");
    photos.className = "signoff-item-photos";
    (issue.photos || []).forEach((photo, photoIndex) => {
      const image = document.createElement("img");
      image.src = getPhotoSource(photo);
      image.alt = `${isComplete ? "Completed" : options.allItems ? "Orientation" : "Exception"} item photo ${photoIndex + 1}`;
      photos.append(image);
    });
    if (photos.childElementCount) main.append(photos);
    card.append(number, main);
    container.append(card);
  });
}

function renderAcceptedSignature(image, signature) {
  image.classList.toggle("signed", Boolean(signature?.dataUrl));
  image.src = signature?.dataUrl || "";
}

function getHomeAcceptanceReadiness() {
  const { acceptance } = ensureHomeAcceptanceRecord();
  const missingDetails = [];
  if (!acceptance.buyer1.name) missingDetails.push("homeowner 1 name");
  if (!isValidEmail(acceptance.buyer1.email)) missingDetails.push("homeowner 1 email");
  if (!acceptance.buyer2.name) missingDetails.push("homeowner 2 name");
  if (!isValidEmail(acceptance.buyer2.email)) missingDetails.push("homeowner 2 email");
  if (missingDetails.length) return { ready: false, message: `Enter ${missingDetails.join(", ")}.` };
  if (!acceptance.signatures.buyer1?.dataUrl || !acceptance.signatures.buyer2?.dataUrl) {
    return { ready: false, message: "Both homeowner signatures are required." };
  }
  const allTermsInitialed = buyerAcceptanceTerms.every((term) =>
    acceptance.termInitials[term.id]?.buyer1?.dataUrl &&
    acceptance.termInitials[term.id]?.buyer2?.dataUrl
  );
  if (!allTermsInitialed) {
    return { ready: false, message: "Both homeowners must initial every buyer acknowledgment." };
  }
  return { ready: true, message: "Both homeowners have signed. The home is ready for final acceptance." };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function openSignatureTool(buyerNumber, lineType = "", termId = "", documentType = "final") {
  const { acceptance } = ensureHomeAcceptanceRecord();
  const buyer = acceptance[`buyer${buyerNumber}`];
  if (!buyer?.name || !isValidEmail(buyer.email)) {
    alert(`Enter homeowner ${buyerNumber}'s name and email before signing.`);
    showPage("punchListPage");
    (buyerNumber === 1 ? homebuyer1NameInput : homebuyer2NameInput).focus();
    return;
  }
  activeSignatureBuyer = buyerNumber;
  activeSignatureLineType = lineType;
  activeSignatureTermId = termId;
  activeSignatureDocument = documentType;
  signatureModalTitle.textContent = `${buyer.name} — adopt signature and initials`;
  signatureModal.classList.remove("hidden");
  document.body.classList.add("signature-tool-open");
  requestAnimationFrame(() => {
    clearAdoptionCanvases();
    resizeSignatureCanvas();
  });
}

function closeSignatureTool() {
  clearAdoptionCanvases();
  signatureModal.classList.add("hidden");
  document.body.classList.remove("signature-tool-open");
  activeSignatureBuyer = 0;
  activeSignatureLineType = "";
  activeSignatureTermId = "";
  activeSignatureDocument = "final";
  signatureDrawingCanvas = null;
}

function resizeSignatureCanvas() {
  if (signatureModal.classList.contains("hidden")) return;
  resizeDrawingCanvas(signatureCanvas, signatureHasInk);
  resizeDrawingCanvas(initialsCanvas, initialsHaveInk);
}

function resizeDrawingCanvas(canvas, hasInk) {
  const previous = hasInk ? canvas.toDataURL("image/png") : "";
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#101820";
  context.lineWidth = 2.5;
  if (previous) {
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = previous;
  }
}

function clearSignatureCanvas() {
  clearDrawingCanvas(signatureCanvas);
  signatureHasInk = false;
}

function clearInitialsCanvas() {
  clearDrawingCanvas(initialsCanvas);
  initialsHaveInk = false;
}

function clearDrawingCanvas(canvas) {
  const context = canvas.getContext("2d");
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

function clearAdoptionCanvases() {
  clearSignatureCanvas();
  clearInitialsCanvas();
}

function trimCanvasToInkDataUrl(canvas, padding = 12) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < 8) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) return canvas.toDataURL("image/png");
  left = Math.max(0, left - padding);
  right = Math.min(width - 1, right + padding);
  top = Math.max(0, top - padding);
  bottom = Math.min(height - 1, bottom + padding);
  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;
  const cropped = document.createElement("canvas");
  cropped.width = croppedWidth;
  cropped.height = croppedHeight;
  cropped.getContext("2d").drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
  return cropped.toDataURL("image/png");
}

function trimDataUrlToInkDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve(trimCanvasToInkDataUrl(canvas));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function installDrawingCanvasEvents(canvas) {
  canvas.addEventListener("pointerdown", beginSignatureStroke);
  canvas.addEventListener("pointermove", continueSignatureStroke);
  canvas.addEventListener("pointerup", endSignatureStroke);
  canvas.addEventListener("pointercancel", endSignatureStroke);
}

function getSignaturePoint(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function beginSignatureStroke(event) {
  event.preventDefault();
  const canvas = event.currentTarget;
  canvas.setPointerCapture?.(event.pointerId);
  signatureDrawingCanvas = canvas;
  const point = getSignaturePoint(event);
  const context = canvas.getContext("2d");
  context.beginPath();
  context.moveTo(point.x, point.y);
}

function continueSignatureStroke(event) {
  const canvas = event.currentTarget;
  if (signatureDrawingCanvas !== canvas) return;
  event.preventDefault();
  const point = getSignaturePoint(event);
  const context = canvas.getContext("2d");
  context.lineTo(point.x, point.y);
  context.stroke();
  if (canvas === initialsCanvas) initialsHaveInk = true;
  else signatureHasInk = true;
}

function endSignatureStroke(event) {
  const canvas = event.currentTarget;
  if (signatureDrawingCanvas !== canvas) return;
  signatureDrawingCanvas = null;
  canvas.releasePointerCapture?.(event.pointerId);
}

async function acceptDrawnSignature() {
  if (!activeSignatureBuyer || !signatureHasInk || !initialsHaveInk) {
    alert("Add both your full signature and initials before adopting them.");
    return;
  }
  const { acceptance } = ensureHomeAcceptanceRecord();
  const buyerKey = `buyer${activeSignatureBuyer}`;
  acceptance.adoptedMarks[buyerKey] = {
    signatureDataUrl: trimCanvasToInkDataUrl(signatureCanvas),
    initialsDataUrl: trimCanvasToInkDataUrl(initialsCanvas),
    croppedToInk: true,
    adoptedAt: new Date().toISOString(),
    name: acceptance[buyerKey].name,
    email: acceptance[buyerKey].email
  };
  acceptance.signatures[buyerKey] = null;
  acceptance.nhoSignatures[buyerKey] = null;
  buyerAcceptanceTerms.forEach((term) => {
    if (acceptance.termInitials[term.id]) acceptance.termInitials[term.id][buyerKey] = null;
  });
  acceptance.acceptedAt = "";
  acceptance.nhoAcceptedAt = "";
  const lineType = activeSignatureLineType;
  const termId = activeSignatureTermId;
  const documentType = activeSignatureDocument;
  const buyerNumber = activeSignatureBuyer;
  saveState();
  try {
    await saveAcceptanceDraftToServer();
  } catch (error) {
    alert(`${error.message || "The adopted marks could not be synced."} They remain saved on this device.`);
  }
  closeSignatureTool();
  if (lineType) applyAdoptedMark(buyerNumber, lineType, termId, documentType);
  renderAdoptSignatureButtons(acceptance);
  renderNhoSignoff();
  renderHomeownerSignoff();
}

async function applyAdoptedMark(buyerNumber, markType, termId = "", documentType = "final") {
  const { acceptance } = ensureHomeAcceptanceRecord();
  const buyerKey = `buyer${buyerNumber}`;
  const buyer = acceptance[buyerKey];
  const adopted = acceptance.adoptedMarks[buyerKey];
  if (!adopted?.signatureDataUrl || !adopted?.initialsDataUrl) {
    openSignatureTool(buyerNumber, markType, termId, documentType);
    return;
  }
  if (!adopted.croppedToInk) {
    [adopted.signatureDataUrl, adopted.initialsDataUrl] = await Promise.all([
      trimDataUrlToInkDataUrl(adopted.signatureDataUrl),
      trimDataUrlToInkDataUrl(adopted.initialsDataUrl)
    ]);
    adopted.croppedToInk = true;
  }

  if (markType === "initials" && termId) {
    acceptance.termInitials[termId] ||= {};
    acceptance.termInitials[termId][buyerKey] = {
      dataUrl: adopted.initialsDataUrl,
      initialedAt: new Date().toISOString(),
      name: buyer.name,
      email: buyer.email
    };
  } else if (documentType === "nho") {
    acceptance.nhoSignatures[buyerKey] = {
      dataUrl: adopted.signatureDataUrl,
      signedAt: new Date().toISOString(),
      name: buyer.name,
      email: buyer.email
    };
    acceptance.nhoAcceptedAt = "";
  } else {
    acceptance.signatures[buyerKey] = {
      dataUrl: adopted.signatureDataUrl,
      signedAt: new Date().toISOString(),
      name: buyer.name,
      email: buyer.email
    };
  }
  acceptance.acceptedAt = "";
  saveState();
  renderNhoSignoff();
  renderHomeownerSignoff();
  try {
    await saveAcceptanceDraftToServer();
  } catch (error) {
    alert(`${error.message || "The confirmed mark could not be synced."} It remains saved on this device.`);
  }
}

async function acceptNhoAndCreatePdf() {
  const readiness = getNhoSignoffReadiness();
  if (!readiness.ready) {
    alert(readiness.message);
    return;
  }
  const { acceptance } = ensureHomeAcceptanceRecord();
  acceptNhoButton.disabled = true;
  acceptNhoButton.textContent = "Creating NHO PDF…";
  acceptance.nhoAcceptedAt = new Date().toISOString();
  saveState();
  try {
    await saveAcceptanceDraftToServer();
    await createNhoSignoffPdf();
    nhoAcceptanceNote.textContent = `NHO signoff completed ${formatTimestamp(acceptance.nhoAcceptedAt)}.`;
  } catch (error) {
    acceptance.nhoAcceptedAt = "";
    saveState();
    alert(error.message || "The NHO signoff PDF could not be created.");
  } finally {
    acceptNhoButton.textContent = "Complete NHO signoff & generate PDF";
    renderNhoSignoff();
  }
}

async function acceptHomeAndCreatePdf() {
  const readiness = getHomeAcceptanceReadiness();
  if (!readiness.ready) {
    alert(readiness.message);
    return;
  }
  const { acceptance } = ensureHomeAcceptanceRecord();
  acceptHomeButton.disabled = true;
  acceptHomeButton.textContent = "Creating signed PDF…";
  acceptance.acceptedAt = new Date().toISOString();
  saveState();
  let syncWarning = "";
  try {
    await syncHomeDetailsToSupabase();
    await syncHomeAcceptanceToSupabase();
    await saveAcceptanceDraftToServer();
  } catch (error) {
    syncWarning = " The signed record is saved on this device and will need to be synced.";
    console.warn("Signed acceptance could not be synced yet.", error);
  }

  try {
    await createSignedAcceptancePdf();
    acceptanceNote.textContent = `Home accepted ${formatTimestamp(acceptance.acceptedAt)}.${syncWarning}`;
  } catch (error) {
    acceptance.acceptedAt = "";
    saveState();
    alert(error.message || "The signed PDF could not be created.");
  } finally {
    acceptHomeButton.textContent = "Accept home & generate signed PDF";
    renderHomeownerSignoff();
  }
}

async function syncHomeAcceptanceToSupabase() {
  if (!fieldDriveSupabase) return;
  const { homesite, acceptance } = ensureHomeAcceptanceRecord();
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId || !homesite.id) throw new Error("The home is not connected to the new Supabase project.");
  const payload = {
    organization_id: organizationId,
    site_id: homesite.id,
    homeowner_1_name: acceptance.buyer1.name,
    homeowner_1_email: acceptance.buyer1.email,
    homeowner_1_signature: acceptance.signatures.buyer1.dataUrl,
    homeowner_1_signed_at: acceptance.signatures.buyer1.signedAt,
    homeowner_2_name: acceptance.buyer2.name,
    homeowner_2_email: acceptance.buyer2.email,
    homeowner_2_signature: acceptance.signatures.buyer2.dataUrl,
    homeowner_2_signed_at: acceptance.signatures.buyer2.signedAt,
    accepted_at: acceptance.acceptedAt,
    accepted_by: profile?.id || null,
    document_snapshot: buildAcceptanceSnapshot()
  };
  const { error } = await fieldDriveSupabase.from("home_acceptances").upsert(payload, { onConflict: "site_id" });
  if (error) throw error;
}

function buildAcceptanceDraft(acceptance) {
  return {
    adoptedMarks: acceptance.adoptedMarks,
    termInitials: acceptance.termInitials,
    signatures: acceptance.signatures,
    nhoSignatures: acceptance.nhoSignatures,
    nhoAcceptedAt: acceptance.nhoAcceptedAt,
    acceptedAt: acceptance.acceptedAt,
    updatedAt: new Date().toISOString()
  };
}

async function saveAcceptanceDraftToServer() {
  if (!fieldDriveSupabase || navigator.onLine === false) return false;
  const { homesite, acceptance } = ensureHomeAcceptanceRecord();
  if (homesite.source !== "Supabase") await syncHomeDetailsToSupabase();
  if (homesite.source !== "Supabase") throw new Error("The home must finish syncing before signatures can be saved.");
  const response = await fetch("/.netlify/functions/home-acceptance-drafts", {
    method: "POST",
    credentials: "same-origin",
    headers: { ...(await getFunctionHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ siteId: homesite.id, draft: buildAcceptanceDraft(acceptance) })
  });
  let result = {};
  try { result = await response.json(); } catch { /* Use the fallback error below. */ }
  if (!response.ok) throw new Error(result.error || "The signing draft could not be saved.");
  return true;
}

async function loadAcceptanceDraftsFromServer() {
  if (!fieldDriveSupabase || navigator.onLine === false) return {};
  const response = await fetch("/.netlify/functions/home-acceptance-drafts", {
    credentials: "same-origin",
    headers: await getFunctionHeaders()
  });
  if (!response.ok) return {};
  const result = await response.json();
  return result.drafts && typeof result.drafts === "object" ? result.drafts : {};
}

function mergeAcceptanceDrafts(drafts) {
  (state.communities || []).forEach((community) => {
    (community.homesites || []).forEach((homesite) => {
      const draft = drafts?.[homesite.id];
      if (!draft || typeof draft !== "object") return;
      const existing = homesite.acceptance || {};
      const finalAlreadyAccepted = Boolean(existing.acceptedAt);
      homesite.acceptance = {
        ...existing,
        adoptedMarks: draft.adoptedMarks || existing.adoptedMarks || { buyer1: null, buyer2: null },
        termInitials: draft.termInitials || existing.termInitials || {},
        signatures: finalAlreadyAccepted
          ? existing.signatures
          : draft.signatures || existing.signatures || { buyer1: null, buyer2: null },
        nhoSignatures: draft.nhoSignatures || existing.nhoSignatures || { buyer1: null, buyer2: null },
        nhoAcceptedAt: draft.nhoAcceptedAt || existing.nhoAcceptedAt || "",
        acceptedAt: existing.acceptedAt || draft.acceptedAt || ""
      };
    });
  });
}

function buildAcceptanceSnapshot() {
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  return {
    community: community.name,
    address: getSiteFieldValue(homesite, "Address") || homesite.name,
    homeowners: [acceptance.buyer1, acceptance.buyer2],
    adoptedMarks: acceptance.adoptedMarks,
    termInitials: acceptance.termInitials,
    nhoSignatures: acceptance.nhoSignatures,
    nhoAcceptedAt: acceptance.nhoAcceptedAt,
    items: (homesite.issues || []).map((issue) => ({
      id: issue.id,
      status: issue.completed ? "completed" : "open",
      location: getIssueLocation(issue),
      crew: issue.trade || "",
      item: issue.issue || "",
      notes: issue.notes || "",
      createdAt: issue.createdAt || "",
      completedAt: issue.completedAt || "",
      photoCount: (issue.photos || []).length
    })),
    acceptedAt: acceptance.acceptedAt
  };
}

async function createSignedAcceptancePdf() {
  if (!window.jspdf?.jsPDF) throw new Error("The PDF tool is still loading. Try again in a moment.");
  const { jsPDF } = window.jspdf;
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const address = getSiteFieldValue(homesite, "Address") || homesite.name;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const page = { width: 612, height: 792, margin: 42 };
  const colors = { ink: [25, 34, 42], muted: [96, 108, 118], line: [216, 223, 228], orange: [239, 102, 40], green: [25, 135, 82] };
  let y = addAcceptancePdfHeader(doc, page, colors, community.name, address, acceptance, "FINAL SIGNOFF");
  const completed = (homesite.issues || []).filter((issue) => issue.completed);
  const open = (homesite.issues || []).filter((issue) => !issue.completed);
  y = addAcceptancePdfTerms(doc, page, colors, acceptance, y);
  y = await addAcceptancePdfSection(doc, page, colors, "COMPLETED ITEMS", completed, y, true);
  y = await addAcceptancePdfSection(doc, page, colors, "EXCEPTIONS", open, y, false);
  if (y > page.height - 205) {
    doc.addPage();
    y = page.margin;
  }
  y = addAcceptancePdfSignatures(doc, page, colors, acceptance, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(`Accepted ${formatTimestamp(acceptance.acceptedAt)}`, page.margin, Math.min(page.height - 30, y + 28));
  addPdfPageNumbers(doc, page, colors);
  const fileBase = (address || "home").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await shareOrDownloadPdf(doc, `${fileBase || "home"}-signed-acceptance.pdf`, `${address} signed home acceptance`, true);
}

async function createNhoSignoffPdf() {
  if (!window.jspdf?.jsPDF) throw new Error("The PDF tool is still loading. Try again in a moment.");
  const { jsPDF } = window.jspdf;
  const { community, homesite, acceptance } = ensureHomeAcceptanceRecord();
  const address = getSiteFieldValue(homesite, "Address") || homesite.name;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const page = { width: 612, height: 792, margin: 42 };
  const colors = { ink: [25, 34, 42], muted: [96, 108, 118], line: [216, 223, 228], orange: [239, 102, 40], green: [25, 135, 82] };
  const nhoAcceptance = { ...acceptance, signatures: acceptance.nhoSignatures };
  let y = addAcceptancePdfHeader(doc, page, colors, community.name, address, nhoAcceptance, "NEW HOME ORIENTATION SIGNOFF");
  y = await addAcceptancePdfSection(doc, page, colors, "ORIENTATION ITEMS", homesite.issues || [], y, false);
  if (y > page.height - 205) {
    doc.addPage();
    y = page.margin;
  }
  y = addAcceptancePdfSignatures(doc, page, colors, nhoAcceptance, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(`Signed ${formatTimestamp(acceptance.nhoAcceptedAt)}`, page.margin, Math.min(page.height - 30, y + 28));
  addPdfPageNumbers(doc, page, colors);
  const fileBase = (address || "home").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await shareOrDownloadPdf(doc, `${fileBase || "home"}-nho-signoff.pdf`, `${address} new home orientation signoff`, true);
}

function addAcceptancePdfHeader(doc, page, colors, community, address, acceptance, title = "FINAL SIGNOFF") {
  let y = page.margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...colors.ink);
  doc.text(title, page.margin, y);
  doc.setDrawColor(...colors.orange);
  doc.setLineWidth(2);
  doc.line(page.margin, y + 10, page.width - page.margin, y + 10);
  y += 35;
  const details = [
    ["Community", community || "—"],
    ["Address", address || "—"],
    ["Homeowner 1", `${acceptance.buyer1.name} • ${acceptance.buyer1.email}`],
    ["Homeowner 2", `${acceptance.buyer2.name} • ${acceptance.buyer2.email}`]
  ];
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(label.toUpperCase(), page.margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...colors.ink);
    doc.text(doc.splitTextToSize(value, 400), page.margin + 92, y);
    y += 18;
  });
  return y + 8;
}

function addAcceptancePdfTerms(doc, page, colors, acceptance, startY) {
  let y = startY;
  const addHeading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.ink);
    doc.text("BUYER ACKNOWLEDGMENTS", page.margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    const intro = doc.splitTextToSize(
      "By initialing each item below, the Buyer acknowledges, understands, and agrees to these terms and conditions regarding final acceptance of the property.",
      page.width - page.margin * 2
    );
    doc.text(intro, page.margin, y);
    y += intro.length * 9 + 10;
  };

  if (y > page.height - 120) {
    doc.addPage();
    y = page.margin;
  }
  addHeading();

  buyerAcceptanceTerms.forEach((term, index) => {
    const bodyLines = doc.splitTextToSize(term.body, page.width - page.margin * 2 - 20);
    const rowHeight = 66 + bodyLines.length * 9;
    if (y + rowHeight > page.height - page.margin) {
      doc.addPage();
      y = page.margin;
      addHeading();
    }

    doc.setDrawColor(...colors.line);
    doc.roundedRect(page.margin, y, page.width - page.margin * 2, rowHeight, 4, 4, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.ink);
    doc.text(`${index + 1}. ${term.title}`, page.margin + 10, y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(bodyLines, page.margin + 10, y + 29);

    const initialsY = y + rowHeight - 31;
    [1, 2].forEach((buyerNumber, buyerIndex) => {
      const buyerKey = `buyer${buyerNumber}`;
      const initials = acceptance.termInitials[term.id]?.[buyerKey];
      const x = page.margin + 10 + buyerIndex * 258;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...colors.ink);
      doc.text(acceptance[buyerKey].name, x, initialsY + 19);
      doc.setDrawColor(...colors.ink);
      doc.line(x + 86, initialsY + 20, x + 236, initialsY + 20);
      if (initials?.dataUrl) doc.addImage(initials.dataUrl, "PNG", x + 90, initialsY - 5, 72, 24);
    });

    y += rowHeight + 8;
  });
  return y + 10;
}

async function addAcceptancePdfSection(doc, page, colors, title, issues, startY, completed) {
  let y = startY;
  const addSectionHeading = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(completed ? colors.green : colors.orange));
    doc.text(`${title} (${issues.length})`, page.margin, y);
    y += 14;
  };
  if (y > page.height - 90) {
    doc.addPage();
    y = page.margin;
  }
  addSectionHeading();
  if (!issues.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text(completed ? "No completed items." : "No open items.", page.margin, y + 6);
    return y + 24;
  }

  for (const [index, issue] of issues.entries()) {
    const notes = issue.notes || "No additional notes.";
    const titleLines = doc.splitTextToSize(`${index + 1}. ${issue.issue || "Punch item"}`, 315);
    const noteLines = doc.splitTextToSize(notes, 315);
    const hasPhotos = (issue.photos || []).length > 0;
    const rowHeight = Math.max(64, 34 + titleLines.length * 11 + noteLines.length * 9, hasPhotos ? 96 : 0);
    if (y + rowHeight > page.height - page.margin) {
      doc.addPage();
      y = page.margin;
      addSectionHeading();
    }
    doc.setDrawColor(...colors.line);
    doc.roundedRect(page.margin, y, page.width - page.margin * 2, rowHeight, 4, 4, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...colors.ink);
    doc.text(titleLines, page.margin + 10, y + 16);
    let textY = y + 20 + titleLines.length * 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(doc.splitTextToSize(`${getIssueLocation(issue) || "Location not entered"} • Crew: ${issue.trade || "Not assigned"}`, 315), page.margin + 10, textY);
    textY += 13;
    doc.text(noteLines, page.margin + 10, textY);
    const photos = (issue.photos || []).slice(0, 2);
    for (const [photoIndex, photo] of photos.entries()) {
      try {
        const photoData = await getPhotoDataUrl(photo);
        const photoFormat = /^data:image\/png/i.test(photoData) ? "PNG" : "JPEG";
        doc.addImage(photoData, photoFormat, page.width - page.margin - 152 + photoIndex * 74, y + 10, 68, 68);
      } catch {
        // Keep the signed document usable if a remote photo is temporarily unavailable.
      }
    }
    y += rowHeight + 8;
  }
  return y + 8;
}

function addAcceptancePdfSignatures(doc, page, colors, acceptance, startY) {
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.ink);
  doc.text("HOMEOWNER ACCEPTANCE", page.margin, y);
  y += 24;
  [acceptance.signatures.buyer1, acceptance.signatures.buyer2].forEach((signature, index) => {
    const buyer = acceptance[`buyer${index + 1}`];
    doc.setDrawColor(...colors.ink);
    doc.line(page.margin + 160, y + 43, page.width - page.margin, y + 43);
    doc.addImage(signature.dataUrl, "PNG", page.margin + 165, y, 250, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.ink);
    doc.text(buyer.name, page.margin, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.muted);
    doc.text(`${buyer.email} • Signed ${formatTimestamp(signature.signedAt)}`, page.margin, y + 37);
    y += 70;
  });
  return y;
}

function mergeSupabaseHomeAcceptances(rows) {
  (rows || []).forEach((row) => {
    const homesite = (state.communities || [])
      .flatMap((community) => community.homesites || [])
      .find((candidate) => candidate.id === row.site_id);
    if (!homesite) return;
    const snapshot = row.document_snapshot && typeof row.document_snapshot === "object" ? row.document_snapshot : {};
    const adoptedMarks = snapshot.adoptedMarks || {};
    const termInitials = snapshot.termInitials || {};
    const nhoSignatures = snapshot.nhoSignatures || {};
    homesite.acceptance = {
      buyer1: { name: row.homeowner_1_name || "", email: row.homeowner_1_email || "" },
      buyer2: { name: row.homeowner_2_name || "", email: row.homeowner_2_email || "" },
      signatures: {
        buyer1: row.homeowner_1_signature ? {
          dataUrl: row.homeowner_1_signature,
          signedAt: row.homeowner_1_signed_at || "",
          name: row.homeowner_1_name || "",
          email: row.homeowner_1_email || ""
        } : null,
        buyer2: row.homeowner_2_signature ? {
          dataUrl: row.homeowner_2_signature,
          signedAt: row.homeowner_2_signed_at || "",
          name: row.homeowner_2_name || "",
          email: row.homeowner_2_email || ""
        } : null
      },
      adoptedMarks: {
        buyer1: adoptedMarks.buyer1 || null,
        buyer2: adoptedMarks.buyer2 || null
      },
      termInitials,
      nhoSignatures: {
        buyer1: nhoSignatures.buyer1 || null,
        buyer2: nhoSignatures.buyer2 || null
      },
      nhoAcceptedAt: snapshot.nhoAcceptedAt || "",
      acceptedAt: row.accepted_at || ""
    };
  });
}

function render() {
  ensureHomeAcceptanceRecord();
  renderActiveHomeList();
  renderArchivedHomeList();
  renderCommunities();
  renderHomesites();
  renderHomeDetailsForm();
  renderIssues();
  renderNhoSignoff();
  renderHomeownerSignoff();
  renderEmailActions();
  populateHomesiteInfoFilters();
  renderHomesiteInfo();
  populateAllReportFilters();
  renderAllReports();
  renderFieldNotifications();
  applyStarterCopy();
}

function renderContacts() {
  const contacts = getAllContacts();
  const search = contactSearch.value.trim().toLowerCase();
  const selectedTrade = contactTradeFilter.value;
  const filteredContacts = contacts.filter((contact) => {
    const haystack = [
      contact.tradeType,
      contact.vendor,
      contact.jobDesc,
      contact.contactName,
      contact.contactEmail,
      contact.contactPhone,
      contact.alternateContact
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(search);
    const matchesTrade = !selectedTrade || contact.tradeType === selectedTrade;
    return matchesSearch && matchesTrade;
  }).sort((a, b) => compareIssueText(getContactDisplayName(a), getContactDisplayName(b)) || compareIssueText(a.vendor, b.vendor));

  contactCount.textContent = filteredContacts.length;
  contactList.innerHTML = "";

  if (!filteredContacts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No contacts found.";
    contactList.append(empty);
    return;
  }

  filteredContacts.forEach((contact) => {
    const card = document.createElement("article");
    card.className = "contact-card";

    const emailLinks = buildEmailLinks(contact);
    const phoneLink = contact.contactPhone ? `<a href="tel:${cleanPhone(contact.contactPhone)}">${escapeHtml(contact.contactPhone)}</a>` : "";
    const contactName = getContactDisplayName(contact);

    card.innerHTML = `
      <div class="contact-topline">${escapeHtml(contact.vendor || "Company")}</div>
      <h2>${escapeHtml(contactName || "Name")}</h2>
      <p>${escapeHtml(contact.jobDesc || "")}</p>
      <div class="contact-detail"><strong>Company</strong><span>${escapeHtml(contact.vendor || "-")}</span></div>
      <div class="contact-detail"><strong>Email</strong><span>${emailLinks || "-"}</span></div>
      <div class="contact-detail"><strong>Phone</strong><span>${phoneLink || "-"}</span></div>
      <div class="contact-detail"><strong>Alternative</strong><span>${escapeHtml(contact.alternateContact || "-")}</span></div>
      ${renderContactCustomFields(contact.fields)}
    `;

    contactList.append(card);
  });
}

function populateContactTradeFilter() {
  const contacts = getAllContacts();
  const tradeTypes = [...new Set(contacts.map((contact) => contact.tradeType).filter(Boolean))].sort();
  contactTradeFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All contacts";
  contactTradeFilter.append(allOption);

  tradeTypes.forEach((tradeType) => {
    const option = document.createElement("option");
    option.value = tradeType;
    option.textContent = tradeType;
    contactTradeFilter.append(option);
  });
}

function getAllContacts() {
  return [...(window.preloadedContacts || []), ...(state.customContacts || [])];
}

function openContactForm() {
  contactFormPanel.classList.remove("hidden");
  contactTradeTypeInput.focus();
}

function closeContactForm() {
  contactForm.reset();
  contactFormPanel.classList.add("hidden");
}

async function saveContactFromForm(event) {
  event.preventDefault();

  const contact = {
    tradeType: contactTradeTypeInput.value.trim(),
    vendor: contactVendorInput.value.trim(),
    jobDesc: contactJobDescInput.value.trim(),
    contactName: contactTradeTypeInput.value.trim() || contactNameInput?.value.trim() || "",
    contactEmail: contactEmailInput.value.trim(),
    contactPhone: contactPhoneInput.value.trim(),
    alternateContact: contactAlternateInput.value.trim(),
    source: "Added in app"
  };

  const contactFields = [
    contact.tradeType,
    contact.vendor,
    contact.jobDesc,
    contact.contactEmail,
    contact.contactPhone,
    contact.alternateContact
  ];

  if (!contactFields.some(Boolean)) {
    alert("Add at least one contact detail before saving.");
    return;
  }

  try {
    const saved = await saveContactToSupabase(contact);
    if (saved) {
      contact.id = saved.id;
      contact.source = "Supabase";
    }
  } catch (error) {
    console.warn("Contact could not be saved to Supabase.", error);
  }

  state.customContacts ||= [];
  state.customContacts = [contact, ...state.customContacts.filter((existing) => existing.id !== contact.id)];
  saveState();
  populateContactTradeFilter();
  renderContacts();
  closeContactForm();
}

async function saveContactToSupabase(contact) {
  if (!fieldDriveSupabase) return null;
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) return null;

  const row = {
    organization_id: organizationId,
    contact_name: getContactDisplayName(contact),
    trade: "",
    vendor: contact.vendor || "",
    job_desc: contact.jobDesc || "",
    email: contact.contactEmail || "",
    phone: contact.contactPhone || "",
    alternate_contact: contact.alternateContact || "",
    fields: normalizeContactFields(contact.fields)
  };
  const { data, error } = await fieldDriveSupabase
    .from("contacts")
    .insert(row)
    .select("id")
    .single();

  if (error && ["42703", "PGRST204"].includes(error.code)) {
    delete row.fields;
    const fallback = await fieldDriveSupabase.from("contacts").insert(row).select("id").single();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }
  if (error) throw error;
  return data;
}

function getContactDisplayName(contact) {
  return contact?.tradeType || contact?.contactName || "";
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

function renderContactCustomFields(fields) {
  const normalized = normalizeContactFields(fields);
  if (!normalized.length) return "";
  return normalized.map((field) => `<div class="contact-detail"><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(field.value)}</span></div>`).join("");
}

function saveContactsXlsx() {
  if (!window.XLSX) {
    alert("Excel export is still loading. Try again in a moment.");
    return;
  }

  const rows = getAllContacts().map((contact) => ({
    Name: getContactDisplayName(contact),
    Company: contact.vendor || "",
    "Job Desc": contact.jobDesc || "",
    Email: contact.contactEmail || "",
    Phone: contact.contactPhone || "",
    "Alternative Contact": contact.alternateContact || ""
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");
  XLSX.writeFile(workbook, `contacts-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function populateHomesiteInfoFilters() {
  const homes = getAllHomesiteInfo();

  populateFilterSelect(infoCommunityFilter, homes.map((home) => home.community), "All projects", infoCommunityFilter.value);
}

function getAllHomesiteInfo() {
  const savedHomes = (state.communities || []).flatMap((community) =>
    (community.homesites || []).map((homesite) => {
      const fields = getSiteFields(homesite);
      return {
        communityId: community.id || "",
        community: community.name || "",
        homesiteId: homesite.id || "",
        homesite: homesite.name || "",
        address: getSiteFieldValue(homesite, "Address") || homesite.address || "",
        fields,
        documents: homesite.documents || []
      };
    })
  );
  const preloadedHomes = isPunchlist2Site() ? [] : window.preloadedHomesiteInfo || [];
  const savedKeys = new Set(savedHomes.map((home) => `${home.community}|${home.homesite}`.toLowerCase()));
  const extraPreloadedHomes = preloadedHomes.filter((home) => !savedKeys.has(`${home.community}|${home.homesite}`.toLowerCase()));
  return [...savedHomes, ...extraPreloadedHomes];
}

function populateFilterSelect(select, values, allLabel, currentValue = select.value) {
  select.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.append(allOption);

  [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })).forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = [...select.options].some((option) => option.value === currentValue) ? currentValue : "";
}

function renderHomesiteInfo() {
  const homes = getAllHomesiteInfo();
  const search = infoSearch.value.trim().toLowerCase();
  const filters = {
    community: infoCommunityFilter.value
  };

  const filteredHomes = homes.filter((home) => {
    const haystack = [
      home.community,
      home.homesite,
      home.address,
      ...home.fields.flatMap((field) => [field.label, field.value])
    ].join(" ").toLowerCase();

    return (
      haystack.includes(search) &&
      (!filters.community || home.community === filters.community)
    );
  });

  infoCount.textContent = filteredHomes.length;
  homesiteInfoList.innerHTML = "";

  if (!filteredHomes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No sites match those filters.";
    homesiteInfoList.append(empty);
    return;
  }

  filteredHomes.forEach((home) => {
    const card = document.createElement("article");
    card.className = "info-card";
    const detailGrid = home.fields.length
      ? `
      <div class="info-grid">
        ${home.fields.map(renderHomesiteInfoField).join("")}
      </div>
    `
      : "";
    card.innerHTML = `
      <h2>${escapeHtml(home.homesite || "Site")}</h2>
      ${detailGrid}
    `;
    const siteActions = createSiteInfoActions(home);
    if (siteActions) card.append(siteActions);
    homesiteInfoList.append(card);
  });
}

function renderHomesiteInfoField(field) {
  const label = String(field?.label || "");
  const value = String(field?.value || "");
  const valueMarkup = normalizeColumnName(label) === "address" && value
    ? `<a class="site-info-address-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}" target="_blank" rel="noopener noreferrer" title="Open address in Google Maps">${escapeHtml(value)}</a>`
    : `<span>${escapeHtml(value)}</span>`;
  return `<div><strong>${escapeHtml(label)}</strong>${valueMarkup}</div>`;
}

function createSiteInfoActions(home) {
  if (!home?.homesiteId || !home?.communityId) return null;
  const actions = document.createElement("div");
  actions.className = "site-info-actions";

  const permitDocuments = findSiteDocuments(home, "permit");
  if (permitDocuments.length) {
    const permitButton = document.createElement("button");
    permitButton.className = "site-document-button";
    permitButton.type = "button";
    permitButton.textContent = `Permit (${permitDocuments.length})`;
    permitButton.addEventListener("click", () => openMatchingSiteDocumentsForSite(home, "permit", permitDocuments));
    actions.append(permitButton);
  }

  const blueprintDocuments = findSiteDocuments(home, "blueprint");
  if (blueprintDocuments.length) {
    const blueprintButton = document.createElement("button");
    blueprintButton.className = "site-document-button blueprint";
    blueprintButton.type = "button";
    blueprintButton.textContent = `Blueprints (${blueprintDocuments.length})`;
    blueprintButton.addEventListener("click", () => openMatchingSiteDocumentsForSite(home, "blueprint", blueprintDocuments));
    actions.append(blueprintButton);
  }

  (home.documents || []).filter((documentRow) => documentRow.quickAccess).forEach((documentRow) => {
    const quickButton = document.createElement("button");
    quickButton.className = "site-document-button quick-access";
    quickButton.type = "button";
    quickButton.textContent = documentRow.title || documentRow.fileName || "Document";
    quickButton.title = `Open ${quickButton.textContent}`;
    quickButton.addEventListener("click", () => {
      selectSiteForDocumentActions(home);
      openSiteDocumentFile(documentRow);
    });
    actions.append(quickButton);
  });

  const documentsButton = document.createElement("button");
  documentsButton.className = "site-document-button";
  documentsButton.type = "button";
  documentsButton.textContent = `Documents (${(home.documents || []).length})`;
  documentsButton.addEventListener("click", () => openSiteDocumentsForSite(home));
  actions.append(documentsButton);
  return actions;
}

function openSiteDocumentsForSite(home, filter = "") {
  selectSiteForDocumentActions(home);
  openSiteDocuments(filter);
}

function selectSiteForDocumentActions(home) {
  state.currentCommunityId = home.communityId;
  state.currentHomesiteId = home.homesiteId;
  saveState();
  renderHomesites();
}

function populateAllProjectFilter() {
  const currentValue = getSelectedAllReportProjectId();
  allCommunityFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All Projects";
  allCommunityFilter.append(allOption);
  (state.communities || [])
    .slice()
    .sort((a, b) => compareIssueText(a.name, b.name))
    .forEach((community) => {
      const option = document.createElement("option");
      option.value = getCommunityReportScopeId(community);
      option.textContent = community.name;
      allCommunityFilter.append(option);
    });
  const availableValues = [...allCommunityFilter.options].map((option) => option.value);
  allCommunityFilter.value = availableValues.includes(currentValue) ? currentValue : availableValues[0] || "";
}

function populateAllReportFilters() {
  const rows = getAllOpenIssues();
  const sites = getAllDashboardSites();
  populateAllProjectFilter();
  const selectedProjectId = allCommunityFilter.value;
  const scopedSites = selectedProjectId ? sites.filter((row) => getCommunityReportScopeId(row.community) === selectedProjectId) : sites;
  const scopedRows = selectedProjectId ? rows.filter((row) => getCommunityReportScopeId(row.community) === selectedProjectId) : rows;
  populateFilterSelect(allSiteFilter, scopedSites.map((row) => row.homesite.name), "All sites", allSiteFilter.value);
  const siteScopedRows = allSiteFilter.value ? scopedRows.filter((row) => row.homesite.name === allSiteFilter.value) : scopedRows;
  populateFilterSelect(allTradeFilter, siteScopedRows.map((row) => row.issue.trade), "All crews", allTradeFilter.value);
}

function renderAllReports() {
  const projectIdFilter = allCommunityFilter.value;
  const siteFilter = allSiteFilter.value;
  const tradeFilter = allTradeFilter.value;
  const rows = getAllOpenIssues()
    .filter((row) => !projectIdFilter || getCommunityReportScopeId(row.community) === projectIdFilter)
    .filter((row) => !siteFilter || row.homesite.name === siteFilter)
    .filter((row) => !tradeFilter || row.issue.trade === tradeFilter)
    .sort((a, b) => compareIssueText(a.community.name, b.community.name) || compareIssueText(a.homesite.name, b.homesite.name) || compareIssueDate(a.issue, b.issue));

  allReportsCount.textContent = rows.length;
  allReportIssueList.innerHTML = "";
  renderAllReportLinks();

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No open issues match those filters.";
    allReportIssueList.append(empty);
    return;
  }

  groupAllRowsByHomesite(rows).forEach((group) => {
    const section = document.createElement("section");
    section.className = "home-issue-group";
    section.append(createHomeIssueGroupHeader(group));
    group.rows.forEach((row) => {
      section.append(renderAllIssueCard(row));
    });
    allReportIssueList.append(section);
  });
}

function groupAllRowsByHomesite(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = `${row.community.id}|${row.homesite.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        community: row.community,
        homesite: row.homesite,
        rows: []
      });
    }
    groups.get(key).rows.push(row);
  });
  return [...groups.values()];
}

function createHomeIssueGroupHeader(group) {
  const header = document.createElement("div");
  header.className = "home-group-header";
  const siteLabel = formatSiteLabel(group.homesite.name || "Site", getSiteFieldValue(group.homesite, "Address") || group.homesite.address || "");
  const details = [
    group.community.name,
    ...getSiteFields(group.homesite).slice(0, 3).map((field) => `${field.label}: ${field.value}`)
  ].filter(Boolean).join(" | ");
  header.innerHTML = `
    <div>
      <strong>${escapeHtml(siteLabel)}</strong>
      <span>${escapeHtml(details || "Site details")}</span>
    </div>
    <b>${group.rows.length}</b>
  `;
  return header;
}

function formatSiteLabel(name, address) {
  return [name || "Site", address].filter(Boolean).join(" - ");
}

function createReportTextAction(label, description, modifier = "") {
  const button = document.createElement("button");
  button.className = `menu-item report-text-action ${modifier}`.trim();
  button.type = "button";
  label.split(" ").forEach((word) => {
    const line = document.createElement("span");
    line.textContent = word;
    button.append(line);
  });
  button.title = description;
  button.setAttribute("aria-label", description);
  return button;
}

async function runAllReportLinkAction(button, action) {
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    alert(error?.message || "The report link could not be prepared.");
  } finally {
    button.disabled = false;
  }
}

function renderAllReportLinks() {
  allTradeReportLinkActions.innerHTML = "";

  const scope = getSelectedAllReportScope();
  if (!scope) {
    const hint = document.createElement("div");
    hint.className = "popup-empty";
    hint.textContent = "Select a project to create crew report links.";
    allTradeReportLinkActions.append(hint);
    return;
  }
  const scopeRows = getAllOpenIssues().filter((row) => !scope.projectId || getCommunityReportScopeId(row.community) === scope.projectId);
  const trades = [...new Set(scopeRows.map((row) => row.issue.trade).filter(Boolean))].sort(compareIssueText);
  if (!trades.length) {
    const hint = document.createElement("div");
    hint.className = "popup-empty";
    hint.textContent = scope.projectName
      ? `Add open items to ${scope.projectName} to create crew report links.`
      : "Add open items to create crew report links.";
    allTradeReportLinkActions.append(hint);
    return;
  }

  trades.forEach((trade) => {
    const row = document.createElement("div");
    row.className = "report-option-row";

    const access = getAllTradeReportAccess(trade, scope.reportId);
    const openButton = document.createElement("button");
    openButton.className = "menu-item report-open-button crew-report-button";
    openButton.type = "button";
    openButton.textContent = `${trade} - ${scope.projectName || "All Projects"}`;
    openButton.addEventListener("click", () => runAllReportLinkAction(openButton, async () => {
      await saveAllSharedReport(scope);
      openExternalReportUrl(await getShortReportUrl(getAllTradeReportUrl(trade, "update", scope)));
    }));

    const copyButton = createActionIcon("copy", `Copy ${trade} report link`);
    copyButton.classList.add("report-icon-action");
    copyButton.addEventListener("click", () => runAllReportLinkAction(copyButton, async () => {
      await saveAllSharedReport(scope);
      await copyReportUrl(getAllTradeReportUrl(trade, "update", scope), copyButton);
    }));

    const readButton = createReportTextAction("Read Only", `Copy read-only ${trade} report link`);
    readButton.addEventListener("click", () => runAllReportLinkAction(readButton, async () => {
      await saveAllSharedReport(scope);
      await copyReportUrl(getAllTradeReportUrl(trade, "read", scope), readButton);
    }));
    const recreateButton = createActionIcon("refresh", `Recreate ${trade} report links`);
    recreateButton.classList.add("report-icon-action");
    recreateButton.addEventListener("click", () => runAllReportLinkAction(recreateButton, () => recreateAllTradeReportAccess(trade, scope)));
    [openButton, copyButton, readButton].forEach((button) => { button.disabled = Boolean(access.revoked); });
    row.title = access.revoked ? "Links revoked" : `Links expire ${new Date(access.expiresAt).toLocaleDateString()}`;
    row.append(openButton, copyButton, readButton, recreateButton);
    allTradeReportLinkActions.append(row);
  });
}

async function recreateAllTradeReportAccess(trade, scope = getSelectedAllReportScope()) {
  if (!scope) return;
  if (!confirm(`Recreate the ${trade} ${scope.projectName || "All Projects"} report links? Existing links will stop working.`)) return;
  const oldAccess = getAllTradeReportAccess(trade, scope.reportId);
  await revokeReportAccessTokens("/.netlify/functions/all-report", [oldAccess.read, oldAccess.update, getAllTradeReportKey(trade, scope.reportId)], {
    reportId: scope.reportId,
    reportKind: "all_trade",
    tradeName: trade
  }).catch(() => {});
  const allAccess = loadAllTradeReportAccess();
  const scopeKey = getAllTradeReportScopeKey(scope.reportId, trade);
  allAccess[scopeKey] = createReportAccessBundle();
  localStorage.setItem(allTradeReportAccessStorageKey, JSON.stringify(allAccess));
  try {
    await saveAllSharedReport(scope);
  } catch (error) {
    allAccess[scopeKey].revoked = true;
    localStorage.setItem(allTradeReportAccessStorageKey, JSON.stringify(allAccess));
    renderAllReportLinks();
    throw error;
  }
  renderAllReportLinks();
}

function renderAllIssueCard(row) {
  const issue = row.issue;
  const card = issueTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.dashboardItemId = issue.id;
  card.classList.toggle("trade-complete", Boolean(issue.tradeCompleted));
  renderIssueDetails(card, issue);
  renderIssuePhotos(card.querySelector(".issue-photos"), issue.photos || []);
  card.querySelector(".remove-button").addEventListener("click", () => removeIssueEverywhere(issue.id));
  card.querySelector(".issue-main").append(createSharedNoteField(issue));

  const statusRow = document.createElement("div");
  statusRow.className = "issue-status-row";

  const editButton = document.createElement("button");
  editButton.className = "status-button secondary";
  editButton.type = "button";
  editButton.textContent = "Edit Issue";
  editButton.addEventListener("click", () => editIssue(issue.id));
  statusRow.append(editButton);

  const completeButton = document.createElement("button");
  completeButton.className = "status-button";
  completeButton.type = "button";
  completeButton.textContent = "Mark Complete";
  completeButton.addEventListener("click", () => setIssueCompletedEverywhere(issue.id, true));
  statusRow.append(completeButton);

  if (issue.tradeCompleted) {
    const tradeStatus = document.createElement("span");
    tradeStatus.className = "trade-complete-label";
    tradeStatus.textContent = "Crew marked complete";
    statusRow.append(tradeStatus);
    const rejectButton = document.createElement("button");
    rejectButton.className = "status-button undo";
    rejectButton.type = "button";
    rejectButton.textContent = "Not Complete";
    rejectButton.addEventListener("click", () => rejectCrewCompletion(issue.id));
    statusRow.append(rejectButton);
  }

  card.querySelector(".issue-main").append(statusRow);
  return card;
}

function getAllOpenIssues() {
  return getAllIssueRows(false);
}

function getAllDashboardSites() {
  return (state.communities || []).flatMap((community) =>
    (community.homesites || [])
      .filter((homesite) => !isHomeArchived(homesite))
      .map((homesite) => ({ community, homesite }))
  );
}

function getAllIssueRows(includeCompleted = false) {
  return (state.communities || []).flatMap((community) =>
    (community.homesites || []).filter((homesite) => !isHomeArchived(homesite)).flatMap((homesite) =>
      (homesite.issues || [])
        .filter((issue) => includeCompleted || !issue.completed)
        .map((issue) => ({ community, homesite, issue }))
    )
  );
}

function findIssueRecord(issueId) {
  for (const community of state.communities || []) {
    for (const homesite of community.homesites || []) {
      const issue = (homesite.issues || []).find((item) => item.id === issueId);
      if (issue) return { community, homesite, issue };
    }
  }
  return null;
}

async function removeIssueEverywhere(issueId) {
  const record = findIssueRecord(issueId);
  if (!record) return;
  if (!confirm(`Delete this item from ${record.homesite.name}?`)) return;

  const previousIssues = [...record.homesite.issues];
  record.homesite.issues = record.homesite.issues.filter((issue) => issue.id !== issueId);
  saveState();
  render();

  try {
    if (fieldDriveSupabase) {
      const profile = await getCurrentSupabaseProfile();
      const organizationId = getActiveOrganizationId(profile);
      if (!organizationId) throw new Error("This login needs a profile before items can be deleted.");
      const { data, error } = await fieldDriveSupabase
        .from("punch_items")
        .delete()
        .eq("id", issueId)
        .eq("organization_id", organizationId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("The item was not deleted. Check that this user can manage the selected site.");
    }

    if (!isLocalPreview()) {
      const report = buildHomesiteSharedReport(record.community, record.homesite);
      if (report) await saveHomesiteSharedReport(report);
      await saveAllSharedReport();
    }
  } catch (error) {
    record.homesite.issues = previousIssues;
    saveState();
    render();
    alert(error.message || "The item could not be deleted. Please try again.");
  }
}

async function setIssueCompletedEverywhere(issueId, completed) {
  const record = findIssueRecord(issueId);
  if (!record) return;

  const previousCompleted = Boolean(record.issue.completed);
  const previousCompletedAt = record.issue.completedAt || "";
  const previousUpdatedAt = record.issue.updatedAt || "";
  record.issue.completed = completed;
  record.issue.completedAt = completed ? new Date().toISOString() : "";
  record.issue.updatedAt = new Date().toISOString();
  saveState();
  render();
  const synced = await syncIssueCompletion(record, completed, previousUpdatedAt);
  if (!synced) {
    record.issue.completed = previousCompleted;
    record.issue.completedAt = previousCompletedAt;
    record.issue.updatedAt = previousUpdatedAt;
    saveState();
    render();
  }
}

function buildEmailLinks(contact) {
  const emails = [contact.contactEmail, contact.alternateContact]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[;,]/))
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));

  return emails.map((email) => `<a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a>`).join("<br />");
}

function cleanPhone(phone) {
  return String(phone).replace(/[^\d+]/g, "");
}

function renderCommunities() {
  communitySelect.innerHTML = "";
  if (!state.communities.length) {
    communityDetails.textContent = "No projects loaded";
    return;
  }

  state.communities.forEach((community) => {
    const option = document.createElement("option");
    option.value = community.id;
    option.textContent = community.name;
    communitySelect.append(option);
  });
  const community = getCurrentCommunity();
  communitySelect.value = community.id;
  const activeHomeCount = (community.homesites || []).filter((homesite) => !isHomeArchived(homesite)).length;
  communityDetails.textContent = `${activeHomeCount} active homes`;
}

function renderHomesites() {
  const community = getCurrentCommunity();
  const activeHomes = (community?.homesites || []).filter((homesite) => !isHomeArchived(homesite));
  homesiteSelect.innerHTML = "";
  homesiteDetails.innerHTML = "";

  if (!activeHomes.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No sites loaded";
    homesiteSelect.append(option);
    homesiteSelect.value = "";
    return;
  }

  activeHomes.forEach((homesite) => {
    const option = document.createElement("option");
    const address = getSiteFieldValue(homesite, "Address") || homesite.address || "";
    option.value = homesite.id;
    option.textContent = address ? `${homesite.name} - ${address}` : homesite.name;
    homesiteSelect.append(option);
  });

  if (!getCurrentHomesite()) state.currentHomesiteId = activeHomes[0].id;
  homesiteSelect.value = getCurrentHomesite().id;
  renderHomesiteDetails(getCurrentHomesite());
}

function renderHomesiteDetails(homesite) {
  if (!homesite) return;

  homesiteDetails.innerHTML = "";
  const details = document.createElement("div");
  details.className = "site-detail-fields";

  getSiteFields(homesite).forEach((field) => {
    const label = String(field.label || "").trim();
    const value = String(field.value || "").trim();
    if (!label || !value) return;

    const isAddress = normalizeColumnName(label) === "address";
    const item = document.createElement(isAddress ? "a" : "span");
    item.textContent = `${label}: ${value}`;
    if (isAddress) {
      item.className = "site-detail-link";
      item.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
      item.title = "Open address in Google Maps";
    }
    details.append(item);
  });
  homesiteDetails.append(details);
}

function findSiteDocuments(homesite, label) {
  const target = String(label || "").trim().toLowerCase();
  return (homesite?.documents || []).filter((doc) => {
    const category = String(doc.category || "").toLowerCase();
    const title = String(doc.title || "").toLowerCase();
    if (target === "blueprint") return category.includes("blueprint") || category === "plans" || title.includes("blueprint");
    return category.includes(target) || title.includes(target);
  });
}

function openMatchingSiteDocumentsForSite(home, label, documents) {
  selectSiteForDocumentActions(home);
  if (documents.length === 1) {
    openSiteDocumentFile(documents[0]);
    return;
  }
  openSiteDocuments(label);
}

async function openSiteDocuments(filter = "") {
  const homesite = getCurrentHomesite();
  if (!homesite) return;
  siteDocumentFilter = String(filter || "").toLowerCase();
  siteDocumentsTitle.textContent = `${homesite.name} documents`;
  siteDocumentSearch.value = "";
  siteDocumentStatus.textContent = "";
  hideSiteDocumentForm();
  renderSiteDocuments();
  siteDocumentsModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  await refreshCurrentSiteDocuments();
}

async function refreshCurrentSiteDocuments() {
  const homesite = getCurrentHomesite();
  if (!fieldDriveSupabase || !homesite?.id) return;
  siteDocumentStatus.textContent = "Checking for document updates...";
  try {
    const profile = await getCurrentSupabaseProfile();
    const organizationId = getActiveOrganizationId(profile);
    const { data, error } = await selectSupabaseSiteDocuments(organizationId, homesite.id);
    if (error) throw error;
    homesite.documents = (data || []).map(normalizeSiteDocument);
    saveState();
    renderHomesiteDetails(homesite);
    renderHomesiteInfo();
    renderSiteDocuments();
    siteDocumentStatus.textContent = "";
  } catch (error) {
    siteDocumentStatus.textContent = error.message || "Document updates could not be loaded.";
  }
}

function closeSiteDocuments() {
  siteDocumentsModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  hideSiteDocumentForm();
}

function renderSiteDocuments() {
  const homesite = getCurrentHomesite();
  const search = siteDocumentSearch.value.trim().toLowerCase();
  const documents = (homesite?.documents || [])
    .filter((doc) => !siteDocumentFilter || findSiteDocuments({ documents: [doc] }, siteDocumentFilter).length)
    .filter((doc) => [doc.title, doc.fileName, doc.category, doc.description].join(" ").toLowerCase().includes(search));

  siteDocumentList.innerHTML = "";
  if (!documents.length) {
    siteDocumentList.innerHTML = `<p class="document-empty">${siteDocumentFilter ? `No ${escapeHtml(siteDocumentFilter)} documents found.` : "No documents added to this site yet."}</p>`;
    return;
  }

  documents.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "document-card";
    card.innerHTML = `
      <div class="document-card-main">
        <strong>${escapeHtml(doc.title || doc.fileName || "Document")}</strong>
        <span>${escapeHtml([doc.category, formatSiteDocumentDate(doc.documentDate), doc.quickAccess ? "Quick Access" : ""].filter(Boolean).join(" | "))}</span>
        ${doc.description ? `<p>${escapeHtml(doc.description)}</p>` : ""}
        <small>${escapeHtml(doc.fileName || "")}${doc.sizeBytes ? ` | ${escapeHtml(formatFileSize(doc.sizeBytes))}` : ""}</small>
      </div>
      <div class="document-card-actions">
        <button class="mini-button primary" type="button" data-document-open="${escapeHtml(doc.id)}">Open</button>
        <button class="mini-button" type="button" data-document-edit="${escapeHtml(doc.id)}">Edit</button>
        <button class="mini-button danger" type="button" data-document-delete="${escapeHtml(doc.id)}">Delete</button>
      </div>
    `;
    siteDocumentList.append(card);
  });
}

function handleSiteDocumentAction(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const homesite = getCurrentHomesite();
  const id = button.dataset.documentOpen || button.dataset.documentEdit || button.dataset.documentDelete;
  const documentRow = (homesite?.documents || []).find((doc) => doc.id === id);
  if (!documentRow) return;
  if (button.dataset.documentOpen) openSiteDocumentFile(documentRow);
  if (button.dataset.documentEdit) showSiteDocumentForm(documentRow);
  if (button.dataset.documentDelete) deleteSiteDocument(documentRow);
}

function showSiteDocumentForm(documentRow = null) {
  siteDocumentForm.classList.remove("hidden");
  siteDocumentId.value = documentRow?.id || "";
  siteDocumentName.value = documentRow?.title || "";
  siteDocumentCategory.value = documentRow?.category || "";
  siteDocumentDate.value = documentRow?.documentDate || "";
  siteDocumentQuickAccess.checked = Boolean(documentRow?.quickAccess);
  siteDocumentDescription.value = documentRow?.description || "";
  siteDocumentFile.value = "";
  siteDocumentFileField.classList.toggle("hidden", Boolean(documentRow));
  saveSiteDocumentButton.textContent = documentRow ? "Save changes" : "Upload document";
  siteDocumentName.focus();
}

function hideSiteDocumentForm() {
  siteDocumentForm.classList.add("hidden");
  siteDocumentForm.reset();
  siteDocumentId.value = "";
  siteDocumentFileField.classList.remove("hidden");
  saveSiteDocumentButton.textContent = "Upload document";
}

function suggestSiteDocumentName() {
  const file = siteDocumentFile.files?.[0];
  if (!file || siteDocumentName.value.trim()) return;
  siteDocumentName.value = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

async function saveSiteDocument(event) {
  event.preventDefault();
  const homesite = getCurrentHomesite();
  if (!homesite || !fieldDriveSupabase) {
    alert("Document storage is not connected.");
    return;
  }

  const title = siteDocumentName.value.trim();
  if (!title) {
    alert("Enter a document name.");
    siteDocumentName.focus();
    return;
  }

  const existingId = siteDocumentId.value;
  const file = siteDocumentFile.files?.[0];
  if (!existingId && !file) {
    alert("Choose a document to upload.");
    return;
  }

  let verifiedFile = null;
  if (file) {
    try {
      verifiedFile = uploadSecurity
        ? await uploadSecurity.validateDocument(file)
        : { contentType: getSiteDocumentContentType(file), safeName: file.name };
      if (!allowedSiteDocumentTypes.has(verifiedFile.contentType) || file.size > maxSiteDocumentBytes) throw new Error("Unsupported document.");
    } catch (error) {
      alert(error.message || "This document could not be verified.");
      return;
    }
  }

  saveSiteDocumentButton.disabled = true;
  saveSiteDocumentButton.textContent = existingId ? "Saving..." : "Uploading...";
  siteDocumentStatus.textContent = existingId ? "Saving document details..." : "Uploading document...";

  try {
    const profile = await getCurrentSupabaseProfile();
    const organizationId = getActiveOrganizationId(profile);
    if (!organizationId || !profile?.id) throw new Error("This login needs a profile before documents can sync.");
    await initializeMainOfflineSync();

    const metadata = {
      title,
      category: siteDocumentCategory.value.trim() || "Document",
      description: siteDocumentDescription.value.trim() || null,
      document_date: siteDocumentDate.value || null,
      quick_access: siteDocumentQuickAccess.checked
    };

    if (existingId) {
      const documentRow = (homesite.documents || []).find((document) => document.id === existingId);
      if (!documentRow) throw new Error("The document could not be found.");
      const baseUpdatedAt = documentRow.updatedAt || "";
      const clientUpdatedAt = new Date().toISOString();
      Object.assign(documentRow, {
        title: metadata.title,
        category: metadata.category,
        description: metadata.description || "",
        documentDate: metadata.document_date || "",
        quickAccess: metadata.quick_access,
        updatedAt: clientUpdatedAt
      });
      await mainOfflineSync.enqueue({
        kind: "document.patch",
        entityType: "site_document",
        entityId: existingId,
        coalesceKey: `document.patch:${existingId}`,
        baseUpdatedAt,
        clientUpdatedAt,
        payload: { organizationId, patch: metadata }
      });
    } else {
      const documentId = createId();
      const contentType = verifiedFile.contentType;
      const safeFileName = verifiedFile.safeName;
      const storagePath = `${organizationId}/${homesite.id}/${documentId}-${sanitizeSiteDocumentFileName(safeFileName)}`;
      const clientUpdatedAt = new Date().toISOString();
      const row = {
        id: documentId,
        ...metadata,
        organization_id: organizationId,
        site_id: homesite.id,
        storage_path: storagePath,
        file_name: safeFileName,
        content_type: contentType,
        size_bytes: file.size,
        uploaded_by: profile.id,
        created_at: clientUpdatedAt,
        updated_at: clientUpdatedAt
      };
      await mainOfflineSync.enqueue({
        id: documentId,
        kind: "document.create",
        entityType: "site_document",
        entityId: documentId,
        clientUpdatedAt,
        payload: { row, storagePath, file }
      });
      homesite.documents ||= [];
      homesite.documents.unshift(normalizeSiteDocument(row));
    }
    saveState();
    renderHomesiteDetails(homesite);
    renderHomesiteInfo();
    siteDocumentFilter = "";
    siteDocumentStatus.textContent = "Saved on device.";
    hideSiteDocumentForm();
    renderSiteDocuments();
  } catch (error) {
    siteDocumentStatus.textContent = error.message || "The document could not be saved.";
  } finally {
    saveSiteDocumentButton.disabled = false;
    saveSiteDocumentButton.textContent = siteDocumentId.value ? "Save changes" : "Upload document";
  }
}

async function openSiteDocumentFile(documentRow) {
  if (!fieldDriveSupabase || !documentRow?.storagePath) return;
  const viewer = window.open("about:blank", "_blank");
  if (viewer) viewer.opener = null;
  try {
    if (mainOfflineSync) {
      const pending = await mainOfflineSync.getOperations({ entityId: documentRow.id, pendingOnly: true });
      const localUpload = pending.find((operation) => operation.kind === "document.create");
      if (localUpload?.payload?.file) {
        const localUrl = URL.createObjectURL(localUpload.payload.file);
        if (viewer) viewer.location.replace(localUrl);
        else window.location.href = localUrl;
        setTimeout(() => URL.revokeObjectURL(localUrl), 300000);
        return;
      }
    }
    const { data, error } = await fieldDriveSupabase.storage.from(siteDocumentBucket).download(documentRow.storagePath);
    if (error) throw error;
    const documentUrl = URL.createObjectURL(data);
    if (viewer) viewer.location.replace(documentUrl);
    else window.location.href = documentUrl;
    setTimeout(() => URL.revokeObjectURL(documentUrl), 300000);
  } catch (error) {
    if (viewer) viewer.close();
    alert(error.message || "The document could not be opened.");
  }
}

async function deleteSiteDocument(documentRow) {
  if (!confirm(`Delete ${documentRow.title || documentRow.fileName}?`)) return;
  try {
    const profile = await getCurrentSupabaseProfile();
    const organizationId = getActiveOrganizationId(profile);
    const { error } = await fieldDriveSupabase
      .from("site_documents")
      .delete()
      .eq("id", documentRow.id)
      .eq("organization_id", organizationId);
    if (error) throw error;
    const storageDelete = await fieldDriveSupabase.storage.from(siteDocumentBucket).remove([documentRow.storagePath]);
    if (storageDelete.error) console.warn("Document file cleanup failed.", storageDelete.error);

    const homesite = getCurrentHomesite();
    homesite.documents = (homesite.documents || []).filter((doc) => doc.id !== documentRow.id);
    saveState();
    renderHomesiteDetails(homesite);
    renderHomesiteInfo();
    siteDocumentStatus.textContent = "Document deleted.";
    renderSiteDocuments();
  } catch (error) {
    siteDocumentStatus.textContent = error.message || "The document could not be deleted.";
  }
}

function normalizeSiteDocument(row = {}) {
  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title || row.file_name || "Document",
    category: row.category || "Other",
    description: row.description || "",
    documentDate: row.document_date || "",
    quickAccess: Boolean(row.quick_access ?? row.quickAccess),
    storagePath: row.storage_path || "",
    fileName: row.file_name || "document",
    contentType: row.content_type || "application/octet-stream",
    sizeBytes: Number(row.size_bytes || 0),
    uploadedBy: row.uploaded_by || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function getSiteDocumentContentType(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type) return type;
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  return ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" })[extension] || "";
}

function sanitizeSiteDocumentFileName(name) {
  return String(name || "document").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-140);
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSiteDocumentDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
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

function renderIssues() {
  const homesite = getCurrentHomesite();
  issueList.innerHTML = "";
  completedIssueList.innerHTML = "";

  const activeIssues = sortIssues((homesite?.issues || []).filter((issue) => !issue.completed), issueSortSelect.value);
  const completedIssues = sortIssues((homesite?.issues || []).filter((issue) => issue.completed), issueSortSelect.value);

  issueCount.textContent = activeIssues.length;
  completedCount.textContent = completedIssues.length;
  tradeCount.textContent = activeIssues.length ? new Set(activeIssues.map((issue) => issue.trade)).size : 0;
  completedSection.classList.toggle("empty", completedIssues.length === 0);

  if (!homesite) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Add a project site or load sites from Excel.";
    issueList.append(empty);
    return;
  }

  if (!activeIssues.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = completedIssues.length ? "All items for this site are complete." : "No items added for this site yet.";
    issueList.append(empty);
  }

  activeIssues.forEach((issue) => {
    issueList.append(renderIssueCard(issue, false));
  });

  completedIssues.forEach((issue) => {
    completedIssueList.append(renderIssueCard(issue, true));
  });
}

function renderIssueCard(issue, isCompleted) {
  const card = issueTemplate.content.firstElementChild.cloneNode(true);
  card.classList.toggle("completed", isCompleted);
  card.classList.toggle("trade-complete", Boolean(issue.tradeCompleted));
  renderIssueDetails(card, issue);
  renderIssuePhotos(card.querySelector(".issue-photos"), issue.photos || []);
  card.querySelector(".remove-button").addEventListener("click", () => removeIssue(issue.id));
  card.querySelector(".issue-main").append(createSharedNoteField(issue));

  const statusButton = document.createElement("button");
  statusButton.className = isCompleted ? "status-button undo" : "status-button";
  statusButton.type = "button";
  statusButton.textContent = isCompleted ? "Uncomplete" : "Mark Complete";
  statusButton.addEventListener("click", () => setIssueCompleted(issue.id, !isCompleted));
  const statusRow = document.createElement("div");
  statusRow.className = "issue-status-row";
  const editButton = document.createElement("button");
  editButton.className = "status-button secondary";
  editButton.type = "button";
  editButton.textContent = "Edit Issue";
  editButton.addEventListener("click", () => editIssue(issue.id));
  statusRow.append(editButton);
  statusRow.append(statusButton);

  if (issue.tradeCompleted && !isCompleted) {
    const tradeStatus = document.createElement("span");
    tradeStatus.className = "trade-complete-label";
    tradeStatus.textContent = "Crew marked complete";
    statusRow.append(tradeStatus);
    const rejectButton = document.createElement("button");
    rejectButton.className = "status-button undo";
    rejectButton.type = "button";
    rejectButton.textContent = "Not Complete";
    rejectButton.addEventListener("click", () => rejectCrewCompletion(issue.id));
    statusRow.append(rejectButton);
  }

  card.querySelector(".issue-main").append(statusRow);

  return card;
}

function renderIssueDetails(card, issue) {
  const details = card.querySelector(".issue-details");
  const location = getIssueLocation(issue) || "Not provided";
  const rows = [
    ["Crew -", issue.trade || "Not assigned"],
    ["Location -", location],
    ["Item -", issue.issue || "Not provided"],
    ["Added by -", issue.addedByName || issue.createdByName || "Not recorded"],
    ["Date Added -", formatTimestamp(issue.createdAt)],
    ["Notes:", issue.notes || "No notes added."]
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "issue-detail-row";
    const rowLabel = document.createElement("span");
    rowLabel.className = "issue-detail-label";
    rowLabel.textContent = label;
    const rowValue = document.createElement("span");
    rowValue.className = "issue-detail-value";
    rowValue.textContent = value;
    row.append(rowLabel, rowValue);
    details.append(row);
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
  textarea.addEventListener("change", () => updateIssueSharedNote(issue.id, textarea.value));

  wrapper.append(label, textarea);
  return wrapper;
}

function sortIssues(issues, sortBy) {
  return [...issues].sort((a, b) => {
    if (sortBy === "trade") return compareIssueText(a.trade, b.trade) || compareIssueDate(a, b);
    if (sortBy === "location") return compareIssueText(a.room, b.room) || compareIssueDate(a, b);
    if (sortBy === "tradeCompleted") return Number(a.tradeCompleted) - Number(b.tradeCompleted) || compareIssueDate(a, b);
    return compareIssueDate(a, b);
  });
}

function compareIssueText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
}

function compareIssueDate(a, b) {
  return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
}

async function setIssueCompleted(issueId, completed) {
  const homesite = getCurrentHomesite();
  const issue = homesite?.issues.find((item) => item.id === issueId);
  if (!issue) return;

  const previousCompleted = Boolean(issue.completed);
  const previousCompletedAt = issue.completedAt || "";
  const previousUpdatedAt = issue.updatedAt || "";
  issue.completed = completed;
  issue.completedAt = completed ? new Date().toISOString() : "";
  issue.updatedAt = new Date().toISOString();
  saveState();
  render();
  const community = getCurrentCommunity();
  const synced = await syncIssueCompletion({ community, homesite, issue }, completed, previousUpdatedAt);
  if (!synced) {
    issue.completed = previousCompleted;
    issue.completedAt = previousCompletedAt;
    issue.updatedAt = previousUpdatedAt;
    saveState();
    render();
  }
}

async function rejectCrewCompletion(issueId) {
  const record = findIssueRecord(issueId);
  if (!record?.issue?.tradeCompleted) return;
  if (!confirm(`Mark ${record.issue.issue || "this item"} as crew not complete?`)) return;
  const previousUpdatedAt = record.issue.updatedAt || "";
  const previousTradeCompletedAt = record.issue.tradeCompletedAt || "";
  record.issue.tradeCompleted = false;
  record.issue.tradeCompletedAt = "";
  record.issue.updatedAt = new Date().toISOString();
  saveState();
  render();
  try {
    if (fieldDriveSupabase && record.issue.id) {
      await queueItemPatch(record, {
        trade_completed: false,
        trade_completed_at: null
      }, previousUpdatedAt);
    }
    if (!isLocalPreview()) {
      const report = buildHomesiteSharedReport(record.community, record.homesite);
      if (report) saveHomesiteSharedReport(report).catch(() => {});
      saveAllSharedReport().catch(() => {});
    }
  } catch (error) {
    record.issue.tradeCompleted = true;
    record.issue.tradeCompletedAt = previousTradeCompletedAt;
    record.issue.updatedAt = previousUpdatedAt;
    saveState();
    render();
    alert(error.message || "The crew completion status could not be changed.");
  }
}

async function syncIssueCompletion(record, completed, baseUpdatedAt = "") {
  if (!record?.issue) return;
  const completedAt = completed ? record.issue.completedAt || new Date().toISOString() : null;

  if (fieldDriveSupabase && record.issue.id) {
    try {
      await queueItemPatch(record, {
        completed,
        completed_at: completedAt,
        trade_completed: false,
        trade_completed_at: null
      }, baseUpdatedAt);
    } catch (error) {
      alert(error.message || "The completed status could not be saved on this device.");
      return false;
    }
  }

  if (!isLocalPreview()) {
    const report = buildHomesiteSharedReport(record.community, record.homesite);
    if (report) saveHomesiteSharedReport(report).catch(() => {});
    saveAllSharedReport().catch(() => {});
  }
  return true;
}

async function updateIssueSharedNote(issueId, note) {
  const record = findIssueRecord(issueId);
  if (!record) return;

  const previousUpdatedAt = record.issue.updatedAt || "";
  record.issue.sharedNote = note.trim();
  record.issue.sharedNoteUpdatedAt = new Date().toISOString();
  record.issue.updatedAt = record.issue.sharedNoteUpdatedAt;
  saveState();
  if (fieldDriveSupabase && record.issue.id) {
    try {
      await queueItemPatch(record, { shared_note: record.issue.sharedNote, shared_note_source: "field_app" }, previousUpdatedAt);
    } catch (error) {
      console.warn("Shared note could not be saved on this device.", error);
      alert(error.message || "The note could not be saved on this device.");
    }
  }
  if (!isLocalPreview()) {
    const report = buildHomesiteSharedReport(record.community, record.homesite);
    if (report) saveHomesiteSharedReport(report).catch(() => {});
    saveAllSharedReport().catch(() => {});
  }
}

async function editIssue(issueId) {
  const record = findIssueRecord(issueId);
  if (!record) return;

  markLocalActivity();
  editingIssueId = issueId;
  state.currentCommunityId = record.community.id;
  state.currentHomesiteId = record.homesite.id;
  saveState();
  showPage("punchListPage");
  render();

  const issue = record.issue;
  const locationArea = issue.locationArea || issue.room || "Other";
  setIssueFormSelectValue(roomSelect, locationArea);
  locationDetailInput.value = issue.locationDetail || "";
  setIssueFormSelectValue(tradeSelect, issue.trade || "Other");
  populateIssueOptions();
  setIssueFormSelectValue(issueSelect, issue.issue || "Other");
  notesInput.value = issue.notes || "";
  selectedPhotos = (issue.photos || []).map((photo) => ({ ...photo, editExisting: true }));
  cameraInput.value = "";
  photoInput.value = "";
  renderPhotoPreview();

  issueEntryForm.classList.add("is-editing");
  issueEntryForm.setAttribute("aria-label", "Edit item");
  issueSubmitButton.disabled = false;
  issueSubmitButton.textContent = "Save item edits";
  refreshLanguageDom();

  requestAnimationFrame(() => {
    issueEntryForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setIssueFormSelectValue(select, value) {
  const nextValue = String(value || "").trim() || "Other";
  if (![...select.options].some((option) => option.value === nextValue)) {
    const option = document.createElement("option");
    option.value = nextValue;
    option.textContent = nextValue;
    option.dataset.editValue = "true";
    select.append(option);
  }
  select.value = nextValue;
}

function resetIssueEditMode() {
  editingIssueId = "";
  selectedPhotos = [];
  notesInput.value = "";
  locationDetailInput.value = "";
  cameraInput.value = "";
  photoInput.value = "";
  photoPreview.innerHTML = "";
  issueEntryForm.classList.remove("is-editing");
  issueEntryForm.setAttribute("aria-label", "Add item");
  issueSubmitButton.disabled = false;
  issueSubmitButton.textContent = "Add item";
  refreshLanguageDom();
}

async function queueEditedIssuePhotos(record, photos) {
  if (!photos.length) return [];

  await initializeMainOfflineSync();
  const profile = await getCurrentSupabaseProfile();
  const organizationId = getActiveOrganizationId(profile);
  if (!organizationId) throw new Error("This login needs a profile before photos can sync.");
  const itemOperations = await mainOfflineSync.getOperations({ entityId: record.issue.id, pendingOnly: true });
  const createOperation = itemOperations.find((operation) => operation.kind === "item.create");
  const queuedPhotos = [];

  for (const photo of photos) {
    const operation = await mainOfflineSync.enqueue({
      kind: "photo.upload",
      entityType: "item_photo",
      entityId: record.issue.id,
      dependsOn: createOperation ? [createOperation.id] : [],
      deferSync: true,
      payload: { organizationId, itemId: record.issue.id, photo, completionProof: false }
    });
    queuedPhotos.push({
      photo: { ...photo, id: `local:${operation.id}`, localOperationId: operation.id, completionProof: false },
      operationId: operation.id
    });
  }

  return queuedPhotos;
}

async function saveIssueEditsFromForm() {
  const record = findIssueRecord(editingIssueId);
  if (!record) {
    resetIssueEditMode();
    alert("The item could not be found. Refresh and try again.");
    return;
  }

  markLocalActivity();
  issueSubmitButton.disabled = true;
  issueSubmitButton.textContent = "Saving item edits...";
  refreshLanguageDom();

  const issue = record.issue;
  const previous = {
    room: issue.room,
    locationArea: issue.locationArea,
    locationDetail: issue.locationDetail,
    trade: issue.trade,
    issue: issue.issue,
    notes: issue.notes,
    photos: [...(issue.photos || [])],
    updatedAt: issue.updatedAt
  };
  const newPhotos = selectedPhotos.filter((photo) => !photo.editExisting);
  const queuedOperationIds = [];

  try {
    let savedPhotos = [];
    const isSupabaseIssue = fieldDriveSupabase && (issue.source === "Supabase" || issue.source === "Pending" || record.homesite?.source === "Supabase");
    if (newPhotos.length && fieldDriveSupabase && !isSupabaseIssue) {
      throw new Error("Select a synced home on the Select Home tab before adding photos.");
    }
    if (isSupabaseIssue) {
      const queuedPhotos = await queueEditedIssuePhotos(record, newPhotos);
      queuedOperationIds.push(...queuedPhotos.map((entry) => entry.operationId));
      savedPhotos = queuedPhotos.map((entry) => entry.photo);
    } else {
      savedPhotos = await persistSelectedPhotos(newPhotos, { itemId: issue.id });
    }

    Object.assign(issue, {
      room: getLocationValue(),
      locationArea: roomSelect.value,
      locationDetail: locationDetailInput.value.trim(),
      trade: tradeSelect.value,
      issue: issueSelect.value,
      notes: notesInput.value.trim(),
      photos: [...previous.photos, ...savedPhotos],
      updatedAt: new Date().toISOString()
    });
    saveState();
    await syncIssueEdits(record, previous.updatedAt || "");
    saveState();
    render();
    resetIssueEditMode();
    if (queuedOperationIds.length && navigator.onLine !== false) queueMicrotask(() => mainOfflineSync.syncNow());
  } catch (error) {
    if (queuedOperationIds.length && mainOfflineSync) await mainOfflineSync.discard(queuedOperationIds).catch(() => {});
    Object.assign(issue, previous);
    saveState();
    render();
    issueSubmitButton.disabled = false;
    issueSubmitButton.textContent = "Save item edits";
    refreshLanguageDom();
    alert(error.message || "The item changes could not be saved. The original values were restored.");
  }
}

async function syncIssueEdits(record, baseUpdatedAt = "") {
  const issue = record?.issue;
  if (!issue) throw new Error("The issue could not be found.");

  const isSupabaseIssue = issue.source === "Supabase" || issue.source === "Pending" || record.homesite?.source === "Supabase";
  if (fieldDriveSupabase && isSupabaseIssue) {
    await queueItemPatch(record, {
      location: issue.room || "",
      location_area: issue.locationArea || issue.room || "",
      location_detail: issue.locationDetail || "",
      trade: issue.trade || "",
      item: issue.issue || "",
      notes: issue.notes || ""
    }, baseUpdatedAt);
  }

  if (!isLocalPreview()) {
    const report = buildHomesiteSharedReport(record.community, record.homesite);
    const updates = [];
    if (report) updates.push(saveHomesiteSharedReport(report));
    updates.push(saveAllSharedReport());
    await Promise.allSettled(updates);
  }
}

function toggleCompletedIssues() {
  const minimized = completedSection.classList.toggle("minimized");
  toggleCompletedButton.textContent = minimized ? "Show" : "Hide";
}

function renderIssuePhotos(container, photos) {
  container.innerHTML = "";
  if (!photos.length) return;

  const orderedPhotos = [...photos].sort((a, b) => Number(Boolean(a.completionProof)) - Number(Boolean(b.completionProof)));
  orderedPhotos.forEach((photo, index) => {
    const photoLabel = photo.completionProof ? "Completion Photo" : "Item Photo";
    const photoEntry = document.createElement("div");
    photoEntry.className = "issue-photo-entry";
    const photoButton = document.createElement("button");
    photoButton.className = "issue-photo-button";
    photoButton.type = "button";
    photoButton.setAttribute("aria-label", `View ${photoLabel.toLowerCase()} ${index + 1}`);
    const image = document.createElement("img");
    image.src = getPhotoSource(photo);
    image.alt = photoLabel;
    photoButton.append(image);
    const caption = document.createElement("span");
    caption.className = "issue-photo-caption";
    caption.textContent = photoLabel;
    photoButton.addEventListener("click", () => openPhoto(getPhotoSource(photo), image.alt, Boolean(photo.completionProof)));
    photoEntry.append(photoButton, caption);
    container.append(photoEntry);
  });
}

function getPhotoSource(photo) {
  if (photo.dataUrl) return photo.dataUrl;
  if (photo.signedUrl) return photo.signedUrl;
  if (photo.id) return `/.netlify/functions/photo?id=${encodeURIComponent(photo.id)}`;
  return "";
}

async function hydrateItemPhotoSignedUrls(photoRows) {
  const paths = [...new Set(photoRows
    .map((photo) => String(photo.storage_path || ""))
    .filter((path) => path && !path.startsWith("data:image/") && !/^https?:\/\//i.test(path)))];
  if (!paths.length) return;

  const { data, error } = await fieldDriveSupabase.storage.from(itemPhotoBucket).createSignedUrls(paths, 900);
  if (error) {
    console.warn("Secure photo links could not be created.", error);
    return;
  }
  const urlsByPath = new Map((data || []).map((entry) => [entry.path, entry.signedUrl]));
  photoRows.forEach((photo) => {
    photo.signed_url = urlsByPath.get(photo.storage_path) || "";
  });
}

function openPhoto(dataUrl, alt = "Item Photo", completionProof = false) {
  document.querySelector(".photo-lightbox")?.remove();
  const viewer = document.createElement("div");
  viewer.className = "photo-lightbox";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", completionProof ? "Completion photo viewer" : "Photo viewer");

  const closeButton = document.createElement("button");
  closeButton.className = "photo-lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close photo");
  closeButton.title = "Close photo";
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>';

  const image = document.createElement("img");
  image.src = dataUrl;
  image.alt = alt;

  const label = document.createElement("div");
  label.className = "photo-lightbox-label";
  label.textContent = completionProof ? "Completion Photo" : "Item Photo";
  viewer.append(label);
  viewer.append(closeButton, image);
  let historyEntryAdded = false;
  let closing = false;
  const cleanup = () => {
    viewer.remove();
    document.body.classList.remove("photo-viewer-open");
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
  document.body.classList.add("photo-viewer-open");
  try {
    history.pushState({ punchLogicPhotoViewer: true }, "");
    historyEntryAdded = true;
    window.addEventListener("popstate", handleHistoryBack, { once: true });
  } catch {
    historyEntryAdded = false;
  }
  closeButton.focus();
}

function renderEmailActions() {
  const homesite = getCurrentHomesite();
  const openIssues = (homesite?.issues || []).filter((issue) => !issue.completed);
  const issuesByTrade = groupByTrade(openIssues);
  state.tradeEmails ||= { ...defaultTradeEmails };
  emailActions.innerHTML = "";

  if (!openIssues.length) {
    const button = document.createElement("a");
    button.className = "email-button disabled";
    button.textContent = "Add items to send crew reports";
    emailActions.append(button);
    return;
  }

  Object.entries(issuesByTrade).forEach(([trade, issues]) => {
    const row = document.createElement("div");
    row.className = "email-row";

    const field = document.createElement("label");
    field.className = "email-field";
    const label = document.createElement("span");
    label.textContent = trade;
    field.append(label);

    const input = document.createElement("input");
    input.type = "email";
    input.inputMode = "email";
    input.placeholder = `${trade.toLowerCase()}@company.com`;
    input.value = state.tradeEmails[trade] || "";

    const link = createActionIcon("mail", `Email ${issues.length} ${trade} items`);
    link.className = state.tradeEmails[trade] ? "action-icon email-button" : "action-icon email-button disabled";
    link.href = "#";
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!state.tradeEmails[trade]) return;
      const reportScope = getAllReportScope(getCommunityReportScopeId(getCurrentCommunity()));
      const longReportUrl = getAllTradeReportUrl(trade, "update", reportScope) || getTradeReportUrl(trade);
      await saveAllSharedReport(reportScope).catch(() => {});
      const reportUrl = await getShortReportUrl(longReportUrl);
      window.location.href = buildMailtoLink(homesite.name, trade, issues, reportUrl);
    });

    const pdfButton = createActionIcon("pdf", `Share ${trade} PDF`);
    pdfButton.addEventListener("click", () => runPdfButtonAction(pdfButton, () => createTradePdf(homesite, trade, issues)));

    const downloadPdfButton = createActionIcon("download", `Download ${trade} PDF`);
    downloadPdfButton.addEventListener("click", () => runPdfButtonAction(downloadPdfButton, () => createTradePdf(homesite, trade, issues, true)));

    const tradeReportButton = createActionIcon("globe", `Open ${trade} crew report`);
    tradeReportButton.addEventListener("click", () => openTradeReport(trade));

    input.addEventListener("input", () => {
      state.tradeEmails[trade] = input.value.trim();
      saveState();
      link.className = state.tradeEmails[trade] ? "action-icon email-button" : "action-icon email-button disabled";
    });

    field.append(input);
    row.append(field, pdfButton, downloadPdfButton, tradeReportButton, link);
    emailActions.append(row);
  });
}

function createActionIcon(type, label) {
  const element = type === "mail" ? document.createElement("a") : document.createElement("button");
  element.className = type === "mail" ? "action-icon email-button" : "action-icon pdf-button";
  element.title = label;
  element.setAttribute("aria-label", label);
  if (element.tagName === "BUTTON") element.type = "button";

  const icons = {
    mail: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16v12H4z"></path>
        <path d="m4 7 8 6 8-6"></path>
      </svg>
    `,
    pdf: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h9l3 3v15H6z"></path>
        <path d="M15 3v4h4"></path>
        <path d="M8 14h8"></path>
        <path d="M8 18h5"></path>
      </svg>
    `,
    download: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12"></path>
        <path d="m7 10 5 5 5-5"></path>
        <path d="M5 21h14"></path>
      </svg>
    `,
    globe: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M3 12h18"></path>
        <path d="M12 3a13 13 0 0 1 0 18"></path>
        <path d="M12 3a13 13 0 0 0 0 18"></path>
      </svg>
    `,
    copy: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="11" height="11" rx="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `,
    eye: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"></path>
        <circle cx="12" cy="12" r="2.5"></circle>
      </svg>
    `,
    refresh: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 7v5h-5"></path><path d="M4 17v-5h5"></path>
        <path d="M6.1 9a7 7 0 0 1 11.7-2L20 9"></path><path d="M17.9 15a7 7 0 0 1-11.7 2L4 15"></path>
      </svg>
    `,
    ban: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle><path d="m6 6 12 12"></path>
      </svg>
    `
  };

  element.innerHTML = icons[type];
  return element;
}

function groupByTrade(issues) {
  return issues.reduce((groups, issue) => {
    groups[issue.trade] ||= [];
    groups[issue.trade].push(issue);
    return groups;
  }, {});
}

function buildMailtoLink(homesiteName, trade, issues, suppliedReportUrl = "") {
  const community = getCurrentCommunity();
  const homesite = getCurrentHomesite();
  const subjectLocation = getSiteFieldValue(homesite, "Address") || homesite?.address || homesiteName;
  const subject = `${subjectLocation} - ${homesiteName} ${trade} Items`;
  const reportUrl = suppliedReportUrl || getAllTradeReportUrl(trade) || getTradeReportUrl(trade);
  const lines = [
    `Project: ${community.name}`,
    `Site: ${homesiteName}`,
    ...getSiteFields(homesite).map((field) => `${field.label}: ${field.value}`),
    `Crew: ${trade}`,
    "",
    "Crew report:",
    reportUrl || "",
    "",
    "Items:"
  ].filter((line) => line !== null);

  issues.forEach((issue, index) => {
    if (index > 0) lines.push("");
    lines.push(`${index + 1}. ${issue.room} - ${issue.issue}`);
    if (issue.notes) lines.push(`Notes: ${issue.notes}`);
    if (issue.photos?.length) lines.push("", `Photos: ${issue.photos.length} saved in the issue report app`);
  });

  lines.push("", "Please review the report and mark items complete when finished.");

  const recipient = state.tradeEmails[trade] || "";
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

async function runPdfButtonAction(button, action) {
  if (button?.dataset.pdfBusy === "true") return;
  const label = button?.querySelector("span");
  const originalLabel = label?.textContent || "";
  if (button) {
    button.dataset.pdfBusy = "true";
    button.disabled = true;
  }
  if (label) label.textContent = "Creating...";

  try {
    await action();
  } catch (error) {
    console.error("PDF action failed.", error);
    alert(error?.message || "The PDF could not be created. Refresh and try again.");
  } finally {
    if (label) label.textContent = originalLabel;
    if (button) {
      button.dataset.pdfBusy = "false";
      button.disabled = false;
    }
  }
}

async function createTradePdf(homesite, trade, issues, downloadOnly = false) {
  const orderedIssues = [...issues]
    .filter((issue) => !issue.completed)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!orderedIssues.length) {
    alert("There are no open items for this crew.");
    return;
  }
  const reportUrl = getTradeReportUrl(trade);

  if (!window.jspdf?.jsPDF) {
    openPrintableTradeReport(homesite, `${trade} Items`, orderedIssues);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await buildProfessionalIssuePdf(doc, {
    title: `${trade} Item Report`,
    homesite,
    issues: orderedIssues,
    reportUrl,
    trade
  });

  await shareOrDownloadPdf(doc, `${homesite.name}-${trade}-items.pdf`, `${homesite.name} ${trade} items`, downloadOnly);
}

async function createHomePdf(downloadOnly = false) {
  const homesite = getCurrentHomesite();
  if (!homesite?.issues.length) {
    alert("Add items to this site before creating a site PDF.");
    return;
  }

  const orderedIssues = [...homesite.issues]
    .filter((issue) => !issue.completed)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!orderedIssues.length) {
    alert("There are no open items for this site.");
    return;
  }
  const longReportUrl = getHomeReportUrl();
  let reportUrl = longReportUrl;

  try {
    await saveCurrentSharedReport();
    reportUrl = await getShortReportUrl(longReportUrl);
  } catch {
    // The QR still points to the report URL; the live site will refresh it on the next save.
  }

  if (!window.jspdf?.jsPDF) {
    openPrintableTradeReport(homesite, "All Items", orderedIssues);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  await buildProfessionalIssuePdf(doc, {
    title: "Crew Punch List",
    homesite,
    issues: orderedIssues,
    reportUrl
  });
  await shareOrDownloadPdf(doc, `${homesite.name}-all-items.pdf`, `${homesite.name} all items`, downloadOnly);
}

async function buildProfessionalIssuePdf(doc, { title, homesite, issues, reportUrl, trade = "" }) {
  if (window.PUNCH_LOGIC_PDF?.buildIssuePdf) {
    return window.PUNCH_LOGIC_PDF.buildIssuePdf(doc, {
      title,
      projectName: getCurrentCommunity()?.name || "-",
      homesite: { ...homesite, fields: getSiteFields(homesite) },
      issues,
      reportUrl,
      trade,
      branding: await getPdfBranding(),
      getPhotoSource
    });
  }
  const page = {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
    margin: 42
  };
  const colors = {
    blue: [18, 94, 168],
    orange: [255, 87, 34],
    green: [24, 135, 95],
    ink: [23, 35, 45],
    muted: [100, 113, 124],
    line: [217, 224, 229],
    soft: [245, 247, 248]
  };
  const openIssues = issues.filter((issue) => !issue.completed);
  const pdfBranding = await getPdfBranding();
  let y = addCompactPdfHeader(doc, page, colors, title, homesite, trade, false, pdfBranding);
  y = addCompactSiteSummary(doc, page, colors, homesite, trade, y);
  y = addCompactTableHeader(doc, page, colors, y + 14);

  for (const [index, issue] of openIssues.entries()) {
    const photoChunks = getCompactIssuePhotoChunks(issue);
    for (const [chunkIndex, photos] of photoChunks.entries()) {
      const continuation = chunkIndex > 0;
      const rowHeight = getCompactIssueRowHeight(doc, issue, photos, continuation);
      if (y + rowHeight > page.height - page.margin - 18) {
        doc.addPage();
        y = addCompactPdfHeader(doc, page, colors, title, homesite, trade, true, pdfBranding);
        y = addCompactTableHeader(doc, page, colors, y + 10);
      }
      y = await addCompactIssueRow(doc, page, colors, issue, index + 1, photos, continuation, y, rowHeight);
    }
  }

  if (!trade) await addReportQrPage(doc, page, reportUrl, colors);
  addPdfPageNumbers(doc, page, colors);
}

function addProfessionalPdfHeader(doc, page, colors, title, homesite, trade) {
  let y = page.margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...colors.ink);
  doc.text(title, page.margin, y);
  y += 10;

  doc.setDrawColor(...colors.teal);
  doc.setLineWidth(1.4);
  doc.line(page.margin, y, page.width - page.margin, y);
  y += 18;

  const details = [
    ["Project", getCurrentCommunity().name],
    ["Site", homesite.name || "-"],
    ...getSiteFields(homesite).map((field) => [field.label, field.value])
  ];
  if (trade) details.push(["Crew", trade]);

  const leftX = page.margin;
  const rightX = page.margin + 265;
  const labelWidth = 82;
  const valueWidth = 170;
  const rowGap = 19;

  doc.setDrawColor(...colors.line);
  doc.setFillColor(...colors.soft);
  const detailsBoxHeight = Math.max(46, Math.ceil(details.length / 2) * rowGap + 16);
  doc.roundedRect(page.margin, y - 8, page.width - page.margin * 2, detailsBoxHeight, 5, 5, "FD");

  details.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? leftX + 12 : rightX;
    const rowY = y + Math.floor(index / 2) * rowGap;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.teal);
    doc.text(label.toUpperCase(), x, rowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...colors.ink);
    doc.text(doc.splitTextToSize(String(value), valueWidth), x + labelWidth, rowY);
  });

  return y + detailsBoxHeight + 14;
}

function getProfessionalIssueRowHeight(doc, page, issue) {
  const notes = issue.notes || "No notes added.";
  const noteLines = doc.splitTextToSize(notes, page.width - page.margin * 2 - 188).length;
  return Math.max(116, 68 + noteLines * 12);
}

async function addProfessionalIssueRow(doc, page, colors, issue, itemNumber, y) {
  const rowHeight = getProfessionalIssueRowHeight(doc, page, issue);
  const rowX = page.margin;
  const rowWidth = page.width - page.margin * 2;
  const photoX = page.width - page.margin - 138;
  const photoY = y + 27;
  const photoWidth = 128;
  const photoHeight = 82;
  const contentX = rowX + 48;
  const contentWidth = photoX - contentX - 18;

  doc.setDrawColor(...colors.line);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rowX, y, rowWidth, rowHeight, 5, 5, "S");

  doc.setFillColor(...colors.teal);
  doc.roundedRect(rowX + 12, y + 14, 24, 24, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(String(itemNumber), rowX + 24, y + 30, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.ink);
  doc.text(doc.splitTextToSize(`${issue.room || "-"} - ${issue.issue || "Issue"}`, contentWidth), contentX, y + 24);

  if (issue.trade) {
    doc.setDrawColor(...colors.teal);
    doc.setTextColor(...colors.teal);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`CREW: ${String(issue.trade).toUpperCase()}`, contentX, y + 45);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  const notes = doc.splitTextToSize(`Notes: ${issue.notes || "No notes added."}`, contentWidth);
  doc.text(notes, contentX, y + 64);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.teal);
  const orderedPhotos = [...(issue.photos || [])].sort((a, b) => Number(Boolean(a.completionProof)) - Number(Boolean(b.completionProof)));
  const firstPhoto = orderedPhotos[0];
  doc.text(firstPhoto?.completionProof ? "COMPLETION PHOTO" : "ITEM PHOTO", photoX, y + 18);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(photoX, photoY, photoWidth, photoHeight, 4, 4, "S");

  if (firstPhoto) {
    try {
      doc.addImage(await getPhotoDataUrl(firstPhoto), "JPEG", photoX + 3, photoY + 3, photoWidth - 6, photoHeight - 6);
      if ((issue.photos || []).length > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...colors.teal);
        doc.text(`+${issue.photos.length - 1} more`, photoX + photoWidth, photoY + photoHeight + 10, { align: "right" });
      }
    } catch {
      addPhotoPlaceholder(doc, colors, photoX, photoY, photoWidth, photoHeight, "Photo unavailable");
    }
  } else {
    addPhotoPlaceholder(doc, colors, photoX, photoY, photoWidth, photoHeight, "No photo");
  }

  return y + rowHeight + 10;
}

function addPhotoPlaceholder(doc, colors, x, y, width, height, text) {
  doc.setFillColor(246, 248, 249);
  doc.roundedRect(x + 3, y + 3, width - 6, height - 6, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colors.muted);
  doc.text(text, x + width / 2, y + height / 2 + 3, { align: "center" });
}

async function getPdfBranding() {
  const branding = window.PUNCH_LOGIC_BRANDING || {};
  if (!branding.removePunchLogicBranding) return { removed: false, logoDataUrl: "" };
  const logoUrl = String(branding.logoUrl || "").trim();
  if (!logoUrl) return { removed: true, logoDataUrl: "" };

  try {
    const response = await fetch(logoUrl, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Client logo unavailable");
    const blob = await response.blob();
    const logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { removed: true, logoDataUrl };
  } catch (error) {
    console.warn("Client logo could not be added to the PDF.", error);
    return { removed: true, logoDataUrl: "" };
  }
}

function addCompactPdfHeader(doc, page, colors, title, homesite, trade, continuation = false, branding = {}) {
  const top = page.margin;
  const logoX = page.margin;
  const logoY = top;

  if (branding.logoDataUrl) {
    const properties = doc.getImageProperties(branding.logoDataUrl);
    const scale = Math.min(105 / properties.width, 28 / properties.height);
    const logoWidth = properties.width * scale;
    const logoHeight = properties.height * scale;
    doc.addImage(branding.logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
  } else if (!branding.removed) {
    doc.setFillColor(...colors.blue);
    doc.roundedRect(logoX, logoY, 28, 28, 4, 4, "F");
    doc.setFillColor(...colors.orange);
    doc.rect(logoX + 21, logoY, 7, 7, "F");
    doc.link(logoX, logoY, 28, 28, { url: "http://punchlogic.app" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text("P", logoX + 14, logoY + 19, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...colors.blue);
    doc.text("punch", logoX + 36, logoY + 18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.orange);
    doc.text("logic", logoX + 75, logoY + 18);
  }

  return logoY + 48;
}

function addCompactSiteSummary(doc, page, colors, homesite, trade, topY) {
  const details = [
    ["Project", getCurrentCommunity()?.name || "-"],
    ["Site", homesite?.name || "-"],
    ...getSiteFields(homesite).map((field) => [field.label, field.value])
  ];
  if (trade) details.push(["Crew", trade]);

  const columnCount = 3;
  const columnWidth = (page.width - page.margin * 2) / columnCount;
  const valueWidth = columnWidth - 24;
  const rows = [];
  for (let index = 0; index < details.length; index += columnCount) {
    const cells = details.slice(index, index + columnCount).map(([label, value]) => ({
      label: String(label || "Field"),
      lines: doc.splitTextToSize(String(value || "-"), valueWidth)
    }));
    rows.push({
      cells,
      height: 18 + Math.max(1, ...cells.map((cell) => cell.lines.length)) * 9
    });
  }

  const boxHeight = rows.reduce((sum, row) => sum + row.height, 0) + 12;
  const boxY = topY;
  doc.setFillColor(...colors.soft);
  doc.setDrawColor(...colors.line);
  doc.roundedRect(page.margin, boxY, page.width - page.margin * 2, boxHeight, 4, 4, "FD");

  let rowTop = topY + 10;
  rows.forEach((row) => {
    row.cells.forEach((cell, columnIndex) => {
      const x = page.margin + 12 + columnIndex * columnWidth;
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

  return boxY + boxHeight;
}

function getCompactPdfColumns(page) {
  const rowLeft = page.margin;
  const rowRight = page.width - page.margin;
  return {
    rowLeft,
    rowRight,
    number: { x: rowLeft + 8, width: 26 },
    crew: { x: rowLeft + 40, width: 65 },
    location: { x: rowLeft + 113, width: 76 },
    item: { x: rowLeft + 197, width: 118 },
    photos: { x: rowLeft + 323, width: rowRight - rowLeft - 331 }
  };
}

function addCompactTableHeader(doc, page, colors, topY) {
  const columns = getCompactPdfColumns(page);
  const height = 24;
  doc.setFillColor(...colors.ink);
  doc.rect(columns.rowLeft, topY, columns.rowRight - columns.rowLeft, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text("#", columns.number.x, topY + 15);
  doc.text("CREW", columns.crew.x, topY + 15);
  doc.text("LOCATION", columns.location.x, topY + 15);
  doc.text("ITEM / NOTES", columns.item.x, topY + 15);
  doc.text("PHOTO", columns.photos.x, topY + 15);
  return topY + height;
}

function getCompactIssuePhotoChunks(issue) {
  const photos = [...(issue.photos || [])]
    .sort((a, b) => Number(Boolean(a.completionProof)) - Number(Boolean(b.completionProof)));
  if (!photos.length) return [[]];

  const chunks = [];
  for (let index = 0; index < photos.length; index += 4) {
    chunks.push(photos.slice(index, index + 4));
  }
  return chunks;
}

function getCompactIssueRowHeight(doc, issue, photos, continuation) {
  const page = { width: doc.internal.pageSize.getWidth(), margin: 42 };
  const columns = getCompactPdfColumns(page);
  const itemText = continuation ? "Additional photos for this item" : issue.issue || "Item";
  const itemLines = doc.splitTextToSize(itemText, columns.item.width).length;
  const noteLines = continuation ? 0 : doc.splitTextToSize(issue.notes || "No notes added.", columns.item.width).length;
  const textHeight = continuation ? 76 : 66 + itemLines * 10 + noteLines * 8;
  const photoCount = Math.max(photos.length, 1);
  const photoHeight = 18 + photoCount * 124;
  return Math.max(116, textHeight, photoHeight);
}

async function addCompactIssueRow(doc, page, colors, issue, itemNumber, photos, continuation, topY, rowHeight) {
  const columns = getCompactPdfColumns(page);
  const rowBottom = topY + rowHeight;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...colors.line);
  doc.rect(columns.rowLeft, topY, columns.rowRight - columns.rowLeft, rowHeight, "FD");

  [columns.crew.x - 8, columns.location.x - 8, columns.item.x - 8, columns.photos.x - 8].forEach((x) => {
    doc.line(x, rowBottom, x, topY);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.blue);
  doc.text(String(itemNumber).padStart(2, "0"), columns.number.x, topY + 20);
  doc.setFontSize(5.4);
  doc.setTextColor(...(issue.tradeCompleted ? colors.green : colors.orange));
  doc.text(issue.tradeCompleted ? ["CREW", "COMPLETED"] : "OPEN", columns.number.x, topY + 37, { lineHeightFactor: 1.05 });
  if (continuation) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...colors.muted);
    doc.text("CONT.", columns.number.x, topY + 58);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(...colors.ink);
  doc.text(doc.splitTextToSize(issue.trade || "-", columns.crew.width), columns.crew.x, topY + 18);

  const location = issue.locationArea || issue.room || "-";
  doc.text(doc.splitTextToSize(location, columns.location.width), columns.location.x, topY + 18);
  if (issue.locationDetail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(...colors.muted);
    doc.text(doc.splitTextToSize(issue.locationDetail, columns.location.width), columns.location.x, topY + 46);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colors.ink);
  const itemText = continuation ? "Additional photos for item " + itemNumber : issue.issue || "Item";
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
    const noteLines = doc.splitTextToSize(issue.notes || "No notes added.", columns.item.width);
    doc.text(noteLines, columns.item.x, notesY + 11, { lineHeightFactor: 1.08 });
    const addedBy = issue.addedByName || issue.createdBy || "-";
    doc.setFontSize(5.7);
    doc.setTextColor(...colors.muted);
    doc.text("Added by " + addedBy, columns.item.x, rowBottom - 20, { maxWidth: columns.item.width });
    doc.text("Date Added " + formatDateAdded(issue.createdAt), columns.item.x, rowBottom - 10, { maxWidth: columns.item.width });
  }

  if (!photos.length) {
    addCompactPhotoPlaceholder(doc, colors, columns.photos.x, topY + 10, columns.photos.width, 110, "No photo");
  } else {
    const photoWidth = columns.photos.width;
    const photoBoxHeight = 110;
    for (const [index, photo] of photos.entries()) {
      const x = columns.photos.x;
      const imageY = topY + 10 + index * 124;
      doc.setFillColor(...colors.soft);
      doc.setDrawColor(...colors.line);
      doc.rect(x, imageY, photoWidth, photoBoxHeight, "FD");
      try {
        const dataUrl = await getPhotoDataUrl(photo);
        addPdfImageContained(doc, dataUrl, photo, x + 2, imageY + 2, photoWidth - 4, photoBoxHeight - 4);
      } catch {
        addCompactPhotoPlaceholder(doc, colors, x, imageY, photoWidth, photoBoxHeight, "Unavailable");
      }
      if (photo.completionProof) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(...colors.ink);
        doc.text("COMPLETION PHOTO", x, imageY + photoBoxHeight + 9, { maxWidth: photoWidth });
      }
    }
  }

  return rowBottom;
}

function addPdfImageContained(doc, dataUrl, photo, x, y, boxWidth, boxHeight) {
  const properties = doc.getImageProperties(dataUrl);
  const imageWidth = Number(properties.width) || boxWidth;
  const imageHeight = Number(properties.height) || boxHeight;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const imageX = x + (boxWidth - width) / 2;
  const imageY = y + (boxHeight - height) / 2;
  const type = (String(photo?.type || "") + " " + String(dataUrl).slice(0, 30)).toLowerCase();
  const format = type.includes("png") ? "PNG" : type.includes("webp") ? "WEBP" : "JPEG";
  doc.addImage(dataUrl, format, imageX, imageY, width, height);
}

function addCompactPhotoPlaceholder(doc, colors, x, y, width, height, text) {
  doc.setFillColor(...colors.soft);
  doc.rect(x + 2, y + 2, width - 4, height - 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...colors.muted);
  doc.text(text, x + width / 2, y + height / 2 + 2, { align: "center" });
}

async function addReportQrPage(doc, page, reportUrl, colors = { teal: [30, 77, 96], ink: [32, 33, 36], muted: [94, 103, 109] }) {
  if (!reportUrl) return;
  const accentColor = colors.teal || colors.blue || [18, 94, 168];

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...colors.ink);
  doc.text("View this report in browser", page.width / 2, 120, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...colors.muted);
  doc.text("Scan this QR code.", page.width / 2, 145, { align: "center" });
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(1.2);
  doc.line(page.width / 2 - 130, 164, page.width / 2 + 130, 164);

  try {
    const qrDataUrl = await getQrCodeDataUrl(reportUrl);
    doc.addImage(qrDataUrl, "PNG", page.width / 2 - 105, 190, 210, 210);
  } catch {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(reportUrl, page.width - page.margin * 2);
    doc.text(lines, page.margin, 210);
  }
}

function addPdfPageNumbers(doc, page, colors) {
  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    doc.text(`Page ${pageNumber} of ${totalPages}`, page.width - page.margin, page.height - 24, { align: "right" });
  }
}

async function getQrCodeDataUrl(value) {
  if (!window.QRCode?.toDataURL) throw new Error("QR unavailable");
  return new Promise((resolve, reject) => {
    window.QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: { dark: "#17232dff", light: "#ffffffff" }
    }, (error, dataUrl) => {
      if (error) reject(error);
      else resolve(dataUrl);
    });
  });
}

async function shareOrDownloadPdf(doc, fileName, title, downloadOnly = false) {
  const safeFileName = fileName.replace(/[^a-z0-9.-]+/gi, "-");
  if (downloadOnly) {
    doc.save(safeFileName);
    return;
  }

  const pdfBlob = doc.output("blob");
  if (typeof File === "function" && typeof navigator.share === "function") {
    const file = new File([pdfBlob], safeFileName, { type: "application/pdf" });
    let canShareFile = true;
    try {
      canShareFile = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
    } catch {
      canShareFile = false;
    }

    if (canShareFile) {
      try {
        await navigator.share({
          files: [file],
          title,
          text: title
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
        console.warn("The share sheet was unavailable; downloading the PDF instead.", error);
      }
    }
  }

  doc.save(safeFileName);
}

async function getPhotoDataUrl(photo) {
  if (photo.dataUrl) return photo.dataUrl;

  const response = await fetch(getPhotoSource(photo), {
    credentials: "same-origin"
  });
  if (!response.ok) throw new Error("Photo unavailable");

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function openPrintableTradeReport(homesite, trade, issues) {
  const community = getCurrentCommunity();
  const report = window.open("", "_blank");
  if (!report) {
    alert("Pop-up blocking prevented the PDF report from opening.");
    return;
  }

  const siteDetailMarkup = getSiteFields(homesite)
    .map((field) => `<div><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(field.value)}</div>`)
    .join("");

  const issueMarkup = issues
    .map((issue, index) => {
      const photos = (issue.photos || [])
        .sort((a, b) => Number(Boolean(a.completionProof)) - Number(Boolean(b.completionProof)))
        .map((photo) => {
          const photoLabel = photo.completionProof ? "Completion Photo" : "Item Photo";
          const caption = photo.completionProof ? `<figcaption>${photoLabel}</figcaption>` : "";
          return `<figure><img src="${getPhotoSource(photo)}" alt="${photoLabel}" />${caption}</figure>`;
        })
        .join("");

      return `
        <section class="issue">
          <div class="issue-heading">
            <h2>${index + 1}. ${escapeHtml(issue.room)} - ${escapeHtml(issue.issue)}</h2>
            <strong class="status ${issue.tradeCompleted ? "trade-completed" : "open"}">${issue.tradeCompleted ? "Crew Completed" : "Open"}</strong>
          </div>
          <div><strong>Crew:</strong> ${escapeHtml(issue.trade || "-")}</div>
          <div><strong>Date Added:</strong> ${escapeHtml(formatDateAdded(issue.createdAt))}</div>
          <p>${escapeHtml(issue.notes || "No notes added.")}</p>
          <div class="photos">${photos}</div>
        </section>
      `;
    })
    .join("");

  report.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(homesite.name)} ${escapeHtml(trade)} Report</title>
        <style>
          body { color: #202124; font-family: Arial, sans-serif; margin: 36px; }
          h1 { color: #1f6f64; font-size: 24px; margin: 0 0 16px; }
          h2 { font-size: 16px; margin: 0 0 8px; }
          p { line-height: 1.4; margin: 0 0 10px; }
          .meta { border: 1px solid #ded7cd; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
          .meta div { margin-bottom: 5px; }
          .issue { border-top: 2px solid #1f6f64; padding-top: 14px; margin-top: 18px; break-inside: avoid; }
          .issue-heading { align-items: start; display: flex; gap: 14px; justify-content: space-between; }
          .status { font-size: 11px; text-transform: uppercase; white-space: nowrap; }
          .status.open { color: #ff5722; }
          .status.trade-completed { color: #18875f; }
          .photos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
          .photos figure { margin: 0; }
          .photos img { border: 1px solid #ded7cd; border-radius: 6px; display: block; height: auto; max-width: 100%; }
          .photos figcaption { color: #5f6368; font-size: 12px; font-weight: 700; margin-top: 5px; text-align: center; }
          @media print { body { margin: 24px; } }
        </style>
      </head>
      <body>
        <h1>Punch Schedule</h1>
        <div class="meta">
          <div><strong>Project:</strong> ${escapeHtml(community.name)}</div>
          <div><strong>Site:</strong> ${escapeHtml(homesite.name)}</div>
          ${siteDetailMarkup}
          <div><strong>Crew:</strong> ${escapeHtml(trade)}</div>
        </div>
        ${issueMarkup}
        <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
      </body>
    </html>
  `);
  report.document.close();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function preparePhoto(file) {
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
      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
