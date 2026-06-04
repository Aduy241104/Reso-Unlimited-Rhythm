import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, Eye as EyeOff } from "lucide-react";
import { getArtistAlbumsService, hideAlbumService, unhideAlbumService } from "../../services/artist/artistAlbumService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
  resolveAlbumTotalDurationSeconds,
} from "../../utils/albumDetail";
import {
  dashboardCardLeadClass,
  dashboardCardTitleClass,
  dashboardMetricCardClass,
  dashboardPanelClass,
  dashboardSectionEyebrowClass,
  dashboardStatusToneClass,
  dashboardTableHeadClass,
  dashboardTableShellClass,
} from "../../components/artist/dashboardStyles";

const statusStyles = {
  active: dashboardStatusToneClass.active,
  draft: dashboardStatusToneClass.draft,
  hidden: dashboardStatusToneClass.hidden,
  blocked: dashboardStatusToneClass.blocked,
};

const ArtistAlbumPage = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
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
        const params = { page: currentPage };
        if (activeFilter) params.status = activeFilter;

        const result = await getArtistAlbumsService(params);

        if (!isMounted) {
          return;
        }

        setAlbums(result.albums);
        setPagination(result.pagination);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbums([]);
        setPagination(null);
        setErrorMessage(
          getApiErrorMessage(error, "Unable to load albums from the backend right now.")
        );
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
  }, [currentPage, activeFilter]);

  const albumStats = useMemo(() => {
    const totalAlbums = pagination?.total || 0;
    const activeAlbums = albums.filter((album) => album.status === "active").length;
    const totalDuration = albums.reduce(
      (sum, album) => sum + (album.totalDuration || 0),
      0
    );

    return {
      totalAlbums,
      activeAlbums,
      totalDuration,
    };
  }, [albums, pagination]);

  const handleViewAlbum = (albumId) => {
    navigate(routePaths.artistAlbumDetail(albumId));
  };

  const handleEditAlbum = (albumId) => {
    navigate(routePaths.artistEditAlbum(albumId));
  };

  const handleHideAlbum = async () => {
    if (!hideConfirm) return;

    setIsHiding(true);
    try {
      const updatedAlbum = await hideAlbumService(hideConfirm.id);
      // Update album status to hidden instead of removing it
      setAlbums((prevAlbums) =>
        prevAlbums.map((album) =>
          album.id === hideConfirm.id
            ? { ...album, status: updatedAlbum.status }
            : album
        )
      );
      setHideConfirm(null);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Failed to hide album. Please try again.")
      );
    } finally {
      setIsHiding(false);
    }
  };

  const handleUnhideAlbum = async () => {
    if (!hideConfirm) return;

    setIsHiding(true);
    try {
      const updatedAlbum = await unhideAlbumService(hideConfirm.id);
      // Update album status to active instead of removing it
      setAlbums((prevAlbums) =>
        prevAlbums.map((album) =>
          album.id === hideConfirm.id
            ? { ...album, status: updatedAlbum.status }
            : album
        )
      );
      setHideConfirm(null);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "Failed to unhide album. Please try again.")
      );
    } finally {
      setIsHiding(false);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <section className="space-y-6">
      <div className={[dashboardPanelClass, "p-6"].join(" ")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={dashboardSectionEyebrowClass}>Artist Dashboard</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#241b15]">Album List</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              A full list of albums tied to your artist profile.
            </p>
          </div>
          <button
            onClick={() => navigate(routePaths.artistCreateAlbum)}
            className="rounded-full bg-[#ff7a2f] px-6 py-2.5 font-semibold text-white shadow-[0_12px_28px_rgba(255,122,47,0.22)] transition hover:bg-[#ef6c1e]"
          >
            + Create Album
          </button>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-neutral-500">
            Loading your albums...
          </div>
        ) : albums.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-medium text-[#241b15]">No albums yet</p>
            <p className="mt-2 text-sm text-neutral-500">
              Create your first album to start organizing your music.
            </p>
            <button
              onClick={() => navigate(routePaths.artistCreateAlbum)}
              className="mt-5 rounded-md bg-[#8b5e3c] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d4a2f]"
            >
              Create Album
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className={dashboardTableHeadClass}>
                  <tr>
                    <th className="px-5 py-3 font-medium">Album</th>
                    <th className="px-5 py-3 font-medium">Release Date</th>
                    <th className="px-5 py-3 font-medium">Tracks</th>
                    <th className="px-5 py-3 font-medium">Duration</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-200">
                  {albums.map((album) => (
                    <tr key={album.id} className="text-[#2f261f] transition hover:bg-[#fffaf4]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={album.coverImage || createPlaceholderImage(album.title)}
                            alt={album.title}
                              className="h-10 w-10 rounded-xl object-cover"
                          />
                          <button
                            onClick={() => handleViewAlbum(album.id)}
                            className="text-left font-medium text-[#241b15] transition-colors hover:text-[#8b5e3c]"
                          >
                            {album.title}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-neutral-600">
                        {album.releaseDate
                          ? new Date(album.releaseDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-neutral-600">
                        {album.trackCount || 0}
                      </td>
                      <td className="px-5 py-4 text-neutral-600">
                        {formatTrackDuration(
                          resolveAlbumTotalDurationSeconds(album)
                        )}
                      </td>
                      <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                              statusStyles[album.status] || statusStyles.draft,
                            ].join(" ")}
                          >
                          {album.status || "draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleViewAlbum(album.id)}
                            className="inline-flex items-center gap-2 rounded-sm border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-[#241b15] transition hover:border-[#8b5e3c] hover:text-[#8b5e3c] whitespace-nowrap flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditAlbum(album.id)}
                            className="inline-flex items-center gap-2 rounded-sm border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900 transition hover:bg-sky-100 whitespace-nowrap flex-shrink-0"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>

                          {album.status === "hidden" ? (
                            <button
                              type="button"
                              onClick={() => setHideConfirm({ id: album.id, title: album.title, isHidden: true })}
                              className="inline-flex items-center gap-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 transition hover:bg-emerald-100 whitespace-nowrap flex-shrink-0"
                            >
                              <Eye className="h-4 w-4" />
                              Unhide
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setHideConfirm({ id: album.id, title: album.title, isHidden: false })}
                              className="inline-flex items-center gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900 transition hover:bg-rose-100 whitespace-nowrap flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hide
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4">
                <div className="text-sm text-neutral-600">
                  Page {pagination.page} of {pagination.totalPages} • {pagination.total} total albums
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === pagination.totalPages}
                    className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hide/Unhide Album Confirmation Modal */}
      {hideConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="rounded-md border border-neutral-200 bg-white max-w-sm w-full">
            <div className="border-b border-neutral-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-[#241b15]">
                {hideConfirm.isHidden ? "Unhide Album" : "Hide Album"}
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                {hideConfirm.isHidden
                  ? `Are you sure you want to unhide "${hideConfirm.title}"?`
                  : `Are you sure you want to hide "${hideConfirm.title}"?`}
              </p>
            </div>

            <div className="px-6 py-3 text-sm text-neutral-600 bg-neutral-50">
              <p>
                {hideConfirm.isHidden
                  ? "This album will become visible to the public again."
                  : "Hidden albums will not be visible to the public. You can unhide them later by clicking the Unhide button."}
              </p>
            </div>

            <div className="flex gap-3 border-t border-neutral-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setHideConfirm(null)}
                disabled={isHiding}
                className="flex-1 rounded-md border border-neutral-200 px-4 py-2 font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={hideConfirm.isHidden ? handleUnhideAlbum : handleHideAlbum}
                disabled={isHiding}
                className={`flex-1 rounded-md px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  hideConfirm.isHidden
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isHiding ? (hideConfirm.isHidden ? "Unhiding..." : "Hiding...") : (hideConfirm.isHidden ? "Unhide Album" : "Hide Album")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ArtistAlbumPage;
