import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Disc3,
  ExternalLink,
  Info,
  Music2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import {
  cancelMyReleaseScheduleService,
  getMyReleaseScheduleDetailService,
} from "../../services/artistReleaseScheduleService";

const statusMeta = {
  scheduled: {
    label: "Sắp tới",
    badgeClass: "border-[#d9d5ff] bg-[#f3f1ff] text-[#5b4dde]",
    dotClass: "bg-[#6d5efc]",
  },
  released: {
    label: "Đã phát hành",
    badgeClass: "border-[#ccefe0] bg-[#effcf6] text-[#1c9c6c]",
    dotClass: "bg-[#18a972]",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "border-[#ffd7d7] bg-[#fff1f1] text-[#e45454]",
    dotClass: "bg-[#e45454]",
  },
  draft: {
    label: "Bản nháp",
    badgeClass: "border-[#e7e7ef] bg-[#f7f7fb] text-[#8a8aa3]",
    dotClass: "bg-[#8a8aa3]",
  },
};

const sourceTypeMeta = {
  track: {
    label: "Bài hát",
    icon: Music2,
    helper: "Lịch phát hành bài hát",
  },
  album: {
    label: "Album",
    icon: Disc3,
    helper: "Lịch phát hành album",
  },
};

const platformItems = [
  { name: "Spotify", accent: "from-[#22c55e] to-[#16a34a]", short: "S" },
  { name: "Apple Music", accent: "from-[#fb7185] to-[#ef4444]", short: "A" },
  { name: "YouTube Music", accent: "from-[#f97316] to-[#ef4444]", short: "Y" },
  { name: "TikTok", accent: "from-[#1f2937] to-[#111827]", short: "T" },
  { name: "Zing MP3", accent: "from-[#f59e0b] to-[#f97316]", short: "Z" },
];

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const formatDuration = (duration) => {
  const totalSeconds = Math.max(0, Number(duration) || 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
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

const getDetailPath = (releaseSchedule) => {
  if (!releaseSchedule?.item?.id) {
    return "";
  }

  if (releaseSchedule.sourceType === "album") {
    return routePaths.artistAlbumDetail(releaseSchedule.item.id);
  }

  return routePaths.artistTrackDetail(releaseSchedule.item.id);
};

const getEditPath = (releaseSchedule) => {
  if (!releaseSchedule?.item?.id) {
    return "";
  }

  if (releaseSchedule.sourceType === "album") {
    return routePaths.artistEditAlbum(releaseSchedule.item.id);
  }

  return routePaths.artistTrackEdit(releaseSchedule.item.id);
};

const buildProgressSteps = (releaseSchedule) => {
  const scheduledAt = releaseSchedule?.scheduledAt;
  const releasedAt = releaseSchedule?.releasedAt;
  const createdAt = releaseSchedule?.createdAt;
  const status = releaseSchedule?.status;
  const steps = [
    {
      id: "created",
      title: "Đã tạo lịch",
      description: createdAt
        ? `Lịch phát hành được tạo lúc ${formatDateTime(createdAt)}`
        : "Lịch phát hành đã được khởi tạo thành công.",
      state: "done",
    },
  ];

  if (status === "cancelled") {
    steps.push(
      {
        id: "processing",
        title: "Đang xử lý",
        description: "Nội dung đã được tiếp nhận trước khi lịch bị hủy.",
        state: "done",
      },
      {
        id: "cancelled",
        title: "Đã hủy lịch",
        description: "Lịch phát hành này sẽ không được công khai trên nền tảng.",
        state: "current",
      }
    );

    return steps;
  }

  steps.push(
    {
      id: "processing",
      title: "Đang xử lý",
      description:
        status === "released"
          ? "Nội dung đã đi qua bước chuẩn bị phát hành."
          : "Nội dung đang được chuẩn bị để phát hành đúng thời gian đã đặt.",
      state: status === "scheduled" ? "current" : "done",
    },
    {
      id: "scheduled",
      title: "Đã lên lịch",
      description: scheduledAt
        ? `Sẵn sàng phát hành vào ${formatDateTime(scheduledAt)}`
        : "Đang chờ đến thời điểm phát hành.",
      state: status === "scheduled" ? "upcoming" : "done",
    },
    {
      id: "released",
      title: "Đã phát hành",
      description:
        status === "released"
          ? `Nội dung đã phát hành lúc ${formatDateTime(releasedAt || scheduledAt)}`
          : "Nội dung sẽ tự động phát hành khi đến đúng thời gian đã lên lịch.",
      state: status === "released" ? "done" : "upcoming",
    }
  );

  return steps;
};

const StepDot = ({ state }) => {
  if (state === "done") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efeefe] text-[#5b4dde]">
        <CheckCircle2 className="h-4.5 w-4.5" />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f1ff] text-[#5b4dde]">
        <span className="absolute h-8 w-8 rounded-full border border-[#d9d5ff]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6d5efc]" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f6f5fb] text-[#b5b1c8]">
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    </span>
  );
};

const DetailRow = ({ label, value, valueClassName = "" }) => (
  <div className="grid gap-2 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
    <p className="text-sm text-[#837e94]">{label}</p>
    <p className={["text-sm font-medium text-[#221b35]", valueClassName].join(" ")}>
      {value}
    </p>
  </div>
);

const ArtistReleaseScheduleDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [artistName, setArtistName] = useState("");
  const [releaseSchedule, setReleaseSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDetail = async () => {
      if (!id) {
        setReleaseSchedule(null);
        setErrorMessage("Không tìm thấy mã lịch phát hành.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");
      setActionError("");

      try {
        const response = await getMyReleaseScheduleDetailService(id);

        if (!isMounted) {
          return;
        }

        setArtistName(response?.artist?.name || "");
        setReleaseSchedule(response?.releaseSchedule || null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtistName("");
        setReleaseSchedule(null);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải chi tiết lịch phát hành."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const normalizedStatus = String(releaseSchedule?.status || "")
    .trim()
    .toLowerCase();
  const statusInfo = statusMeta[normalizedStatus] || statusMeta.draft;
  const sourceInfo =
    sourceTypeMeta[releaseSchedule?.sourceType] || sourceTypeMeta.track;
  const canCancelRelease =
    Boolean(releaseSchedule?.id) &&
    normalizedStatus !== "released" &&
    normalizedStatus !== "cancelled";
  const ReleaseIcon = sourceInfo.icon;
  const releaseImage = getReleaseImage(releaseSchedule);
  const detailPath = getDetailPath(releaseSchedule);
  const editPath = getEditPath(releaseSchedule);
  const progressSteps = useMemo(
    () => buildProgressSteps(releaseSchedule),
    [releaseSchedule]
  );
  const requirementItems = useMemo(
    () => [
      {
        id: "target-selected",
        label:
          releaseSchedule?.sourceType === "album"
            ? "Album đã được chọn hợp lệ"
            : "Bài hát đã được chọn hợp lệ",
        done: Boolean(releaseSchedule?.item?.id),
      },
      {
        id: "future-date",
        label: "Đã đặt lịch phát hành thành công",
        done:
          normalizedStatus === "scheduled" || normalizedStatus === "released",
      },
      {
        id: "schedule-created",
        label: "Lịch phát hành đã được lưu trên hệ thống",
        done: Boolean(releaseSchedule?.id),
      },
    ],
    [normalizedStatus, releaseSchedule]
  );

  const handleOpenCancelModal = () => {
    if (!canCancelRelease || isCancelling) {
      return;
    }

    setActionError("");
    setIsCancelModalOpen(true);
  };

  const handleCloseCancelModal = () => {
    if (isCancelling) {
      return;
    }

    setIsCancelModalOpen(false);
  };

  const handleCancelReleaseSchedule = async () => {
    if (!releaseSchedule?.id || !canCancelRelease || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setActionError("");
    setActionMessage("");

    try {
      const response = await cancelMyReleaseScheduleService(releaseSchedule.id);

      setArtistName(response?.artist?.name || artistName);
      setReleaseSchedule(response?.releaseSchedule || releaseSchedule);
      setActionMessage(
        response?.message || "Đã hủy lịch phát hành thành công."
      );
      setIsCancelModalOpen(false);
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể hủy lịch phát hành lúc này."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[28px] border border-[#ebe8f8] bg-white px-6 py-8 text-sm text-[#6f6a82] shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)]">
        Đang tải chi tiết lịch phát hành...
      </section>
    );
  }

  if (errorMessage || !releaseSchedule) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(routePaths.artistReleases)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6f6a82] transition hover:text-[#5b4dde]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại lịch phát hành
        </button>

        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-800">
          <h1 className="text-lg font-semibold">Không thể tải chi tiết lịch phát hành</h1>
          <p className="mt-2 text-sm">{errorMessage || "Dữ liệu không tồn tại."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(routePaths.artistReleases)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#6f6a82] transition hover:text-[#5b4dde]"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#8b86a0]">
            <span>Lịch phát hành</span>
            <ChevronRight className="h-4 w-4" />
            <span>Chi tiết lịch phát hành</span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-[#1e172f]">
                {releaseSchedule?.item?.title || "Chi tiết lịch phát hành"}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.badgeClass}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#7f7a8f]">
              {sourceInfo.helper}
              {artistName ? ` của ${artistName}` : ""}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {detailPath ? (
            <button
              type="button"
              onClick={() => navigate(detailPath)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#ebe8f8] bg-white px-4 text-sm font-medium text-[#3e3560] transition hover:border-[#cfc8f5] hover:text-[#5b4dde]"
            >
              <ExternalLink className="h-4 w-4" />
              Xem nội dung phát hành
            </button>
          ) : null}

          {editPath ? (
            <button
              type="button"
              onClick={() => navigate(editPath)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#6657f6] px-4 text-sm font-medium text-white transition hover:bg-[#5747ec]"
            >
              <Pencil className="h-4 w-4" />
              Chỉnh sửa nội dung
            </button>
          ) : null}
        </div>
      </div>

      {actionMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#1e172f]">Thông tin phát hành</h2>

            <div className="mt-5 grid gap-6 lg:grid-cols-[170px_minmax(0,1fr)]">
              <div className="aspect-square overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#f4f0ff_0%,#ece8ff_45%,#faf9ff_100%)] ring-1 ring-[#e8e2ff]">
                {releaseImage ? (
                  <img
                    src={releaseImage}
                    alt={releaseSchedule?.item?.title || "Ảnh phát hành"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#6d5efc]">
                    <ReleaseIcon className="h-14 w-14" />
                  </div>
                )}
              </div>

              <div className="divide-y divide-[#f1eef8]">
                <DetailRow label="Loại" value={sourceInfo.label} />
                <DetailRow
                  label="Ngày phát hành"
                  value={formatDate(releaseSchedule?.scheduledAt)}
                />
                <DetailRow
                  label="Giờ phát hành"
                  value={formatTime(releaseSchedule?.scheduledAt)}
                />
                <DetailRow
                  label="Trạng thái"
                  value={statusInfo.label}
                  valueClassName="text-[#5b4dde]"
                />
                <DetailRow
                  label="Ngày tạo"
                  value={formatDateTime(releaseSchedule?.createdAt)}
                />
                <DetailRow
                  label="ID lịch phát hành"
                  value={releaseSchedule?.id || "-"}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1e172f]">
                  {releaseSchedule?.sourceType === "album"
                    ? "Album trong lịch phát hành"
                    : "Bài hát trong lịch phát hành"}
                </h2>
                <p className="mt-1 text-sm text-[#857f98]">
                  {releaseSchedule?.sourceType === "album"
                    ? `${releaseSchedule?.item?.trackCount || 0} bài hát`
                    : "1 bài hát"}
                </p>
              </div>

              {detailPath ? (
                <button
                  type="button"
                  onClick={() => navigate(detailPath)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#e6e2ff] bg-[#f7f5ff] px-4 text-sm font-medium text-[#5b4dde] transition hover:bg-[#f1edff]"
                >
                  <Sparkles className="h-4 w-4" />
                  Xem nội dung
                </button>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-[#f0eef9]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[linear-gradient(180deg,#fbfaff_0%,#f5f2ff_100%)] text-[#7d7792]">
                    <tr>
                      <th className="px-5 py-4 font-medium">#</th>
                      <th className="px-5 py-4 font-medium">Tiêu đề</th>
                      <th className="px-5 py-4 font-medium">
                        {releaseSchedule?.sourceType === "album"
                          ? "Số bài hát"
                          : "Thời lượng"}
                      </th>
                      <th className="px-5 py-4 font-medium">
                        {releaseSchedule?.sourceType === "album"
                          ? "Ngày phát hành"
                          : "Loại"}
                      </th>
                      <th className="px-5 py-4 font-medium text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-[#f1eef8] text-[#201931]">
                      <td className="px-5 py-4 text-[#7d7792]">01</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#f5f2ff] ring-1 ring-[#ece7ff]">
                            {releaseImage ? (
                              <img
                                src={releaseImage}
                                alt={releaseSchedule?.item?.title || "Nội dung phát hành"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#6d5efc]">
                                <ReleaseIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1e172f]">
                              {releaseSchedule?.item?.title || "Chưa có tiêu đề"}
                            </p>
                            <p className="mt-1 text-xs text-[#8d88a3]">
                              {releaseSchedule?.sourceType === "album"
                                ? "Album"
                                : "Bài hát"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#6b657f]">
                        {releaseSchedule?.sourceType === "album"
                          ? releaseSchedule?.item?.trackCount || 0
                          : formatDuration(releaseSchedule?.item?.duration)}
                      </td>
                      <td className="px-5 py-4 text-[#6b657f]">
                        {releaseSchedule?.sourceType === "album"
                          ? formatDate(releaseSchedule?.item?.releaseDate)
                          : sourceInfo.label}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {detailPath ? (
                          <button
                            type="button"
                            onClick={() => navigate(detailPath)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ebe8f8] px-3 text-sm font-medium text-[#5b4dde] transition hover:border-[#d7d1ff] hover:bg-[#f7f5ff]"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Xem
                          </button>
                        ) : (
                          <span className="text-sm text-[#9b96af]">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#1e172f]">Tiến trình phát hành</h2>

            <div className="mt-5 space-y-5">
              {progressSteps.map((step, index) => (
                <div key={step.id} className="relative flex gap-3">
                  {index < progressSteps.length - 1 ? (
                    <span className="absolute left-4 top-8 h-[calc(100%-12px)] w-px bg-[#ebe8f8]" />
                  ) : null}

                  <div className="relative z-[1] pt-0.5">
                    <StepDot state={step.state} />
                  </div>

                  <div
                    className={[
                      "flex-1 rounded-2xl border px-4 py-3",
                      step.state === "current"
                        ? "border-[#e6e2ff] bg-[#f8f6ff]"
                        : "border-[#f0eef9] bg-white",
                    ].join(" ")}
                  >
                    <p className="font-medium text-[#221b35]">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#847e98]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#1e172f]">Hành động</h2>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => editPath && navigate(editPath)}
                disabled={!editPath || isCancelling}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#ebe8f8] px-4 py-3 text-left text-sm font-medium text-[#3e3560] transition hover:border-[#d7d1ff] hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Pencil className="h-4 w-4 text-[#5b4dde]" />
                Chỉnh sửa nội dung phát hành
              </button>

              <button
                type="button"
                onClick={handleOpenCancelModal}
                disabled={!canCancelRelease || isCancelling}
                className={[
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                  canCancelRelease
                    ? "border-[#ffe1e1] bg-[#fff7f7] text-[#d85858] hover:border-[#ffcaca] hover:bg-[#fff0f0]"
                    : "border-[#f0eef9] bg-[#faf9ff] text-[#9d98b0]",
                ].join(" ")}
              >
                <Trash2 className="h-4 w-4" />
                {isCancelling ? "Đang hủy lịch phát hành..." : "Hủy lịch phát hành"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#ebe8f8] bg-[#faf9ff] px-4 py-3 text-sm text-[#7c7690]">
              {canCancelRelease
                ? "Bạn chỉ có thể hủy lịch khi bản phát hành vẫn đang ở trạng thái sắp tới."
                : "Lịch đã phát hành hoặc đã hủy sẽ không thể hủy thêm lần nữa."}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ebe8f8] bg-white p-5 shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f1ff] text-[#5b4dde]">
                <Info className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#1e172f]">Yêu cầu</h2>
                <p className="mt-1 text-sm text-[#857f98]">
                  Kiểm tra nhanh trạng thái dữ liệu cho lịch phát hành này.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {requirementItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#f0eef9] px-4 py-3"
                >
                  <div
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      item.done
                        ? "bg-[#effcf6] text-[#1c9c6c]"
                        : "bg-[#f7f7fb] text-[#9d98b0]",
                    ].join(" ")}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-[#3e3560]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-[#ece9ff] bg-[#f7f5ff] px-4 py-3 text-sm text-[#665f7a]">
              Lịch này đang theo múi giờ hệ thống hiện tại và sẽ tự cập nhật trạng thái
              khi backend xử lý phát hành.
            </div>
          </div>
        </div>
      </div>

      {isCancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171125]/45 px-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[460px] rounded-[28px] bg-white px-6 pb-6 pt-5 shadow-[0_35px_80px_-35px_rgba(31,23,54,0.45)]">
            <button
              type="button"
              onClick={handleCloseCancelModal}
              disabled={isCancelling}
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#807b92] transition hover:bg-[#f5f2ff] hover:text-[#4d4275] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Đóng xác nhận hủy lịch phát hành"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,#ffe5e5_0%,#fff5f5_72%)] text-[#ef4444]">
              <Trash2 className="h-7 w-7" />
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-[28px] font-semibold tracking-tight text-[#221b35]">
                Hủy lịch phát hành?
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#7f7a8f]">
                Bạn có chắc chắn muốn hủy lịch phát hành{" "}
                <span className="font-semibold text-[#221b35]">
                  "{releaseSchedule?.item?.title || "bản phát hành này"}"
                </span>
                ?
              </p>
              <p className="mt-1 text-sm text-[#ef4444]">
                Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCloseCancelModal}
                disabled={isCancelling}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#ebe8f8] bg-white px-4 text-sm font-medium text-[#4b4461] transition hover:border-[#d7d1ff] hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Không, quay lại
              </button>
              <button
                type="button"
                onClick={handleCancelReleaseSchedule}
                disabled={isCancelling}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#ef4444] px-4 text-sm font-medium text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistReleaseScheduleDetailPage;
