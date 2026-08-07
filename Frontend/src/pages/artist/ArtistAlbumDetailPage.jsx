import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  Info,
  ListMusic,
  Loader2,
  Music2,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  addTrackToAlbumService,
  getArtistAlbumDetailService,
  publishAlbumService,
  removeTrackFromAlbumService,
} from "../../services/artist/artistAlbumService";
import { getArtistTracksService } from "../../services/artist/artistTrackService";
import { routePaths } from "../../routes/routePaths";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import {
  createPlaceholderImage,
  formatTrackDuration,
  resolveAlbumTotalDurationSeconds,
  resolveTrackAvatar,
} from "../../utils/albumDetail";

const ALBUM_STATUS_META = {
  active: {
    label: "Đã phát hành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  draft: {
    label: "Bản nháp",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  hidden: {
    label: "Đã ẩn",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  blocked: {
    label: "Bị khóa",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

const TRACK_STATUS_LABELS = {
  active: "Đang phát hành",
  draft: "Bản nháp",
  hidden: "Đã ẩn",
  blocked: "Bị khóa",
};

const formatDate = (value, includeTime = false) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};

const InfoRow = ({ label, value }) => (
  <div className="grid gap-1 border-b border-[#f0edf8] py-3 last:border-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
    <dt className="text-xs font-medium text-[#9690ac]">{label}</dt>
    <dd className="text-sm font-semibold text-[#514969]">{value}</dd>
  </div>
);

const ArtistAlbumDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);
  const [availableTracks, setAvailableTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [isAddingTracks, setIsAddingTracks] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [isPublishingAlbum, setIsPublishingAlbum] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAlbumDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const albumDetail = await getArtistAlbumDetailService(id);

        if (isMounted) {
          setAlbum(albumDetail);
        }
      } catch {
        if (isMounted) {
          setAlbum(null);
          setErrorMessage("Không thể tải chi tiết album vào lúc này.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setAlbum(null);
      setErrorMessage("Không tìm thấy mã album.");
      setIsLoading(false);
      return undefined;
    }

    loadAlbumDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const trackItems = useMemo(() => album?.tracks ?? [], [album]);
  const totalPlays = useMemo(
    () =>
      trackItems.reduce(
        (sum, item) => sum + Number(item?.track?.stats?.totalPlay || 0),
        0
      ),
    [trackItems]
  );

  const loadAvailableTracks = async () => {
    setTracksLoading(true);

    try {
      const result = await getArtistTracksService({
        unassignedOnly: true,
        approvalStatus: "approved",
        limit: 100,
      });
      const currentTrackIds = new Set(
        trackItems
          .map((item) => item?.track?.id || item?.track?._id)
          .filter(Boolean)
          .map(String)
      );
      setAvailableTracks(
        result.tracks.filter(
          (track) =>
            track?.approvalStatus === "approved" &&
            !track?.album &&
            !currentTrackIds.has(String(track._id || track.id))
        )
      );
    } catch {
      showArtistError(
        "Không thể tải danh sách bài hát để thêm vào album."
      );
    } finally {
      setTracksLoading(false);
    }
  };

  const handleAddTracksClick = async () => {
    setShowAddTracksModal(true);
    setSelectedTracks([]);
    await loadAvailableTracks();
  };

  const handleAddTracks = async () => {
    if (selectedTracks.length === 0) {
      return;
    }

    setIsAddingTracks(true);

    try {
      for (const trackId of selectedTracks) {
        await addTrackToAlbumService(album.id, trackId);
      }

      const updatedAlbum = await getArtistAlbumDetailService(id);
      setAlbum(updatedAlbum);
      setSelectedTracks([]);
      setShowAddTracksModal(false);
      showArtistSuccess("Đã thêm bài hát vào album.");
    } catch {
      showArtistError("Không thể thêm bài hát vào album.");
    } finally {
      setIsAddingTracks(false);
    }
  };

  const handleRemoveTrack = async () => {
    if (!removeConfirm) {
      return;
    }

    setIsRemovingTrack(true);

    try {
      await removeTrackFromAlbumService(album.id, removeConfirm.id);
      const updatedAlbum = await getArtistAlbumDetailService(id);

      setAlbum(updatedAlbum);
      setRemoveConfirm(null);
      showArtistSuccess("Đã gỡ bài hát khỏi album.");
    } catch {
      showArtistError("Không thể gỡ bài hát khỏi album.");
    } finally {
      setIsRemovingTrack(false);
    }
  };

  const handlePublishAlbum = async () => {
    setIsPublishingAlbum(true);

    try {
      const updatedAlbum = await publishAlbumService(album.id);
      setAlbum((current) => ({
        ...current,
        status: updatedAlbum?.status || "active",
      }));
      setPublishConfirmOpen(false);
      showArtistSuccess("Album đã được phát hành thành công.");
    } catch {
      showArtistError("Không thể phát hành album vào lúc này.");
    } finally {
      setIsPublishingAlbum(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[520px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#8d87aa]">
          <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
          Đang tải thông tin album...
        </div>
      </section>
    );
  }

  if (!album) {
    return (
      <section className="mx-auto max-w-[1600px] space-y-5">
        <button
          type="button"
          onClick={() => navigate(routePaths.artistAlbums)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5cf1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách album
        </button>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMessage || "Không tìm thấy album."}
        </div>
      </section>
    );
  }

  const albumCoverImage =
    album.coverImage || createPlaceholderImage(album.title);
  const albumTotalDurationSeconds = resolveAlbumTotalDurationSeconds(
    album,
    trackItems
  );
  const canReleaseAlbum = trackItems.length >= 2;
  const showReleaseActions = album.status === "draft";
  const statusMeta =
    ALBUM_STATUS_META[album.status] || ALBUM_STATUS_META.draft;

  const tracksSection = (
    <section className="overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_14px_36px_rgba(32,23,71,0.05)]">
      <div className="flex flex-col gap-3 border-b border-[#ece8ff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#332a52]">
            Danh sách bài hát
          </h2>
          <p className="mt-1 text-xs text-[#9690ac]">
            {trackItems.length} bài hát trong album
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddTracksClick}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-4 text-sm font-semibold text-white transition hover:bg-[#5e4bdd]"
        >
          <Plus className="h-4 w-4" />
          Thêm bài hát
        </button>
      </div>

      {trackItems.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <ListMusic className="h-11 w-11 text-[#8b7af2]" />
          <h3 className="mt-4 text-sm font-bold text-[#40375e]">
            Chưa có bài hát nào
          </h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-[#9690ac]">
            Thêm ít nhất 2 bài hát để album đủ điều kiện phát hành.
          </p>
          <button
            type="button"
            onClick={handleAddTracksClick}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#eeeaff] px-4 text-sm font-semibold text-[#6552df]"
          >
            <Plus className="h-4 w-4" />
            Thêm bài hát đầu tiên
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-[#ece8ff] bg-[#faf9ff]">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9690ac]">
                <th className="w-16 px-5 py-3.5">STT</th>
                <th className="px-4 py-3.5">Bài hát</th>
                <th className="px-4 py-3.5">Thời lượng</th>
                <th className="px-4 py-3.5">Lượt phát</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0edf8]">
              {trackItems.map((item, index) => {
                const track = item.track;

                if (!track) {
                  return null;
                }

                const trackId = track.id || track._id;

                return (
                  <tr
                    key={trackId}
                    className="transition hover:bg-[#fcfbff]"
                  >
                    <td className="px-5 py-3.5 font-semibold text-[#9690ac]">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveTrackAvatar(
                            track,
                            createPlaceholderImage(track.title)
                          )}
                          alt={`Ảnh đại diện bài hát ${track.title}`}
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="max-w-72 truncate font-semibold text-[#332a52]">
                            {track.title}
                          </p>
                          <p className="mt-1 text-xs text-[#9690ac]">
                            {track.artist?.name || "Nghệ sĩ"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#746d8f]">
                      {formatTrackDuration(track.duration)}
                    </td>
                    <td className="px-4 py-3.5 text-[#746d8f]">
                      {Number(
                        track.stats?.totalPlay || 0
                      ).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {TRACK_STATUS_LABELS[track.activeStatus] ||
                          "Bản nháp"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setRemoveConfirm({
                            id: trackId,
                            title: track.title,
                          })
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Gỡ bài hát ${track.title} khỏi album`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <section className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate(routePaths.artistAlbums)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6f5cf1] transition hover:text-[#5946db]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách album
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {showReleaseActions && canReleaseAlbum ? (
            <>
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Play className="h-4 w-4" />
                Phát hành ngay
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(routePaths.artistCreateReleaseSchedule, {
                    state: {
                      releaseType: "album",
                      targetId: album.id,
                    },
                  })
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ddd7ff] bg-[#f7f4ff] px-4 text-sm font-semibold text-[#6552df] transition hover:bg-[#eeeaff]"
              >
                <CalendarDays className="h-4 w-4" />
                Lên lịch phát hành
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(routePaths.artistEditAlbum(id))}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e1dced] bg-white px-4 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff]"
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa album
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_16px_40px_rgba(32,23,71,0.07)]">
        <div className="bg-gradient-to-r from-[#faf8ff] via-white to-[#f7f4ff] p-5 sm:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <img
              src={albumCoverImage}
              alt={`Ảnh bìa album ${album.title}`}
              className="aspect-square w-full rounded-2xl object-cover shadow-[0_18px_40px_rgba(31,20,67,0.20)] sm:w-52"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a7bf1]">
                Album
              </p>
              <h1 className="mt-2 truncate text-3xl font-bold tracking-tight text-[#241b45] sm:text-4xl">
                {album.title}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#655d7e]">
                {album.artist?.name || "Nghệ sĩ"}
              </p>

              <div className="mt-5 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b95ae]">
                    Ngày phát hành
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-[#40375e]">
                    {formatDate(album.releaseDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b95ae]">
                    Tổng bài hát
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-[#40375e]">
                    {trackItems.length}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b95ae]">
                    Tổng thời lượng
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-[#40375e]">
                    {formatTrackDuration(albumTotalDurationSeconds)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b95ae]">
                    Trạng thái
                  </p>
                  <span
                    className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
              </div>

              {showReleaseActions && !canReleaseAlbum ? (
                <div className="mt-5 flex max-w-3xl items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  <Info className="mt-1 h-4 w-4 shrink-0" />
                  Album hiện có {trackItems.length} bài hát. Bạn cần ít nhất 2
                  bài hát để phát hành ngay hoặc lên lịch phát hành.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto border-t border-[#ece8ff] px-5 sm:px-7">
          {[
            { value: "overview", label: "Tổng quan" },
            { value: "tracks", label: "Danh sách bài hát" },
            { value: "details", label: "Thông tin chi tiết" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`relative shrink-0 py-4 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? "text-[#6552df]"
                  : "text-[#8d87aa] hover:text-[#514969]"
              }`}
            >
              {tab.label}
              {activeTab === tab.value ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#6f5cf1]" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" || activeTab === "details" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
          <section className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.05)] sm:p-6">
            <h2 className="text-lg font-bold text-[#332a52]">
              Thông tin album
            </h2>
            <dl className="mt-4">
              <InfoRow label="Tên album" value={album.title} />
              <InfoRow
                label="Nghệ sĩ"
                value={album.artist?.name || "Nghệ sĩ"}
              />
              <InfoRow label="Loại phát hành" value="Album" />
              <InfoRow
                label="Ngày phát hành"
                value={formatDate(album.releaseDate)}
              />
              <InfoRow label="Trạng thái" value={statusMeta.label} />
              <InfoRow
                label="Ngày tạo"
                value={formatDate(album.createdAt, true)}
              />
              <InfoRow
                label="Cập nhật lần cuối"
                value={formatDate(album.updatedAt, true)}
              />
            </dl>
          </section>

          <div className="space-y-5">
            <section className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.05)]">
              <h2 className="text-lg font-bold text-[#332a52]">Ảnh bìa</h2>
              <img
                src={albumCoverImage}
                alt={`Ảnh bìa album ${album.title}`}
                className="mx-auto mt-4 aspect-square w-full max-w-64 rounded-2xl object-cover"
              />
              <p className="mt-3 text-center text-xs leading-5 text-[#9690ac]">
                Ảnh vuông · Tối đa 10 MB
              </p>
            </section>

            <section className="rounded-[24px] border border-[#ece8ff] bg-white p-5 shadow-[0_14px_36px_rgba(32,23,71,0.05)]">
              <h2 className="text-lg font-bold text-[#332a52]">
                Thống kê nhanh
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Music2,
                    label: "Tổng bài hát",
                    value: trackItems.length,
                  },
                  {
                    icon: Play,
                    label: "Lượt phát",
                    value: totalPlays.toLocaleString("vi-VN"),
                  },
                  {
                    icon: Clock3,
                    label: "Thời lượng",
                    value: formatTrackDuration(albumTotalDurationSeconds),
                  },
                  {
                    icon: Heart,
                    label: "Lượt thích",
                    value: Number(album.stats?.totalLike || 0).toLocaleString(
                      "vi-VN"
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-[#faf9ff] p-3"
                  >
                    <item.icon className="h-4 w-4 text-[#7664ef]" />
                    <p className="mt-2 text-lg font-bold text-[#40375e]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#9690ac]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "overview" || activeTab === "tracks"
        ? tracksSection
        : null}

      {showAddTracksModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#171026]/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_28px_80px_rgba(25,15,54,0.32)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#ece8ff] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#332a52]">
                  Thêm bài hát vào album
                </h2>
                <p className="mt-1.5 text-sm text-[#817a99]">
                  Chọn các bài hát từ thư viện của bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddTracksModal(false);
                  setSelectedTracks([]);
                }}
                disabled={isAddingTracks}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#8d87aa] transition hover:bg-[#f5f2fc]"
                aria-label="Đóng cửa sổ thêm bài hát"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {tracksLoading ? (
                <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-[#8d87aa]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
                  Đang tải danh sách bài hát...
                </div>
              ) : availableTracks.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  <h3 className="mt-4 font-bold text-[#40375e]">
                    Không còn bài hát khả dụng
                  </h3>
                  <p className="mt-2 text-sm text-[#9690ac]">
                    Không có bài hát đã được duyệt nào chưa thuộc album.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableTracks.map((track) => {
                    const trackId = track._id || track.id;
                    const isSelected = selectedTracks.includes(trackId);

                    return (
                      <label
                        key={trackId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          isSelected
                            ? "border-[#a99cf5] bg-[#f7f4ff]"
                            : "border-[#ece8ff] hover:bg-[#fcfbff]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            setSelectedTracks((current) =>
                              event.target.checked
                                ? [...current, trackId]
                                : current.filter(
                                    (selectedId) => selectedId !== trackId
                                  )
                            )
                          }
                          className="h-4 w-4 accent-[#6f5cf1]"
                        />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eeeaff] text-[#7664ef]">
                          <Music2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#40375e]">
                            {track.title}
                          </p>
                          <p className="mt-1 text-xs text-[#9690ac]">
                            {track.artist?.name || "Nghệ sĩ"} ·{" "}
                            {formatTrackDuration(track.duration)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#ece8ff] px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddTracksModal(false);
                  setSelectedTracks([]);
                }}
                disabled={isAddingTracks}
                className="h-11 rounded-xl border border-[#e1dced] px-5 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddTracks}
                disabled={isAddingTracks || selectedTracks.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white transition hover:bg-[#5e4bdd] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingTracks ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isAddingTracks
                  ? "Đang thêm..."
                  : `Thêm ${selectedTracks.length} bài hát`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removeConfirm ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#171026]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_28px_80px_rgba(25,15,54,0.32)]">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-[#332a52]">
                Gỡ bài hát khỏi album
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#817a99]">
                Bạn có chắc muốn gỡ bài hát “{removeConfirm.title}” khỏi album
                này không?
              </p>
            </div>
            <div className="flex gap-3 border-t border-[#ece8ff] px-6 py-5">
              <button
                type="button"
                onClick={() => setRemoveConfirm(null)}
                disabled={isRemovingTrack}
                className="flex-1 rounded-xl border border-[#e1dced] px-4 py-2.5 text-sm font-semibold text-[#514969] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRemoveTrack}
                disabled={isRemovingTrack}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isRemovingTrack ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isRemovingTrack ? "Đang gỡ..." : "Gỡ bài hát"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmActionModal
        isOpen={publishConfirmOpen}
        title="Phát hành album ngay"
        message={`Album “${album.title}” sẽ được hiển thị công khai ngay bây giờ.`}
        confirmText="Phát hành ngay"
        cancelText="Hủy"
        onConfirm={handlePublishAlbum}
        onCancel={() => setPublishConfirmOpen(false)}
        isLoading={isPublishingAlbum}
      />
    </section>
  );
};

export default ArtistAlbumDetailPage;
