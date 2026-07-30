const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const config = fs.readFileSync(path.join(root, "supabase-config.js"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "035_home_acceptance_signatures.sql"),
  "utf8"
);

test("select home leads the active-home workflow navigation", () => {
  const selectHomeTab = html.indexOf('data-page-target="selectHomePage"');
  const itemsTab = html.indexOf('data-page-target="punchListPage"');
  const signoffTab = html.indexOf('data-page-target="homeownerSignoffPage"');
  const archiveTab = html.indexOf('data-page-target="homeArchivePage"');
  assert.ok(selectHomeTab > -1 && itemsTab > selectHomeTab && signoffTab > itemsTab && archiveTab > signoffTab);
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
  assert.match(html, /data-page-target="homeownerSignoffPage"[\s\S]*?<path d="M12 20h9"><\/path>[\s\S]*?<span>Final Signoff<\/span>/);
  assert.match(html, /<h1>Final Signoff<\/h1>/);
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
});

test("photos require a selected Supabase-backed home before upload", () => {
  assert.match(app, /async function handlePhotoSelection\(event\)[\s\S]*?homesite\.source !== "Supabase"/);
  assert.match(app, /Select a synced home on the Select Home tab before adding photos\./);
  assert.match(app, /selectedPhotos\.length && fieldDriveSupabase && homesite\.source !== "Supabase"/);
  assert.match(app, /newPhotos\.length && fieldDriveSupabase && !isSupabaseIssue/);
});

test("signature tool supports touch drawing, acceptance, and signed PDF generation", () => {
  const itemsPage = html.slice(html.indexOf('id="punchListPage"'), html.indexOf('id="homeownerSignoffPage"'));
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
  assert.match(app, /function applyAdoptedMark\(buyerNumber, markType, termId = ""\)/);
  assert.match(app, /if \(markType === "initials" && termId\)[\s\S]*?acceptance\.termInitials\[termId\]\[buyerKey\]/s);
  assert.match(app, /const buyerAcceptanceTerms = \[[\s\S]*?Completion of Prior Orientation Items[\s\S]*?Irrigation Timer/s);
  assert.match(app, /function renderBuyerAcceptanceTerms\(acceptance\)/);
  assert.match(app, /function createSignedAcceptancePdf/);
  assert.match(app, /function addAcceptancePdfTerms\(/);
  assert.match(app, /Both homeowner signatures are required/);
  assert.match(app, /Both homeowners must initial every buyer acknowledgment/);
  assert.match(app, /termInitials:\s*acceptance\.termInitials/);
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

test("new app is isolated from the existing app and database", () => {
  assert.match(app, /punchLogic\.homeAcceptance\.state\.v1/);
  assert.match(config, /https:\/\/zrrbomhycctbarcfwofo\.supabase\.co/);
  assert.doesNotMatch(config, /starterType:\s*"builder"/);
  assert.match(migration, /create table if not exists public\.home_acceptances/i);
  assert.match(migration, /alter table public\.home_acceptances enable row level security/i);
  assert.match(migration, /organization_id = public\.current_organization_id\(\)/i);
});
