const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const languageSource = fs.readFileSync(path.join(root, "report-language.js"), "utf8");
const css = fs.readFileSync(path.join(root, "report.css"), "utf8");
const updater = fs.readFileSync(path.resolve(root, "..", "automation", "update-punchlogic-clients.ps1"), "utf8");
const reports = [
  { html: "trade-report.html", script: "trade-report.js" },
  { html: "home-report.html", script: "home-report.js" },
  { html: "all-trade-report.html", script: "all-trade-report.js" }
];

for (const report of reports) {
  const html = fs.readFileSync(path.join(root, report.html), "utf8");
  const source = fs.readFileSync(path.join(root, report.script), "utf8");
  const settingsScriptIndex = html.indexOf('settings-translations.js?v=1');
  const languageScriptIndex = html.indexOf('report-language.js?v=3');
  const reportScriptIndex = html.indexOf(`${report.script}?v=`);

  assert.match(html, /id="reportLanguageToggle"[^>]*data-i18n-skip[^>]*>Español<\/button>/, `${report.html} needs the language toggle`);
  assert.match(html, /report\.css\?v=20/, `${report.html} needs the updated report controls`);
  assert.ok(settingsScriptIndex >= 0, `${report.html} must load the shared settings translations`);
  assert.ok(languageScriptIndex > settingsScriptIndex, `${report.html} must load settings translations before the language module`);
  assert.ok(reportScriptIndex > languageScriptIndex, `${report.html} must load the language module before report data`);
  assert.match(source, /window\.PUNCH_LOGIC_REPORT_LANGUAGE/, `${report.script} must use the shared report language API`);
  assert.match(source, /punchlogiclanguagechange/, `${report.script} must rerender when the language changes`);
  assert.match(source, /toLocaleString\(reportLanguage\?\.locale\(\)\)/, `${report.script} must localize updated timestamps`);
  assert.match(source, /toLocaleDateString\(reportLanguage\?\.locale\(\)/, `${report.script} must localize Date Added`);
}

assert.match(languageSource, /constructionIssueReport\.language/);
assert.match(languageSource, /"es-419"/);
assert.doesNotMatch(languageSource, /Ã|Â|â€|�/, "Report translations contain damaged UTF-8 text");
assert.doesNotMatch(languageSource, /"Trade": "Especialidad"/);
assert.match(languageSource, /"Crew": "Cuadrilla"/);
assert.match(languageSource, /"Open Issues": "Pendientes abiertos"/);
assert.match(languageSource, /"Shared notes": "Notas compartidas"/);
assert.match(languageSource, /"Completion Photo": "Foto de finalización"/);
assert.match(languageSource, /"Lobby": "Vestíbulo"/);
assert.match(languageSource, /"Electric": "Electricidad"/);
assert.match(languageSource, /window\.PUNCH_LOGIC_SETTING_TRANSLATIONS\?\.\[trimmed\]/);
assert.match(languageSource, /\^\(\\d\+\)\\\.\\s\+\(\.\+\)\$/);
assert.match(languageSource, /\["Updated ", "Actualizado "\]/);
assert.match(languageSource, /new MutationObserver\(handleMutations\)/);
assert.match(languageSource, /window\.alert = \(message\) => nativeAlert\(translate\(message\)\)/);
assert.doesNotMatch(languageSource, /service[_-]?role/i);

assert.match(css, /\.report-language-toggle\s*\{/);
assert.match(css, /grid-template-areas:\s*"logo title language"/);
assert.match(css, /"logo language"\s*\n\s*"title title"/);

const updaterLanguageEntries = updater.match(/"report-language\.js"/g) || [];
assert.ok(updaterLanguageEntries.length >= 2, "Client updater must copy and syntax-check report-language.js");
const updaterSettingsEntries = updater.match(/"settings-translations\.js"/g) || [];
assert.ok(updaterSettingsEntries.length >= 2, "Client updater must copy and syntax-check settings-translations.js");

console.log("Report language toggle regression tests passed.");
