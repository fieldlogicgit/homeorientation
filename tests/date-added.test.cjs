const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [
  "app.js",
  "admin.js",
  "trade-report.js",
  "home-report.js",
  "all-trade-report.js"
];

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.match(source, /Date Added/, `${file} must display Date Added`);
  assert.match(source, /function formatDateAdded\(value\)/, `${file} must format the saved creation date`);
}

for (const file of ["netlify/functions/shared-report.js", "netlify/functions/all-report.js"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  assert.match(source, /createdAt:\s*item\.created_at/, `${file} must preserve the Supabase creation date`);
}

assert.match(
  fs.readFileSync(path.join(root, "app.js"), "utf8"),
  /\["Date Added -", formatTimestamp\(issue\.createdAt\)\]/,
  "Field App item cards must show the saved date and time"
);
assert.match(
  fs.readFileSync(path.join(root, "admin.js"), "utf8"),
  /`Date Added - \$\{formatTimestamp\(row\.createdAt\)\}`/,
  "Admin Dashboard item cards must show the saved date and time"
);

console.log("Date Added display regression tests passed.");
