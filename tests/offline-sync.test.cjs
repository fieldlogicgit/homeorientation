const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("IndexedDB queue exposes all field reliability states and reconnect retry", () => {
  const source = read("offline-sync.js");
  assert.match(source, /indexedDB\.open/);
  for (const label of ["Saved on device", "Uploading", "Synced", "Failed"]) assert.match(source, new RegExp(label));
  assert.match(source, /addEventListener\("online"/);
  assert.match(source, /data-sync-button/);
  assert.match(source, /dependsOn/);
});

test("main app queues items, item patches, photos, and documents", () => {
  const source = read("app.js");
  for (const kind of ["item.create", "item.patch", "photo.upload", "document.create", "document.patch"]) {
    assert.match(source, new RegExp(`\\"${kind.replace(".", "\\.")}\\"`));
  }
  assert.match(source, /apply_punch_item_patch/);
  assert.match(source, /apply_site_document_patch/);
  assert.match(source, /restorePendingMainOperations/);
  assert.match(source, /updatedAt: row\.issue\.updatedAt \|\| row\.issue\.createdAt/);
});

test("field reports use the durable queue and display manual sync controls", () => {
  for (const html of ["trade-report.html", "home-report.html", "all-trade-report.html"]) {
    const source = read(html);
    assert.match(source, /offline-sync\.js/);
    assert.match(source, /report-offline-sync\.js/);
    assert.match(source, /data-sync-button/);
    assert.match(source, /data-sync-last/);
  }
  for (const script of ["trade-report.js", "home-report.js", "all-trade-report.js"]) {
    assert.match(read(script), /enqueueMutation/);
    assert.match(read(script), /detail:\s*\{[\s\S]*reportAccessToken/, `${script} must give the shared PDF generator its secure report context`);
  }
});

test("report conflicts accept the newer server version instead of replaying stale notes", () => {
  const adapter = read("report-offline-sync.js");
  const queue = read("offline-sync.js");
  assert.match(adapter, /refreshAuthoritativeReport/);
  assert.match(adapter, /response\.status === 409 && await refreshAuthoritativeReport/);
  assert.match(adapter, /queue\.discard\(conflicts\.map/);
  assert.match(adapter, /operation\.retryable !== false/);
  assert.doesNotMatch(
    queue,
    /operation\.status === "failed" && \(options\.manual \|\| operation\.retryable !== false\)/,
    "Manual sync must not retry permanent server conflicts"
  );
});

test("field app and dashboard reports share the professional PDF renderer", () => {
  const generator = read("punchlogic-pdf.js");
  assert.match(generator, /buildIssuePdf/);
  assert.match(generator, /getPhotoChunks/);
  assert.match(generator, /addContainedImage/);
  assert.match(read("app.js"), /PUNCH_LOGIC_PDF\.buildIssuePdf/);
  assert.match(read("report-pdf.js"), /PUNCH_LOGIC_PDF\.buildIssuePdf/);
  assert.doesNotMatch(generator, /PUNCH SCHEDULE/);
  assert.doesNotMatch(generator, /Open items only/i);
  assert.doesNotMatch(read("app.js"), /PUNCH SCHEDULE/);
});

test("database migration provides idempotency and stale-write protection", () => {
  const source = read("supabase/migrations/017_offline_field_sync.sql");
  assert.match(source, /create table if not exists public\.sync_mutations/i);
  assert.match(source, /apply_punch_item_patch/i);
  assert.match(source, /apply_site_document_patch/i);
  assert.match(source, /SYNC_CONFLICT/);
  assert.match(source, /for update/i);
});

test("queued photo retries use deterministic ids and storage upserts", () => {
  assert.match(read("netlify/functions/photo.js"), /body\.photoId/);
  assert.match(read("netlify/functions/_photos.js"), /"x-upsert": upsert \? "true" : "false"/);
  assert.match(read("netlify/functions/shared-report.js"), /upsertItemPhoto/);
  assert.match(read("netlify/functions/all-report.js"), /upsertItemPhoto/);
});
