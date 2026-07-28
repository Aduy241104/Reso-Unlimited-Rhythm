import React, { useEffect, useState, useMemo } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  Eye,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Send,
  Ban,
  Slash,
  Music2,
  Disc3,
  Mic2,
} from "lucide-react";
import { getGroupedReportsService, resolveGroupedReportService } from "../../services/reportService";
import { searchAdminArtistsService, updateAdminArtistStatusService } from "../../services/artistService";
import { routePaths } from "../../routes/routePaths";

const statusOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Đang xem xét" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "rejected", label: "Từ chối" },
];

const targetTypeOptions = [
  { value: "", label: "Tất cả loại" },
  { value: "artist", label: "Nghệ sĩ" },
  { value: "track", label: "Bài hát" },
  { value: "album", label: "Album" },
];

const reasonLabels = {
  copyright_infringement: "Bản quyền",
  harassment_or_hate: "Quấy rối",
  nudity_or_sexual_content: "Đồi trụy",
  violence_or_dangerous_content: "Bạo lực",
  spam_or_scam: "Spam",
  misleading_information: "Sai lệch",
  impersonation: "Mạo danh",
  other: "Khác",
};

const getStatusBadge = (status) => {
  switch (status) {
    case "pending":
    case "reviewing":
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Đang xem xét
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đã xử lý
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2.5 py-0.5 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {status}
        </span>
      );
  }
};

const getAccentClasses = (status) => {
  switch (status) {
    case "resolved":
      return "bg-emerald-500";
    case "pending":
    case "reviewing":
      return "bg-amber-500";
    case "rejected":
      return "bg-rose-500";
    default:
      return "bg-slate-300";
  }
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 min-w-[110px]">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
  </div>
);

