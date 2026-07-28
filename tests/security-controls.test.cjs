const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const manageUsers = read("netlify/functions/manage-users.js");
assert.doesNotMatch(manageUsers, /listAuthUsers/, "User lists must not expose every Supabase Auth user");
assert.match(manageUsers, /rest\/v1\/profiles\?organization_id=eq\./, "User lists must start from organization profiles");
assert.match(manageUsers, /revokeSessions/);
assert.match(manageUsers, /setActive/);
assert.match(manageUsers, /getProjectSiteIds/, "Updating a user must expand selected projects to their sites");
assert.match(manageUsers, /assignSites\(userId, \[\.\.\.allowedSiteIds, \.\.\.projectSiteIds\]\)/, "Updated users must receive project site assignments");
const createUser = read("netlify/functions/create-user.js");
assert.match(createUser, /getProjectSiteIds/, "Creating a user must expand selected projects to their sites");
assert.match(createUser, /assignSites\(authUser\.id, \[\.\.\.allowedSiteIds, \.\.\.projectSiteIds\]\)/, "New users must receive project site assignments");

const adminDashboard = read("admin.js");
assert.equal((adminDashboard.match(/await loadDashboard\(\);/g) || []).length, 3, "Full dashboard loads must remain limited to authentication and initial boot");
assert.match(adminDashboard, /loadDashboard\(\{ silent: true, rowsOnly: true \}\)/, "Dashboard actions must refresh rows without rebuilding the page");
assert.match(adminDashboard, /data-foreman-checklist/, "Project and site foreman assignments must use clear checkbox lists");
assert.match(adminDashboard, /getSelectedForemanIds/, "Leaving every foreman checkbox clear must save as no foreman");
assert.match(adminDashboard, /id="adminPhotoViewer"/, "Dashboard item photos need an in-app full-size viewer");
assert.match(adminDashboard, /data-site-project-toggle/, "User site assignment checkboxes must be grouped by project");
assert.match(adminDashboard, /bindProjectSiteAssignmentControls/, "Selecting a project must select its sites in the user form");
assert.match(adminDashboard, /Crew Complete/, "Dashboard cards must distinguish crew completion from office completion");
assert.match(adminDashboard, /data-item-reject-crew/, "Dashboard users must be able to reject an incorrect crew completion");
assert.match(adminDashboard, /getCompletedBusinessWindow/, "Completed items must load in bounded business-day windows");
assert.match(adminDashboard, /buildArchiveRows/, "Archived projects and sites must have a dedicated dashboard view");

const fieldApp = read("app.js");
assert.match(fieldApp, /async function rejectCrewCompletion/, "Field App users must be able to reject an incorrect crew completion");
assert.match(fieldApp, /selectSupabaseProjectsForApp/, "Field App hydration must exclude archived projects");

const archiveMigration = read("supabase/migrations/033_archives_and_dashboard_reports.sql");
assert.match(archiveMigration, /add column if not exists archived_at timestamptz/i);
assert.match(archiveMigration, /'all_items'/, "Dashboard all-items reports need a dedicated read-only token kind");

for (const relativePath of ["netlify/functions/shared-report.js", "netlify/functions/all-report.js"]) {
  const source = read(relativePath);
  assert.match(source, /validateReportToken/, `${relativePath} must validate report access tokens`);
  assert.match(source, /checkRateLimit/, `${relativePath} must rate limit public access`);
  assert.match(source, /registerReportTokens/, `${relativePath} must register hashed report tokens`);
  assert.match(source, /revokeReportScope/, `${relativePath} must revoke every token in the report scope`);
  assert.match(source, /getUserAccessibleSiteIds/, `${relativePath} must validate creator site access`);
  assert.match(source, /getOrganizationPunchItem/, `${relativePath} must bind updates to an authorized report item`);
}

