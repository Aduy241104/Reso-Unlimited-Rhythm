import {
    normalizeCopyrightDeclaration,
    validateCopyrightForSubmit,
} from "../track/copyright.validation.service.js";

export const MODERATION_DECISIONS = Object.freeze({
    AUTO_CLEAR: "auto_clear",
    AUTO_REJECT: "auto_reject",
    MANUAL_REVIEW: "manual_review",
    MANUAL_REVIEW_HIGH: "manual_review_high",
    ENFORCEMENT_BLOCK: "enforcement_block",
});

export const MODERATION_PRIORITIES = Object.freeze({
    [MODERATION_DECISIONS.ENFORCEMENT_BLOCK]: 100,
    [MODERATION_DECISIONS.MANUAL_REVIEW_HIGH]: 80,
    [MODERATION_DECISIONS.MANUAL_REVIEW]: 50,
    [MODERATION_DECISIONS.AUTO_CLEAR]: 30,
    [MODERATION_DECISIONS.AUTO_REJECT]: 0,
});

const PERFECT_FINGERPRINT_SIMILARITY = 0.999999;
const PERFECT_FINGERPRINT_OVERLAP = 0.99;

const unique = (values = []) => [...new Set(values.filter(Boolean))];

const asPlainObject = (value) => {
    if (value && typeof value.toObject === "function") return value.toObject();
    return value && typeof value === "object" ? value : {};
};

export const isPerfectFingerprintMatch = (match) => Boolean(
    match?.matchType === "chromaprint" &&
    Number(match.similarityScore || 0) >= PERFECT_FINGERPRINT_SIMILARITY &&
    Number(match.overlapRatio || 0) >= PERFECT_FINGERPRINT_OVERLAP
);

const DUPLICATE_REJECTION_CODES = new Set([
    "SAME_ARTIST_EXACT_DUPLICATE",
    "APPROVED_EXACT_CONFLICT_NO_EVIDENCE",
    "SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE",
    "APPROVED_PERFECT_FINGERPRINT_DUPLICATE",
]);

export const isDuplicateAutomaticRejection = (decision) => (
    decision?.decision === MODERATION_DECISIONS.AUTO_REJECT &&
    (decision?.reasonCodes || []).some((code) => DUPLICATE_REJECTION_CODES.has(code))
);

export const getAutomaticRejectionReason = (decision) => {
    const reasonCodes = new Set(decision?.reasonCodes || []);
    if (reasonCodes.has("SAME_ARTIST_EXACT_DUPLICATE") || reasonCodes.has("SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE")) {
        return "Bản ghi âm trùng với một bài hát đã phát hành khác của cùng nghệ sĩ. Bài hát bị từ chối tự động; vui lòng sử dụng bản ghi âm hoặc phiên bản khác rồi gửi lại.";
    }
    if ([...DUPLICATE_REJECTION_CODES].some((code) => reasonCodes.has(code))) {
        return "Bản ghi âm trùng với một bài hát đã phát hành trong hệ thống. Bài hát bị từ chối tự động; vui lòng bổ sung bản ghi âm có quyền sử dụng hợp lệ hoặc gửi một phiên bản khác.";
    }
    if (reasonCodes.has("AUDIO_OR_METADATA_INVALID")) {
        return "Audio hoặc thông tin bài hát chưa hợp lệ. Vui lòng bổ sung lại trước khi gửi duyệt.";
    }
    if ([...reasonCodes].some((code) => String(code).includes("COPYRIGHT") || String(code).includes("EVIDENCE") || String(code).includes("DECLARATION"))) {
        return "Hồ sơ bản quyền chưa đủ hoặc có thông tin mâu thuẫn. Vui lòng bổ sung và gửi lại.";
    }
    return String(decision?.summary || "Hồ sơ hiện tại chưa đủ thông tin để tiếp tục duyệt. Vui lòng bổ sung và gửi lại.");
};

