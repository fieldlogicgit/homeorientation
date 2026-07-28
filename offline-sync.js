(function initPunchLogicOfflineSync(global) {
  const databaseName = "punch-logic-field-sync";
  const databaseVersion = 1;
  const operationStore = "operations";
  const metaStore = "meta";
  const syncedRetentionMs = 24 * 60 * 60 * 1000;
  const retryIntervalMs = 30000;

  let databasePromise = null;
  let configuration = null;
  let syncing = false;
  let retryTimer = null;
  let latestState = createEmptyState();

  function createEmptyState() {
    return {
      status: "synced",
      label: "Synced",
      pending: 0,
      failed: 0,
      uploading: 0,
      lastSyncAt: "",
      online: navigator.onLine !== false,
      error: ""
    };
  }

  function createId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (global.crypto?.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const value = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Device storage request failed."));
    });
  }

  function transactionPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Device storage transaction failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Device storage transaction was cancelled."));
    });
  }

  function openDatabase() {
    if (!global.indexedDB) return Promise.reject(new Error("This browser does not support offline storage."));
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = global.indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(operationStore)) {
          const store = database.createObjectStore(operationStore, { keyPath: "id" });
          store.createIndex("scope", "scope", { unique: false });
          store.createIndex("scopeStatus", ["scope", "status"], { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
        if (!database.objectStoreNames.contains(metaStore)) database.createObjectStore(metaStore, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Offline storage could not be opened."));
    });
    return databasePromise;
  }

  async function getAllOperations() {
    const database = await openDatabase();
    const transaction = database.transaction(operationStore, "readonly");
    const rows = await requestPromise(transaction.objectStore(operationStore).getAll());
    await transactionPromise(transaction);
    return (rows || []).filter((operation) => !configuration?.scope || operation.scope === configuration.scope);
  }

  async function putOperation(operation) {
    const database = await openDatabase();
    const transaction = database.transaction(operationStore, "readwrite");
    transaction.objectStore(operationStore).put(operation);
    await transactionPromise(transaction);
    return operation;
  }

  async function deleteOperation(id) {
    const database = await openDatabase();
    const transaction = database.transaction(operationStore, "readwrite");
    transaction.objectStore(operationStore).delete(id);
    await transactionPromise(transaction);
  }

  async function getMeta(key) {
    const database = await openDatabase();
    const transaction = database.transaction(metaStore, "readonly");
    const row = await requestPromise(transaction.objectStore(metaStore).get(key));
    await transactionPromise(transaction);
    return row?.value || "";
  }

  async function setMeta(key, value) {
    const database = await openDatabase();
    const transaction = database.transaction(metaStore, "readwrite");
    transaction.objectStore(metaStore).put({ key, value });
    await transactionPromise(transaction);
  }

  function scopeMetaKey(name) {
    return `${configuration?.scope || "global"}:${name}`;
  }

  async function recoverInterruptedOperations() {
    const operations = await getAllOperations();
    for (const operation of operations) {
      if (operation.status !== "uploading") continue;
      operation.status = "saved";
      operation.updatedAt = new Date().toISOString();
      operation.error = "";
      await putOperation(operation);
    }
  }

  async function requestPersistentStorage() {
    try {
      if (navigator.storage?.persist) await navigator.storage.persist();
    } catch {
      // IndexedDB still works when the browser does not grant persistence.
    }
  }

  async function initialize(options = {}) {
    configuration = {
      scope: String(options.scope || "global"),
      handlers: options.handlers || {},
      onChange: typeof options.onChange === "function" ? options.onChange : null
    };
    await openDatabase();
    await requestPersistentStorage();
    await recoverInterruptedOperations();
    bindControls();
    bindConnectivity();
    await refreshState();
    if (navigator.onLine !== false) queueMicrotask(() => syncNow());
    return latestState;
  }

  function bindConnectivity() {
    if (global.__punchLogicOfflineEventsBound) return;
    global.__punchLogicOfflineEventsBound = true;
    global.addEventListener("online", () => {
      refreshState();
      syncNow();
    });
    global.addEventListener("offline", refreshState);
    retryTimer = global.setInterval(() => {
      if (navigator.onLine !== false) syncNow();
      else refreshState();
    }, retryIntervalMs);
  }

  function bindControls() {
    document.querySelectorAll("[data-sync-button]").forEach((button) => {
      if (button.dataset.syncBound === "true") return;
      button.dataset.syncBound = "true";
      button.addEventListener("click", async () => {
        const state = await syncNow({ manual: true });
        if (state.failed && state.error) global.alert(state.error);
      });
    });
  }

  function mergePayload(existing, incoming) {
    if (existing?.kind === "item.patch") {
      return {
        ...existing.payload,
        ...incoming,
        patch: { ...(existing.payload?.patch || {}), ...(incoming?.patch || {}) }
      };
    }
    return { ...(existing || {}), ...(incoming || {}) };
  }

  async function enqueue(input = {}) {
    if (!configuration) throw new Error("Offline sync has not been initialized.");
    const now = new Date().toISOString();
    const operations = await getAllOperations();
    let operation = null;
    if (input.coalesceKey) {
      operation = operations.find((candidate) =>
        candidate.coalesceKey === input.coalesceKey && ["saved", "failed"].includes(candidate.status) && candidate.retryable !== false
      );
    }

    if (operation) {
      operation.payload = mergePayload(operation, input.payload || {});
      operation.dependsOn = [...new Set([...(operation.dependsOn || []), ...(input.dependsOn || [])])];
      operation.entityId = input.entityId || operation.entityId;
      operation.status = "saved";
      operation.retryable = true;
      operation.error = "";
      operation.updatedAt = now;
      operation.clientUpdatedAt = input.clientUpdatedAt || now;
    } else {
      operation = {
        id: input.id || createId(),
        scope: configuration.scope,
        kind: input.kind,
        entityType: input.entityType || "",
        entityId: input.entityId || "",
        coalesceKey: input.coalesceKey || "",
        payload: input.payload || {},
        dependsOn: input.dependsOn || [],
        baseUpdatedAt: input.baseUpdatedAt || "",
        clientUpdatedAt: input.clientUpdatedAt || now,
        status: "saved",
        retryable: true,
        attempts: 0,
        error: "",
        createdAt: now,
        updatedAt: now,
        syncedAt: "",
        result: null
      };
    }

    try {
      await putOperation(operation);
    } catch (error) {
      if (error?.name === "QuotaExceededError") throw new Error("This device does not have enough offline storage for that file.");
      throw error;
    }
    await refreshState();
    if (navigator.onLine !== false && !input.deferSync) queueMicrotask(() => syncNow());
    return operation;
  }

  async function discard(ids) {
    for (const id of Array.isArray(ids) ? ids : [ids]) {
      if (id) await deleteOperation(id);
    }
    return refreshState();
  }

  function dependencyState(operation, operationsById) {
    const dependencies = (operation.dependsOn || []).map((id) => operationsById.get(id)).filter(Boolean);
    if (dependencies.some((dependency) => dependency.status === "failed" && dependency.retryable === false)) return "failed";
    if (dependencies.some((dependency) => dependency.status !== "synced")) return "waiting";
    return "ready";
  }

  function normalizeSyncError(error) {
    const message = String(error?.message || "Sync failed.");
    const conflict = error?.code === "SYNC_CONFLICT" || /SYNC_CONFLICT|newer server change|stale/i.test(message);
    const permanent = conflict || error?.retryable === false || /invalid|not authorized|unauthorized|forbidden|unsupported|too large/i.test(message);
    return {
      message: conflict ? "A newer server change exists. Refresh before retrying this change." : message,
      retryable: !permanent,
      code: conflict ? "SYNC_CONFLICT" : String(error?.code || "")
    };
  }

  async function syncNow(options = {}) {
    if (!configuration || syncing) return latestState;
    if (navigator.onLine === false) {
      await refreshState();
      return latestState;
    }

    syncing = true;
    try {
      let operations = await getAllOperations();
      const operationsById = new Map(operations.map((operation) => [operation.id, operation]));
      const candidates = operations
        .filter((operation) => operation.status === "saved" || (operation.status === "failed" && operation.retryable !== false))
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

      for (const operation of candidates) {
        const dependency = dependencyState(operation, operationsById);
        if (dependency === "waiting") continue;
        if (dependency === "failed") {
          operation.status = "failed";
          operation.retryable = false;
          operation.error = "A required earlier change failed.";
          await putOperation(operation);
          continue;
        }

        const handler = configuration.handlers[operation.kind];
        if (typeof handler !== "function") {
          operation.status = "failed";
          operation.retryable = false;
          operation.error = `No sync handler is available for ${operation.kind}.`;
          await putOperation(operation);
          continue;
        }

        operation.status = "uploading";
        operation.attempts = Number(operation.attempts || 0) + 1;
        operation.updatedAt = new Date().toISOString();
        operation.error = "";
        await putOperation(operation);
        await refreshState();

        try {
          const result = await handler(operation);
          operation.status = "synced";
          operation.retryable = false;
          operation.result = result ?? null;
          operation.syncedAt = new Date().toISOString();
          operation.updatedAt = operation.syncedAt;
          await putOperation(operation);
          operationsById.set(operation.id, operation);
          await setMeta(scopeMetaKey("lastSyncAt"), operation.syncedAt);
        } catch (error) {
          const normalized = normalizeSyncError(error);
          operation.status = "failed";
          operation.retryable = normalized.retryable;
          operation.error = normalized.message;
          operation.errorCode = normalized.code;
          operation.updatedAt = new Date().toISOString();
          await putOperation(operation);
          operationsById.set(operation.id, operation);
          if (navigator.onLine === false) break;
        }
        await refreshState();
      }

      await cleanupSyncedOperations();
    } finally {
      syncing = false;
      await refreshState();
    }
    return latestState;
  }

  async function cleanupSyncedOperations() {
    const cutoff = Date.now() - syncedRetentionMs;
    const operations = await getAllOperations();
    for (const operation of operations) {
      if (operation.status !== "synced") continue;
      if (new Date(operation.syncedAt || operation.updatedAt || 0).getTime() >= cutoff) continue;
      await deleteOperation(operation.id);
    }
  }

  function formatLastSync(value) {
    if (!value) return "Last sync: not yet";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Last sync: not yet";
    return `Last sync: ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }

  async function refreshState() {
    if (!configuration) return latestState;
    const operations = await getAllOperations();
    const lastSyncAt = await getMeta(scopeMetaKey("lastSyncAt"));
    const uploading = operations.filter((operation) => operation.status === "uploading").length;
    const failedRows = operations.filter((operation) => operation.status === "failed");
    const saved = operations.filter((operation) => operation.status === "saved").length;
    const pending = uploading + saved + failedRows.length;
    let status = "synced";
    let label = "Synced";
    if (uploading) {
      status = "uploading";
      label = "Uploading";
    } else if (failedRows.length) {
      status = "failed";
      label = "Failed";
    } else if (saved) {
      status = "saved";
      label = "Saved on device";
    }

    latestState = {
      status,
      label,
      pending,
      failed: failedRows.length,
      uploading,
      lastSyncAt,
      online: navigator.onLine !== false,
      error: failedRows[0]?.error || ""
    };
    renderState(latestState);
    configuration.onChange?.(latestState, operations);
    global.dispatchEvent(new CustomEvent("punchlogic:sync-state", { detail: { state: latestState, operations } }));
    return latestState;
  }

  function renderState(state) {
    document.querySelectorAll("[data-sync-control]").forEach((control) => {
      control.dataset.syncState = state.status;
      control.dataset.online = String(state.online);
      control.title = state.error || (state.online ? state.label : `${state.label} - offline`);
    });
    document.querySelectorAll("[data-sync-status]").forEach((element) => { element.textContent = state.label; });
    document.querySelectorAll("[data-sync-last]").forEach((element) => { element.textContent = formatLastSync(state.lastSyncAt); });
    document.querySelectorAll("[data-sync-count]").forEach((element) => { element.textContent = state.pending ? String(state.pending) : ""; });
    document.querySelectorAll("[data-sync-button]").forEach((button) => {
      button.disabled = state.uploading > 0;
      button.setAttribute("aria-label", state.online ? "Sync saved changes" : "Offline - changes will sync when connected");
    });
  }

  async function getOperations(options = {}) {
    const operations = await getAllOperations();
    return operations.filter((operation) => {
      if (options.entityId && operation.entityId !== options.entityId) return false;
      if (options.kind && operation.kind !== options.kind) return false;
      if (options.pendingOnly && operation.status === "synced") return false;
      return true;
    });
  }

  function getState() {
    return { ...latestState };
  }

  global.PUNCH_LOGIC_OFFLINE_SYNC = {
    discard,
    enqueue,
    getOperations,
    getState,
    initialize,
    refreshState,
    syncNow
  };
})(window);
