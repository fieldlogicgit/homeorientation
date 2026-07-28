const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const adminCss = fs.readFileSync(path.join(root, "admin.css"), "utf8");

function extractFunction(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing function ${name}`);
  const start = match.index;
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

const context = {
  rowsBySection: { projects: [{ id: "project-1", primary: "Project One" }] },
  XLSX: { utils: { sheet_to_json: (sheet) => sheet } }
};
vm.createContext(context);
[
  "normalizeImportKey",
  "isGenericImportSheetName",
  "normalizeAdminImportRow",
  "getAdminImportValue",
  "getAdminImportedCustomFields",
  "buildAdminImportedSiteName",
  "parseAdminSiteWorkbook",
  "parseAdminContactWorkbook",
  "adminImportedContactKey"
].forEach((name) => vm.runInContext(extractFunction(adminSource, name), context));

const siteWorkbook = {
  SheetNames: ["Sites"],
  Sheets: {
    Sites: [
      { Site: "101", Address: "1 Main St", Permit: "P-1", Superintendent: "Dana" },
      { Project: "Project Two" }
    ]
  }
};
const sites = JSON.parse(JSON.stringify(context.parseAdminSiteWorkbook(siteWorkbook, "project-1")));
assert.equal(sites.length, 1);
assert.equal(sites[0].name, "101");
assert.equal(sites[0].projectName, "Project One");
assert.deepEqual(sites[0].fields, [
  { label: "Address", value: "1 Main St" },
  { label: "Permit", value: "P-1" },
  { label: "Superintendent", value: "Dana" }
]);

const contactWorkbook = {
  SheetNames: ["Contacts"],
  Sheets: {
    Contacts: [{ Name: "Alex Smith", Company: "ABC Electric", "Job Desc": "PM", Email: "alex@example.com", Phone: "555-0100", Region: "North" }]
  }
};
const contacts = JSON.parse(JSON.stringify(context.parseAdminContactWorkbook(contactWorkbook)));
assert.equal(contacts.length, 1);
assert.equal(contacts[0].contact_name, "Alex Smith");
assert.equal(contacts[0].vendor, "ABC Electric");
assert.deepEqual(contacts[0].fields, [{ label: "Region", value: "North" }]);

assert.match(adminHtml, /xlsx\.full\.min\.js/);
assert.match(adminSource, /Import from \.XLSX/);
assert.match(adminCss, /#siteProjectFilter/);
assert.match(indexHtml, /id="addContactButton"[\s\S]*card-action-button/);
assert.match(indexHtml, /Download \.XLSX/);
assert.match(appSource, /syncImportedCommunitiesToSupabase\(importedCommunities\)/);

console.log("Spreadsheet import regression tests passed.");
