import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  BadgeCheck,
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  Music4,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import PlayButton from "../../components/common/PlayButton";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import { usePlayer } from "../../hooks/usePlayer";
import { routePaths } from "../../routes/routePaths";
import { trackService } from "../../services/trackService";
import { getApiErrorFullMessage, getApiErrorMessage } from "../../utils/apiError";
import {
  canArtistEditTrack,
  canArtistSubmitTrack,
  getArtistTrackReviewStatus,
  getSubmitReadinessIssues,
  usesThirdPartyRights,
} from "../../utils/trackWorkflow";
import {
  formatTrackCount,
  formatTrackDate,
  formatTrackDateTime,
  getTrackActiveStatusMeta,
  getTrackAlbumLabel,
  getTrackApprovalStatusMeta,
  getTrackDisplayDuration,
  getTrackGenreLabel,
  getTrackReleaseStatusMeta,
  resolveTrackArtwork,
} from "../../utils/artistTrackPresentation";

const MetricCard = ({ icon, label, value, helper }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-[24px] border border-[#ece8ff] bg-white p-4 shadow-[0_12px_35px_rgba(32,23,71,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#8d87aa]">{label}</p>
          <p className="mt-3 text-[26px] font-semibold tracking-tight text-[#241b45] sm:text-2xl">
            {value}
          </p>
          {helper ? <p className="mt-2 text-xs text-[#9e98b8]">{helper}</p> : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] text-[#6f5cf1]">
          <IconComponent className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const DetailSection = ({ icon, eyebrow, title, children }) => {
  const IconComponent = icon;

  return (
    <section className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_12px_35px_rgba(32,23,71,0.06)] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] text-[#6f5cf1]">
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d87aa]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#241b45]">
            {title}
          </h2>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
};

const SidebarField = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-[#8d87aa]">{label}</span>
    <span className="text-right font-medium text-[#241b45]">{value}</span>
  </div>
);

const ArtistTrackDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { playTrack } = usePlayer();
  const [track, setTrack] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrack = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const detail = await trackService.getArtistTrackDetail(id);

        if (!isMounted) {
          return;
        }

        setTrack(detail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTrack(null);
        setErrorMessage(
          getApiErrorMessage(error, "Không thể tải bài hát này lúc này.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setTrack(null);
      setErrorMessage("Thiếu mã bài hát.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    loadTrack();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const artwork = useMemo(
    () => resolveTrackArtwork(track || { title: "Bài hát" }),
    [track]
  );

  const canPlayTrack =
    track?.activeStatus === "active" &&
    track?.approvalStatus === "approved" &&
    track?.releaseStatus === "released" &&
    Array.isArray(track?.audioFiles) &&
    track.audioFiles.length > 0;
  const canEdit = canArtistEditTrack(track);
  const canSubmit = canArtistSubmitTrack(track);
  const submitIssues = useMemo(() => getSubmitReadinessIssues(track), [track]);
  const hasLyrics = Boolean(track?.lyricsStatic?.trim());
  const activeMeta = getTrackActiveStatusMeta(track?.activeStatus);
  const approvalMeta = getTrackApprovalStatusMeta(getArtistTrackReviewStatus(track));
  const releaseMeta = getTrackReleaseStatusMeta(track?.releaseStatus);

  const handlePlay = async () => {
    if (!track) {
      return;
    }

    if (!canPlayTrack) {
      setActionError(
        "Bài hát chỉ có thể phát khi đang phát hành, đã được duyệt và có file âm thanh."
      );
      return;
    }

    await playTrack(
      {
        id: track._id,
        title: track.title,
        duration: track.duration,
        avatar: track.avatar,
        coverImage: track.coverImage,
        artist: track.artist,
        album: track.album,
        lyrics: {
          static: track.lyricsStatic,
          syncUrl: track.lyricsSyncUrl,
        },
      },
      {
        queue: [track],
        startIndex: 0,
        collection: {
          id: track.album?._id || track._id,
          type: track.album?._id ? "album" : "track",
          title: track.album?.title || track.title || "Bài hát",
          image: artwork,
          artistName: track.artist?.name || "Nghệ sĩ",
        },
      }
    );
  };

  const handleEditTrack = () => {
    if (!track) {
      return;
    }

    if (!canEdit) {
      setActionError("Bài hát này hiện đang bị khóa chỉnh sửa.");
      return;
    }

    navigate(routePaths.artistTrackEdit(track._id));
  };

  const handleSubmitForApproval = async () => {
    if (!track || isActionLoading || !canSubmit) {
      return;
    }

    if (submitIssues.length > 0) {
      setActionError(
        `Vui lòng hoàn thiện các mục sau trước khi gửi duyệt:\n${submitIssues
          .map((item) => `- ${item}`)
          .join("\n")}`
      );
      navigate(routePaths.artistTrackEdit(track._id));
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);
    setIsSubmitConfirmOpen(false);

    try {
      const updatedTrack = await trackService.submitForApproval(track._id);
      setTrack(updatedTrack);
      setActionMessage("Đã gửi bài hát để duyệt thành công.");
    } catch (error) {
      setActionError(
        getApiErrorFullMessage(error, "Không thể gửi bài hát này để duyệt.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditLyrics = () => {
    if (!track) {
      return;
    }

    navigate(`${routePaths.artistLyrics}?trackId=${track._id}`);
  };

  const handleHideTrack = async () => {
    if (!track || isActionLoading) {
      return;
    }

    if (track.releaseStatus === "scheduled") {
      setActionError(
        "Bài hát đang có lịch phát hành. Hãy hủy lịch trước khi thay đổi trạng thái hiển thị."
      );
      return;
    }

    if (track.activeStatus === "hidden") {
      setActionError("");
      setActionMessage("");
      setIsActionLoading(true);

      try {
        const updatedTrack = await trackService.unhideArtistTrack(track._id);
        setTrack(updatedTrack);
        setActionMessage("Đã hiển thị lại bài hát thành công.");
      } catch (error) {
        setActionError(
          getApiErrorMessage(error, "Không thể hiển thị lại bài hát này lúc này.")
        );
      } finally {
        setIsActionLoading(false);
      }

      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);

    try {
      const updatedTrack = await trackService.hideArtistTrack(track._id);
      setTrack(updatedTrack);
      setActionMessage("Đã ẩn bài hát thành công.");
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Không thể ẩn bài hát này lúc này.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTrack = async () => {
    if (!track || isActionLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa vĩnh viễn bài hát này không? Thao tác này không thể hoàn tác."
    );

    if (!confirmed) {
      return;
    }

    setActionError("");
    setActionMessage("");
    setIsActionLoading(true);

    try {
      await trackService.deleteArtistTrack(track._id);
      navigate(routePaths.artistMusic, {
        state: { message: "Đã xóa bài hát thành công." },
      });
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "Không thể xóa bài hát này lúc này.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-[#ece8ff] bg-white p-8 text-sm text-[#6b6682] shadow-sm">
        Đang tải chi tiết bài hát...
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h2 className="text-lg font-semibold">Không thể tải bài hát</h2>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(routePaths.artistMusic)}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6682] transition hover:text-[#3d2d73]"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại quản lý bài hát
      </button>

      {location.state?.message ? (
        <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          {location.state.message}
        </div>
      ) : null}

      {track?.pendingUpdate?.status === "pending" ? (
        <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Bản chỉnh sửa mới đang chờ admin duyệt. Người nghe hiện vẫn nghe phiên bản đang phát hành.
        </div>
      ) : null}

      {track?.pendingUpdate?.status === "rejected" && track?.pendingUpdate?.rejectReason ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Bản chỉnh sửa trước bị từ chối: {track.pendingUpdate.rejectReason}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="whitespace-pre-line rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_290px] 2xl:grid-cols-[minmax(0,1.65fr)_320px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-[#ece8ff] bg-white shadow-[0_18px_50px_rgba(32,23,71,0.08)]">
            <div className="grid gap-0 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="bg-[#f6f2ff] p-4 sm:p-5">
                <div className="overflow-hidden rounded-[24px]">
                  <img
                    src={artwork}
                    alt={track?.title || "Ảnh bìa bài hát"}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6cf2]">
                  Chi tiết bài hát
                </p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b45] sm:text-[32px]">
                  {track?.title || "Chưa có tên bài hát"}
                </h1>
                <p className="mt-2 text-sm text-[#8d87aa]">
                  {track?.artist?.name || "Nghệ sĩ"} · {getTrackAlbumLabel(track)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={["rounded-full border px-3 py-1 text-xs font-semibold", activeMeta.className].join(" ")}>
                    {activeMeta.label}
                  </span>
                  <span className={["rounded-full border px-3 py-1 text-xs font-semibold", approvalMeta.className].join(" ")}>
                    {approvalMeta.label}
                  </span>
                  <span className={["rounded-full border px-3 py-1 text-xs font-semibold", releaseMeta.className].join(" ")}>
                    {releaseMeta.label}
                  </span>
                </div>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-[#5e5678]">
                  {track?.description?.trim() ||
                    "Bài hát này chưa có mô tả. Hãy cập nhật trong trang chỉnh sửa trước khi gửi duyệt."}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <PlayButton
                    onClick={handlePlay}
                    label={canPlayTrack ? "Phát bài hát" : "Chưa thể phát"}
                    size="compact"
                    disabled={!canPlayTrack}
                  />
                  <button
                    type="button"
                    onClick={handleEditTrack}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#ddd4ff] bg-[#f8f6ff] px-4 py-3 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f1edff] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa bài hát
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Music4}
              label="Thời lượng"
              value={getTrackDisplayDuration(track?.duration)}
              helper="Tự nhận diện từ file gốc"
            />
            <MetricCard
              icon={CalendarDays}
              label="Ngày phát hành"
              value={formatTrackDate(track?.releaseDate)}
              helper="Lịch phát hành hiện tại"
            />
            <MetricCard
              icon={AudioLines}
              label="Lượt phát"
              value={formatTrackCount(track?.stats?.totalPlay)}
              helper="Toàn thời gian"
            />
            <MetricCard
              icon={BadgeCheck}
              label="Lượt thích"
              value={formatTrackCount(track?.stats?.totalLike)}
              helper="Toàn thời gian"
            />
          </div>

          <DetailSection
            icon={Music4}
            eyebrow="Tổng quan"
            title="Thông tin bài hát"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                  Album
                </p>
                <p className="mt-3 text-sm font-medium text-[#241b45]">
                  {getTrackAlbumLabel(track)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                  Thể loại
                </p>
                <p className="mt-3 text-sm font-medium text-[#241b45]">
                  {getTrackGenreLabel(track)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                  Ngày tạo
                </p>
                <p className="mt-3 text-sm font-medium text-[#241b45]">
                  {formatTrackDateTime(track?.createdAt)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                  Cập nhật
                </p>
                <p className="mt-3 text-sm font-medium text-[#241b45]">
                  {formatTrackDateTime(track?.updatedAt)}
                </p>
              </div>
            </div>
          </DetailSection>

          <DetailSection
            icon={FileText}
            eyebrow="Lời bài hát"
            title="Nội dung lời bài hát"
          >
            <div className="rounded-[24px] border border-[#ece8ff] bg-[#fbfaff] p-5 text-sm leading-7 text-[#5e5678]">
              {hasLyrics ? (
                <div className="relative">
                  <pre className="max-h-72 overflow-hidden whitespace-pre-wrap font-sans">
                    {track.lyricsStatic}
                  </pre>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#fbfaff] via-[#fbfaff]/95 to-transparent" />
                </div>
              ) : (
                <p>Chưa có lời bài hát tĩnh.</p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {hasLyrics ? (
                <button
                  type="button"
                  onClick={() => setIsLyricsModalOpen(true)}
                  className="rounded-2xl border border-[#ddd4ff] bg-[#f8f6ff] px-4 py-3 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f1edff]"
                >
                  Xem toàn bộ lời
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleEditLyrics}
                className="rounded-2xl border border-[#e6e0ff] px-4 py-3 text-sm font-medium text-[#4d4569] transition hover:bg-[#faf8ff]"
              >
                Chỉnh sửa lời bài hát
              </button>
            </div>
            <p className="mt-3 text-sm text-[#8d87aa]">
              File đồng bộ: {track?.lyricsSyncUrl ? track.lyricsSyncUrl.split("/").pop() : "Chưa cung cấp"}
            </p>
          </DetailSection>

          <DetailSection
            icon={ShieldCheck}
            eyebrow="Bản quyền"
            title="Thông tin bản quyền"
          >
            <div className="space-y-4 text-sm text-[#5e5678]">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                    Chủ sở hữu bản quyền
                  </p>
                  <p className="mt-3 font-medium text-[#241b45]">
                    {track?.copyright?.copyrightOwner || "Chưa cung cấp"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                    Chủ sở hữu bản ghi
                  </p>
                  <p className="mt-3 font-medium text-[#241b45]">
                    {track?.copyright?.recordingOwner || "Chưa cung cấp"}
                  </p>
                </div>
              </div>
              <div className="rounded-[22px] border border-[#ece8ff] bg-[#fbfaff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
                  Cam kết
                </p>
                <p className="mt-3 font-medium text-[#241b45]">
                  {track?.copyright?.declarationAccepted
                    ? "Đã xác nhận"
                    : "Chưa xác nhận"}
                </p>
              </div>
              {usesThirdPartyRights(track?.copyright) ? (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="font-semibold">Có sử dụng quyền của bên thứ ba</p>
                  <p className="mt-2 text-sm">
                    Tác phẩm gốc: {track?.copyright?.originalTrackTitle || "Chưa rõ"} của{" "}
                    {track?.copyright?.originalArtistName || "Chưa rõ"}
                  </p>
                  <p className="mt-2 text-sm">
                    Số tài liệu cấp phép: {track?.copyright?.licenseDocumentUrls?.length || 0}
                  </p>
                </div>
              ) : null}
            </div>
          </DetailSection>
        </div>

        <aside className="grid gap-6 md:grid-cols-2 xl:grid-cols-1 xl:self-start xl:sticky xl:top-6">
          <div className="rounded-[28px] border border-[#ece8ff] bg-white p-5 shadow-[0_18px_40px_rgba(32,23,71,0.08)] sm:p-6">
            <div className="overflow-hidden rounded-[24px] bg-[#f6f2ff]">
              <img
                src={artwork}
                alt={track?.title || "Ảnh bài hát"}
                className="aspect-square w-full object-cover"
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-[#241b45]">
              {track?.title || "Chưa có tên bài hát"}
            </h3>
            <p className="mt-1 text-sm text-[#8d87aa]">
              {track?.artist?.name || "Nghệ sĩ"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={["rounded-full border px-3 py-1 text-xs font-semibold", activeMeta.className].join(" ")}>
                {activeMeta.label}
              </span>
              <span className={["rounded-full border px-3 py-1 text-xs font-semibold", approvalMeta.className].join(" ")}>
                {approvalMeta.label}
              </span>
            </div>

            <div className="mt-6 space-y-4 rounded-[22px] border border-[#f0ebff] bg-[#fbfaff] p-4">
              <SidebarField label="Album" value={getTrackAlbumLabel(track)} />
              <SidebarField
                label="Thời lượng"
                value={getTrackDisplayDuration(track?.duration)}
              />
              <SidebarField label="Thể loại" value={getTrackGenreLabel(track)} />
              <SidebarField label="Phát hành" value={formatTrackDate(track?.releaseDate)} />
              <SidebarField
                label="Lượt phát"
                value={formatTrackCount(track?.stats?.totalPlay)}
              />
              <SidebarField
                label="Lượt thích"
                value={formatTrackCount(track?.stats?.totalLike)}
              />
              <SidebarField label="Cập nhật" value={formatTrackDate(track?.updatedAt)} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={handleEditTrack}
                disabled={!canEdit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ddd4ff] bg-white px-4 py-3 text-sm font-medium text-[#5d4fe0] transition hover:bg-[#f8f6ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa bài hát
              </button>
              <button
                type="button"
                onClick={handleEditLyrics}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e6e0ff] bg-[#f8f6ff] px-4 py-3 text-sm font-medium text-[#3e3164] transition hover:bg-[#f1edff]"
              >
                <FileText className="h-4 w-4" />
                Chỉnh sửa lời bài hát
              </button>
              <button
                type="button"
                onClick={() => navigate(`${routePaths.artistAnalytics}?trackId=${track?._id}`)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 transition hover:bg-sky-100"
              >
                <AudioLines className="h-4 w-4" />
                Xem phân tích
              </button>
              {canSubmit ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setActionMessage("");
                    setIsSubmitConfirmOpen(true);
                  }}
                  disabled={isActionLoading || submitIssues.length > 0}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  Gửi duyệt
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleHideTrack}
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
              <button
                type="button"
                onClick={handleDeleteTrack}
                disabled={isActionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Xóa bài hát
              </button>
            </div>
          </div>

          {submitIssues.length > 0 && canSubmit ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-[0_12px_35px_rgba(32,23,71,0.04)]">
              <p className="font-semibold">Cần hoàn thiện trước khi gửi duyệt</p>
              <ul className="mt-3 space-y-2">
                {submitIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {track?.rejectReason ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900 shadow-[0_12px_35px_rgba(32,23,71,0.04)]">
              <p className="font-semibold">Lý do từ chối</p>
              <p className="mt-3">{track.rejectReason}</p>
            </div>
          ) : null}

          {track?.hiddenReason ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-[0_12px_35px_rgba(32,23,71,0.04)]">
              <p className="font-semibold">Lý do ẩn</p>
              <p className="mt-3">{track.hiddenReason}</p>
            </div>
          ) : null}
        </aside>
      </div>

      <ConfirmActionModal
        isOpen={isSubmitConfirmOpen}
        title="Gửi bài hát để duyệt?"
        message="Sau khi gửi duyệt, bạn sẽ không thể chỉnh sửa bài hát trong thời gian chờ admin xử lý. Bạn có muốn tiếp tục không?"
        confirmText="Gửi duyệt"
        cancelText="Hủy"
        isLoading={isActionLoading}
        onCancel={() => setIsSubmitConfirmOpen(false)}
        onConfirm={handleSubmitForApproval}
      />

      {isLyricsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsLyricsModalOpen(false)} />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#ece8ff] bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#ece8ff] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-[#241b45]">Toàn bộ lời bài hát</h3>
                <p className="mt-1 text-sm text-[#8d87aa]">
                  {track?.title || "Chưa có tên bài hát"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLyricsModalOpen(false)}
                className="rounded-full border border-[#e6e0ff] p-2 text-[#6b6682] transition hover:bg-[#faf8ff] hover:text-[#241b45]"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="rounded-[24px] border border-[#ece8ff] bg-[#fbfaff] p-5 text-sm leading-7 text-[#5e5678]">
                {hasLyrics ? (
                  <pre className="whitespace-pre-wrap font-sans">
                    {track.lyricsStatic}
                  </pre>
                ) : (
                  <p>Chưa có lời bài hát tĩnh.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistTrackDetailPage;
