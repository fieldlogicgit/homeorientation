const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mainHtml = read("index.html");
const adminHtml = read("admin.html");
const helper = read("password-visibility.js");
const app = read("app.js");
const updater = fs.readFileSync(path.resolve(root, "..", "automation", "update-punchlogic-clients.ps1"), "utf8");

for (const [name, html, appScript] of [["main", mainHtml, "app.js?v="], ["admin", adminHtml, "admin.js?v="]]) {
  const lucideIndex = html.indexOf("lucide.min.js");
  const helperIndex = html.indexOf("password-visibility.js?v=1");
  const appIndex = html.indexOf(appScript);
  assert.ok(lucideIndex >= 0, `${name} app must load Lucide`);
  assert.ok(helperIndex > lucideIndex, `${name} app must load password visibility after Lucide`);
  assert.ok(appIndex > helperIndex, `${name} app must enhance passwords before app startup`);
}

assert.match(helper, /input\[type="password"\]/);
assert.match(helper, /new MutationObserver/);
assert.match(helper, /input\.type = visible \? "text" : "password"/);
assert.match(helper, /visible \? "eye-off" : "eye"/);
assert.match(helper, /visible \? "Hide password" : "Show password"/);
assert.match(app, /"Show password": "Mostrar contraseña"/);
assert.match(app, /"Hide password": "Ocultar contraseña"/);

const updaterEntries = updater.match(/"password-visibility\.js"/g) || [];
assert.ok(updaterEntries.length >= 2, "Client updater must copy and syntax-check password-visibility.js");

console.log("Password visibility regression tests passed.");
