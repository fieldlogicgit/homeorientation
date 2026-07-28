const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.doesNotMatch(css, /\.info-card::before/);
assert.doesNotMatch(css, /content:\s*"Site"/);
assert.match(html, /styles\.css\?v=88/);

console.log("Site card label regression tests passed.");
