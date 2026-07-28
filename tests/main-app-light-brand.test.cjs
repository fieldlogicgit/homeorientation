const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("main app loads the branded light-mode stylesheet revision", () => {
  assert.match(html, /styles\.css\?v=88/);
});

test("light mode uses Punch Logic colors for the primary item controls", () => {
  assert.match(css, /body:not\(\[data-theme="dark"\]\) #addIssueButton\s*\{[^}]*background:\s*#ee6a2f/s);
  assert.match(css, /\.summary-band > div:first-child\s*\{[^}]*background:\s*#125ea8/s);
  assert.match(css, /\.summary-band > div:nth-child\(2\)\s*\{[^}]*background:\s*#125ea8/s);
  assert.match(css, /\.issue-card \.remove-button\s*\{[^}]*background:\s*#ee6a2f/s);
});

test("light-mode navigation keeps the original white treatment", () => {
  assert.match(css, /\.bottom-nav\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.92\)/s);
  assert.match(css, /\.bottom-tab\.active\s*\{[^}]*background:\s*var\(--secondary\)/s);
  assert.doesNotMatch(css, /body:not\(\[data-theme="dark"\]\) \.bottom-nav\s*\{/);
  assert.doesNotMatch(css, /body:not\(\[data-theme="dark"\]\) \.bottom-tab\.active\s*\{/);
});

test("light-mode sync control uses a compact branded status card", () => {
  assert.match(css, /body:not\(\[data-theme="dark"\]\) \.sync-control\s*\{[^}]*border-radius:\s*10px[^}]*background:\s*#ffffff/s);
  assert.match(css, /body:not\(\[data-theme="dark"\]\) \.sync-icon-button\s*\{[^}]*background:\s*#125ea8[^}]*color:\s*#ffffff/s);
  assert.match(css, /data-sync-state="saved"[^}]*\.sync-icon-button\s*\{[^}]*background:\s*#ee6a2f/s);
  assert.match(css, /data-sync-state="failed"[^}]*\.sync-icon-button\s*\{[^}]*background:\s*#d9363e/s);
});

test("dark-mode sync control mirrors the compact branded status card", () => {
  assert.match(css, /body\[data-theme="dark"\] \.sync-control\s*\{[^}]*border-radius:\s*10px[^}]*background:\s*#0d1823/s);
  assert.match(css, /body\[data-theme="dark"\] \.sync-icon-button\s*\{[^}]*background:\s*#125ea8[^}]*color:\s*#ffffff/s);
  assert.match(css, /body\[data-theme="dark"\] \.sync-control\[data-sync-state="saved"\] \.sync-icon-button,[^{]*\{[^}]*background:\s*#ee6a2f/s);
  assert.match(css, /body\[data-theme="dark"\] \.sync-control\[data-sync-state="failed"\] \.sync-icon-button\s*\{[^}]*background:\s*#d9363e/s);
});

test("dark mode uses Punch Logic blue instead of cyan accents", () => {
  assert.match(css, /body\[data-theme="dark"\]\s*\{[^}]*--line:\s*rgba\(18, 94, 168, 0\.42\)[^}]*--accent:\s*#125ea8[^}]*--accent-strong:\s*#125ea8/s);
  assert.match(css, /body\[data-theme="dark"\] \.menu-item\s*\{[^}]*border:\s*1px solid #125ea8[^}]*background:\s*#125ea8[^}]*color:\s*#ffffff/s);
  assert.match(css, /body\[data-theme="dark"\] \.menu-item\.danger\s*\{[^}]*background:\s*#ee6a2f[^}]*color:\s*#ffffff/s);
  assert.doesNotMatch(css, /#75d7ff|#73cfff|rgba\(125, 218, 255|rgba\(117, 215, 255|rgba\(79, 186, 255|rgba\(67, 169, 255/);
});