const reportAccessSource = read("netlify/functions/_report_access.js");
assert.match(reportAccessSource, /async function revokeReportScope/);
assert.match(reportAccessSource, /report_kind/);
assert.match(reportAccessSource, /trade_name/);
assert.match(reportAccessSource, /report_short_links/, "Short report mappings must stay in server-only storage");
assert.match(reportAccessSource, /createHmac\("sha256"/, "Short report codes must be derived with a server-side secret");
assert.match(reportAccessSource, /async function upsertShortReportToken/, "Recreated short links must reactivate their matching access token");
assert.match(reportAccessSource, /resolution=merge-duplicates,return=minimal/, "Recreated short-code access must replace revoked token state");
assert.match(reportAccessSource, /JSON\.stringify\(\{ \.\.\.row, revoked_at: null \}\)/, "Recreated short-code access must explicitly clear revocation");

const reportLinkFunction = read("netlify/functions/report-link.js");
assert.match(reportLinkFunction, /getRequestContext/, "Creating a short report link must require a signed-in user");
assert.match(reportLinkFunction, /validateReportToken/, "Short links must derive from an authorized report token");
assert.match(reportLinkFunction, /resolveShortReportLink/, "Short links must be resolved server-side");
assert.match(reportLinkFunction, /checkRateLimit/, "Short link creation and resolution must be rate limited");
assert.match(reportLinkFunction, /statusCode:\s*302/, "Short links must redirect into the existing report pages");
const reportLinkModule = require(path.join(root, "netlify/functions/report-link.js"));
assert.equal(reportLinkModule.getShortCode({ queryStringParameters: { code: "Abcd_123-Wxy" } }), "Abcd_123-Wxy", "Short links must accept an explicit query code");
assert.equal(reportLinkModule.getShortCode({ path: "/r/Abcd_123-Wxy" }), "Abcd_123-Wxy", "Short links must recover the code from Netlify's original path");
assert.equal(reportLinkModule.getShortCode({ rawUrl: "https://demo.punchlogic.app/r/Abcd_123-Wxy" }), "Abcd_123-Wxy", "Short links must recover the code from Netlify's raw URL");
const projectShortTarget = require(path.join(root, "netlify/functions/report-link.js")).parseReportTarget(
  "https://demo.punchlogic.app/all-trade-report.html?r=project-open-items%3Aproject-123&trade=legacy&access=token-1"
);
assert.equal(projectShortTarget.reportId, "project-open-items:project-123", "Short links must preserve project report scope");
const allItemsShortTarget = reportLinkModule.parseReportTarget(
  "https://demo.punchlogic.app/all-trade-report.html?r=all-open-items&access=token-2"
);
assert.equal(allItemsShortTarget.reportKind, "all_items", "All-items dashboard reports must use their own token scope");

const { createAccessBundle, createShortReportCode } = require(path.join(root, "netlify/functions/_report_access.js"));
const shortCode = createShortReportCode("example-report-token", "test-only-secret");
assert.match(shortCode, /^[A-Za-z0-9_-]{12}$/, "Short report codes must be compact and URL safe");
assert.equal(shortCode, createShortReportCode("example-report-token", "test-only-secret"), "Short codes must be stable for the same report token");

const siteReport = read("home-report.js");
assert.doesNotMatch(siteReport, /createCompletionPhotoField/);
assert.doesNotMatch(siteReport, /action:\s*"addCompletionPhoto"/);
assert.match(read("netlify/functions/shared-report.js"), /report\.reportKind !== "trade"/, "Site-wide reports must not accept completion photo uploads");

const accessBundle = createAccessBundle();
assert.ok(accessBundle.read.length >= 40 && accessBundle.update.length >= 40, "Report tokens must have strong entropy");
assert.notEqual(accessBundle.read, accessBundle.update, "Read and update report tokens must be separate");
assert.ok(Date.parse(accessBundle.expiresAt) > Date.now(), "Report tokens must expire in the future");

for (const relativePath of ["index.html", "admin.html"]) {
  const source = read(relativePath);
  assert.match(source, /forgotPasswordButton/i);
  assert.match(source, /passwordResetScreen/i);
  assert.match(source, /saveNewPasswordButton/i);
}

const netlify = read("netlify.toml");
assert.match(netlify, /Content-Security-Policy/);
assert.match(netlify, /Strict-Transport-Security/);
assert.match(netlify, /X-Content-Type-Options/);
assert.match(netlify, /Permissions-Policy/);
assert.match(netlify, /img-src[^\n]+https:\/\/\*\.supabase\.co/, "Signed private photo URLs must be allowed by CSP");
assert.match(netlify, /for = "\/supabase-config\.js"[\s\S]+?Cache-Control = "no-store, max-age=0, must-revalidate"/, "Supabase client configuration must never be served stale");
assert.match(netlify, /from = "\/r\/\*"[\s\S]+?report-link\?code=:splat/, "Netlify must pass short report codes through the splat route");
for (const relativePath of ["index.html", "admin.html", "trade-report.html", "all-trade-report.html"]) {
  assert.match(read(relativePath), /supabase-config\.js\?v=3/, `${relativePath} must request the current Supabase config version`);
}

const photoFunction = read("netlify/functions/photo.js");
assert.match(photoFunction, /authorizePhotoRead/, "Photo reads must be authorized");
assert.match(photoFunction, /validateReportToken/, "Report photos must validate report access tokens");
assert.match(photoFunction, /signedInUserCanReadItem/, "Signed-in photo reads must respect item RLS");
assert.doesNotMatch(photoFunction, /max-age=31536000/, "Private photos must not remain cached for a year");
assert.match(photoFunction, /Cache-Control": "private, no-store"/, "Private photo proxy responses must not be cached");

const uploadSecurity = read("upload-security.js");
assert.match(uploadSecurity, /validateDocument/);
assert.match(uploadSecurity, /validateSourcePhoto/);
assert.match(read("netlify/functions/_upload_security.js"), /validatePhotoBuffer/);

const mainApp = read("app.js");
assert.doesNotMatch(mainApp, /field\.innerHTML\s*=\s*`<span>\$\{trade\}/, "Crew names must not be inserted as HTML");
assert.match(mainApp, /createSignedUrls\(paths, 900\)/, "The Field App must use short-lived signed photo URLs");
assert.match(mainApp, /siteIds:\s*scope\.siteIds/, "Crew reports must carry their selected project site scope");
assert.match(read("admin.js"), /createSignedUrls\(paths, 900\)/, "The dashboard must use short-lived signed photo URLs");
assert.match(read("index.html"), /vendor\/qrcode\.js/, "Site PDFs need the local QR generator");
assert.ok(fs.existsSync(path.join(root, "vendor/qrcode.js")), "The QR generator must be shipped with the app");
assert.match(mainApp, /if \(!trade\) await addReportQrPage\(doc, page, reportUrl, colors\)/, "Site PDFs must finish with the live report QR page");
assert.match(mainApp, /const accentColor = colors\.teal \|\| colors\.blue \|\| \[18, 94, 168\]/, "The QR page must support both legacy and current PDF color palettes");
assert.match(mainApp, /runPdfButtonAction\(event\.currentTarget, \(\) => createHomePdf\(false\)\)/, "Share PDF must not receive the browser click event as its download flag");
assert.match(mainApp, /await shareOrDownloadPdf\(doc, `\$\{homesite\.name\}-all-items\.pdf`/, "Site PDF actions must wait for sharing or downloading to finish");
assert.match(mainApp, /if \(downloadOnly\) \{\s*doc\.save\(safeFileName\)/, "PDF downloads must use jsPDF's browser-safe save path");
assert.match(mainApp, /if \(error\?\.name === "AbortError"\) return;/, "Cancelling the native share sheet must not trigger a download");
assert.match(mainApp, /window\.QRCode\.toDataURL/, "QR codes must be generated in the browser");
assert.doesNotMatch(mainApp, /api\.qrserver\.com/, "Report access tokens must not be sent to an external QR service");
assert.match(mainApp, /async function getShortReportUrl/, "The Field App must request compact report links");
assert.match(mainApp, /reportUrl = await getShortReportUrl\(longReportUrl\)/, "Site PDF QR codes must prefer the compact report link");
assert.match(mainApp, /buildMailtoLink\(homesite\.name, trade, issues, reportUrl\)/, "Crew email messages must use the compact report link");
for (const relativePath of ["index.html", "admin.html", "trade-report.html", "all-trade-report.html"]) {
  const html = read(relativePath);
  assert.doesNotMatch(html, /@supabase\/supabase-js@2["<]/, `${relativePath} must pin the Supabase browser client`);
  assert.doesNotMatch(html, /lucide@latest/, `${relativePath} must not use a mutable Lucide URL`);
  for (const tag of html.match(/<script[^>]+https:\/\/[^>]+>/g) || []) {
    assert.match(tag, /integrity="sha384-/, `${relativePath} external scripts must use Subresource Integrity`);
    assert.match(tag, /crossorigin="anonymous"/, `${relativePath} integrity-protected scripts must use anonymous CORS`);
  }
}
assert.match(mainApp, /reportKind:\s*trade \? "trade" : "site"/, "Site report revocation must identify its complete report scope");
assert.match(mainApp, /reportKind:\s*"all_trade"/, "All-sites report revocation must identify its complete report scope");
assert.match(mainApp, /getAllTradeReportKey\(trade, scope\.reportId\)/, "Crew report revocation must include the scoped legacy token");
assert.match(mainApp, /const projectOpenReportPrefix = "project-open-items:"/, "Crew reports must support project-specific identities");
assert.match(mainApp, /allOption\.textContent = "All Projects"/, "Builder and trade clients must offer an explicit All Projects scope");
assert.match(mainApp, /openButton\.textContent = `\$\{trade\} - \$\{scope\.projectName \|\| "All Projects"\}`/, "Crew report buttons must name their project scope");
assert.match(mainApp, /getCommunityReportScopeId\(row\.community\) === scope\.projectId/, "Crew report links must only include crews from the selected project");
assert.match(mainApp, /url\.searchParams\.set\("r", scope\.reportId\)/, "Crew report URLs must carry their project report identity");
const allReportLinksBlock = mainApp.slice(mainApp.indexOf("function renderAllReportLinks()"), mainApp.indexOf("async function recreateAllTradeReportAccess"));
assert.match(allReportLinksBlock, /createActionIcon\("copy"/, "Items Reports must use the copy icon");
assert.match(allReportLinksBlock, /createReportTextAction\("Read Only"/, "Items Reports must show the Read Only text action");
assert.match(allReportLinksBlock, /createActionIcon\("refresh"/, "Items Reports must use the refresh icon to recreate links");
assert.doesNotMatch(allReportLinksBlock, /Refresh Link|Delete Link/, "Items Reports must use one Recreate Link action");
assert.match(mainApp, /if \(!response\.ok\) \{\s*const result = await response\.json\(\)\.catch/, "Report saves must surface the server error instead of opening a missing report");
assert.match(mainApp, /activeSessionCheckInFlight/, "Session checks must not overlap");
assert.match(mainApp, /sessionValid, error: sessionError/, "Session checks must inspect Supabase RPC errors");
assert.match(mainApp, /sessionError \|\| sessionValid !== false/, "Only an explicit invalid result may start a logout");
assert.match(mainApp, /confirmationError \|\| confirmedInvalid !== false/, "An invalid session must be confirmed before logout");
assert.match(mainApp, /\.rpc\("create_project_for_current_user"/, "Project creation must atomically preserve creator access");
assert.match(adminDashboard, /\.rpc\("create_project_for_current_user"/, "Dashboard project creation and site imports must use the scoped project RPC");
assert.match(mainApp, /\.rpc\("create_site_for_current_user"/, "Field App site creation must use the scoped site RPC");
assert.match(adminDashboard, /\.rpc\("create_site_for_current_user"/, "Dashboard site creation and imports must use the scoped site RPC");
assert.match(mainApp, /async function saveInlineSiteForm\(\)[\s\S]+?markLocalActivity\(\);[\s\S]+?ensureSupabaseSite/, "Manual site saves must block stale cloud responses before creating the site");

for (const relativePath of ["home-report.js", "trade-report.js", "all-trade-report.js"]) {
  const source = read(relativePath);
  assert.match(source, /reportAccessToken/, `${relativePath} photo requests must carry report access`);
  assert.match(source, /reportKind/, `${relativePath} photo requests must identify report scope`);
  const deniedIndex = source.indexOf("response.status === 401 || response.status === 403");
  const fallbackIndex = source.indexOf("report = loadLocalReport()", deniedIndex);
  assert.ok(deniedIndex >= 0, `${relativePath} must explicitly reject revoked links`);
  assert.ok(fallbackIndex > deniedIndex, `${relativePath} must reject revoked links before considering local fallback`);
}

const allTradeReport = read("all-trade-report.js");
assert.match(allTradeReport, /const reportId = params\.get\("r"\) \|\| "all-open-items"/, "Older all-project links must remain compatible");
assert.match(allTradeReport, /all-report\?id=\$\{encodeURIComponent\(reportId\)\}/, "Crew report loads must request their exact project scope");
assert.match(read("netlify/functions/all-report.js"), /\["all_trade", "all_items"\]\.includes\(request\.reportKind\)/, "Recreating project reports must revoke both crew and all-item report scopes");

const dashboardReports = read("admin.js");
for (const action of ["shareSiteReportButton", "refreshSiteReportButton", "shareAllItemsReportButton", "refreshAllItemsReportButton"]) {
  assert.match(dashboardReports, new RegExp(action), `Dashboard reports must include ${action}`);
}
assert.match(dashboardReports, /navigator\.share/);
assert.match(dashboardReports, /action:\s*"revokeReportAccess"/);

assert.match(dashboardReports, /async function selectArchivedItems\(siteIds = \[\]\)/, "Archive must load items belonging to archived sites and projects");
assert.match(dashboardReports, /buildArchiveRows\(projects, sites, archivedPunchItems, itemPhotos\)/, "Archive must include item cards and their photos");
assert.match(dashboardReports, /\["Project", "Projects"\], \["Site", "Sites"\], \["Item", "Items"\]/, "Archive type filter must include items");
assert.match(dashboardReports, /data-item-shared-note-save/, "Dashboard item cards must expose an inline shared-note save action");
assert.match(dashboardReports, /class="admin-item-original-note"[\s\S]+?<p>\$\{escapeHtml\(row\.notes/, "Original item notes must remain visible as read-only text");
assert.doesNotMatch(dashboardReports, /textarea data-item-note/, "Original item notes must not be editable from the dashboard");
assert.match(dashboardReports, /shared_note_source:\s*"admin_dashboard"/, "Dashboard shared notes must identify the office source");
assert.match(dashboardReports, /async function saveItemSharedNote\(id, button\)[\s\S]+?updateById\("punch_items", id,[\s\S]+?candidate\.comment = sharedNote;/, "Shared-note saves must persist and update dashboard rows without a full reload");
assert.match(allTradeReport, /action: "setTradeCompleted", reportId/, "Completion updates must retain project scope");
assert.match(allTradeReport, /action: "updateIssueNote", reportId/, "Crew notes must retain project scope");
assert.match(allTradeReport, /action: "addCompletionPhoto", reportId/, "Completion photos must retain project scope");

const allReportFunction = read("netlify/functions/all-report.js");
assert.match(allReportFunction, /normalizeAllReportId/, "The all-items endpoint must validate report identities");
assert.match(allReportFunction, /projectContainsSites/, "Project reports must reject sites outside the selected project");
assert.match(allReportFunction, /getAllReportStoreKey\(reportId\)/, "Project reports must use separate server storage");
assert.doesNotMatch(allReportFunction, /reportStore\.(?:get|setJSON)\("report-all-open-items"/, "Project report actions must not fall back to global report storage");
assert.match(read("netlify/functions/photo.js"), /reportStore\.get\(`report-\$\{reportId\}`/, "Report photo access must retain project scope");

for (const migration of [
  "supabase/migrations/014_auth_access_controls.sql",
  "supabase/migrations/015_report_access_tokens.sql",
  "supabase/migrations/016_upload_security.sql",
  "supabase/migrations/022_multitenant_security_hardening.sql",
  "supabase/migrations/023_security_definer_api_isolation.sql",
  "supabase/migrations/024_server_only_table_policies.sql",
  "supabase/migrations/025_performance_advisor_remediation.sql",
  "supabase/migrations/027_admin_project_site_updates.sql",
  "supabase/migrations/028_admin_site_document_access.sql",
  "supabase/migrations/029_project_creation_access_repair.sql",
  "supabase/migrations/030_project_creation_persistence.sql",
  "supabase/migrations/031_site_creation_persistence.sql",
  "supabase/migrations/032_short_report_links.sql"
]) {
  assert.ok(fs.existsSync(path.join(root, migration)), `Missing ${migration}`);
}

const tenantHardening = read("supabase/migrations/022_multitenant_security_hardening.sql");
assert.match(tenantHardening, /project\.organization_id = public\.current_organization_id\(\)/);
assert.match(tenantHardening, /site\.organization_id = public\.current_organization_id\(\)/);
assert.match(tenantHardening, /drop policy if exists "projects manage"/);
assert.match(tenantHardening, /organization_id = public\.current_organization_id\(\)/);
assert.match(tenantHardening, /to authenticated/);

const projectCreationRepair = read("supabase/migrations/029_project_creation_access_repair.sql");
assert.match(projectCreationRepair, /public\.session_is_valid\(\)/);
assert.match(projectCreationRepair, /organization_id = public\.current_organization_id\(\)/);
assert.match(projectCreationRepair, /profile\.id = auth\.uid\(\)/);
assert.match(projectCreationRepair, /profile\.organization_id = projects\.organization_id/);

const projectCreationPersistence = read("supabase/migrations/030_project_creation_persistence.sql");
assert.match(projectCreationPersistence, /create or replace function public\.create_project_for_current_user\(project_name text\)/);
assert.match(projectCreationPersistence, /insert into public\.project_user_access \(project_id, user_id\)/);
assert.match(projectCreationPersistence, /create trigger assign_project_creator_after_insert/);
assert.match(projectCreationPersistence, /grant execute on function public\.create_project_for_current_user\(text\) to authenticated/);
assert.match(projectCreationPersistence, /revoke all on function public\.create_project_for_current_user\(text\) from anon/);

const siteCreationPersistence = read("supabase/migrations/031_site_creation_persistence.sql");
assert.match(siteCreationPersistence, /create or replace function public\.create_site_for_current_user/);
assert.match(siteCreationPersistence, /project\.organization_id = creator_organization_id/);
assert.match(siteCreationPersistence, /project_access\.user_id = auth\.uid\(\)/);
assert.match(siteCreationPersistence, /grant execute on function public\.create_site_for_current_user\(uuid, text, jsonb\) to authenticated/);
assert.match(siteCreationPersistence, /revoke all on function public\.create_site_for_current_user\(uuid, text, jsonb\) from anon/);

const shortReportLinks = read("supabase/migrations/032_short_report_links.sql");
assert.match(shortReportLinks, /create table if not exists public\.report_short_links/);
assert.match(shortReportLinks, /code_hash text not null unique/);
assert.match(shortReportLinks, /alter table public\.report_short_links enable row level security/);
assert.match(shortReportLinks, /to anon, authenticated[\s\S]+?using \(false\)[\s\S]+?with check \(false\)/);
assert.doesNotMatch(shortReportLinks, /\bshort_code\b/, "Usable short report codes must never be stored in Supabase");

const definerIsolation = read("supabase/migrations/023_security_definer_api_isolation.sql");
assert.match(definerIsolation, /alter function public\.session_is_valid\(\) set schema private/);
assert.match(definerIsolation, /alter function public\.apply_punch_item_patch[^;]+set schema private/);
assert.match(definerIsolation, /alter function public\.apply_site_document_patch[^;]+set schema private/);
assert.match(definerIsolation, /create or replace function public\.session_is_valid\(\)[\s\S]+security invoker/);
assert.match(definerIsolation, /revoke all on function public\.session_is_valid\(\) from public, anon/);
assert.match(definerIsolation, /grant execute on function public\.session_is_valid\(\) to authenticated, service_role/);

const serverOnlyPolicies = read("supabase/migrations/024_server_only_table_policies.sql");
for (const table of ["report_access_tokens", "server_rate_limits", "server_state", "sync_mutations"]) {
  assert.match(serverOnlyPolicies, new RegExp(`on public\\.${table}[\\s\\S]+?to anon, authenticated[\\s\\S]+?using \\(false\\)[\\s\\S]+?with check \\(false\\)`));
}

const performanceRemediation = read("supabase/migrations/025_performance_advisor_remediation.sql");
for (const index of [
  "contacts_organization_id_idx",
  "item_photos_item_id_idx",
  "item_photos_organization_id_idx",
  "item_settings_trade_id_idx",
  "profiles_organization_id_idx",
  "project_user_access_user_id_idx",
  "punch_items_created_by_idx",
  "punch_items_organization_id_idx",
  "punch_items_site_id_idx",
  "report_access_tokens_created_by_idx",
  "site_documents_site_id_idx",
  "site_documents_uploaded_by_idx",
  "sites_organization_id_idx",
  "sites_project_id_idx",
  "user_site_access_site_id_idx"
]) {
  assert.match(performanceRemediation, new RegExp(`create index if not exists ${index}`));
}
assert.match(performanceRemediation, /uploaded_by = \(select auth\.uid\(\)\)/);
assert.doesNotMatch(performanceRemediation, /for all\s+to authenticated/i);
for (const retiredPolicy of [
  "admins manage profiles",
  "admins manage access",
  "project access manage",
  "settings manage trades",
  "locations manage",
  "items manage",
  "contacts manage",
  "photos manage assigned site"
]) {
  assert.match(performanceRemediation, new RegExp(`drop policy if exists "${retiredPolicy}"`));
}

for (const retiredPath of [
  "create-password-hash.js",
  "netlify/functions/auth-login.js",
  "netlify/functions/auth-logout.js",
  "netlify/functions/auth-session.js"
]) {
  assert.equal(fs.existsSync(path.join(root, retiredPath)), false, `${retiredPath} must remain retired`);
}

console.log("Security controls regression tests passed.");
