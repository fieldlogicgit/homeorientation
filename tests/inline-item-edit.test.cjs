const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function functionBody(name, nextName) {
  const start = app.indexOf(`function ${name}`);
  const end = nextName ? app.indexOf(`function ${nextName}`, start + 1) : app.length;
  assert.notEqual(start, -1, `${name} should exist`);
  return app.slice(start, end === -1 ? app.length : end);
}

test("item entry panel is addressable and current assets are cache-busted", () => {
  assert.match(html, /id="issueEntryForm"/);
  assert.match(html, /styles\.css\?v=88/);
  assert.match(html, /app\.js\?v=145/);
});

test("edit action uses the item entry form instead of prompt dialogs", () => {
  const editBody = functionBody("editIssue", "setIssueFormSelectValue");
  assert.doesNotMatch(editBody, /prompt\(/);
  assert.match(editBody, /showPage\("punchListPage"\)/);
  assert.match(editBody, /state\.currentCommunityId = record\.community\.id/);
  assert.match(editBody, /state\.currentHomesiteId = record\.homesite\.id/);
  assert.match(editBody, /selectedPhotos = \(issue\.photos \|\| \[\]\)/);
  assert.match(editBody, /Save item edits/);
  assert.match(editBody, /scrollIntoView/);
});

test("saving inline edits updates fields, queues new photos, and syncs reports", () => {
  const saveBody = functionBody("saveIssueEditsFromForm", "syncIssueEdits");
  assert.match(saveBody, /queueEditedIssuePhotos/);
  assert.match(saveBody, /syncIssueEdits\(record/);
  assert.match(saveBody, /resetIssueEditMode\(\)/);
  assert.match(saveBody, /photos: \[\.\.\.previous\.photos, \.\.\.savedPhotos\]/);
  assert.doesNotMatch(app, /applyLanguage\(/);
  assert.match(saveBody, /refreshLanguageDom\(\)/);
});

test("edit mode is visually distinct and keeps photo labels", () => {
  assert.match(css, /\.form-panel\.is-editing\s*\{[^}]*border-color:\s*#ee6a2f/s);
  const previewBody = functionBody("renderPhotoPreview", "addIssue");
  assert.match(previewBody, /getPhotoSource\(photo\)/);
  assert.match(previewBody, /photo\.completionProof \? "Completion Photo" : "Item Photo"/);
});