const LEGACY_GENERIC_REJECTION_REASON = "Hồ sơ hiện tại chưa đủ thông tin để tiếp tục duyệt. Vui lòng bổ sung và gửi lại.";

export const getDisplayRejectionReason = (currentReason, decision) => {
    const normalizedReason = String(currentReason || "").trim();
    if (
        decision?.decision === MODERATION_DECISIONS.AUTO_REJECT &&
        (!normalizedReason || normalizedReason === LEGACY_GENERIC_REJECTION_REASON)
    ) {
        return getAutomaticRejectionReason(decision);
    }
    return currentReason || "";
};

export const getCandidateContext = (track) => {
    if (!track || track.isDeleted === true || track.approvalStatus === "rejected") {
        return "historical_deleted";
    }
    if (track.approvalStatus === "pending" || track.pendingUpdate?.status === "pending") {
        return "pending";
    }
    if (track.approvalStatus === "draft") return "draft";
    if (track.approvalStatus === "approved" && track.activeStatus !== "blocked") {
        return "approved_active";
    }
    return "historical_deleted";
};

export const hasValidCopyrightEvidence = (copyright = {}) => {
    const source = asPlainObject(copyright);
    const urls = Array.isArray(source.licenseDocumentUrls)
        ? source.licenseDocumentUrls.filter((url) => String(url || "").trim())
        : [];
    const documents = Array.isArray(source.copyrightEvidenceDocuments)
        ? source.copyrightEvidenceDocuments.filter((document) => (
            document?.uploadStatus === "uploaded" && Boolean(
                document?.sha256 ||
                document?.storageUrl ||
                document?.url ||
                document?.publicId
            )
        ))
        : [];
    return urls.length > 0 || documents.length > 0;
};

const mapCopyrightValidationCode = (code, field, primary, source) => {
    if (code === "CONFLICTING_TYPES" || field === "copyright.primaryCopyrightType") {
        return "CONTRADICTORY_DECLARATION";
    }
    if (primary === "cover" && ["originalTrackTitle", "originalArtistName"].some((name) => field.endsWith(name))) {
        return "COVER_MISSING_ORIGINAL_WORK";
    }
    if (primary === "remix" && ["originalTrackTitle", "originalArtistName", "copyrightEvidenceDocuments"].some((name) => field.endsWith(name))) {
        return "REMIX_MISSING_RIGHTS";
    }
    if (source.usesSample === true && field.includes("copyrightEvidenceDocuments")) {
        return "SAMPLE_MISSING_CLEARANCE";
    }
    if (source.usesThirdPartyBeat === true && (
        field.includes("license") ||
        field.includes("beat") ||
        field.includes("copyrightEvidenceDocuments")
    )) {
        return "LICENSED_BEAT_MISSING_LICENSE";
    }
    if (code === "EVIDENCE_REQUIRED") {
        if (primary === "cover") return "COVER_MISSING_ORIGINAL_WORK";
        if (primary === "remix") return "REMIX_MISSING_RIGHTS";
        if (source.usesSample === true) return "SAMPLE_MISSING_CLEARANCE";
        if (source.usesThirdPartyBeat === true) return "LICENSED_BEAT_MISSING_LICENSE";
        return "MISSING_COPYRIGHT_EVIDENCE";
    }
    return "MISSING_COPYRIGHT_DECLARATION";
};

export const assessCopyrightDeclaration = (copyright = {}) => {
    const source = asPlainObject(copyright);
    const normalized = normalizeCopyrightDeclaration(source);
    try {
        validateCopyrightForSubmit(source);
        return {
            valid: true,
            normalized,
            hasEvidence: hasValidCopyrightEvidence(normalized),
            reasonCodes: [],
        };
    } catch (error) {
        const details = Array.isArray(error?.details) ? error.details : [];
        const reasonCodes = unique(details.map((detail) => mapCopyrightValidationCode(
            detail?.code,
            String(detail?.field || ""),
            normalized.primaryCopyrightType,
            normalized,
        )));
        return {
            valid: false,
            normalized,
            hasEvidence: hasValidCopyrightEvidence(normalized),
            reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["MISSING_COPYRIGHT_DECLARATION"],
            validationError: error,
        };
    }
};

