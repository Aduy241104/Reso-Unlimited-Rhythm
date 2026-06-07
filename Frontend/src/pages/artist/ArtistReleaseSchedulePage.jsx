import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  CircleX,
  Clock3,
  Disc3,
  EllipsisVertical,
  Eye,
  FileText,
  Music2,
  Pencil,
  Search,
  RotateCcw,
} from "lucide-react";
import { routePaths } from "../../routes/routePaths";
import { getMyReleaseSchedulesService } from "../../services/artistReleaseScheduleService";

const PAGE_SIZE = 6;
const FETCH_LIMIT = 50;

const formatDisplayDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDisplayTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

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

const normalizeText = (value) => String(value || "").toLowerCase().trim();

const statusMeta = {
  scheduled: {
    label: "Sắp tới",
    badgeClass: "border-[#d9d5ff] bg-[#f3f1ff] text-[#5b4dde]",
    icon: CalendarDays,
    cardClass: "text-[#5b4dde]",
  },
  released: {
    label: "Đã phát hành",
    badgeClass: "border-[#ccefe0] bg-[#effcf6] text-[#1c9c6c]",
    icon: CheckCircle2,
    cardClass: "text-[#1c9c6c]",
  },
  cancelled: {
    label: "Đã hủy",
    badgeClass: "border-[#ffd7d7] bg-[#fff1f1] text-[#e45454]",
    icon: CircleX,
    cardClass: "text-[#e45454]",
  },
  draft: {
    label: "Bản nháp",
    badgeClass: "border-[#e7e7ef] bg-[#f7f7fb] text-[#8a8aa3]",
    icon: FileText,
    cardClass: "text-[#8a8aa3]",
  },
};

const typeMeta = {
  track: {
    label: "Bài hát",
    secondary: "Đĩa đơn",
    icon: Music2,
  },
  album: {
    label: "Album",
    secondary: "Album",
    icon: Disc3,
  },
};

const getReleaseImage = (release) => {
  const coverImage = release?.item?.coverImage;

  if (typeof coverImage === "string" && coverImage) {
    return coverImage;
  }

  if (Array.isArray(coverImage)) {
    return coverImage.find(Boolean) || "";
  }

  return release?.item?.avatar || "";
};

const getReleaseTypeLabel = (release) => {
  const sourceType = release?.sourceType || "track";
  return typeMeta[sourceType]?.label || "Bài hát";
};

const getReleaseSubtypeLabel = (release) => {
  if (release?.sourceType === "album") {
    return `${release?.item?.trackCount || 0} bài hát`;
  }

  return release?.item?.duration
    ? formatDuration(release.item.duration)
    : typeMeta.track.secondary;
};

const matchesDateFilter = (release, selectedDate) => {
  if (!selectedDate) {
    return true;
  }

  if (!release?.scheduledAt) {
    return false;
  }

  const scheduleDate = new Date(release.scheduledAt);
  if (Number.isNaN(scheduleDate.getTime())) {
    return false;
  }

  const normalizedScheduleDate = scheduleDate.toISOString().slice(0, 10);
  return normalizedScheduleDate === selectedDate;
};

const buildRowNumber = (index, page) =>
  String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0");

