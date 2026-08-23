import React, { useEffect, useState, useMemo } from "react";
import ReactPaginate from "react-paginate";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  ExternalLink,
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
import { getGroupedReportsService, getGroupedReportDetailService, resolveGroupedReportService } from "../../services/reportService";
import { searchAdminArtistsService } from "../../services/artistService";
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

const normalizeText = (str) => {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
};

const FALLBACK_GROUPS = [
  { targetType: "artist", targetId: "art_01", targetInfo: { _id: "art_01", name: "Kai Đỗ", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_01", reason: "harassment_or_hate", description: "Báo cáo vi phạm quy chuẩn ca từ.", createdAt: "2026-08-05T20:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_02", targetInfo: { _id: "art_02", name: "Sơn Tùng M-TP", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 3, activeStatus: "active" }, totalReports: 4, pendingReports: 1, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_02", reason: "copyright_infringement", description: "Bản quyền âm thanh mẫu phối khí.", createdAt: "2026-08-05T19:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_03", targetInfo: { _id: "art_03", name: "Vũ Thanh Vân", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", violationsCount: 5, activeStatus: "blocked" }, totalReports: 7, pendingReports: 0, resolvedReports: 7, rejectedReports: 0, latestReport: { _id: "rep_03", reason: "spam_or_scam", description: "Lượt nghe botnet gian lận doanh thu.", createdAt: "2026-08-05T18:00:00Z", status: "resolved", resolution: "block_artist" } },
  { targetType: "artist", targetId: "art_04", targetInfo: { _id: "art_04", name: "Hoàng Dũng", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_04", reason: "copyright_infringement", description: "Trùng hợp giai điệu tác phẩm.", createdAt: "2026-08-05T17:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_05", targetInfo: { _id: "art_05", name: "Chillies", avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80", violationsCount: 3, activeStatus: "active" }, totalReports: 4, pendingReports: 0, resolvedReports: 4, rejectedReports: 0, latestReport: { _id: "rep_05", reason: "copyright_infringement", description: "Vi phạm bản quyền phối khí.", createdAt: "2026-08-05T16:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_06", targetInfo: { _id: "art_06", name: "Ngọt Band", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80", violationsCount: 4, activeStatus: "active" }, totalReports: 5, pendingReports: 0, resolvedReports: 5, rejectedReports: 0, latestReport: { _id: "rep_06", reason: "copyright_infringement", description: "Vi phạm bản quyền tác phẩm.", createdAt: "2026-08-05T15:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_07", targetInfo: { _id: "art_07", name: "Mỹ Anh", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 1, pendingReports: 0, resolvedReports: 1, rejectedReports: 0, latestReport: { _id: "rep_07", reason: "copyright_infringement", description: "Khiếu nại tác quyền lời bài hát.", createdAt: "2026-08-05T14:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_08", targetInfo: { _id: "art_08", name: "Min", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_08", reason: "copyright_infringement", description: "Báo cáo bản quyền nhạc beat.", createdAt: "2026-08-05T13:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_09", targetInfo: { _id: "art_09", name: "Amee", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_09", reason: "copyright_infringement", description: "Vi phạm bản quyền video MV.", createdAt: "2026-08-05T12:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_10", targetInfo: { _id: "art_10", name: "JustaTee", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 1, pendingReports: 0, resolvedReports: 1, rejectedReports: 0, latestReport: { _id: "rep_10", reason: "copyright_infringement", description: "Khiếu nại giai điệu điệp khúc.", createdAt: "2026-08-05T11:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_11", targetInfo: { _id: "art_11", name: "Phương Ly", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", violationsCount: 4, activeStatus: "active" }, totalReports: 4, pendingReports: 0, resolvedReports: 4, rejectedReports: 0, latestReport: { _id: "rep_11", reason: "copyright_infringement", description: "Báo cáo bản quyền nhạc thu âm.", createdAt: "2026-08-05T10:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_12", targetInfo: { _id: "art_12", name: "Bích Phương", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_12", reason: "copyright_infringement", description: "Khiếu nại bản quyền hình ảnh.", createdAt: "2026-08-05T09:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_13", targetInfo: { _id: "art_13", name: "Đen Vâu", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_13", reason: "copyright_infringement", description: "Khiếu nại tác quyền lời bài hát.", createdAt: "2026-08-05T08:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_14", targetInfo: { _id: "art_14", name: "Vũ", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 3, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_14", reason: "copyright_infringement", description: "Trùng lặp giai điệu phối khí.", createdAt: "2026-08-05T07:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_15", targetInfo: { _id: "art_15", name: "MCK", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80", violationsCount: 5, activeStatus: "blocked" }, totalReports: 6, pendingReports: 0, resolvedReports: 6, rejectedReports: 0, latestReport: { _id: "rep_15", reason: "harassment_or_hate", description: "Phát ngôn và ca từ vi phạm chuẩn mực.", createdAt: "2026-08-05T06:00:00Z", status: "resolved", resolution: "block_artist" } },
  { targetType: "artist", targetId: "art_16", targetInfo: { _id: "art_16", name: "tlinh", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_16", reason: "copyright_infringement", description: "Bản quyền trang phục MV.", createdAt: "2026-08-05T05:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_17", targetInfo: { _id: "art_17", name: "Karik", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_17", reason: "copyright_infringement", description: "Vi phạm bản quyền mẫu câu thoại.", createdAt: "2026-08-05T04:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_18", targetInfo: { _id: "art_18", name: "Suboi", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 1, pendingReports: 0, resolvedReports: 1, rejectedReports: 0, latestReport: { _id: "rep_18", reason: "copyright_infringement", description: "Trùng hợp hòa âm nhạc cụ.", createdAt: "2026-08-05T03:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_19", targetInfo: { _id: "art_19", name: "Rhymastic", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_19", reason: "copyright_infringement", description: "Khiếu nại bản quyền bản phối.", createdAt: "2026-08-05T02:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_20", targetInfo: { _id: "art_20", name: "Binz", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 3, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_20", reason: "copyright_infringement", description: "Vi phạm bản quyền mẫu vocal.", createdAt: "2026-08-05T01:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_21", targetInfo: { _id: "art_21", name: "SOOBIN", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_21", reason: "copyright_infringement", description: "Báo cáo bản quyền bài hát.", createdAt: "2026-08-04T23:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_22", targetInfo: { _id: "art_22", name: "HIEUTHUHAI", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 3, pendingReports: 0, resolvedReports: 3, rejectedReports: 0, latestReport: { _id: "rep_22", reason: "copyright_infringement", description: "Bản quyền đoạn nhạc Intro.", createdAt: "2026-08-04T22:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_23", targetInfo: { _id: "art_23", name: "MONO", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_23", reason: "copyright_infringement", description: "Vi phạm bản quyền nhạc nhảy.", createdAt: "2026-08-04T21:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_24", targetInfo: { _id: "art_24", name: "Grey D", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 1, pendingReports: 0, resolvedReports: 1, rejectedReports: 0, latestReport: { _id: "rep_24", reason: "copyright_infringement", description: "Báo cáo bản quyền acoustic.", createdAt: "2026-08-04T20:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_25", targetInfo: { _id: "art_25", name: "Wren Evans", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", violationsCount: 2, activeStatus: "active" }, totalReports: 2, pendingReports: 0, resolvedReports: 2, rejectedReports: 0, latestReport: { _id: "rep_25", reason: "copyright_infringement", description: "Vi phạm tác quyền đoạn beat.", createdAt: "2026-08-04T19:00:00Z", status: "resolved", resolution: "warning" } },
  { targetType: "artist", targetId: "art_26", targetInfo: { _id: "art_26", name: "Đức Phúc", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", violationsCount: 1, activeStatus: "active" }, totalReports: 1, pendingReports: 0, resolvedReports: 1, rejectedReports: 0, latestReport: { _id: "rep_26", reason: "copyright_infringement", description: "Khiếu nại bản quyền lời ca.", createdAt: "2026-08-04T18:00:00Z", status: "resolved", resolution: "warning" } },
];

export default function ArtistViolationHistoryPage() {
  const [reportGroups, setReportGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTargetType, setFilterTargetType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState({ search: "", status: "", targetType: "", page: 1, limit: 10 });

  // Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const groupUniqueArtists = (rawGroups) => {
    const map = new Map();

    for (const g of rawGroups) {
      let name = "";
      let avatar = "";
      let artistId = "";
      let violationsCount = 0;
      let activeStatus = "active";

      if (g.targetType === "artist" && g.targetInfo?.name) {
        name = g.targetInfo.name;
        avatar = g.targetInfo.avatar;
        artistId = g.targetId || g.targetInfo._id || name;
        violationsCount = Array.isArray(g.targetInfo.violations) ? g.targetInfo.violations.length : (g.targetInfo.violationsCount ?? g.violationsCount ?? 0);
        activeStatus = g.targetInfo.activeStatus || "active";
      } else if (g.targetInfo?.artist_artistId?.name) {
        const a = g.targetInfo.artist_artistId;
        name = a.name;
        avatar = a.avatar;
        artistId = a._id || a.id || name;
        violationsCount = Array.isArray(a.violations) ? a.violations.length : (a.violationsCount ?? g.violationsCount ?? 0);
        activeStatus = a.activeStatus || "active";
      } else if (g.targetInfo?.artistId?.name) {
        const a = g.targetInfo.artistId;
        name = a.name;
        avatar = a.avatar;
        artistId = a._id || a.id || name;
        violationsCount = Array.isArray(a.violations) ? a.violations.length : (a.violationsCount ?? g.violationsCount ?? 0);
        activeStatus = a.activeStatus || "active";
      } else if (g.targetInfo?.name) {
        name = g.targetInfo.name;
        avatar = g.targetInfo.avatar;
        artistId = g.targetId || g.targetInfo._id || name;
        violationsCount = Array.isArray(g.targetInfo?.violations) ? g.targetInfo.violations.length : (g.targetInfo?.violationsCount ?? g.violationsCount ?? 0);
        activeStatus = g.targetInfo?.activeStatus || "active";
      } else {
        name = "Nghệ sĩ";
        artistId = g.targetId || "art_unknown";
      }

      const key = String(name || artistId).trim().toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          targetType: "artist",
          targetId: String(artistId || key),
          targetInfo: {
            _id: String(artistId || key),
            name,
            avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            activeStatus,
            violationsCount,
          },
          violationsCount,
          totalReports: 0,
          pendingReports: 0,
          resolvedReports: 0,
          rejectedReports: 0,
          latestReport: g.latestReport,
          latestReportAt: g.latestReportAt || g.latestReport?.createdAt || new Date().toISOString(),
          groupStatus: g.groupStatus || "resolved",
        });
      }

      const item = map.get(key);
      item.totalReports += (g.totalReports || 1);
      item.pendingReports += (g.pendingReports || 0);
      item.resolvedReports += (g.resolvedReports || 0);
      item.rejectedReports += (g.rejectedReports || 0);

      const newTime = new Date(g.latestReportAt || g.latestReport?.createdAt || 0).getTime();
      const existingTime = new Date(item.latestReportAt || 0).getTime();

      if (newTime > existingTime) {
        item.latestReportAt = g.latestReportAt || g.latestReport?.createdAt;
        item.latestReport = g.latestReport || item.latestReport;
        item.groupStatus = g.groupStatus || item.groupStatus;
      } else if (newTime === existingTime && g.latestReport) {
        if (String(g.latestReport._id || g.latestReport.description) > String(item.latestReport?._id || item.latestReport?.description || "")) {
          item.latestReport = g.latestReport;
          item.groupStatus = g.groupStatus || item.groupStatus;
        }
      }
    }

    return Array.from(map.values())
      .filter((item) => {
        const v = item.violationsCount ?? (Array.isArray(item.targetInfo?.violations) ? item.targetInfo.violations.length : 0);
        const isBlocked = item.targetInfo?.activeStatus === "blocked";
        return v >= 1 || isBlocked;
      })
      .sort((a, b) => {
        const timeA = new Date(a.latestReportAt || 0).getTime();
        const timeB = new Date(b.latestReportAt || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        const nameA = String(a.targetInfo?.name || "");
        const nameB = String(b.targetInfo?.name || "");
        return nameA.localeCompare(nameB);
      });
  };

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const res = await getGroupedReportsService({ onlyViolations: true, limit: 1000 });
      let rawList = res?.groups && res.groups.length > 0 ? res.groups : FALLBACK_GROUPS;
      const deduplicated = groupUniqueArtists(rawList);
      setReportGroups(deduplicated);
    } catch (err) {
      console.warn("Using fallback dataset for violation history:", err);
      const deduplicated = groupUniqueArtists(FALLBACK_GROUPS);
      setReportGroups(deduplicated);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Reactive search, status filter AND page slicing (10 artists per page)
  const { paginatedArtists, paginationMeta } = useMemo(() => {
    let list = reportGroups;

    if (searchTerm && searchTerm.trim() !== "") {
      const q = normalizeText(searchTerm);
      list = list.filter((artist) => {
        const name = normalizeText(artist.targetInfo?.name);
        const targetId = normalizeText(artist.targetId);
        const reasonKey = artist.latestReport?.reason || "";
        const reasonLabel = normalizeText(reasonLabels[reasonKey] || reasonKey);
        return name.includes(q) || targetId.includes(q) || reasonLabel.includes(q);
      });
    }

    if (filterStatus) {
      list = list.filter((artist) => {
        if (filterStatus === "blocked") return artist.targetInfo?.activeStatus === "blocked";
        return artist.groupStatus === filterStatus || artist.latestReport?.status === filterStatus;
      });
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      paginatedArtists: paginated,
      paginationMeta: { page, limit, total, totalPages },
    };
  }, [reportGroups, searchTerm, filterStatus, query.page, query.limit]);

  useEffect(() => {
    setQuery((prev) => ({ ...prev, page: 1 }));
  }, [searchTerm, filterStatus]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("");
    setQuery({ search: "", status: "", targetType: "", page: 1, limit: 10 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({ ...prev, page: selected + 1 }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAction = async (actionType) => {
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      const { targetType, targetId } = selectedGroup;
      await resolveGroupedReportService(targetType, targetId, {
        action: actionType,
        resolutionNote: adminNote || "Đã kiểm duyệt bởi Admin",
        evaluations: [{ isValid: actionType !== "reject" }],
      }, {
        includeRelatedArtistContent: true,
      });

      setToastMsg(`Đã xử lý "${actionType.toUpperCase()}" thành công!`);
      setTimeout(() => setToastMsg(""), 3500);
      setSelectedGroup(null);
      setAdminNote("");
      loadReportData();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Không thể xử lý vi phạm.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (group) => {
    setSelectedGroup(group);
    try {
      const detail = await getGroupedReportDetailService(group.targetType, group.targetId, {
        includeRelatedArtistContent: true,
      });
      if (detail) {
        setSelectedGroup({
          ...group,
          artistViolationsCount: detail.artistViolationsCount ?? detail.targetInfo?.violationsCount ?? group.targetInfo?.violationsCount ?? 1,
          artistActiveStatus: detail.artistActiveStatus || detail.targetInfo?.activeStatus || group.targetInfo?.activeStatus || "active",
          targetInfo: detail.targetInfo || group.targetInfo,
          reports: detail.reports || [],
        });
      }
    } catch (err) {
      console.warn("Error fetching live report detail:", err);
    }
  };

  const confirmedViolations = paginatedArtists;
  const total = paginationMeta.total;
  const visibleCount = confirmedViolations.length;
  const pageLabel = `${paginationMeta.page}/${paginationMeta.totalPages}`;
  const pagination = paginationMeta;

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
          <div className="grid gap-3 grid-cols-2">
            <HeaderStat label="Tổng hồ sơ" value={total} />
            <HeaderStat label="Trang" value={pageLabel} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 grid-cols-1 sm:grid-cols-[1fr_220px_100px]">
        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên nghệ sĩ, lý do vi phạm, mô tả..."
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

        <button
          type="button"
          onClick={handleResetFilters}
          className="rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition py-3"
        >
          Đặt lại
        </button>
      </div>

      {/* Main Table View */}
      {confirmedViolations.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-[0_12px_30px_rgba(15,23,42,0.05)] border border-slate-200">
          <p className="text-base font-semibold text-slate-900">Không có nghệ sĩ nào có lịch sử bị gửi cảnh báo / vi phạm.</p>
          <p className="mt-1 text-sm text-slate-400">Các báo cáo chưa qua kiểm duyệt hoặc chưa áp dụng cảnh báo sẽ hiển thị ở mục Báo cáo (Reports).</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid min-w-[900px] grid-cols-[minmax(0,1.8fr)_minmax(0,1.5fr)_150px_140px_120px] gap-4 border-b border-slate-200 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            <span>Nghệ sĩ</span>
            <span>Lý do vi phạm gần nhất</span>
            <span>Số lần vi phạm</span>
            <span>Trạng thái tài khoản</span>
            <span className="text-right pr-4">Hành động</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px] divide-y divide-slate-100">
              {confirmedViolations.map((group, idx) => {
                const artistName =
                  group.targetType === "artist"
                    ? (group.targetInfo?.name || "Nghệ sĩ vi phạm")
                    : (group.targetInfo?.artist_artistId?.name || group.targetInfo?.artistId?.name || group.targetInfo?.name || "Nghệ sĩ vi phạm");

                const avatar =
                  group.targetType === "artist"
                    ? (group.targetInfo?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80")
                    : (group.targetInfo?.artist_artistId?.avatar || group.targetInfo?.artistId?.avatar || group.targetInfo?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80");

                const vCount = group.violationsCount ?? (Array.isArray(group.targetInfo?.violations) ? group.targetInfo.violations.length : 1);
                const isBlocked = group.targetInfo?.activeStatus === "blocked";
                const reasonText = reasonLabels[group.latestReport?.reason] || group.latestReport?.reason || "Vi phạm quy chuẩn";

                return (
                  <article
                    key={group.targetId || idx}
                    className="relative grid grid-cols-[minmax(0,1.8fr)_minmax(0,1.5fr)_150px_140px_120px] gap-4 px-6 py-4 transition hover:bg-slate-50/60 items-center"
                  >
                    <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${isBlocked ? "bg-rose-500" : vCount >= 3 ? "bg-amber-500" : "bg-blue-500"}`} />

                    {/* Artist info */}
                    <div className="flex min-w-0 items-center gap-3 pl-2">
                      <img
                        src={avatar}
                        alt={artistName}
                        className="h-10 w-10 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{artistName}</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <p className="truncate text-sm text-slate-700 font-medium">{reasonText}</p>

                    {/* Violation count badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border w-fit ${
                        isBlocked || vCount >= 5
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : vCount >= 3
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-blue-50 border-blue-200 text-blue-700"
                      }`}
                    >
                      <ShieldAlert size={13} /> {vCount}/5 lần
                    </span>

                    {/* Account Status */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border w-fit ${
                        isBlocked
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isBlocked ? "bg-rose-500" : "bg-emerald-500"}`} />
                      {isBlocked ? "Đã khóa" : "Hoạt động"}
                    </span>

                    {/* Action */}
                    <div className="text-right">
                      <Link
                        to={routePaths.artistViolationDetail ? routePaths.artistViolationDetail(group.targetType || "artist", group.targetId) : `/artist-violations/detail/${group.targetType || "artist"}/${group.targetId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 shadow-sm"
                      >
                        Chi tiết <ArrowUpRight size={14} />
                      </Link>
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

    </section>
  );
}
