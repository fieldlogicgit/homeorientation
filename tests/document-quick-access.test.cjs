const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const app = read("app.js");
const admin = read("admin.js");
const index = read("index.html");
const migration = read("supabase/migrations/018_site_document_quick_access.sql");

assert.match(index, /id="siteDocumentQuickAccess"/);
assert.match(app, /quick_access: siteDocumentQuickAccess\.checked/);
assert.match(app, /function groupSiteDocumentsBySite[\s\S]*?quickAccess: Boolean\(row\.quick_access\)/);
assert.match(app, /siteDocumentQuickAccess\.checked = Boolean\(documentRow\?\.quickAccess\)/);
assert.match(app, /documentRow\.quickAccess/);
assert.match(app, /site-document-button quick-access/);
assert.match(admin, /name="quick_access"/);
assert.match(admin, /name="quick_access" type="checkbox"\$\{row\.quickAccess \? " checked" : ""\}/);
assert.match(admin, /quick_access: values\.quick_access === "on"/);
assert.match(admin, /quick_access: Boolean\(panel\.querySelector/);
assert.match(migration, /add column if not exists quick_access boolean not null default false/i);
assert.match(migration, /quick_access = case when p_patch \? 'quick_access'/i);

console.log("Document quick access regression tests passed.");
