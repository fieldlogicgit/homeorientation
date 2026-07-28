const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const fieldSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "admin.css"), "utf8");
const fieldCss = fs.readFileSync(path.join(root, "styles.css"), "utf8");

function extractFunction(name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
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
  formatSiteLabel: (name, address) => [name, address].filter(Boolean).join(" - "),
  getSiteFieldValue: () => "",
  normalizeSiteFields: (fields) => fields || []
};
vm.createContext(context);
["getItemActivityContext", "itemAddedActivityFromRows", "tradeCompletionActivityFromRows"].forEach((name) => {
  vm.runInContext(extractFunction(name), context);
});

const groups = {
  profiles: [{ id: "user-1", display_name: "Jordan Lee" }],
  projects: [{ id: "project-1", name: "Tower A" }],
  sites: [{ id: "site-1", name: "Level 2", project_id: "project-1" }]
};
const row = {
  id: "item-1",
  item: "Install cover plate",
  trade: "Electrical",
  created_by: "user-1",
  site_id: "site-1",
  created_at: "2026-07-14T12:00:00Z",
  trade_completed: true,
  trade_completed_at: "2026-07-14T13:00:00Z"
};

const added = JSON.parse(JSON.stringify(context.itemAddedActivityFromRows([row], groups)[0]));
assert.equal(added.detail, "Added by Jordan Lee");
assert.equal(added.context, "Project: Tower A | Site: Level 2");
assert.equal(added.targetId, "item-1");

const completed = JSON.parse(JSON.stringify(context.tradeCompletionActivityFromRows([row], groups)[0]));
assert.equal(completed.context, "Project: Tower A | Site: Level 2");
assert.equal(completed.targetId, "item-1");

assert.match(source, /data-notification-id/);
assert.match(source, /function openNotification\(/);
assert.match(source, /notification-time[^]*formatTimestamp\(change\.createdAt\)/, "Admin notifications must show their saved date and time");
assert.match(fieldSource, /field-notification-time[^]*formatTimestamp\(notification\.createdAt\)/, "Crew notifications must show their saved date and time");
assert.match(source, /scrollIntoView/);
assert.match(css, /\.notification-item:hover/);
assert.match(css, /\.notification-target/);
assert.match(fieldCss, /\.field-notification-item \.field-notification-time/);

console.log("Notification regression tests passed.");
