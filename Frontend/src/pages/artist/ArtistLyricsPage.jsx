import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Music2, Save, Search } from "lucide-react";
import trackService from "../../services/trackService";
import lyricsService from "../../services/lyricsService";
import { getApiErrorMessage } from "../../utils/apiError";

const ArtistLyricsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(searchParams.get("trackId") || "");
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [lyricsStatic, setLyricsStatic] = useState("");
  const [initialLyrics, setInitialLyrics] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lyricsFile, setLyricsFile] = useState(null);
  const [uploadingSync, setUploadingSync] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTracks = async () => {
      setTracksLoading(true);
      setErrorMessage("");

      try {
        const response = await trackService.getArtistTracks({ limit: 100 });
        const nextTracks = response?.data?.tracks || [];

        if (!isMounted) {
          return;
        }

        setTracks(nextTracks);

        const currentTrackId = searchParams.get("trackId");
        const resolvedTrackId =
          currentTrackId && nextTracks.some((track) => String(track._id) === String(currentTrackId))
            ? String(currentTrackId)
            : nextTracks[0]?._id || "";

        if (resolvedTrackId) {
          setSelectedTrackId(String(resolvedTrackId));
          setSearchParams({ trackId: String(resolvedTrackId) }, { replace: true });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTracks([]);
        setErrorMessage(getApiErrorMessage(error, "Unable to load your tracks right now."));
      } finally {
        if (isMounted) {
          setTracksLoading(false);
        }
      }
    };

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTrackDetail = async () => {
      if (!selectedTrackId) {
        setSelectedTrack(null);
        setLyricsStatic("");
        setInitialLyrics("");
        return;
      }

      setTrackLoading(true);
      setErrorMessage("");

      try {
        const detail = await trackService.getArtistTrackDetail(selectedTrackId);

        if (!isMounted) {
          return;
        }

        setSelectedTrack(detail);
        setLyricsStatic(detail?.lyricsStatic || "");
        setInitialLyrics(detail?.lyricsStatic || "");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSelectedTrack(null);
        setLyricsStatic("");
        setInitialLyrics("");
        setErrorMessage(getApiErrorMessage(error, "Unable to load track lyrics right now."));
      } finally {
        if (isMounted) {
          setTrackLoading(false);
        }
      }
    };

    loadTrackDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedTrackId]);

  const filteredTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return tracks;
    }

    return tracks.filter((track) => {
      const title = String(track?.title || "").toLowerCase();
      const album = String(track?.album?.title || "").toLowerCase();

      return title.includes(normalized) || album.includes(normalized);
    });
  }, [tracks, query]);

  const selectedTrackSummary = useMemo(() => {
    if (!selectedTrack) {
      return null;
    }

    const lyricsLength = selectedTrack.lyricsStatic?.trim().length || 0;

    return {
      hasLyrics: lyricsLength > 0,
      lyricsLength,
      albumTitle: selectedTrack.album?.title || "No album",
      status: selectedTrack.approvalStatus || "draft",
    };
  }, [selectedTrack]);

  const syncedLyricsInfo = useMemo(() => {
    const syncUrl = selectedTrack?.lyricsSyncUrl || "";

    if (!syncUrl) {
      return null;
    }

    const fileName = syncUrl.split("/").filter(Boolean).pop() || "synced-lyrics.lrc";

    return {
      url: syncUrl,
      fileName,
    };
  }, [selectedTrack]);

  const lyricStats = useMemo(() => {
    const totalTracks = tracks.length;
    const tracksWithLyrics = tracks.filter((track) => String(track?.lyricsStatic || "").trim().length > 0).length;

    return {
      totalTracks,
      tracksWithLyrics,
      tracksWithoutLyrics: Math.max(totalTracks - tracksWithLyrics, 0),
    };
  }, [tracks]);

  const handleSelectTrack = (trackId) => {
    setSelectedTrackId(String(trackId));
    setSearchParams({ trackId: String(trackId) }, { replace: true });
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selectedTrackId) {
      return;
    }

    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const updatedTrack = await lyricsService.addStaticLyrics(selectedTrackId, lyricsStatic);

      setSelectedTrack(updatedTrack);
      setLyricsStatic(updatedTrack?.lyricsStatic || "");
      setInitialLyrics(updatedTrack?.lyricsStatic || "");
      setTracks((current) =>
        current.map((track) => (String(track._id) === String(updatedTrack?._id) ? updatedTrack : track))
      );
      setSuccessMessage("Static lyrics saved successfully.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to save lyrics."));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSync = async (event) => {
    event.preventDefault();
    if (!selectedTrackId || !lyricsFile) return;

    setUploadingSync(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const updatedTrack = await lyricsService.updateSyncLyrics(selectedTrackId, lyricsFile);

      setSelectedTrack(updatedTrack);
      setTracks((current) =>
        current.map((track) => (String(track._id) === String(updatedTrack?._id) ? updatedTrack : track))
      );
      setSuccessMessage("Synced lyrics updated successfully.");
      setLyricsFile(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to upload synced lyrics."));
    } finally {
      setUploadingSync(false);
    }
  };

  const hasUnsavedChanges = lyricsStatic !== initialLyrics;

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#8b5e3c]">
              Artist Dashboard
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#241b15]">
              Lyrics Management
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
              Manage static lyrics for your tracks here. Synced lyrics files remain in the track editor.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            {[
              { label: "Total tracks", value: lyricStats.totalTracks },
              { label: "With lyrics", value: lyricStats.tracksWithLyrics },
              { label: "Missing lyrics", value: lyricStats.tracksWithoutLyrics },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-neutral-200 bg-[#fcfaf7] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-[#241b15]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Tracks</p>
              <h3 className="mt-1 text-lg font-semibold text-[#241b15]">Select a track</h3>
            </div>

            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#fcfaf7] text-[#8b5e3c]">
              <Music2 className="h-5 w-5" />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-within:border-[#8b5e3c]">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title or album"
              className="w-full bg-transparent outline-none placeholder:text-neutral-400"
            />
          </label>

          <div className="mt-4 max-h-[56vh] space-y-2 overflow-auto pr-1">
            {tracksLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your tracks...
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-sm text-neutral-500">
                No tracks matched your search.
              </div>
            ) : (
              filteredTracks.map((track) => {
                const isActive = String(track._id) === String(selectedTrackId);
                const lyricsPresent = String(track?.lyricsStatic || "").trim().length > 0;

                return (
                  <button
                    key={track._id}
                    type="button"
                    onClick={() => handleSelectTrack(track._id)}
                    className={[
                      "w-full rounded-md border px-4 py-3 text-left transition",
                      isActive
                        ? "border-[#8b5e3c] bg-[#fcfaf7]"
                        : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#241b15]">{track.title}</p>
                        <p className="mt-1 truncate text-xs text-neutral-500">
                          {track.album?.title || "No album"}
                        </p>
                      </div>

                      <span
                        className={[
                          "inline-flex shrink-0 rounded-sm border px-2 py-1 text-[11px] font-medium",
                          lyricsPresent
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-neutral-50 text-neutral-600",
                        ].join(" ")}
                      >
                        {lyricsPresent ? "Has lyrics" : "Empty"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
            {trackLoading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading track lyrics...
              </div>
            ) : selectedTrack ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Editing</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[#241b15]">
                      {selectedTrack.title}
                    </h3>
                    <p className="mt-2 text-sm text-neutral-600">
                      Album: {selectedTrackSummary?.albumTitle || "No album"}
                    </p>
                  </div>
                </div>

                {syncedLyricsInfo ? (
                  <div className="mt-6 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-700">Synced lyrics file</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium">{syncedLyricsInfo.fileName}</span>
                      <a
                        href={syncedLyricsInfo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-900 transition hover:bg-sky-100"
                      >
                        Open file
                      </a>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Lyrics status", value: selectedTrackSummary?.hasLyrics ? "Filled" : "Empty" },
                    { label: "Lyrics length", value: `${selectedTrackSummary?.lyricsLength || 0} chars` },
                    { label: "Approval", value: selectedTrackSummary?.status || "draft" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-neutral-200 bg-[#fcfaf7] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-500">{item.label}</p>
                      <p className="mt-2 text-sm font-medium text-[#241b15]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSave} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="lyricsStatic" className="block text-sm font-medium text-[#241b15]">
                      Static lyrics
                    </label>
                    <textarea
                      id="lyricsStatic"
                      value={lyricsStatic}
                      onChange={(event) => setLyricsStatic(event.target.value)}
                      rows={14}
                      placeholder="Paste or type your lyrics here..."
                      className="mt-2 w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-[#241b15] outline-none transition placeholder:text-neutral-400 focus:border-[#8b5e3c]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving || !selectedTrackId || !hasUnsavedChanges}
                      className="inline-flex items-center gap-2 rounded-md bg-[#8b5e3c] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6d4a2f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save lyrics
                    </button>

                    <button
                      type="button"
                      onClick={() => setLyricsStatic(initialLyrics)}
                      disabled={saving || !hasUnsavedChanges}
                      className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-5 py-2.5 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset changes
                    </button>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".lrc,text/*"
                        onChange={(e) => setLyricsFile(e.target.files?.[0] || null)}
                        className="text-sm"
                      />

                      <button
                        type="button"
                        onClick={handleUploadSync}
                        disabled={!lyricsFile || uploadingSync}
                        className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-[#241b15] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploadingSync ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update .lrc"}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-4 py-10 text-sm text-neutral-500">
                Select a track from the list to edit its static lyrics.
              </div>
            )}
          </div>

          <div className="rounded-md border border-neutral-200 bg-[#fcfaf7] p-5 text-sm text-neutral-600 shadow-sm">
            <p className="font-medium text-[#241b15]">Note</p>
            <p className="mt-2 leading-6">
              This page manages static lyrics and synced .lrc updates for your tracks.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistLyricsPage;
