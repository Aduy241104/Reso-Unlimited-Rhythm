import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatTrackDuration } from "../../utils/albumDetail";

const FALLBACK_VALUE = "Chưa cập nhật";

const formatDate = (value) => {
  if (!value) return FALLBACK_VALUE;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return FALLBACK_VALUE;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatCount = (value) => {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 0) return "0";

  return new Intl.NumberFormat("vi-VN").format(count);
};

const resolveImage = (value, fallback = "") => {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
};

const getGenres = (track) => {
  if (Array.isArray(track?.genres)) {
    return track.genres
      .map((genre) => (typeof genre === "string" ? genre : genre?.name || genre?.title))
      .filter(Boolean);
  }

  const genre = typeof track?.genre === "string"
    ? track.genre
    : track?.genre?.name || track?.genre?.title;

  return genre ? [genre] : [];
};

const getTrackTypes = (copyright) => [
  copyright?.isOriginal ? "Bản gốc" : "",
  copyright?.isCover ? "Bản cover" : "",
  copyright?.isRemix ? "Bản remix" : "",
].filter(Boolean);

const getStatusLabel = (status) => {
  const labels = {
    active: "Đang hoạt động",
    draft: "Bản nháp",
    hidden: "Đã ẩn",
    blocked: "Đã khóa",
    pending: "Đang chờ",
    approved: "Đã duyệt",
    rejected: "Bị từ chối",
  };

  return labels[status] || status || FALLBACK_VALUE;
};

const StatBlock = ({ label, value }) => (
  <div className="rounded-lg bg-[#242424] px-3 py-3 text-center">
    <p className="text-base font-semibold text-white sm:text-lg">{ value }</p>
    <p className="mt-0.5 text-[11px] text-[#969696]">{ label }</p>
  </div>
);

const MetaField = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#858585]">
      { label }
    </p>
    <p className="mt-1 break-words text-sm leading-5 text-[#e8e8e8]">
      { value || FALLBACK_VALUE }
    </p>
  </div>
);

