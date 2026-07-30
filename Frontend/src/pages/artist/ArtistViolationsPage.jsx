import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle2,
  Eye,
  Info,
  Calendar,
  X,
  AlertOctagon,
  Image as ImageIcon,
  ShieldCheck,
  Music2,
  Disc3,
  Mic2,
  HelpCircle,
} from "lucide-react";
import { getMyArtistViolationsService } from "../../services/artistService";

const STATUS_BADGES = {
  pending: {
    label: "Đang chờ duyệt",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: Clock,
  },
  reviewing: {
    label: "Đang xem xét",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Info,
  },
  resolved: {
    label: "Đã xác nhận",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: AlertTriangle,
  },
  rejected: {
    label: "Đã từ chối",
    className: "border-slate-200 bg-slate-100 text-slate-600",
    icon: CheckCircle2,
  },
};

const TARGET_TYPE_BADGES = {
  track: {
    label: "Bài hát",
    className: "border-purple-200 bg-purple-50 text-purple-700",
    icon: Music2,
  },
  album: {
    label: "Album",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: Disc3,
  },
  artist: {
    label: "Hồ sơ Nghệ sĩ",
    className: "border-[#e7e1ff] bg-[#faf9ff] text-[#645d86]",
    icon: Mic2,
  },
};

const cleanText = (str) => {
  if (!str) return "Không có mô tả chi tiết bổ sung.";
  return str
    .replace(/\[TRACK\]:\s*/gi, 'Bài hát "')
    .replace(/\[ALBUM\]:\s*/gi, 'Album "')
    .replace(/\[ARTIST\]:\s*/gi, 'Hồ sơ Nghệ sĩ "')
    .replace(/^\[(LOW|MEDIUM|HIGH|CRITICAL)\]\s*/i, "")
    .concat(str.includes("[") && !str.endsWith('"') ? '"' : "");
};

