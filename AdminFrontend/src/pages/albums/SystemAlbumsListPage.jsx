import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import toast from "react-hot-toast";
import { ArrowUpRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getAdminAlbumsService,
  updateAdminAlbumStatusService,
} from "../../services/albumManagementService";
import { routePaths } from "../../routes/routePaths";
import {
  ALBUM_STATUS_OPTIONS,
  formatDate,
  formatDuration,
  formatNumber,
  getAlbumStatusBadge,
  getArtistStatusBadge,
  getInitials,
  replaceAlbumById,
} from "./utils";
import {
  EmptyState,
  StatCard,
  StatusBadge,
} from "./components/AlbumManagementPrimitives";

const initialModalState = {
  isOpen: false,
  type: "",
  album: null,
};

const SystemAlbumsListPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({
    q: "",
    status: "active",
    page: 1,
    limit: 10,
  });
  const [albumsResponse, setAlbumsResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [modalState, setModalState] = useState(initialModalState);
  const [blockForm, setBlockForm] = useState({
    blockedReason: "",
    adminNote: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const albums = albumsResponse?.data?.albums ?? [];
  const pagination = albumsResponse?.meta ?? null;

  const loadAlbums = async (params = query) => {
    setIsLoading(true);
    setMessage("");

    try {
      const result = await getAdminAlbumsService(params);
      setAlbumsResponse(result);
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tải danh sách album."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAlbums(query);
  }, [query]);

  const openBlockModal = (album) => {
    setBlockForm({
      blockedReason: album?.blockedReason || "",
      adminNote: "",
    });
    setModalState({
      isOpen: true,
      type: "block",
      album,
    });
  };

  const openUnblockModal = (album) => {
    setModalState({
      isOpen: true,
      type: "unblock",
      album,
    });
  };

  const closeModal = (force = false) => {
    if (isSubmitting && !force) return;
    setModalState(initialModalState);
    setBlockForm({
      blockedReason: "",
      adminNote: "",
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery((prev) => ({
      ...prev,
      q: searchTerm.trim(),
      page: 1,
    }));
  };

  const handleStatusChange = (event) => {
    setQuery((prev) => ({
      ...prev,
      status: event.target.value,
      page: 1,
    }));
  };

  const handlePageChange = ({ selected }) => {
    setQuery((prev) => ({
      ...prev,
      page: selected + 1,
    }));
  };

  const submitStatusUpdate = async () => {
    const albumId = modalState?.album?.id;
    if (!albumId) return;

    const payload =
      modalState.type === "block"
        ? {
            action: "block",
            blockedReason: blockForm.blockedReason.trim(),
            adminNote: blockForm.adminNote.trim(),
          }
        : { action: "unblock" };

    if (
      modalState.type === "block" &&
      !payload.blockedReason &&
      !payload.adminNote
    ) {
      toast.error("Vui lòng nhập lý do chặn hoặc ghi chú admin.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateAdminAlbumStatusService(albumId, payload);
      const nextAlbum = result?.data?.album;

      if (nextAlbum) {
        setAlbumsResponse((current) => ({
          ...(current || {}),
          data: {
            ...(current?.data || {}),
            albums: replaceAlbumById(current?.data?.albums ?? [], nextAlbum),
          },
        }));
      }

      toast.success(result?.message || "Cập nhật trạng thái album thành công.");
      closeModal(true);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể cập nhật trạng thái album."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = pagination?.total ?? 0;
  const visibleCount = albums.length;
  const pageLabel = pagination
    ? `${pagination.page}/${pagination.totalPages}`
    : "1/1";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Quản lý album</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Danh sách album hệ thống
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Tổng số" value={total} />
          <StatCard label="Đang hiển thị" value={visibleCount} />
          <StatCard label="Trang" value={pageLabel} />
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
      >
        <label className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên album, nghệ sĩ hoặc email..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <select
          value={query.status}
          onChange={handleStatusChange}
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        >
          {ALBUM_STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="h-11 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Tìm kiếm
        </button>
      </form>

      {message ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </div>
      ) : null}

      {albums.length === 0 ? (
        <EmptyState
          title={isLoading ? "Đang tải danh sách..." : "Không tìm thấy album nào"}
          description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-medium text-slate-500">
                  <th className="px-5 py-4">Album</th>
                  <th className="px-5 py-4">Nghệ sĩ</th>
                  <th className="px-5 py-4">Phát hành</th>
                  <th className="px-5 py-4">Track</th>
                  <th className="px-5 py-4">Thời lượng</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Cập nhật</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {albums.map((album) => {
                  const albumStatus = getAlbumStatusBadge(album?.status);
                  const artistStatus = getArtistStatusBadge(
                    album?.artist?.activeStatus
                  );

                  return (
                    <tr key={album?.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {album?.coverImage ? (
                            <img
                              src={album.coverImage}
                              alt={album?.title || "Album cover"}
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-xs font-semibold text-white">
                              {getInitials(album?.title)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {album?.title || "-"}
                            </p>
                            {album?.blockedReason ? (
                              <p className="mt-1 break-words text-xs text-rose-600">
                                {album.blockedReason}
                              </p>
                            ) : (
                              <p className="truncate text-xs text-slate-500">
                                ID: {album?.id || "-"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-800">
                            {album?.artist?.name || "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {album?.artist?.email || "-"}
                          </p>
                          {album?.artist ? <StatusBadge config={artistStatus} /> : null}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(album?.releaseDate)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatNumber(album?.trackCount ?? 0)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDuration(album?.totalDuration)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge config={albumStatus} />
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-700">
                        {formatDate(album?.updatedAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              album?.status === "blocked"
                                ? openUnblockModal(album)
                                : openBlockModal(album)
                            }
                            className={`inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                              album?.status === "blocked"
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                          >
                            {album?.status === "blocked" ? "Gỡ chặn" : "Chặn"}
                          </button>

                          <Link
                            to={routePaths.albumDetail(album?.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                          >
                            Xem chi tiết
                            <ArrowUpRight size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination?.totalPages > 1 ? (
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <span className="font-medium text-slate-900">
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            trong tổng số{" "}
            <span className="font-medium text-slate-900">{pagination.total}</span>
          </p>

          <ReactPaginate
            breakLabel="..."
            nextLabel=">"
            previousLabel="<"
            forcePage={Math.max((query.page || 1) - 1, 0)}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={pagination.totalPages}
            renderOnZeroPageCount={null}
            containerClassName="flex flex-wrap items-center gap-2"
            pageLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            previousLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            nextLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            breakLinkClassName="flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-slate-400"
            activeLinkClassName="border-slate-950 bg-slate-950 text-white hover:bg-slate-950"
            disabledLinkClassName="cursor-not-allowed opacity-40 hover:bg-white"
          />
        </div>
      ) : null}

      {modalState.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Moderation album
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                  {modalState.type === "block" ? "Chặn album" : "Gỡ chặn album"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="text-lg text-slate-400 transition hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">
                {modalState.album?.title || "-"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {modalState.album?.artist?.name || "-"} ·{" "}
                {modalState.album?.artist?.email || "-"}
              </p>
            </div>

            {modalState.type === "block" ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Lý do chặn
                  </label>
                  <textarea
                    value={blockForm.blockedReason}
                    onChange={(event) =>
                      setBlockForm((prev) => ({
                        ...prev,
                        blockedReason: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Nhập lý do chặn album..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500">
                    Ghi chú admin
                  </label>
                  <textarea
                    value={blockForm.adminNote}
                    onChange={(event) =>
                      setBlockForm((prev) => ({
                        ...prev,
                        adminNote: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Ghi chú nội bộ nếu cần..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
                Album sẽ được gỡ chặn và backend sẽ tự restore trạng thái cũ của
                các track nếu chúng bị block bởi chính album này.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitStatusUpdate()}
                disabled={isSubmitting}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  modalState.type === "block"
                    ? "bg-slate-950 hover:bg-slate-800"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isSubmitting
                  ? "Đang xử lý..."
                  : modalState.type === "block"
                  ? "Xác nhận chặn"
                  : "Xác nhận gỡ chặn"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SystemAlbumsListPage;
