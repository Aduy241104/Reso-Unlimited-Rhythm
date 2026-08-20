const getHandledById = (handledBy) => {
  if (!handledBy) return "";
  if (typeof handledBy === "string") return handledBy;
  return handledBy._id || handledBy.id || handledBy.email || "";
};

const getNormalizedHandledAt = (handledAt, fallbackValue) => {
  const value = handledAt || fallbackValue;
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
};

const getResolutionBatchKey = (report) => {
  if (report?.resolutionBatchId) {
    return `batch:${report.resolutionBatchId}`;
  }

  const handledAt = getNormalizedHandledAt(report?.handledAt, report?.updatedAt || report?.createdAt);
  const handledById = getHandledById(report?.handledBy);
  const resolution = report?.resolution || report?.status || "";
  const note = String(report?.resolutionNote || "").trim();

  return `legacy:${handledAt}:${handledById}:${resolution}:${note}`;
};

export const normalizeResolutionNote = (note) => {
  const trimmedNote = String(note || "").trim();
  if (!trimmedNote) {
    return "";
  }

  const legacyAutoTitlePattern = /^(Báo cáo vi phạm đối với .+?):\s*\d+$/u;
  const matched = trimmedNote.match(legacyAutoTitlePattern);

  if (matched?.[1]) {
    return matched[1];
  }

  return trimmedNote;
};

export const groupProcessedReportsByBatch = (reports = []) => {
  const batches = new Map();

  reports.forEach((report) => {
    const batchKey = getResolutionBatchKey(report);
    const handledTime = new Date(report?.handledAt || report?.updatedAt || report?.createdAt || 0).getTime();

    if (!batches.has(batchKey)) {
      batches.set(batchKey, {
        batchKey,
        resolutionBatchId: report?.resolutionBatchId || "",
        handledAt: report?.handledAt || report?.updatedAt || report?.createdAt || null,
        handledBy: report?.handledBy || null,
        resolution: report?.resolution || "",
        resolutionNote: normalizeResolutionNote(report?.resolutionNote || ""),
        status: report?.status || "",
        reports: [],
        latestHandledTime: handledTime,
      });
    }

    const batch = batches.get(batchKey);
    batch.reports.push(report);

    if (handledTime > batch.latestHandledTime) {
      batch.handledAt = report?.handledAt || report?.updatedAt || report?.createdAt || batch.handledAt;
      batch.handledBy = report?.handledBy || batch.handledBy;
      batch.resolution = report?.resolution || batch.resolution;
      batch.resolutionNote = normalizeResolutionNote(report?.resolutionNote || "") || batch.resolutionNote;
      batch.status = report?.status || batch.status;
      batch.latestHandledTime = handledTime;
    }
  });

  return Array.from(batches.values())
    .map((batch) => {
      const sortedReports = [...batch.reports].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.handledAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.handledAt || 0).getTime();
        return timeB - timeA;
      });

      return {
        ...batch,
        reports: sortedReports,
        reportCount: sortedReports.length,
        validReportCount: sortedReports.filter((report) => report.isValidReason === true).length,
      };
    })
    .sort((a, b) => b.latestHandledTime - a.latestHandledTime);
};
