import { FileText, ShieldCheck } from "lucide-react";
import { REVIEW_CRITERIA } from "../constants";
import { formatDateTime, getReviewChecklistDisplayValue } from "../utils";
import { ChecklistStatusItem, Field, Section } from "./ArtistRequestPrimitives";

const ReviewCriteriaCheckbox = ({ label, checked, disabled, onChange }) => {
  return (
    <label
      className={ `flex items-start gap-3 px-4 py-3 transition ${disabled
          ? "cursor-not-allowed bg-slate-50 opacity-70"
          : "cursor-pointer hover:bg-slate-50"
        }` }
    >
      <input
        type="checkbox"
        checked={ checked }
        disabled={ disabled }
        onChange={ (event) => onChange(event.target.checked) }
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 accent-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed"
      />

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{ label }</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          Tick nếu tiêu chí này đã đạt yêu cầu.
        </p>
      </div>
    </label>
  );
};

const ArtistRequestReviewSidebar = ({
  artistRequest,
  reviewForm,
  isSubmitting,
  isPending,
  isApproved,
  hasAllCriteriaApproved,
  onChecklistChange,
  onFieldChange,
  onApprove,
  onReject,
}) => {
  const showDecisionSection = !isApproved;
  const showReviewSummarySection = !isPending;
  const showChecklistSection = !isPending;

  const checkedCriteriaCount = REVIEW_CRITERIA.filter(
    (item) => reviewForm.checklist[item.key] === true
  ).length;

  const totalCriteriaCount = REVIEW_CRITERIA.length;
  const canApprove = !isSubmitting && !isApproved && hasAllCriteriaApproved;
  const canReject =
    !isSubmitting && !isApproved && reviewForm.rejectReason.trim();

  return (
    <div className="space-y-4">
      { showDecisionSection && (
        <Section title="Quyết định duyệt" icon={ ShieldCheck }>
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">
                Kiểm tra tiêu chí trước khi ra quyết định
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Tick vào những tiêu chí đã đạt. Hồ sơ chỉ có thể được duyệt khi
                tất cả tiêu chí đều đạt.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Tiêu chí đánh giá
                </p>

                <span className="text-xs font-medium text-slate-500">
                  { checkedCriteriaCount }/{ totalCriteriaCount } đã đạt
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                { REVIEW_CRITERIA.map((item) => (
                  <ReviewCriteriaCheckbox
                    key={ item.key }
                    label={ item.label }
                    checked={ reviewForm.checklist[item.key] === true }
                    disabled={ isSubmitting || isApproved }
                    onChange={ (checked) => onChecklistChange(item.key, checked) }
                  />
                )) }
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Ghi chú admin
              </label>

              <textarea
                value={ reviewForm.adminNote }
                onChange={ onFieldChange("adminNote") }
                rows={ 3 }
                disabled={ isSubmitting || isApproved }
                placeholder="Ghi chú nội bộ cho hồ sơ này..."
                className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500">
                Lý do từ chối
              </label>

              <textarea
                value={ reviewForm.rejectReason }
                onChange={ onFieldChange("rejectReason") }
                rows={ 3 }
                disabled={ isSubmitting || isApproved }
                placeholder="Nhập lý do nếu từ chối hồ sơ..."
                className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            { !hasAllCriteriaApproved && !isApproved && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-800">
                Hồ sơ chưa đạt đủ tiêu chí để duyệt. Bạn vẫn có thể từ chối hồ
                sơ và ghi rõ lý do.
              </div>
            ) }

            { hasAllCriteriaApproved && !isApproved && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-700">
                Tất cả tiêu chí đã đạt. Hồ sơ đã sẵn sàng để duyệt.
              </div>
            ) }

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={ onApprove }
                disabled={ !canApprove }
                className="h-11 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                { isSubmitting ? "Đang xử lý..." : "Duyệt hồ sơ" }
              </button>

              <button
                type="button"
                onClick={ onReject }
                disabled={ !canReject }
                className="h-11 rounded-md border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                { isSubmitting ? "Đang xử lý..." : "Từ chối hồ sơ" }
              </button>
            </div>
          </div>
        </Section>
      ) }

      { showReviewSummarySection && (
        <Section title="Tóm tắt duyệt" icon={ FileText }>
          <div className="space-y-3">
            <Field
              label="Người duyệt"
              value={
                artistRequest.reviewedBy?.profile?.fullName ||
                artistRequest.reviewedBy?.email
              }
            />

            <Field
              label="Ngày duyệt"
              value={ formatDateTime(artistRequest.reviewedAt) }
            />

            <Field
              label="Ghi chú admin"
              value={ artistRequest.review?.adminNote }
            />

            <Field
              label="Lý do từ chối"
              value={ artistRequest.rejectReason }
            />
          </div>
        </Section>
      ) }

      { showChecklistSection && (
        <Section title="Checklist duyệt" icon={ ShieldCheck }>
          <div className="space-y-2">
            { REVIEW_CRITERIA.map((item) => (
              <ChecklistStatusItem
                key={ item.key }
                label={ item.label }
                value={ getReviewChecklistDisplayValue(artistRequest, item.key) }
              />
            )) }
          </div>
        </Section>
      ) }
    </div>
  );
};

export default ArtistRequestReviewSidebar;