import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Music2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import {
  getArtistAlbumsService,
  hideAlbumService,
  unhideAlbumService,
} from "../../services/artist/artistAlbumService";
import { routePaths } from "../../routes/routePaths";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";
import {
  createPlaceholderImage,
  formatTrackDuration,
  resolveAlbumTotalDurationSeconds,
} from "../../utils/albumDetail";

const STATUS_META = {
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

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
};

const ArtistAlbumPage = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const viewMode = "list";
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [hideConfirm, setHideConfirm] = useState(null);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadArtistAlbums = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getArtistAlbumsService({ page: currentPage });

        if (!isMounted) {
          return;
        }

        setAlbums(result.albums);
        setPagination(result.pagination);
      } catch {
        if (!isMounted) {
          return;
        }

        setAlbums([]);
        setPagination(null);
        setErrorMessage("Không thể tải danh sách album vào lúc này.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadArtistAlbums();

    return () => {
      isMounted = false;
    };
  }, [currentPage]);

  const filteredAlbums = albums;

  const handleToggleVisibility = async () => {
    if (!hideConfirm) {
      return;
    }

    setIsHiding(true);

    try {
      const updatedAlbum = hideConfirm.isHidden
        ? await unhideAlbumService(hideConfirm.id)
        : await hideAlbumService(hideConfirm.id);

      setAlbums((currentAlbums) =>
        currentAlbums.map((album) =>
          album.id === hideConfirm.id
            ? { ...album, status: updatedAlbum.status }
            : album
        )
      );
      showArtistSuccess(
        hideConfirm.isHidden
          ? "Đã hiển thị lại album thành công."
          : "Đã ẩn album thành công."
      );
      setHideConfirm(null);
    } catch {
      showArtistError(
        hideConfirm.isHidden
          ? "Không thể hiển thị lại album. Vui lòng thử lại."
          : "Không thể ẩn album. Vui lòng thử lại."
      );
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <section className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6f5cf1]">
            Thư viện phát hành
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#241b45]">
            Danh sách album
          </h1>
          <p className="mt-2 text-sm text-[#817a99]">
            Quản lý tất cả album thuộc hồ sơ nghệ sĩ của bạn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(routePaths.artistCreateAlbum)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(99,78,225,0.24)] transition hover:bg-[#5e4bdd]"
        >
          <Plus className="h-4 w-4" />
          Tạo album mới
        </button>
      </header>

      {errorMessage ? (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            aria-label="Đóng thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_14px_36px_rgba(32,23,71,0.06)]">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-[#8d87aa]">
            <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
            Đang tải danh sách album...
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3efff] text-[#6f5cf1]">
              <Music2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-lg font-bold text-[#332a52]">
              Bạn chưa có album nào
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#8d87aa]">
              Tạo album đầu tiên để sắp xếp và phát hành các bài hát của bạn.
            </p>
            <button
              type="button"
              onClick={() => navigate(routePaths.artistCreateAlbum)}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#6f5cf1] px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Tạo album mới
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredAlbums.map((album) => (
              <article
                key={album.id}
                className="group rounded-2xl border border-[#ece8ff] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(48,35,101,0.10)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate(routePaths.artistAlbumDetail(album.id))
                  }
                  className="block w-full text-left"
                >
                  <img
                    src={
                      album.coverImage || createPlaceholderImage(album.title)
                    }
                    alt={`Ảnh bìa album ${album.title}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <h2 className="mt-3 truncate font-bold text-[#332a52]">
                    {album.title}
                  </h2>
                  <p className="mt-1 text-xs text-[#9690ac]">
                    {album.trackCount || 0} bài hát ·{" "}
                    {formatTrackDuration(
                      resolveAlbumTotalDurationSeconds(album)
                    )}
                  </p>
                </button>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={album.status} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(routePaths.artistEditAlbum(album.id))
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7664ef] transition hover:bg-[#f2efff]"
                      aria-label={`Chỉnh sửa album ${album.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!["active", "hidden"].includes(album.status)}
                      onClick={() =>
                        setHideConfirm({
                          id: album.id,
                          title: album.title,
                          isHidden: album.status === "hidden",
                        })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#817a99] transition hover:bg-[#f2efff] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
                      title={
                        ["active", "hidden"].includes(album.status)
                          ? undefined
                          : "Album chưa phát hành nên chưa thể ẩn"
                      }
                      aria-label={
                        album.status === "hidden"
                          ? `Hiển thị album ${album.title}`
                          : `Ẩn album ${album.title}`
                      }
                    >
                      {album.status === "hidden" ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left text-sm">
              <thead className="border-b border-[#ece8ff] bg-[#faf9ff]">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9690ac]">
                  <th className="px-5 py-3.5">Album</th>
                  <th className="px-4 py-3.5">Ngày phát hành</th>
                  <th className="px-4 py-3.5">Bài hát</th>
                  <th className="px-4 py-3.5">Thời lượng</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0edf8]">
                {filteredAlbums.map((album) => (
                  <tr
                    key={album.id}
                    className="transition hover:bg-[#fcfbff]"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(routePaths.artistAlbumDetail(album.id))
                        }
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <img
                          src={
                            album.coverImage ||
                            createPlaceholderImage(album.title)
                          }
                          alt={`Ảnh bìa album ${album.title}`}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm"
                        />
                        <div className="min-w-0">
                          <p className="max-w-64 truncate font-semibold text-[#332a52] hover:text-[#6f5cf1]">
                            {album.title}
                          </p>
                          <p className="mt-1 text-xs text-[#9690ac]">
                            Album của bạn
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-[#746d8f]">
                      {formatDate(album.releaseDate)}
                    </td>
                    <td className="px-4 py-3.5 text-[#746d8f]">
                      {album.trackCount || 0}
                    </td>
                    <td className="px-4 py-3.5 text-[#746d8f]">
                      {formatTrackDuration(
                        resolveAlbumTotalDurationSeconds(album)
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={album.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(routePaths.artistAlbumDetail(album.id))
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8e3f5] text-[#746d8f] transition hover:border-[#b9adfa] hover:bg-[#f7f4ff] hover:text-[#6f5cf1]"
                          aria-label={`Xem album ${album.title}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(routePaths.artistEditAlbum(album.id))
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8e3f5] text-[#746d8f] transition hover:border-[#b9adfa] hover:bg-[#f7f4ff] hover:text-[#6f5cf1]"
                          aria-label={`Chỉnh sửa album ${album.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!["active", "hidden"].includes(album.status)}
                          onClick={() =>
                            setHideConfirm({
                              id: album.id,
                              title: album.title,
                              isHidden: album.status === "hidden",
                            })
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e8e3f5] text-[#746d8f] transition hover:border-[#b9adfa] hover:bg-[#f7f4ff] hover:text-[#6f5cf1] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-[#e8e3f5] disabled:hover:bg-transparent disabled:hover:text-[#746d8f]"
                          title={
                            ["active", "hidden"].includes(album.status)
                              ? undefined
                              : "Album chưa phát hành nên chưa thể ẩn"
                          }
                          aria-label={
                            album.status === "hidden"
                              ? `Hiển thị album ${album.title}`
                              : `Ẩn album ${album.title}`
                          }
                        >
                          {album.status === "hidden" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination ? (
          <div className="flex flex-col gap-3 border-t border-[#ece8ff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#8d87aa]">
              Trang {pagination.page || currentPage} /{" "}
              {pagination.totalPages || 1} · Tổng cộng{" "}
              {pagination.total || albums.length} album
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={currentPage === 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#e8e3f5] px-3 text-xs font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Trang trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => page + 1)}
                disabled={currentPage >= (pagination.totalPages || 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#e8e3f5] px-3 text-xs font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {hideConfirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#171026]/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_28px_80px_rgba(25,15,54,0.32)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#ece8ff] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#332a52]">
                  {hideConfirm.isHidden
                    ? "Hiển thị lại album"
                    : "Ẩn album"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#817a99]">
                  {hideConfirm.isHidden
                    ? `Bạn có muốn hiển thị lại album “${hideConfirm.title}” không?`
                    : `Bạn có muốn ẩn album “${hideConfirm.title}” không?`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHideConfirm(null)}
                disabled={isHiding}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#8d87aa] transition hover:bg-[#f5f2fc]"
                aria-label="Đóng hộp thoại"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-[#faf9ff] px-6 py-4 text-sm leading-6 text-[#746d8f]">
              {hideConfirm.isHidden
                ? "Album sẽ xuất hiện trở lại với người nghe."
                : "Album đã ẩn sẽ không hiển thị công khai. Bạn vẫn có thể hiển thị lại sau."}
            </div>

            <div className="flex gap-3 px-6 py-5">
              <button
                type="button"
                onClick={() => setHideConfirm(null)}
                disabled={isHiding}
                className="flex-1 rounded-xl border border-[#e1dced] px-4 py-2.5 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleToggleVisibility}
                disabled={isHiding}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5e4bdd] disabled:opacity-50"
              >
                {isHiding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isHiding
                  ? "Đang xử lý..."
                  : hideConfirm.isHidden
                    ? "Hiển thị lại"
                    : "Ẩn album"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistAlbumPage;
