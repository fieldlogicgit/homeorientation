const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const appJs = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

test("main app settings rows use icon-only edit and delete controls", () => {
  assert.match(appJs, /editButton\.className = "settings-icon-button"/);
  assert.match(appJs, /deleteButton\.className = "settings-icon-button danger"/);
});

test("main app settings icons use solid Punch Logic colors in both themes", () => {
  assert.match(css, /\.settings-icon-button\s*\{[^}]*background:\s*#1f67ad;[^}]*color:\s*#ffffff/s);
  assert.match(css, /\.settings-icon-button\.danger\s*\{[^}]*background:\s*#ee6a2f;[^}]*color:\s*#ffffff/s);
  assert.doesNotMatch(css, /body:not\(\[data-theme="dark"\]\) \.settings-icon-button/);
  assert.doesNotMatch(css, /body\[data-theme="dark"\] \.settings-icon-button/);
});

test("main app settings headings and list entries use the app font", () => {
  assert.match(css, /\.settings-collapse-heading\s*\{[^}]*font-family:\s*inherit/s);
  assert.match(css, /\.settings-row > span\s*\{[^}]*font-family:\s*inherit/s);
  assert.doesNotMatch(css, /Roboto Slab|Georgia,\s*serif/);
});
