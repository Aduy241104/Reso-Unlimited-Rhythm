import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  acceptTrackReviewAppealService,
  getTrackReviewAppealService,
  listTrackReviewAppealsService,
  rejectTrackReviewAppealService,
} from "../../services/trackReviewAppealService";
import { routePaths } from "../../routes/routePaths";

const statusLabels = { pending: "Đang chờ", accepted: "Đã chấp nhận", rejected: "Đã từ chối", cancelled: "Đã hủy" };

const TrackAppealsPage = () => {
  const { appealId } = useParams();
  const navigate = useNavigate();
  const [appeals, setAppeals] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [appeal, setAppeal] = useState(null);
  const [status, setStatus] = useState("pending");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (appealId) {
        const detail = await getTrackReviewAppealService(appealId);
        setAppeal(detail);
        setResponse("");
      } else {
        const result = await listTrackReviewAppealsService({ status, page, limit: 20 });
        setAppeals(result.appeals);
        setPagination(result.pagination);
      }
    } catch (requestError) {
      setError(requestError?.message || "Không thể tải danh sách phản hồi.");
    } finally {
      setLoading(false);
    }
  }, [appealId, page, status]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action) => {
    if (!appeal || actionLoading) return;
    if (action === "reject" && response.trim().length < 10) {
      setError("Phản hồi từ chối phải có ít nhất 10 ký tự.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const updated = action === "accept"
        ? await acceptTrackReviewAppealService(appeal._id, response.trim())
        : await rejectTrackReviewAppealService(appeal._id, response.trim());
      setAppeal(updated);
    } catch (requestError) {
      setError(requestError?.response?.data?.errors?.code || requestError?.message || "Không thể xử lý phản hồi.");
    } finally {
      setActionLoading(false);
    }
  };

  if (appealId) {
    return (
      <section className="space-y-6">
        <button type="button" onClick={() => navigate(routePaths.trackAppeals)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">← Quay lại hàng đợi phản hồi</button>
        {loading ? <p>Đang tải...</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        {appeal ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phản hồi từ nghệ sĩ</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">{appeal.trackId?.title || "Track appeal"}</h1></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabels[appeal.status] || appeal.status}</span>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 p-5"><h2 className="font-semibold">Rejection</h2><p className="mt-3 text-sm leading-6">{appeal.rejectionSnapshot?.rejectReason || "-"}</p><p className="mt-3 text-xs text-slate-500">Flags: {(appeal.rejectionSnapshot?.violationFlags || []).join(", ") || "-"}</p></article>
              <article className="rounded-2xl border border-slate-200 p-5"><h2 className="font-semibold">Version snapshot</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600"><span>Submission: {appeal.rejectionSnapshot?.submissionVersion}</span><span>Audio: {appeal.rejectionSnapshot?.audioVersion}</span><span>Copyright: {appeal.rejectionSnapshot?.copyrightVersion}</span><span>Evidence: {appeal.rejectionSnapshot?.evidenceVersion}</span></div></article>
            </div>
            <article className="rounded-2xl border border-slate-200 p-5"><h2 className="font-semibold">Artist response</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{appeal.message}</p><div className="mt-4 flex flex-wrap gap-2">{(appeal.evidenceDocuments || []).map((document) => <a key={document.documentId || document.url} href={document.url || document.storageUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-sky-700">{document.originalName || document.fileName || "Evidence"}</a>)}</div></article>
            {appeal.status === "pending" ? <article className="space-y-4 rounded-2xl border border-slate-200 p-5"><textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={4} maxLength={5000} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Phản hồi gửi cho nghệ sĩ; bắt buộc khi từ chối..." /><div className="flex justify-end gap-3"><button type="button" disabled={actionLoading} onClick={() => handleAction("reject")} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Không chấp nhận phản hồi</button><button type="button" disabled={actionLoading} onClick={() => handleAction("accept")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Chấp nhận phản hồi</button></div></article> : null}
            {appeal.adminResponse ? <article className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm leading-6"><strong>Phản hồi của Admin:</strong> {appeal.adminResponse}</article> : null}
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Moderation</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Phản hồi từ nghệ sĩ</h1></div><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="pending">Đang chờ</option><option value="accepted">Đã chấp nhận</option><option value="rejected">Đã từ chối</option><option value="cancelled">Đã hủy</option></select></div>
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Track</th><th className="px-4 py-3">Artist</th><th className="px-4 py-3">Lý do từ chối</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{appeals.map((item) => <tr key={item._id} className="hover:bg-slate-50"><td className="px-4 py-3"><Link className="font-semibold text-sky-700" to={routePaths.trackAppealDetail(item._id)}>{item.trackId?.title || item.trackId}</Link></td><td className="px-4 py-3">{item.artistId?.name || item.artistId}</td><td className="max-w-sm truncate px-4 py-3 text-slate-600">{item.rejectionSnapshot?.rejectReason || "-"}</td><td className="px-4 py-3 text-slate-500">{item.submittedAt ? new Date(item.submittedAt).toLocaleString("vi-VN") : "-"}</td><td className="px-4 py-3">{item.evidenceDocuments?.length || 0}</td><td className="px-4 py-3">{statusLabels[item.status] || item.status}</td></tr>)}{!loading && appeals.length === 0 ? <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">Không có phản hồi phù hợp.</td></tr> : null}</tbody></table><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>Trang {pagination?.page || page} / {pagination?.totalPages || 0}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Trước</button><button type="button" disabled={!pagination?.totalPages || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Sau</button></div></div></div>
    </section>
  );
};

export default TrackAppealsPage;
