(function initPunchLogicReportOfflineSync(global) {
  function createClient(options = {}) {
    const queue = global.PUNCH_LOGIC_OFFLINE_SYNC;
    if (!queue) return null;

    const getReport = options.getReport;
    const render = options.render;

    function isConflict(operation) {
      return operation?.errorCode === "SYNC_CONFLICT" ||
        /newer server change|sync_conflict|stale/i.test(String(operation?.error || ""));
    }

    function buildRefreshUrl(operation) {
      const payload = operation?.payload || {};
      const reportId = payload.reportId || payload.id || "";
      const accessToken = payload.accessToken || payload.tradeKey || "";
      if (!reportId || !accessToken) return "";
      const url = new URL(options.endpoint, global.location.origin);
      url.searchParams.set("id", reportId);
      url.searchParams.set("access", accessToken);
      if (payload.tradeKey) url.searchParams.set("trade", payload.tradeKey);
      if (payload.tradeName) url.searchParams.set("tradeName", payload.tradeName);
      return url.toString();
    }

    async function refreshAuthoritativeReport(operation) {
      const refreshUrl = buildRefreshUrl(operation);
      if (!refreshUrl) return false;
      const response = await fetch(refreshUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return false;
      const latestReport = await response.json();
      const currentReport = getReport?.();
      if (!currentReport || !latestReport) return false;
      Object.keys(currentReport).forEach((key) => delete currentReport[key]);
      Object.assign(currentReport, latestReport);
      render?.();
      return true;
    }

    async function send(operation) {
      const operations = await queue.getOperations({ entityId: operation.entityId });
      const dependencyResults = operations
        .filter((candidate) => (operation.dependsOn || []).includes(candidate.id))
        .map((candidate) => candidate.result?.issue?.updatedAt || candidate.result?.updated_at || "")
        .filter(Boolean);
      const response = await fetch(options.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...operation.payload,
          mutationId: operation.id,
          baseUpdatedAt: dependencyResults[dependencyResults.length - 1] || operation.baseUpdatedAt || null,
          clientUpdatedAt: operation.clientUpdatedAt
        })
      });
      let result = {};
      try { result = await response.json(); } catch { /* Use the status message below. */ }
      if (!response.ok) {
        if (response.status === 409 && await refreshAuthoritativeReport(operation)) {
          return { ok: true, conflictResolved: true };
        }
        const error = new Error(result.error || `Sync failed with status ${response.status}.`);
        error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
        if (response.status === 409) error.code = "SYNC_CONFLICT";
        throw error;
      }
      applyServerResult(operation, result);
      return result;
    }

    function findIssue(issueId) {
      return (getReport()?.issues || []).find((issue) => issue.id === issueId);
    }

    function applyLocal(operation) {
      const issue = findIssue(operation.entityId || operation.payload?.issueId);
      if (!issue) return;
      const payload = operation.payload || {};
      if (payload.action === "setTradeCompleted" || payload.action === "setIssueCompleted") {
        issue.tradeCompleted = Boolean(payload.completed);
        issue.tradeCompletedAt = payload.completed ? operation.clientUpdatedAt : "";
        if (payload.action === "setIssueCompleted") {
          issue.completed = false;
          issue.completedAt = "";
        }
      } else if (payload.action === "updateIssueNote") {
        issue.sharedNote = String(payload.sharedNote || "").trim();
        issue.sharedNoteUpdatedAt = operation.clientUpdatedAt;
      } else if (payload.action === "addCompletionPhoto") {
        const localId = `local:${operation.id}`;
        if (!(issue.photos || []).some((photo) => photo.localOperationId === operation.id || photo.id === localId)) {
          issue.photos = [...(issue.photos || []), {
            ...payload.photo,
            id: localId,
            localOperationId: operation.id,
            completionProof: true,
            createdAt: operation.clientUpdatedAt
          }];
        }
      }
      issue.updatedAt = operation.clientUpdatedAt;
    }

    function applyServerResult(operation, result) {
      const issue = findIssue(operation.entityId || operation.payload?.issueId);
      if (!issue) return;
      if (result.issue) Object.assign(issue, result.issue);
      if (result.photo) {
        issue.photos = (issue.photos || []).filter((photo) => photo.localOperationId !== operation.id);
        if (!issue.photos.some((photo) => photo.id === result.photo.id)) issue.photos.push(result.photo);
      }
      issue.updatedAt = result.issue?.updatedAt || operation.clientUpdatedAt;
      const report = getReport();
      if (report) report.updatedAt = new Date().toISOString();
      render?.();
    }

    async function replayPending() {
      const operations = await queue.getOperations({ pendingOnly: true });
      const conflicts = operations.filter(isConflict);
      if (conflicts.length) {
        const refreshed = await refreshAuthoritativeReport(conflicts[conflicts.length - 1]).catch(() => false);
        if (refreshed) await queue.discard(conflicts.map((operation) => operation.id));
      }
      operations
        .filter((operation) => !isConflict(operation) && (operation.status !== "failed" || operation.retryable !== false))
        .forEach(applyLocal);
      if (operations.length && !conflicts.length) render?.();
    }

    async function enqueueMutation(payload, issue) {
      const clientUpdatedAt = new Date().toISOString();
      const pending = await queue.getOperations({ entityId: payload.issueId, pendingOnly: true });
      const coalesceKey = payload.action === "addCompletionPhoto" ? "" : `${payload.action}:${payload.issueId}`;
      const existingCoalesced = coalesceKey ? pending.find((operation) => operation.coalesceKey === coalesceKey && ["saved", "failed"].includes(operation.status)) : null;
      const previousMutation = existingCoalesced ? null : [...pending].reverse().find((operation) =>
        operation.kind === "report.mutation" &&
        operation.payload?.action !== "addCompletionPhoto" &&
        operation.coalesceKey !== coalesceKey
      );
      const operation = await queue.enqueue({
        kind: "report.mutation",
        entityType: payload.action === "addCompletionPhoto" ? "item_photo" : "punch_item",
        entityId: payload.issueId,
        coalesceKey,
        dependsOn: previousMutation && payload.action !== "addCompletionPhoto" ? [previousMutation.id] : [],
        baseUpdatedAt: issue?.updatedAt || issue?.createdAt || "",
        clientUpdatedAt,
        payload
      });
      applyLocal(operation);
      render?.();
      return operation;
    }

    const ready = queue.initialize({
      scope: options.scope,
      handlers: { "report.mutation": send }
    }).then(replayPending);

    return { enqueueMutation, ready, replayPending };
  }

  global.PUNCH_LOGIC_REPORT_OFFLINE_SYNC = { createClient };
})(window);
