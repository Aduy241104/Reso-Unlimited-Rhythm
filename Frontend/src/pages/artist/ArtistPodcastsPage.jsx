import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarPlus2,
  Eye,
  Mic2,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import podcastService from "../../services/podcastService";
import { routePaths } from "../../routes/routePaths";
import { createPlaceholderImage, formatTrackDuration } from "../../utils/albumDetail";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "approved", label: "Đã duyệt" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "draft", label: "Bản nháp" },
  { value: "rejected", label: "Bị từ chối" },
];

const STATUS_META = {
  draft: {
    label: "Bản nháp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  pending: {
    label: "Chờ duyệt",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Đã duyệt",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "Bị từ chối",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const formatCount = (value) =>
  new Intl.NumberFormat("vi-VN").format(Number(value) || 0);

const formatDuration = (value) => formatTrackDuration(value);

const getPodcastArtwork = (podcast) =>
  podcast?.coverImageUrl?.trim() ||
  createPlaceholderImage(podcast?.title || "Podcast", "#806ee4", "#241b45");

const getPodcastCreatorName = (podcast) =>
  podcast?.creator?.name || podcast?.creator?.displayName || "Nghệ sĩ Reso";

const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.draft;

const PodcastArtwork = ({ podcast, className = "" }) => {
  const fallback = createPlaceholderImage(
    podcast?.title || "Podcast",
    "#806ee4",
    "#241b45"
  );

  return (
    <img
      src={getPodcastArtwork(podcast)}
      alt={podcast?.title || "Ảnh Podcast"}
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
  );
};

const StatusPill = ({ status, blocked = false }) => {
  const meta = getStatusMeta(status);

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        meta.className,
      ].join(" ")}
    >
      {meta.label}
      {blocked ? " · Đã khóa" : ""}
    </span>
  );
};

const PreviewField = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-[#8d87aa]">{label}</span>
    <span className="text-right font-medium text-[#241b45]">{value}</span>
  </div>
);

