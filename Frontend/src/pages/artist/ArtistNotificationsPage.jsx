import { Bell, ChevronRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../hooks/useSocket";
import { routePaths } from "../../routes/routePaths";
import { getMyArtistNotificationsService } from "../../services/artist.notification.service";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const TYPE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "system", label: "Hệ thống" },
  { value: "new_release", label: "Phát hành mới" },
  { value: "artist_update", label: "Cập nhật nghệ sĩ" },
  { value: "payment", label: "Thanh toán" },
  { value: "follow", label: "Theo dõi" },
  { value: "report", label: "Báo cáo" },
  { value: "subscription", label: "Gói dịch vụ" },
];

const TYPE_LABELS = {
  system: "Hệ thống",
  new_release: "Phát hành mới",
  artist_update: "Cập nhật nghệ sĩ",
  payment: "Thanh toán",
  follow: "Theo dõi",
  report: "Báo cáo",
  subscription: "Gói dịch vụ",
};

const formatDateTime = (value) => {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải danh sách thông báo.";

const ArtistNotificationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken } = useAuth();
  const socket = useSocket(accessToken);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number.parseInt(searchParams.get("page") || "", 10) || DEFAULT_PAGE;
  const type = searchParams.get("type") || "";
  const isReadParam = searchParams.get("isRead") || "";

  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const params = {
          page,
          limit: DEFAULT_LIMIT,
        };

        if (type) {
          params.type = type;
        }

        if (isReadParam === "true") {
          params.isRead = true;
        }

        if (isReadParam === "false") {
          params.isRead = false;
        }

        const result = await getMyArtistNotificationsService(params);

        setNotifications(result.notifications || []);
        setMeta(result.meta || {});
        setErrorMessage("");
      } catch (error) {
        setNotifications([]);
        setMeta({});
        setErrorMessage(normalizeErrorMessage(error));
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [isReadParam, page, type]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNotificationChange = () => {
      loadNotifications({ silent: true });
    };

    socket.on("new_notification", handleNotificationChange);
    socket.on("update_notification", handleNotificationChange);
    socket.on("delete_notification", handleNotificationChange);

    return () => {
      socket.off("new_notification", handleNotificationChange);
      socket.off("update_notification", handleNotificationChange);
      socket.off("delete_notification", handleNotificationChange);
    };
  }, [loadNotifications, socket]);

  const updateQuery = (updates) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, String(value));
    });

    if (!updates.page) {
      nextParams.delete("page");
    }

    setSearchParams(nextParams);
  };

  const totalPages = Number(meta?.totalPages || 0);
  const unreadCount = Number(meta?.unreadCount || 0);
  const pages = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  const handleOpenDetail = (notification) => {
    const notificationId = notification?._id;

    if (!notificationId) {
      return;
    }

    if (!notification?.isRead) {
      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item?._id === notificationId ? { ...item, isRead: true } : item
        )
      );
      setMeta((currentMeta) => ({
        ...currentMeta,
        unreadCount: Math.max(0, Number(currentMeta?.unreadCount || 0) - 1),
      }));

      window.dispatchEvent(
        new CustomEvent("artist-notifications:unread-delta", {
          detail: { delta: -1 },
        })
      );
    }

    navigate(routePaths.artistNotificationDetail(notificationId), {
      state: {
        from: `${location.pathname}${location.search}`,
      },
    });
  };

  return (
    <section className="space-y-6">
      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
          Thông báo nghệ sĩ
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#2f2747]">
          Thông báo của bạn
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#7c7891]">
          Artist sẽ thấy thông báo hệ thống, thông báo gửi riêng và các cập nhật
          nhắm tới vai trò nghệ sĩ ngay tại đây, kể cả khi có thông báo mới qua
          websocket.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <p className="text-sm text-[#7c7891]">Tổng thông báo</p>
            <p className="mt-2 text-2xl font-semibold text-[#2f2747]">
              {Number(meta?.total || 0)}
            </p>
          </div>

          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <p className="text-sm text-[#7c7891]">Chưa đọc</p>
            <p className="mt-2 text-2xl font-semibold text-[#2f2747]">
              {unreadCount}
            </p>
          </div>

          <div className="rounded-[16px] border border-[#efeaff] bg-[#faf9ff] p-4">
            <p className="text-sm text-[#7c7891]">Trang hiện tại</p>
            <p className="mt-2 text-2xl font-semibold text-[#2f2747]">
              {Number(meta?.page || page)}
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[18px] border border-[#e7e1ff] bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#645d86]">
            Loại thông báo
          </label>
          <select
            value={type}
            onChange={(event) =>
              updateQuery({ type: event.target.value, page: null })
            }
            className="rounded-xl border border-[#e7e1ff] bg-white px-3 py-2 text-sm text-[#2f2747] outline-none transition focus:border-[#7c6cf2]"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: "Tất cả" },
            { value: "false", label: "Chưa đọc" },
            { value: "true", label: "Đã đọc" },
          ].map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              onClick={() => updateQuery({ isRead: option.value, page: null })}
              className={[
                "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                isReadParam === option.value
                  ? "border-[#6f5cf1] bg-[#6f5cf1] text-white"
                  : "border-[#e7e1ff] bg-[#f8f6ff] text-[#645d86] hover:border-[#b7abff] hover:text-[#2f2747]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[20px] border border-[#e7e1ff] bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-[#7c7891]">
            <div className="flex items-center gap-3">
              <LoaderCircle className="h-5 w-5 animate-spin text-[#7c6cf2]" />
              Đang tải thông báo...
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-[240px] flex-col items-center justify-center rounded-[18px] border border-dashed border-neutral-200 bg-white px-6 text-center">
            <Bell className="h-8 w-8 text-[#b4acd6]" />
            <p className="mt-4 text-base font-semibold text-[#2f2747]">
              Chưa có thông báo nào
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#7c7891]">
              Khi có thông báo mới liên quan đến tài khoản nghệ sĩ, danh sách sẽ
              xuất hiện tại đây theo thời gian thực.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => handleOpenDetail(notification)}
                className={[
                  "w-full rounded-[16px] border px-4 py-4 text-left transition",
                  notification?.isRead
                    ? "border-[#ece8ff] bg-white hover:border-[#dcd2ff] hover:bg-[#fcfbff]"
                    : "border-[#dcd2ff] bg-[#faf8ff] hover:border-[#cfc4ff] hover:bg-[#f6f2ff]",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f3f0ff] px-2.5 py-1 text-[11px] font-semibold text-[#5f4fe0]">
                      {TYPE_LABELS[notification?.type] || "Thông báo"}
                    </span>
                    {!notification?.isRead ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Mới
                      </span>
                    ) : null}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7c6cf2]">
                    Xem chi tiết
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>

                <p className="mt-3 text-base font-semibold text-[#2f2747]">
                  {notification?.title || "Thông báo"}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#7c7891]">
                  {notification?.content || "Không có nội dung."}
                </p>
                <p className="mt-3 text-xs text-[#9a93b8]">
                  {formatDateTime(notification?.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {pages.length > 1 ? (
        <section className="flex flex-wrap items-center gap-2">
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => updateQuery({ page: pageNumber })}
              className={[
                "rounded-full border px-3.5 py-2 text-sm font-medium transition",
                pageNumber === page
                  ? "border-[#6f5cf1] bg-[#6f5cf1] text-white"
                  : "border-[#e7e1ff] bg-white text-[#645d86] hover:border-[#b7abff] hover:text-[#2f2747]",
              ].join(" ")}
            >
              {pageNumber}
            </button>
          ))}
        </section>
      ) : null}
    </section>
  );
};

export default ArtistNotificationsPage;
