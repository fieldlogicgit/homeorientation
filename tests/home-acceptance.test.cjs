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

test("home details and signoff lead the simplified navigation", () => {
  const itemsTab = html.indexOf('data-page-target="punchListPage"');
  const signoffTab = html.indexOf('data-page-target="homeownerSignoffPage"');
  assert.ok(itemsTab > -1 && signoffTab > itemsTab);
  assert.doesNotMatch(html, /data-page-target="contactsPage"/);
  assert.doesNotMatch(html, /data-page-target="homesiteInfoPage"/);
  assert.match(html, /id="homeCommunityInput"/);
  assert.match(html, /id="homeAddressInput"/);
  assert.match(html, /id="homebuyer1NameInput"/);
  assert.match(html, /id="homebuyer2EmailInput"/);
  assert.match(css, /\.home-details-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test("signature tool supports touch drawing, acceptance, and signed PDF generation", () => {
  assert.match(html, /id="signatureCanvas"/);
  assert.match(html, /turn your phone or tablet to landscape/i);
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
