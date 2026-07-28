const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const itemCards = adminJs.slice(
  adminJs.indexOf("function renderItemCards"),
  adminJs.indexOf("function renderAgeBadge")
);

test("item cards show complete before the icon-only edit action", () => {
  assert.ok(itemCards.indexOf("data-item-complete") < itemCards.indexOf("data-item-edit"));
  assert.match(itemCards, /data-item-edit=.*aria-label="Edit item" title="Edit item"><i data-lucide="pencil"><\/i><\/button>/);
  assert.doesNotMatch(itemCards, /data-item-edit=[\s\S]*?<span>Edit<\/span>/);
});

test("admin JavaScript cache version is updated", () => {
  assert.match(adminHtml, /src="admin\.js\?v=52"/);
});

test("dashboard item photos open one direct photo tab", () => {
  const photoViewer = adminJs.slice(
    adminJs.indexOf("function openItemPhoto"),
    adminJs.indexOf("function toggleItemEdit")
  );
  assert.match(photoViewer, /link\.href = src/);
  assert.match(photoViewer, /link\.target = "_blank"/);
  assert.match(photoViewer, /link\.rel = "noopener noreferrer"/);
  assert.doesNotMatch(photoViewer, /window\.open|about:blank|document\.write/);
});
