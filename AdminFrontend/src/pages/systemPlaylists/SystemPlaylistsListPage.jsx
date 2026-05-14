import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { getSystemPlaylistsService } from "../../services/playlistService";
import { routePaths } from "../../routes/routePaths";

const playlistRowId = (item) => item?._id ?? item?.id ?? "";

const SystemPlaylistsListPage = () => {
  const [playlists, setPlaylists] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getSystemPlaylistsService({ page: 1, limit: 50 });
        if (!isMounted) {
          return;
        }
        setPlaylists(result.playlists ?? []);
        setPagination(result.pagination ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setPlaylists([]);
        setPagination(null);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Could not load system playlists."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-black bg-white p-10 text-black/60">
        <Loader2 className="h-8 w-8 animate-spin text-black" aria-hidden />
        <p className="mt-4 text-sm">Loading system playlists…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-black bg-white p-8">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black/50">
            System playlist management
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-black">System playlists</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
            Select a playlist to view details. Use{" "}
            <span className="font-medium text-black">Create playlist</span> to add a
            new system playlist.
          </p>
          {pagination ? (
            <p className="mt-2 text-xs text-black/45">
              Showing {playlists.length} of {pagination.total} playlist
              {pagination.total === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>
        <Link
          to={routePaths.systemPlaylistNew}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/85"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create playlist
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-[2rem] border border-red-600 bg-red-50 px-6 py-4 text-sm text-red-900">
          {errorMessage}
        </div>
      ) : null}

      {playlists.length === 0 && !errorMessage ? (
        <div className="rounded-[2rem] border border-black bg-white px-8 py-10 text-center text-sm text-black/70">
          <p>No system playlists yet.</p>
          <p className="mt-3">
            Open any playlist from another environment, or{" "}
            <Link
              to={routePaths.systemPlaylistNew}
              className="font-semibold text-black underline underline-offset-4"
            >
              create the first one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-black bg-white">
          <table className="min-w-full divide-y divide-black/10 text-left text-sm">
            <thead className="bg-black/[0.03] text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Tracks</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 text-black">
              {playlists.map((item) => {
                const id = playlistRowId(item);
                return (
                  <tr key={id || item.title} className="hover:bg-black/[0.02]">
                    <td className="px-6 py-4 font-medium">{item.title}</td>
                    <td className="px-6 py-4 text-black/70">{item.trackCount ?? 0}</td>
                    <td className="px-6 py-4 text-black/60">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {id ? (
                        <Link
                          to={routePaths.systemPlaylistDetail(id)}
                          className="font-semibold text-black underline-offset-4 hover:underline"
                        >
                          View
                        </Link>
                      ) : null}
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
};

export default SystemPlaylistsListPage;
