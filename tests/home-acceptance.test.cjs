const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const config = fs.readFileSync(path.join(root, "supabase-config.js"), "utf8");
const acceptanceDraftFunction = fs.readFileSync(
  path.join(root, "netlify", "functions", "home-acceptance-drafts.js"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "035_home_acceptance_signatures.sql"),
  "utf8"
);

test("select home leads the active-home workflow navigation", () => {
  const selectHomeTab = html.indexOf('data-page-target="selectHomePage"');
  const itemsTab = html.indexOf('data-page-target="punchListPage"');
  const nhoTab = html.indexOf('data-page-target="nhoSignoffPage"');
  const signoffTab = html.indexOf('data-page-target="homeownerSignoffPage"');
  const archiveTab = html.indexOf('data-page-target="homeArchivePage"');
  assert.ok(selectHomeTab > -1 && itemsTab > selectHomeTab && nhoTab > itemsTab && signoffTab > nhoTab && archiveTab > signoffTab);
  const selectHomePage = html.slice(html.indexOf('id="selectHomePage"'), html.indexOf('id="punchListPage"'));
  assert.doesNotMatch(selectHomePage, /Active homes/);
  assert.doesNotMatch(selectHomePage, /<h1>Select home<\/h1>/);
  assert.doesNotMatch(html, /data-page-target="contactsPage"/);
  assert.doesNotMatch(html, /data-page-target="homesiteInfoPage"/);
  assert.match(html, /id="activeHomeList"/);
  assert.match(html, /id="startNewHomeButton"/);
  assert.match(html, /id="archivedHomeList"/);
  assert.match(html, /id="homeCommunityInput"/);
  assert.match(html, /id="homeAddressInput"/);
  assert.match(html, /id="homebuyer1NameInput"/);
  assert.match(html, /id="homebuyer2EmailInput"/);
  assert.match(html, /data-page-target="homeownerSignoffPage"[\s\S]*?<path d="M12 20h9"><\/path>[\s\S]*?<span class="stacked-tab-label">Final<br \/>Signoff<\/span>/);
  assert.match(html, /data-page-target="nhoSignoffPage"[\s\S]*?class="nho-tab-icon"[^>]*>NHO<\/span>[\s\S]*?<span class="stacked-tab-label">NHO<br \/>Signoff<\/span>/);
  assert.match(html, /<h1>Final Signoff<\/h1>/);
  assert.match(css, /\.bottom-nav\s*\{[^}]*grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.bottom-tab\s*\{[^}]*grid-template-rows:\s*22px 20px[^}]*min-height:\s*56px/s);
  assert.match(css, /\.bottom-tab \.stacked-tab-label\s*\{[^}]*white-space:\s*normal/s);
  assert.match(css, /\.home-details-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.homeowner-details-panel\s*\{[^}]*padding:\s*clamp\(20px,\s*5vw,\s*30px\)/s);
  assert.match(css, /\.home-details-grid input\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.select-home-actions\s*\{[^}]*padding-inline:\s*10px/s);
  assert.match(css, /#fieldNotificationButton\s*\{[^}]*display:\s*none/s);
});