const providerUnavailable = (result) => Boolean(
    result?.providerUnavailable ||
    result?.status === "unavailable" ||
    (result?.status === "failed" && Array.isArray(result?.reasonCodes) && result.reasonCodes.some((code) => (
        String(code).includes("timeout") ||
        String(code).includes("unavailable") ||
        String(code).includes("lookup_failed") ||
        String(code).includes("missing_api_key") ||
        String(code).includes("disabled") ||
        String(code).includes("api_") ||
        String(code).includes("http_")
    )))
);

const isStrongAcoustIdConflict = (result) => Boolean(
    result &&
    !providerUnavailable(result) &&
    (result.decision === "blocked" || (
        result.status === "matched" &&
        Number(result.score || 0) >= 0.95 &&
        result.comparison?.artistMatch === false
    ))
);

const isStrongMusicBrainzConflict = (result) => Boolean(
    result &&
    !providerUnavailable(result) &&
    Number(result.confidence || 0) >= 0.85 &&
    Array.isArray(result.flags) &&
    result.flags.some((flag) => ["possible_existing_work", "external_metadata_conflict"].includes(flag))
);

const result = (decision, reasonCodes, summary) => ({
    decision,
    priority: MODERATION_PRIORITIES[decision],
    reasonCodes: unique(reasonCodes),
    summary,
});

