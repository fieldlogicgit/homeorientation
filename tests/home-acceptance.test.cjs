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
  assert.doesNotMatch(html, /data-page-target="contactsPage"/);
  assert.doesNotMatch(html, /data-page-target="homesiteInfoPage"/);
  assert.match(html, /id="activeHomeList"/);
  assert.match(html, /id="startNewHomeButton"/);
  assert.match(html, /id="archivedHomeList"/);
  assert.match(html, /id="homeCommunityInput"/);
  assert.match(html, /id="homeAddressInput"/);
  assert.match(html, /id="homebuyer1NameInput"/);
  assert.match(html, /id="homebuyer2EmailInput"/);
  assert.match(css, /\.home-details-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /\.home-details-grid input\s*\{[^}]*width:\s*calc\(100% - 10px\)/s);
});

test("home details save into selectable records and signed homes can be archived", () => {
  assert.match(app, /function startNewHome\(\)/);
  assert.match(app, /function renderActiveHomeList\(\)/);
  assert.match(app, /renderActiveHomeList\(\);\s*renderArchivedHomeList\(\);\s*renderHomeownerSignoff\(\);/s);
  assert.match(app, /async function archiveAcceptedHome\(\)/);
  assert.match(app, /\.update\(\{ archived_at: archivedAt \}\)/);
  assert.match(app, /function restoreArchivedHome\(/);
  assert.match(app, /filter\(\(homesite\) => !isHomeArchived\(homesite\)\)/);
});

test("signature tool supports touch drawing, acceptance, and signed PDF generation", () => {
  assert.match(html, /id="signatureCanvas"/);
  assert.match(html, /turn your phone or tablet to landscape/i);
  assert.match(html, /class="signature-signing-area"[\s\S]*?data-signature-for="1"[\s\S]*?class="signature-line"/);
  assert.match(app, /signatureCanvas\.addEventListener\("pointerdown"/);
  assert.match(app, /function acceptDrawnSignature/);
  assert.match(app, /function createSignedAcceptancePdf/);
  assert.match(app, /Both homeowner signatures are required/);
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
