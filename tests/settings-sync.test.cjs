const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");

function extractFunction(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(match, `Missing function ${name}`);
  const start = match.index;
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed function ${name}`);
}

function functionsFrom(source, names) {
  return names.map((name) => extractFunction(source, name)).join("\n");
}

function createSupabase(tables) {
  return {
    from(tableName) {
      const state = { tableName, filters: [], mode: "select", payload: null };
      const chain = {
        select() { return chain; },
        update(payload) { state.mode = "update"; state.payload = payload; return chain; },
        delete() { state.mode = "delete"; return chain; },
        eq(field, value) { state.filters.push([field, value]); return chain; },
        maybeSingle() {
          const rows = tables[tableName].filter(matches);
          return Promise.resolve({ data: rows[0] || null, error: null });
        },
        then(resolve, reject) {
          try {
            const rows = tables[tableName].filter(matches);
            if (state.mode === "update") rows.forEach((row) => Object.assign(row, state.payload));
            if (state.mode === "delete") tables[tableName] = tables[tableName].filter((row) => !matches(row));
            resolve({ data: rows.map((row) => ({ id: row.id })), error: null });
          } catch (error) {
            reject(error);
          }
        }
      };
      function matches(row) {
        return state.filters.every(([field, value]) => row[field] === value);
      }
      return chain;
    }
  };
}

async function testMainAppDatabaseMutations() {
  const tables = {
    location_settings: [{ id: "location-1", organization_id: "org-1", name: "Lobby" }],
    trade_settings: [{ id: "trade-1", organization_id: "org-1", name: "Electric" }],
    item_settings: [{ id: "item-1", organization_id: "org-1", trade_id: "trade-1", name: "Outlet" }]
  };
  const context = {
    state: {
      sharedSettingIds: {
        locations: { Lobby: "location-1" },
        trades: { Electric: "trade-1" },
        items: { Electric: { Outlet: "item-1" } }
      }
    },
    fieldDriveSupabase: createSupabase(tables),
    getCurrentSupabaseProfile: async () => ({ organization_id: "org-1" }),
    getActiveOrganizationId: () => "org-1",
    console
  };
  vm.createContext(context);
  vm.runInContext(functionsFrom(appSource, [
    "normalizeSharedSettingIds",
    "resolveSupabaseSettingId",
    "resolveSupabaseItemSettingId",
    "renameSupabaseSetting",
    "deleteSupabaseSetting",
    "renameSupabaseItemSetting",
    "deleteSupabaseItemSetting"
  ]), context);

  await context.renameSupabaseSetting("location_settings", "Lobby", "Main Lobby");
  await context.renameSupabaseSetting("trade_settings", "Electric", "Electrical");
  await context.renameSupabaseItemSetting("Electric", "Outlet", "Receptacle");
  assert.equal(tables.location_settings[0].name, "Main Lobby");
  assert.equal(tables.trade_settings[0].name, "Electrical");
  assert.equal(tables.item_settings[0].name, "Receptacle");

  context.state.sharedSettingIds.locations["Main Lobby"] = "location-1";
  context.state.sharedSettingIds.trades.Electrical = "trade-1";
  context.state.sharedSettingIds.items.Electrical = { Receptacle: "item-1" };
  await context.deleteSupabaseItemSetting("Electrical", "Receptacle");
  await context.deleteSupabaseSetting("trade_settings", "Electrical");
  await context.deleteSupabaseSetting("location_settings", "Main Lobby");
  assert.equal(tables.item_settings.length, 0);
  assert.equal(tables.trade_settings.length, 0);
  assert.equal(tables.location_settings.length, 0);
}

function testAdminLocalMirror() {
  let storedState = {
    rooms: ["Lobby"],
    tradeIssues: { Electric: ["Outlet"] },
    tradeEmails: { Electric: "electric@example.com" },
    sharedSettingIds: {
      locations: { Lobby: "location-1" },
      trades: { Electric: "trade-1" },
      items: { Electric: { Outlet: "item-1" } }
    }
  };
  const context = {
    rowsBySection: { settings: [{ secondary: "Item", tertiary: "Electric", primary: "Outlet" }] },
    loadMainAppState: () => structuredClone(storedState),
    saveMainAppState: (value) => { storedState = structuredClone(value); },
    addRecentChange: () => {}
  };
  vm.createContext(context);
  vm.runInContext(functionsFrom(adminSource, [
    "isCrewSettingType",
    "normalizeMainAppSettingIds",
    "moveMainAppSettingId",
    "updateMainAppSettingRow",
    "deleteMainAppSettingRow"
  ]), context);

  context.updateMainAppSettingRow({ secondary: "Location", primary: "Lobby" }, "Main Lobby");
  context.updateMainAppSettingRow({ secondary: "Trade", primary: "Electric" }, "Electrical");
  context.updateMainAppSettingRow({ secondary: "Item", primary: "Outlet", tertiary: "Electrical" }, "Receptacle");
  assert.deepEqual(storedState.rooms, ["Main Lobby"]);
  assert.deepEqual(storedState.tradeIssues, { Electrical: ["Receptacle"] });
  assert.equal(storedState.sharedSettingIds.locations["Main Lobby"], "location-1");
  assert.equal(storedState.sharedSettingIds.trades.Electrical, "trade-1");
  assert.equal(storedState.sharedSettingIds.items.Electrical.Receptacle, "item-1");

  context.deleteMainAppSettingRow({ secondary: "Item", primary: "Receptacle", tertiary: "Electrical" });
  context.deleteMainAppSettingRow({ secondary: "Trade", primary: "Electrical" });
  context.deleteMainAppSettingRow({ secondary: "Location", primary: "Main Lobby" });
  assert.equal(storedState.tradeIssues.Electrical, undefined);
  assert.deepEqual(storedState.rooms, ["Other"]);
}

function testAuthoritativeLocationsAreNotRetired() {
  const context = {
    rooms: ["Other"],
    retiredRoomOptions: new Set(["Kitchen"])
  };
  vm.createContext(context);
  vm.runInContext(functionsFrom(appSource, ["mergeUnique", "mergeLocationOptions"]), context);

  assert.deepEqual(Array.from(context.mergeLocationOptions(["Kitchen", "Custom"], true)), ["Other", "Custom"]);
  assert.deepEqual(Array.from(context.mergeLocationOptions(["Kitchen", "Custom"], false)), ["Kitchen", "Custom"]);
}

assert.match(adminSource, /sharedSettingsInitialized\s*\?\s*\[\]\s*:\s*buildMainAppSettingRows/);
assert.doesNotMatch(appSource, /renameSupabaseSettingByName|renameSupabaseItemSettingByName/);
assert.match(appSource, /\.eq\("id", id\)/);

Promise.resolve()
  .then(testMainAppDatabaseMutations)
  .then(testAdminLocalMirror)
  .then(testAuthoritativeLocationsAreNotRetired)
  .then(() => console.log("Settings sync regression tests passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
