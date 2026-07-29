import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileMusic,
  FileText,
  Globe2,
  Info,
  Loader2,
  Music2,
  RotateCcw,
  Save,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import trackService from "../../services/trackService";
import lyricsService from "../../services/lyricsService";
import {
  showArtistError,
  showArtistSuccess,
} from "../../utils/artistNotification";

const APPROVAL_LABELS = {
  approved: "Đã duyệt",
  pending: "Đang chờ duyệt",
  rejected: "Bị từ chối",
  draft: "Bản nháp",
};

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatDateTime = (value) => {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getTrackLyricsState = (track) => {
  const hasStaticLyrics = Boolean(String(track?.lyricsStatic || "").trim());
  const hasSyncedLyrics = Boolean(track?.lyricsSyncUrl);

  return {
    hasStaticLyrics,
    hasSyncedLyrics,
    hasAnyLyrics: hasStaticLyrics || hasSyncedLyrics,
  };
};

const StatCard = ({ label, value, tone = "violet" }) => {
  const tones = {
    violet: "bg-[#6f5cf1]",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="min-w-0 rounded-2xl border border-[#ece8ff] bg-white px-3 py-3.5 shadow-[0_8px_24px_rgba(54,43,105,0.05)] sm:min-w-[132px] sm:px-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9690ac]">
          {label}
        </p>
        <span className={`h-2 w-2 rounded-full ${tones[tone]}`} />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[#241b45]">{value}</p>
    </div>
  );
};

const PreviewModal = ({ track, lyrics, onClose }) => (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center bg-[#171026]/60 p-4 backdrop-blur-sm"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
  >
    <div
      className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(25,15,54,0.35)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#ece8ff] px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8d87aa]">
            Xem trước lời bài hát
          </p>
          <h2 id="preview-title" className="mt-2 text-xl font-bold text-[#241b45]">
            {track?.title || "Bài hát chưa có tên"}
          </h2>
          <p className="mt-1 text-sm text-[#8d87aa]">
            {track?.artist?.name || track?.album?.title || "Nghệ sĩ"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ece8ff] text-[#746e8c] transition hover:bg-[#f8f6ff] hover:text-[#5f4fe0]"
          aria-label="Đóng cửa sổ xem trước"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-[62vh] overflow-y-auto bg-gradient-to-b from-[#faf9ff] to-white px-6 py-8 sm:px-9">
        {lyrics.trim() ? (
          <p className="whitespace-pre-wrap text-center text-[17px] font-medium leading-9 text-[#332a52]">
            {lyrics}
          </p>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10 text-[#c7c1de]" />
            <p className="mt-4 font-semibold text-[#4d4568]">Chưa có lời bài hát để xem trước</p>
            <p className="mt-2 text-sm text-[#9690ac]">
              Hãy nhập lời bài hát trong trình soạn thảo trước.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const ArtistLyricsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [requestedTrackId] = useState(
    () => searchParams.get("trackId") || ""
  );
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(requestedTrackId);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [tracksLoading, setTracksLoading] = useState(true);
  const [trackLoading, setTrackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [lyricsStatic, setLyricsStatic] = useState("");
  const [initialLyrics, setInitialLyrics] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lyricsFile, setLyricsFile] = useState(null);
  const [uploadingSync, setUploadingSync] = useState(false);
  const [activeMode, setActiveMode] = useState("static");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

        const currentTrackId = requestedTrackId;
        const resolvedTrackId =
          currentTrackId &&
          nextTracks.some(
            (track) => String(track._id) === String(currentTrackId)
          )
            ? String(currentTrackId)
            : nextTracks[0]?._id || "";

        if (resolvedTrackId) {
          setSelectedTrackId(String(resolvedTrackId));
          setSearchParams(
            { trackId: String(resolvedTrackId) },
            { replace: true }
          );
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setTracks([]);
        setErrorMessage("Không thể tải danh sách bài hát vào lúc này.");
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
  }, [requestedTrackId, setSearchParams]);

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
        setLyricsFile(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setSelectedTrack(null);
        setLyricsStatic("");
        setInitialLyrics("");
        setErrorMessage("Không thể tải lời bài hát vào lúc này.");
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
    const normalized = query.trim().toLocaleLowerCase("vi");

    if (!normalized) {
      return tracks;
    }

    return tracks.filter((track) => {
      const title = String(track?.title || "").toLocaleLowerCase("vi");
      const album = String(track?.album?.title || "").toLocaleLowerCase("vi");

      return title.includes(normalized) || album.includes(normalized);
    });
  }, [tracks, query]);

  const lyricStats = useMemo(() => {
    const totalTracks = tracks.length;
    const tracksWithLyrics = tracks.filter(
      (track) => getTrackLyricsState(track).hasAnyLyrics
    ).length;

    return {
      totalTracks,
      tracksWithLyrics,
      tracksWithoutLyrics: Math.max(totalTracks - tracksWithLyrics, 0),
    };
  }, [tracks]);

  const selectedLyricsState = getTrackLyricsState(selectedTrack);
  const hasUnsavedChanges = lyricsStatic !== initialLyrics;
  const lyricsCharacterCount = lyricsStatic.length;
  const syncedFileName =
    selectedTrack?.lyricsSyncUrl?.split("/").filter(Boolean).pop() ||
    "Tệp lời đồng bộ";

  const handleSelectTrack = (trackId) => {
    setSelectedTrackId(String(trackId));
    setSearchParams({ trackId: String(trackId) }, { replace: true });
    setErrorMessage("");
    setActiveMode("static");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selectedTrackId) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const updatedTrack = await lyricsService.addStaticLyrics(
        selectedTrackId,
        lyricsStatic
      );

      setSelectedTrack(updatedTrack);
      setLyricsStatic(updatedTrack?.lyricsStatic || "");
      setInitialLyrics(updatedTrack?.lyricsStatic || "");
      setTracks((current) =>
        current.map((track) =>
          String(track._id) === String(updatedTrack?._id)
            ? updatedTrack
            : track
        )
      );
      showArtistSuccess("Đã lưu lời bài hát thành công.");
    } catch {
      showArtistError("Không thể lưu lời bài hát vào lúc này.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSync = async () => {
    if (!selectedTrackId || !lyricsFile) {
      return;
    }

    setUploadingSync(true);
    setErrorMessage("");

    try {
      const updatedTrack = await lyricsService.updateSyncLyrics(
        selectedTrackId,
        lyricsFile
      );

      setSelectedTrack(updatedTrack);
      setTracks((current) =>
        current.map((track) =>
          String(track._id) === String(updatedTrack?._id)
            ? updatedTrack
            : track
        )
      );
      showArtistSuccess("Đã cập nhật lời bài hát đồng bộ thành công.");
      setLyricsFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      showArtistError(
        "Không thể tải lên lời bài hát đồng bộ vào lúc này."
      );
    } finally {
      setUploadingSync(false);
    }
  };

  return (
    <>
      <section className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#6f5cf1]">
              <FileMusic className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                Không gian nghệ sĩ
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#241b45] sm:text-[34px]">
              Quản lý lời bài hát
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7f7899]">
              Thêm, chỉnh sửa lời thường hoặc cập nhật tệp lời đồng bộ cho các
              bài hát của bạn.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard label="Tổng bài hát" value={lyricStats.totalTracks} />
            <StatCard
              label="Đã có lời"
              value={lyricStats.tracksWithLyrics}
              tone="emerald"
            />
            <StatCard
              label="Chưa có lời"
              value={lyricStats.tracksWithoutLyrics}
              tone="amber"
            />
          </div>
        </header>

        {errorMessage ? (
          <div
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700"
            role="alert"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="flex min-h-[620px] flex-col rounded-[24px] border border-[#ece8ff] bg-white p-4 shadow-[0_14px_36px_rgba(32,23,71,0.06)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9690ac]">
                  Thư viện
                </p>
                <h2 className="mt-1.5 text-lg font-bold text-[#241b45]">
                  Chọn bài hát
                </h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3efff] text-[#6f5cf1]">
                <Music2 className="h-5 w-5" />
              </div>
            </div>

            <label className="mt-4 flex h-11 items-center gap-2.5 rounded-xl border border-[#e9e5f6] bg-[#fcfbff] px-3 text-sm transition focus-within:border-[#8b7cf6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#7664ef]/10">
              <Search className="h-4 w-4 shrink-0 text-[#aaa4bd]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên hoặc album..."
                className="min-w-0 flex-1 bg-transparent text-[#332a52] outline-none placeholder:text-[#aaa4bd]"
              />
            </label>

            <div className="mt-4 max-h-[600px] flex-1 space-y-2 overflow-y-auto pr-1">
              {tracksLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#ece8ff] bg-[#faf9ff] px-3 py-4 text-sm text-[#8d87aa]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách bài hát...
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#ddd7f2] bg-[#faf9ff] px-4 py-7 text-center text-sm leading-6 text-[#8d87aa]">
                  Không tìm thấy bài hát phù hợp.
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const isActive =
                    String(track._id) === String(selectedTrackId);
                  const lyricsState = getTrackLyricsState(track);

                  return (
                    <button
                      key={track._id}
                      type="button"
                      onClick={() => handleSelectTrack(track._id)}
                      className={[
                        "group w-full rounded-2xl border px-3.5 py-3 text-left transition",
                        isActive
                          ? "border-[#9d8ff8] bg-[#f6f3ff] shadow-[0_8px_20px_rgba(101,82,220,0.10)]"
                          : "border-transparent bg-white hover:border-[#ece8ff] hover:bg-[#faf9ff]",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            isActive
                              ? "bg-[#6f5cf1] text-white"
                              : "bg-[#f2effa] text-[#958dae] group-hover:text-[#6f5cf1]",
                          ].join(" ")}
                        >
                          <Music2 className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2f264d]">
                            {track.title || "Bài hát chưa có tên"}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#9690ac]">
                            {track.album?.title || "Chưa thuộc album"} ·{" "}
                            {formatDuration(track.duration)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2 pl-12">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                            lyricsState.hasAnyLyrics
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {lyricsState.hasAnyLyrics ? (
                            <Check className="h-3 w-3" />
                          ) : null}
                          {lyricsState.hasAnyLyrics ? "Đã có lời" : "Chưa có lời"}
                        </span>
                        {lyricsState.hasSyncedLyrics ? (
                          <span className="text-[10px] font-medium text-[#7664ef]">
                            Có tệp LRC
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className="min-w-0">
            <div className="min-h-[620px] overflow-hidden rounded-[24px] border border-[#ece8ff] bg-white shadow-[0_14px_36px_rgba(32,23,71,0.06)]">
              {trackLoading ? (
                <div className="flex min-h-[620px] items-center justify-center gap-3 text-sm text-[#8d87aa]">
                  <Loader2 className="h-5 w-5 animate-spin text-[#6f5cf1]" />
                  Đang tải lời bài hát...
                </div>
              ) : selectedTrack ? (
                <>
                  <div className="border-b border-[#ece8ff] px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9690ac]">
                          Bài hát đang chọn
                        </p>
                        <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-[#241b45]">
                          {selectedTrack.title || "Bài hát chưa có tên"}
                        </h2>
                        <p className="mt-1.5 text-sm text-[#817a99]">
                          Album:{" "}
                          <span className="font-medium text-[#554d70]">
                            {selectedTrack.album?.title || "Chưa thuộc album"}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ddd7ff] px-4 text-sm font-semibold text-[#6552df] transition hover:bg-[#f7f4ff]"
                      >
                        <Eye className="h-4 w-4" />
                        Xem trước lời
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="flex items-center gap-3 rounded-2xl bg-[#faf9ff] px-4 py-3">
                        <Globe2 className="h-5 w-5 shrink-0 text-[#7664ef]" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a94ad]">
                            Ngôn ngữ
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-[#40375e]">
                            Tiếng Việt
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl bg-[#faf9ff] px-4 py-3">
                        <Clock3 className="h-5 w-5 shrink-0 text-[#7664ef]" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a94ad]">
                            Cập nhật lần cuối
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-[#40375e]">
                            {formatDateTime(
                              selectedTrack.updatedAt ||
                                selectedTrack.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl bg-[#faf9ff] px-4 py-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9a94ad]">
                            Trạng thái
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-emerald-700">
                            {APPROVAL_LABELS[selectedTrack.approvalStatus] ||
                              "Bản nháp"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5 sm:px-6">
                    <div className="inline-flex w-full max-w-md rounded-xl bg-[#f5f2fc] p-1">
                      <button
                        type="button"
                        onClick={() => setActiveMode("static")}
                        className={[
                          "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                          activeMode === "static"
                            ? "bg-white text-[#5f4fe0] shadow-sm"
                            : "text-[#8d87aa] hover:text-[#5f4fe0]",
                        ].join(" ")}
                      >
                        <FileText className="h-4 w-4" />
                        Lời bài hát thường
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMode("synced")}
                        className={[
                          "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                          activeMode === "synced"
                            ? "bg-white text-[#5f4fe0] shadow-sm"
                            : "text-[#8d87aa] hover:text-[#5f4fe0]",
                        ].join(" ")}
                      >
                        <FileMusic className="h-4 w-4" />
                        Lời đồng bộ
                      </button>
                    </div>

                    {activeMode === "static" ? (
                      <form onSubmit={handleSave} className="mt-5">
                        <div className="overflow-hidden rounded-2xl border border-[#e8e3f5] focus-within:border-[#9484f5] focus-within:ring-4 focus-within:ring-[#7664ef]/10">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece8ff] bg-[#fcfbff] px-4 py-3">
                            <div>
                              <h3 className="text-sm font-bold text-[#332a52]">
                                Trình soạn thảo lời bài hát
                              </h3>
                              <p className="mt-1 text-xs text-[#9690ac]">
                                Mỗi câu nên được viết trên một dòng riêng.
                              </p>
                            </div>
                            <span className="rounded-lg bg-[#f0edfa] px-2.5 py-1.5 text-xs font-medium text-[#746d8f]">
                              {lyricsCharacterCount.toLocaleString("vi-VN")} ký tự
                            </span>
                          </div>
                          <textarea
                            id="lyricsStatic"
                            value={lyricsStatic}
                            onChange={(event) =>
                              setLyricsStatic(event.target.value)
                            }
                            rows={15}
                            placeholder={"Nhập lời bài hát tại đây...\n\nVí dụ:\nMột ngày mới đang bắt đầu\nGiai điệu vang lên trong lòng"}
                            className="block min-h-[340px] w-full resize-y bg-white px-5 py-4 text-[15px] leading-7 text-[#332a52] outline-none placeholder:text-[#b1abba]"
                          />
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                          <button
                            type="submit"
                            disabled={
                              saving ||
                              !selectedTrackId ||
                              !hasUnsavedChanges
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,78,225,0.25)] transition hover:bg-[#5e4bdd] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {saving ? "Đang lưu..." : "Lưu thay đổi"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setLyricsStatic(initialLyrics)}
                            disabled={saving || !hasUnsavedChanges}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e1dced] px-5 text-sm font-semibold text-[#514969] transition hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Khôi phục
                          </button>

                          <div className="sm:ml-auto">
                            {hasUnsavedChanges ? (
                              <p className="text-xs font-medium text-amber-600">
                                Bạn có thay đổi chưa lưu
                              </p>
                            ) : (
                              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                Nội dung đã được lưu
                              </p>
                            )}
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-5">
                        <div className="rounded-2xl border border-[#e8e3f5] bg-[#fcfbff] p-5 sm:p-6">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eeeaff] text-[#6f5cf1]">
                                <FileMusic className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-bold text-[#332a52]">
                                  Tệp lời đồng bộ LRC
                                </h3>
                                <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#817a99]">
                                  Tải lên tệp .lrc có chứa mốc thời gian để lời
                                  bài hát tự động chạy theo nhạc.
                                </p>
                              </div>
                            </div>

                            {selectedLyricsState.hasSyncedLyrics ? (
                              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Đã có lời đồng bộ
                              </span>
                            ) : (
                              <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                                Chưa có lời đồng bộ
                              </span>
                            )}
                          </div>

                          {selectedLyricsState.hasSyncedLyrics ? (
                            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#9690ac]">
                                  Tệp đang sử dụng
                                </p>
                                <p className="mt-1 truncate text-sm font-semibold text-[#40375e]">
                                  {syncedFileName}
                                </p>
                              </div>
                              <a
                                href={selectedTrack.lyricsSyncUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#ddd7ff] px-3 text-xs font-semibold text-[#6552df] transition hover:bg-[#f7f4ff]"
                              >
                                Mở tệp hiện tại
                              </a>
                            </div>
                          ) : null}

                          <div className="mt-5 rounded-2xl border-2 border-dashed border-[#dcd5f7] bg-white p-6 text-center transition hover:border-[#a99cf5] hover:bg-[#fdfcff]">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".lrc,text/plain"
                              onChange={(event) =>
                                setLyricsFile(event.target.files?.[0] || null)
                              }
                              className="sr-only"
                              id="lyricsSyncFile"
                            />
                            <UploadCloud className="mx-auto h-9 w-9 text-[#8574ee]" />
                            <p className="mt-3 text-sm font-semibold text-[#40375e]">
                              {lyricsFile
                                ? lyricsFile.name
                                : "Chọn tệp lời đồng bộ từ thiết bị"}
                            </p>
                            <p className="mt-1 text-xs text-[#9690ac]">
                              Chỉ hỗ trợ định dạng .lrc
                            </p>
                            <label
                              htmlFor="lyricsSyncFile"
                              className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#ddd7ff] bg-[#f7f4ff] px-4 text-sm font-semibold text-[#6552df] transition hover:bg-[#eeeaff]"
                            >
                              {lyricsFile ? "Chọn tệp khác" : "Chọn tệp"}
                            </label>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex items-start gap-2 text-xs leading-5 text-[#8d87aa]">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7664ef]" />
                              Tệp mới sẽ thay thế tệp lời đồng bộ hiện tại sau
                              khi bạn xác nhận cập nhật.
                            </p>
                            <button
                              type="button"
                              onClick={handleUploadSync}
                              disabled={!lyricsFile || uploadingSync}
                              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#6f5cf1] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,78,225,0.25)] transition hover:bg-[#5e4bdd] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                            >
                              {uploadingSync ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UploadCloud className="h-4 w-4" />
                              )}
                              {uploadingSync
                                ? "Đang tải lên..."
                                : "Cập nhật tệp LRC"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[620px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3efff] text-[#7664ef]">
                    <Music2 className="h-7 w-7" />
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-[#332a52]">
                    Chưa chọn bài hát
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-[#8d87aa]">
                    Chọn một bài hát trong danh sách bên trái để bắt đầu cập
                    nhật lời.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#e7e2f5] bg-[#faf9ff] px-5 py-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#7664ef]" />
                <div>
                  <h2 className="text-sm font-bold text-[#40375e]">Lưu ý</h2>
                  <p className="mt-1.5 text-xs leading-5 text-[#817a99] sm:text-sm">
                    Lời thường sẽ hiển thị toàn bộ nội dung. Tệp LRC dùng các
                    mốc thời gian để lời chạy đồng bộ khi phát nhạc. Hãy kiểm
                    tra chính tả và thời gian trước khi cập nhật.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>

      {isPreviewOpen ? (
        <PreviewModal
          track={selectedTrack}
          lyrics={lyricsStatic}
          onClose={() => setIsPreviewOpen(false)}
        />
      ) : null}
    </>
  );
};

export default ArtistLyricsPage;
