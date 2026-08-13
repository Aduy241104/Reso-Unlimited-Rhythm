import { useState } from "react";
import trackService from "../../services/trackService";
import { getApiErrorFullMessage } from "../../utils/apiError";

const TrackReviewAppealModal = ({ track, reviewTarget = "track_submission", onClose, onCreated }) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (message.trim().length < 10 || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const evidenceDocuments = files.length > 0
        ? await trackService.uploadTrackReviewAppealEvidence(track._id, files)
        : [];
      const appeal = await trackService.createTrackReviewAppeal(track._id, {
        reviewTarget,
        message: message.trim(),
        evidenceDocuments,
      });
      onCreated?.(appeal);
    } catch (requestError) {
      setError(getApiErrorFullMessage(requestError, "Không thể gửi phản hồi quyết định."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5 rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">Phản hồi quyết định từ chối</p>
            <h2 className="mt-2 text-xl font-semibold text-[#241b45]">Đề nghị Admin xem xét lại</h2>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-slate-400" aria-label="Đóng">×</button>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Lý do Admin:</p>
          <p className="mt-2 leading-6">{track?.rejectReason || "Chưa có lý do chi tiết."}</p>
        </div>
        <p className="text-sm leading-6 text-slate-600">Hãy giải thích vì sao bạn cho rằng quyết định cần được xem xét lại. Bạn có thể bổ sung giấy phép hoặc tài liệu quyền sở hữu nếu có.</p>
        <label className="block">
          <span className="text-sm font-semibold text-[#241b45]">Nội dung phản hồi *</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} maxLength={5000} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#6f5cf1]" placeholder="Nêu rõ căn cứ, quyền sử dụng hoặc thông tin bạn muốn Admin kiểm tra lại..." />
          <span className="mt-1 block text-right text-xs text-slate-400">{message.length}/5000</span>
        </label>
        <label className="block rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          <span className="font-semibold text-[#241b45]">Bằng chứng bổ sung</span>
          <input type="file" multiple accept="image/*,.pdf,.zip,.mp3,.wav,.flac,.m4a" onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} className="mt-3 block w-full text-xs" />
          {files.length > 0 ? <p className="mt-2 text-xs text-slate-500">Đã chọn {files.length} tài liệu.</p> : null}
        </label>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
          <button type="submit" disabled={isSubmitting || message.trim().length < 10} className="rounded-xl bg-[#2f225d] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}</button>
        </div>
      </form>
    </div>
  );
};

export default TrackReviewAppealModal;
