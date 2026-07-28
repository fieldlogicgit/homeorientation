const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "settings-translations.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const translations = context.window.PUNCH_LOGIC_SETTING_TRANSLATIONS;
assert.ok(Object.isFrozen(translations), "Settings translations must be immutable");
assert.ok(Object.keys(translations).length >= 193, "The uploaded residential settings list must be fully translated");
assert.equal(translations["Shell Contractor"], "Contratista de estructura");
assert.equal(translations["Foyer"], "Vestíbulo");
assert.equal(translations["Primary Bathroom"], "Baño principal");
assert.equal(translations["Opening Wrong Size"], "Abertura de tamaño incorrecto");
assert.equal(translations["Shelf Missing/Damaged"], "Repisa faltante o dañada");
assert.doesNotMatch(source, /Ã|Â|â€|�/, "Settings translations contain damaged UTF-8 text");

console.log("Shared settings translation regression tests passed.");
