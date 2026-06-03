import { FileText, ShieldCheck } from "lucide-react";
import { REVIEW_CRITERIA } from "../constants";
import { formatDateTime, getReviewChecklistDisplayValue } from "../utils";
import {
  ChecklistReviewItem,
  ChecklistStatusItem,
  Field,
  Section,
} from "./ArtistRequestPrimitives";

const ArtistRequestReviewSidebar = ({
  artistRequest,
  reviewForm,
  isSubmitting,
  isPending,
  isApproved,
  hasCompletedChecklist,
  hasAllCriteriaApproved,
  onChecklistChange,
  onFieldChange,
  onApprove,
  onReject,
}) => {
  const showDecisionSection = !isApproved;
  const showReviewSummarySection = !isPending && !isApproved;
  const showChecklistSection = !isPending;

  return (
    <div className="space-y-6">
      {showDecisionSection && (
        <Section title="Quyết định" icon={ShieldCheck}>
          <div className="space-y-4">
            <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
              Đánh giá đủ tất cả tiêu chí trước khi duyệt hoặc từ chối.
            </div>

            <div className="grid gap-3">
              {REVIEW_CRITERIA.map((item) => (
                <ChecklistReviewItem
                  key={item.key}
                  label={item.label}
                  value={reviewForm.checklist[item.key]}
                  onChange={(value) => onChecklistChange(item.key, value)}
                  disabled={isSubmitting || isApproved}
                />
              ))}
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Ghi chú admin
              </label>
              <textarea
                value={reviewForm.adminNote}
                onChange={onFieldChange("adminNote")}
                rows={2}
                disabled={isSubmitting || isApproved}
                placeholder="Ghi chú nội bộ"
                className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Lý do từ chối
              </label>
              <textarea
                value={reviewForm.rejectReason}
                onChange={onFieldChange("rejectReason")}
                rows={2}
                disabled={isSubmitting || isApproved}
                placeholder="Bắt buộc khi từ chối"
                className="mt-2 w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>

            {!hasCompletedChecklist && !isApproved && (
              <p className="text-sm text-amber-700">
                Cần đánh giá đủ tất cả tiêu chí trước khi gửi quyết định.
              </p>
            )}

            {hasCompletedChecklist && !hasAllCriteriaApproved && !isApproved && (
              <p className="text-sm text-slate-600">
                Hồ sơ chưa đạt đủ điều kiện để duyệt. Bạn vẫn có thể từ chối và
                ghi rõ lý do.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onApprove}
                disabled={
                  isSubmitting ||
                  isApproved ||
                  !hasCompletedChecklist ||
                  !hasAllCriteriaApproved
                }
                className="rounded-lg bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Duyệt hồ sơ"}
              </button>

              <button
                type="button"
                onClick={onReject}
                disabled={
                  isSubmitting ||
                  isApproved ||
                  !hasCompletedChecklist ||
                  !reviewForm.rejectReason.trim()
                }
                className="rounded-lg bg-rose-100 px-5 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Đang xử lý..." : "Từ chối hồ sơ"}
              </button>
            </div>
          </div>
        </Section>
      )}

      {showReviewSummarySection && (
        <Section title="Tóm tắt duyệt" icon={FileText}>
          <div className="space-y-5">
            <Field
              label="Người duyệt"
              value={
                artistRequest.reviewedBy?.profile?.fullName ||
                artistRequest.reviewedBy?.email
              }
            />
            <Field
              label="Ngày duyệt"
              value={formatDateTime(artistRequest.reviewedAt)}
            />
            <Field
              label="Ghi chú admin"
              value={artistRequest.review?.adminNote}
            />
            <Field
              label="Lý do từ chối"
              value={artistRequest.rejectReason}
            />
          </div>
        </Section>
      )}

      {showChecklistSection && (
        <Section title="Checklist duyệt" icon={ShieldCheck}>
          <div className="space-y-2">
            {REVIEW_CRITERIA.map((item) => (
              <ChecklistStatusItem
                key={item.key}
                label={item.label}
                value={getReviewChecklistDisplayValue(artistRequest, item.key)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default ArtistRequestReviewSidebar;