const PodcastPreviewSidebar = ({
  podcast,
  onDelete,
}) => {
  if (!podcast) {
    return (
      <aside className="rounded-[28px] border border-dashed border-[#d9d2f4] bg-white p-8 text-center text-sm text-[#8d87aa] shadow-[0_12px_35px_rgba(32,23,71,0.04)]">
        Chọn một Podcast trong danh sách để xem nhanh thông tin quản lý.
      </aside>
    );
  }

  const isLocked = ["pending", "approved"].includes(podcast.approvalStatus);
  const detailPath = isLocked
    ? routePaths.artistPodcastDetail(podcast.id)
    : routePaths.artistPodcastEdit(podcast.id);

  return (
    <aside className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)] sm:p-6 xl:sticky xl:top-6">
      <div className="overflow-hidden rounded-[24px] bg-[#f6f2ff]">
        <PodcastArtwork podcast={podcast} className="aspect-square w-full object-cover" />
      </div>

      <div className="mt-5">
        <h2 className="text-xl font-semibold tracking-tight text-[#241b45]">
          {podcast.title || "Chưa đặt tiêu đề"}
        </h2>
        <p className="mt-1 text-sm text-[#8d87aa]">
          {getPodcastCreatorName(podcast)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill status={podcast.approvalStatus} blocked={podcast.isBlocked} />
          <span className="inline-flex rounded-full border border-[#e6e0ff] bg-[#f8f6ff] px-3 py-1 text-xs font-semibold text-[#62568e]">
            Podcast
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-[22px] border border-[#f0ebff] bg-[#fbfaff] p-4">
        <PreviewField label="Thời lượng" value={formatDuration(podcast.duration)} />
        <PreviewField label="Lượt nghe" value={formatCount(podcast.stats?.totalListen)} />
        <PreviewField
          label="Hiển thị"
          value={podcast.visibility === "public" ? "Công khai" : "Đang ẩn"}
        />
      </div>

      {podcast.rejectReason ? (
        <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Lý do từ chối</p>
          <p className="mt-2 leading-6">{podcast.rejectReason}</p>
        </div>
      ) : null}

      {podcast.blockedReason ? (
        <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Lý do khóa</p>
          <p className="mt-2 leading-6">{podcast.blockedReason}</p>
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-semibold text-[#241b45]">Quản lý nhanh</p>
        <div className="mt-3 grid gap-3">
          <Link
            to={detailPath}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ddd4ff] bg-white px-4 py-3 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f7f5ff]"
          >
            {isLocked ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {isLocked ? "Xem Podcast" : "Chỉnh sửa Podcast"}
          </Link>

          {["draft", "rejected"].includes(podcast.approvalStatus) ? (
            <Link
              to={routePaths.artistPodcastEdit(podcast.id)}
              state={{ submitOnOpen: true }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              <Send className="h-4 w-4" />
              Gửi duyệt
            </Link>
          ) : null}

          {podcast.approvalStatus === "approved" &&
          !podcast.isBlocked &&
          podcast.releaseStatus !== "released" ? (
            <Link
              to={routePaths.artistCreateReleaseSchedule}
              state={{ releaseType: "podcast", targetId: podcast.id }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] px-4 py-3 text-sm font-medium text-[#3e3164] transition hover:bg-[#f1edff]"
            >
              <CalendarPlus2 className="h-4 w-4" />
              Lên lịch phát hành
            </Link>
          ) : null}

          {!isLocked ? (
            <button
              type="button"
              onClick={() => onDelete(podcast)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Xóa Podcast
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

const ArtistPodcastsPage = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [status, setStatus] = useState("all");
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await podcastService.listArtist({ status: "all" });
      setPodcasts(result.podcasts || []);
    } catch (reason) {
      setPodcasts([]);
      setError(
        reason?.message ||
          reason?.errors?.[0]?.message ||
          "Không thể tải danh sách Podcast."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPodcasts = useMemo(
    () =>
      status === "all"
        ? podcasts
        : podcasts.filter((podcast) => podcast.approvalStatus === status),
    [podcasts, status]
  );

  const statusCounts = useMemo(
    () => ({
      all: podcasts.length,
      approved: podcasts.filter((item) => item.approvalStatus === "approved").length,
      pending: podcasts.filter((item) => item.approvalStatus === "pending").length,
      draft: podcasts.filter((item) => item.approvalStatus === "draft").length,
      rejected: podcasts.filter((item) => item.approvalStatus === "rejected").length,
    }),
    [podcasts]
  );

  useEffect(() => {
    if (filteredPodcasts.length === 0) {
      setSelectedPodcastId("");
      return;
    }

    if (!filteredPodcasts.some((item) => item.id === selectedPodcastId)) {
      setSelectedPodcastId(filteredPodcasts[0].id);
    }
  }, [filteredPodcasts, selectedPodcastId]);

  const selectedPodcast =
    filteredPodcasts.find((item) => item.id === selectedPodcastId) ||
    filteredPodcasts[0] ||
    null;

  const remove = async (podcast) => {
    if (!podcast || !window.confirm("Xóa Podcast này? Bản ghi sẽ được lưu dưới dạng đã xóa.")) {
      return;
    }

    try {
      await podcastService.remove(podcast.id);
      await load();
    } catch (reason) {
      setError(reason?.message || "Không thể xóa Podcast.");
    }
  };

  return (
    <section className="-m-6 space-y-6">
      <div className="bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
              Quản lý Podcast
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b45] sm:text-[32px]">
              Podcast của tôi
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8d87aa]">
              Tạo bản nháp, gửi duyệt và quản lý trạng thái phát hành Podcast.
            </p>
          </div>

          <Link
            to={routePaths.artistCreatePodcast}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2f225d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#221745] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Tạo Podcast
          </Link>
        </div>

        {error ? (
          <p className="mt-6 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 border-b border-[#ece8ff]">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {STATUS_OPTIONS.map((option) => {
              const isActive = status === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={[
                    "inline-flex items-center gap-2 rounded-t-2xl px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "border-b-2 border-[#6f5cf1] text-[#5c4fe0]"
                      : "text-[#8d87aa] hover:text-[#33265f]",
                  ].join(" ")}
                >
                  {option.label}
                  <span className="rounded-full bg-[#f1edff] px-2 py-0.5 text-xs text-[#6f5cf1]">
                    {statusCounts[option.value]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_310px] 2xl:grid-cols-[minmax(0,1.75fr)_330px]">
          <div className="overflow-hidden rounded-[28px] border border-[#ece8ff] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#faf8ff] text-[#8d87aa]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Podcast</th>
                    <th className="px-5 py-4 font-semibold">Thời lượng</th>
                    <th className="px-5 py-4 font-semibold">Trạng thái</th>
                    <th className="px-5 py-4 font-semibold">Lượt nghe</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center text-[#8d87aa]">
                        Đang tải danh sách Podcast...
                      </td>
                    </tr>
                  ) : filteredPodcasts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center">
                        <Mic2 className="mx-auto h-8 w-8 text-[#cfc7ee]" />
                        <p className="mt-3 text-base font-semibold text-[#241b45]">
                          Chưa có Podcast phù hợp
                        </p>
                        <p className="mt-2 text-sm text-[#8d87aa]">
                          Hãy tạo Podcast mới để bắt đầu xây dựng danh mục của bạn.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPodcasts.map((podcast) => {
                      const isSelected = podcast.id === selectedPodcast?.id;

                      return (
                        <tr
                          key={podcast.id}
                          onClick={() => setSelectedPodcastId(podcast.id)}
                          className={[
                            "cursor-pointer border-t border-[#f0ebff] transition hover:bg-[#faf8ff]",
                            isSelected ? "bg-[#f8f6ff]" : "bg-white",
                          ].join(" ")}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <PodcastArtwork
                                podcast={podcast}
                                className="h-12 w-12 rounded-2xl object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#241b45]">
                                  {podcast.title || "Chưa đặt tiêu đề"}
                                </p>
                                <p className="mt-1 truncate text-xs text-[#8d87aa]">
                                  {getPodcastCreatorName(podcast)} · Podcast
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {formatDuration(podcast.duration)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusPill status={podcast.approvalStatus} blocked={podcast.isBlocked} />
                          </td>
                          <td className="px-5 py-4 text-[#5e5678]">
                            {formatCount(podcast.stats?.totalListen)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredPodcasts.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-[#ece8ff] px-5 py-4 text-sm text-[#8d87aa] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Hiển thị {filteredPodcasts.length} / {podcasts.length} Podcast
                </p>
                <p>
                  Đang chọn: {" "}
                  <span className="font-semibold text-[#241b45]">
                    {selectedPodcast?.title || "Chưa chọn"}
                  </span>
                </p>
              </div>
            ) : null}
          </div>

          <PodcastPreviewSidebar
            podcast={selectedPodcast}
            onDelete={remove}
          />
        </div>
      </div>
    </section>
  );
};

export default ArtistPodcastsPage;