const evaluateModerationDecisionLegacy = ({
    fingerprint = {},
    content = {},
    copyright = {},
    exactCandidate = null,
    perfectCandidate = null,
    highMatch = null,
    reviewMatch = null,
    acoustId = null,
    musicBrainz = null,
    enforcementEvidence = null,
} = {}) => {
    if (enforcementEvidence) {
        return result(
            MODERATION_DECISIONS.ENFORCEMENT_BLOCK,
            ["CONFIRMED_FINGERPRINT_BLOCKLIST"],
            "Bản ghi âm trùng với fingerprint enforcement/blocklist đã được xác nhận.",
        );
    }

    if (fingerprint.complete !== true || fingerprint.status !== "completed") {
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["FINGERPRINT_INCOMPLETE"],
            "Chưa đủ dữ liệu fingerprint để đưa ra quyết định tự động.",
        );
    }

    const declaration = assessCopyrightDeclaration(copyright);
    if (!declaration.valid) {
        return result(
            MODERATION_DECISIONS.AUTO_REJECT,
            declaration.reasonCodes,
            "Hồ sơ bản quyền chưa đủ hoặc có khai báo mâu thuẫn; cần trả về để nghệ sĩ bổ sung.",
        );
    }

    if (content.audioValid === false || content.metadataValid === false) {
        return result(
            MODERATION_DECISIONS.AUTO_REJECT,
            ["AUDIO_OR_METADATA_INVALID"],
            "Audio hoặc metadata hiện tại chưa hợp lệ để tiếp tục duyệt.",
        );
    }

    const primary = declaration.normalized.primaryCopyrightType;
    const candidateContext = exactCandidate?.candidateContext || getCandidateContext(exactCandidate?.candidateTrack);
    const sameArtist = Boolean(exactCandidate?.sameArtist);

    if (exactCandidate && candidateContext !== "historical_deleted") {
        if (candidateContext === "pending") {
            return result(
                MODERATION_DECISIONS.MANUAL_REVIEW_HIGH,
                ["PENDING_EXACT_DUPLICATE"],
                "Có bản ghi đang chờ duyệt sử dụng cùng audio; cần xác minh quyền sở hữu thủ công.",
            );
        }
        if (candidateContext === "draft") {
            // Draft/draft is not an ownership conclusion. Continue with the
            // other signals instead of turning an artist's work-in-progress
            // into a copyright finding.
        } else if (sameArtist && candidateContext === "approved_active") {
            return result(
                MODERATION_DECISIONS.AUTO_REJECT,
                ["SAME_ARTIST_EXACT_DUPLICATE"],
                "Audio trùng hoàn toàn với một Track khác của cùng nghệ sĩ; cần gửi lại dưới dạng version/update hợp lệ.",
            );
        } else if (candidateContext === "approved_active") {
            if (declaration.hasEvidence) {
                return result(
                    MODERATION_DECISIONS.MANUAL_REVIEW_HIGH,
                    ["APPROVED_EXACT_CONFLICT_WITH_EVIDENCE"],
                    "Audio trùng với Track đã được duyệt của nghệ sĩ khác và có bằng chứng quyền sử dụng; cần Admin xác minh.",
                );
            }
            return result(
                MODERATION_DECISIONS.AUTO_REJECT,
                ["APPROVED_EXACT_CONFLICT_NO_EVIDENCE"],
                "Audio trùng với Track đã được duyệt của nghệ sĩ khác nhưng chưa có bằng chứng quyền sử dụng.",
            );
        }
    }

    const perfectCandidateContext = perfectCandidate?.candidateContext || getCandidateContext(perfectCandidate?.candidateTrack);
    const perfectCandidateSameArtist = Boolean(perfectCandidate?.sameArtist);
    if (perfectCandidate && perfectCandidateContext !== "historical_deleted" && perfectCandidateContext !== "draft") {
        if (perfectCandidateContext === "pending") {
            return result(
                MODERATION_DECISIONS.MANUAL_REVIEW_HIGH,
                ["PENDING_PERFECT_FINGERPRINT_DUPLICATE"],
                "Fingerprint Chromaprint trùng hoàn toàn với một bản ghi đang chờ duyệt; cần xác minh thứ tự và quyền sở hữu.",
            );
        }
        if (perfectCandidateContext === "approved_active") {
            if (perfectCandidateSameArtist) {
                return result(
                    MODERATION_DECISIONS.AUTO_REJECT,
                    ["SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE"],
                    "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành của cùng nghệ sĩ; bài hát bị từ chối tự động.",
                );
            }
            if (declaration.hasEvidence) {
                return result(
                    MODERATION_DECISIONS.MANUAL_REVIEW_HIGH,
                    ["APPROVED_PERFECT_FINGERPRINT_WITH_EVIDENCE"],
                    "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành và hồ sơ có bằng chứng quyền sử dụng; cần Admin xác minh.",
                );
            }
            return result(
                MODERATION_DECISIONS.AUTO_REJECT,
                ["APPROVED_PERFECT_FINGERPRINT_DUPLICATE"],
                "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành; bài hát bị từ chối tự động.",
            );
        }
    }

    if (highMatch) {
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["HIGH_SIMILARITY_NO_EXACT_DUPLICATE"],
            "Fingerprint có độ tương đồng cao nhưng chưa xác định là cùng file; cần kiểm tra thủ công.",
        );
    }
    if (reviewMatch) {
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["SIMILARITY_REQUIRES_REVIEW"],
            "Fingerprint có tín hiệu tương đồng cần Admin kiểm tra thêm.",
        );
    }

    if (isStrongAcoustIdConflict(acoustId)) {
        if (primary === "original" && !declaration.hasEvidence) {
            return result(
                MODERATION_DECISIONS.AUTO_REJECT,
                ["ACOUSTID_STRONG_EXTERNAL_MISMATCH"],
                "AcoustID nhận diện mạnh một bản ghi khác với khai báo original và hồ sơ chưa có bằng chứng phù hợp.",
            );
        }
        if (["cover", "remix"].includes(primary) && declaration.hasEvidence) {
            return result(
                MODERATION_DECISIONS.MANUAL_REVIEW,
                ["ACOUSTID_DECLARED_DERIVATIVE_WITH_EVIDENCE"],
                "AcoustID nhận diện bản ghi gốc của Cover/Remix; cần kiểm tra bằng chứng quyền sử dụng.",
            );
        }
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["ACOUSTID_STRONG_CONFLICT"],
            "AcoustID có xung đột mạnh với khai báo; cần Admin xác minh.",
        );
    }

    if (isStrongMusicBrainzConflict(musicBrainz)) {
        if (primary === "original" && !declaration.hasEvidence) {
            return result(
                MODERATION_DECISIONS.AUTO_REJECT,
                ["MUSICBRAINZ_STRONG_EXTERNAL_MISMATCH"],
                "MusicBrainz có xung đột metadata mạnh với khai báo original và hồ sơ chưa có bằng chứng phù hợp.",
            );
        }
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["MUSICBRAINZ_EXTERNAL_CONFLICT"],
            "MusicBrainz chỉ cung cấp dữ liệu tham khảo nhưng phát hiện xung đột cần Admin kiểm tra.",
        );
    }

    if (!providerUnavailable(acoustId) && acoustId?.status === "possible_match") {
        return result(
            MODERATION_DECISIONS.MANUAL_REVIEW,
            ["ACOUSTID_POSSIBLE_MATCH"],
            "AcoustID có kết quả tương đồng chưa đủ mạnh để kết luận; cần kiểm tra thủ công.",
        );
    }

    return result(
        MODERATION_DECISIONS.AUTO_CLEAR,
        ["FINGERPRINT_CLEAN", "COPYRIGHT_DECLARATION_VALID"],
        "Fingerprint và hồ sơ hiện tại không có tín hiệu cần chặn tự động; chuyển Admin duyệt nhanh.",
    );
};