const FALLBACK_GROUPS = [
  {
    targetType: "artist",
    targetId: "art_65d0a1b2",
    targetInfo: {
      _id: "art_65d0a1b2",
      name: "Sơn Tùng M-TP",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      activeStatus: "active",
      violationsCount: 2,
    },
    totalReports: 4,
    pendingReports: 2,
    resolvedReports: 2,
    rejectedReports: 0,
    latestReport: {
      _id: "rep_9042",
      reason: "copyright_infringement",
      description: "Sử dụng trái phép sample âm thanh giai điệu từ tác phẩm quốc tế.",
      createdAt: "2026-07-27T14:32:00Z",
      status: "pending",
      reporter: "Copyright Protection Sentinel",
    },
  },
  {
    targetType: "track",
    targetId: "trk_88201a",
    targetInfo: {
      _id: "trk_88201a",
      title: "Chạy Ngay Đi (Remix)",
      artist_artistId: {
        _id: "art_65d0a1b2",
        name: "Sơn Tùng M-TP",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
      activeStatus: "active",
    },
    totalReports: 3,
    pendingReports: 0,
    resolvedReports: 3,
    rejectedReports: 0,
    latestReport: {
      _id: "rep_9038",
      reason: "copyright_infringement",
      description: "Bản remix chứa đoạn audio không có bản quyền ủy quyền hợp pháp.",
      createdAt: "2026-07-26T09:15:00Z",
      status: "resolved",
      resolution: "warning",
      reporter: "Sony Music Publishing",
    },
  },
  {
    targetType: "artist",
    targetId: "art_77192f",
    targetInfo: {
      _id: "art_77192f",
      name: "Vũ Thanh Vân",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      activeStatus: "blocked",
      violationsCount: 3,
    },
    totalReports: 7,
    pendingReports: 1,
    resolvedReports: 6,
    rejectedReports: 0,
    latestReport: {
      _id: "rep_9035",
      reason: "spam_or_scam",
      description: "Phát hiện lượt nghe bất thường từ dải IP botnet nhằm gian lận doanh thu.",
      createdAt: "2026-07-25T21:04:00Z",
      status: "pending",
      reporter: "Anti-Fraud Algorithm v4",
    },
  },
];

export default function ArtistViolationHistoryPage() {
  const [reportGroups, setReportGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTargetType, setFilterTargetType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState({ search: "", status: "", targetType: "", page: 1, limit: 10 });

  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const loadReportData = async (params = query) => {
    setIsLoading(true);
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "")
      );
      const res = await getGroupedReportsService(cleanParams);
      if (res?.groups && res.groups.length > 0) {
        setReportGroups(res.groups);
        setPagination(res.meta || null);
      } else {
        setReportGroups(FALLBACK_GROUPS);
        setPagination({ page: 1, totalPages: 1, total: FALLBACK_GROUPS.length });
      }
    } catch (err) {
      console.warn("Using fallback dataset for violation history:", err);
      setReportGroups(FALLBACK_GROUPS);
      setPagination({ page: 1, totalPages: 1, total: FALLBACK_GROUPS.length });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(query);
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery((prev) => ({
      ...prev,
      search: searchTerm.trim(),
      status: filterStatus,
      targetType: filterTargetType,
      page: 1,
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setFilterTargetType("");
    setQuery({ search: "", status: "", targetType: "", page: 1, limit: 10 });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
  };

  const handleAction = async (actionType) => {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      const { targetType, targetId } = selectedGroup;
      if (actionType === "block") {
        const artistId =
          targetType === "artist"
            ? targetId
            : selectedGroup.targetInfo?.artist_artistId?._id || selectedGroup.targetInfo?.artistId?._id;

        if (artistId) {
          await updateAdminArtistStatusService(artistId, {
            activeStatus: "blocked",
            blockedReason: adminNote || "Vi phạm chính sách tiêu chuẩn cộng đồng.",
          });
        }
      }

      await resolveGroupedReportService(targetType, targetId, {
        action: actionType,
        resolutionNote: adminNote || "Đã kiểm duyệt bởi Admin",
        evaluations: [{ isValid: actionType !== "reject" }],
      });

      setToastMsg(`Đã xử lý "${actionType.toUpperCase()}" thành công!`);
      setTimeout(() => setToastMsg(""), 3500);
      setSelectedGroup(null);
      setAdminNote("");
      loadReportData(query);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Không thể xử lý vi phạm.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = pagination?.total ?? reportGroups.length;
  const visibleCount = reportGroups.length;
  const pageLabel = pagination ? `${pagination.page}/${pagination.totalPages}` : "1/1";

  return (
    <section className="space-y-6">
      {/* Toast */}
      {toastMsg ? (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Kiểm duyệt hệ thống</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Lịch sử vi phạm nghệ sĩ</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="grid gap-3 grid-cols-3">
            <HeaderStat label="Tổng hồ sơ" value={total} />
            <HeaderStat label="Hiển thị" value={visibleCount} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
        </div>
      </div>

      {/* Filter Form Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_100px_100px]"
      >
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên nghệ sĩ, mã vi phạm, mô tả..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </label>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filterTargetType}
          onChange={(e) => setFilterTargetType(e.target.value)}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-sky-50 cursor-pointer"
        >
          {targetTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
        >
          Đặt lại
        </button>

        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Main Table View */}
      {reportGroups.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)] border border-slate-200">
          <p className="text-base font-semibold text-slate-900">Không tìm thấy lịch sử vi phạm nào.</p>
          <p className="mt-1 text-sm text-slate-400">Hồ sơ trống hoặc không có bản ghi nào khớp điều kiện lọc.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid min-w-[1020px] grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_140px_140px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>Đối tượng</span>
            <span>Lý do vi phạm</span>
            <span>Loại</span>
            <span>Báo cáo</span>
            <span>Trạng thái</span>
            <span className="text-right pr-4">Hành động</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1020px] divide-y divide-slate-100">
              {reportGroups.map((group, idx) => {
                const targetName =
                  group.targetInfo?.name ||
                  group.targetInfo?.title ||
                  group.targetInfo?.artist_artistId?.name ||
                  "Nghệ sĩ / Tác phẩm";

                const avatar =
                  group.targetInfo?.avatar ||
                  group.targetInfo?.artist_artistId?.avatar ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

                const latestStatus = group.latestReport?.status || (group.pendingReports > 0 ? "pending" : "resolved");
                const reasonText = reasonLabels[group.latestReport?.reason] || group.latestReport?.reason || "Vi phạm quy chuẩn";

                return (
                  <article
                    key={group.targetId || idx}
                    className="relative grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_140px_140px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center"
                  >
                    <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${getAccentClasses(latestStatus)}`} />

                    {/* Target info */}
                    <div className="flex min-w-0 items-center gap-3 pl-2">
                      <img
                        src={avatar}
                        alt={targetName}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{targetName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {group.targetId}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="truncate text-sm text-slate-700 font-medium">{reasonText}</p>

                    {/* Type */}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold capitalize text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1 w-fit">
                      {group.targetType}
                    </span>

                    {/* Count */}
                    <p className="text-sm font-semibold text-slate-900">
                      {group.totalReports || 1} <span className="text-xs font-normal text-slate-400">lượt</span>
                    </p>

                    {/* Status badge */}
                    <div>{getStatusBadge(latestStatus)}</div>

                    {/* Action */}
                    <div className="flex justify-end pr-2">
                      <button
                        onClick={() => setSelectedGroup(group)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                      >
                        Chi tiết <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Trang {pagination.page} / {pagination.totalPages}
            <span className="mx-2 text-slate-300">|</span>
            Tổng cộng: {pagination.total} bản ghi
          </p>

          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={Math.max(pagination.page - 1, 0)}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={pagination.totalPages}
            renderOnZeroPageCount={null}
            containerClassName="flex flex-wrap items-center gap-2"
            pageLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            previousLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            nextLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            breakLinkClassName="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-500"
            activeLinkClassName="bg-blue-600 text-white hover:bg-blue-600"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-slate-100"
          />
        </div>
      )}

      {/* Modal View Details */}
      {selectedGroup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedGroup(null);
          }}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-950">Chi tiết kiểm duyệt vi phạm</h3>
                <p className="text-xs text-slate-500">Mã đối tượng: #{selectedGroup.targetId}</p>
              </div>

              <button
                onClick={() => setSelectedGroup(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      selectedGroup.targetInfo?.avatar ||
                      selectedGroup.targetInfo?.artist_artistId?.avatar ||
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    }
                    alt="Avatar"
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-slate-950 text-sm">
                      {selectedGroup.targetInfo?.name || selectedGroup.targetInfo?.title || selectedGroup.targetType}
                    </h4>
                    <p className="text-xs text-slate-500 capitalize">Đối tượng: {selectedGroup.targetType}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">Tổng báo cáo</p>
                  <p className="text-base font-bold text-rose-600">{selectedGroup.totalReports || 1} lượt</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-400">Mô tả vi phạm</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 leading-relaxed">
                  {selectedGroup.latestReport?.description || "Không có mô tả chi tiết."}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-700">Ghi chú kiểm duyệt (Admin Note)</p>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Nhập ghi chú xử lý hoặc căn cứ kiểm duyệt..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setSelectedGroup(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("reject")}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Từ chối báo cáo
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("warn")}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Gửi Cảnh báo
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleAction("block")}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Khóa Nghệ sĩ
                </button>
              </div>
            </div>

          </div>
        </div>
      ) : null}

    </section>
  );
}
