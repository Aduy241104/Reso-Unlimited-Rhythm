import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Disc3,
  Globe2,
  Info,
  Music2,
  XCircle,
} from "lucide-react";
import trackService from "../../services/trackService";
import { getArtistAlbumsService } from "../../services/artist/artistAlbumService";
import { createMyReleaseScheduleService } from "../../services/artistReleaseScheduleService";
import { routePaths } from "../../routes/routePaths";

const TIMEZONE_LABEL = "(GMT+07:00) Bangkok, Hanoi, Jakarta";
const TIME_INPUT_STEP_SECONDS = 300;

const getTomorrowDateValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDuration = (duration) => {
  const totalSeconds = Number(duration) || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "--/--/----";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--/--/----";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDisplayTime = (timeValue) => {
  if (!timeValue) {
    return "--:--";
  }

  const [hours = "00", minutes = "00"] = String(timeValue).split(":");
  const date = new Date(`2000-01-01T${hours}:${minutes}:00`);

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const buildScheduleIsoString = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return "";
  }

  return `${dateValue}T${timeValue}:00+07:00`;
};

const normalizeTracks = (response) => {
  const items = response?.data?.tracks || response?.tracks || [];

  return items.map((track) => ({
    id: track?._id || track?.id || "",
    title: track?.title || "Chưa có tên",
    coverImage: Array.isArray(track?.coverImage)
      ? track.coverImage.find(Boolean) || ""
      : track?.coverImage || track?.avatar || "",
    duration: Number(track?.duration) || 0,
    approvalStatus: track?.approvalStatus || "",
    albumTitle: track?.album?.title || "",
    audioFilesCount: Array.isArray(track?.audioFiles) ? track.audioFiles.length : 0,
  }));
};

const normalizeAlbums = (albums = []) =>
  albums.map((album) => ({
    id: album?.id || album?._id || "",
    title: album?.title || "Chưa có tên",
    coverImage: album?.coverImage || "",
    trackCount: Number(album?.trackCount) || 0,
    totalDuration: Number(album?.totalDuration) || 0,
  }));

const ArtistCreateReleaseSchedulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const hasAppliedPrefill = useRef(false);
  const [releaseType, setReleaseType] = useState("track");
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTomorrowDateValue);
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [isImmediateRelease, setIsImmediateRelease] = useState(true);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const prefilledReleaseType =
    location.state?.releaseType === "album" ? "album" : "track";
  const prefilledTargetId = location.state?.targetId || "";

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [tracksResponse, albumsResponse] = await Promise.all([
          trackService.getArtistTracks({ limit: 100 }),
          getArtistAlbumsService({ limit: 100 }),
        ]);

        if (!isMounted) {
          return;
        }

        setTracks(normalizeTracks(tracksResponse));
        setAlbums(normalizeAlbums(albumsResponse?.albums || []));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error?.message ||
            error?.response?.data?.message ||
            "Không thể tải dữ liệu bài hát và album để tạo lịch phát hành."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!prefilledTargetId || hasAppliedPrefill.current) {
      return;
    }

    setReleaseType(prefilledReleaseType);
  }, [prefilledReleaseType, prefilledTargetId]);

  const activeOptions = useMemo(
    () => (releaseType === "track" ? tracks : albums),
    [releaseType, tracks, albums]
  );

  useEffect(() => {
    if (activeOptions.length === 0) {
      setSelectedTargetId("");
      return;
    }

    if (
      !hasAppliedPrefill.current &&
      prefilledTargetId &&
      releaseType === prefilledReleaseType &&
      activeOptions.some((item) => item.id === prefilledTargetId)
    ) {
      setSelectedTargetId(prefilledTargetId);
      hasAppliedPrefill.current = true;
      return;
    }

    const targetStillExists = activeOptions.some((item) => item.id === selectedTargetId);
    if (!targetStillExists) {
      setSelectedTargetId(activeOptions[0].id);
    }
  }, [activeOptions, prefilledReleaseType, prefilledTargetId, releaseType, selectedTargetId]);

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [releaseType]);

  const selectedTarget = useMemo(
    () => activeOptions.find((item) => item.id === selectedTargetId) || null,
    [activeOptions, selectedTargetId]
  );

  const scheduledAtIso = useMemo(
    () =>
      isImmediateRelease
        ? ""
        : buildScheduleIsoString(selectedDate, selectedTime),
    [isImmediateRelease, selectedDate, selectedTime]
  );

  const isFutureSchedule = useMemo(() => {
    if (!scheduledAtIso) {
      return false;
    }

    const scheduledDate = new Date(scheduledAtIso);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();
  }, [scheduledAtIso]);

  const requirements = useMemo(() => {
    const isTrack = releaseType === "track";
    const hasSelectedTarget = Boolean(selectedTarget);
    const isApprovedTrack = !isTrack || selectedTarget?.approvalStatus === "approved";
    const hasValidContent = isTrack
      ? Number(selectedTarget?.audioFilesCount || 0) > 0 ||
        Number(selectedTarget?.duration || 0) > 0
      : Number(selectedTarget?.trackCount || 0) >= 2;

    return [
      {
        label: isTrack ? "Bài hát đã được duyệt" : "Album thuộc nghệ sĩ hiện tại",
        passed: hasSelectedTarget && isApprovedTrack,
      },
      {
        label: isTrack ? "File âm thanh hợp lệ" : "Album có ít nhất 2 bài hát",
        passed: hasSelectedTarget && hasValidContent,
      },
      {
        label: isImmediateRelease
          ? "Sẵn sàng công khai ngay sau khi xác nhận"
          : "Ngày phát hành phải ở tương lai",
        passed: isImmediateRelease ? hasSelectedTarget : isFutureSchedule,
      },
    ];
  }, [isFutureSchedule, isImmediateRelease, releaseType, selectedTarget]);

  const canSubmit = requirements.every((item) => item.passed) && Boolean(selectedTargetId);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await createMyReleaseScheduleService({
        type: releaseType,
        targetId: selectedTargetId,
        publishMode: isImmediateRelease ? "immediate" : "scheduled",
        scheduledAt: isImmediateRelease ? null : scheduledAtIso,
      });

      navigate(routePaths.artistReleases);
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tạo lịch phát hành mới."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetSummary = selectedTarget
    ? releaseType === "track"
      ? `${selectedTarget.albumTitle ? `${selectedTarget.albumTitle} • ` : ""}${formatDuration(selectedTarget.duration)}`
      : `${selectedTarget.trackCount} bài hát`
    : "Chưa chọn nội dung";

  const requirementsPassed = requirements.filter((item) => item.passed).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#8a84a3]">
        <Link
          to={routePaths.artistReleases}
          className="font-medium text-[#6a5cf6] transition hover:text-[#5446ec]"
        >
          Phát hành
        </Link>
        <span>&gt;</span>
        <span>Tạo lịch phát hành</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#1e172f]">
          Tạo lịch phát hành mới
        </h1>
        <p className="text-sm text-[#7f7a8f]">
          Chọn bài hát hoặc album và đặt ngày giờ phát hành.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_340px]">
        <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-6 shadow-[0_30px_60px_-42px_rgba(54,35,94,0.28)]">
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1f1830]">
                1. Chọn nội dung phát hành
              </h2>

              <div className="flex flex-wrap gap-5">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#3c3454]">
                  <input
                    type="radio"
                    name="releaseType"
                    value="track"
                    checked={releaseType === "track"}
                    onChange={() => setReleaseType("track")}
                    className="h-4 w-4 accent-[#6a5cf6]"
                  />
                  Bài hát
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#3c3454]">
                  <input
                    type="radio"
                    name="releaseType"
                    value="album"
                    checked={releaseType === "album"}
                    onChange={() => setReleaseType("album")}
                    className="h-4 w-4 accent-[#6a5cf6]"
                  />
                  Album
                </label>
              </div>

              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  disabled={isLoading || activeOptions.length === 0}
                  onClick={() => setIsDropdownOpen((current) => !current)}
                  className="flex h-[86px] w-full items-center gap-4 rounded-2xl border border-[#ebe8f8] bg-white px-4 pr-12 text-left outline-none transition hover:border-[#d6d0f5] focus:border-[#7c6cf2] disabled:cursor-not-allowed disabled:bg-[#f8f7fc]"
                >
                  {selectedTarget ? (
                    <>
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f3f1ff] ring-1 ring-[#ece7ff]">
                        {selectedTarget.coverImage ? (
                          <img
                            src={selectedTarget.coverImage}
                            alt={selectedTarget.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#6a5cf6]">
                            {releaseType === "track" ? (
                              <Music2 className="h-5 w-5" />
                            ) : (
                              <Disc3 className="h-5 w-5" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1f1830]">
                          {selectedTarget.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#857f99]">
                          {targetSummary}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-[#857f99]">
                      {isLoading ? "Đang tải dữ liệu..." : "Không có dữ liệu để chọn"}
                    </span>
                  )}
                </button>

                <ChevronDown
                  className={[
                    "pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a84a3] transition-transform",
                    isDropdownOpen ? "rotate-180" : "",
                  ].join(" ")}
                />

                {isDropdownOpen && activeOptions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 max-h-80 overflow-y-auto rounded-2xl border border-[#e6e1fb] bg-white p-2 shadow-[0_24px_50px_-30px_rgba(54,35,94,0.35)]">
                    <div className="space-y-1">
                      {activeOptions.map((item) => {
                        const isSelected = item.id === selectedTargetId;
                        const optionSummary =
                          releaseType === "track"
                            ? `${item.albumTitle ? `${item.albumTitle} • ` : ""}${formatDuration(item.duration)}`
                            : `${item.trackCount} bài hát`;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedTargetId(item.id);
                              setIsDropdownOpen(false);
                            }}
                            className={[
                              "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                              isSelected
                                ? "bg-[#f3f1ff] text-[#3f35a6]"
                                : "hover:bg-[#faf8ff] text-[#2f2747]",
                            ].join(" ")}
                          >
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f3f1ff] ring-1 ring-[#ece7ff]">
                              {item.coverImage ? (
                                <img
                                  src={item.coverImage}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[#6a5cf6]">
                                  {releaseType === "track" ? (
                                    <Music2 className="h-4 w-4" />
                                  ) : (
                                    <Disc3 className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-[#857f99]">
                                {optionSummary}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1f1830]">
                2. Cách phát hành
              </h2>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[#413956]">Chế độ phát hành</p>

                <label className="flex gap-3 rounded-2xl border border-[#ebe8f8] p-4">
                  <input
                    type="radio"
                    name="releaseVisibility"
                    checked={isImmediateRelease}
                    onChange={() => setIsImmediateRelease(true)}
                    className="mt-1 h-4 w-4 accent-[#6a5cf6]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1f1830]">Công khai ngay</p>
                    <p className="mt-1 text-xs leading-5 text-[#857f99]">
                      Bản phát hành sẽ được public ngay sau khi bạn xác nhận tạo lịch.
                    </p>
                  </div>
                </label>

                <label className="flex gap-3 rounded-2xl border border-[#ebe8f8] p-4">
                  <input
                    type="radio"
                    name="releaseVisibility"
                    checked={!isImmediateRelease}
                    onChange={() => setIsImmediateRelease(false)}
                    className="mt-1 h-4 w-4 accent-[#6a5cf6]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1f1830]">Lên lịch công khai</p>
                    <p className="mt-1 text-xs leading-5 text-[#857f99]">
                      Chỉ khi chọn chế độ này bạn mới cần đặt ngày và giờ phát hành.
                    </p>
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1f1830]">
                3. Thời gian phát hành
              </h2>

              {isImmediateRelease ? (
                <div className="rounded-2xl border border-[#ddd7ff] bg-[#f7f5ff] px-4 py-4 text-sm text-[#5f57a6]">
                  Bản phát hành sẽ được công khai ngay khi bạn bấm tạo lịch phát hành.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm text-[#6d6682]">
                      <span className="font-medium text-[#413956]">Ngày phát hành</span>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a84a3]" />
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-[#ebe8f8] bg-white pl-11 pr-4 text-sm text-[#251d38] outline-none transition focus:border-[#7c6cf2]"
                        />
                      </div>
                    </label>

                    <label className="space-y-2 text-sm text-[#6d6682]">
                      <span className="font-medium text-[#413956]">Giờ phát hành</span>
                      <div className="relative">
                        <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a84a3]" />
                        <input
                          type="time"
                          step={TIME_INPUT_STEP_SECONDS}
                          value={selectedTime}
                          onChange={(event) => setSelectedTime(event.target.value)}
                          className="h-12 w-full rounded-2xl border border-[#ebe8f8] bg-white pl-11 pr-4 text-sm text-[#251d38] outline-none transition focus:border-[#7c6cf2]"
                        />
                      </div>
                    </label>
                  </div>

                  <label className="space-y-2 text-sm text-[#6d6682]">
                    <span className="font-medium text-[#413956]">Múi giờ</span>
                    <div className="relative">
                      <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a84a3]" />
                      <select
                        value={TIMEZONE_LABEL}
                        disabled
                        className="h-12 w-full appearance-none rounded-2xl border border-[#ebe8f8] bg-[#faf9fe] pl-11 pr-10 text-sm text-[#251d38] outline-none"
                      >
                        <option value={TIMEZONE_LABEL}>{TIMEZONE_LABEL}</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a84a3]" />
                    </div>
                  </label>
                </>
              )}

              <label className="block space-y-2 text-sm text-[#6d6682]">
                <span className="font-medium text-[#413956]">Ghi chú (không bắt buộc)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 200))}
                  placeholder="Nhập ghi chú cho lịch phát hành này..."
                  className="min-h-[112px] w-full rounded-2xl border border-[#ebe8f8] bg-white px-4 py-3 text-sm text-[#251d38] outline-none transition focus:border-[#7c6cf2]"
                />
                <div className="text-right text-xs text-[#8a84a3]">{note.length}/200</div>
              </label>
            </section>

            <div className="flex flex-wrap justify-between gap-3 border-t border-[#f1eef8] pt-6">
              <button
                type="button"
                onClick={() => navigate(routePaths.artistReleases)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e2def3] bg-white px-6 text-sm font-medium text-[#5c5671] transition hover:border-[#c9c2ea] hover:text-[#2d2741]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-2xl bg-[#6657f6] px-6 text-sm font-medium text-white transition hover:bg-[#5747ec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? isImmediateRelease
                    ? "Đang công khai..."
                    : "Đang tạo lịch..."
                  : isImmediateRelease
                    ? "Công khai ngay"
                    : "Tạo lịch phát hành"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-42px_rgba(54,35,94,0.24)]">
            <h3 className="text-base font-semibold text-[#1f1830]">Tóm tắt lịch phát hành</h3>

            {selectedTarget ? (
              <div className="mt-4 space-y-5">
                <div className="flex gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#f3f1ff] ring-1 ring-[#ece7ff]">
                    {selectedTarget.coverImage ? (
                      <img
                        src={selectedTarget.coverImage}
                        alt={selectedTarget.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#6a5cf6]">
                        {releaseType === "track" ? (
                          <Music2 className="h-5 w-5" />
                        ) : (
                          <Disc3 className="h-5 w-5" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1f1830]">
                      {selectedTarget.title}
                    </p>
                    <p className="mt-1 text-xs text-[#8a84a3]">{targetSummary}</p>
                    <span className="mt-2 inline-flex items-center rounded-full bg-[#f3f1ff] px-2.5 py-1 text-xs font-medium text-[#5b4dde]">
                      {releaseType === "track" ? "Bài hát" : "Album"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 border-t border-[#f1eef8] pt-4 text-sm text-[#5e5873]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-[#8a84a3]" />
                      Ngày phát hành
                    </span>
                    <span className="font-medium text-[#1f1830]">
                      {isImmediateRelease ? "Ngay bây giờ" : formatDisplayDate(selectedDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[#8a84a3]" />
                      Giờ phát hành
                    </span>
                    <span className="font-medium text-[#1f1830]">
                      {isImmediateRelease ? "Tức thì" : formatDisplayTime(selectedTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-[#8a84a3]" />
                      Múi giờ
                    </span>
                    <span className="max-w-[170px] text-right font-medium text-[#1f1830]">
                      {TIMEZONE_LABEL}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <Info className="h-4 w-4 text-[#8a84a3]" />
                      Trạng thái sau khi phát hành
                    </span>
                    <span className="font-medium text-[#1f1830]">
                      {isImmediateRelease ? "Công khai ngay" : "Lên lịch công khai"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ddd7ff] bg-[#f7f5ff] px-4 py-4 text-sm text-[#5f57a6]">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <Info className="h-4 w-4" />
                    Lưu ý
                  </p>
                  <p className="mt-2 leading-6">
                    Bạn có thể chỉnh sửa hoặc hủy lịch phát hành trước thời gian đã đặt.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#ddd7ff] bg-[#faf9fe] px-4 py-8 text-center text-sm text-[#8a84a3]">
                Hãy chọn bài hát hoặc album để xem phần tóm tắt.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-42px_rgba(54,35,94,0.2)]">
            <h3 className="text-base font-semibold text-[#1f1830]">Yêu cầu</h3>
            <div className="mt-4 space-y-3">
              {requirements.map((item) => (
                <div key={item.label} className="flex items-start gap-3 text-sm">
                  {item.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#26a66f]" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#c0bbd6]" />
                  )}
                  <span className={item.passed ? "text-[#3f3954]" : "text-[#8d88a3]"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-[#f1eef8] bg-[#fbfaff] px-4 py-3 text-sm text-[#6d6682]">
              Đã đạt {requirementsPassed}/{requirements.length} điều kiện để tạo lịch phát hành.
            </div>

            {!canSubmit ? (
              <div className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Hoàn tất đủ điều kiện ở trên để có thể tạo lịch phát hành.</span>
              </div>
            ) : null}
          </div>
        </aside>
      </form>
    </section>
  );
};

export default ArtistCreateReleaseSchedulePage;
