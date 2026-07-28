const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const index = read("index.html");
const app = read("app.js");

assert.match(index, /id="changePasswordButton"/);
assert.match(index, /id="currentPasswordInput"[^>]*autocomplete="current-password"/);
assert.match(index, /id="settingsNewPasswordInput"[^>]*minlength="8"/);
assert.match(index, /id="settingsConfirmPasswordInput"[^>]*minlength="8"/);
assert.match(app, /auth\.signInWithPassword\(\{ email, password: currentPassword \}\)/);
assert.match(app, /auth\.updateUser\(\{ password \}\)/);
assert.match(app, /auth\.signOut\(\{ scope: "others" \}\)/);
assert.match(app, /changePasswordButton\.classList\.toggle\("hidden", !fieldDriveSupabase\)/);

console.log("Change password regression tests passed.");