export default function ArtistViolationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyArtistViolationsService();
      setData(res);
    } catch (err) {
      console.error("Failed to fetch artist violations:", err);
      setError(err?.response?.data?.message || "Không thể tải danh sách vi phạm.");
    } finally {
      setLoading(false);
    }
  };

  const violationsList = data?.violations || [];
  const artistInfo = data?.artistInfo || {};

  // Filtered & Sorted List (Newest first)
  const filteredViolations = useMemo(() => {
    const list = violationsList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.violationType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.adminNotes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.targetTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort strictly newest to oldest
    return list.sort((a, b) => {
      const timeA = new Date(a.violationDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.violationDate || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [violationsList, searchQuery, statusFilter]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-[#ebe6ff] bg-white p-10 text-[#6b6682] shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7c6cf2] border-t-transparent mb-3" />
        <p className="text-sm font-medium">Đang tải dữ liệu vi phạm nghệ sĩ...</p>
      </section>
    );
  }

  const isAccountBlocked = artistInfo.activeStatus === "blocked";
  const violationsCount = artistInfo.violationsCount || 0;
  const maxAllowed = artistInfo.maxAllowedViolations || 5;

  return (
    <section className="space-y-6">
      
      {/* Header & Overview Card Section */}
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] font-bold text-[#7c6cf2]">
          Kiểm duyệt & Tuân thủ quy định
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          Lịch sử vi phạm nghệ sĩ
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Theo dõi toàn bộ hồ sơ vi phạm, lịch sử cảnh báo và các quyết định xử lý liên quan đến tài khoản hoặc tác phẩm âm nhạc của bạn.
        </p>

        {/* 3 Summary Stat Boxes */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {/* Box 1 */}
          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7c7891]">Số lần vi phạm ghi nhận</p>
              <AlertTriangle size={18} className="text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#2f2747]">
              {violationsCount} <span className="text-sm font-normal text-[#7c7891]">/ {maxAllowed} tối đa</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#e7e1ff]">
              <div
                className={`h-full transition-all duration-500 ${
                  violationsCount >= 4
                    ? "bg-rose-500"
                    : violationsCount >= 2
                    ? "bg-amber-500"
                    : "bg-[#7c6cf2]"
                }`}
                style={{ width: `${Math.min((violationsCount / maxAllowed) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Box 2 */}
          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7c7891]">Trạng thái tài khoản</p>
              {isAccountBlocked ? (
                <AlertOctagon size={18} className="text-rose-500" />
              ) : (
                <ShieldCheck size={18} className="text-emerald-500" />
              )}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  isAccountBlocked
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : violationsCount > 0
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {isAccountBlocked
                  ? "Đang bị đình chỉ"
                  : violationsCount > 0
                  ? "Hoạt động (Có cảnh báo)"
                  : "Hoạt động bình thường"}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#7c7891] line-clamp-1">
              {isAccountBlocked
                ? artistInfo.blockedReason || "Tài khoản bị giới hạn quyền do vi phạm."
                : "Vui lòng tuân thủ bản quyền & quy định hệ thống."}
            </p>
          </div>

          {/* Box 3 */}
          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#7c7891]">Tổng hồ sơ vi phạm</p>
              <FileText size={18} className="text-[#7c6cf2]" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-[#2f2747]">
              {violationsList.length} <span className="text-xs font-normal text-[#7c7891]">hồ sơ</span>
            </p>
            <p className="mt-2 text-xs text-[#7c7891]">
              Hiển thị từ mới nhất đến cũ nhất.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {/* Filter and Search Bar Section */}
      <section className="flex flex-col gap-4 rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-3.5 py-2.5">
          <Search size={18} className="text-[#9992bf]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên tác phẩm, bài hát, loại vi phạm..."
            className="w-full bg-transparent text-sm text-[#2f2747] placeholder-[#9992bf] outline-none"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "pending", label: "Đang chờ" },
            { key: "reviewing", label: "Đang xem xét" },
            { key: "resolved", label: "Đã xử lý" },
            { key: "rejected", label: "Bị từ chối" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={[
                "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                statusFilter === tab.key
                  ? "border-[#6f5cf1] bg-[#6f5cf1] text-white"
                  : "border-[#e7e1ff] bg-[#f8f6ff] text-[#645d86] hover:border-[#b7abff] hover:text-[#2f2747]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Violations List Container */}
      <section className="space-y-3">
        {filteredViolations.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-[#e7e1ff] bg-white p-8 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#faf9ff] text-[#7c6cf2] mb-3">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-base font-semibold text-[#2f2747]">Không có vi phạm nào</h3>
            <p className="mt-1 text-xs text-[#7c7891] max-w-md">
              {searchQuery || statusFilter !== "all"
                ? "Không có hồ sơ nào khớp với điều kiện tìm kiếm hoặc bộ lọc."
                : "Chúc mừng! Bạn hiện tại không có vi phạm hoặc báo cáo nào được ghi nhận."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredViolations.map((item) => {
              const statusMeta = STATUS_BADGES[item.status] || STATUS_BADGES.resolved;
              const StatusIcon = statusMeta.icon;

              const targetMeta =
                TARGET_TYPE_BADGES[item.targetType] || TARGET_TYPE_BADGES.artist;
              const TargetIcon = targetMeta.icon;

              const targetPrefix =
                item.targetType === "track"
                  ? "Bài hát: "
                  : item.targetType === "album"
                  ? "Album: "
                  : "Tài khoản Nghệ sĩ: ";

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[18px] border border-[#e7e1ff] bg-white p-5 shadow-sm transition hover:border-[#6f5cf1] hover:shadow-md md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Target Type Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-bold ${targetMeta.className}`}
                      >
                        <TargetIcon size={13} />
                        <span>{targetMeta.label}</span>
                      </span>

                      {/* Violation Type */}
                      <span className="rounded-lg border border-[#e7e1ff] bg-[#f8f6ff] px-2.5 py-0.5 text-xs font-semibold text-[#645d86]">
                        {item.violationType}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.className}`}
                      >
                        <StatusIcon size={12} />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    <h4 className="text-base font-semibold text-[#2f2747]">
                      <span className="text-[#7c7891] font-normal text-sm">{targetPrefix}</span>
                      <strong className="text-[#2f2747] font-bold">{item.targetTitle}</strong>
                    </h4>

                    <p className="text-xs text-[#7c7891] line-clamp-2 leading-relaxed">
                      {cleanText(item.description)}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#8c86ab] pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-[#7c6cf2]" />
                        <span>{formatDate(item.violationDate)}</span>
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-rose-600">
                        Hình thức phạt: {item.penalty}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t border-[#efeaff] pt-3 md:border-t-0 md:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedViolation(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-4 py-2 text-xs font-semibold text-[#2f2747] transition hover:border-[#6f5cf1] hover:bg-[#6f5cf1] hover:text-white shadow-sm"
                    >
                      <Eye size={14} />
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail Modal */}
      {selectedViolation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151221]/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-[#e7e1ff] bg-white p-6 shadow-2xl space-y-5 text-[#2f2747] max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#efeaff] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#faf9ff] text-[#7c6cf2] border border-[#efeaff]">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2f2747]">
                    Chi tiết vụ việc vi phạm
                  </h3>
                  <p className="text-xs text-[#7c7891]">
                    Thời gian ghi nhận: {formatDate(selectedViolation.violationDate)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedViolation(null)}
                className="rounded-lg p-1.5 text-[#8c86ab] hover:bg-[#f8f6ff] hover:text-[#2f2747] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Summary Grid */}
            <div className="grid gap-3 sm:grid-cols-2 rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4 text-xs">
              <div>
                <span className="text-[#7c7891] font-medium">Phân loại đối tượng:</span>
                <p className="text-sm font-bold text-[#6f5cf1] mt-0.5 capitalize">
                  {selectedViolation.targetType === "track"
                    ? "Bài hát"
                    : selectedViolation.targetType === "album"
                    ? "Album"
                    : "Hồ sơ Nghệ sĩ"}
                </p>
              </div>

              <div>
                <span className="text-[#7c7891] font-medium">Tên đối tượng / Tác phẩm:</span>
                <p className="text-sm font-bold text-[#2f2747] mt-0.5">{selectedViolation.targetTitle}</p>
              </div>

              <div>
                <span className="text-[#7c7891] font-medium">Loại vi phạm:</span>
                <p className="text-sm font-semibold text-[#2f2747] mt-0.5">{selectedViolation.violationType}</p>
              </div>

              <div>
                <span className="text-[#7c7891] font-medium">Hình thức phạt / Xử lý:</span>
                <p className="text-sm font-bold text-rose-600 mt-0.5">{selectedViolation.penalty}</p>
              </div>
            </div>

            {/* Event Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7c7891]">
                Mô tả chi tiết sự việc
              </h4>
              <div className="rounded-[14px] border border-[#efeaff] bg-white p-3.5 text-xs leading-relaxed text-[#2f2747] font-medium">
                {cleanText(selectedViolation.description)}
              </div>
            </div>

            {/* Admin Decision Notes */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Ghi chú & Phản hồi từ Ban quản trị
              </h4>
              <div className="rounded-[14px] border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed font-medium">
                {selectedViolation.adminNotes || "Ghi nhận vi phạm kiểm duyệt trực tiếp từ Ban quản trị hệ thống."}
              </div>
            </div>

            {/* Guideline Note Box for Artist */}
            <div className="rounded-[14px] border border-[#e7e1ff] bg-[#faf9ff] p-3.5 text-xs text-[#645d86] leading-relaxed flex items-start gap-2.5">
              <HelpCircle size={18} className="text-[#7c6cf2] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#2f2747]">Hướng dẫn dành cho Nghệ sĩ:</strong>
                <p className="mt-0.5 text-[#7c7891]">
                  Các vi phạm được tích lũy theo quy định hệ thống. Nghệ sĩ vui lòng kiểm tra lại quyền sở hữu bản quyền hoặc điều chỉnh tác phẩm để duy trì hoạt động tài khoản ổn định.
                </p>
              </div>
            </div>

            {/* Evidence Images */}
            {selectedViolation.images && selectedViolation.images.length > 0 ? (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7c7891] flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  <span>Bằng chứng đính kèm ({selectedViolation.images.length})</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedViolation.images.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-xl border border-[#e7e1ff] bg-[#faf9ff] aspect-video"
                    >
                      <img
                        src={img}
                        alt={`Bằng chứng ${idx + 1}`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition text-white">
                        <Eye size={18} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-[#efeaff] pt-3">
              <button
                type="button"
                onClick={() => setSelectedViolation(null)}
                className="rounded-xl border border-[#e7e1ff] bg-[#faf9ff] px-5 py-2 text-xs font-semibold text-[#2f2747] hover:bg-[#efeaff] transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
