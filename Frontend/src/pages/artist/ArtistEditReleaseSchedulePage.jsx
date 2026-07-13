import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  Save,
  XCircle,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import {
  getMyReleaseScheduleDetailService,
  updateMyReleaseScheduleService,
} from "../../services/artistReleaseScheduleService";

const TIMEZONE_LABEL = "(GMT+07:00) Bangkok, Hanoi, Jakarta";
const TIMEZONE_NAME = "Asia/Bangkok";
const TIME_INPUT_STEP_SECONDS = 300;

const getTomorrowDateValue = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildScheduleIsoString = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return "";
  }

  return `${dateValue}T${timeValue}:00+07:00`;
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

const formatDuration = (duration) => {
  const totalSeconds = Number(duration) || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const extractBangkokScheduleParts = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      dateValue: getTomorrowDateValue(),
      timeValue: "08:00",
    };
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_NAME,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value || "";

  return {
    dateValue: `${getPart("year")}-${getPart("month")}-${getPart("day")}`,
    timeValue: `${getPart("hour")}:${getPart("minute")}`,
  };
};

const getReleaseImage = (releaseSchedule) => {
  const coverImage = releaseSchedule?.item?.coverImage;

  if (typeof coverImage === "string" && coverImage) {
    return coverImage;
  }

  if (Array.isArray(coverImage) && coverImage.length > 0) {
    return coverImage.find(Boolean) || "";
  }

  return releaseSchedule?.item?.avatar || "";
};

const statusMeta = {
  scheduled: {
    label: "Sắp tới",
    badgeClass: "border-[#d9d5ff] bg-[#f3f1ff] text-[#5b4dde]",
  },
  released: {
    label: "Đã phát hành",
    badgeClass: "border-[#ccefe0] bg-[#effcf6] text-[#1c9c6c]",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "border-[#ffd7d7] bg-[#fff1f1] text-[#e45454]",
  },
};

const ArtistEditReleaseSchedulePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [artistName, setArtistName] = useState("");
  const [releaseSchedule, setReleaseSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTomorrowDateValue);
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadReleaseSchedule = async () => {
      if (!id) {
        setErrorMessage("Không tìm thấy mã lịch phát hành.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getMyReleaseScheduleDetailService(id);

        if (!isMounted) {
          return;
        }

        const schedule = response?.releaseSchedule || null;
        const scheduleParts = extractBangkokScheduleParts(schedule?.scheduledAt);

        setArtistName(response?.artist?.name || "");
        setReleaseSchedule(schedule);
        setSelectedDate(scheduleParts.dateValue);
        setSelectedTime(scheduleParts.timeValue);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtistName("");
        setReleaseSchedule(null);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải lịch phát hành để chỉnh sửa."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadReleaseSchedule();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const scheduledAtIso = useMemo(
    () => buildScheduleIsoString(selectedDate, selectedTime),
    [selectedDate, selectedTime]
  );

  const normalizedStatus = String(releaseSchedule?.status || "")
    .trim()
    .toLowerCase();
  const statusInfo = statusMeta[normalizedStatus] || statusMeta.scheduled;
  const releaseImage = getReleaseImage(releaseSchedule);
  const isTrack = releaseSchedule?.sourceType !== "album";
  const ReleaseIcon = isTrack ? Music2 : Disc3;
  const selectedTargetSummary = isTrack
    ? formatDuration(releaseSchedule?.item?.duration)
    : `${releaseSchedule?.item?.trackCount || 0} bài hát`;

  const isFutureSchedule = useMemo(() => {
    if (!scheduledAtIso) {
      return false;
    }

    const scheduledDate = new Date(scheduledAtIso);
    return !Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now();
  }, [scheduledAtIso]);

  const canEdit = useMemo(() => {
    if (!releaseSchedule?.id) {
      return false;
    }

    if (normalizedStatus === "released" || normalizedStatus === "cancelled") {
      return false;
    }

    const currentScheduledAt = new Date(releaseSchedule.scheduledAt).getTime();
    return !Number.isNaN(currentScheduledAt) && currentScheduledAt > Date.now();
  }, [normalizedStatus, releaseSchedule]);

  const requirements = useMemo(
    () => [
      {
        label: "Lịch phát hành còn hiệu lực để chỉnh sửa",
        passed: canEdit,
      },
      {
        label: "Đã chọn nội dung phát hành hợp lệ",
        passed: Boolean(releaseSchedule?.item?.id),
      },
      {
        label: "Ngày phát hành mới phải ở tương lai",
        passed: isFutureSchedule,
      },
    ],
    [canEdit, isFutureSchedule, releaseSchedule]
  );

  const canSubmit =
    canEdit && requirements.every((item) => item.passed) && Boolean(releaseSchedule?.id);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit || isSubmitting || !releaseSchedule?.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await updateMyReleaseScheduleService(releaseSchedule.id, {
        scheduledAt: scheduledAtIso,
      });

      navigate(routePaths.artistReleaseScheduleDetail(releaseSchedule.id), {
        state: {
          message: "Đã cập nhật lịch phát hành thành công.",
        },
      });
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể cập nhật lịch phát hành lúc này."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-[28px] border border-[#ebe8f8] bg-white px-6 py-8 text-sm text-[#6f6a82] shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)]">
        Đang tải thông tin lịch phát hành...
      </section>
    );
  }

  if (errorMessage && !releaseSchedule) {
    return (
      <section className="space-y-4">
        <Link
          to={routePaths.artistReleases}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6f6a82] transition hover:text-[#5b4dde]"
        >
          Quay lại lịch phát hành
        </Link>

        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-800">
          <h1 className="text-lg font-semibold">Không thể tải dữ liệu chỉnh sửa</h1>
          <p className="mt-2 text-sm">{errorMessage}</p>
        </div>
      </section>
    );
  }

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
        <Link
          to={routePaths.artistReleaseScheduleDetail(releaseSchedule?.id)}
          className="font-medium text-[#6a5cf6] transition hover:text-[#5446ec]"
        >
          Chi tiết lịch phát hành
        </Link>
        <span>&gt;</span>
        <span>Chỉnh sửa lịch phát hành</span>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[#1e172f]">
            Chỉnh sửa lịch phát hành
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.badgeClass}`}
          >
            {statusInfo.label}
          </span>
        </div>
        <p className="text-sm text-[#7f7a8f]">
          Cập nhật ngày giờ phát hành cho
          {artistName ? ` ${artistName}` : ""} mà không cần sửa nội dung track hoặc album.
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
                1. Nội dung phát hành
              </h2>

              <div className="flex items-center gap-4 rounded-2xl border border-[#ebe8f8] bg-white px-4 py-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#f3f1ff] ring-1 ring-[#ece7ff]">
                  {releaseImage ? (
                    <img
                      src={releaseImage}
                      alt={releaseSchedule?.item?.title || "Release"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#6a5cf6]">
                      <ReleaseIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1f1830]">
                    {releaseSchedule?.item?.title || "Chưa có tên"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#857f99]">
                    {selectedTargetSummary}
                  </p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-[#f3f1ff] px-2.5 py-1 text-xs font-medium text-[#5b4dde]">
                    {isTrack ? "Bài hát" : "Album"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ece9ff] bg-[#f7f5ff] px-4 py-4 text-sm text-[#665f7a]">
                Bạn đang chỉnh sửa lịch của bản phát hành hiện có. Nếu muốn đổi track hoặc
                album, hãy tạo một lịch phát hành mới cho nội dung khác.
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[#1f1830]">
                2. Thời gian phát hành mới
              </h2>

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
            </section>

            <div className="flex flex-wrap justify-between gap-3 border-t border-[#f1eef8] pt-6">
              <button
                type="button"
                onClick={() =>
                  navigate(routePaths.artistReleaseScheduleDetail(releaseSchedule?.id))
                }
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e2def3] bg-white px-6 text-sm font-medium text-[#5c5671] transition hover:border-[#c9c2ea] hover:text-[#2d2741]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-[#6657f6] px-6 text-sm font-medium text-white transition hover:bg-[#5747ec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Đang cập nhật lịch..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-42px_rgba(54,35,94,0.24)]">
            <h3 className="text-base font-semibold text-[#1f1830]">Tóm tắt lịch phát hành</h3>

            <div className="mt-4 space-y-5">
              <div className="flex gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#f3f1ff] ring-1 ring-[#ece7ff]">
                  {releaseImage ? (
                    <img
                      src={releaseImage}
                      alt={releaseSchedule?.item?.title || "Release"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#6a5cf6]">
                      <ReleaseIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1f1830]">
                    {releaseSchedule?.item?.title || "Chưa có tên"}
                  </p>
                  <p className="mt-1 text-xs text-[#8a84a3]">{selectedTargetSummary}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-[#f3f1ff] px-2.5 py-1 text-xs font-medium text-[#5b4dde]">
                    {isTrack ? "Bài hát" : "Album"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 border-t border-[#f1eef8] pt-4 text-sm text-[#5e5873]">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#8a84a3]" />
                    Ngày phát hành mới
                  </span>
                  <span className="font-medium text-[#1f1830]">
                    {formatDisplayDate(selectedDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#8a84a3]" />
                    Giờ phát hành mới
                  </span>
                  <span className="font-medium text-[#1f1830]">
                    {formatDisplayTime(selectedTime)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#8a84a3]" />
                    Lịch hiện tại
                  </span>
                  <span className="font-medium text-[#1f1830]">
                    {formatDisplayDate(releaseSchedule?.scheduledAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ddd7ff] bg-[#f7f5ff] px-4 py-4 text-sm text-[#5f57a6]">
                <p className="inline-flex items-center gap-2 font-semibold">
                  <Info className="h-4 w-4" />
                  Lưu ý
                </p>
                <p className="mt-2 leading-6">
                  Sau khi lưu, lịch phát hành sẽ dùng ngày giờ mới và hệ thống sẽ cập nhật lại
                  mốc phát hành cho track hoặc album tương ứng.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-42px_rgba(54,35,94,0.2)]">
            <h3 className="text-base font-semibold text-[#1f1830]">Điều kiện</h3>
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
              Đã đạt {requirementsPassed}/{requirements.length} điều kiện để cập nhật lịch phát
              hành.
            </div>

            {!canSubmit ? (
              <div className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Chỉ có thể chỉnh sửa lịch còn hiệu lực và có thời gian phát hành mới ở tương lai.</span>
              </div>
            ) : null}
          </div>
        </aside>
      </form>
    </section>
  );
};

export default ArtistEditReleaseSchedulePage;
