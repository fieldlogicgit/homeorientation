const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const adminCss = fs.readFileSync(path.join(root, "admin.css"), "utf8");
const adminModernCss = fs.readFileSync(path.join(root, "admin-modern.css"), "utf8");

test("admin header omits the inactive search icon", () => {
  assert.doesNotMatch(adminHtml, /aria-label="Search"><i data-lucide="search"/);
});

test("section search remains available", () => {
  assert.match(adminJs, /id="adminSearchInput" type="search"/);
});

test("admin sidebar omits the decorative connection status", () => {
  assert.doesNotMatch(adminHtml, /id="supabaseStatus"/);
  assert.doesNotMatch(adminJs, /renderSupabaseStatus/);
  assert.doesNotMatch(adminCss, /\.sidebar-status/);
});

test("modern dashboard keeps a fixed utility rail with a scrolling workspace", () => {
  assert.match(adminHtml, /href="admin-modern\.css\?v=10"/);
  assert.match(adminModernCss, /\.admin-sidebar,[\s\S]*?position:\s*fixed/);
  assert.match(adminModernCss, /\.admin-sidebar,[\s\S]*?height:\s*100dvh/);
  assert.match(adminModernCss, /\.admin-content\s*\{[\s\S]*?margin-left:\s*200px/);
  assert.match(adminModernCss, /body\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(adminModernCss, /\.metric-grid,[\s\S]*?display:\s*none/);
});

test("dashboard settings icons use solid Punch Logic colors in both themes", () => {
  assert.match(
    adminModernCss,
    /\.settings-chip \.row-action-button\.icon-only:not\(\.danger\),[\s\S]*?background:\s*#1f67ad;[\s\S]*?color:\s*#ffffff/
  );
  assert.match(
    adminModernCss,
    /\.settings-chip \.row-action-button\.icon-only\.danger,[\s\S]*?background:\s*#ee6a2f;[\s\S]*?color:\s*#ffffff/
  );
});

test("sidebar navigation uses Punch Logic colors", () => {
  assert.match(adminModernCss, /\.admin-nav svg\s*\{[\s\S]*?color:\s*var\(--utility-blue\)/);
  assert.match(adminModernCss, /\.admin-nav button span\s*\{[\s\S]*?color:\s*var\(--utility-muted\)/);
  assert.match(
    adminModernCss,
    /\.admin-nav button\.active svg,\s*\.admin-nav button\.active span\s*\{[\s\S]*?color:\s*var\(--utility-orange\)/
  );
});

test("modern dashboard uses the full logo and keeps the sidebar dark in light mode", () => {
  assert.match(adminHtml, /class="brand-mark" src="punch-logic-combined-logo\.svg"/);
  assert.match(adminModernCss, /--utility-bg:\s*#0c1117/);
  assert.match(
    adminModernCss,
    /\.admin-sidebar,\s*body\[data-theme="light"\] \.admin-sidebar\s*\{[\s\S]*?background:\s*var\(--utility-bg\)/
  );
});

test("modern dashboard has a compact mobile navigation layout", () => {
  assert.match(adminModernCss, /@media \(max-width:\s*720px\)/);
  assert.match(adminModernCss, /\.admin-nav\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(adminModernCss, /\.admin-sidebar,[\s\S]*?position:\s*sticky/);
});

test("modern dashboard separates repeated cards in both themes", () => {
  assert.match(adminModernCss, /body\[data-theme="light"\] \.admin-row-card:nth-child\(even\)/);
  assert.match(adminModernCss, /body\[data-theme="light"\] \.admin-item-card:nth-child\(even\):not\(\.office-done\)/);
  assert.match(adminModernCss, /body\[data-theme="light"\] \.settings-manager-panel/);
  assert.match(adminModernCss, /body\[data-theme="light"\] \.settings-chip:nth-child\(even\)/);
});

test("modern dashboard uses solid action and destructive buttons in both themes", () => {
  assert.match(adminModernCss, /\.secondary-button,[\s\S]*?background:\s*#1f67ad;[\s\S]*?color:\s*#ffffff/);
  assert.match(adminModernCss, /\.danger-button,[\s\S]*?\.row-action-button\.danger[\s\S]*?background:\s*#ee6a2f;[\s\S]*?color:\s*#ffffff/);
});

test("theme toggle has high-contrast solid moon and sun treatments", () => {
  assert.match(adminModernCss, /body\[data-theme="dark"\] \.theme-button\s*\{[\s\S]*?background:\s*#ffffff;[\s\S]*?color:\s*#ee6a2f/);
  assert.match(adminModernCss, /body\[data-theme="light"\] \.theme-button\s*\{[\s\S]*?background:\s*#0c1117;[\s\S]*?color:\s*#ffffff/);
  assert.match(adminModernCss, /body\[data-theme="light"\] \.theme-button svg\s*\{[\s\S]*?fill:\s*currentColor/);
});