export const evaluateModerationDecision = ({
    fingerprint = {},
    content = {},
    copyright = {},
    exactCandidate = null,
    perfectCandidate = null,
    highMatch = null,
    reviewMatch = null,
    acoustId = null,
    musicBrainz = null,
    enforcementEvidence = null,
} = {}) => {
    const decisionRank = {
        [MODERATION_DECISIONS.AUTO_CLEAR]: 0,
        [MODERATION_DECISIONS.MANUAL_REVIEW]: 1,
        [MODERATION_DECISIONS.MANUAL_REVIEW_HIGH]: 2,
        [MODERATION_DECISIONS.AUTO_REJECT]: 3,
        [MODERATION_DECISIONS.ENFORCEMENT_BLOCK]: 4,
    };
    const riskRank = { none: 0, low: 1, medium: 2, high: 3 };
    let selectedDecision = null;
    let selectedSummary = "";
    let selectedRiskLevel = "none";
    const reasonCodes = [];

    const addSignal = (decision, codes, summary, riskLevel = "none") => {
        reasonCodes.push(...codes);
        if (riskRank[riskLevel] > riskRank[selectedRiskLevel]) selectedRiskLevel = riskLevel;
        if (!selectedDecision || decisionRank[decision] > decisionRank[selectedDecision]) {
            selectedDecision = decision;
            selectedSummary = summary;
        }
    };

    if (enforcementEvidence) {
        return {
            decision: MODERATION_DECISIONS.ENFORCEMENT_BLOCK,
            priority: MODERATION_PRIORITIES[MODERATION_DECISIONS.ENFORCEMENT_BLOCK],
            reasonCodes: ["CONFIRMED_FINGERPRINT_BLOCKLIST"],
            summary: "Bản ghi âm trùng với fingerprint enforcement/blocklist đã được xác nhận.",
            riskLevel: "high",
        };
    }

    if (fingerprint.complete !== true || fingerprint.status !== "completed") {
        return {
            decision: MODERATION_DECISIONS.MANUAL_REVIEW,
            priority: MODERATION_PRIORITIES[MODERATION_DECISIONS.MANUAL_REVIEW],
            reasonCodes: ["FINGERPRINT_INCOMPLETE"],
            summary: "Chưa đủ dữ liệu fingerprint để đưa ra quyết định tự động.",
            riskLevel: "high",
        };
    }

    const declaration = assessCopyrightDeclaration(copyright);
    if (!declaration.valid) {
        return {
            decision: MODERATION_DECISIONS.AUTO_REJECT,
            priority: MODERATION_PRIORITIES[MODERATION_DECISIONS.AUTO_REJECT],
            reasonCodes: declaration.reasonCodes,
            summary: "Hồ sơ bản quyền chưa đủ hoặc có khai báo mâu thuẫn; cần trả về để nghệ sĩ bổ sung.",
            riskLevel: "high",
        };
    }

    if (content.audioValid === false || content.metadataValid === false) {
        return {
            decision: MODERATION_DECISIONS.AUTO_REJECT,
            priority: MODERATION_PRIORITIES[MODERATION_DECISIONS.AUTO_REJECT],
            reasonCodes: ["AUDIO_OR_METADATA_INVALID"],
            summary: "Audio hoặc metadata hiện tại chưa hợp lệ để tiếp tục duyệt.",
            riskLevel: "high",
        };
    }

    const primary = declaration.normalized.primaryCopyrightType;
    const candidateContext = exactCandidate?.candidateContext || getCandidateContext(exactCandidate?.candidateTrack);
    if (exactCandidate && candidateContext !== "historical_deleted") {
        if (candidateContext === "pending") {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["PENDING_EXACT_DUPLICATE"], "Có bản ghi đang chờ duyệt sử dụng cùng audio; cần xác minh quyền sở hữu thủ công.", "high");
        } else if (candidateContext === "approved_active" && exactCandidate.sameArtist) {
            addSignal(MODERATION_DECISIONS.AUTO_REJECT, ["SAME_ARTIST_EXACT_DUPLICATE"], "Audio trùng hoàn toàn với một Track khác của cùng nghệ sĩ; cần gửi lại dưới dạng version/update hợp lệ.", "high");
        } else if (candidateContext === "approved_active" && declaration.hasEvidence) {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["APPROVED_EXACT_CONFLICT_WITH_EVIDENCE"], "Audio trùng với Track đã được duyệt của nghệ sĩ khác và có bằng chứng quyền sử dụng; cần Admin xác minh.", "high");
        } else if (candidateContext === "approved_active") {
            addSignal(MODERATION_DECISIONS.AUTO_REJECT, ["APPROVED_EXACT_CONFLICT_NO_EVIDENCE"], "Audio trùng với Track đã được duyệt nhưng chưa có bằng chứng quyền sử dụng.", "high");
        }
    }

    const perfectCandidateContext = perfectCandidate?.candidateContext || getCandidateContext(perfectCandidate?.candidateTrack);
    if (perfectCandidate && perfectCandidateContext !== "historical_deleted" && perfectCandidateContext !== "draft") {
        if (perfectCandidateContext === "pending") {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["PENDING_PERFECT_FINGERPRINT_DUPLICATE"], "Fingerprint Chromaprint trùng hoàn toàn với bản ghi đang chờ duyệt; cần xác minh thứ tự và quyền sở hữu.", "high");
        } else if (perfectCandidateContext === "approved_active" && perfectCandidate.sameArtist) {
            addSignal(MODERATION_DECISIONS.AUTO_REJECT, ["SAME_ARTIST_PERFECT_FINGERPRINT_DUPLICATE"], "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành của cùng nghệ sĩ; bài hát bị từ chối tự động.", "high");
        } else if (perfectCandidateContext === "approved_active" && declaration.hasEvidence) {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["APPROVED_PERFECT_FINGERPRINT_WITH_EVIDENCE"], "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành nhưng hồ sơ có bằng chứng quyền sử dụng; cần Admin xác minh.", "high");
        } else if (perfectCandidateContext === "approved_active") {
            addSignal(MODERATION_DECISIONS.AUTO_REJECT, ["APPROVED_PERFECT_FINGERPRINT_DUPLICATE"], "Fingerprint Chromaprint trùng hoàn toàn với Track đã phát hành; bài hát bị từ chối tự động.", "high");
        }
    }

    if (highMatch) {
        addSignal(MODERATION_DECISIONS.MANUAL_REVIEW, ["HIGH_SIMILARITY_NO_EXACT_DUPLICATE"], "Fingerprint có độ tương đồng cao nhưng chưa xác định là cùng file; cần kiểm tra thủ công.", "high");
    } else if (reviewMatch) {
        addSignal(MODERATION_DECISIONS.MANUAL_REVIEW, ["SIMILARITY_REQUIRES_REVIEW"], "Fingerprint có tín hiệu tương đồng cần Admin kiểm tra thêm.", "medium");
    }

    const acoustIdentity = Boolean(
        acoustId?.acoustIdTrackId ||
        acoustId?.match?.mbid ||
        acoustId?.recording?.mbid ||
        acoustId?.musicBrainzRecordingIds?.length
    );
    const acoustScore = Number(acoustId?.score || 0) > 1
        ? Number(acoustId.score) / 100
        : Number(acoustId?.score || 0);
    const acoustUnavailable = providerUnavailable(acoustId);
    const acoustStrongConflict = Boolean(
        acoustId && !acoustUnavailable && acoustIdentity && (
            acoustId.decision === "blocked" || (
                acoustId.status === "matched" &&
                acoustScore >= 0.95 &&
                acoustId.comparison?.artistMatch === false
            )
        )
    );
    if (acoustStrongConflict) {
        if (primary === "original" && !declaration.hasEvidence) {
            addSignal(MODERATION_DECISIONS.AUTO_REJECT, ["ACOUSTID_STRONG_EXTERNAL_MISMATCH"], "AcoustID nhận diện mạnh một bản ghi khác với khai báo original và hồ sơ chưa có bằng chứng phù hợp.", "high");
        } else if (["cover", "remix"].includes(primary) && declaration.hasEvidence) {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["ACOUSTID_DECLARED_DERIVATIVE_WITH_EVIDENCE"], "AcoustID nhận diện bản ghi gốc của Cover/Remix; cần kiểm tra bằng chứng quyền sử dụng.", "high");
        } else {
            addSignal(MODERATION_DECISIONS.MANUAL_REVIEW_HIGH, ["ACOUSTID_STRONG_CONFLICT"], "AcoustID có xung đột mạnh với khai báo; cần Admin xác minh.", "high");
        }
    } else if (acoustId && !acoustUnavailable && acoustScore >= 0.85 && !acoustIdentity) {
        addSignal(MODERATION_DECISIONS.MANUAL_REVIEW, ["ACOUSTID_HIGH_SCORE_WITHOUT_IDENTITY"], "Điểm đối chiếu cao nhưng chưa xác định được bản ghi; cần kiểm tra thủ công.", "medium");
    } else if (acoustId && !acoustUnavailable && acoustId.status === "possible_match") {
        addSignal(MODERATION_DECISIONS.MANUAL_REVIEW, ["ACOUSTID_POSSIBLE_MATCH"], "AcoustID có kết quả tương đồng chưa đủ mạnh để kết luận; cần kiểm tra thủ công.", "medium");
    }

    const musicBrainzUnavailable = providerUnavailable(musicBrainz);
    const musicBrainzComparison = musicBrainz?.comparison || {};
    const musicBrainzArtistMismatch = musicBrainzComparison.artistMatch !== null
        && musicBrainzComparison.artistMatch !== undefined
        && Number(musicBrainzComparison.artistMatch) < 0.5;
    const musicBrainzRecordingMismatch = [
        musicBrainzComparison.titleMatch,
        musicBrainzComparison.durationMatch,
        musicBrainzComparison.isrcMatch,
        musicBrainzComparison.iswcMatch,
    ].some((value) => value !== null && value !== undefined && Number(value) < 0.5);
    const musicBrainzExplicitCodes = Array.isArray(musicBrainz?.reasonCodes) ? musicBrainz.reasonCodes : [];
    const musicBrainzFlaggedConflict = Array.isArray(musicBrainz?.flags) && musicBrainz.flags.some((flag) => (
        ["possible_existing_work", "external_metadata_conflict"].includes(flag)
    ));
    const musicBrainzHasConflict = Boolean(
        musicBrainz &&
        !musicBrainzUnavailable &&
        musicBrainz.status !== "not_found" &&
        (musicBrainzArtistMismatch || musicBrainzRecordingMismatch || musicBrainzFlaggedConflict || musicBrainzExplicitCodes.some((code) => String(code).startsWith("MUSICBRAINZ_")))
    );
    if (musicBrainzHasConflict) {
        const musicBrainzSimilarityRaw = Number(musicBrainz?.metadataSimilarity ?? musicBrainz?.confidence ?? 0);
        const musicBrainzSimilarity = musicBrainzSimilarityRaw > 1 ? musicBrainzSimilarityRaw / 100 : musicBrainzSimilarityRaw;
        const strongMusicBrainz = musicBrainzSimilarity >= 0.85 || musicBrainzExplicitCodes.includes("MUSICBRAINZ_STRONG_METADATA_CONFLICT");
        const musicBrainzCodes = [
            ...musicBrainzExplicitCodes,
            ...(musicBrainzArtistMismatch ? ["MUSICBRAINZ_ARTIST_MISMATCH"] : []),
            ...(musicBrainzRecordingMismatch ? ["MUSICBRAINZ_RECORDING_MISMATCH"] : []),
            strongMusicBrainz ? "MUSICBRAINZ_STRONG_METADATA_CONFLICT" : "MUSICBRAINZ_METADATA_CONFLICT",
        ];
        addSignal(
            strongMusicBrainz ? MODERATION_DECISIONS.MANUAL_REVIEW_HIGH : MODERATION_DECISIONS.MANUAL_REVIEW,
            musicBrainzCodes,
            "MusicBrainz phát hiện metadata cần kiểm tra. Kết quả này không tự xác nhận vi phạm bản quyền nhưng làm tăng rủi ro của hồ sơ.",
            strongMusicBrainz ? "high" : "medium",
        );
    }

    const providerPending = [acoustId, musicBrainz].some((provider) => !provider || provider.status === "pending");
    if (providerPending && !selectedDecision) {
        addSignal(MODERATION_DECISIONS.MANUAL_REVIEW, ["EXTERNAL_VERIFICATION_PENDING"], "Đang chờ hoàn tất đối chiếu AcoustID và MusicBrainz trước khi kết luận.", "medium");
    }

    if (selectedDecision) {
        return {
            decision: selectedDecision,
            priority: MODERATION_PRIORITIES[selectedDecision],
            reasonCodes: unique(reasonCodes),
            summary: selectedSummary,
            riskLevel: selectedRiskLevel,
        };
    }

    return {
        decision: MODERATION_DECISIONS.AUTO_CLEAR,
        priority: MODERATION_PRIORITIES[MODERATION_DECISIONS.AUTO_CLEAR],
        reasonCodes: ["FINGERPRINT_CLEAN", "COPYRIGHT_DECLARATION_VALID"],
        summary: "Fingerprint, hồ sơ bản quyền và các tín hiệu đối chiếu hiện tại không có xung đột cần chặn tự động; chuyển Admin duyệt nhanh.",
        riskLevel: "none",
    };
};

export default {
    MODERATION_DECISIONS,
    MODERATION_PRIORITIES,
    assessCopyrightDeclaration,
    evaluateModerationDecision,
    getCandidateContext,
    hasValidCopyrightEvidence,
};
