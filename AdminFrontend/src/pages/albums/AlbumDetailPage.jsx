import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock3, Disc3, ExternalLink, Music2, User } from "lucide-react";
import { getAdminAlbumDetailService } from "../../services/albumService";
import { routePaths } from "../../routes/routePaths";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatReleaseDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("vi-VN");
};

const formatDuration = (seconds) => {
  const normalizedSeconds = Number(seconds);

  if (!Number.isFinite(normalizedSeconds) || normalizedSeconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = Math.floor(normalizedSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const StatusBadge = ({ value }) => {
  const tone =
    value === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {value || "unknown"}
    </span>
  );
};

const InfoCard = ({ icon: Icon, title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
        <Icon size={17} className="text-slate-600" />
      </div>
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
    </div>
    {children}
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-700 text-right">{value || "—"}</span>
  </div>
);

const AlbumDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlbum = async () => {
      if (!id) {
        setErrorMessage("Thiếu mã album.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getAdminAlbumDetailService(id);

        if (!isMounted) {
          return;
        }

        setAlbum(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbum(null);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải chi tiết album."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAlbum();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const orderedTracks = useMemo(
    () =>
      Array.isArray(album?.tracks)
        ? [...album.tracks].sort((left, right) => (left?.order || 0) - (right?.order || 0))
        : [],
    [album?.tracks]
  );

  return (
    <section className="min-h-screen space-y-5 bg-slate-50/50 p-3 font-sans text-slate-800 antialiased lg:p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Quản lý nội dung
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Chi tiết album
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-600">
          Đang tải chi tiết album...
        </div>
      ) : !album ? (
        <div className="rounded-2xl bg-white px-6 py-20 text-center text-sm text-slate-500">
          {errorMessage || "Không tìm thấy album."}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-6 p-6 md:grid-cols-[220px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {album.coverImage ? (
                    <img
                      src={album.coverImage}
                      alt={album.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-slate-400">
                      <Disc3 size={40} />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Album bị báo cáo
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {album.title || "Album chưa có tên"}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={album.status} />
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {album.trackCount || 0} bài hát
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatDuration(album.totalDuration)}
                    </span>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                    <InfoRow label="Ngày phát hành" value={formatReleaseDate(album.releaseDate)} />
                    <InfoRow label="Tạo lúc" value={formatDateTime(album.createdAt)} />
                    <InfoRow label="Cập nhật" value={formatDateTime(album.updatedAt)} />
                    <InfoRow label="Mã album" value={album.id} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400">Nghệ sĩ sở hữu</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {album.artist?.name || "Nghệ sĩ không xác định"}
                        </p>
                      </div>
                      {album.artist?.id ? (
                        <Link
                          to={routePaths.artistDetail(album.artist.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          Xem nghệ sĩ
                          <ExternalLink size={14} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <InfoCard icon={Music2} title={`Danh sách bài hát (${orderedTracks.length})`}>
              {orderedTracks.length === 0 ? (
                <p className="text-sm text-slate-500">Album này chưa có bài hát nào.</p>
              ) : (
                <div className="space-y-3">
                  {orderedTracks.map((item) => {
                    const track = item?.track;

                    return (
                      <div
                        key={`${item?.order}-${track?.id || "track"}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Track {item?.order || "—"}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                            {track?.title || "Bài hát không xác định"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {track?.artist?.name || "Nghệ sĩ không xác định"} • {formatDuration(track?.duration)}
                          </p>
                        </div>

                        {track?.id ? (
                          <Link
                            to={routePaths.trackDetail(track.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Mở chi tiết
                            <ExternalLink size={14} />
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </InfoCard>
          </div>

          <div className="space-y-5">
            <InfoCard icon={User} title="Thông tin nghệ sĩ">
              <div className="space-y-3">
                <InfoRow label="Tên nghệ sĩ" value={album.artist?.name} />
                <InfoRow label="Mã nghệ sĩ" value={album.artist?.id} />
                <InfoRow label="Trạng thái" value={album.artist?.activeStatus || "—"} />
              </div>
            </InfoCard>

            <InfoCard icon={Calendar} title="Thời gian">
              <div className="space-y-3">
                <InfoRow label="Ngày phát hành" value={formatReleaseDate(album.releaseDate)} />
                <InfoRow label="Ngày tạo" value={formatDateTime(album.createdAt)} />
                <InfoRow label="Ngày cập nhật" value={formatDateTime(album.updatedAt)} />
              </div>
            </InfoCard>

            <InfoCard icon={Clock3} title="Thống kê nhanh">
              <div className="space-y-3">
                <InfoRow label="Tổng số bài hát" value={String(album.trackCount || 0)} />
                <InfoRow label="Tổng thời lượng" value={formatDuration(album.totalDuration)} />
                <InfoRow label="Trạng thái album" value={album.status || "—"} />
              </div>
            </InfoCard>
          </div>
        </div>
      )}
    </section>
  );
};

export default AlbumDetailPage;
