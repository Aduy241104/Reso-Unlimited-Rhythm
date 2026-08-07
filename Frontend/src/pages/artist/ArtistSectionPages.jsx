import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AudioLines,
  BarChart3,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Heart,
  Music4,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { ARTIST_INPUT_LIMITS } from "../../constants/artistInputLimits";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import ArtistSectionPage from "./ArtistSectionPage";
import trackService from "../../services/trackService";
import { routePaths } from "../../routes/routePaths";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";
import {
  canArtistSubmitTrack,
  getArtistTrackReviewStatus,
  getSubmitReadinessIssues,
} from "../../utils/trackWorkflow";
import {
  formatTrackCount,
  formatTrackDate,
  getTrackActiveStatusMeta,
  getTrackAlbumLabel,
  getTrackApprovalStatusMeta,
  getTrackDisplayDuration,
  getTrackGenreLabel,
  resolveTrackArtwork,
} from "../../utils/artistTrackPresentation";
import ArtistReleaseSchedulePage from "./ArtistReleaseSchedulePage";

const LIST_TABS = [
  { key: "all", label: "Tất cả bài hát" },
  { key: "active", label: "Đang phát hành" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "draft", label: "Bản nháp" },
  { key: "hidden", label: "Đã ẩn" },
  { key: "rejected", label: "Bị từ chối" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang phát hành" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "draft", label: "Bản nháp" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "blocked", label: "Bị chặn" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "Mới cập nhật" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "plays", label: "Lượt phát cao nhất" },
  { value: "likes", label: "Lượt thích cao nhất" },
  { value: "title", label: "Tên A-Z" },
];

const matchesTabFilter = (track, tab) => {
  const reviewStatus = getArtistTrackReviewStatus(track);

  if (tab === "active") {
    return track?.activeStatus === "active";
  }

  if (tab === "pending") {
    return reviewStatus === "pending";
  }

  if (tab === "draft") {
    return track?.approvalStatus === "draft";
  }

  if (tab === "hidden") {
    return track?.activeStatus === "hidden";
  }

  if (tab === "rejected") {
    return reviewStatus === "rejected";
  }

  return true;
};

const matchesStatusFilter = (track, filterValue) => {
  if (!filterValue || filterValue === "all") {
    return true;
  }

  return (
    track?.activeStatus === filterValue || getArtistTrackReviewStatus(track) === filterValue
  );
};

const getSortTimestamp = (track) =>
  new Date(track?.updatedAt || track?.createdAt || 0).getTime();

const sortTracks = (items, sortValue) => {
  const nextItems = [...items];

  nextItems.sort((left, right) => {
    if (sortValue === "oldest") {
      return getSortTimestamp(left) - getSortTimestamp(right);
    }

    if (sortValue === "plays") {
      return Number(right?.stats?.totalPlay || 0) - Number(left?.stats?.totalPlay || 0);
    }

    if (sortValue === "likes") {
      return Number(right?.stats?.totalLike || 0) - Number(left?.stats?.totalLike || 0);
    }

    if (sortValue === "title") {
      return String(left?.title || "").localeCompare(String(right?.title || ""), "vi");
    }

    return getSortTimestamp(right) - getSortTimestamp(left);
  });

  return nextItems;
};

const buildTrackInsightsPath = (trackId) =>
  `${routePaths.artistAnalytics}?trackId=${trackId}`;

const metricTintStyles = {
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

const MetricCard = ({ icon, label, value, helper, tint }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-[22px] border border-[#ece8ff] bg-white p-4 shadow-[0_12px_35px_rgba(32,23,71,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#8d87aa]">{label}</p>
          <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-[#241b45] sm:text-[30px]">
            {value}
          </p>
          <p className="mt-2 text-xs text-[#9e98b8]">{helper}</p>
        </div>
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
            metricTintStyles[tint],
          ].join(" ")}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const StatusPill = ({ value, variant = "active" }) => {
  const meta =
    variant === "approval"
      ? getTrackApprovalStatusMeta(value)
      : getTrackActiveStatusMeta(value);

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
    </span>
  );
};

const PreviewField = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-[#8d87aa]">{label}</span>
    <span className="text-right font-medium text-[#241b45]">{value}</span>
  </div>
);

const PreviewSidebar = ({
  track,
  canSubmitCurrentTrack,
  isActionLoading,
  onEdit,
  onView,
  onOpenAnalytics,
  onHide,
  onDelete,
  onSubmit,
}) => {
  if (!track) {
    return (
      <div className="rounded-[28px] border border-dashed border-[#d9d2f4] bg-white p-8 text-center text-sm text-[#8d87aa] shadow-[0_12px_35px_rgba(32,23,71,0.04)]">
        Chọn một bài hát trong danh sách để xem nhanh thông tin quản lý.
      </div>
    );
  }

  const artwork = resolveTrackArtwork(track);
  const submitIssues = getSubmitReadinessIssues(track);

  return (
    <aside className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)] sm:p-6 xl:sticky xl:top-6">
      <div className="overflow-hidden rounded-[24px] bg-[#f6f2ff]">
        <img
          src={artwork}
          alt={track?.title || "Ảnh bài hát"}
          className="aspect-square w-full object-cover"
        />
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-semibold tracking-tight text-[#241b45]">
          {track?.title || "Chưa có tên bài hát"}
        </h3>
        <p className="mt-1 text-sm text-[#8d87aa]">
          {track?.artist?.name || "Nghệ sĩ"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill value={track?.activeStatus} />
          <StatusPill value={getArtistTrackReviewStatus(track)} variant="approval" />
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-[22px] border border-[#f0ebff] bg-[#fbfaff] p-4">
        <PreviewField label="Album" value={getTrackAlbumLabel(track)} />
        <PreviewField label="Thời lượng" value={getTrackDisplayDuration(track?.duration)} />
        <PreviewField label="Thể loại" value={getTrackGenreLabel(track)} />
        <PreviewField label="Ngày phát hành" value={formatTrackDate(track?.releaseDate)} />
        <PreviewField
          label="Lượt phát"
          value={formatTrackCount(track?.stats?.totalPlay)}
        />
        <PreviewField
          label="Lượt thích"
          value={formatTrackCount(track?.stats?.totalLike)}
        />
        <PreviewField label="Cập nhật" value={formatTrackDate(track?.updatedAt)} />
      </div>

      <div className="mt-6">
        <p className="text-sm font-semibold text-[#241b45]">Quản lý nhanh</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ddd4ff] bg-white px-4 py-3 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f7f5ff]"
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa bài hát
          </button>
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] px-4 py-3 text-sm font-medium text-[#3e3164] transition hover:bg-[#f1edff]"
          >
            Xem chi tiết
          </button>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 transition hover:bg-sky-100"
          >
            <BarChart3 className="h-4 w-4" />
            Xem phân tích
          </button>
          {canSubmitCurrentTrack ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Gửi duyệt
            </button>
          ) : null}
          <button
            type="button"
            onClick={onHide}
            disabled={
              isActionLoading ||
              track?.releaseStatus === "scheduled"
            }
            title={
              track?.releaseStatus === "scheduled"
                ? "Hãy hủy lịch phát hành trước khi thay đổi trạng thái hiển thị."
                : undefined
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {track?.activeStatus === "hidden" ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {track?.releaseStatus === "scheduled"
              ? "Hủy lịch trước khi đổi hiển thị"
              : track?.activeStatus === "hidden"
                ? "Hiển thị bài hát"
                : "Ẩn bài hát"}
          </button>
        </div>
      </div>

      {submitIssues.length > 0 && canArtistSubmitTrack(track) ? (
        <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Cần hoàn thiện trước khi gửi duyệt
          </p>
          <ul className="mt-2 space-y-2 text-sm text-amber-800">
            {submitIssues.slice(0, 4).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {track?.rejectReason ? (
        <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Lý do từ chối</p>
          <p className="mt-2">{track.rejectReason}</p>
        </div>
      ) : null}

      {track?.hiddenReason ? (
        <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Lý do ẩn</p>
          <p className="mt-2">{track.hiddenReason}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onDelete}
        disabled={isActionLoading}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        Xóa bài hát
      </button>
    </aside>
  );
};

export const MyMusicPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [selectedTrackId, setSelectedTrackId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadTracks = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await trackService.getArtistTracks();

        if (!isMounted) {
          return;
        }

        if (response?.success) {
          const nextTracks = response.data?.tracks || [];
          setTracks(nextTracks);
          setSelectedTrackId(nextTracks[0]?._id || "");
          return;
        }

        setTracks([]);
        setErrorMessage(response?.message || "Không thể tải danh sách bài hát.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTracks([]);
        setErrorMessage(
          error?.message ||
            error?.response?.data?.message ||
            "Không thể tải danh sách bài hát."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }

    showArtistSuccess(location.state.message);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { ...location.state, message: null },
    });
  }, [location.pathname, location.search, location.state, navigate]);

  const albumOptions = useMemo(() => {
    const entries = Array.from(
      new Map(
        tracks
          .filter((track) => track?.album?._id)
          .map((track) => [track.album._id, track.album.title || "Chưa có tên album"])
      ).entries()
    );

    return entries.map(([value, label]) => ({ value, label }));
  }, [tracks]);

  const trackStats = useMemo(() => {
    const totalTracks = tracks.length;
    const activeTracks = tracks.filter((track) => track.activeStatus === "active").length;
    const pendingTracks = tracks.filter((track) => getArtistTrackReviewStatus(track) === "pending").length;
    const totalPlays = tracks.reduce(
      (sum, track) => sum + Number(track?.stats?.totalPlay || 0),
      0
    );
    const totalLikes = tracks.reduce(
      (sum, track) => sum + Number(track?.stats?.totalLike || 0),
      0
    );

    return {
      totalTracks,
      activeTracks,
      pendingTracks,
      totalPlays,
      totalLikes,
    };
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nextTracks = tracks.filter((track) => {
      if (!matchesTabFilter(track, activeTab)) {
        return false;
      }

      if (!matchesStatusFilter(track, statusFilter)) {
        return false;
      }

      if (selectedAlbum !== "all" && track?.album?._id !== selectedAlbum) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        track?.title,
        track?.versionTitle,
        track?.artist?.name,
        track?.album?.title,
        ...(Array.isArray(track?.genres) ? track.genres.map((genre) => genre?.name) : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    return sortTracks(nextTracks, sortOrder);
  }, [activeTab, searchQuery, selectedAlbum, sortOrder, statusFilter, tracks]);

  useEffect(() => {
    if (filteredTracks.length === 0) {
      setSelectedTrackId("");
      return;
    }

    const stillSelected = filteredTracks.some((track) => track._id === selectedTrackId);

    if (!stillSelected) {
      setSelectedTrackId(filteredTracks[0]._id);
    }
  }, [filteredTracks, selectedTrackId]);

  const previewTrack =
    filteredTracks.find((track) => track._id === selectedTrackId) ||
    filteredTracks[0] ||
    null;

  const handleViewTrack = (trackId) => {
    navigate(routePaths.artistTrackDetail(trackId));
  };

  const handleEditTrack = (trackId) => {
    navigate(routePaths.artistTrackEdit(trackId));
  };

  const handleHideTrack = async (track) => {
    if (!track || isActionLoading) {
      return;
    }

    if (track.releaseStatus === "scheduled") {
      showArtistError(
        "Bài hát đang có lịch phát hành. Hãy hủy lịch trước khi thay đổi trạng thái hiển thị."
      );
      return;
    }

    if (track.activeStatus === "hidden") {
      setIsActionLoading(true);

      try {
        const updatedTrack = await trackService.unhideArtistTrack(track._id);
        setTracks((currentTracks) =>
          currentTracks.map((item) =>
            item._id === updatedTrack?._id ? updatedTrack : item
          )
        );
        showArtistSuccess("Đã hiển thị lại bài hát thành công.");
      } catch {
        showArtistError("Không thể hiển thị lại bài hát này vào lúc này.");
      } finally {
        setIsActionLoading(false);
      }

      return;
    }

    setIsActionLoading(true);

    try {
      const updatedTrack = await trackService.hideArtistTrack(track._id);
      setTracks((currentTracks) =>
        currentTracks.map((item) => (item._id === updatedTrack?._id ? updatedTrack : item))
      );
      showArtistSuccess("Đã ẩn bài hát thành công.");
    } catch {
      showArtistError("Không thể ẩn bài hát này vào lúc này.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTrack = async (track) => {
    if (!track || isActionLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa vĩnh viễn bài hát này không? Thao tác này không thể hoàn tác."
    );

    if (!confirmed) {
      return;
    }

    setIsActionLoading(true);

    try {
      await trackService.deleteArtistTrack(track._id);
      setTracks((currentTracks) => currentTracks.filter((item) => item._id !== track._id));
      showArtistSuccess("Đã xóa bài hát thành công.");
    } catch {
      showArtistError("Không thể xóa bài hát này vào lúc này.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitForApproval = async (track) => {
    if (!track || isActionLoading) {
      return;
    }

    if (!canArtistSubmitTrack(track)) {
      showArtistError(
        "Chỉ bài hát ở trạng thái bản nháp hoặc bị từ chối mới có thể gửi duyệt."
      );
      return;
    }

    const submitIssues = getSubmitReadinessIssues(track);

    if (submitIssues.length > 0) {
      showArtistError(
        `Vui lòng hoàn thiện các mục sau trước khi gửi duyệt:\n${submitIssues
          .map((item) => `- ${item}`)
          .join("\n")}\n\nBạn có thể mở trang chỉnh sửa để bổ sung thông tin còn thiếu.`
      );
      return;
    }

    setIsActionLoading(true);
    setSubmitTarget(null);

    try {
      const updatedTrack = await trackService.submitForApproval(track._id);
      setTracks((current) => current.map((item) => (item._id === updatedTrack?._id ? updatedTrack : item)));
      showArtistSuccess("Đã gửi bài hát để chờ duyệt.");
    } catch {
      showArtistError("Không thể gửi bài hát để duyệt vào lúc này.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const tabCounts = useMemo(
    () => ({
      all: tracks.length,
      active: tracks.filter((track) => track.activeStatus === "active").length,
      pending: tracks.filter((track) => getArtistTrackReviewStatus(track) === "pending").length,
      draft: tracks.filter((track) => track.approvalStatus === "draft").length,
      hidden: tracks.filter((track) => track.activeStatus === "hidden").length,
      rejected: tracks.filter((track) => getArtistTrackReviewStatus(track) === "rejected").length,
    }),
    [tracks]
  );

  return (
    <section className="-m-6 space-y-6">
      {errorMessage ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}


      <div className="bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
              Quản lý bài hát
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b45] sm:text-[32px]">
              Quản lý kho bài hát của nghệ sĩ
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8d87aa]">
              Theo dõi trạng thái bài hát, sắp xếp bản nháp, xem hiệu suất phát
              và quản lý toàn bộ danh mục bài hát trong khu vực nghệ sĩ.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(routePaths.artistCreateTrack)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f225d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#221745] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tạo bài hát
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={Music4}
            label="Tổng bài hát"
            value={formatTrackCount(trackStats.totalTracks)}
            helper="Toàn bộ danh mục"
            tint="violet"
          />
          <MetricCard
            icon={PlayCircle}
            label="Đang phát hành"
            value={formatTrackCount(trackStats.activeTracks)}
            helper="Hiện đang hiển thị"
            tint="emerald"
          />
          <MetricCard
            icon={Clock3}
            label="Chờ duyệt"
            value={formatTrackCount(trackStats.pendingTracks)}
            helper="Đang đợi kiểm duyệt"
            tint="amber"
          />
          <MetricCard
            icon={AudioLines}
            label="Tổng lượt phát"
            value={formatTrackCount(trackStats.totalPlays)}
            helper="Toàn thời gian"
            tint="sky"
          />
          <MetricCard
            icon={Heart}
            label="Tổng lượt thích"
            value={formatTrackCount(trackStats.totalLikes)}
            helper="Toàn thời gian"
            tint="rose"
          />
        </div>

        <div className="mt-8 border-b border-[#ece8ff]">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {LIST_TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "inline-flex items-center gap-2 rounded-t-2xl px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "border-b-2 border-[#6f5cf1] text-[#5c4fe0]"
                      : "text-[#8d87aa] hover:text-[#33265f]",
                  ].join(" ")}
                >
                  {tab.label}
                  <span className="rounded-full bg-[#f1edff] px-2 py-0.5 text-xs text-[#6f5cf1]">
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {false && (
          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_170px_160px_auto]">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9e98b8]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              maxLength={ARTIST_INPUT_LIMITS.search}
              placeholder="Tìm bài hát, album, thể loại..."
              className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white pl-11 pr-4 text-sm text-[#241b45] outline-none transition placeholder:text-[#a59fbe] focus:border-[#7c6cf2]"
            />
          </label>

          <select
            value={selectedAlbum}
            onChange={(event) => setSelectedAlbum(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 text-sm text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
          >
            <option value="all">Tất cả album</option>
            {albumOptions.map((album) => (
              <option key={album.value} value={album.value}>
                {album.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 text-sm text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="h-12 w-full rounded-2xl border border-[#e6e0ff] bg-white px-4 text-sm text-[#241b45] outline-none transition focus:border-[#7c6cf2]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedAlbum("all");
              setStatusFilter("all");
              setSortOrder("latest");
              setActiveTab("all");
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#ddd4ff] bg-[#f8f6ff] px-4 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f1edff]"
          >
            <Filter className="h-4 w-4" />
            Đặt lại
          </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_280px] 2xl:grid-cols-[minmax(0,1.75fr)_300px]">
          <div className="overflow-hidden rounded-[28px] border border-[#ece8ff] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#faf8ff] text-[#8d87aa]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Bài hát</th>
                    <th className="px-5 py-4 font-semibold">Album</th>
                    <th className="px-5 py-4 font-semibold">Thời lượng</th>
                    <th className="px-5 py-4 font-semibold">Trạng thái</th>
                    <th className="px-5 py-4 font-semibold">Lượt phát</th>
                    <th className="px-5 py-4 font-semibold">Lượt thích</th>
                    <th className="px-5 py-4 font-semibold">Cập nhật</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-[#8d87aa]">
                        Đang tải danh sách bài hát...
                      </td>
                    </tr>
                  ) : filteredTracks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <p className="text-base font-semibold text-[#241b45]">
                          Không có bài hát phù hợp
                        </p>
                        <p className="mt-2 text-sm text-[#8d87aa]">
                          Hãy thử bộ lọc khác hoặc tạo bài hát mới để bắt đầu xây
                          dựng danh mục của bạn.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTracks.map((track) => {
                      const isSelected = track._id === previewTrack?._id;

                      return (
                        <tr
                          key={track._id}
                          onClick={() => setSelectedTrackId(track._id)}
                          onDoubleClick={() => handleViewTrack(track._id)}
                          className={[
                            "cursor-pointer border-t border-[#f0ebff] transition hover:bg-[#faf8ff]",
                            isSelected ? "bg-[#f8f6ff]" : "bg-white",
                          ].join(" ")}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveTrackArtwork(track)}
                                alt={track?.title || "Bài hát"}
                                className="h-12 w-12 rounded-2xl object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#241b45]">
                                  {track?.title || "Chưa có tên bài hát"}
                                </p>
                                <p className="mt-1 truncate text-xs text-[#8d87aa]">
                                  {getTrackGenreLabel(track)} · {formatTrackDate(track?.releaseDate)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {getTrackAlbumLabel(track)}
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {getTrackDisplayDuration(track?.duration)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill value={track?.activeStatus} />
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {formatTrackCount(track?.stats?.totalPlay)}
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {formatTrackCount(track?.stats?.totalLike)}
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {formatTrackDate(track?.updatedAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredTracks.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-[#ece8ff] px-5 py-4 text-sm text-[#8d87aa] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hiển thị {filteredTracks.length} / {tracks.length} bài hát
                </p>
                <p>
                  Đang chọn:{" "}
                  <span className="font-semibold text-[#241b45]">
                    {previewTrack?.title || "Chưa chọn"}
                  </span>
                </p>
              </div>
            ) : null}
          </div>

          <PreviewSidebar
            track={previewTrack}
            canSubmitCurrentTrack={Boolean(
              previewTrack && canArtistSubmitTrack(previewTrack)
            )}
            isActionLoading={isActionLoading}
            onEdit={() => previewTrack && handleEditTrack(previewTrack._id)}
            onView={() => previewTrack && handleViewTrack(previewTrack._id)}
            onOpenAnalytics={() =>
              previewTrack && navigate(buildTrackInsightsPath(previewTrack._id))
            }
            onHide={() => handleHideTrack(previewTrack)}
            onDelete={() => handleDeleteTrack(previewTrack)}
            onSubmit={() => {
              if (!previewTrack) {
                return;
              }

              const issues = getSubmitReadinessIssues(previewTrack);

              if (issues.length > 0) {
                showArtistError(
                  `Vui lòng hoàn thiện các mục sau trước khi gửi duyệt:\n${issues
                    .map((item) => `- ${item}`)
                    .join("\n")}\n\nBạn có thể mở trang chỉnh sửa để bổ sung thông tin còn thiếu.`
                );
                return;
              }

              setSubmitTarget(previewTrack);
            }}
          />
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(submitTarget)}
        title="Gửi bài hát để duyệt?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài hát trong thời gian chờ quản trị viên xử lý. Bạn có muốn tiếp tục không?"
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isLoading={isActionLoading}
        onCancel={() => setSubmitTarget(null)}
        onConfirm={() => handleSubmitForApproval(submitTarget)}
      />
    </section>
  );
};

export const ReleasesPage = () => <ArtistReleaseSchedulePage />;

export const AnalyticsPage = () => (
  <ArtistSectionPage
    title="Phân tích"
    description="Xem tăng trưởng người nghe, hiệu suất phát hành và các chỉ số lượt nghe trên toàn bộ danh mục bài hát."
  />
);

export const FansPage = () => (
  <ArtistSectionPage
    title="Người hâm mộ"
    description="Hiểu rõ ai đang nghe nhạc của bạn, họ khám phá bạn từ đâu và mức độ tương tác thay đổi theo thời gian ra sao."
  />
);

export const RoyaltiesPage = () => (
  <ArtistSectionPage
    title="Tiền bản quyền"
    description="Theo dõi doanh thu, mốc thanh toán và nắm rõ bức tranh tổng thể về nguồn thu của bạn."
  />
);

export const SettingsPage = () => (
  <ArtistSectionPage
    title="Cài đặt"
    description="Quản lý hồ sơ nghệ sĩ, tùy chọn nền tảng và các thiết lập tài khoản trong khu vực nghệ sĩ."
  />
);
