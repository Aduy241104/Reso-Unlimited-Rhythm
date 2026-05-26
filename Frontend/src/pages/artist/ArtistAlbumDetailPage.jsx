import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, MoreHorizontal } from "lucide-react";
import { getArtistAlbumDetailService } from "../../services/artist/artistAlbumService";
import { routePaths } from "../../routes/routePaths";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  createPlaceholderImage,
  formatReleaseYear,
  formatTrackDuration,
} from "../../utils/albumDetail";

const ArtistAlbumDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [album, setAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAlbumDetail = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const albumDetail = await getArtistAlbumDetailService(id);

        if (!isMounted) {
          return;
        }

        setAlbum(albumDetail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAlbum(null);
        setErrorMessage(
          getApiErrorMessage(error, "Unable to load album detail from the backend right now.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!id) {
      setAlbum(null);
      setErrorMessage("Album id is missing.");
      setIsLoading(false);
      return;
    }

    loadAlbumDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <button
          onClick={() => navigate(routePaths.artistAlbums)}
          className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>
        <div className="rounded-md border border-neutral-200 bg-white p-8 text-center">
          <p className="text-neutral-600">Loading album details...</p>
        </div>
      </section>
    );
  }

  if (errorMessage || !album) {
    return (
      <section className="space-y-6">
        <button
          onClick={() => navigate(routePaths.artistAlbums)}
          className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Albums
        </button>
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage || "Album not found."}
        </div>
      </section>
    );
  }

  const albumCoverImage = album?.coverImage || createPlaceholderImage(album?.title);
  const trackItems = album?.tracks ?? [];
  const releaseYear = formatReleaseYear(album?.releaseDate);

  return (
    <section className="space-y-6">
      <button
        onClick={() => navigate(routePaths.artistAlbums)}
        className="flex items-center gap-2 text-sm font-medium text-[#8b5e3c] hover:text-[#6d4a2f] transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Albums
      </button>

      {/* Album Header */}
      <div className="rounded-md border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <div className="shrink-0">
            <img
              src={albumCoverImage}
              alt={album?.title || "Album cover"}
              className="h-48 w-48 rounded-lg object-cover shadow-lg"
            />
          </div>

          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">Album</p>
            <h1 className="mt-2 text-3xl font-bold text-[#241b15]">{album?.title}</h1>
            <p className="mt-2 text-neutral-600">
              by <span className="font-medium text-[#241b15]">{album?.artist?.name || "Unknown"}</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-neutral-500">Release Date</p>
                <p className="mt-1 font-medium text-[#241b15]">{releaseYear || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Total Tracks</p>
                <p className="mt-1 font-medium text-[#241b15]">{trackItems.length}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Total Plays</p>
                <p className="mt-1 font-medium text-[#241b15]">
                  {(album?.totalPlays || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <p className="mt-1">
                  <span className="inline-flex rounded-sm border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-medium capitalize text-neutral-600">
                    {album?.status || "draft"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="rounded-md border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#241b15]">Tracks</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {trackItems.length} {trackItems.length === 1 ? "track" : "tracks"} in this album
            </p>
          </div>
        </div>

        {trackItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-base font-medium text-[#241b15]">No tracks yet</p>
            <p className="mt-2 text-sm text-neutral-500">
              Add tracks to this album to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
              <thead className="bg-[#fcfaf7] text-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Plays</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-200">
                {trackItems.map((item, index) => {
                  const track = item.track;
                  if (!track) return null;

                  return (
                    <tr key={track.id} className="text-[#2f261f] hover:bg-[#fcfaf7]">
                      <td className="px-6 py-4 font-medium text-neutral-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              track.coverImage ||
                              track.avatar ||
                              createPlaceholderImage(track.title)
                            }
                            alt={track.title}
                            className="h-8 w-8 rounded object-cover"
                          />
                          <div>
                            <p className="font-medium text-[#241b15]">{track.title}</p>
                            <p className="mt-0.5 text-xs text-neutral-500">
                              {track.artist?.name || "Unknown artist"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {formatTrackDuration(track.duration)}
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {(track.stats?.totalPlay || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-sm border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs font-medium capitalize text-neutral-600">
                          {track.activeStatus || "draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-neutral-100 transition"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="h-4 w-4 text-neutral-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default ArtistAlbumDetailPage;
