import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CircleAlert,
  Fingerprint,
  Globe,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { routePaths } from "../../routes/routePaths";
import { getMyArtistNotificationDetailService } from "../../services/artist.notification.service";

const TYPE_LABELS = {
  system: "Hệ thống",
  new_release: "Phát hành mới",
  artist_update: "Cập nhật nghệ sĩ",
  payment: "Thanh toán",
  follow: "Theo dõi",
  report: "Báo cáo",
  subscription: "Gói dịch vụ",
};

const ACTOR_LABELS = {
  admin: "Quản trị viên",
  artist: "Nghệ sĩ",
  system: "Hệ thống",
  user: "Người dùng",
};

const TARGET_LABELS = {
  track: "Bài hát",
  album: "Album",
  plan: "Gói dịch vụ",
  payment: "Thanh toán",
  report: "Báo cáo",
  artist: "Nghệ sĩ",
};

const RECEIVER_LABELS = {
  single: "Cá nhân",
  all: "Toàn hệ thống",
  group: "Nhóm người nhận",
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
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
};

const formatIdentifier = (value) => {
  if (!value) {
    return "--";
  }

  return String(value);
};

const normalizeErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể tải chi tiết thông báo.";

const MetaCard = ({ icon, label, value, helper }) => (
  <div className="rounded-[20px] border border-[#ece8ff] bg-white p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4f1ff] text-[#6957f5]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.24em] text-[#928aad]">
          {label}
        </p>
        <p className="mt-2 break-words text-sm font-semibold text-[#2f2747]">
          {value || "--"}
        </p>
        {helper ? (
          <p className="mt-1 text-xs leading-5 text-[#847e98]">{helper}</p>
        ) : null}
      </div>
    </div>
  </div>
);

const ArtistNotificationDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadNotificationDetail = async () => {
      if (!id) {
        setNotification(null);
        setErrorMessage("Không tìm thấy mã thông báo.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getMyArtistNotificationDetailService(id);

        if (!isMounted) {
          return;
        }

        setNotification(result || null);
        window.dispatchEvent(new CustomEvent("artist-notifications:refresh"));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setNotification(null);
        setErrorMessage(normalizeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotificationDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const backTarget = useMemo(() => {
    if (typeof location.state?.from === "string" && location.state.from.trim()) {
      return location.state.from;
    }

    return routePaths.artistNotifications;
  }, [location.state]);

  if (isLoading) {
    return (
      <section className="rounded-[24px] border border-[#e7e1ff] bg-white px-6 py-8 text-sm text-[#7c7891] shadow-sm">
        Đang tải chi tiết thông báo...
      </section>
    );
  }

  if (errorMessage || !notification) {
    return (
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6f6a82] transition hover:text-[#5b4dde]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách thông báo
        </button>

        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-6 text-rose-900">
          <h1 className="text-lg font-semibold">
            Không thể tải chi tiết thông báo
          </h1>
          <p className="mt-2 text-sm">
            {errorMessage || "Dữ liệu không tồn tại."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6f6a82] transition hover:text-[#5b4dde]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách thông báo
        </button>

        <div className="rounded-[28px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[#7c6cf2]">
                Chi tiết thông báo
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#2f2747]">
                {notification?.title || "Thông báo"}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f3f0ff] px-3 py-1 text-xs font-semibold text-[#5f4fe0]">
                  {TYPE_LABELS[notification?.type] || "Thông báo"}
                </span>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    notification?.isRead
                      ? "bg-slate-100 text-slate-700"
                      : "bg-emerald-100 text-emerald-700",
                  ].join(" ")}
                >
                  {notification?.isRead ? "Đã đọc" : "Mới"}
                </span>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#ece8ff] bg-[#faf9ff] px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.24em] text-[#928aad]">
                Thời gian tạo
              </p>
              <p className="mt-2 text-sm font-semibold text-[#2f2747]">
                {formatDateTime(notification?.createdAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-[#ece8ff] bg-[#fcfbff] p-5">
            <div className="flex items-center gap-2 text-[#2f2747]">
              <Bell className="h-5 w-5 text-[#6a58f5]" />
              <h2 className="text-lg font-semibold">Nội dung thông báo</h2>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#615c76]">
              {notification?.content || "Không có nội dung."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaCard
          icon={<CircleAlert className="h-5 w-5" />}
          label="Loại thông báo"
          value={TYPE_LABELS[notification?.type] || "Thông báo"}
          helper="Nhóm thông báo để artist dễ lọc và theo dõi."
        />
        <MetaCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Trạng thái"
          value={notification?.isRead ? "Đã đọc" : "Chưa đọc"}
          helper="Khi mở trang này, hệ thống sẽ tự đánh dấu đã đọc nếu trước đó chưa đọc."
        />
        <MetaCard
          icon={<UserRound className="h-5 w-5" />}
          label="Nguồn gửi"
          value={ACTOR_LABELS[notification?.actorType] || "Không xác định"}
          helper="Cho biết ai hoặc hệ thống nào đã tạo thông báo."
        />
        <MetaCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="Cập nhật gần nhất"
          value={formatDateTime(notification?.updatedAt)}
          helper="Thời gian bản ghi thông báo được cập nhật lần cuối."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="rounded-[28px] border border-[#e7e1ff] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2f2747]">
            Thông tin kỹ thuật
          </h2>

          <div className="mt-5 divide-y divide-[#f0ecff]">
            <div className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm text-[#847e98]">Mã thông báo</p>
              <p className="break-all text-sm font-medium text-[#2f2747]">
                {formatIdentifier(notification?._id)}
              </p>
            </div>

            <div className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm text-[#847e98]">Kiểu người nhận</p>
              <p className="text-sm font-medium text-[#2f2747]">
                {RECEIVER_LABELS[notification?.receiverType] || "Không xác định"}
              </p>
            </div>

            <div className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm text-[#847e98]">Đối tượng liên quan</p>
              <p className="text-sm font-medium text-[#2f2747]">
                {TARGET_LABELS[notification?.targetType] || "Không có"}
              </p>
            </div>

            <div className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm text-[#847e98]">Mã đối tượng</p>
              <p className="break-all text-sm font-medium text-[#2f2747]">
                {formatIdentifier(notification?.targetId)}
              </p>
            </div>

            <div className="grid gap-2 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
              <p className="text-sm text-[#847e98]">Mã người tạo</p>
              <p className="break-all text-sm font-medium text-[#2f2747]">
                {formatIdentifier(notification?.actorId)}
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <MetaCard
            icon={<Globe className="h-5 w-5" />}
            label="Phạm vi gửi"
            value={
              notification?.isGlobal
                ? "Thông báo toàn hệ thống"
                : "Thông báo cá nhân"
            }
            helper="Dùng để phân biệt thông báo broadcast và thông báo gắn với riêng artist."
          />
          <MetaCard
            icon={<Fingerprint className="h-5 w-5" />}
            label="Mã người nhận"
            value={formatIdentifier(notification?.userId)}
            helper="ID user nhận thông báo này trên hệ thống."
          />
        </aside>
      </div>
    </section>
  );
};

export default ArtistNotificationDetailPage;