test("home details save into selectable records and signed homes can be archived", () => {
  assert.match(app, /function startNewHome\(\)/);
  assert.match(app, /function renderActiveHomeList\(\)/);
  assert.match(app, /renderActiveHomeList\(\);[\s\S]*?renderArchivedHomeList\(\);[\s\S]*?renderHomeownerSignoff\(\);/s);
  assert.match(app, /async function archiveAcceptedHome\(\)/);
  assert.match(app, /\.update\(\{ archived_at: archivedAt \}\)/);
  assert.match(app, /function restoreArchivedHome\(/);
  assert.match(app, /filter\(\(homesite\) => !isHomeArchived\(homesite\)\)/);
  assert.match(app, /label:\s*"NHO PDF"[\s\S]*?action:\s*"nho-pdf"/s);
  assert.match(app, /label:\s*"Final PDF"[\s\S]*?action:\s*"final-pdf"/s);
  assert.match(app, /async function viewArchivedHomePdf\(/);
  assert.match(app, /createNhoSignoffPdf\(record,\s*\{\s*mode:\s*"view",\s*viewer\s*\}\)/);
  assert.match(app, /createSignedAcceptancePdf\(record,\s*\{\s*mode:\s*"view",\s*viewer\s*\}\)/);
  assert.match(app, /function openGeneratedPdfForViewing\(/);
});

test("photos require a selected Supabase-backed home before upload", () => {
  assert.match(app, /async function handlePhotoSelection\(event\)[\s\S]*?homesite\.source !== "Supabase"/);
  assert.match(app, /Select a synced home on the Select Home tab before adding photos\./);
  assert.match(app, /selectedPhotos\.length && fieldDriveSupabase && homesite\.source !== "Supabase"/);
  assert.match(app, /newPhotos\.length && fieldDriveSupabase && !isSupabaseIssue/);
});

test("signature tool supports touch drawing, acceptance, and signed PDF generation", () => {
  const itemsPage = html.slice(html.indexOf('id="punchListPage"'), html.indexOf('id="nhoSignoffPage"'));
  const signoffPage = html.slice(html.indexOf('id="homeownerSignoffPage"'), html.indexOf('id="homeArchivePage"'));
  assert.match(html, /id="signatureCanvas"/);
  assert.match(html, /id="initialsCanvas"/);
  assert.match(html, /turn your phone or tablet to landscape/i);
  assert.match(html, /data-adopt-signature-for="1"[\s\S]*?Adopt signature for Homeowner 1/);
  assert.match(html, /data-apply-mark-for="1" data-mark-type="signature"/);
  assert.doesNotMatch(itemsPage, /Adopt signatures and initials/);
  assert.match(signoffPage, /class="signoff-home-summary"[\s\S]*?Adopt signatures and initials[\s\S]*?id="buyerTermsList"/);
  assert.doesNotMatch(html, />Click to sign<\/button>/);
  assert.match(app, /installDrawingCanvasEvents\(signatureCanvas\)/);
  assert.match(app, /installDrawingCanvasEvents\(initialsCanvas\)/);
  assert.match(app, /function acceptDrawnSignature/);
  assert.match(app, /requestAnimationFrame\(\(\) => \{\s*clearAdoptionCanvases\(\);\s*resizeSignatureCanvas\(\);/s);
  assert.match(app, /function closeSignatureTool\(\)\s*\{\s*clearAdoptionCanvases\(\);/s);
  assert.match(app, /acceptance\.adoptedMarks\[buyerKey\]\s*=\s*\{[\s\S]*?signatureDataUrl:[\s\S]*?initialsDataUrl:/s);
  assert.match(app, /async function applyAdoptedMark\(buyerNumber, markType, termId = "", documentType = "final"\)/);
  assert.match(app, /if \(markType === "initials" && termId\)[\s\S]*?acceptance\.termInitials\[termId\]\[buyerKey\]/s);
  assert.match(app, /const buyerAcceptanceTerms = \[[\s\S]*?Completion of Prior New Home Orientation Items[\s\S]*?No additional, written, verbal, or implied warranties[\s\S]*?local municipal-specified watering times/s);
  assert.match(app, /function renderBuyerAcceptanceTerms\(acceptance\)/);
  assert.match(app, /function createSignedAcceptancePdf/);
  assert.match(app, /function addAcceptancePdfTerms\(/);
  assert.match(app, /Both homeowner signatures are required/);
  assert.match(app, /Both homeowners must initial every buyer acknowledgment/);
  assert.match(app, /termInitials:\s*acceptance\.termInitials/);
  assert.match(html, />Exceptions <span id="signoffOpenCount"/);
  assert.match(app, /"EXCEPTIONS", open/);
  assert.match(app, /function trimCanvasToInkDataUrl\(canvas, padding = 12\)[\s\S]*?left[\s\S]*?right[\s\S]*?top[\s\S]*?bottom/s);
  assert.match(app, /signatureDataUrl:\s*trimCanvasToInkDataUrl\(signatureCanvas\)[\s\S]*?initialsDataUrl:\s*trimCanvasToInkDataUrl\(initialsCanvas\)/s);
  assert.match(css, /\.signature-line img\s*\{[^}]*object-position:\s*left bottom/s);
  assert.match(css, /\.signature-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.signature-signing-area\s*\{[^}]*grid-template-columns:\s*minmax\(90px,\s*1fr\)\s+36px/s);
  assert.match(css, /\.signature-signing-area\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.signature-line\s*\{[^}]*grid-column:\s*1/s);
  assert.match(css, /\.signature-button\s*\{[^}]*grid-column:\s*2[^}]*width:\s*36px[^}]*height:\s*36px/s);
  assert.match(css, /\.signature-adoption-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(190px,\s*1fr\)/s);
  assert.match(css, /\.term-initials-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /@media \(orientation: landscape\)/);
});

test("NHO signoff lists all entered items and keeps its signatures separate", () => {
  const nhoPage = html.slice(html.indexOf('id="nhoSignoffPage"'), html.indexOf('id="homeownerSignoffPage"'));
  assert.match(nhoPage, /id="nhoAddress"/);
  assert.match(nhoPage, /id="nhoBuyer1"/);
  assert.match(nhoPage, /Adopt signatures and initials/);
  assert.match(nhoPage, /id="nhoItemList"/);
  assert.match(nhoPage, /data-signature-document="nho"/);
  assert.match(nhoPage, /id="acceptNhoButton"/);
  assert.match(app, /function renderNhoSignoff\(\)/);
  assert.match(app, /acceptance\.nhoSignatures\[buyerKey\]/);
  assert.match(app, /async function acceptNhoAndCreatePdf\(\)/);
  assert.match(app, /async function createNhoSignoffPdf\(record = null, output = \{\}\)/);
  assert.match(app, /"NEW HOME ORIENTATION SIGNOFF"/);
  assert.match(app, /"ORIENTATION ITEMS"/);
  assert.match(app, /nhoSignatures:\s*acceptance\.nhoSignatures/);
});

test("adopted marks and signoff confirmations persist through secure server drafts", () => {
  assert.match(app, /async function saveAcceptanceDraftToServer\(\)/);
  assert.match(app, /\/\.netlify\/functions\/home-acceptance-drafts/);
  assert.match(app, /mergeAcceptanceDrafts\(await loadAcceptanceDraftsFromServer\(\)\)/);
  assert.match(app, /await saveAcceptanceDraftToServer\(\);/);
  assert.match(acceptanceDraftFunction, /getRequestContext/);
  assert.match(acceptanceDraftFunction, /signedInUserCanAccessSite/);
  assert.match(acceptanceDraftFunction, /createServerStateStore\(namespace, organizationId\)/);
  assert.match(acceptanceDraftFunction, /Buffer\.byteLength\(event\.body/);
});

test("new app is isolated from the existing app and database", () => {
  assert.match(app, /punchLogic\.homeAcceptance\.state\.v1/);
  assert.match(config, /https:\/\/zrrbomhycctbarcfwofo\.supabase\.co/);
  assert.doesNotMatch(config, /starterType:\s*"builder"/);
  assert.match(migration, /create table if not exists public\.home_acceptances/i);
  assert.match(migration, /alter table public\.home_acceptances enable row level security/i);
  assert.match(migration, /organization_id = public\.current_organization_id\(\)/i);
});