const TrackInformationModal = ({ isOpen, onClose, track, image }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !track || typeof document === "undefined") return null;

  const title = track?.title || "Bài hát chưa có tên";
  const artistName = track?.artist?.name || "Nghệ sĩ chưa xác định";
  const albumTitle = track?.album?.title || "Không thuộc album";
  const copyright = track?.copyright || {};
  const genres = getGenres(track);
  const trackTypes = getTrackTypes(copyright);
  const artistImage = resolveImage(track?.artist?.avatar, image);
  const albumImage = resolveImage(track?.album?.coverImage, image);
  const copyrightCredits = [
    { label: "Chủ sở hữu bản quyền", value: copyright.copyrightOwner },
    { label: "Chủ sở hữu bản ghi", value: copyright.recordingOwner },
    { label: "Nhạc sĩ", value: copyright.composer },
    { label: "Người viết lời", value: copyright.lyricist },
    { label: "Nhà sản xuất", value: copyright.producer },
    { label: "Bài hát gốc", value: copyright.originalTrackTitle },
    { label: "Nghệ sĩ gốc", value: copyright.originalArtistName },
  ].filter((item) => item.value);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-4"
      onClick={ onClose }
    >
      <div
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[680px] overflow-y-auto rounded-xl border border-[#5a5a5a] bg-[#181818] shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-2rem)]"
        onClick={ (event) => event.stopPropagation() }
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-information-modal-title"
      >
        <header className="flex items-center justify-between border-b border-[#414141] px-4 py-3 sm:px-5">
          <h2 id="track-information-modal-title" className="text-base font-semibold text-white">
            Thông tin bài hát
          </h2>
          <button
            type="button"
            onClick={ onClose }
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#a9a9a9] transition hover:bg-[#292929] hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={ image }
              alt={ `Ảnh bìa ${title}` }
              className="h-28 w-28 shrink-0 rounded-lg border border-[#505050] object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-1.5">
                { genres.map((genre) => (
                  <span key={ genre } className="rounded-full bg-[#2a2a2a] px-2.5 py-1 text-[11px] text-[#bdbdbd]">
                    { genre }
                  </span>
                )) }
                { track?.isFavorite ? (
                  <span className="rounded-full bg-[#2a2a2a] px-2.5 py-1 text-[11px] text-[#d2d2d2]">
                    Đã yêu thích
                  </span>
                ) : null }
              </div>
              <h3 className="break-words text-2xl font-semibold text-white">{ title }</h3>
              { track?.versionTitle ? (
                <p className="mt-1 text-sm text-[#b1b1b1]">{ track.versionTitle }</p>
              ) : null }
              <p className="mt-2 text-sm text-[#8f8f8f]">{ artistName }</p>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <StatBlock label="Thời lượng" value={ formatTrackDuration(track?.duration) } />
            <StatBlock label="Lượt nghe" value={ formatCount(track?.stats?.totalPlay) } />
            <StatBlock label="Lượt thích" value={ formatCount(track?.stats?.totalLike) } />
          </section>

          <section className="border-t border-[#414141] pt-5">
            <h4 className="mb-4 text-sm font-semibold text-white">Thông tin phát hành</h4>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <MetaField label="Ngày phát hành" value={ formatDate(track?.releaseDate) } />
              <MetaField label="Album" value={ albumTitle } />
              <MetaField label="Thể loại" value={ genres.join(", ") || FALLBACK_VALUE } />
              { track?.isFavorite && track?.favoritedAt ? (
                <MetaField label="Ngày yêu thích" value={ formatDate(track.favoritedAt) } />
              ) : null }
            </div>
          </section>

          <section className="border-t border-[#414141] pt-5">
            <h4 className="mb-4 text-sm font-semibold text-white">Nghệ sĩ</h4>
            <div className="flex gap-3 rounded-lg bg-[#222222] p-4">
              <img
                src={ artistImage }
                alt={ artistName }
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-medium text-white">{ artistName }</p>
                  <span className="text-xs text-[#858585]">
                    { getStatusLabel(track?.artist?.activeStatus) }
                  </span>
                </div>
                { track?.artist?.bio ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#a9a9a9]">
                    { track.artist.bio }
                  </p>
                ) : null }
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#909090]">
                  <span>{ formatCount(track?.artist?.stats?.followers) } người theo dõi</span>
                  <span>{ formatCount(track?.artist?.stats?.monthlyListeners) } người nghe/tháng</span>
                  <span>{ formatCount(track?.artist?.stats?.totalStreams) } lượt nghe</span>
                </div>
              </div>
            </div>
          </section>

          { track?.album ? (
            <section className="border-t border-[#414141] pt-5">
              <h4 className="mb-4 text-sm font-semibold text-white">Album</h4>
              <div className="flex items-center gap-3">
                <img
                  src={ albumImage }
                  alt={ albumTitle }
                  className="h-14 w-14 shrink-0 rounded-md border border-[#484848] object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{ albumTitle }</p>
                  <p className="mt-1 text-xs text-[#8f8f8f]">
                    { formatDate(track?.album?.releaseDate) } · { getStatusLabel(track?.album?.status) }
                  </p>
                </div>
              </div>
            </section>
          ) : null }

          <section className="border-t border-[#414141] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-white">Bản quyền và đóng góp</h4>
              <div className="flex flex-wrap gap-1.5">
                { (trackTypes.length > 0 ? trackTypes : [FALLBACK_VALUE]).map((type) => (
                  <span key={ type } className="rounded-full bg-[#2a2a2a] px-2.5 py-1 text-[11px] text-[#bdbdbd]">
                    { type }
                  </span>
                )) }
              </div>
            </div>

            { copyrightCredits.length > 0 ? (
              <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                { copyrightCredits.map((item) => (
                  <MetaField key={ item.label } label={ item.label } value={ item.value } />
                )) }
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#8f8f8f]">Chưa có thông tin người đóng góp.</p>
            ) }

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#a6a6a6]">
              <span className="rounded-md bg-[#242424] px-2.5 py-1.5">
                Sample: { copyright.usesSample ? "Có" : "Không" }
              </span>
              <span className="rounded-md bg-[#242424] px-2.5 py-1.5">
                Beat cấp phép: { copyright.usesLicensedBeat ? "Có" : "Không" }
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TrackInformationModal;
