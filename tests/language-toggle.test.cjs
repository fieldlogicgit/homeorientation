const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const themeButtonIndex = html.indexOf('id="themeToggleButton"');
const languageButtonIndex = html.indexOf('id="languageToggleButton"');
const signOutButtonIndex = html.indexOf('id="signOutButton"');

assert.ok(themeButtonIndex >= 0, "Missing theme button");
assert.ok(languageButtonIndex > themeButtonIndex, "Language button must appear below the theme button");
assert.ok(signOutButtonIndex > languageButtonIndex, "Language button must remain inside the Settings action group");
assert.match(html, /id="languageToggleButton"[^>]*data-i18n-skip[^>]*>Español<\/button>/);
assert.match(html, /settings-translations\.js\?v=1/);
assert.match(html, /app\.js\?v=/);

assert.match(source, /constructionIssueReport\.language/);
assert.match(source, /localStorage\.getItem\(languageStorageKey\)/);
assert.match(source, /localStorage\.setItem\(languageStorageKey, currentLanguage\)/);
assert.match(source, /document\.documentElement\.lang = currentLanguage === "es" \? "es-419" : "en"/);
assert.match(source, /currentLanguage === "es" \? "English" : "Español"/);
assert.doesNotMatch(source, /Ã|Â|â€|�/, "Main app translations contain damaged UTF-8 text");
assert.doesNotMatch(html, /Ã|Â|â€|�/, "Main app HTML contains damaged UTF-8 text");

assert.match(source, /"Settings": "Configuración"/);
assert.match(source, /"Site": "Sitio"/);
assert.doesNotMatch(source, /"Trade": "Especialidad"/);
assert.match(source, /"Crew": "Cuadrilla"/);
assert.match(source, /"Item": "Pendiente"/);
assert.match(source, /"Completion Photo": "Foto de finalización"/);
assert.match(source, /window\.PUNCH_LOGIC_SETTING_TRANSLATIONS\?\.\[trimmed\]/);

assert.match(source, /new MutationObserver\(handleLanguageMutations\)/);
assert.match(source, /translateLanguageTree\(document\.body, false\)/);
assert.match(source, /window\.prompt = \(message, defaultValue\) => nativePrompt\(translateUiText\(message\), defaultValue\)/);
assert.match(source, /window\.alert = \(message\) => nativeAlert\(translateUiText\(message\)\)/);
assert.match(source, /window\.confirm = \(message\) => nativeConfirm\(translateUiText\(message\)\)/);

const toggleBody = source.match(/function toggleLanguage\(\) \{([\s\S]*?)\n\}/)?.[1] || "";
assert.ok(toggleBody, "Missing toggleLanguage implementation");
assert.doesNotMatch(toggleBody, /state|Supabase|fetch|save/i, "Language preference must not alter shared client data");

console.log("Language toggle regression tests passed.");