const ArtistReleaseSchedulePage = () => {
  const navigate = useNavigate();
  const [artistName, setArtistName] = useState("");
  const [releaseSchedules, setReleaseSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [serverStatus, setServerStatus] = useState("");
  const [serverType, setServerType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadReleaseSchedules = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await getMyReleaseSchedulesService({
          scope: "all",
          limit: FETCH_LIMIT,
          status: serverStatus || undefined,
          type: serverType || undefined,
        });

        if (!isMounted) {
          return;
        }

        setArtistName(response?.artist?.name || "Nghệ sĩ");
        setReleaseSchedules(response?.releaseSchedules || []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setArtistName("");
        setReleaseSchedules([]);
        setErrorMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải danh sách lịch phát hành."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadReleaseSchedules();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, serverStatus, serverType]);

  const filteredSchedules = useMemo(() => {
    const normalizedSearchTerm = normalizeText(searchTerm);

    return releaseSchedules.filter((release) => {
      const title = normalizeText(release?.item?.title);
      const type = normalizeText(getReleaseTypeLabel(release));
      const status = normalizeText(statusMeta[release?.status]?.label || release?.status);

      const matchesSearch =
        !normalizedSearchTerm ||
        title.includes(normalizedSearchTerm) ||
        type.includes(normalizedSearchTerm) ||
        status.includes(normalizedSearchTerm);

      return matchesSearch && matchesDateFilter(release, selectedDate);
    });
  }, [releaseSchedules, searchTerm, selectedDate]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedDate, serverStatus, serverType]);

  const paginatedSchedules = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSchedules.slice(start, start + PAGE_SIZE);
  }, [filteredSchedules, page]);

  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const scheduled = releaseSchedules.filter((item) => item.status === "scheduled").length;
    const released = releaseSchedules.filter((item) => item.status === "released").length;
    const cancelled = releaseSchedules.filter((item) => item.status === "cancelled").length;

    return [
      {
        label: "Tổng lịch phát hành",
        value: releaseSchedules.length,
        icon: CalendarPlus2,
        colorClass: "text-[#5b4dde]",
      },
      {
        label: "Sắp tới",
        value: scheduled,
        icon: Clock3,
        colorClass: "text-[#d48b2f]",
      },
      {
        label: "Đã phát hành",
        value: released,
        icon: CheckCircle2,
        colorClass: "text-[#1c9c6c]",
      },
      {
        label: "Đã hủy",
        value: cancelled,
        icon: CircleX,
        colorClass: "text-[#e45454]",
      },
      {
        label: "Bản nháp",
        value: 0,
        icon: FileText,
        colorClass: "text-[#8a8aa3]",
      },
    ];
  }, [releaseSchedules]);

  const handleOpenRelease = (release) => {
    if (!release?.item?.id) {
      return;
    }

    if (release.sourceType === "album") {
      navigate(routePaths.artistAlbumDetail(release.item.id));
      return;
    }

    navigate(routePaths.artistTrackDetail(release.item.id));
  };

  const handleEditRelease = (release) => {
    if (!release?.item?.id) {
      return;
    }

    if (release.sourceType === "album") {
      navigate(routePaths.artistEditAlbum(release.item.id));
      return;
    }

    navigate(routePaths.artistTrackEdit(release.item.id));
  };

  const handleResetFilters = () => {
    setServerStatus("");
    setServerType("");
    setSearchTerm("");
    setSelectedDate("");
    setPage(1);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[#1e172f]">
          Lịch phát hành
        </h1>
        <p className="text-sm text-[#7f7a8f]">
          Quản lý lịch phát hành bài hát và album cho {artistName || "hồ sơ nghệ sĩ của bạn"}.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-[#ebe8f8] bg-white px-5 py-4 shadow-[0_16px_35px_-28px_rgba(54,35,94,0.22)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold text-[#1e172f]">{item.value}</p>
                  <p className="mt-2 text-sm text-[#807b91]">{item.label}</p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f5ff] ${item.colorClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-[#ebe8f8] bg-white shadow-[0_30px_60px_-40px_rgba(54,35,94,0.35)]">
        <div className="flex flex-col gap-4 border-b border-[#f0eef9] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_180px_180px_170px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a6a1bb]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên bài hát hoặc album"
                className="h-12 w-full rounded-2xl border border-[#ebe8f8] bg-[#fcfbff] pl-11 pr-4 text-sm text-[#201931] outline-none transition focus:border-[#7c6cf2]"
              />
            </label>

            <select
              value={serverStatus}
              onChange={(event) => setServerStatus(event.target.value)}
              className="h-12 rounded-2xl border border-[#ebe8f8] bg-[#fcfbff] px-4 text-sm text-[#201931] outline-none transition focus:border-[#7c6cf2]"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="scheduled">Sắp tới</option>
              <option value="released">Đã phát hành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <select
              value={serverType}
              onChange={(event) => setServerType(event.target.value)}
              className="h-12 rounded-2xl border border-[#ebe8f8] bg-[#fcfbff] px-4 text-sm text-[#201931] outline-none transition focus:border-[#7c6cf2]"
            >
              <option value="">Tất cả loại</option>
              <option value="track">Bài hát</option>
              <option value="album">Album</option>
            </select>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-12 rounded-2xl border border-[#ebe8f8] bg-[#fcfbff] px-4 text-sm text-[#201931] outline-none transition focus:border-[#7c6cf2]"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#ebe8f8] bg-white px-4 text-sm font-medium text-[#6c6782] transition hover:border-[#cfc8f5] hover:text-[#3e3560]"
            >
              <RotateCcw className="h-4 w-4" />
              Đặt lại
            </button>
            <button
              type="button"
              onClick={() => navigate(routePaths.artistCreateTrack)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#6657f6] px-5 text-sm font-medium text-white transition hover:bg-[#5747ec]"
            >
              <CalendarPlus2 className="h-4 w-4" />
              Tạo lịch phát hành
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[linear-gradient(180deg,#fbfaff_0%,#f5f2ff_100%)] text-[#7d7792]">
              <tr>
                <th className="px-5 py-4 font-medium">#</th>
                <th className="px-5 py-4 font-medium">Bản phát hành</th>
                <th className="px-5 py-4 font-medium">Loại</th>
                <th className="px-5 py-4 font-medium">Ngày phát hành</th>
                <th className="px-5 py-4 font-medium">Giờ phát hành</th>
                <th className="px-5 py-4 font-medium">Trạng thái</th>
                <th className="px-5 py-4 font-medium text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f1eef8]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-[#7d7792]">
                    Đang tải lịch phát hành...
                  </td>
                </tr>
              ) : paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <p className="text-base font-medium text-[#1e172f]">Không tìm thấy lịch phát hành</p>
                    <p className="mt-2 text-sm text-[#7d7792]">
                      Hãy thử bộ lọc khác hoặc tạo kế hoạch phát hành mới.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((release, index) => {
                  const sourceType = release?.sourceType || "track";
                  const typeInfo = typeMeta[sourceType] || typeMeta.track;
                  const statusInfo = statusMeta[release?.status] || statusMeta.draft;
                  const TypeIcon = typeInfo.icon;
                  const StatusIcon = statusInfo.icon;
                  const image = getReleaseImage(release);

                  return (
                    <tr key={release.id} className="text-[#201931]">
                      <td className="px-5 py-4 text-[#7d7792]">
                        {buildRowNumber(index, page)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-xl bg-[#f5f2ff] ring-1 ring-[#ece7ff]">
                            {image ? (
                              <img
                                src={image}
                                alt={release?.item?.title || "Bản phát hành"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#7c6cf2]">
                                <TypeIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1e172f]">
                              {release?.item?.title || "Chưa có tên"}
                            </p>
                            <p className="mt-1 text-xs text-[#8d88a3]">
                              {getReleaseSubtypeLabel(release)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[#6b657f]">
                        {getReleaseTypeLabel(release)}
                      </td>
                      <td className="px-5 py-4 text-[#6b657f]">
                        {formatDisplayDate(release?.scheduledAt)}
                      </td>
                      <td className="px-5 py-4 text-[#6b657f]">
                        {formatDisplayTime(release?.scheduledAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.badgeClass}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenRelease(release)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#736d88] transition hover:bg-[#f3f1ff] hover:text-[#5b4dde]"
                            aria-label="Xem bản phát hành"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditRelease(release)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#736d88] transition hover:bg-[#f3f1ff] hover:text-[#5b4dde]"
                            aria-label="Chỉnh sửa bản phát hành"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#736d88] transition hover:bg-[#f3f1ff] hover:text-[#5b4dde]"
                            aria-label="Thêm hành động"
                          >
                            <EllipsisVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#f0eef9] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#7d7792]">
            Hiển thị{" "}
            {filteredSchedules.length === 0
              ? "0"
              : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filteredSchedules.length)}`}{" "}
            trên {filteredSchedules.length}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ebe8f8] text-[#7d7792] transition hover:border-[#cfc8f5] hover:text-[#5b4dde] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {"<"}
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition",
                  pageNumber === page
                    ? "border-[#7c6cf2] bg-[#f3f1ff] text-[#5b4dde]"
                    : "border-[#ebe8f8] text-[#7d7792] hover:border-[#cfc8f5] hover:text-[#5b4dde]",
                ].join(" ")}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page >= totalPages}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ebe8f8] text-[#7d7792] transition hover:border-[#cfc8f5] hover:text-[#5b4dde] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {">"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArtistReleaseSchedulePage;
